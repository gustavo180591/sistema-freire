<script lang="ts">
	import { onMount } from 'svelte';
	import { getTheme, setTheme, type Theme } from '$lib/utils/theme';

	let currentTheme = $state<Theme>('dark');

	onMount(() => {
		currentTheme = getTheme();
	});

	function toggleTheme() {
		const newTheme = currentTheme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
		currentTheme = newTheme;
	}
</script>

<button
	type="button"
	onclick={toggleTheme}
	class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-300 {currentTheme === 'light'
		? 'bg-slate-900 text-white hover:bg-slate-800'
		: 'bg-white text-slate-900 hover:bg-slate-100'}"
	aria-label="Cambiar tema"
>
	<span class="text-sm">{currentTheme === 'light' ? '☀️' : '🌙'}</span>
	<span class="hidden sm:inline">{currentTheme === 'light' ? 'Claro' : 'Oscuro'}</span>
</button>
