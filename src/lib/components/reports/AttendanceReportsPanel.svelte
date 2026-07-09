<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportKpiCard from './ReportKpiCard.svelte';
	import SimpleProgressBar from './charts/SimpleProgressBar.svelte';
	import SimpleMetricComparison from './charts/SimpleMetricComparison.svelte';
	import SimpleDistributionList from './charts/SimpleDistributionList.svelte';

	interface Props {
		onError: (message: string) => void;
		onLoading: (isLoading: boolean) => void;
	}

	let { onError, onLoading }: Props = $props();

	interface AttendanceReportMetrics {
		totalRecords: number;
		totalEntries: number;
		presentCount: number;
		absentCount: number;
		justifiedCount: number;
		unjustifiedCount: number;
		averageAttendance: number;
		averageBySubject: Record<string, number>;
		averageByCommission: Record<string, number>;
	}

	interface AttendanceFilters {
		studentId?: string;
		subjectId?: string;
		commissionId?: string;
		startDate?: string;
		endDate?: string;
	}

	let metrics = $state<AttendanceReportMetrics | null>(null);
	let loading = $state(false);
	let filters = $state<AttendanceFilters>({});

	async function fetchAttendanceReport() {
		loading = true;
		onLoading(true);
		try {
			const queryParams = new URLSearchParams();
			if (filters.studentId) queryParams.append('studentId', filters.studentId);
			if (filters.subjectId) queryParams.append('subjectId', filters.subjectId);
			if (filters.commissionId) queryParams.append('commissionId', filters.commissionId);
			if (filters.startDate) queryParams.append('startDate', filters.startDate);
			if (filters.endDate) queryParams.append('endDate', filters.endDate);

			const queryString = queryParams.toString();
			const url = `/api/reports/attendance${queryString ? `?${queryString}` : ''}`;

			const response = await fetch(url);

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				onError('No tienes permiso para ver reportes de asistencia (requiere ATTENDANCE:read)');
				return;
			}

			if (response.status === 400) {
				const result = await response.json();
				onError(result.error || 'Filtros inválidos');
				return;
			}

			if (!response.ok) {
				throw new Error(`Error: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				metrics = result.data;
			} else {
				onError(result.error || 'Error al cargar reporte de asistencia');
			}
		} catch (error) {
			console.error('Error fetching attendance report:', error);
			onError('Error al cargar reporte de asistencia');
		} finally {
			loading = false;
			onLoading(false);
		}
	}

	async function exportToCsv() {
		try {
			const queryParams = new URLSearchParams();
			if (filters.studentId) queryParams.append('studentId', filters.studentId);
			if (filters.subjectId) queryParams.append('subjectId', filters.subjectId);
			if (filters.commissionId) queryParams.append('commissionId', filters.commissionId);
			if (filters.startDate) queryParams.append('startDate', filters.startDate);
			if (filters.endDate) queryParams.append('endDate', filters.endDate);

			const queryString = queryParams.toString();
			const url = `/api/reports/attendance/export${queryString ? `?${queryString}` : ''}`;

			const response = await fetch(url);

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				onError(
					'No tienes permiso para exportar reportes de asistencia (requiere ATTENDANCE:read)'
				);
				return;
			}

			if (response.status === 400) {
				onError('Filtros inválidos para exportación');
				return;
			}

			if (!response.ok) {
				throw new Error(`Error: ${response.statusText}`);
			}

			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = blobUrl;
			a.download =
				response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
				'reporte-asistencia.csv';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(blobUrl);
			document.body.removeChild(a);
		} catch (error) {
			console.error('Error exporting attendance report:', error);
			onError('Error al exportar reporte de asistencia');
		}
	}

	function formatPercent(value: number): string {
		return `${value.toFixed(2)}%`;
	}

	function handleFilterChange(newFilters: AttendanceFilters) {
		filters = newFilters;
		fetchAttendanceReport();
	}

	// Load on mount
	$effect(() => {
		fetchAttendanceReport();
	});
</script>

<div class="space-y-6">
	<!-- Filters -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h3 class="mb-4 text-lg font-semibold">Filtros</h3>
		<div class="grid gap-4 md:grid-cols-3">
			<div>
				<label for="studentId" class="mb-2 block text-sm font-medium text-slate-300"
					>ID Alumno</label
				>
				<input
					id="studentId"
					type="text"
					bind:value={filters.studentId}
					placeholder="ID del alumno"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label for="subjectId" class="mb-2 block text-sm font-medium text-slate-300"
					>ID Materia</label
				>
				<input
					id="subjectId"
					type="text"
					bind:value={filters.subjectId}
					placeholder="ID de la materia"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label for="commissionId" class="mb-2 block text-sm font-medium text-slate-300"
					>ID Comisión</label
				>
				<input
					id="commissionId"
					type="text"
					bind:value={filters.commissionId}
					placeholder="ID de la comisión"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label for="startDate" class="mb-2 block text-sm font-medium text-slate-300"
					>Fecha Desde</label
				>
				<input
					id="startDate"
					type="date"
					bind:value={filters.startDate}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label for="endDate" class="mb-2 block text-sm font-medium text-slate-300"
					>Fecha Hasta</label
				>
				<input
					id="endDate"
					type="date"
					bind:value={filters.endDate}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
		</div>
		<div class="mt-4 flex gap-2">
			<button
				onclick={fetchAttendanceReport}
				class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Aplicar Filtros
			</button>
			<button
				onclick={exportToCsv}
				class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
			>
				Exportar CSV
			</button>
		</div>
	</div>

	{#if loading}
		<div
			class="flex items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12"
		>
			<div
				class="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"
			></div>
		</div>
	{:else if metrics}
		<div class="grid gap-4 md:grid-cols-3">
			<ReportKpiCard label="Total Registros" value={metrics.totalRecords} />
			<ReportKpiCard label="Total Entradas" value={metrics.totalEntries} />
			<ReportKpiCard label="Presentes" value={metrics.presentCount} />
			<ReportKpiCard label="Ausentes" value={metrics.absentCount} />
			<ReportKpiCard label="Con Observación" value={metrics.justifiedCount} />
			<ReportKpiCard label="Sin Observación" value={metrics.unjustifiedCount} />
			<ReportKpiCard label="Asistencia Promedio" value={formatPercent(metrics.averageAttendance)} />
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Presentes vs Ausentes</h3>
				<SimpleMetricComparison
					metrics={[
						{ label: 'Presentes', value: metrics.presentCount, color: 'rgb(34, 197, 94)' },
						{ label: 'Ausentes', value: metrics.absentCount, color: 'rgb(239, 68, 68)' }
					]}
					showTotal={false}
				/>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Ausencias con/sin Observación</h3>
				<SimpleMetricComparison
					metrics={[
						{ label: 'Con Observación', value: metrics.justifiedCount, color: 'rgb(251, 191, 36)' },
						{ label: 'Sin Observación', value: metrics.unjustifiedCount, color: 'rgb(239, 68, 68)' }
					]}
					showTotal={false}
				/>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Asistencia Promedio</h3>
				<SimpleProgressBar
					value={metrics.averageAttendance}
					total={100}
					label="Asistencia Promedio"
					color="rgb(99, 102, 241)"
				/>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Promedio por Materia</h3>
				<SimpleDistributionList
					data={metrics.averageBySubject}
					title="Asistencia por Materia"
					color="rgb(99, 102, 241)"
				/>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 md:col-span-2">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Promedio por Comisión</h3>
				<SimpleDistributionList
					data={metrics.averageByCommission}
					title="Asistencia por Comisión"
					color="rgb(34, 197, 94)"
				/>
			</div>
		</div>
	{:else}
		<div
			class="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12"
		>
			<p class="text-lg font-medium text-slate-300">No hay datos disponibles</p>
		</div>
	{/if}
</div>
