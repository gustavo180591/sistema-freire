<script lang="ts">
	interface Props {
		data: { label: string; value: number; color?: string }[];
		maxValue?: number;
		height?: number;
		showValues?: boolean;
	}

	let { data, maxValue, height = 24, showValues = true }: Props = $props();

	const calculatedMax = $derived(maxValue ?? Math.max(...data.map((d) => d.value), 1));
</script>

<div class="space-y-2">
	{#each data as item}
		<div class="flex items-center gap-3">
			<div class="w-24 shrink-0 truncate text-sm text-slate-400" title={item.label}>
				{item.label}
			</div>
			<div class="flex-1">
				<div
					class="h-{height} rounded-md transition-all duration-300"
					style="width: {calculatedMax > 0
						? (item.value / calculatedMax) * 100
						: 0}%; background-color: {item.color || 'rgb(99, 102, 241)'};"
				></div>
			</div>
			{#if showValues}
				<div class="w-16 shrink-0 text-right text-sm text-slate-300">
					{item.value.toLocaleString()}
				</div>
			{/if}
		</div>
	{/each}
</div>
