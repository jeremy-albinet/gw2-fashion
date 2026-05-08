<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getOutfit, updateOutfit, deleteOutfit, encodeSharePayload,
		saveImage, deleteImages, type StoredOutfit
	} from '$lib/storage';
	import { decodeFashionTemplate } from '$lib/gw2/decoder';
	import TemplateViewer from '$lib/components/TemplateViewer.svelte';
	import ImageGallery from '$lib/components/ImageGallery.svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';
	import ExistingImages from '$lib/components/ExistingImages.svelte';
	import type { FashionTemplate } from '$lib/gw2/types';
	import { RACES, GENDERS, PROFESSIONS, type Race, type Gender, type Profession } from '$lib/gw2/constants';

	const id = $derived(page.params.id ?? '');

	let outfit = $state<StoredOutfit | null>(null);
	let template = $state<FashionTemplate | null>(null);
	let shareUrl = $state('');
	let copied = $state(false);
	let editing = $state(false);
	let editName = $state('');
	let editRace = $state<Race | ''>('');
	let editGender = $state<Gender | ''>('');
	let editProfession = $state<Profession | ''>('');
	let editNotes = $state('');
	let editTags = $state('');
	let editImages = $state<{ file: File; preview: string }[]>([]);
	let editSaving = $state(false);
	let editError = $state<string | null>(null);

	onMount(async () => {
		const o = await getOutfit(id);
		if (!o) { goto('/'); return; }
		outfit = o;
		template = decodeFashionTemplate(o.code);
		shareUrl = `${window.location.origin}/view#${encodeSharePayload(o)}`;
	});

	function startEdit() {
		if (!outfit) return;
		editName = outfit.name;
		editRace = (outfit.race as Race) || '';
		editGender = (outfit.gender as Gender) || '';
		editProfession = (outfit.profession as Profession) || '';
		editNotes = outfit.notes;
		editTags = outfit.tags.join(', ');
		editImages = [];
		editError = null;
		editing = true;
	}

	async function saveEdit() {
		if (!outfit || editSaving) return;
		editSaving = true;
		editError = null;
		try {
			const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean);
			const newImageIds = await Promise.all(editImages.map((img) => saveImage(img.file)));
			const imageIds = [...(outfit.imageIds ?? []), ...newImageIds];
			const updated = await updateOutfit(outfit.id, {
				name: editName.trim() || 'Untitled',
				race: editRace,
				gender: editGender,
				profession: editProfession,
				notes: editNotes.trim(),
				tags,
				imageIds
			});
			if (updated) outfit = updated;
			editing = false;
		} catch (e) {
			editError = e instanceof Error ? e.message : 'Save failed.';
		} finally {
			editSaving = false;
		}
	}

	async function removeImage(imageId: string) {
		if (!outfit) return;
		await deleteImages([imageId]);
		const imageIds = (outfit.imageIds ?? []).filter((id) => id !== imageId);
		const updated = await updateOutfit(outfit.id, { imageIds });
		if (updated) outfit = updated;
	}

	async function handleDelete() {
		if (!outfit || !confirm('Delete this outfit?')) return;
		await deleteOutfit(outfit.id);
		goto('/');
	}

	async function copyShare() {
		await navigator.clipboard.writeText(shareUrl);
		copied = true;
		setTimeout(() => { copied = false; }, 2000);
	}
</script>

<svelte:head>
	<title>{outfit?.name ?? 'Outfit'} — GW2 Armory</title>
</svelte:head>

