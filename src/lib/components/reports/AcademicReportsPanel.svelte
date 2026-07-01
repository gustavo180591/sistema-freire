<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportKpiCard from './ReportKpiCard.svelte';

	interface Props {
		onError: (message: string) => void;
		onLoading: (isLoading: boolean) => void;
	}

	let { onError, onLoading }: Props = $props();

	interface AcademicReportMetrics {
		totalStudents: number;
		activeStudents: number;
		studentsByCareer: Record<string, number>;
		studentsByStatus: Record<string, number>;
		totalSubjects: number;
		totalTeachers: number;
		totalCommissions: number;
		totalEvaluations: number;
		totalGrades: number;
		averageGrade: number;
		regularCount: number;
		libreCount: number;
		riskStudents: number;
	}

	interface AcademicFilters {
		careerId?: string;
		subjectId?: string;
		studentId?: string;
	}

	let metrics = $state<AcademicReportMetrics | null>(null);
	let loading = $state(false);
	let filters = $state<AcademicFilters>({});

	async function fetchAcademicReport() {
		loading = true;
		onLoading(true);
		try {
			const queryParams = new URLSearchParams();
			if (filters.careerId) queryParams.append('careerId', filters.careerId);
			if (filters.subjectId) queryParams.append('subjectId', filters.subjectId);
			if (filters.studentId) queryParams.append('studentId', filters.studentId);

			const queryString = queryParams.toString();
			const url = `/api/reports/academic${queryString ? `?${queryString}` : ''}`;

			const response = await fetch(url);

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				onError('No tienes permiso para ver reportes académicos (requiere GRADE:read)');
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
				onError(result.error || 'Error al cargar reporte académico');
			}
		} catch (error) {
			console.error('Error fetching academic report:', error);
			onError('Error al cargar reporte académico');
		} finally {
			loading = false;
			onLoading(false);
		}
	}

	async function exportToCsv() {
		try {
			const queryParams = new URLSearchParams();
			if (filters.careerId) queryParams.append('careerId', filters.careerId);
			if (filters.subjectId) queryParams.append('subjectId', filters.subjectId);
			if (filters.studentId) queryParams.append('studentId', filters.studentId);

			const queryString = queryParams.toString();
			const url = `/api/reports/academic/export${queryString ? `?${queryString}` : ''}`;

			const response = await fetch(url);

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				onError('No tienes permiso para exportar reportes académicos (requiere GRADE:read)');
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
			a.download = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'reporte-academico.csv';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(blobUrl);
			document.body.removeChild(a);
		} catch (error) {
			console.error('Error exporting academic report:', error);
			onError('Error al exportar reporte académico');
		}
	}

	function formatPercent(value: number): string {
		return `${value.toFixed(2)}%`;
	}

	function handleFilterChange(newFilters: AcademicFilters) {
		filters = newFilters;
		fetchAcademicReport();
	}

	// Load on mount
	$effect(() => {
		fetchAcademicReport();
	});
</script>

<div class="space-y-6">
	<!-- Filters -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h3 class="mb-4 text-lg font-semibold">Filtros</h3>
		<div class="grid gap-4 md:grid-cols-3">
			<div>
				<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300">ID Carrera</label>
				<input
					id="careerId"
					type="text"
					bind:value={filters.careerId}
					placeholder="ID de la carrera"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label for="subjectId" class="mb-2 block text-sm font-medium text-slate-300">ID Materia</label>
				<input
					id="subjectId"
					type="text"
					bind:value={filters.subjectId}
					placeholder="ID de la materia"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label for="studentId" class="mb-2 block text-sm font-medium text-slate-300">ID Alumno</label>
				<input
					id="studentId"
					type="text"
					bind:value={filters.studentId}
					placeholder="ID del alumno"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
		</div>
		<div class="mt-4 flex gap-2">
			<button
				onclick={fetchAcademicReport}
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
		<div class="flex items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12">
			<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
		</div>
	{:else if metrics}
		<div class="grid gap-4 md:grid-cols-3">
			<ReportKpiCard label="Alumnos Totales" value={metrics.totalStudents} />
			<ReportKpiCard label="Alumnos Activos" value={metrics.activeStudents} />
			<ReportKpiCard label="Materias" value={metrics.totalSubjects} />
			<ReportKpiCard label="Docentes" value={metrics.totalTeachers} />
			<ReportKpiCard label="Comisiones" value={metrics.totalCommissions} />
			<ReportKpiCard label="Evaluaciones" value={metrics.totalEvaluations} />
			<ReportKpiCard label="Calificaciones" value={metrics.totalGrades} />
			<ReportKpiCard label="Promedio" value={formatPercent(metrics.averageGrade)} />
			<ReportKpiCard label="Regulares" value={metrics.regularCount} />
			<ReportKpiCard label="Libres" value={metrics.libreCount} />
			<ReportKpiCard label="Alumnos en Riesgo" value={metrics.riskStudents} />
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12">
			<p class="text-lg font-medium text-slate-300">No hay datos disponibles</p>
		</div>
	{/if}
</div>
