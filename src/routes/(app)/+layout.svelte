<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme } from '$lib/utils/theme';

	let { children } = $props();

	onMount(() => {
		initTheme();
	});
</script>

<div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
	<header class="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
		<div class="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
			<h1 class="text-xl font-bold text-slate-900 dark:text-white">Sistema Freire</h1>
		</div>
	</header>
	<main class="mx-auto max-w-7xl px-6 py-10 md:py-16">
		{@render children()}
	</main>
</div>
