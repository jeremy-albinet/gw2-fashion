#!/usr/bin/env node
/**
 * Refresh the cosmetic-only infusion catalog at src/lib/gw2/infusions.generated.json.
 *
 * Strategy:
 *   1. Scrape the wiki page https://wiki.guildwars2.com/wiki/Cosmetic_infusion for the
 *      authoritative list of cosmetic infusion names (~47 entries).
 *   2. For each name, resolve to an item ID via gw2treasures search. Cosmetic infusions
 *      ship as many stat variants sharing the same name+icon; we pick the Power variant
 *      (or fall back to the first variant when Power isn't available, e.g. enrichments).
 *   3. Enrich each chosen ID via /v2/items, capturing icon + chat link + buff text.
 *   4. Write a single representative entry per cosmetic name. Stat variants are hidden
 *      from the picker entirely — users see one row per visual effect.
 *
 * Run:    pnpm refresh:infusions
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIKI_PAGE = 'Cosmetic_infusion';
const WIKI_PARSE_URL =
	`https://wiki.guildwars2.com/api.php?action=parse&format=json&page=${WIKI_PAGE}&prop=wikitext`;

const TREASURES_SEARCH = 'https://en.gw2treasures.com/api/search?q=';
const GW2_ITEMS = 'https://api.guildwars2.com/v2/items';

const OUT_PATH = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'src',
	'lib',
	'gw2',
	'infusions.generated.json'
);

const UA = { 'user-agent': 'gw2-fashion-refresh-script/2.0' };

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, { retries = 4, baseDelayMs = 1000 } = {}) {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const res = await fetch(url, { headers: UA });
		if (res.ok || res.status === 206) return res.json();
		const retryable = res.status === 429 || res.status === 503 || res.status >= 500;
		if (!retryable || attempt === retries) {
			throw new Error(`HTTP ${res.status} for ${url}`);
		}
		await sleep(baseDelayMs * Math.pow(2, attempt));
	}
	throw new Error(`unreachable: ${url}`);
}

function chunk(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

async function fetchCosmeticNames() {
	const data = await fetchJson(WIKI_PARSE_URL);
	const wt = data?.parse?.wikitext?.['*'] ?? '';
	const names = new Set();
	const iconRegex = /\{\{item icon\|([^}|]+)(?:\|[^}]*)?\}\}/g;
	let m;
	while ((m = iconRegex.exec(wt)) !== null) {
		names.add(m[1].trim());
	}
	return [...names].sort();
}

async function resolveToItemId(name) {
	const url = TREASURES_SEARCH + encodeURIComponent(name);
	const data = await fetchJson(url);
	const all = data.items ?? [];

	let items = all.filter((it) => it.name_en === name);
	if (items.length === 0) {
		items = all.filter((it) => it.name_en.startsWith(`${name} of `));
	}
	if (items.length === 0) return null;
	if (items.length === 1) return items[0].id;

	const ids = items.map((it) => it.id);
	const detailed = await fetchItems(ids);
	const power = items.find((it) => {
		const d = detailed.get(it.id);
		const attrs = d?.details?.infix_upgrade?.attributes ?? [];
		return attrs[0]?.attribute === 'Power';
	});
	return (power ?? items[0]).id;
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
	return 'infusion';
}

function pickBuff(item) {
	const buff = item?.details?.infix_upgrade?.buff?.description;
	if (typeof buff === 'string' && buff.trim()) return buff.trim();
	return '';
}

async function main() {
	process.stdout.write('Scraping wiki Cosmetic_infusion page… ');
	const names = await fetchCosmeticNames();
	console.log(`found ${names.length} cosmetic names.`);

	process.stdout.write('Resolving names to item IDs via gw2treasures… ');
	const resolved = [];
	for (const name of names) {
		try {
			const id = await resolveToItemId(name);
			if (id) resolved.push({ name, id });
			else process.stderr.write(`\n  ! ${name}: no items API match`);
		} catch (e) {
			process.stderr.write(`\n  ! ${name}: ${e.message}`);
		}
		await sleep(250);
	}
	console.log(`\nresolved ${resolved.length}/${names.length} names.`);

	if (resolved.length < names.length * 0.8) {
		throw new Error(
			`Only resolved ${resolved.length}/${names.length} names (threshold 80%). ` +
				`Likely upstream rate-limit or outage. Existing catalog left untouched.`
		);
	}

	process.stdout.write('Fetching item details from GW2 API… ');
	const items = await fetchItems(resolved.map((r) => r.id));
	console.log(`got ${items.size} items.`);

	const entries = resolved
		.map(({ name, id }) => ({ wikiName: name, item: items.get(id) }))
		.filter(({ item }) => item && item.type === 'UpgradeComponent')
		.map(({ wikiName, item }) => ({
			id: item.id,
			name: wikiName,
			icon: item.icon,
			rarity: item.rarity,
			chatLink: item.chat_link,
			category: classify(item),
			buff: pickBuff(item)
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	const payload = {
		generatedAt: new Date().toISOString(),
		source: 'wiki Cosmetic_infusion + gw2treasures + /v2/items',
		count: entries.length,
		infusions: entries
	};

	await mkdir(dirname(OUT_PATH), { recursive: true });
	await writeFile(OUT_PATH, JSON.stringify(payload, null, '\t') + '\n', 'utf8');
	console.log(`Wrote ${entries.length} cosmetic infusions to ${OUT_PATH}`);
}

main().catch((e) => {
	console.error('Refresh failed:', e);
	process.exit(1);
});
