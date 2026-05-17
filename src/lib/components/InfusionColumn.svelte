<script lang="ts">
	import catalog from '$lib/gw2/infusions.generated.json';
	import { fetchItems, type Gw2Item } from '$lib/gw2/api';
	import { wikiUrl } from '$lib/gw2/chatlink';
	import InfusionPicker from './InfusionPicker.svelte';
	import type { InfusionEntry, OutfitInfusions } from '$lib/storage';

	type CatalogInfusion = { id: number; name: string; icon: string; chatLink: string; buff: string };

	const CATALOG_MAP = new Map(
		(catalog.infusions as CatalogInfusion[]).map((inf) => [inf.id, inf])
	);

	let {
		infusions,
		onChange
	}: {
		infusions: OutfitInfusions;
		onChange?: (next: OutfitInfusions) => void;
	} = $props();

	const items = $derived(infusions.items);
	const editable = $derived(!!onChange);

	let pickerOpen = $state(false);
	let pickerEditIndex = $state<number | null>(null);

	let fetchedItems = $state<Map<number, Gw2Item>>(new Map());

	$effect(() => {
		const unknownIds = items
			.map((e) => e.itemId)
			.filter((id) => id > 0 && !CATALOG_MAP.has(id) && !fetchedItems.has(id));
		if (unknownIds.length === 0) return;
		fetchItems(unknownIds).then((result) => {
			fetchedItems = new Map([...fetchedItems, ...result]);
		});
	});

	type Resolved = {
		entry: InfusionEntry;
		index: number;
		name: string;
		icon: string | undefined;
		chatLink: string | undefined;
	};

	const resolved = $derived<Resolved[]>(
		items.map((entry, index) => {
			const cat = CATALOG_MAP.get(entry.itemId);
			if (cat) {
				return {
					entry,
					index,
					name: cat.name,
					icon: cat.icon,
					chatLink: cat.chatLink
				};
			}
			const fetched = fetchedItems.get(entry.itemId);
			return {
				entry,
				index,
				name: fetched?.name ?? `Infusion #${entry.itemId}`,
				icon: fetched?.icon,
				chatLink: fetched?.chat_link
			};
		})
	);

	let hoverIndex = $state<number | null>(null);
	let tooltipAbove = $state(false);
	let entryRefs = $state<(HTMLDivElement | undefined)[]>([]);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	function showTooltip(index: number) {
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
		hoverIndex = index;
		requestAnimationFrame(() => {
			const el = entryRefs[index];
			if (!el) return;
			const rect = el.getBoundingClientRect();
			tooltipAbove = rect.bottom + 140 > window.innerHeight;
		});
	}

	function hideTooltip() {
		if (hideTimer) clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			hoverIndex = null;
			hideTimer = null;
		}, 200);
	}

	function keepTooltip() {
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
	}

	function openAddPicker() {
		pickerEditIndex = null;
		pickerOpen = true;
	}

	function openEditPicker(index: number) {
		pickerEditIndex = index;
		pickerOpen = true;
	}

	function removeAt(index: number) {
		if (!onChange) return;
		const next = items.filter((_, i) => i !== index);
		onChange({ items: next });
	}

	function incrementAt(index: number, delta: number) {
		if (!onChange) return;
		const next = items
			.map((entry, i) =>
				i === index ? { ...entry, count: Math.max(1, entry.count + delta) } : entry
			);
		onChange({ items: next });
	}

	function handlePickerSelect(itemId: number) {
		if (!onChange) return;
		if (pickerEditIndex !== null) {
			const next = items.map((entry, i) =>
				i === pickerEditIndex ? { ...entry, itemId } : entry
			);
			onChange({ items: next });
		} else {
			const existing = items.findIndex((entry) => entry.itemId === itemId);
			if (existing >= 0) {
				const next = items.map((entry, i) =>
					i === existing ? { ...entry, count: entry.count + 1 } : entry
				);
				onChange({ items: next });
			} else {
				onChange({ items: [...items, { itemId, count: 1 }] });
			}
		}
		pickerOpen = false;
		pickerEditIndex = null;
	}

	async function copyChatLink(chatLink: string | undefined, e: MouseEvent) {
		e.stopPropagation();
		if (!chatLink) return;
		await navigator.clipboard.writeText(chatLink);
	}
</script>

