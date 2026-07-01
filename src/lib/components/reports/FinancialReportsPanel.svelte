<script lang="ts">
	import { goto } from '$app/navigation';
	import ReportKpiCard from './ReportKpiCard.svelte';

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
		<button
			onclick={fetchFinancialReport}
			class="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Aplicar Filtros
		</button>
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
	{:else}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12">
			<p class="text-lg font-medium text-slate-300">No hay datos disponibles</p>
		</div>
	{/if}
</div>
