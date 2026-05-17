import type {
	ArmorPiece,
	ArmorSlotId,
	FashionTemplate,
	OutfitPiece,
	VisibilityFlags,
	WeaponSet,
	WeaponSlotId,
	TravelTemplate,
	TravelSlotPiece
} from './types';
import { TRAVEL_SLOT_ORDER } from './types';

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
		const bytes = base64ToBytes(stripped);
		return bytes.length === EXPECTED_BYTES && bytes[0] === FASHION_HEADER;
	} catch {
		return false;
	}
}

const TRAVEL_HEADER = 0x10;
const TRAVEL_EXPECTED_BYTES = 123;
const TRAVEL_TERMINATOR = 0x0fff;

export class TravelTemplateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TravelTemplateError';
	}
}

export function decodeTravelTemplate(input: string): TravelTemplate {
	const stripped = stripChatLink(input);
	if (!stripped) throw new TravelTemplateError('Empty code.');

	let bytes: Uint8Array;
	try {
		bytes = base64ToBytes(stripped);
	} catch {
		throw new TravelTemplateError('Code is not valid base64.');
	}

	if (bytes.length !== TRAVEL_EXPECTED_BYTES) {
		throw new TravelTemplateError(
			`Expected ${TRAVEL_EXPECTED_BYTES}-byte travel template, got ${bytes.length} bytes.`
		);
	}
	if (bytes[0] !== TRAVEL_HEADER) {
		throw new TravelTemplateError(
			`Wrong header byte: expected 0x10 (travel template), got 0x${bytes[0].toString(16).padStart(2, '0')}.`
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 1;
	const u16 = (): number => {
		const v = view.getUint16(offset, true);
		offset += 2;
		return v;
	};
	const slot = (): TravelSlotPiece => ({
		skinId: u16(),
		dyeIds: [u16(), u16(), u16(), u16()]
	});

	const result = {} as Record<string, TravelSlotPiece>;
	for (const name of TRAVEL_SLOT_ORDER) {
		result[name] = slot();
	}

	const terminator = u16();
	if (terminator !== TRAVEL_TERMINATOR) {
		throw new TravelTemplateError(
			`Bad terminator: expected 0x0FFF, got 0x${terminator.toString(16).padStart(4, '0')}.`
		);
	}

	return {
		...(result as Omit<TravelTemplate, 'raw'>),
		raw: `[&${bytesToBase64(bytes)}]`
	};
}

export function isTravelTemplateCode(input: string): boolean {
	try {
		const stripped = stripChatLink(input);
		const bytes = base64ToBytes(stripped);
		return bytes.length === TRAVEL_EXPECTED_BYTES && bytes[0] === TRAVEL_HEADER;
	} catch {
		return false;
	}
}

export function parseItemChatLink(input: string): number | null {
	try {
		const stripped = stripChatLink(input);
		const bytes = base64ToBytes(stripped);
		// Item link: header=0x02, count=1 byte, itemId=3 bytes LE, ...
		if (bytes.length < 6 || bytes[0] !== 0x02) return null;
		const itemId = bytes[2] | (bytes[3] << 8) | (bytes[4] << 16);
		return itemId > 0 ? itemId : null;
	} catch {
		return null;
	}
}

import type { Gw2EquipmentTab } from './api';

const API_SLOT_TO_ARMOR: Record<string, ArmorSlotId> = {
	HelmAquatic: 'aquabreather',
	Backpack: 'backpack',
	Coat: 'chest',
	Boots: 'boots',
	Gloves: 'gloves',
	Helm: 'helmet',
	Leggings: 'leggings',
	Shoulders: 'shoulders'
};

const API_SLOT_TO_WEAPON: Record<string, WeaponSlotId> = {
	WeaponAquaticA: 'aquaA',
	WeaponAquaticB: 'aquaB',
	WeaponA1: 'setA1',
	WeaponA2: 'setA2',
	WeaponB1: 'setB1',
	WeaponB2: 'setB2'
};

function defaultArmorPiece(): ArmorPiece {
	return { skinId: 0, dyeIds: [1, 1, 1, 1] };
}

function defaultVisibility(): VisibilityFlags {
	return {
		aquabreather: false, backpack: true, chest: true, boots: true,
		gloves: true, helmet: true, leggings: true, shoulders: true,
		outfit: false, aquaA: false, aquaB: false,
		setA1: true, setA2: true, setB1: false, setB2: false
	};
}

export function encodeFashionTemplate(t: FashionTemplate): string {
	const bytes = new Uint8Array(EXPECTED_BYTES);
	const view = new DataView(bytes.buffer);
	let offset = 0;

	const w16 = (v: number) => { view.setUint16(offset, v, true); offset += 2; };

	bytes[offset++] = FASHION_HEADER;

	w16(t.armor.aquabreather.skinId);
	for (const slot of ARMOR_PARSE_ORDER) {
		w16(t.armor[slot].skinId);
		for (const dye of t.armor[slot].dyeIds) w16(dye);
	}

	w16(t.outfit.outfitId);
	for (const dye of t.outfit.dyeIds) w16(dye);

	w16(t.weapons.aquaA);
	w16(t.weapons.aquaB);
	w16(t.weapons.setA1);
	w16(t.weapons.setA2);
	w16(t.weapons.setB1);
	w16(t.weapons.setB2);

	const vis = t.visibility;
	let flags = 0;
	if (vis.aquabreather) flags |= 1 << 0;
	if (vis.backpack)     flags |= 1 << 1;
	if (vis.chest)        flags |= 1 << 2;
	if (vis.boots)        flags |= 1 << 3;
	if (vis.gloves)       flags |= 1 << 4;
	if (vis.helmet)       flags |= 1 << 5;
	if (vis.leggings)     flags |= 1 << 6;
	if (vis.shoulders)    flags |= 1 << 7;
	if (vis.outfit)       flags |= 1 << 8;
	if (vis.aquaA)        flags |= 1 << 9;
	if (vis.aquaB)        flags |= 1 << 10;
	if (vis.setA1)        flags |= 1 << 11;
	if (vis.setA2)        flags |= 1 << 12;
	if (vis.setB1)        flags |= 1 << 13;
	if (vis.setB2)        flags |= 1 << 14;
	w16(flags);

	return `[&${bytesToBase64(bytes)}]`;
}

export interface EquipmentImportResult {
	template: FashionTemplate;
	/** Flat list of all infusion item IDs collected from every slot in the equipment tab. */
	infusionItemIds: number[];
}

export function equipmentTabToTemplate(tab: Gw2EquipmentTab): EquipmentImportResult {
	const armor: Record<ArmorSlotId, ArmorPiece> = {
		aquabreather: defaultArmorPiece(), backpack: defaultArmorPiece(),
		chest: defaultArmorPiece(), boots: defaultArmorPiece(), gloves: defaultArmorPiece(),
		helmet: defaultArmorPiece(), leggings: defaultArmorPiece(), shoulders: defaultArmorPiece()
	};
	const weapons: WeaponSet = { aquaA: 0, aquaB: 0, setA1: 0, setA2: 0, setB1: 0, setB2: 0 };
	const outfit: OutfitPiece = { outfitId: 0, dyeIds: [1, 1, 1, 1] };
	const infusionItemIds: number[] = [];

	for (const item of tab.equipment) {
		const armorSlot = API_SLOT_TO_ARMOR[item.slot];
		const weaponSlot = API_SLOT_TO_WEAPON[item.slot];
		if (armorSlot) {
			const raw = item.dyes ?? [];
			const dyeIds: [number, number, number, number] = [
				raw[0] ?? 1, raw[1] ?? 1, raw[2] ?? 1, raw[3] ?? 1
			];
			armor[armorSlot] = { skinId: item.skin ?? 0, dyeIds };
		} else if (weaponSlot) {
			weapons[weaponSlot] = item.skin ?? 0;
		}
		for (const infId of item.infusions ?? []) {
			if (infId > 0) infusionItemIds.push(infId);
		}
	}

	const template: FashionTemplate = {
		armor,
		outfit,
		weapons,
		visibility: defaultVisibility(),
		raw: ''
	};
	template.raw = encodeFashionTemplate(template);
	return { template, infusionItemIds };
}
