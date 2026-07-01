<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportKpiCard from './ReportKpiCard.svelte';

	interface Props {
		onError: (message: string) => void;
		onLoading: (isLoading: boolean) => void;
	}

	let { onError, onLoading }: Props = $props();

	interface InstitutionalMetrics {
		totalStudents: number;
		activeStudents: number;
		totalTeachers: number;
		totalDocuments: number;
		totalCareers: number;
		totalSubjects: number;
		totalDebt: number;
		totalCollected: number;
		averageAttendance: number;
		lowAttendanceCount: number;
	}

	let metrics = $state<InstitutionalMetrics | null>(null);
	let loading = $state(false);

	async function fetchInstitutionalReport() {
		loading = true;
		onLoading(true);
		try {
			const response = await fetch('/api/reports/institutional');

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				onError('No tienes permiso para ver reportes institucionales (requiere SUPERADMIN)');
				return;
			}

			if (!response.ok) {
				throw new Error(`Error: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				metrics = result.data;
			} else {
				onError(result.error || 'Error al cargar reporte institucional');
			}
		} catch (error) {
			console.error('Error fetching institutional report:', error);
			onError('Error al cargar reporte institucional');
		} finally {
			loading = false;
			onLoading(false);
		}
	}

	async function exportToCsv() {
		try {
			const response = await fetch('/api/reports/institutional/export');

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				onError('No tienes permiso para exportar reportes institucionales (requiere SUPERADMIN)');
				return;
			}

			if (!response.ok) {
				throw new Error(`Error: ${response.statusText}`);
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'reporte-institucional.csv';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error('Error exporting institutional report:', error);
			onError('Error al exportar reporte institucional');
		}
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS'
		}).format(value);
	}

	function formatPercent(value: number): string {
		return `${value.toFixed(2)}%`;
	}

	// Load on mount
	$effect(() => {
		fetchInstitutionalReport();
	});
</script>

<div class="space-y-6">
	<div class="flex justify-end">
		<button
			onclick={exportToCsv}
			class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Exportar CSV
		</button>
	</div>
	{#if loading}
		<div class="flex items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12">
			<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
		</div>
	{:else if metrics}
		<div class="grid gap-4 md:grid-cols-3">
			<ReportKpiCard label="Alumnos Totales" value={metrics.totalStudents} />
			<ReportKpiCard label="Alumnos Activos" value={metrics.activeStudents} />
			<ReportKpiCard label="Docentes" value={metrics.totalTeachers} />
			<ReportKpiCard label="Documentos" value={metrics.totalDocuments} />
			<ReportKpiCard label="Carreras" value={metrics.totalCareers} />
			<ReportKpiCard label="Materias" value={metrics.totalSubjects} />
			<ReportKpiCard label="Deuda Total" value={formatCurrency(metrics.totalDebt)} />
			<ReportKpiCard label="Cobrado" value={formatCurrency(metrics.totalCollected)} />
			<ReportKpiCard label="Asistencia Promedio" value={formatPercent(metrics.averageAttendance)} />
			<ReportKpiCard label="Baja Asistencia" value={metrics.lowAttendanceCount} />
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12">
			<p class="text-lg font-medium text-slate-300">No hay datos disponibles</p>
		</div>
	{/if}
</div>
