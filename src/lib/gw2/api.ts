import { get, set } from 'idb-keyval';

const BASE = 'https://api.guildwars2.com/v2';
const CACHE_PREFIX_SKIN = 'gw2_skin_';
const CACHE_PREFIX_COLOR = 'gw2_color_';
const CACHE_PREFIX_ITEM = 'gw2_item_';

export interface Gw2Skin {
	id: number;
	name: string;
	type: string;
	icon: string;
	details?: { type?: string };
}

export interface Gw2Color {
	id: number;
	name: string;
	base_rgb: [number, number, number];
	cloth?: { brightness: number; contrast: number; hue: number; saturation: number; lightness: number; rgb: [number, number, number] };
	leather?: { brightness: number; contrast: number; hue: number; saturation: number; lightness: number; rgb: [number, number, number] };
	metal?: { brightness: number; contrast: number; hue: number; saturation: number; lightness: number; rgb: [number, number, number] };
	fur?: { brightness: number; contrast: number; hue: number; saturation: number; lightness: number; rgb: [number, number, number] };
}

export interface Gw2Item {
	id: number;
	name: string;
	icon: string;
	type: string;
	rarity: string;
	chat_link: string;
	details?: {
		type?: string;
		infusion_upgrade_flags?: string[];
		infix_upgrade?: {
			buff?: { description?: string };
			attributes?: { attribute: string; modifier: number }[];
		};
	};
}

const inMemorySkins = new Map<number, Gw2Skin>();
const inMemoryColors = new Map<number, Gw2Color>();
const inMemoryItems = new Map<number, Gw2Item>();

async function batchFetch<T>(
	ids: number[],
	endpoint: string,
	cachePrefix: string,
	inMemory: Map<number, T>
): Promise<Map<number, T>> {
	const result = new Map<number, T>();
	const toFetch: number[] = [];

	for (const id of ids) {
		if (id === 0 || id === 1) continue;
		if (inMemory.has(id)) {
			result.set(id, inMemory.get(id)!);
			continue;
		}
		const cached = await get<T>(cachePrefix + id);
		if (cached) {
			inMemory.set(id, cached);
			result.set(id, cached);
		} else {
			toFetch.push(id);
		}
	}

	if (toFetch.length === 0) return result;

	const chunks: number[][] = [];
	for (let i = 0; i < toFetch.length; i += 200) {
		chunks.push(toFetch.slice(i, i + 200));
	}

	await Promise.all(
		chunks.map(async (chunk) => {
			const url = `${BASE}/${endpoint}?ids=${chunk.join(',')}`;
			const res = await fetch(url);
			if (!res.ok && res.status !== 206) return;
			const data: T[] = await res.json();
			if (!Array.isArray(data)) return;
			for (const item of data) {
				const id = (item as Record<string, unknown>).id as number;
				inMemory.set(id, item);
				result.set(id, item);
				await set(cachePrefix + id, item);
			}
		})
	);

	return result;
}

export async function fetchSkins(ids: number[]): Promise<Map<number, Gw2Skin>> {
	return batchFetch(ids, 'skins', CACHE_PREFIX_SKIN, inMemorySkins);
}

export async function fetchColors(ids: number[]): Promise<Map<number, Gw2Color>> {
	return batchFetch(ids, 'colors', CACHE_PREFIX_COLOR, inMemoryColors);
}

export async function fetchItems(ids: number[]): Promise<Map<number, Gw2Item>> {
	return batchFetch(ids, 'items', CACHE_PREFIX_ITEM, inMemoryItems);
}

export function skinIconUrl(icon: string): string {
	return icon;
}

export function dyeSwatchRgb(color: Gw2Color): [number, number, number] {
	return color.cloth?.rgb ?? color.leather?.rgb ?? color.metal?.rgb ?? color.base_rgb;
}

const ACCOUNT_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
	data: T;
	cachedAt: number;
}

async function getCached<T>(key: string): Promise<T | null> {
	const entry = await get<CacheEntry<T>>(key);
	if (!entry) return null;
	if (Date.now() - entry.cachedAt > ACCOUNT_CACHE_TTL_MS) return null;
	return entry.data;
}

