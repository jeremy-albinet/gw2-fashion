#!/usr/bin/env node
/**
 * Refresh the static infusion catalog at src/lib/gw2/infusions.generated.json.
 *
 * Strategy:
 *   1. Query the GW2 wiki Semantic MediaWiki API for everything in Category:Infusions
 *      with a "Has game id" property — that gives us all real infusion item IDs.
 *   2. Enrich each id via the official GW2 API /v2/items?ids=... so we get
 *      name, icon, rarity and the upgrade buff description.
 *   3. Write the merged catalog as JSON. The runtime imports it directly,
 *      so no network calls happen in the browser.
 *
 * Run:    pnpm refresh:infusions
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIKI_ASK_URL =
	'https://wiki.guildwars2.com/api.php?action=ask&format=json' +
	'&query=' +
	encodeURIComponent('[[Category:Infusions]]|?Has game id|limit=500');

const GW2_ITEMS = 'https://api.guildwars2.com/v2/items';

const OUT_PATH = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'src',
	'lib',
	'gw2',
	'infusions.generated.json'
);

async function fetchJson(url) {
	const res = await fetch(url, { headers: { 'user-agent': 'gw2-fashion-refresh-script/1.0' } });
	if (!res.ok && res.status !== 206) {
		throw new Error(`HTTP ${res.status} for ${url}`);
	}
	return res.json();
}

function chunk(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

async function fetchInfusionIdsFromWiki() {
	const data = await fetchJson(WIKI_ASK_URL);
	const results = data?.query?.results ?? {};
	const ids = new Set();
	for (const entry of Object.values(results)) {
		const list = entry?.printouts?.['Has game id'];
		if (!Array.isArray(list)) continue;
		for (const v of list) {
			const n = typeof v === 'number' ? v : Number(v);
			if (Number.isFinite(n) && n > 0) ids.add(n);
		}
	}
	return [...ids].sort((a, b) => a - b);
}

async function fetchItems(ids) {
	const out = new Map();
	const chunks = chunk(ids, 200);
	for (const c of chunks) {
		const url = `${GW2_ITEMS}?ids=${c.join(',')}`;
		const data = await fetchJson(url);
		for (const item of data) out.set(item.id, item);
	}
	return out;
}

function classify(item) {
	const flags = item?.details?.infusion_upgrade_flags ?? [];
	if (flags.includes('Enrichment')) return 'enrichment';
	if (flags.includes('Defense')) return 'defense';
	if (flags.includes('Offense')) return 'offense';
	if (flags.includes('Utility')) return 'utility';
	if (flags.includes('Agony')) return 'agony';
	if (flags.includes('Infusion')) return 'infusion';
	return 'other';
}

function pickBuff(item) {
	const buff = item?.details?.infix_upgrade?.buff?.description;
	if (typeof buff === 'string' && buff.trim()) return buff.trim();
	return '';
}

function pickAttributes(item) {
	const attrs = item?.details?.infix_upgrade?.attributes;
	if (!Array.isArray(attrs)) return [];
	return attrs.map((a) => ({ attribute: a.attribute, modifier: a.modifier }));
}

async function main() {
	process.stdout.write('Querying GW2 wiki for Category:Infusions… ');
	const ids = await fetchInfusionIdsFromWiki();
	console.log(`found ${ids.length} items.`);

	process.stdout.write('Fetching item details from GW2 API… ');
	const items = await fetchItems(ids);
	console.log(`got ${items.size} items.`);

	const entries = ids
		.map((id) => items.get(id))
		.filter((it) => it && it.type === 'UpgradeComponent')
		.map((it) => ({
			id: it.id,
			name: it.name,
			icon: it.icon,
			rarity: it.rarity,
			chatLink: it.chat_link,
			category: classify(it),
			buff: pickBuff(it),
			attributes: pickAttributes(it)
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	const payload = {
		generatedAt: new Date().toISOString(),
		source: 'wiki Category:Infusions + /v2/items',
		count: entries.length,
		infusions: entries
	};

	await mkdir(dirname(OUT_PATH), { recursive: true });
	await writeFile(OUT_PATH, JSON.stringify(payload, null, '\t') + '\n', 'utf8');
	console.log(`Wrote ${entries.length} infusions to ${OUT_PATH}`);
}

main().catch((e) => {
	console.error('Refresh failed:', e);
	process.exit(1);
});
