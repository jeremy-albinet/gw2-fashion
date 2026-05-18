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
	'backpack'
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

export const MOUNT_TYPE_IDS = [
	'raptor',
	'springer',
	'skimmer',
	'jackal',
	'griffon',
	'roller_beetle',
	'warclaw',
	'skyscale',
	'siege_turtle'
] as const;
export type MountTypeId = (typeof MOUNT_TYPE_IDS)[number];

export const MOUNT_TYPE_LABELS: Record<MountTypeId, string> = {
	raptor: 'Raptor',
	springer: 'Springer',
	skimmer: 'Skimmer',
	jackal: 'Jackal',
	griffon: 'Griffon',
	roller_beetle: 'Roller Beetle',
	warclaw: 'Warclaw',
	skyscale: 'Skyscale',
	siege_turtle: 'Siege Turtle'
};

export interface TravelSlotPiece {
	skinId: number;
	dyeIds: [number, number, number, number];
}

export interface TravelTemplate {
	glider: TravelSlotPiece;
	doorway: TravelSlotPiece;
	jackal: TravelSlotPiece;
	griffon: TravelSlotPiece;
	springer: TravelSlotPiece;
	skimmer: TravelSlotPiece;
	raptor: TravelSlotPiece;
	roller_beetle: TravelSlotPiece;
	warclaw: TravelSlotPiece;
	skyscale: TravelSlotPiece;
	skiff: TravelSlotPiece;
	siege_turtle: TravelSlotPiece;
	raw: string;
}

export type TravelSlotId = keyof Omit<TravelTemplate, 'raw'>;

export const TRAVEL_SLOT_ORDER: readonly TravelSlotId[] = [
	'glider', 'doorway', 'jackal', 'griffon', 'springer', 'skimmer',
	'raptor', 'roller_beetle', 'warclaw', 'skyscale', 'skiff', 'siege_turtle'
] as const;

export const TRAVEL_SLOT_LABELS: Record<TravelSlotId, string> = {
	glider: 'Glider',
	doorway: 'Doorway',
	jackal: 'Jackal',
	griffon: 'Griffon',
	springer: 'Springer',
	skimmer: 'Skimmer',
	raptor: 'Raptor',
	roller_beetle: 'Roller Beetle',
	warclaw: 'Warclaw',
	skyscale: 'Skyscale',
	skiff: 'Skiff',
	siege_turtle: 'Siege Turtle'
};

export const MOUNT_DISPLAY_ORDER = [
	'raptor',
	'springer',
	'skimmer',
	'jackal',
	'griffon',
	'roller_beetle',
	'warclaw',
	'skyscale',
] as const satisfies readonly TravelSlotId[];

export interface MountSkinPiece {
	skinId: number;
	dyeIds: number[];
}

export interface GliderPiece {
	gliderId: number;
	dyeIds: [number, number, number, number];
}

export interface ArmorPiece {
	skinId: number;
	dyeIds: [number, number, number, number];
}

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
	visibility: VisibilityFlags;
	raw: string;
}
