<script lang="ts">
	interface Props {
		activeTab: 'institutional' | 'financial' | 'academic' | 'attendance';
		onTabChange: (tab: 'institutional' | 'financial' | 'academic' | 'attendance') => void;
	}

	let { activeTab, onTabChange }: Props = $props();

	const tabs = [
		{ id: 'institutional' as const, label: 'Institucional' },
		{ id: 'financial' as const, label: 'Financiero' },
		{ id: 'academic' as const, label: 'Académico' },
		{ id: 'attendance' as const, label: 'Asistencia' }
	];
</script>

<div class="flex gap-2 border-b border-slate-800 pb-4">
	{#each tabs as tab}
		<button
			onclick={() => onTabChange(tab.id)}
			class="rounded-xl px-4 py-2 text-sm font-medium transition {activeTab === tab.id
				? 'bg-white text-slate-950'
				: 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
		>
			{tab.label}
		</button>
	{/each}
</div>
