<script lang="ts">
	interface Props {
		value: number;
		total: number;
		label?: string;
		color?: string;
		height?: number;
		showPercentage?: boolean;
	}

	let { value, total, label, color = 'rgb(99, 102, 241)', height = 8, showPercentage = true }: Props = $props();

	const percentage = $derived(total > 0 ? (value / total) * 100 : 0);
</script>

<div class="space-y-1">
	{#if label}
		<div class="flex justify-between text-sm">
			<span class="text-slate-400">{label}</span>
			{#if showPercentage}
				<span class="text-slate-300">{percentage.toFixed(1)}%</span>
			{/if}
		</div>
	{/if}
	<div class="w-full bg-slate-800 rounded-full overflow-hidden" style="height: {height}px;">
		<div
			class="h-full rounded-full transition-all duration-300"
			style="width: {percentage}%; background-color: {color};"
		></div>
	</div>
	{#if !label && showPercentage}
		<div class="text-right text-sm text-slate-300">{percentage.toFixed(1)}%</div>
	{/if}
</div>
