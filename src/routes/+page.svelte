<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllOutfits, deleteOutfit, type StoredOutfit } from '$lib/storage';
	import OutfitCard from '$lib/components/OutfitCard.svelte';
	import { RACES, GENDERS, PROFESSIONS } from '$lib/gw2/constants';

	let allOutfits = $state<StoredOutfit[]>([]);
	let loaded = $state(false);

	let filterRace = $state('');
	let filterGender = $state('');
	let filterProfession = $state('');
	let filterTag = $state('');
	let filterQuery = $state('');
	let sortBy = $state<'newest' | 'oldest' | 'name'>('newest');

	const filtered = $derived.by(() => {
		let list = [...allOutfits];
		if (filterRace) list = list.filter((o) => o.race === filterRace);
		if (filterGender) list = list.filter((o) => o.gender === filterGender);
		if (filterProfession) list = list.filter((o) => o.profession === filterProfession);
		if (filterTag) list = list.filter((o) => o.tags.includes(filterTag));
		if (filterQuery) {
			const q = filterQuery.toLowerCase();
			list = list.filter((o) => o.name.toLowerCase().includes(q) || o.notes.toLowerCase().includes(q));
		}
		if (sortBy === 'newest') list.sort((a, b) => b.updatedAt - a.updatedAt);
		else if (sortBy === 'oldest') list.sort((a, b) => a.updatedAt - b.updatedAt);
		else list.sort((a, b) => a.name.localeCompare(b.name));
		return list;
	});

	const allTags = $derived([...new Set(allOutfits.flatMap((o) => o.tags))].sort());
	const hasFilters = $derived(!!(filterRace || filterGender || filterProfession || filterTag || filterQuery));

	function clearFilters() {
		filterRace = '';
		filterGender = '';
		filterProfession = '';
		filterTag = '';
		filterQuery = '';
	}

	onMount(async () => {
		allOutfits = await getAllOutfits();
		loaded = true;
	});

	async function handleDelete(id: string) {
		if (!confirm('Delete this outfit?')) return;
		await deleteOutfit(id);
		allOutfits = allOutfits.filter((o) => o.id !== id);
	}

	const selectClass = "bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer";
</script>

<svelte:head>
	<title>GW2 Armory</title>
</svelte:head>

{#if !loaded}
	<div class="text-[var(--color-text-faint)] text-sm">Loading…</div>
{:else if allOutfits.length === 0}
	<div class="text-center py-24">
		<p class="text-4xl mb-4">👗</p>
		<h2 class="font-display text-2xl text-[var(--color-text)] mb-2">Your armory is empty</h2>
		<p class="text-[var(--color-text-dim)] mb-6">Paste a GW2 fashion template code to add your first outfit.</p>
		<a href="/new" class="inline-block bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-5 py-2.5 rounded hover:bg-[var(--color-accent-strong)] transition-colors">Add your first outfit</a>
	</div>
{:else}
	<div class="mb-5 flex items-center justify-between">
		<h1 class="font-display text-2xl text-[var(--color-text)]">My Armory</h1>
		<span class="text-sm text-[var(--color-text-faint)]">
			{filtered.length}{filtered.length !== allOutfits.length ? `/${allOutfits.length}` : ''} outfit{allOutfits.length === 1 ? '' : 's'}
		</span>
	</div>

	<div class="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 mb-6 flex flex-wrap gap-2 items-center">
		<div class="flex flex-col gap-0.5">
			<span class="text-[10px] text-[var(--color-text-faint)] uppercase tracking-widest px-1">Order by</span>
			<select bind:value={sortBy} class={selectClass}>
				<option value="newest">Newest</option>
				<option value="oldest">Oldest</option>
				<option value="name">Name</option>
			</select>
		</div>

		<div class="flex flex-col gap-0.5">
			<span class="text-[10px] text-[var(--color-text-faint)] uppercase tracking-widest px-1">Race</span>
			<select bind:value={filterRace} class={selectClass}>
				<option value="">Any</option>
				{#each RACES as r}<option value={r}>{r}</option>{/each}
			</select>
		</div>

		<div class="flex flex-col gap-0.5">
			<span class="text-[10px] text-[var(--color-text-faint)] uppercase tracking-widest px-1">Gender</span>
			<select bind:value={filterGender} class={selectClass}>
				<option value="">Any</option>
				{#each GENDERS as g}<option value={g}>{g}</option>{/each}
			</select>
		</div>

		<div class="flex flex-col gap-0.5">
			<span class="text-[10px] text-[var(--color-text-faint)] uppercase tracking-widest px-1">Profession</span>
			<select bind:value={filterProfession} class={selectClass}>
				<option value="">Any</option>
				{#each PROFESSIONS as p}<option value={p}>{p}</option>{/each}
			</select>
		</div>

		{#if allTags.length > 0}
			<div class="flex flex-col gap-0.5">
				<span class="text-[10px] text-[var(--color-text-faint)] uppercase tracking-widest px-1">Tag</span>
				<select bind:value={filterTag} class={selectClass}>
					<option value="">Any</option>
					{#each allTags as t}<option value={t}>{t}</option>{/each}
				</select>
			</div>
		{/if}

		<div class="flex flex-col gap-0.5 flex-1 min-w-32">
			<span class="text-[10px] text-[var(--color-text-faint)] uppercase tracking-widest px-1">Search</span>
			<input
				bind:value={filterQuery}
				placeholder="Keyword…"
				class="bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)] w-full"
			/>
		</div>

		{#if hasFilters}
			<div class="flex flex-col gap-0.5 justify-end">
				<span class="text-[10px] opacity-0 px-1">·</span>
				<button
					type="button"
					onclick={clearFilters}
					class="border border-[var(--color-border)] text-[var(--color-text-faint)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] px-3 py-1.5 rounded text-xs transition-colors"
				>Clear</button>
			</div>
		{/if}
	</div>

	{#if filtered.length === 0}
		<div class="text-center py-12 text-[var(--color-text-faint)]">
			No outfits match the current filters.
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filtered as outfit (outfit.id)}
				<OutfitCard {outfit} ondelete={() => handleDelete(outfit.id)} />
			{/each}
		</div>
	{/if}
{/if}
