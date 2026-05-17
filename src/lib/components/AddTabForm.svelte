<script lang="ts">
	import { decodeFashionTemplate, FashionTemplateError, isFashionTemplateCode, decodeTravelTemplate, TravelTemplateError, isTravelTemplateCode } from '$lib/gw2/decoder';
	import CharacterPicker from '$lib/components/CharacterPicker.svelte';
	import type { FashionTemplate, TravelTemplate } from '$lib/gw2/types';
	import type { Race, Gender, Profession } from '$lib/gw2/constants';
	import { aggregateInfusions, type OutfitInfusions } from '$lib/storage';

	let {
		onSubmit,
		onCancel
	}: {
		onSubmit: (label: string, code: string, infusions: OutfitInfusions | undefined, travel: TravelTemplate | undefined) => void;
		onCancel: () => void;
	} = $props();

	type Mode = 'code' | 'api';
	let mode = $state<Mode>('api');
	let labelInput = $state('');
	let codeInput = $state('');
	let travelInput = $state('');
	let decoded = $state<FashionTemplate | null>(null);
	let decodedTravel = $state<TravelTemplate | null>(null);
	let importedInfusions = $state<OutfitInfusions | undefined>(undefined);
	let error = $state<string | null>(null);
	let travelError = $state<string | null>(null);

	function handleDecode() {
		error = null;
		decoded = null;
		importedInfusions = undefined;
		try {
			decoded = decodeFashionTemplate(codeInput);
		} catch (e) {
			if (e instanceof FashionTemplateError) error = e.message;
			else error = 'Unexpected error decoding code.';
		}
	}

	$effect(() => {
		if (mode !== 'code') return;
		if (codeInput.trim() && isFashionTemplateCode(codeInput)) {
			handleDecode();
		} else if (codeInput.trim()) {
			error = null;
			decoded = null;
		}
	});

	$effect(() => {
		const trimmed = travelInput.trim();
		if (!trimmed) { travelError = null; decodedTravel = null; return; }
		if (isTravelTemplateCode(trimmed)) {
			try {
				decodedTravel = decodeTravelTemplate(trimmed);
				travelError = null;
			} catch (e) {
				travelError = e instanceof TravelTemplateError ? e.message : 'Could not decode travel code.';
				decodedTravel = null;
			}
		} else {
			travelError = 'Not a travel template code.';
			decodedTravel = null;
		}
	});

	function handleCharacterSelect(
		template: FashionTemplate,
		_name: string,
		_race: Race | '',
		_gender: Gender | '',
		_profession: Profession | '',
		infusionItemIds: number[]
	) {
		decoded = template;
		const aggregated = aggregateInfusions(infusionItemIds);
		importedInfusions = aggregated.items.length > 0 ? aggregated : undefined;
	}

	function submit() {
		if (!decoded) return;
		onSubmit(labelInput.trim(), decoded.raw, importedInfusions, decodedTravel ?? undefined);
	}

	const inputClass = "w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]";
</script>

<div class="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 mb-4 space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest">Add a new tab</h3>
		<button
			type="button"
			onclick={onCancel}
			class="text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)] text-xs"
		>Cancel</button>
	</div>

	<input
		bind:value={labelInput}
		placeholder="Tab name (e.g. Combat, Festival) — optional"
		maxlength="40"
		class={inputClass}
	/>

	<div class="flex gap-0 border-b border-[var(--color-border)]">
		{#each ([['api', 'From Characters'], ['code', 'Paste Code']] as const) as [id, label], _i (_i)}
			<button
				type="button"
				onclick={() => { mode = id; }}
				class="px-4 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px
					{mode === id
						? 'border-[var(--color-accent)] text-[var(--color-accent)]'
						: 'border-transparent text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)]'}"
			>{label}</button>
		{/each}
	</div>

	{#if mode === 'code'}
		<textarea
			bind:value={codeInput}
			placeholder="[&DwAAfy5mAo4AWAYbBZ...]"
			rows="3"
			class="{inputClass} font-mono resize-none"
		></textarea>
		{#if error}
			<div class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</div>
		{/if}
	{:else}
		<CharacterPicker onSelect={handleCharacterSelect} />
	{/if}

	<textarea
		bind:value={travelInput}
		placeholder="Travel template code [&EA...] — optional"
		rows="2"
		class="{inputClass} font-mono resize-none"
	></textarea>
	{#if travelError}
		<div class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{travelError}</div>
	{:else if decodedTravel}
		<div class="text-xs text-green-400/80">✓ Travel template decoded</div>
	{/if}

	<button
		type="button"
		onclick={submit}
		disabled={!decoded}
		class="w-full bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold py-2 rounded text-sm hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
	>{decoded ? 'Add tab' : 'Decode a template first'}</button>
</div>
