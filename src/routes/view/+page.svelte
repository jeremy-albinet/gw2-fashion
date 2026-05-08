<script lang="ts">
	import { onMount } from 'svelte';
	import { saveOutfit, decodeSharePayload } from '$lib/storage';
	import { decodeFashionTemplate } from '$lib/gw2/decoder';
	import TemplateViewer from '$lib/components/TemplateViewer.svelte';
	import type { FashionTemplate } from '$lib/gw2/types';
	import { goto } from '$app/navigation';

	let template = $state<FashionTemplate | null>(null);
	let name = $state('');
	let notes = $state('');
	let tags = $state<string[]>([]);
	let race = $state('');
	let gender = $state('');
	let profession = $state('');
	let error = $state<string | null>(null);
	let saving = $state(false);

	onMount(() => {
		const hash = window.location.hash;
		if (!hash || hash === '#') {
			error = 'No outfit data in URL.';
			return;
		}
		const payload = decodeSharePayload(hash);
		if (!payload) {
			error = 'Could not decode outfit from URL.';
			return;
		}
		try {
			template = decodeFashionTemplate(payload.code);
			name = payload.name;
			notes = payload.notes;
			tags = payload.tags;
			race = payload.race ?? '';
			gender = payload.gender ?? '';
			profession = payload.profession ?? '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Decode failed.';
		}
	});

	async function saveToArmory() {
		if (!template) return;
		saving = true;
		const outfit = await saveOutfit({ name, code: template.raw, notes, tags, imageIds: [], race: race as '', gender: gender as '', profession: profession as '' });
		goto(`/outfit/${outfit.id}`);
	}
</script>

<svelte:head>
	<title>{name || 'Shared Outfit'} — GW2 Fashion</title>
</svelte:head>

{#if error}
	<div class="text-center py-24">
		<p class="text-4xl mb-4">⚠️</p>
		<h2 class="font-display text-xl text-[var(--color-text)] mb-2">Couldn't load outfit</h2>
		<p class="text-[var(--color-text-dim)] text-sm">{error}</p>
		<a href="/" class="inline-block mt-4 text-sm text-[var(--color-accent)] hover:underline">Go to armory</a>
	</div>
{:else if template}
	<div class="flex items-start justify-between gap-4 mb-6">
		<div>
			<p class="text-xs text-[var(--color-text-faint)] mb-1">Shared outfit</p>
			<h1 class="font-display text-3xl text-[var(--color-text)]">{name || 'Untitled'}</h1>
			{#if profession || race}
				<p class="text-sm text-[var(--color-text-dim)] mt-1">{[profession, gender, race].filter(Boolean).join(' · ')}</p>
			{/if}
			{#if notes}
				<p class="text-[var(--color-text-dim)] mt-1 text-sm">{notes}</p>
			{/if}
			{#if tags.length > 0}
				<div class="flex flex-wrap gap-1 mt-2">
					{#each tags as tag}
						<span class="text-xs bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[var(--color-text-dim)] px-1.5 py-0.5 rounded">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>
		<button
			onclick={saveToArmory}
			disabled={saving}
			class="shrink-0 bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-4 py-2 rounded text-sm hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-50"
		>{saving ? 'Saving…' : '+ Save to my Armory'}</button>
	</div>
	<TemplateViewer {template} />
{:else}
	<div class="text-[var(--color-text-faint)] text-sm">Loading…</div>
{/if}
