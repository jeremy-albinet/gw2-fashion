<script lang="ts">
	import type { Gw2Color, Gw2Skin } from '$lib/gw2/api';
	import SkinSlot from './SkinSlot.svelte';
	import DyeSwatch from './DyeSwatch.svelte';

	let {
		label,
		skin,
		dyeIds,
		colors
	}: {
		label: string;
		skin: Gw2Skin | undefined;
		dyeIds: [number, number, number, number];
		colors: Map<number, Gw2Color>;
	} = $props();

	const allDyes = $derived(
		dyeIds.map((id): Gw2Color | undefined => (id > 1 ? colors.get(id) : undefined))
	);
	const activeDyes = $derived(allDyes.filter((d): d is Gw2Color => d !== undefined));
	const dyeCount = $derived(activeDyes.length);
</script>

<div class="flex items-start gap-1">
	<SkinSlot {label} {skin} size={64} />

	<div class="w-16 h-16 shrink-0">
		{#if dyeCount === 4}
			<div class="grid gap-1" style="grid-template-columns:30px 30px;grid-template-rows:30px 30px">
				{#each allDyes as dye, i (i)}
					<DyeSwatch color={dye} width={30} height={30} />
				{/each}
			</div>
		{:else if dyeCount === 3}
			<div class="grid gap-1" style="grid-template-columns:30px 30px;grid-template-rows:30px 30px">
				<div style="grid-column: span 2">
					<DyeSwatch color={activeDyes[0]} width={64} height={30} />
				</div>
				<DyeSwatch color={activeDyes[1]} width={30} height={30} />
				<DyeSwatch color={activeDyes[2]} width={30} height={30} />
			</div>
		{:else if dyeCount === 2}
			<div class="flex flex-col gap-1">
				{#each activeDyes as dye, i (i)}
					<DyeSwatch color={dye} width={64} height={30} />
				{/each}
			</div>
		{:else if dyeCount === 1}
			<DyeSwatch color={activeDyes[0]} width={64} height={64} />
		{/if}
	</div>
</div>
