<script lang="ts">
	import type { FashionTemplate, WeaponSlotId } from '$lib/gw2/types';
	import { ARMOR_DISPLAY_ORDER, ARMOR_SLOT_LABELS, WEAPON_SLOT_LABELS } from '$lib/gw2/types';
	import type { Gw2Color, Gw2Skin } from '$lib/gw2/api';
	import { fetchSkins, fetchColors } from '$lib/gw2/api';
	import type { OutfitInfusions } from '$lib/storage';
	import EquipmentRow from './EquipmentRow.svelte';
	import SkinSlot from './SkinSlot.svelte';
	import InfusionColumn from './InfusionColumn.svelte';

	let {
		template,
		infusions = { items: [] },
		onInfusionsChange
	}: {
		template: FashionTemplate;
		infusions?: OutfitInfusions;
		onInfusionsChange?: (next: OutfitInfusions) => void;
	} = $props();

	let skins = $state<Map<number, Gw2Skin>>(new Map());
	let colors = $state<Map<number, Gw2Color>>(new Map());
	let loading = $state(true);

	$effect(() => {
		const skinIds = [
			...Object.values(template.armor).map((p) => p.skinId),
			...Object.values(template.weapons),
			template.outfit.outfitId
		].filter((id) => id > 0);

		const dyeIds = [
			...Object.values(template.armor).flatMap((p) => p.dyeIds),
			...template.outfit.dyeIds
		].filter((id) => id > 1);

		loading = true;
		Promise.all([fetchSkins(skinIds), fetchColors(dyeIds)]).then(([s, c]) => {
			skins = s;
			colors = c;
			loading = false;
		});
	});

	const armorSlots = $derived(
		ARMOR_DISPLAY_ORDER.map((slot) => ({
			slot,
			label: ARMOR_SLOT_LABELS[slot],
			piece: template.armor[slot],
			skin: template.armor[slot].skinId > 0 ? skins.get(template.armor[slot].skinId) : undefined
		})).filter((s) => s.skin || s.piece.skinId === 0)
	);

	const WEAPON_ORDER: readonly WeaponSlotId[] = ['setA1', 'setA2', 'setB1', 'setB2', 'aquaA', 'aquaB'];

	const weaponSkins = $derived(
		WEAPON_ORDER
			.map((slot) => ({
				slot,
				label: WEAPON_SLOT_LABELS[slot],
				skinId: template.weapons[slot],
				skin: template.weapons[slot] > 0 ? skins.get(template.weapons[slot]) : undefined
			}))
			.filter((w) => w.skin)
	);

	const hasOutfit = $derived(template.outfit.outfitId > 0);
</script>

{#if loading && skins.size === 0}
	<div class="text-[var(--color-text-faint)] text-sm py-8 text-center">Loading skins…</div>
{:else}
	<div class="bg-black/40 p-6 inline-flex">
		<div class="flex gap-3">
			<div class="flex flex-col gap-1">
				{#each armorSlots as { slot, label, piece, skin } (slot)}
					<EquipmentRow {label} {skin} dyeIds={piece.dyeIds} {colors} />
				{/each}
				{#if hasOutfit}
					<EquipmentRow
						label="Outfit"
						skin={skins.get(template.outfit.outfitId)}
						dyeIds={template.outfit.dyeIds}
						{colors}
					/>
				{/if}
			</div>

			{#if weaponSkins.length > 0}
				<div class="flex flex-col gap-1">
					{#each weaponSkins as w (w.slot)}
						<SkinSlot label={w.label} skin={w.skin} size={64} />
					{/each}
				</div>
			{/if}

			{#if infusions.items.length > 0 || onInfusionsChange}
				<InfusionColumn {infusions} onChange={onInfusionsChange} />
			{/if}
		</div>
	</div>
{/if}
