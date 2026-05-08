<script lang="ts">
	import { goto } from '$app/navigation';
	import { decodeFashionTemplate, FashionTemplateError } from '$lib/gw2/decoder';
	import { isFashionTemplateCode } from '$lib/gw2/decoder';
	import { saveOutfit, saveImage } from '$lib/storage';
	import TemplateViewer from '$lib/components/TemplateViewer.svelte';
	import ImageUploader from '$lib/components/ImageUploader.svelte';
	import CharacterPicker from '$lib/components/CharacterPicker.svelte';
	import type { FashionTemplate } from '$lib/gw2/types';
	import { RACES, GENDERS, PROFESSIONS, type Race, type Gender, type Profession } from '$lib/gw2/constants';

	type Tab = 'code' | 'api';
	let activeTab = $state<Tab>('api');

	let codeInput = $state('');
	let nameInput = $state('');
	let raceInput = $state<Race | ''>('');
	let genderInput = $state<Gender | ''>('');
	let professionInput = $state<Profession | ''>('');
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

	function handleCharacterSelect(template: FashionTemplate, suggestedName: string, race: Race | '', gender: Gender | '', profession: Profession | '') {
		decoded = template;
		if (!nameInput) nameInput = suggestedName;
		if (race) raceInput = race;
		if (gender) genderInput = gender;
		if (profession) professionInput = profession;
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
			race: raceInput,
			gender: genderInput,
			profession: professionInput,
			notes: notesInput.trim(),
			tags,
			imageIds
		});
		goto(`/outfit/${outfit.id}`);
	}

	const selectClass = "w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]";
	const inputClass = "w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]";
	const labelClass = "block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5";
</script>

<svelte:head>
	<title>Add Outfit — GW2 Armory</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	<h1 class="font-display text-2xl text-[var(--color-text)] mb-6">Add Outfit</h1>

	<div class="flex gap-0 mb-0 border-b border-[var(--color-border)]">
		{#each ([['api', 'From Characters'], ['code', 'Paste Code']] as const) as [id, label]}
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
				<label for="code" class={labelClass}>Fashion Template Code</label>
				<textarea
					id="code"
					bind:value={codeInput}
					placeholder="[&DwAAfy5mAo4AWAYbBZ...]"
					rows="3"
					class="{inputClass} font-mono resize-none"
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
		{/if}

		{#if decoded}
			<div class="border-t border-[var(--color-border)] pt-4 space-y-4">
				<div>
					<label for="name" class={labelClass}>Name</label>
					<input id="name" bind:value={nameInput} placeholder="My Sylvari Mesmer" class={inputClass} />
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="race" class={labelClass}>Race</label>
						<select id="race" bind:value={raceInput} class={selectClass}>
							<option value="">Any</option>
							{#each RACES as r}<option value={r}>{r}</option>{/each}
						</select>
					</div>
					<div>
						<label for="gender" class={labelClass}>Gender</label>
						<select id="gender" bind:value={genderInput} class={selectClass}>
							<option value="">Any</option>
							{#each GENDERS as g}<option value={g}>{g}</option>{/each}
						</select>
					</div>
					<div>
						<label for="profession" class={labelClass}>Profession</label>
						<select id="profession" bind:value={professionInput} class={selectClass}>
							<option value="">Any</option>
							{#each PROFESSIONS as p}<option value={p}>{p}</option>{/each}
						</select>
					</div>
				</div>

				<div>
					<span class={labelClass}>
						Screenshots <span class="font-normal text-[var(--color-text-faint)] normal-case tracking-normal">(optional)</span>
					</span>
					<ImageUploader bind:images />
				</div>

				<div class="border-t border-[var(--color-border)] pt-4">
					<h2 class="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-3">Preview</h2>
					<TemplateViewer template={decoded} />
				</div>

				<div class="border-t border-[var(--color-border)] pt-4 space-y-4">
					<div>
						<label for="notes" class={labelClass}>Notes</label>
						<textarea
							id="notes"
							bind:value={notesInput}
							placeholder="Optional notes about this look…"
							rows="2"
							class="{inputClass} resize-none"
						></textarea>
					</div>
					<div>
						<label for="tags" class={labelClass}>
							Tags <span class="font-normal text-[var(--color-text-faint)] normal-case tracking-normal">(comma-separated)</span>
						</label>
						<input id="tags" bind:value={tagsInput} placeholder="Elegant, Nature, Magical" class={inputClass} />
					</div>
				</div>

				<button
					type="button"
					onclick={handleSave}
					disabled={saving}
					class="w-full bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold py-2.5 rounded hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-50"
				>{saving ? 'Saving…' : 'Save to Armory'}</button>
			</div>
		{/if}
	</div>
</div>
