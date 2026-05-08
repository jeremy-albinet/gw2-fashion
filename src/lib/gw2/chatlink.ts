const WARDROBE_HEADER = 0x0a;

export function skinWardrobeLink(skinId: number): string {
	const bytes = new Uint8Array(5);
	const view = new DataView(bytes.buffer);
	view.setUint8(0, WARDROBE_HEADER);
	view.setUint32(1, skinId, true);
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return `[&${btoa(bin)}]`;
}

export function wikiUrl(name: string): string {
	return `https://wiki.guildwars2.com/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`;
}
