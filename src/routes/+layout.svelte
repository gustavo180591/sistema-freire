<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/state';

	let { children, data } = $props();

	// Solo mostrar sidebar en rutas de la app (no en login, etc.)
	const showSidebar = $derived(
		data?.user && !page.url.pathname.startsWith('/login')
	);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Navbar user={data?.user} />

<div class="flex">
	{#if showSidebar}
		<Sidebar user={data?.user} />
	{/if}
	<main class="flex-1 min-w-0">
		{@render children()}
	</main>
</div>
