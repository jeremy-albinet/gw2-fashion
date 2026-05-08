<script lang="ts">
	import { getImage } from '$lib/storage';

	let {
		imageIds,
		onRemove
	}: {
		imageIds: string[];
		onRemove: (id: string) => void;
	} = $props();

	let urlMap = $state<Record<string, string>>({});

	$effect(() => {
		const ids = [...imageIds];
		let alive = true;
		let created: string[] = [];

		Promise.all(
			ids.map(async (id) => {
				const blob = await getImage(id);
				return { id, url: blob ? URL.createObjectURL(blob) : null };
			})
		).then((entries) => {
			if (!alive) return;
			const next: Record<string, string> = {};
			for (const { id, url } of entries) {
				if (url) { next[id] = url; created.push(url); }
			}
			urlMap = next;
		});

		return () => {
			alive = false;
			for (const url of created) URL.revokeObjectURL(url);
			created = [];
		};
	});
</script>

<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
	{#each imageIds as id}
		<div class="relative group aspect-square rounded overflow-hidden border border-[var(--color-border)]">
			{#if urlMap[id]}
				<img src={urlMap[id]} alt="Screenshot" class="w-full h-full object-cover" />
			{:else}
				<div class="w-full h-full bg-[var(--color-bg-elev)] animate-pulse"></div>
			{/if}
			<button
				type="button"
				onclick={() => onRemove(id)}
				class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
				aria-label="Remove image"
			>✕</button>
		</div>
	{/each}
</div>
