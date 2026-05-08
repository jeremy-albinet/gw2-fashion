import { get, set } from 'idb-keyval';

const BASE = 'https://api.guildwars2.com/v2';
const CACHE_PREFIX_SKIN = 'gw2_skin_';
const CACHE_PREFIX_COLOR = 'gw2_color_';

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

const inMemorySkins = new Map<number, Gw2Skin>();
const inMemoryColors = new Map<number, Gw2Color>();

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
			if (!res.ok) return;
			const data: T[] = await res.json();
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

export function skinIconUrl(icon: string): string {
	return icon;
}

export function dyeSwatchRgb(color: Gw2Color): [number, number, number] {
	return color.cloth?.rgb ?? color.leather?.rgb ?? color.metal?.rgb ?? color.base_rgb;
}
