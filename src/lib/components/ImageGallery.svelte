<script lang="ts">
	import { getImage } from '$lib/storage';

	let { imageIds }: { imageIds: string[] } = $props();

	let urls = $state<string[]>([]);
	let active = $state(0);
	let lightbox = $state<string | null>(null);

	$effect(() => {
		void imageIds;
		let cancelled = false;
		const prev = [...urls];
		Promise.all(imageIds.map((id) => getImage(id))).then((blobs) => {
			if (cancelled) return;
			prev.forEach((u) => URL.revokeObjectURL(u));
			urls = blobs
				.filter((b): b is Blob => b !== null)
				.map((b) => URL.createObjectURL(b));
			active = 0;
		});
		return () => {
			cancelled = true;
		};
	});

	function prev() { active = (active - 1 + urls.length) % urls.length; }
	function next() { active = (active + 1) % urls.length; }
	function openLightbox(i: number) { active = i; lightbox = urls[i]; }
	function closeLightbox() { lightbox = null; }

	function onKeydown(e: KeyboardEvent) {
		if (!lightbox) return;
		if (e.key === 'Escape') closeLightbox();
		if (e.key === 'ArrowLeft') { prev(); lightbox = urls[active]; }
		if (e.key === 'ArrowRight') { next(); lightbox = urls[active]; }
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if urls.length > 0}
	<div class="mb-8">
		<div class="relative rounded-lg overflow-hidden bg-[var(--color-bg)] aspect-video max-h-[480px] flex items-center justify-center">
			<button
				type="button"
				class="w-full h-full flex items-center justify-center cursor-zoom-in"
				onclick={() => openLightbox(active)}
				aria-label="Open image fullscreen"
			>
				<img
					src={urls[active]}
					alt="Screenshot {active + 1}"
					class="max-w-full max-h-full object-contain"
				/>
			</button>
			{#if urls.length > 1}
				<button
					onclick={prev}
					class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
					aria-label="Previous"
				>‹</button>
				<button
					onclick={next}
					class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
					aria-label="Next"
				>›</button>
			{/if}
		</div>

		{#if urls.length > 1}
			<div class="flex gap-2 mt-2 overflow-x-auto pb-1">
				{#each urls as url, i}
					<button
						onclick={() => { active = i; }}
						class="flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors
							{i === active ? 'border-[var(--color-accent)]' : 'border-transparent opacity-60 hover:opacity-100'}"
					>
						<img src={url} alt="Thumbnail {i + 1}" class="w-full h-full object-cover" />
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

{#if lightbox}
	<div
		class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
		role="dialog"
		aria-modal="true"
		aria-label="Image lightbox"
		tabindex="-1"
	>
		<button
			type="button"
			class="absolute inset-0 w-full h-full cursor-default"
			onclick={closeLightbox}
			aria-label="Close lightbox"
		></button>
		<img
			src={lightbox}
			alt="Full size"
			class="relative max-w-[95vw] max-h-[95vh] object-contain z-10 pointer-events-none"
		/>
		<button
			onclick={closeLightbox}
			class="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
			aria-label="Close"
		>✕</button>
		{#if urls.length > 1}
			<button
				onclick={() => { prev(); lightbox = urls[active]; }}
				class="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20 flex items-center justify-center"
				aria-label="Previous"
			>‹</button>
			<button
				onclick={() => { next(); lightbox = urls[active]; }}
				class="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20 flex items-center justify-center"
				aria-label="Next"
			>›</button>
		{/if}
	</div>
{/if}
