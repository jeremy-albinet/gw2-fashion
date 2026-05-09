<script lang="ts">
	import { onMount } from 'svelte';
	import {
		loadApiKey, fetchCharacterNames, fetchEquipmentTabs, fetchCharacter,
		type Gw2EquipmentTab
	} from '$lib/gw2/api';
	import { equipmentTabToTemplate } from '$lib/gw2/decoder';
	import type { FashionTemplate } from '$lib/gw2/types';
	import type { Race, Gender, Profession } from '$lib/gw2/constants';

	let {
		onSelect
	}: {
		onSelect: (template: FashionTemplate, name: string, race: Race | '', gender: Gender | '', profession: Profession | '') => void;
	} = $props();

	let apiKey = $state<string | null>(null);
	let characters = $state<string[]>([]);
	let selectedChar = $state('');
	let tabs = $state<Gw2EquipmentTab[]>([]);
	let selectedTab = $state<number | null>(null);
	let loadingChars = $state(false);
	let loadingTabs = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		apiKey = await loadApiKey();
		if (apiKey) loadCharacters(apiKey);
	});

	async function loadCharacters(key: string) {
		loadingChars = true;
		error = null;
		try {
			characters = await fetchCharacterNames(key);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load characters.';
		} finally {
			loadingChars = false;
		}
	}

	async function handleCharSelect(char: string) {
		selectedChar = char;
		tabs = [];
		selectedTab = null;
		if (!apiKey || !char) return;
		loadingTabs = true;
		error = null;
		try {
			tabs = await fetchEquipmentTabs(apiKey, char);
			const activeTab = tabs.find((t) => t.is_active);
			if (activeTab) selectedTab = activeTab.tab;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load equipment tabs.';
		} finally {
			loadingTabs = false;
		}
	}

	async function handleUse() {
		const tab = tabs.find((t) => t.tab === selectedTab);
		if (!tab || !apiKey) return;
		const template = equipmentTabToTemplate(tab);
		const tabLabel = tab.name || `Tab ${tab.tab}`;

		let race: Race | '' = '';
		let gender: Gender | '' = '';
		let profession: Profession | '' = '';
		try {
			const char = await fetchCharacter(apiKey, selectedChar);
			race = char.race as Race;
			gender = char.gender as Gender;
			profession = char.profession as Profession;
		} catch { /* character info is optional — ignore fetch errors */ }

		onSelect(template, `${selectedChar} — ${tabLabel}`, race, gender, profession);
	}
</script>

{#if !apiKey}
	<div class="text-center py-6">
		<p class="text-sm text-[var(--color-text-dim)] mb-3">Connect your GW2 account to import outfits directly from your characters.</p>
		<a
			href="/settings"
			class="inline-block bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-4 py-2 rounded text-sm hover:bg-[var(--color-accent-strong)] transition-colors"
		>Set up API Key →</a>
	</div>
{:else if loadingChars}
	<p class="text-sm text-[var(--color-text-faint)] py-4 text-center">Loading characters…</p>
{:else if error}
	<div class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</div>
{:else}
	<div class="space-y-3">
		<div>
			<label for="char-select" class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">Character</label>
			<select
				id="char-select"
				value={selectedChar}
				onchange={(e) => handleCharSelect((e.currentTarget as HTMLSelectElement).value)}
				class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
			>
				<option value="">— Pick a character —</option>
				{#each characters as char, _i (_i)}
					<option value={char}>{char}</option>
				{/each}
			</select>
		</div>

		{#if loadingTabs}
			<p class="text-sm text-[var(--color-text-faint)]">Loading equipment tabs…</p>
		{:else if tabs.length > 0}
			<div>
				<label for="tab-select" class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">Equipment Tab</label>
				<select
					id="tab-select"
					value={selectedTab}
					onchange={(e) => { selectedTab = Number((e.currentTarget as HTMLSelectElement).value); }}
					class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
				>
					{#each tabs as tab, _i (_i)}
						<option value={tab.tab}>{tab.name || `Tab ${tab.tab}`}{tab.is_active ? ' (active)' : ''}</option>
					{/each}
				</select>
			</div>
			<button
				type="button"
				onclick={handleUse}
				disabled={selectedTab === null}
				class="w-full bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold py-2.5 rounded hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-50"
			>Use This Equipment Tab</button>
		{/if}
	</div>
{/if}
