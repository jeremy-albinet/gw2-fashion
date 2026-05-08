<script lang="ts">
	import { onMount } from 'svelte';
	import { saveApiKey, loadApiKey, clearApiKey, fetchAccount, type Gw2AccountInfo } from '$lib/gw2/api';
	import { exportBackup, importBackup, getAllOutfits, type BackupFile } from '$lib/storage';

	let keyInput = $state('');
	let savedKey = $state('');
	let account = $state<Gw2AccountInfo | null>(null);
	let checking = $state(false);
	let keyError = $state<string | null>(null);
	let saved = $state(false);

	let outfitCount = $state(0);
	let exporting = $state(false);
	let importing = $state(false);
	let importMode = $state<'merge' | 'replace'>('merge');
	let importResult = $state<{ imported: number; skipped: number } | null>(null);
	let importError = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | undefined>();

	onMount(async () => {
		const k = await loadApiKey();
		if (k) { savedKey = k; keyInput = k; checkKey(k); }
		outfitCount = (await getAllOutfits()).length;
	});

	async function checkKey(key: string) {
		checking = true; keyError = null; account = null;
		try { account = await fetchAccount(key); }
		catch (e) { keyError = e instanceof Error ? e.message : 'Failed to validate key.'; }
		finally { checking = false; }
	}

	async function handleSave() {
		const k = keyInput.trim();
		if (!k) return;
		checking = true; keyError = null; account = null;
		try {
			account = await fetchAccount(k);
			await saveApiKey(k);
			savedKey = k; saved = true;
			setTimeout(() => { saved = false; }, 2000);
		} catch (e) {
			keyError = e instanceof Error ? e.message : 'Failed to validate key.';
		} finally { checking = false; }
	}

	async function handleClear() {
		await clearApiKey(); savedKey = ''; keyInput = ''; account = null;
	}

	async function handleExport() {
		exporting = true;
		try {
			const backup = await exportBackup();
			const json = JSON.stringify(backup, null, 2);
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			const date = new Date(backup.exportedAt).toISOString().slice(0, 10);
			a.href = url;
			a.download = `gw2-armory-backup-${date}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} finally { exporting = false; }
	}

	async function handleImport(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		importing = true; importResult = null; importError = null;
		try {
			const text = await file.text();
			const backup: BackupFile = JSON.parse(text);
			if (backup.version !== 1 || !Array.isArray(backup.outfits)) {
				throw new Error('Invalid backup file format.');
			}
			const result = await importBackup(backup, importMode);
			importResult = result;
			outfitCount = (await getAllOutfits()).length;
		} catch (e) {
			importError = e instanceof Error ? e.message : 'Import failed.';
		} finally { importing = false; }
	}
</script>

<svelte:head>
	<title>Settings — GW2 Fashion</title>
</svelte:head>

<div class="max-w-xl mx-auto space-y-6">
	<h1 class="font-display text-2xl text-[var(--color-text)]">Settings</h1>

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
				>{checking ? 'Checking…' : saved ? '✓ Saved' : 'Save Key'}</button>
			</div>
		</div>

		{#if keyError}
			<div class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{keyError}</div>
		{/if}

		{#if account}
			<div class="flex items-center gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-3">
				<span class="text-xl">✓</span>
				<div>
					<p class="text-sm font-semibold text-[var(--color-text)]">{account.name}</p>
					<p class="text-xs text-[var(--color-text-faint)]">Account connected</p>
				</div>
				{#if savedKey}
					<button type="button" onclick={handleClear} class="ml-auto text-xs text-red-400/70 hover:text-red-400 transition-colors">Disconnect</button>
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
			<p class="text-xs text-[var(--color-text-faint)] pt-1">Your key is stored only in your browser's IndexedDB. It never leaves your device.</p>
		</div>
	</div>

	<div class="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5 space-y-4">
		<div>
			<h2 class="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1">Data Backup</h2>
			<p class="text-xs text-[var(--color-text-faint)]">
				{outfitCount} outfit{outfitCount === 1 ? '' : 's'} stored locally. Export includes all outfits and their images.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={handleExport}
				disabled={exporting || outfitCount === 0}
				class="bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-4 py-2 rounded text-sm hover:bg-[var(--color-accent-strong)] transition-colors disabled:opacity-50"
			>{exporting ? 'Exporting…' : '↓ Export backup'}</button>
			<span class="text-xs text-[var(--color-text-faint)]">Downloads a <code class="font-mono">.json</code> file with all outfits + images</span>
		</div>

		<div class="border-t border-[var(--color-border)] pt-4 space-y-3">
			<p class="text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-widest">Restore from backup</p>

			<div class="flex gap-3 text-sm">
				<label class="flex items-center gap-1.5 cursor-pointer">
					<input type="radio" bind:group={importMode} value="merge" class="accent-[var(--color-accent)]" />
					<span class="text-[var(--color-text-dim)]">Merge</span>
					<span class="text-xs text-[var(--color-text-faint)]">(skip duplicates)</span>
				</label>
				<label class="flex items-center gap-1.5 cursor-pointer">
					<input type="radio" bind:group={importMode} value="replace" class="accent-[var(--color-accent)]" />
					<span class="text-[var(--color-text-dim)]">Replace</span>
					<span class="text-xs text-[var(--color-text-faint)]">(wipe then restore)</span>
				</label>
			</div>

			<div class="flex items-center gap-3">
				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={importing}
					class="border border-[var(--color-border)] text-[var(--color-text-dim)] font-semibold px-4 py-2 rounded text-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-50"
				>{importing ? 'Importing…' : '↑ Import backup'}</button>
				<input
					bind:this={fileInput}
					type="file"
					accept=".json,application/json"
					class="hidden"
					onchange={handleImport}
				/>
				{#if importMode === 'replace'}
					<span class="text-xs text-amber-400">⚠ This will delete all current outfits first</span>
				{/if}
			</div>

			{#if importResult}
				<div class="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2">
					✓ Imported {importResult.imported} outfit{importResult.imported === 1 ? '' : 's'}{importResult.skipped ? `, skipped ${importResult.skipped} duplicate${importResult.skipped === 1 ? '' : 's'}` : ''}.
				</div>
			{/if}
			{#if importError}
				<div class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{importError}</div>
			{/if}
		</div>
	</div>
</div>