{#if !outfit || !template}
	<div class="text-[var(--color-text-faint)] text-sm">Loading…</div>
{:else}
	<div class="mb-2">
		<a href="/" class="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)] transition-colors">← Armory</a>
	</div>

	{#if editing}
		<div class="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5 mb-6 space-y-3">
			<input
				bind:value={editName}
				placeholder="Name"
				class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
			/>
			<div class="grid grid-cols-3 gap-3">
				<select bind:value={editRace} class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]">
					<option value="">Race</option>
					{#each RACES as r}<option value={r}>{r}</option>{/each}
				</select>
				<select bind:value={editGender} class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]">
					<option value="">Gender</option>
					{#each GENDERS as g}<option value={g}>{g}</option>{/each}
				</select>
				<select bind:value={editProfession} class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]">
					<option value="">Profession</option>
					{#each PROFESSIONS as p}<option value={p}>{p}</option>{/each}
				</select>
			</div>
			<textarea
				bind:value={editNotes}
				placeholder="Notes…"
				rows="2"
				class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
			></textarea>
			<input
				bind:value={editTags}
				placeholder="Tags (comma-separated)"
				class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
			/>

			{#if (outfit.imageIds?.length ?? 0) > 0}
				<div>
					<p class="text-xs text-[var(--color-text-faint)] mb-2">Existing screenshots — click ✕ to remove</p>
					<ExistingImages imageIds={outfit.imageIds} onRemove={removeImage} />
				</div>
			{/if}

			<div>
				<p class="text-xs text-[var(--color-text-faint)] mb-2">Add more screenshots</p>
				<ImageUploader bind:images={editImages} maxImages={8 - (outfit.imageIds?.length ?? 0)} />
			</div>

			{#if editError}
				<div class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{editError}</div>
			{/if}
			<div class="flex gap-2">
				<button onclick={saveEdit} disabled={editSaving} class="bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-4 py-1.5 rounded text-sm hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-50">{editSaving ? 'Saving…' : 'Save'}</button>
				<button onclick={() => { editing = false; }} class="border border-[var(--color-border)] text-[var(--color-text-dim)] px-4 py-1.5 rounded text-sm hover:border-[var(--color-text-dim)] transition-colors">Cancel</button>
			</div>
		</div>
	{:else}
		<div class="flex items-start justify-between gap-4 mb-4">
			<div>
				<h1 class="font-display text-3xl text-[var(--color-text)]">{outfit.name}</h1>
				{#if outfit.profession || outfit.race}
					<p class="text-sm text-[var(--color-text-dim)] mt-1">
						{[outfit.profession, outfit.gender, outfit.race].filter(Boolean).join(' · ')}
					</p>
				{/if}
				{#if outfit.notes}
					<p class="text-[var(--color-text-dim)] mt-1 text-sm">{outfit.notes}</p>
				{/if}
				{#if outfit.tags.length > 0}
					<div class="flex flex-wrap gap-1 mt-2">
						{#each outfit.tags as tag}
							<span class="text-xs bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[var(--color-text-dim)] px-1.5 py-0.5 rounded">{tag}</span>
						{/each}
					</div>
				{/if}
			</div>
			<div class="flex gap-2 shrink-0">
				<button onclick={startEdit} class="border border-[var(--color-border)] text-[var(--color-text-dim)] px-3 py-1.5 rounded text-xs hover:border-[var(--color-text-dim)] transition-colors">Edit</button>
				<button onclick={handleDelete} class="border border-red-400/30 text-red-400/70 hover:text-red-400 px-3 py-1.5 rounded text-xs transition-colors">Delete</button>
			</div>
		</div>
	{/if}

	{#if (outfit.imageIds?.length ?? 0) > 0}
		<ImageGallery imageIds={outfit.imageIds} />
	{/if}

	<TemplateViewer {template} />

	<div class="mt-8 border-t border-[var(--color-border)] pt-6">
		<h2 class="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-3">Share</h2>
		<div class="flex gap-2">
			<input
				readonly
				value={shareUrl}
				class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-xs text-[var(--color-text-dim)] font-mono min-w-0"
			/>
			<button
				onclick={copyShare}
				class="bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[var(--color-text-dim)] px-3 py-2 rounded text-xs hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors whitespace-nowrap"
			>{copied ? '✓ Copied' : 'Copy link'}</button>
		</div>
		<p class="text-xs text-[var(--color-text-faint)] mt-1.5">
			The share link encodes all data in the URL — no account needed to view it. Images are stored locally only.
		</p>
	</div>
{/if}
