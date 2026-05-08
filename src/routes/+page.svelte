<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllOutfits, deleteOutfit, type StoredOutfit } from '$lib/storage';
	import OutfitCard from '$lib/components/OutfitCard.svelte';

	let outfits = $state<StoredOutfit[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		outfits = await getAllOutfits();
		loaded = true;
	});

	async function handleDelete(id: string) {
		if (!confirm('Delete this outfit?')) return;
		await deleteOutfit(id);
		outfits = outfits.filter((o) => o.id !== id);
	}
</script>

<svelte:head>
	<title>GW2 Armory</title>
</svelte:head>

{#if !loaded}
	<div class="text-[var(--color-text-faint)] text-sm">Loading…</div>
{:else if outfits.length === 0}
	<div class="text-center py-24">
		<p class="text-4xl mb-4">👗</p>
		<h2 class="font-display text-2xl text-[var(--color-text)] mb-2">Your armory is empty</h2>
		<p class="text-[var(--color-text-dim)] mb-6">Paste a GW2 fashion template code to add your first outfit.</p>
		<a
			href="/new"
			class="inline-block bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-5 py-2.5 rounded hover:bg-[var(--color-accent-strong)] transition-colors"
		>Add your first outfit</a>
	</div>
{:else}
	<div class="mb-6 flex items-center justify-between">
		<h1 class="font-display text-2xl text-[var(--color-text)]">My Armory</h1>
		<span class="text-sm text-[var(--color-text-faint)]">{outfits.length} outfit{outfits.length === 1 ? '' : 's'}</span>
	</div>
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each outfits as outfit (outfit.id)}
			<OutfitCard {outfit} ondelete={() => handleDelete(outfit.id)} />
		{/each}
	</div>
{/if}