async function setCached<T>(key: string, data: T): Promise<void> {
	await set(key, { data, cachedAt: Date.now() } satisfies CacheEntry<T>);
}

async function bustCache(key: string): Promise<void> {
	await set(key, null);
}

const API_KEY_STORE = 'gw2_api_key';
const inMemoryApiKey: { value: string | null } = { value: null };

export async function saveApiKey(key: string): Promise<void> {
	inMemoryApiKey.value = key;
	await set(API_KEY_STORE, key);
}

export async function loadApiKey(): Promise<string | null> {
	if (inMemoryApiKey.value !== null) return inMemoryApiKey.value;
	const stored = await get<string>(API_KEY_STORE);
	inMemoryApiKey.value = stored ?? null;
	return inMemoryApiKey.value;
}

export async function clearApiKey(): Promise<void> {
	inMemoryApiKey.value = null;
	await set(API_KEY_STORE, null);
}

function authedUrl(endpoint: string, key: string): string {
	const sep = endpoint.includes('?') ? '&' : '?';
	return `${BASE}${endpoint}${sep}access_token=${encodeURIComponent(key)}`;
}

export interface Gw2AccountInfo {
	id: string;
	name: string;
	world: number;
}

export interface Gw2EquipmentTabItem {
	id: number;
	slot: string;
	skin?: number;
	dyes?: (number | null)[];
	upgrades?: number[];
	infusions?: number[];
	stats?: { id: number };
}

export interface Gw2EquipmentTab {
	tab: number;
	name: string;
	is_active: boolean;
	equipment: Gw2EquipmentTabItem[];
}

export async function fetchAccount(key: string): Promise<Gw2AccountInfo> {
	const res = await fetch(authedUrl('/account', key));
	if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
	return res.json();
}

const CACHE_KEY_CHARACTERS = 'gw2_cache_characters';
const cacheKeyEquipmentTabs = (name: string) => `gw2_cache_equipment_${name}`;
const cacheKeyCharacter = (name: string) => `gw2_cache_character_${name}`;

export async function fetchCharacterNames(key: string, bustTtl = false): Promise<string[]> {
	if (!bustTtl) {
		const cached = await getCached<string[]>(CACHE_KEY_CHARACTERS);
		if (cached) return cached;
	}
	const res = await fetch(authedUrl('/characters', key));
	if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
	const data: string[] = await res.json();
	await setCached(CACHE_KEY_CHARACTERS, data);
	return data;
}

export async function fetchEquipmentTabs(key: string, characterName: string, bustTtl = false): Promise<Gw2EquipmentTab[]> {
	const cacheKey = cacheKeyEquipmentTabs(characterName);
	if (!bustTtl) {
		const cached = await getCached<Gw2EquipmentTab[]>(cacheKey);
		if (cached) return cached;
	}
	const url = authedUrl(`/characters/${encodeURIComponent(characterName)}/equipmenttabs?tabs=all&v=latest`, key);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
	const data: Gw2EquipmentTab[] = await res.json();
	await setCached(cacheKey, data);
	return data;
}

export interface Gw2Character {
	name: string;
	race: string;
	gender: string;
	profession: string;
}

export async function fetchCharacter(key: string, characterName: string, bustTtl = false): Promise<Gw2Character> {
	const cacheKey = cacheKeyCharacter(characterName);
	if (!bustTtl) {
		const cached = await getCached<Gw2Character>(cacheKey);
		if (cached) return cached;
	}
	const res = await fetch(authedUrl(`/characters/${encodeURIComponent(characterName)}?v=latest`, key));
	if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
	const data: Gw2Character = await res.json();
	await setCached(cacheKey, data);
	return data;
}

export async function bustCharacterCache(characterName?: string): Promise<void> {
	await bustCache(CACHE_KEY_CHARACTERS);
	if (characterName) {
		await Promise.all([
			bustCache(cacheKeyEquipmentTabs(characterName)),
			bustCache(cacheKeyCharacter(characterName)),
		]);
	}
}
