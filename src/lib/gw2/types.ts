export type ArmorSlotId =
	| 'aquabreather'
	| 'backpack'
	| 'chest'
	| 'boots'
	| 'gloves'
	| 'helmet'
	| 'leggings'
	| 'shoulders';

export type WeaponSlotId = 'aquaA' | 'aquaB' | 'setA1' | 'setA2' | 'setB1' | 'setB2';

export const ARMOR_SLOT_ORDER: readonly ArmorSlotId[] = [
	'aquabreather',
	'backpack',
	'chest',
	'boots',
	'gloves',
	'helmet',
	'leggings',
	'shoulders'
] as const;

export const ARMOR_DISPLAY_ORDER: readonly ArmorSlotId[] = [
	'helmet',
	'shoulders',
	'chest',
	'gloves',
	'leggings',
	'boots',
	'backpack',
	'aquabreather'
] as const;

export const WEAPON_DISPLAY_ORDER: readonly WeaponSlotId[] = [
	'setA1',
	'setA2',
	'setB1',
	'setB2',
	'aquaA',
	'aquaB'
] as const;

export const ARMOR_SLOT_LABELS: Record<ArmorSlotId, string> = {
	aquabreather: 'Aquabreather',
	backpack: 'Back',
	chest: 'Chest',
	boots: 'Boots',
	gloves: 'Gloves',
	helmet: 'Helm',
	leggings: 'Leggings',
	shoulders: 'Shoulders'
};

export const WEAPON_SLOT_LABELS: Record<WeaponSlotId, string> = {
	aquaA: 'Aquatic A',
	aquaB: 'Aquatic B',
	setA1: 'Mainhand A',
	setA2: 'Offhand A',
	setB1: 'Mainhand B',
	setB2: 'Offhand B'
};

export interface ArmorPiece {
	skinId: number;
	dyeIds: [number, number, number, number];
	/** Up to 3 infusion item IDs (0 = empty slot). */
	infusions: [number, number, number];
}

/** Per-weapon-slot infusion item IDs (up to 2 per weapon). */
export type WeaponInfusions = Partial<Record<WeaponSlotId, [number, number]>>;

export interface OutfitPiece {
	outfitId: number;
	dyeIds: [number, number, number, number];
}

export type WeaponSet = Record<WeaponSlotId, number>;

export interface VisibilityFlags {
	aquabreather: boolean;
	backpack: boolean;
	chest: boolean;
	boots: boolean;
	gloves: boolean;
	helmet: boolean;
	leggings: boolean;
	shoulders: boolean;
	outfit: boolean;
	aquaA: boolean;
	aquaB: boolean;
	setA1: boolean;
	setA2: boolean;
	setB1: boolean;
	setB2: boolean;
}

export interface FashionTemplate {
	armor: Record<ArmorSlotId, ArmorPiece>;
	outfit: OutfitPiece;
	weapons: WeaponSet;
	weaponInfusions: WeaponInfusions;
	visibility: VisibilityFlags;
	raw: string;
}