<div class="flex flex-col gap-1 shrink-0" style="width:64px">
	{#each resolved as r (r.index)}
		<div
			bind:this={entryRefs[r.index]}
			class="relative shrink-0"
			style="width:64px;height:64px"
			onmouseenter={() => showTooltip(r.index)}
			onmouseleave={hideTooltip}
			role="presentation"
		>
			<button
				type="button"
				class="block w-full h-full overflow-hidden bg-black/60 border-[3px] border-[#4a4a4a] hover:border-[var(--color-accent)] transition-colors relative
					{editable ? 'cursor-pointer' : ''}"
				onclick={(e) => {
					if (editable) {
						e.stopPropagation();
						openEditPicker(r.index);
					}
				}}
				disabled={!editable}
				aria-label={editable ? `Edit infusion: ${r.name}` : `Infusion: ${r.name}`}
			>
				{#if r.icon}
					<img src={r.icon} alt={r.name} class="w-full h-full object-cover" loading="lazy" />
				{:else}
					<span class="flex items-center justify-center w-full h-full text-xs text-[var(--color-text-faint)]">?</span>
				{/if}
				{#if r.entry.count > 1}
					<span
						class="absolute bottom-0 right-1 text-white font-bold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
						style="font-size:14px"
					>
						{r.entry.count}
					</span>
				{/if}
			</button>

			{#if hoverIndex === r.index}
				<div
					class="absolute right-full z-30 pr-2 pointer-events-auto
						{tooltipAbove ? 'bottom-0' : 'top-0'}"
					role="tooltip"
					onmouseenter={keepTooltip}
					onmouseleave={hideTooltip}
				>
				<div
					class="w-52 bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded-lg shadow-xl p-3"
				>
					<p class="font-semibold text-sm text-[var(--color-text)] leading-tight">{r.name}</p>
					<p class="text-xs text-[var(--color-text-faint)] mt-0.5">Stack: ×{r.entry.count}</p>
					<div class="mt-2 pt-2 border-t border-[var(--color-border)] flex flex-col gap-1.5">
						<a
							href={wikiUrl(r.name)}
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-[var(--color-accent)] hover:underline"
							onclick={(e) => e.stopPropagation()}
						>
							View on Wiki →
						</a>
						{#if r.chatLink}
							<button
								type="button"
								class="text-xs text-left text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
								onclick={(e) => copyChatLink(r.chatLink, e)}
							>
								Copy chat code
							</button>
						{/if}
						{#if editable}
							<div class="flex items-center gap-1 mt-1">
								<button
									type="button"
									class="px-2 py-0.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] text-[var(--color-text)]"
									onclick={(e) => { e.stopPropagation(); incrementAt(r.index, -1); }}
									aria-label="Decrease count"
								>−</button>
								<span class="text-xs text-[var(--color-text-dim)] px-1">×{r.entry.count}</span>
								<button
									type="button"
									class="px-2 py-0.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] text-[var(--color-text)]"
									onclick={(e) => { e.stopPropagation(); incrementAt(r.index, 1); }}
									aria-label="Increase count"
								>+</button>
								<button
									type="button"
									class="ml-auto px-2 py-0.5 text-xs bg-red-500/10 border border-red-500/30 rounded hover:bg-red-500/20 text-red-400"
									onclick={(e) => { e.stopPropagation(); removeAt(r.index); hideTooltip(); }}
								>Remove</button>
							</div>
						{/if}
					</div>
				</div>
				</div>
			{/if}
		</div>
	{/each}

	{#if editable}
		<button
			type="button"
			class="shrink-0 bg-black/60 border-[3px] border-dashed border-[#4a4a4a] hover:border-[var(--color-accent)] text-[var(--color-text-faint)] hover:text-[var(--color-accent)] transition-colors flex items-center justify-center"
			style="width:64px;height:64px"
			onclick={openAddPicker}
			aria-label="Add infusion"
		>
			<span class="text-2xl leading-none">+</span>
		</button>
	{/if}
</div>

{#if pickerOpen}
	<InfusionPicker
		slotLabel={pickerEditIndex !== null ? `Replace infusion #${pickerEditIndex + 1}` : 'Add infusion'}
		currentId={pickerEditIndex !== null ? items[pickerEditIndex].itemId : 0}
		onSelect={handlePickerSelect}
		onClose={() => { pickerOpen = false; pickerEditIndex = null; }}
	/>
{/if}
