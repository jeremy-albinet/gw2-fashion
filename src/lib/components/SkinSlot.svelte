<script lang="ts">
	import type { Gw2Color, Gw2Skin } from '$lib/gw2/api';
	import { skinWardrobeLink, wikiUrl } from '$lib/gw2/chatlink';
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

	const hasDyes = $derived(!!dyeIds && !!colors);
	const activeDyes = $derived(
		hasDyes ? dyeIds!.filter((id) => id > 1).map((id) => colors!.get(id)) : []
	);

	let tooltipVisible = $state(false);
	let copied = $state(false);
	let tooltipEl = $state<HTMLDivElement | undefined>();
	let wrapperEl = $state<HTMLDivElement | undefined>();
	let above = $state(false);

	function showTooltip() {
		if (!skin) return;
		tooltipVisible = true;
		requestAnimationFrame(() => {
			if (!tooltipEl || !wrapperEl) return;
			const rect = wrapperEl.getBoundingClientRect();
			above = rect.bottom + 120 > window.innerHeight;
		});
	}
	function hideTooltip() {
		tooltipVisible = false;
		copied = false;
	}

	async function copyChatCode(e: MouseEvent) {
		e.stopPropagation();
		if (!skin) return;
		const code = skinWardrobeLink(skin.id);
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => { copied = false; }, 1800);
	}

	const skinType = $derived(
		skin ? [skin.type, skin.details?.type].filter(Boolean).join(' · ') : ''
	);
</script>

<div
	bind:this={wrapperEl}
	class="relative flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-0"
	onmouseenter={showTooltip}
	onmouseleave={hideTooltip}
	onfocusin={showTooltip}
	onfocusout={hideTooltip}
	role="presentation"
>
	<button
		type="button"
		class="w-10 h-10 flex-shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden
			{skin ? 'cursor-pointer hover:border-[var(--color-accent)] transition-colors' : ''}"
		onclick={copyChatCode}
		disabled={!skin}
		aria-label={skin ? `Copy chat code for ${skin.name}` : 'Empty slot'}
		title={skin ? 'Click to copy chat code' : undefined}
	>
		{#if skin?.icon}
			<img src={skin.icon} alt={skin.name} class="w-full h-full object-cover" loading="lazy" />
		{:else}
			<div class="w-full h-full bg-[var(--color-bg-elev)]"></div>
		{/if}
	</button>

	<div class="flex-1 min-w-0">
		<div class="text-xs text-[var(--color-text-faint)] uppercase tracking-wide leading-none mb-0.5">{label}</div>
		{#if skin}
			<div class="text-sm text-[var(--color-text)] truncate">{skin.name}</div>
		{:else}
			<div class="text-sm text-[var(--color-text-faint)] italic">Empty</div>
		{/if}
	</div>

	{#if hasDyes && activeDyes.length > 0}
		<div class="flex gap-0.5 shrink-0">
			{#each activeDyes as dye}
				<DyeSwatch color={dye} size={14} />
			{/each}
		</div>
	{/if}

	{#if tooltipVisible && skin}
		<div
			bind:this={tooltipEl}
			class="absolute left-0 z-30 w-52 bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded-lg shadow-xl p-3 pointer-events-auto
				{above ? 'bottom-full mb-1' : 'top-full mt-1'}"
			role="tooltip"
		>
			<p class="font-semibold text-sm text-[var(--color-text)] leading-tight">{skin.name}</p>
			{#if skinType}
				<p class="text-xs text-[var(--color-text-faint)] mt-0.5">{skinType}</p>
			{/if}
			<div class="mt-2 pt-2 border-t border-[var(--color-border)] flex flex-col gap-1.5">
				<a
					href={wikiUrl(skin.name)}
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
					onclick={(e) => e.stopPropagation()}
				>
					View on Wiki →
				</a>
				<button
					type="button"
					onclick={copyChatCode}
					class="text-xs text-left text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
				>
					{copied ? '✓ Copied!' : 'Click icon to copy chat code'}
				</button>
			</div>
		</div>
	{/if}
</div>
