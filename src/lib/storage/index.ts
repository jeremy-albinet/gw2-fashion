import { get, set, del, keys } from 'idb-keyval';
import type { Race, Gender, Profession } from '$lib/gw2/constants';
import type { TravelTemplate } from '$lib/gw2/types';

const OUTFIT_PREFIX = 'outfit_';
const IMAGE_PREFIX = 'img_';

export interface InfusionEntry {
	itemId: number;
	count: number;
}

export interface OutfitInfusions {
	items: InfusionEntry[];
}

export function aggregateInfusions(itemIds: readonly number[]): OutfitInfusions {
	const counts = new Map<number, number>();
	for (const id of itemIds) {
		if (id > 0) counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	return { items: [...counts].map(([itemId, count]) => ({ itemId, count })) };
}

export interface OutfitTab {
	id: string;
	label: string;
	code: string;
	travel?: TravelTemplate;
	imageIds: string[];
	infusions?: OutfitInfusions;
}

export interface StoredOutfit {
	id: string;
	name: string;
	race: Race | '';
	gender: Gender | '';
	profession: Profession | '';
	notes: string;
	tags: string[];
	tabs: OutfitTab[];
	activeTabId?: string;
	createdAt: number;
	updatedAt: number;
}



function key(id: string): string {
	return OUTFIT_PREFIX + id;
}

function imgKey(id: string): string {
	return IMAGE_PREFIX + id;
}

function newId(): string {
	return crypto.randomUUID();
}

function toPlain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

export function getActiveTab(outfit: StoredOutfit): OutfitTab {
	if (outfit.tabs.length === 0) {
		throw new Error('Outfit has no tabs');
	}
	const found = outfit.activeTabId
		? outfit.tabs.find((t) => t.id === outfit.activeTabId)
		: undefined;
	return found ?? outfit.tabs[0];
}

export async function saveOutfit(
	outfit: Omit<StoredOutfit, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StoredOutfit> {
	const now = Date.now();
	const tabs = outfit.tabs.length > 0 ? outfit.tabs : [{
		id: newId(), label: '', code: '', imageIds: []
	}];
	const full: StoredOutfit = toPlain({
		...outfit,
		tabs,
		activeTabId: outfit.activeTabId ?? tabs[0].id,
		id: newId(),
		createdAt: now,
		updatedAt: now
	});
	await set(key(full.id), full);
	return full;
}

export async function updateOutfit(
	id: string,
	patch: Partial<Omit<StoredOutfit, 'id' | 'createdAt'>>
): Promise<StoredOutfit | null> {
	const existing = await getOutfit(id);
	if (!existing) return null;
	const updated: StoredOutfit = toPlain({ ...existing, ...patch, id, updatedAt: Date.now() });
	await set(key(id), updated);
	return updated;
}

export async function getOutfit(id: string): Promise<StoredOutfit | null> {
	return (await get<StoredOutfit>(key(id))) ?? null;
}

export async function getAllOutfits(): Promise<StoredOutfit[]> {
	const allKeys = await keys<string>();
	const outfitKeys = allKeys.filter(
		(k) => typeof k === 'string' && k.startsWith(OUTFIT_PREFIX)
	);
	const outfits = await Promise.all(outfitKeys.map((k) => get<StoredOutfit>(k)));
	return (outfits.filter(Boolean) as StoredOutfit[]).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteOutfit(id: string): Promise<void> {
	const outfit = await getOutfit(id);
	if (outfit) {
		const allImageIds = outfit.tabs.flatMap((t) => t.imageIds ?? []);
		if (allImageIds.length) await deleteImages(allImageIds);
	}
	await del(key(id));
}

export async function saveImage(blob: Blob): Promise<string> {
	const id = newId();
	await set(imgKey(id), blob);
	return id;
}

export async function getImage(id: string): Promise<Blob | null> {
	return (await get<Blob>(imgKey(id))) ?? null;
}

export async function deleteImages(ids: string[]): Promise<void> {
	await Promise.all(ids.map((id) => del(imgKey(id))));
}

export function encodeSharePayload(outfit: StoredOutfit): string {
	const tab = getActiveTab(outfit);
	const json = JSON.stringify({
		name: outfit.name, code: tab.code, notes: outfit.notes, tags: outfit.tags,
		race: outfit.race, gender: outfit.gender, profession: outfit.profession,
		infusions: tab.infusions ?? null,
		travel: tab.travel ?? null
	});
	return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSharePayload(
	hash: string
): {
	name: string;
	code: string;
	notes: string;
	tags: string[];
	race: Race | '';
	gender: Gender | '';
	profession: Profession | '';
	infusions?: OutfitInfusions;
	travel?: TravelTemplate;
} | null {
	try {
		const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
		const parsed = JSON.parse(decodeURIComponent(escape(atob(cleaned))));
		if (typeof parsed.code !== 'string') return null;
		return {
			name: typeof parsed.name === 'string' ? parsed.name : 'Untitled',
			code: parsed.code,
			notes: typeof parsed.notes === 'string' ? parsed.notes : '',
			tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === 'string') : [],
			race: parsed.race ?? '',
			gender: parsed.gender ?? '',
			profession: parsed.profession ?? '',
			infusions: parsed.infusions ?? undefined,
			travel: parsed.travel ?? undefined
		};
	} catch {
		return null;
	}
}

export interface BackupOutfit extends StoredOutfit {
	_images: Record<string, string>;
}

export interface BackupFile {
	version: 1;
	exportedAt: number;
	outfits: BackupOutfit[];
}

export async function exportBackup(): Promise<BackupFile> {
	const outfits = await getAllOutfits();
	const backupOutfits: BackupOutfit[] = await Promise.all(
		outfits.map(async (o) => {
			const _images: Record<string, string> = {};
			const allImageIds = o.tabs.flatMap((t) => t.imageIds ?? []);
			for (const imgId of allImageIds) {
				const blob = await getImage(imgId);
				if (blob) {
					const b64 = await new Promise<string>((resolve) => {
						const reader = new FileReader();
						reader.onload = () => resolve(reader.result as string);
						reader.readAsDataURL(blob);
					});
					_images[imgId] = b64;
				}
			}
			return { ...o, _images };
		})
	);
	return { version: 1, exportedAt: Date.now(), outfits: backupOutfits };
}

export async function importBackup(
	backup: BackupFile,
	mode: 'merge' | 'replace'
): Promise<{ imported: number; skipped: number }> {
	if (backup.version !== 1) throw new Error('Unsupported backup version.');

	if (mode === 'replace') {
		const existing = await getAllOutfits();
		for (const o of existing) await deleteOutfit(o.id);
	}

	const existingIds = new Set((await getAllOutfits()).map((o) => o.id));
	let imported = 0;
	let skipped = 0;

	for (const entry of backup.outfits) {
		if (mode === 'merge' && existingIds.has(entry.id)) {
			skipped++;
			continue;
		}

		const idRemap: Record<string, string> = {};
		for (const [oldId, dataUrl] of Object.entries(entry._images)) {
			const res = await fetch(dataUrl);
			const blob = await res.blob();
			idRemap[oldId] = await saveImage(blob);
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { _images, ...rest } = entry;
		const remappedTabs: OutfitTab[] = rest.tabs.map((t: OutfitTab) => ({
			...t,
			imageIds: (t.imageIds ?? []).map((oldId: string) => idRemap[oldId]).filter(Boolean)
		}));
		const now = Date.now();
		const outfit: StoredOutfit = {
			...rest,
			id: mode === 'replace' ? rest.id : crypto.randomUUID(),
			tabs: remappedTabs,
			activeTabId: remappedTabs[0]?.id ?? rest.activeTabId,
			createdAt: rest.createdAt ?? now,
			updatedAt: rest.updatedAt ?? now
		};
		await set(key(outfit.id), outfit);
		imported++;
	}

	return { imported, skipped };
}
