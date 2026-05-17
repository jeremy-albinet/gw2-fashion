<script lang="ts">
	import type { OutfitTab } from '$lib/storage';

	let {
		tabs,
		activeId,
		onSelect,
		onRename,
		onDelete,
		onAdd
	}: {
		tabs: OutfitTab[];
		activeId: string;
		onSelect: (id: string) => void;
		onRename: (id: string, label: string) => void;
		onDelete: (id: string) => void;
		onAdd: () => void;
	} = $props();

	let renamingId = $state<string | null>(null);
	let renameValue = $state('');
	let inputEl = $state<HTMLInputElement | undefined>();

	function defaultLabel(index: number): string {
		return `Tab ${index + 1}`;
	}

	function startRename(tab: OutfitTab, index: number) {
		renamingId = tab.id;
		renameValue = tab.label || defaultLabel(index);
		queueMicrotask(() => {
			inputEl?.focus();
			inputEl?.select();
		});
	}

	function commitRename() {
		if (renamingId) onRename(renamingId, renameValue.trim());
		renamingId = null;
	}

	function cancelRename() {
		renamingId = null;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter') commitRename();
		else if (e.key === 'Escape') cancelRename();
	}

	function confirmDelete(tab: OutfitTab, index: number) {
		const label = tab.label || defaultLabel(index);
		if (confirm(`Delete tab "${label}"? This will also remove its screenshots.`)) {
			onDelete(tab.id);
		}
	}
</script>

<div class="flex items-center gap-0 flex-wrap border-b border-[var(--color-border)] mb-4">
	{#each tabs as tab, i (tab.id)}
		{@const isActive = tab.id === activeId}
		{@const isRenaming = tab.id === renamingId}
		<div
			class="group relative flex items-center gap-1 px-3 py-2 -mb-px border-b-2 transition-colors text-sm
				{isActive
					? 'border-[var(--color-accent)] text-[var(--color-accent)]'
					: 'border-transparent text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)]'}"
		>
			{#if isRenaming}
				<input
					bind:this={inputEl}
					bind:value={renameValue}
					onkeydown={onKey}
					onblur={commitRename}
					maxlength="40"
					class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-32"
				/>
			{:else}
				<button
					type="button"
					onclick={() => onSelect(tab.id)}
					ondblclick={() => startRename(tab, i)}
					class="font-semibold whitespace-nowrap"
					title="Double-click to rename"
				>{tab.label || defaultLabel(i)}</button>

				{#if isActive}
					<button
						type="button"
						onclick={() => startRename(tab, i)}
						class="opacity-0 group-hover:opacity-100 text-[var(--color-text-faint)] hover:text-[var(--color-accent)] text-xs px-1 transition-opacity"
						aria-label="Rename tab"
						title="Rename tab"
					>✎</button>
					{#if tabs.length > 1}
						<button
							type="button"
							onclick={() => confirmDelete(tab, i)}
							class="opacity-0 group-hover:opacity-100 text-[var(--color-text-faint)] hover:text-red-400 text-xs px-1 transition-opacity"
							aria-label="Delete tab"
							title="Delete tab"
						>✕</button>
					{/if}
				{/if}
			{/if}
		</div>
	{/each}

	<button
		type="button"
		onclick={onAdd}
		class="px-3 py-2 -mb-px border-b-2 border-transparent text-sm text-[var(--color-text-faint)] hover:text-[var(--color-accent)] transition-colors"
		title="Add a new tab"
	>+ Add tab</button>
</div>
