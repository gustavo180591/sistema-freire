<script lang="ts">
	interface Props {
		metrics: { label: string; value: number; color?: string }[];
		total?: number;
		showTotal?: boolean;
	}

	let { metrics, total, showTotal = true }: Props = $props();

	const calculatedTotal = $derived(total ?? metrics.reduce((sum, m) => sum + m.value, 0));
</script>

<div class="space-y-4">
	<div class="grid grid-cols-2 gap-4">
		{#each metrics as metric}
			<div class="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
				<div class="mb-1 text-sm text-slate-400">{metric.label}</div>
				<div class="text-2xl font-semibold" style="color: {metric.color || 'rgb(99, 102, 241)'};">
					{metric.value.toLocaleString()}
				</div>
				{#if calculatedTotal > 0}
					<div class="mt-1 text-xs text-slate-500">
						{((metric.value / calculatedTotal) * 100).toFixed(1)}% del total
					</div>
				{/if}
			</div>
		{/each}
	</div>
	{#if showTotal && calculatedTotal > 0}
		<div class="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
			<div class="mb-1 text-sm text-slate-400">Total</div>
			<div class="text-2xl font-semibold text-slate-200">{calculatedTotal.toLocaleString()}</div>
		</div>
	{/if}
</div>
