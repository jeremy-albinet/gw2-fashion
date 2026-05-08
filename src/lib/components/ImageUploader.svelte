<script lang="ts">
	let {
		images = $bindable<{ file: File; preview: string }[]>([]),
		maxImages = 8
	}: {
		images?: { file: File; preview: string }[];
		maxImages?: number;
	} = $props();

	let dragging = $state(false);
	let inputEl = $state<HTMLInputElement | undefined>();

	async function compressImage(file: File, maxPx = 1920, quality = 0.85): Promise<File> {
		return new Promise((resolve) => {
			const img = new Image();
			const url = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(url);
				const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
				const w = Math.round(img.width * scale);
				const h = Math.round(img.height * scale);
				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
				canvas.toBlob(
					(blob) => {
						resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file);
					},
					'image/jpeg',
					quality
				);
			};
			img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
			img.src = url;
		});
	}

	async function addFiles(files: FileList | File[]) {
		const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
		const remaining = maxImages - images.length;
		const toAdd = list.slice(0, remaining);
		for (const raw of toAdd) {
			const compressed = await compressImage(raw);
			const preview = URL.createObjectURL(compressed);
			images = [...images, { file: compressed, preview }];
		}
	}

	function remove(index: number) {
		URL.revokeObjectURL(images[index].preview);
		images = images.filter((_, i) => i !== index);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}
	function onDragLeave() {
		dragging = false;
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
	}
	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files) addFiles(input.files);
		input.value = '';
	}
</script>

<div class="space-y-3">
	{#if images.length > 0}
		<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
			{#each images as img, i}
				<div class="relative group aspect-square rounded overflow-hidden border border-[var(--color-border)]">
					<img src={img.preview} alt="Screenshot {i + 1}" class="w-full h-full object-cover" />
					<button
						type="button"
						onclick={() => remove(i)}
						class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
						aria-label="Remove image"
					>✕</button>
					{#if i === 0}
						<span class="absolute bottom-1 left-1 text-[10px] bg-black/60 text-[var(--color-accent)] px-1 rounded leading-4">Cover</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if images.length < maxImages}
		<button
			type="button"
			onclick={() => inputEl?.click()}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
			class="w-full border-2 border-dashed rounded-lg py-6 px-4 flex flex-col items-center gap-2 transition-colors cursor-pointer
				{dragging
					? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
					: 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50'}"
		>
			<span class="text-2xl">📷</span>
			<span class="text-sm text-[var(--color-text-dim)]">
				{images.length === 0 ? 'Drop screenshots here or click to upload' : 'Add more screenshots'}
			</span>
			<span class="text-xs text-[var(--color-text-faint)]">
				JPEG, PNG, WebP — up to {maxImages} images
			</span>
		</button>
		<input
			bind:this={inputEl}
			type="file"
			accept="image/*"
			multiple
			class="hidden"
			onchange={onFileChange}
		/>
	{/if}
</div>
