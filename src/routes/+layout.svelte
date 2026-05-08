<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen flex flex-col">
	<header class="border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]">
		<div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
			<a href="/" class="font-display font-bold text-[var(--color-accent)] tracking-wide text-lg">
				GW2 Fashion
			</a>
			<nav class="flex items-center gap-4 text-sm">
				<a href="/" class="text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors">Collection</a>
				<a href="/settings" class="text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors">Settings</a>
				<a
					href="/new"
					class="bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold px-3 py-1.5 rounded hover:bg-[var(--color-accent-strong)] transition-colors"
				>+ Add Outfit</a>
			</nav>
		</div>
	</header>

	<main class="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-faint)] py-4">
		GW2 Fashion — data from <a href="https://api.guildwars2.com" class="hover:text-[var(--color-text-dim)] underline" target="_blank" rel="noopener">api.guildwars2.com</a>
	</footer>
</div>
