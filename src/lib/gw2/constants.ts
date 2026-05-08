export const RACES = ['Asura', 'Charr', 'Human', 'Norn', 'Sylvari'] as const;
export const GENDERS = ['Male', 'Female'] as const;
export const PROFESSIONS = [
	'Elementalist', 'Engineer', 'Guardian', 'Mesmer', 'Necromancer',
	'Ranger', 'Revenant', 'Thief', 'Warrior'
] as const;

export type Race = (typeof RACES)[number];
export type Gender = (typeof GENDERS)[number];
export type Profession = (typeof PROFESSIONS)[number];
