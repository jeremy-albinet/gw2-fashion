<script lang="ts">
	import { goto } from '$app/navigation';
	import { decodeFashionTemplate, FashionTemplateError } from '$lib/gw2/decoder';
	import { isFashionTemplateCode } from '$lib/gw2/decoder';
	import { saveOutfit, saveImage } from '$lib/storage';
	import TemplateViewer from '$lib/components/TemplateViewer.svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';
	import CharacterPicker from '$lib/components/CharacterPicker.svelte';
	import type { FashionTemplate } from '$lib/gw2/types';

	type Tab = 'code' | 'api';
	let activeTab = $state<Tab>('code');

	let codeInput = $state('');
	let nameInput = $state('');
	let notesInput = $state('');
	let tagsInput = $state('');
	let images = $state<{ file: File; preview: string }[]>([]);
	let decoded = $state<FashionTemplate | null>(null);
	let error = $state<string | null>(null);
	let saving = $state(false);

	function handleDecode() {
		error = null;
		decoded = null;
		try {
			decoded = decodeFashionTemplate(codeInput);
		} catch (e) {
			if (e instanceof FashionTemplateError) {
				error = e.message;
			} else {
				error = 'Unexpected error decoding code.';
			}
		}
	}

	$effect(() => {
		if (codeInput.trim() && isFashionTemplateCode(codeInput)) {
			handleDecode();
		} else if (codeInput.trim()) {
			error = null;
			decoded = null;
		}
	});

	function handleCharacterSelect(template: FashionTemplate, suggestedName: string) {
		decoded = template;
		if (!nameInput) nameInput = suggestedName;
		activeTab = 'code';
	}

	async function handleSave() {
		if (!decoded) return;
		saving = true;
		const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
		const imageIds = await Promise.all(images.map((img) => saveImage(img.file)));
		const outfit = await saveOutfit({
			name: nameInput.trim() || 'Untitled',
			code: decoded.raw,
			notes: notesInput.trim(),
			tags,
			imageIds
		});
		goto(`/outfit/${outfit.id}`);
	}
</script>

<svelte:head>
	<title>Add Outfit — GW2 Armory</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	<h1 class="font-display text-2xl text-[var(--color-text)] mb-6">Add Outfit</h1>

	<div class="flex gap-0 mb-0 border-b border-[var(--color-border)]">
		{#each ([['code', 'Paste Code'], ['api', 'From Characters']] as const) as [id, label]}
			<button
				type="button"
				onclick={() => { activeTab = id; }}
				class="px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px
					{activeTab === id
						? 'border-[var(--color-accent)] text-[var(--color-accent)]'
						: 'border-transparent text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)]'}"
			>{label}</button>
		{/each}
	</div>

	<div class="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-t-0 rounded-b-lg p-5 space-y-4">
		{#if activeTab === 'code'}
			<div>
				<label for="code" class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">
					Fashion Template Code
				</label>
				<textarea
					id="code"
					bind:value={codeInput}
					placeholder="[&DwAAfy5mAo4AWAYbBZ...]"
					rows="3"
					class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] font-mono placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
				></textarea>
				<p class="text-xs text-[var(--color-text-faint)] mt-1">
					Copy the fashion template code from in-game or from sites like uaot.art (the <code class="font-mono">[&…]</code> string in the SKINS section).
				</p>
			</div>
			{#if error}
				<div class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</div>
			{/if}
		{:else}
			<CharacterPicker onSelect={handleCharacterSelect} />
			{#if decoded && activeTab === 'api'}
				<div class="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2">
					Equipment loaded — switch to "Paste Code" tab to fill in details and save.
				</div>
			{/if}
		{/if}

		{#if decoded}
			<div>
				<label for="name" class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">
					Name
				</label>
				<input
					id="name"
					bind:value={nameInput}
					placeholder="My Sylvari Mesmer"
					class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
				/>
			</div>
			<div>
				<label for="notes" class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">
					Notes
				</label>
				<textarea
					id="notes"
					bind:value={notesInput}
					placeholder="Optional notes about this look…"
					rows="2"
					class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
				></textarea>
			</div>
			<div>
				<label for="tags" class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">
					Tags <span class="font-normal text-[var(--color-text-faint)] normal-case tracking-normal">(comma-separated)</span>
				</label>
				<input
					id="tags"
					bind:value={tagsInput}
					placeholder="Sylvari, Mesmer, Purple"
					class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
				/>
			</div>
			<div>
				<span class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">
					Screenshots <span class="font-normal text-[var(--color-text-faint)] normal-case tracking-normal">(optional)</span>
				</span>
				<ImageUploader bind:images />
			</div>
			<div class="border-t border-[var(--color-border)] pt-4">
				<h2 class="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-3">Preview</h2>
				<TemplateViewer template={decoded} />
			</div>
			<button
				type="button"
				onclick={handleSave}
				disabled={saving}
				class="w-full bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold py-2.5 rounded hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-50"
			>
				{saving ? 'Saving…' : 'Save to Armory'}
			</button>
		{/if}
	</div>
</div>
