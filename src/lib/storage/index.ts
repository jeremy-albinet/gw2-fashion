import { get, set, del, keys } from 'idb-keyval';

const OUTFIT_PREFIX = 'outfit_';

export interface StoredOutfit {
	id: string;
	name: string;
	code: string;
	notes: string;
	tags: string[];
	createdAt: number;
	updatedAt: number;
}

function key(id: string): string {
	return OUTFIT_PREFIX + id;
}

function newId(): string {
	return crypto.randomUUID();
}

export async function saveOutfit(outfit: Omit<StoredOutfit, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredOutfit> {
	const now = Date.now();
	const full: StoredOutfit = { ...outfit, id: newId(), createdAt: now, updatedAt: now };
	await set(key(full.id), full);
	return full;
}

export async function updateOutfit(id: string, patch: Partial<Omit<StoredOutfit, 'id' | 'createdAt'>>): Promise<StoredOutfit | null> {
	const existing = await get<StoredOutfit>(key(id));
	if (!existing) return null;
	const updated: StoredOutfit = { ...existing, ...patch, id, updatedAt: Date.now() };
	await set(key(id), updated);
	return updated;
}

export async function getOutfit(id: string): Promise<StoredOutfit | null> {
	return (await get<StoredOutfit>(key(id))) ?? null;
}

export async function getAllOutfits(): Promise<StoredOutfit[]> {
	const allKeys = await keys<string>();
	const outfitKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(OUTFIT_PREFIX));
	const outfits = await Promise.all(outfitKeys.map((k) => get<StoredOutfit>(k)));
	return (outfits.filter(Boolean) as StoredOutfit[]).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteOutfit(id: string): Promise<void> {
	await del(key(id));
}

export function encodeSharePayload(outfit: StoredOutfit): string {
	return btoa(JSON.stringify({ name: outfit.name, code: outfit.code, notes: outfit.notes, tags: outfit.tags }));
}

export function decodeSharePayload(hash: string): { name: string; code: string; notes: string; tags: string[] } | null {
	try {
		const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
		const parsed = JSON.parse(atob(cleaned));
		if (typeof parsed.code !== 'string') return null;
		return {
			name: typeof parsed.name === 'string' ? parsed.name : 'Untitled',
			code: parsed.code,
			notes: typeof parsed.notes === 'string' ? parsed.notes : '',
			tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === 'string') : []
		};
	} catch {
		return null;
	}
}
