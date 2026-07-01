<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		description?: string;
	}

	let { label, value, description }: Props = $props();
</script>

<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
	<p class="text-sm text-slate-400">{label}</p>
	<h2 class="mt-3 text-4xl font-bold">{value}</h2>
	{#if description}
		<p class="mt-2 text-sm text-slate-500">{description}</p>
	{/if}
</div>
