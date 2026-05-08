<script lang="ts">
	import type { FashionTemplate } from '$lib/gw2/types';
	import { ARMOR_DISPLAY_ORDER, ARMOR_SLOT_LABELS, WEAPON_DISPLAY_ORDER, WEAPON_SLOT_LABELS } from '$lib/gw2/types';
	import type { Gw2Color, Gw2Skin } from '$lib/gw2/api';
	import { fetchSkins, fetchColors } from '$lib/gw2/api';
	import SkinSlot from './SkinSlot.svelte';

	let { template }: { template: FashionTemplate } = $props();

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

	const weaponSlots = $derived(
		WEAPON_DISPLAY_ORDER.map((slot) => ({
			slot,
			label: WEAPON_SLOT_LABELS[slot],
			skinId: template.weapons[slot],
			skin: template.weapons[slot] > 0 ? skins.get(template.weapons[slot]) : undefined
		}))
	);

	const hasOutfit = $derived(template.outfit.outfitId > 0);
</script>

{#if loading && skins.size === 0}
	<div class="text-[var(--color-text-faint)] text-sm py-8 text-center">Loading skins…</div>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<section>
			<h3 class="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-2">Armor & Back</h3>
			<div class="bg-[var(--color-bg-elev)] rounded-lg px-3">
				{#each armorSlots as { slot, label, piece, skin }}
					<SkinSlot {label} {skin} dyeIds={piece.dyeIds} {colors} />
				{/each}
			</div>
		</section>

		<section>
			<h3 class="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-2">Weapons</h3>
			<div class="bg-[var(--color-bg-elev)] rounded-lg px-3">
				{#each weaponSlots as { slot, label, skinId, skin }}
					<SkinSlot {label} {skin} />
				{/each}
			</div>

			{#if hasOutfit}
				<h3 class="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mt-4 mb-2">Outfit</h3>
				<div class="bg-[var(--color-bg-elev)] rounded-lg px-3">
					<SkinSlot
						label="Outfit"
						skin={skins.get(template.outfit.outfitId)}
						dyeIds={template.outfit.dyeIds}
						{colors}
					/>
				</div>
			{/if}
		</section>
	</div>
{/if}
