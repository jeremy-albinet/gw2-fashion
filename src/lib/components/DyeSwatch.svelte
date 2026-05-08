<script lang="ts">
	import type { Gw2Color } from '$lib/gw2/api';
	import { dyeSwatchRgb } from '$lib/gw2/api';

	let { color, size = 16 }: { color: Gw2Color | undefined; size?: number } = $props();

	const rgb = $derived(color ? dyeSwatchRgb(color) : null);
	const style = $derived(
		rgb ? `background:rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : 'background:#3a2f33'
	);
	const title = $derived(color?.name ?? 'Unknown dye');
</script>

<span
	class="inline-block rounded-sm border border-white/10"
	style="{style};width:{size}px;height:{size}px"
	title={title}
></span>
