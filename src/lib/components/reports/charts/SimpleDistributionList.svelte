<script lang="ts">
	interface Props {
		data: Record<string, number>;
		title?: string;
		color?: string;
	}

	let { data, title, color = 'rgb(99, 102, 241)' }: Props = $props();

	const entries = $derived(
		Object.entries(data)
			.map(([key, value]) => ({ label: key, value }))
			.sort((a, b) => b.value - a.value)
	);

	const maxValue = $derived(Math.max(...entries.map((e) => e.value), 1));
</script>

<div class="space-y-3">
	{#if title}
		<h4 class="text-sm font-medium text-slate-300">{title}</h4>
	{/if}
	{#if entries.length === 0}
		<div class="text-sm text-slate-500 italic">No hay datos disponibles</div>
	{:else}
		<div class="space-y-2">
			{#each entries as entry}
				<div class="flex items-center gap-3">
					<div class="w-32 shrink-0 text-sm text-slate-400 truncate" title={entry.label}>
						{entry.label}
					</div>
					<div class="flex-1">
						<div
							class="h-2 rounded-md transition-all duration-300"
							style="width: {maxValue > 0 ? (entry.value / maxValue) * 100 : 0}%; background-color: {color};"
						></div>
					</div>
					<div class="w-16 shrink-0 text-right text-sm text-slate-300">
						{entry.value.toLocaleString()}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
