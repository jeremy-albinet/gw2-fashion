<script lang="ts">
	import type { FashionTemplate, WeaponSlotId, TravelTemplate } from '$lib/gw2/types';
	import { ARMOR_DISPLAY_ORDER, ARMOR_SLOT_LABELS, WEAPON_SLOT_LABELS, TRAVEL_SLOT_LABELS, MOUNT_DISPLAY_ORDER } from '$lib/gw2/types';
	import type { Gw2Color, Gw2Skin, Gw2MountSkin, Gw2Glider } from '$lib/gw2/api';
	import { fetchSkins, fetchColors, fetchMountSkins, fetchGliders } from '$lib/gw2/api';
	import type { OutfitInfusions } from '$lib/storage';
	import EquipmentRow from './EquipmentRow.svelte';
	import SkinSlot from './SkinSlot.svelte';
	import InfusionColumn from './InfusionColumn.svelte';

	let {
		template,
		infusions = { items: [] },
		onInfusionsChange,
		travel
	}: {
		template: FashionTemplate;
		infusions?: OutfitInfusions;
		onInfusionsChange?: (next: OutfitInfusions) => void;
		travel?: TravelTemplate;
	} = $props();

	let skins = $state<Map<number, Gw2Skin>>(new Map());
	let colors = $state<Map<number, Gw2Color>>(new Map());
	let mountSkinData = $state<Map<number, Gw2MountSkin>>(new Map());
	let gliderData = $state<Map<number, Gw2Glider>>(new Map());
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

	$effect(() => {
		if (!travel) return;

		const mountSkinIds = MOUNT_DISPLAY_ORDER.map((k) => travel[k].skinId).filter((id) => id > 0);
		if (mountSkinIds.length > 0) fetchMountSkins(mountSkinIds).then((m) => { mountSkinData = m; });

		if (travel.glider.skinId > 0) fetchGliders([travel.glider.skinId]).then((g) => { gliderData = g; });

		const displayDyes = [...MOUNT_DISPLAY_ORDER, 'glider' as const].flatMap((k) => travel[k].dyeIds).filter((id) => id > 1);
		if (displayDyes.length > 0) {
			fetchColors(displayDyes).then((c) => { colors = new Map([...colors, ...c]); });
		}
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

	type TravelRow = { key: string; label: string; skinId: number; dyeIds: [number, number, number, number]; icon: string | undefined; name: string | undefined };

	const travelRows = $derived<TravelRow[]>(
		!travel
			? []
			: MOUNT_DISPLAY_ORDER
				.map((slotKey): TravelRow | null => {
					const piece = travel[slotKey];
					if (piece.skinId === 0) return null;
					const m = mountSkinData.get(piece.skinId);
					return { key: slotKey, label: TRAVEL_SLOT_LABELS[slotKey], skinId: piece.skinId, dyeIds: piece.dyeIds, icon: m?.icon, name: m?.name };
				})
				.filter((r): r is TravelRow => r !== null)
	);

	const gliderRow = $derived<TravelRow | null>(
		travel && travel.glider.skinId > 0
			? (() => {
				const g = gliderData.get(travel.glider.skinId);
				return { key: 'glider', label: 'Glider', skinId: travel.glider.skinId, dyeIds: travel.glider.dyeIds, icon: g?.icon, name: g?.name };
			})()
			: null
	);

	let fashionCopied = $state(false);
	function copyFashionCode() {
		navigator.clipboard.writeText(template.raw).then(() => {
			fashionCopied = true;
			setTimeout(() => { fashionCopied = false; }, 1500);
		});
	}

	let travelCopied = $state(false);
	function copyTravelCode() {
		if (!travel) return;
		navigator.clipboard.writeText(travel.raw).then(() => {
			travelCopied = true;
			setTimeout(() => { travelCopied = false; }, 1500);
		});
	}
</script>

{#if loading && skins.size === 0}
	<div class="text-[var(--color-text-faint)] text-sm py-8 text-center">Loading skins…</div>
{:else}
	<div class="bg-black/40 p-6 inline-flex flex-col gap-4">
		<div class="flex gap-3">
			<div class="flex flex-col gap-1">
				{#each armorSlots as { slot, label, piece, skin } (slot)}
					<EquipmentRow {label} {skin} dyeIds={piece.dyeIds} {colors} />
					{#if slot === 'backpack' && gliderRow}
						<EquipmentRow
							label={gliderRow.label}
							skin={gliderRow.icon ? { id: gliderRow.skinId, name: gliderRow.name ?? gliderRow.label, type: 'glider', icon: gliderRow.icon } : undefined}
							dyeIds={gliderRow.dyeIds}
							{colors}
						/>
					{/if}
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

		{#if travelRows.length > 0}
			<div class="flex flex-col gap-1">
				{#each travelRows as row (row.key)}
					<EquipmentRow
						label={row.label}
						skin={row.icon ? { id: row.skinId, name: row.name ?? row.label, type: row.key, icon: row.icon } : undefined}
						dyeIds={row.dyeIds}
						{colors}
					/>
				{/each}
			</div>
		{/if}
		</div>

		<div class="flex items-center gap-1.5 pt-1 border-t border-white/10">
			<span class="text-[10px] text-[var(--color-text-faint)] font-semibold uppercase tracking-widest shrink-0">Fashion</span>
			<code class="text-[10px] font-mono text-[var(--color-text-faint)] truncate w-24">{template.raw}</code>
			<button
				type="button"
				onclick={copyFashionCode}
				class="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors shrink-0"
			>
				{fashionCopied ? '✓' : 'Copy'}
			</button>
		</div>

		{#if travel}
			<div class="flex items-center gap-1.5 pt-1 border-t border-white/10">
				<span class="text-[10px] text-[var(--color-text-faint)] font-semibold uppercase tracking-widest shrink-0">Travel</span>
				<code class="text-[10px] font-mono text-[var(--color-text-faint)] truncate w-24">{travel.raw}</code>
				<button
					type="button"
					onclick={copyTravelCode}
					class="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors shrink-0"
				>
					{travelCopied ? '✓' : 'Copy'}
				</button>
			</div>
		{/if}
	</div>
{/if}
