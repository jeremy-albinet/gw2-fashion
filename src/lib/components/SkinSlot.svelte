<script lang="ts">
	import type { Gw2Color, Gw2Skin } from '$lib/gw2/api';
	import DyeSwatch from './DyeSwatch.svelte';

	let {
		label,
		skin,
		dyeIds,
		colors
	}: {
		label: string;
		skin: Gw2Skin | undefined;
		dyeIds?: [number, number, number, number];
		colors?: Map<number, Gw2Color>;
	} = $props();

	const hasSkin = $derived(!!skin);
	const hasDyes = $derived(!!dyeIds && !!colors);
	const activeDyes = $derived(
		hasDyes
			? dyeIds!.filter((id) => id > 1).map((id) => colors!.get(id))
			: []
	);
</script>

<div class="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-0">
	<div class="w-10 h-10 flex-shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
		{#if skin?.icon}
			<img src={skin.icon} alt={skin.name} class="w-full h-full object-cover" loading="lazy" />
		{:else}
			<div class="w-full h-full bg-[var(--color-bg-elev)]"></div>
		{/if}
	</div>
	<div class="flex-1 min-w-0">
		<div class="text-xs text-[var(--color-text-faint)] uppercase tracking-wide leading-none mb-0.5">{label}</div>
		{#if hasSkin}
			<div class="text-sm text-[var(--color-text)] truncate">{skin!.name}</div>
		{:else}
			<div class="text-sm text-[var(--color-text-faint)] italic">Empty</div>
		{/if}
	</div>
	{#if hasDyes && activeDyes.length > 0}
		<div class="flex gap-0.5">
			{#each activeDyes as dye}
				<DyeSwatch color={dye} size={14} />
			{/each}
		</div>
	{/if}
</div>
