<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportKpiCard from './ReportKpiCard.svelte';
	import SimpleProgressBar from './charts/SimpleProgressBar.svelte';
	import SimpleMetricComparison from './charts/SimpleMetricComparison.svelte';

	interface Props {
		onError: (message: string) => void;
		onLoading: (isLoading: boolean) => void;
	}

	let { onError, onLoading }: Props = $props();

	interface FinancialReportMetrics {
		totalCharges: number;
		totalPaid: number;
		totalPending: number;
		overdueDebt: number;
		studentsWithDebt: number;
		paymentsCount: number;
		receiptsIssued: number;
		activeAgreements: number;
	}

	interface FinancialFilters {
		studentId?: string;
		startDate?: string;
		endDate?: string;
	}

	let metrics = $state<FinancialReportMetrics | null>(null);
	let loading = $state(false);
	let filters = $state<FinancialFilters>({});

	async function fetchFinancialReport() {
		loading = true;
		onLoading(true);
		try {
			const queryParams = new URLSearchParams();
			if (filters.studentId) queryParams.append('studentId', filters.studentId);
			if (filters.startDate) queryParams.append('startDate', filters.startDate);
			if (filters.endDate) queryParams.append('endDate', filters.endDate);

			const queryString = queryParams.toString();
			const url = `/api/reports/financial${queryString ? `?${queryString}` : ''}`;

			const response = await fetch(url);

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				onError('No tienes permiso para ver reportes financieros (requiere FINANCIAL_REPORT:read)');
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
				onError(result.error || 'Error al cargar reporte financiero');
			}
		} catch (error) {
			console.error('Error fetching financial report:', error);
			onError('Error al cargar reporte financiero');
		} finally {
			loading = false;
			onLoading(false);
		}
	}

	async function exportToCsv() {
		try {
			const queryParams = new URLSearchParams();
			if (filters.studentId) queryParams.append('studentId', filters.studentId);
			if (filters.startDate) queryParams.append('startDate', filters.startDate);
			if (filters.endDate) queryParams.append('endDate', filters.endDate);

			const queryString = queryParams.toString();
			const url = `/api/reports/financial/export${queryString ? `?${queryString}` : ''}`;

			const response = await fetch(url);

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				onError('No tienes permiso para exportar reportes financieros (requiere FINANCIAL_REPORT:read)');
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
			a.download = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'reporte-financiero.csv';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(blobUrl);
			document.body.removeChild(a);
		} catch (error) {
			console.error('Error exporting financial report:', error);
			onError('Error al exportar reporte financiero');
		}
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS'
		}).format(value);
	}

	function handleFilterChange(newFilters: FinancialFilters) {
		filters = newFilters;
		fetchFinancialReport();
	}

	// Load on mount
	$effect(() => {
		fetchFinancialReport();
	});
</script>

<div class="space-y-6">
	<!-- Filters -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h3 class="mb-4 text-lg font-semibold">Filtros</h3>
		<div class="grid gap-4 md:grid-cols-3">
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
			<div>
				<label for="startDate" class="mb-2 block text-sm font-medium text-slate-300">Fecha Desde</label>
				<input
					id="startDate"
					type="date"
					bind:value={filters.startDate}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label for="endDate" class="mb-2 block text-sm font-medium text-slate-300">Fecha Hasta</label>
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
				onclick={fetchFinancialReport}
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
			<ReportKpiCard label="Cargos Totales" value={formatCurrency(metrics.totalCharges)} />
			<ReportKpiCard label="Pagado" value={formatCurrency(metrics.totalPaid)} />
			<ReportKpiCard label="Pendiente" value={formatCurrency(metrics.totalPending)} />
			<ReportKpiCard label="Vencido" value={formatCurrency(metrics.overdueDebt)} />
			<ReportKpiCard label="Alumnos con Deuda" value={metrics.studentsWithDebt} />
			<ReportKpiCard label="Pagos" value={metrics.paymentsCount} />
			<ReportKpiCard label="Recibos" value={metrics.receiptsIssued} />
			<ReportKpiCard label="Convenios Activos" value={metrics.activeAgreements} />
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Pagado vs Pendiente</h3>
				<SimpleMetricComparison
					metrics={[
						{ label: 'Pagado', value: metrics.totalPaid, color: 'rgb(34, 197, 94)' },
						{ label: 'Pendiente', value: metrics.totalPending, color: 'rgb(239, 68, 68)' }
					]}
					showTotal={false}
				/>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Deuda Vencida vs Total</h3>
				<SimpleProgressBar
					value={metrics.overdueDebt}
					total={metrics.totalCharges}
					label="Deuda Vencida"
					color="rgb(239, 68, 68)"
				/>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Alumnos con Deuda</h3>
				<div class="text-center">
					<div class="text-4xl font-bold text-amber-500">{metrics.studentsWithDebt}</div>
					<div class="text-sm text-slate-400 mt-1">alumnos con deuda pendiente</div>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-200">Convenios Activos</h3>
				<div class="text-center">
					<div class="text-4xl font-bold text-indigo-500">{metrics.activeAgreements}</div>
					<div class="text-sm text-slate-400 mt-1">convenios de pago activos</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12">
			<p class="text-lg font-medium text-slate-300">No hay datos disponibles</p>
		</div>
	{/if}
</div>
