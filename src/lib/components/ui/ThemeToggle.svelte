<script lang="ts">
	import { onMount } from 'svelte';
	import { getTheme, setTheme, type Theme } from '$lib/utils/theme';

	let currentTheme = $state<Theme>('dark');

	onMount(() => {
		currentTheme = getTheme();
	});

	function setLightMode() {
		setTheme('light');
		currentTheme = 'light';
	}

	function setDarkMode() {
		setTheme('dark');
		currentTheme = 'dark';
	}
</script>

<div class="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
	<button
		type="button"
		onclick={setLightMode}
		class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {currentTheme === 'light'
			? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
			: 'text-slate-600 hover:bg-white/50 dark:text-slate-400 dark:hover:bg-slate-700/50'}"
		aria-label="Activar modo claro"
		aria-pressed={currentTheme === 'light'}
	>
		<span class="text-sm">☀️</span>
		<span class="hidden sm:inline">Claro</span>
	</button>
	<button
		type="button"
		onclick={setDarkMode}
		class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {currentTheme === 'dark'
			? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
			: 'text-slate-600 hover:bg-white/50 dark:text-slate-400 dark:hover:bg-slate-700/50'}"
		aria-label="Activar modo oscuro"
		aria-pressed={currentTheme === 'dark'}
	>
		<span class="text-sm">🌙</span>
		<span class="hidden sm:inline">Oscuro</span>
	</button>
</div>
