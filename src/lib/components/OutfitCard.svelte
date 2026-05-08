<script lang="ts">
	import { onMount } from 'svelte';
	import type { StoredOutfit } from '$lib/storage';
	import { getImage } from '$lib/storage';

	let { outfit, ondelete }: { outfit: StoredOutfit; ondelete?: () => void } = $props();

	const date = $derived(new Date(outfit.updatedAt).toLocaleDateString());
	let coverUrl = $state<string | null>(null);

	let _coverUrl: string | null = null;
	onMount(() => {
		const firstId = outfit.imageIds?.[0];
		if (firstId) {
			getImage(firstId).then((blob) => {
				if (blob) { _coverUrl = URL.createObjectURL(blob); coverUrl = _coverUrl; }
			});
		}
		return () => { if (_coverUrl) URL.revokeObjectURL(_coverUrl); };
	});
</script>

<a
	href="/outfit/{outfit.id}"
	class="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden hover:border-[var(--color-accent)] transition-colors group"
>
	{#if coverUrl}
		<div class="aspect-video overflow-hidden bg-[var(--color-bg)]">
			<img
				src={coverUrl}
				alt={outfit.name}
				class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
			/>
		</div>
	{/if}

	<div class="p-4">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<h3 class="font-semibold text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
					{outfit.name || 'Untitled'}
				</h3>
				<div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
					{#if outfit.profession}
						<span class="text-xs text-[var(--color-accent)]">{outfit.profession}</span>
					{/if}
					{#if outfit.race}
						<span class="text-xs text-[var(--color-text-faint)]">{outfit.gender ? outfit.gender + ' ' : ''}{outfit.race}</span>
					{/if}
					{#if !outfit.profession && !outfit.race}
						<p class="text-xs text-[var(--color-text-faint)]">{date}</p>
					{/if}
				</div>
			</div>
			{#if ondelete}
				<button
					type="button"
					onclick={(e) => { e.preventDefault(); ondelete!(); }}
					class="text-[var(--color-text-faint)] hover:text-red-400 transition-colors text-xs px-1.5 py-0.5 rounded"
					aria-label="Delete outfit"
				>✕</button>
			{/if}
		</div>
		{#if outfit.profession || outfit.race}
			<p class="text-xs text-[var(--color-text-faint)] mt-0.5">{date}</p>
		{/if}
		{#if outfit.notes}
			<p class="text-sm text-[var(--color-text-dim)] mt-2 line-clamp-2">{outfit.notes}</p>
		{/if}
		{#if outfit.tags.length > 0}
			<div class="flex flex-wrap gap-1 mt-2">
				{#each outfit.tags as tag}
					<span class="text-xs bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[var(--color-text-dim)] px-1.5 py-0.5 rounded">
						{tag}
					</span>
				{/each}
			</div>
		{/if}
	</div>
</a>
