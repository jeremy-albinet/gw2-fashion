import type {
	ArmorPiece,
	ArmorSlotId,
	FashionTemplate,
	OutfitPiece,
	VisibilityFlags,
	WeaponSet
} from './types';

const FASHION_HEADER = 0x0f;
const EXPECTED_BYTES = 97;

const ARMOR_PARSE_ORDER: readonly ArmorSlotId[] = [
	'backpack',
	'chest',
	'boots',
	'gloves',
	'helmet',
	'leggings',
	'shoulders'
];

export class FashionTemplateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'FashionTemplateError';
	}
}

export function stripChatLink(input: string): string {
	const trimmed = input.trim();
	const match = trimmed.match(/^\[&\s*(.+?)\s*\]$/);
	return (match ? match[1] : trimmed).trim();
}

function base64ToBytes(b64: string): Uint8Array {
	const normalized = b64.replace(/\s+/g, '');
	const bin = atob(normalized);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}

export function decodeFashionTemplate(input: string): FashionTemplate {
	const stripped = stripChatLink(input);
	if (!stripped) throw new FashionTemplateError('Empty code.');

	let bytes: Uint8Array;
	try {
		bytes = base64ToBytes(stripped);
	} catch {
		throw new FashionTemplateError('Code is not valid base64.');
	}

	if (bytes.length !== EXPECTED_BYTES) {
		throw new FashionTemplateError(
			`Expected ${EXPECTED_BYTES}-byte fashion template, got ${bytes.length} bytes. ` +
				`This may be a build template or another chat-link type.`
		);
	}
	if (bytes[0] !== FASHION_HEADER) {
		throw new FashionTemplateError(
			`Wrong header byte: expected 0x0F (fashion template), got 0x${bytes[0].toString(16).padStart(2, '0')}.`
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 1;
	const u16 = (): number => {
		const v = view.getUint16(offset, true);
		offset += 2;
		return v;
	};
	const dyes = (): [number, number, number, number] => [u16(), u16(), u16(), u16()];

	const aquabreatherSkin = u16();
	const armor = {} as Record<ArmorSlotId, ArmorPiece>;
	armor.aquabreather = { skinId: aquabreatherSkin, dyeIds: [1, 1, 1, 1] };
	for (const slot of ARMOR_PARSE_ORDER) {
		armor[slot] = { skinId: u16(), dyeIds: dyes() };
	}

	const outfit: OutfitPiece = { outfitId: u16(), dyeIds: dyes() };

	const weapons: WeaponSet = {
		aquaA: u16(),
		aquaB: u16(),
		setA1: u16(),
		setA2: u16(),
		setB1: u16(),
		setB2: u16()
	};

	const flags = u16();
	const visibility: VisibilityFlags = {
		aquabreather: !!(flags & (1 << 0)),
		backpack: !!(flags & (1 << 1)),
		chest: !!(flags & (1 << 2)),
		boots: !!(flags & (1 << 3)),
		gloves: !!(flags & (1 << 4)),
		helmet: !!(flags & (1 << 5)),
		leggings: !!(flags & (1 << 6)),
		shoulders: !!(flags & (1 << 7)),
		outfit: !!(flags & (1 << 8)),
		aquaA: !!(flags & (1 << 9)),
		aquaB: !!(flags & (1 << 10)),
		setA1: !!(flags & (1 << 11)),
		setA2: !!(flags & (1 << 12)),
		setB1: !!(flags & (1 << 13)),
		setB2: !!(flags & (1 << 14))
	};

	return {
		armor,
		outfit,
		weapons,
		visibility,
		raw: `[&${bytesToBase64(bytes)}]`
	};
}

export function isFashionTemplateCode(input: string): boolean {
	try {
		const stripped = stripChatLink(input);
		if (!stripped) return false;
		const bytes = base64ToBytes(stripped);
		return bytes.length === EXPECTED_BYTES && bytes[0] === FASHION_HEADER;
	} catch {
		return false;
	}
}
