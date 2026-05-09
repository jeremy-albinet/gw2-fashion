import { get, set, del, keys } from 'idb-keyval';
import type { Race, Gender, Profession } from '$lib/gw2/constants';
import type { ArmorSlotId, WeaponSlotId } from '$lib/gw2/types';

const OUTFIT_PREFIX = 'outfit_';
const IMAGE_PREFIX = 'img_';

/** Infusion slot assignments for an outfit, stored separately from the fashion template code. */
export interface OutfitInfusions {
	armor: Partial<Record<ArmorSlotId, [number, number, number]>>;
	weapons: Partial<Record<WeaponSlotId, [number, number]>>;
}

export interface StoredOutfit {
	id: string;
	name: string;
	code: string;
	race: Race | '';
	gender: Gender | '';
	profession: Profession | '';
	notes: string;
	tags: string[];
	imageIds: string[];
	infusions?: OutfitInfusions;
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

export async function saveOutfit(
	outfit: Omit<StoredOutfit, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StoredOutfit> {
	const now = Date.now();
	const full: StoredOutfit = toPlain({ ...outfit, id: newId(), createdAt: now, updatedAt: now });
	await set(key(full.id), full);
	return full;
}

export async function updateOutfit(
	id: string,
	patch: Partial<Omit<StoredOutfit, 'id' | 'createdAt'>>
): Promise<StoredOutfit | null> {
	const existing = await get<StoredOutfit>(key(id));
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
	if (outfit?.imageIds?.length) {
		await deleteImages(outfit.imageIds);
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
	const json = JSON.stringify({
		name: outfit.name, code: outfit.code, notes: outfit.notes, tags: outfit.tags,
		race: outfit.race, gender: outfit.gender, profession: outfit.profession,
		infusions: outfit.infusions ?? null
	});
	return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSharePayload(
	hash: string
): Pick<StoredOutfit, 'name' | 'code' | 'notes' | 'tags' | 'race' | 'gender' | 'profession' | 'infusions'> | null {
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
			infusions: parsed.infusions ?? undefined
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
			for (const imgId of o.imageIds ?? []) {
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

		const newImageIds: string[] = [];
		for (const [, dataUrl] of Object.entries(entry._images)) {
			const res = await fetch(dataUrl);
			const blob = await res.blob();
			const id = await saveImage(blob);
			newImageIds.push(id);
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { _images, ...rest } = entry;
		const now = Date.now();
		const outfit: StoredOutfit = {
			...rest,
			id: mode === 'replace' ? entry.id : crypto.randomUUID(),
			imageIds: newImageIds,
			createdAt: rest.createdAt ?? now,
			updatedAt: rest.updatedAt ?? now
		};
		await set(key(outfit.id), outfit);
		imported++;
	}

	return { imported, skipped };
}
