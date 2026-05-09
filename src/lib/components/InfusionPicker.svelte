<script lang="ts">
	import catalog from '$lib/gw2/infusions.generated.json';
	import { parseItemChatLink } from '$lib/gw2/decoder';
	import { fetchItems } from '$lib/gw2/api';

	const ALL_INFUSIONS = catalog.infusions as {
		id: number;
		name: string;
		icon: string;
		rarity: string;
		chatLink: string;
		category: string;
		buff: string;
		attributes: { attribute: string; modifier: number }[];
	}[];

	const CATEGORIES = ['all', 'infusion', 'enrichment', 'agony', 'defense', 'offense', 'utility', 'other'] as const;
	type Category = (typeof CATEGORIES)[number];

	let {
		slotLabel,
		currentId = 0,
		onSelect,
		onClose
	}: {
		slotLabel: string;
		currentId?: number;
		onSelect: (id: number) => void;
		onClose: () => void;
	} = $props();

	let query = $state('');
	let category = $state<Category>('all');
	let pasteInput = $state('');
	let pasteError = $state('');
	let pasteLoading = $state(false);

	const filtered = $derived(
		ALL_INFUSIONS.filter((inf) => {
			const matchCat = category === 'all' || inf.category === category;
			const q = query.trim().toLowerCase();
			const matchQ = !q || inf.name.toLowerCase().includes(q) || inf.buff.toLowerCase().includes(q);
			return matchCat && matchQ;
		})
	);

	async function handlePaste() {
		pasteError = '';
		const input = pasteInput.trim();
		if (!input) return;

		// First check if it matches something in our static catalog
		const directMatch = ALL_INFUSIONS.find(
			(inf) => inf.chatLink === input || inf.chatLink === `[&${input}]`
		);
		if (directMatch) {
			onSelect(directMatch.id);
			return;
		}

		// Try to parse as item chat link
		const itemId = parseItemChatLink(input);
		if (!itemId) {
			pasteError = 'Not a valid item chat link. Try something like [&AgEYwQAA].';
			return;
		}

		// Check if it's in our catalog
		const catalogMatch = ALL_INFUSIONS.find((inf) => inf.id === itemId);
		if (catalogMatch) {
			onSelect(catalogMatch.id);
			return;
		}

		// Unknown ID — try fetching from GW2 API to confirm it's an infusion
		pasteLoading = true;
		try {
			const items = await fetchItems([itemId]);
			const item = items.get(itemId);
			if (!item) {
				pasteError = `Item #${itemId} not found in the GW2 API.`;
				return;
			}
			const flags = item.details?.infusion_upgrade_flags ?? [];
			if (!flags.includes('Infusion') && !flags.includes('Enrichment')) {
				pasteError = `"${item.name}" is not an infusion item.`;
				return;
			}
			// Accept it even if not in our catalog
			onSelect(itemId);
		} catch {
			pasteError = 'Could not verify item via GW2 API. Check your connection.';
		} finally {
			pasteLoading = false;
		}
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
	onkeydown={handleKey}
	onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
	<div class="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
		<!-- Header -->
		<div class="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--color-border)] shrink-0">
			<div>
				<h2 class="font-semibold text-[var(--color-text)] text-sm">Select Infusion</h2>
				<p class="text-xs text-[var(--color-text-faint)] mt-0.5">{slotLabel}</p>
			</div>
			<button
				type="button"
				onclick={onClose}
				class="text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-colors text-lg leading-none"
				aria-label="Close"
			>✕</button>
		</div>

		<!-- Paste section -->
		<div class="px-4 py-3 border-b border-[var(--color-border)] shrink-0">
			<p class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">Paste item chat link</p>
			<div class="flex gap-2">
				<input
					bind:value={pasteInput}
					placeholder="[&AgEYwQAA]"
					class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
					onkeydown={(e) => { if (e.key === 'Enter') handlePaste(); }}
				/>
				<button
					type="button"
					onclick={handlePaste}
					disabled={pasteLoading}
					class="bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-3 py-1.5 rounded text-sm hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-50 whitespace-nowrap"
				>{pasteLoading ? '…' : 'Use'}</button>
			</div>
			{#if pasteError}
				<p class="text-xs text-red-400 mt-1">{pasteError}</p>
			{/if}
		</div>

		<!-- Search + filter -->
		<div class="px-4 py-3 border-b border-[var(--color-border)] shrink-0 space-y-2">
			<input
				bind:value={query}
				placeholder="Search infusions…"
				class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
			/>
			<div class="flex gap-1 flex-wrap">
				{#each CATEGORIES as cat, _i (_i)}
					<button
						type="button"
						onclick={() => { category = cat; }}
						class="px-2 py-0.5 rounded text-xs capitalize transition-colors
							{category === cat
								? 'bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold'
								: 'bg-[var(--color-bg-elev)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'}"
					>{cat}</button>
				{/each}
			</div>
		</div>

		<!-- List -->
		<div class="overflow-y-auto flex-1 px-2 py-2">
			{#if currentId > 0}
				<button
					type="button"
					onclick={() => onSelect(0)}
					class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-[var(--color-bg-elev)] transition-colors mb-1 text-xs text-[var(--color-text-faint)] italic"
				>Clear infusion</button>
			{/if}

			{#if filtered.length === 0}
				<p class="text-center text-sm text-[var(--color-text-faint)] py-8">No infusions found.</p>
			{:else}
				{#each filtered as inf (inf.id)}
					<button
						type="button"
						onclick={() => onSelect(inf.id)}
						class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-left transition-colors
							{currentId === inf.id
								? 'bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/40'
								: 'hover:bg-[var(--color-bg-elev)]'}"
					>
						{#if inf.icon}
							<img src={inf.icon} alt="" class="w-8 h-8 rounded shrink-0 object-cover" loading="lazy" />
						{:else}
							<div class="w-8 h-8 rounded shrink-0 bg-[var(--color-bg-elev)]"></div>
						{/if}
						<div class="flex-1 min-w-0">
							<div class="text-sm text-[var(--color-text)] truncate">{inf.name}</div>
							{#if inf.buff}
								<div class="text-xs text-[var(--color-text-faint)] truncate">{inf.buff}</div>
							{:else if inf.attributes.length > 0}
								<div class="text-xs text-[var(--color-text-faint)] truncate">
									{inf.attributes.map((a) => `+${a.modifier} ${a.attribute}`).join(', ')}
								</div>
							{/if}
						</div>
						<span class="text-xs text-[var(--color-text-faint)] shrink-0 capitalize">{inf.category}</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>
</div>
