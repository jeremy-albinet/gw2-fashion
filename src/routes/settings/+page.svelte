<script lang="ts">
	import { onMount } from 'svelte';
	import { saveApiKey, loadApiKey, clearApiKey, fetchAccount, type Gw2AccountInfo } from '$lib/gw2/api';

	let keyInput = $state('');
	let savedKey = $state('');
	let account = $state<Gw2AccountInfo | null>(null);
	let checking = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	onMount(async () => {
		const k = await loadApiKey();
		if (k) {
			savedKey = k;
			keyInput = k;
			checkKey(k);
		}
	});

	async function checkKey(key: string) {
		checking = true;
		error = null;
		account = null;
		try {
			account = await fetchAccount(key);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to validate key.';
		} finally {
			checking = false;
		}
	}

	async function handleSave() {
		const k = keyInput.trim();
		if (!k) return;
		checking = true;
		error = null;
		account = null;
		try {
			account = await fetchAccount(k);
			await saveApiKey(k);
			savedKey = k;
			saved = true;
			setTimeout(() => { saved = false; }, 2000);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to validate key.';
		} finally {
			checking = false;
		}
	}

	async function handleClear() {
		await clearApiKey();
		savedKey = '';
		keyInput = '';
		account = null;
	}
</script>

<svelte:head>
	<title>Settings — GW2 Armory</title>
</svelte:head>

<div class="max-w-xl mx-auto">
	<h1 class="font-display text-2xl text-[var(--color-text)] mb-6">Settings</h1>

	<div class="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5 space-y-4">
		<div>
			<label for="apikey" class="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1.5">
				GW2 API Key
			</label>
			<div class="flex gap-2">
				<input
					id="apikey"
					type="password"
					bind:value={keyInput}
					placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXXXXXX-XXXX"
					class="flex-1 min-w-0 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] font-mono placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
				/>
				<button
					type="button"
					onclick={handleSave}
					disabled={checking || !keyInput.trim()}
					class="bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-4 py-2 rounded text-sm hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-50 whitespace-nowrap"
				>
					{checking ? 'Checking…' : saved ? '✓ Saved' : 'Save Key'}
				</button>
			</div>
		</div>

		{#if error}
			<div class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</div>
		{/if}

		{#if account}
			<div class="flex items-center gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-3">
				<span class="text-2xl">✓</span>
				<div>
					<p class="text-sm font-semibold text-[var(--color-text)]">{account.name}</p>
					<p class="text-xs text-[var(--color-text-faint)]">Account connected</p>
				</div>
				{#if savedKey}
					<button
						type="button"
						onclick={handleClear}
						class="ml-auto text-xs text-red-400/70 hover:text-red-400 transition-colors"
					>Disconnect</button>
				{/if}
			</div>
		{/if}

		<div class="border border-[var(--color-border)] rounded p-4 space-y-2 text-sm">
			<p class="font-semibold text-[var(--color-text-dim)]">How to get your API key:</p>
			<ol class="list-decimal list-inside space-y-1 text-[var(--color-text-faint)]">
				<li>Visit <a href="https://account.arena.net/applications" target="_blank" rel="noopener" class="text-[var(--color-accent)] hover:underline">account.arena.net/applications</a></li>
				<li>Click "New Key" and give it a name</li>
				<li>Enable permissions: <span class="text-[var(--color-text-dim)]">account</span>, <span class="text-[var(--color-text-dim)]">characters</span>, <span class="text-[var(--color-text-dim)]">builds</span></li>
				<li>Copy the key and paste it above</li>
			</ol>
			<p class="text-xs text-[var(--color-text-faint)] pt-1">
				Your key is stored only in your browser's IndexedDB. It never leaves your device.
			</p>
		</div>
	</div>
</div>
