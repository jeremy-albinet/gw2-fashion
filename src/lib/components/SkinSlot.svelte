<script lang="ts">
	import type { Gw2Color, Gw2Skin } from '$lib/gw2/api';
	import { dyeSwatchRgb } from '$lib/gw2/api';
	import { skinWardrobeLink, wikiUrl } from '$lib/gw2/chatlink';
	import DyeSwatch from './DyeSwatch.svelte';
	import InfusionPicker from './InfusionPicker.svelte';
	import catalog from '$lib/gw2/infusions.generated.json';

	const INFUSION_MAP = new Map(
		(catalog.infusions as { id: number; name: string; icon: string; buff: string }[]).map((inf) => [inf.id, inf])
	);

	let {
		label,
		skin,
		dyeIds,
		colors,
		infusions,
		onInfusionChange
	}: {
		label: string;
		skin: Gw2Skin | undefined;
		dyeIds?: [number, number, number, number];
		colors?: Map<number, Gw2Color>;
		infusions?: [number, number, number] | [number, number];
		onInfusionChange?: (slotIndex: number, itemId: number) => void;
	} = $props();

	const hasDyes = $derived(!!dyeIds && !!colors);
	// All 4 slots resolved; undefined = empty (id <= 1)
	const allDyes = $derived(
		hasDyes ? dyeIds!.map((id): Gw2Color | undefined => (id > 1 ? colors!.get(id) : undefined)) : []
	);
	const activeDyes = $derived(allDyes.filter((d): d is Gw2Color => d !== undefined));
	// How many of the 4 slots are non-empty — determines layout
	const dyeCount = $derived(activeDyes.length);

	const activeInfusions = $derived(
		(infusions ?? []).map((id, i) => ({ id, index: i, info: id > 0 ? INFUSION_MAP.get(id) : undefined }))
	);
	const hasInfusionSupport = $derived(!!onInfusionChange);

	let tooltipVisible = $state(false);
	let copied = $state(false);
	let tooltipEl = $state<HTMLDivElement | undefined>();
	let wrapperEl = $state<HTMLDivElement | undefined>();
	let above = $state(false);

	// Infusion picker state
	let pickerOpen = $state(false);
	let pickerSlotIndex = $state(0);

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
		if (pickerOpen) return;
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

	function openPicker(e: MouseEvent, slotIndex: number) {
		e.stopPropagation();
		pickerSlotIndex = slotIndex;
		pickerOpen = true;
		tooltipVisible = false;
	}

	function handleInfusionSelect(itemId: number) {
		onInfusionChange?.(pickerSlotIndex, itemId);
		pickerOpen = false;
	}

	const skinType = $derived(
		skin ? [skin.type, skin.details?.type].filter(Boolean).join(' · ') : ''
	);

	const currentPickerInfusionId = $derived(infusions?.[pickerSlotIndex] ?? 0);

	function dyeSwatchStyle(color: Gw2Color | undefined): string {
		if (!color) return 'background:#1a1318';
		const rgb = dyeSwatchRgb(color);
		return `background:rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
	}
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

	<!-- Dyes — GW2-style layout: always a compact grid, size depends on slot count -->
	{#if hasDyes && dyeCount > 0}
		{#if dyeCount === 4}
			<!-- 2×2 grid -->
			<div class="grid grid-cols-2 gap-px shrink-0">
				{#each allDyes as dye, i (i)}
					<DyeSwatch color={dye} size={10} />
				{/each}
			</div>
		{:else if dyeCount === 3}
			<!-- 2 small top, 1 wide bottom spanning full width -->
			<div class="shrink-0 flex flex-col gap-px" style="width:21px">
				<div class="flex gap-px">
					{#each allDyes.slice(0, 2) as dye, i (i)}
						<DyeSwatch color={dye} size={10} />
					{/each}
				</div>
				<DyeSwatch color={allDyes[2]} width={21} height={10} />
			</div>
		{:else}
			<!-- 1 or 2 dyes: simple row -->
			<div class="flex gap-px shrink-0">
				{#each activeDyes as dye, i (i)}
					<DyeSwatch color={dye} size={10} />
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Infusion slots -->
	{#if infusions !== undefined}
		<div class="flex gap-0.5 shrink-0">
			{#each (infusions as number[]) as infId, i (i)}
				{@const inf = infId > 0 ? INFUSION_MAP.get(infId) : undefined}
				<button
					type="button"
					onclick={(e) => openPicker(e, i)}
					class="w-5 h-5 rounded border transition-colors overflow-hidden
						{infId > 0
							? 'border-[var(--color-accent)]/60 hover:border-[var(--color-accent)]'
							: 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50 bg-[var(--color-bg-elev)]'}"
					title={inf ? inf.name : hasInfusionSupport ? `Add infusion (slot ${i + 1})` : `Infusion slot ${i + 1} (empty)`}
					aria-label={inf ? `Infusion: ${inf.name}` : `Infusion slot ${i + 1}`}
				>
					{#if inf?.icon}
						<img src={inf.icon} alt="" class="w-full h-full object-cover" />
					{:else if hasInfusionSupport}
						<span class="flex items-center justify-center w-full h-full text-[8px] text-[var(--color-text-faint)] leading-none">+</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	{#if tooltipVisible && skin}
		<div
			bind:this={tooltipEl}
			class="absolute left-0 z-30 w-56 bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded-lg shadow-xl p-3 pointer-events-auto
				{above ? 'bottom-full mb-1' : 'top-full mt-1'}"
			role="tooltip"
		>
			<p class="font-semibold text-sm text-[var(--color-text)] leading-tight">{skin.name}</p>
			{#if skinType}
				<p class="text-xs text-[var(--color-text-faint)] mt-0.5">{skinType}</p>
			{/if}

			<!-- Dyes in tooltip -->
			{#if activeDyes.length > 0}
				<div class="mt-2 pt-2 border-t border-[var(--color-border)]">
					<p class="text-xs text-[var(--color-text-faint)] mb-1.5">Dyes</p>
					<div class="flex flex-col gap-1">
						{#each activeDyes as dye (dye.id)}
							<div class="flex items-center gap-2">
								<span
									class="w-3.5 h-3.5 rounded-sm border border-white/20 flex-shrink-0"
									style={dyeSwatchStyle(dye)}
								></span>
								<span class="text-xs text-[var(--color-text)] truncate">{dye.name}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if activeInfusions.some((i) => i.id > 0)}
				<div class="mt-2 pt-2 border-t border-[var(--color-border)]">
					<p class="text-xs text-[var(--color-text-faint)] mb-1">Infusions</p>
					{#each activeInfusions.filter((i) => i.id > 0) as { info, id } (id)}
						<p class="text-xs text-[var(--color-text)]">{info?.name ?? `#${id}`}</p>
					{/each}
				</div>
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

{#if pickerOpen}
	<InfusionPicker
		slotLabel="{label} — slot {pickerSlotIndex + 1}"
		currentId={currentPickerInfusionId}
		onSelect={handleInfusionSelect}
		onClose={() => { pickerOpen = false; }}
	/>
{/if}
