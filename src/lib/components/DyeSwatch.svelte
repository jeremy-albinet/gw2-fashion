<script lang="ts">
	import type { Gw2Color } from '$lib/gw2/api';
	import { dyeSwatchRgb } from '$lib/gw2/api';

	let { color, size = 16, width, height }: { color: Gw2Color | undefined; size?: number; width?: number; height?: number } = $props();

	const w = $derived(width ?? size);
	const h = $derived(height ?? size);
	const rgb = $derived(color ? dyeSwatchRgb(color) : null);
	const style = $derived(
		rgb ? `background:rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : 'background:#3a2f33'
	);

	let tooltipVisible = $state(false);
	let copied = $state(false);
	let above = $state(false);
	let wrapperEl = $state<HTMLElement | undefined>();
	let tooltipEl = $state<HTMLDivElement | undefined>();

	function showTooltip() {
		if (!color) return;
		tooltipVisible = true;
		requestAnimationFrame(() => {
			if (!tooltipEl || !wrapperEl) return;
			const rect = wrapperEl.getBoundingClientRect();
			above = rect.bottom + 80 > window.innerHeight;
		});
	}

	function hideTooltip() {
		tooltipVisible = false;
		copied = false;
	}

	async function handleClick(e: MouseEvent) {
		e.stopPropagation();
		if (!color) return;
		await navigator.clipboard.writeText(color.name);
		copied = true;
		setTimeout(() => { copied = false; }, 1800);
	}
</script>

<span
	bind:this={wrapperEl}
	class="relative inline-block"
	onmouseenter={showTooltip}
	onmouseleave={hideTooltip}
	onfocusin={showTooltip}
	onfocusout={hideTooltip}
	role="presentation"
>
	<button
		type="button"
		class="block rounded-sm border border-white/10 cursor-pointer hover:border-white/40 transition-colors focus:outline-none"
		style="{style};width:{w}px;height:{h}px"
		onclick={handleClick}
		aria-label={color ? `Dye: ${color.name} — click to copy name` : 'Unknown dye'}
		tabindex="0"
	></button>

	{#if tooltipVisible && color}
		<div
			bind:this={tooltipEl}
			class="absolute left-1/2 -translate-x-1/2 z-50 w-36 bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded-lg shadow-xl p-2 pointer-events-none
				{above ? 'bottom-full mb-1' : 'top-full mt-1'}"
			role="tooltip"
		>
			<div class="flex items-center gap-2 mb-1">
				<span class="w-4 h-4 rounded-sm border border-white/20 flex-shrink-0" style={style}></span>
				<p class="text-xs font-semibold text-[var(--color-text)] leading-tight truncate">{color.name}</p>
			</div>
			<p class="text-[10px] text-[var(--color-text-faint)] text-center">
				{copied ? '✓ Copied!' : 'Click to copy name'}
			</p>
		</div>
	{/if}
</span>
