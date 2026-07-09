<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportKpiCard from '$lib/components/reports/ReportKpiCard.svelte';
	import ReportSectionTabs from '$lib/components/reports/ReportSectionTabs.svelte';
	import InstitutionalReportsPanel from '$lib/components/reports/InstitutionalReportsPanel.svelte';
	import FinancialReportsPanel from '$lib/components/reports/FinancialReportsPanel.svelte';
	import AcademicReportsPanel from '$lib/components/reports/AcademicReportsPanel.svelte';
	import AttendanceReportsPanel from '$lib/components/reports/AttendanceReportsPanel.svelte';
	import ReportErrorState from '$lib/components/reports/ReportErrorState.svelte';
	import ReportLoadingState from '$lib/components/reports/ReportLoadingState.svelte';

	let { data } = $props();

	type Tab = 'institutional' | 'financial' | 'academic' | 'attendance';
	let activeTab = $state<Tab>('institutional');
	let loading = $state(false);
	let error = $state<string | null>(null);

	function handleTabChange(tab: Tab) {
		activeTab = tab;
		error = null;
	}

	function handleError(message: string) {
		error = message;
	}

	function handleLoading(isLoading: boolean) {
		loading = isLoading;
	}
</script>

<svelte:head>
	<title>Dashboard de Reportes | ISFD "PAULO FREIRE" 1117</title>
	<meta
		name="description"
		content="Dashboard de reportes institucionales, financieros, académicos y de asistencia"
	/>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">
			Dirección · Secretaría · Finanzas
		</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Dashboard de Reportes</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Visualización de métricas institucionales, financieras, académicas y de asistencia con filtros
			personalizados.
		</p>
	</section>

	<!-- Error Banner -->
	{#if error}
		<div class="rounded-2xl border border-red-900/50 bg-red-950/30 px-6 py-4">
			<div class="flex items-center gap-3">
				<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<p class="text-red-400">{error}</p>
				<button
					onclick={() => (error = null)}
					class="ml-auto text-red-400 transition-colors hover:text-red-300"
					aria-label="Cerrar error"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- Tabs -->
	<ReportSectionTabs {activeTab} onTabChange={handleTabChange} />

	<!-- Loading State -->
	{#if loading}
		<ReportLoadingState />
	{/if}

	<!-- Report Panels -->
	{#if !loading}
		{#if activeTab === 'institutional'}
			<InstitutionalReportsPanel onError={handleError} onLoading={handleLoading} />
		{:else if activeTab === 'financial'}
			<FinancialReportsPanel onError={handleError} onLoading={handleLoading} />
		{:else if activeTab === 'academic'}
			<AcademicReportsPanel onError={handleError} onLoading={handleLoading} />
		{:else if activeTab === 'attendance'}
			<AttendanceReportsPanel onError={handleError} onLoading={handleLoading} />
		{/if}
	{/if}
</div>
