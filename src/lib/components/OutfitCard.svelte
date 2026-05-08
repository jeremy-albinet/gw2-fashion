<script lang="ts">
	import type { StoredOutfit } from '$lib/storage';

	let { outfit, ondelete }: { outfit: StoredOutfit; ondelete?: () => void } = $props();
	const date = $derived(new Date(outfit.updatedAt).toLocaleDateString());
</script>

<a
	href="/outfit/{outfit.id}"
	class="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-accent)] transition-colors group"
>
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<h3 class="font-semibold text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
				{outfit.name || 'Untitled'}
			</h3>
			<p class="text-xs text-[var(--color-text-faint)] mt-0.5">{date}</p>
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
</a>
