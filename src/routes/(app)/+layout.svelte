<script lang="ts">
	let { children } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<main class="mx-auto max-w-7xl px-6 py-10 md:py-16">
		{@render children()}
	</main>
</div>
