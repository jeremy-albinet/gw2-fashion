<script lang="ts">
	import { getImage } from '$lib/storage';

	let {
		imageIds,
		onRemove
	}: {
		imageIds: string[];
		onRemove: (id: string) => void;
	} = $props();

	let urls = $state<Map<string, string>>(new Map());

	$effect(() => {
		const prev = new Map(urls);
		urls = new Map();
		for (const id of imageIds) {
			getImage(id).then((blob) => {
				if (blob) urls = new Map([...urls, [id, URL.createObjectURL(blob)]]);
			});
		}
		return () => {
			for (const u of prev.values()) URL.revokeObjectURL(u);
		};
	});
</script>

<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
	{#each imageIds as id}
		<div class="relative group aspect-square rounded overflow-hidden border border-[var(--color-border)]">
			{#if urls.get(id)}
				<img src={urls.get(id)} alt="Screenshot" class="w-full h-full object-cover" />
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
