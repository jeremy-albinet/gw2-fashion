<script lang="ts">
	import type { Gw2Skin } from '$lib/gw2/api';
	import { skinWardrobeLink, wikiUrl } from '$lib/gw2/chatlink';

	let {
		label,
		skin,
		size = 64
	}: {
		label: string;
		skin: Gw2Skin | undefined;
		size?: number;
	} = $props();

	let tooltipVisible = $state(false);
	let copied = $state(false);
	let tooltipEl = $state<HTMLDivElement | undefined>();
	let wrapperEl = $state<HTMLDivElement | undefined>();
	let above = $state(false);

	const skinType = $derived(
		skin ? [skin.type, skin.details?.type].filter(Boolean).join(' · ') : ''
	);

	function showTooltip() {
		if (!skin) return;
		tooltipVisible = true;
		requestAnimationFrame(() => {
			if (!tooltipEl || !wrapperEl) return;
			const rect = wrapperEl.getBoundingClientRect();
			above = rect.bottom + 140 > window.innerHeight;
		});
	}
	function hideTooltip() {
		tooltipVisible = false;
		copied = false;
	}

	async function copyChatCode(e: MouseEvent) {
		e.stopPropagation();
		if (!skin) return;
		await navigator.clipboard.writeText(skinWardrobeLink(skin.id));
		copied = true;
		setTimeout(() => { copied = false; }, 1800);
	}
</script>

<div
	bind:this={wrapperEl}
	class="relative shrink-0"
	style="width:{size}px;height:{size}px"
	onmouseenter={showTooltip}
	onmouseleave={hideTooltip}
	onfocusin={showTooltip}
	onfocusout={hideTooltip}
	role="presentation"
>
	<button
		type="button"
		class="block w-full h-full overflow-hidden bg-black/60 border-[3px] border-[#4a4a4a] transition-colors
			{skin ? 'cursor-pointer hover:border-[var(--color-accent)]' : ''}"
		onclick={copyChatCode}
		disabled={!skin}
		aria-label={skin ? `Copy chat code for ${skin.name}` : `Empty ${label}`}
		title={skin ? 'Click to copy chat code' : undefined}
	>
		{#if skin?.icon}
			<img src={skin.icon} alt={skin.name} class="w-full h-full object-cover" loading="lazy" />
		{/if}
	</button>

	{#if tooltipVisible && skin}
		<div
			bind:this={tooltipEl}
			class="absolute left-1/2 -translate-x-1/2 z-30 w-56 bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded-lg shadow-xl p-3 pointer-events-auto
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
					class="text-xs text-[var(--color-accent)] hover:underline"
					onclick={(e) => e.stopPropagation()}
				>
					View on Wiki →
				</a>
				<span class="text-xs text-[var(--color-text-dim)]">
					{copied ? '✓ Copied!' : 'Click to copy chat code'}
				</span>
			</div>
		</div>
	{/if}
</div>
