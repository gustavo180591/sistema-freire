<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const reportTypes = [
		{ value: 'payments', label: 'Pagos registrados' },
		{ value: 'debt', label: 'Deudas por alumno' },
		{ value: 'overdue_debt', label: 'Deuda vencida' },
		{ value: 'movements', label: 'Movimientos financieros' },
		{ value: 'receipts', label: 'Recibos emitidos' },
		{ value: 'discounts', label: 'Condonaciones / Descuentos' },
		{ value: 'scholarships', label: 'Becas aplicadas' }
	];

	const paymentMethods = [
		{ value: 'CASH', label: 'Efectivo' },
		{ value: 'BANK_TRANSFER', label: 'Transferencia' },
		{ value: 'DEBIT_CARD', label: 'Tarjeta Débito' },
		{ value: 'CREDIT_CARD', label: 'Tarjeta Crédito' },
		{ value: 'QR', label: 'QR' }
	];

	const movementTypes = [
		{ value: 'CHARGE', label: 'Cargo' },
		{ value: 'PAYMENT', label: 'Pago' },
		{ value: 'ALLOCATION', label: 'Asignación' },
		{ value: 'RECEIPT', label: 'Recibo' },
		{ value: 'CANCELLATION', label: 'Cancelación' },
		{ value: 'ADJUSTMENT', label: 'Ajuste' },
		{ value: 'LATE_FEE', label: 'Recargo' },
		{ value: 'DISCOUNT', label: 'Descuento' },
		{ value: 'SCHOLARSHIP', label: 'Beca' }
	];

	const chargeStatuses = [
		{ value: 'PENDING', label: 'Pendiente' },
		{ value: 'PARTIAL', label: 'Parcial' },
		{ value: 'PAID', label: 'Pagado' },
		{ value: 'CANCELLED', label: 'Cancelado' }
	];

	const studentTypes = [
		{ value: 'NORMAL', label: 'Normal' },
		{ value: 'BECADO', label: 'Becado' },
		{ value: 'RECURSANTE', label: 'Recursante' }
	];

	const pageSizes = [10, 25, 50, 100];

	// Estado de filtros
	let selectedReportType = $state(data.reportType);
	let startDate = $state(data.currentFilters.startDate?.toISOString().split('T')[0] || '');
	let endDate = $state(data.currentFilters.endDate?.toISOString().split('T')[0] || '');
	let studentSearch = $state(data.currentFilters.studentSearch || '');
	let careerId = $state(data.currentFilters.careerId || '');
	let locationId = $state(data.currentFilters.locationId || '');
	let studentType = $state(data.currentFilters.studentType || '');
	let conceptCode = $state(data.currentFilters.conceptCode || '');
	let chargeStatus = $state(data.currentFilters.chargeStatus || '');
	let paymentMethod = $state(data.currentFilters.paymentMethod || '');
	let movementType = $state(data.currentFilters.movementType || '');
	let onlyOverdue = $state(data.currentFilters.onlyOverdue || false);
	let onlyBlocked = $state(data.currentFilters.onlyBlocked || false);
	let onlyCancelled = $state(data.currentFilters.onlyCancelled || false);
	let currentPage = $state(data.currentFilters.page || 1);
	let currentPageSize = $state(data.currentFilters.pageSize || 25);

	// Actualizar URL cuando cambian los filtros
	function updateURL() {
		const params = new URLSearchParams();
		params.set('type', selectedReportType);
		if (startDate) params.set('startDate', startDate);
		if (endDate) params.set('endDate', endDate);
		if (studentSearch) params.set('studentSearch', studentSearch);
		if (careerId) params.set('careerId', careerId);
		if (locationId) params.set('locationId', locationId);
		if (studentType) params.set('studentType', studentType);
		if (conceptCode) params.set('conceptCode', conceptCode);
		if (chargeStatus) params.set('chargeStatus', chargeStatus);
		if (paymentMethod) params.set('paymentMethod', paymentMethod);
		if (movementType) params.set('movementType', movementType);
		if (onlyOverdue) params.set('onlyOverdue', 'true');
		if (onlyBlocked) params.set('onlyBlocked', 'true');
		if (onlyCancelled) params.set('onlyCancelled', 'true');
		params.set('page', currentPage.toString());
		params.set('pageSize', currentPageSize.toString());

		$page.url.search = params.toString();
	}

	// Función para aplicar filtros
	function applyFilters() {
		currentPage = 1;
		updateURL();
	}

	// Función para cambiar página
	function changePage(newPage: number) {
		currentPage = newPage;
		updateURL();
	}

	// Función para cambiar tamaño de página
	function changePageSize(newSize: number) {
		currentPageSize = newSize;
		currentPage = 1;
		updateURL();
	}

	// Función para limpiar filtros
	function clearFilters() {
		startDate = '';
		endDate = '';
		studentSearch = '';
		careerId = '';
		locationId = '';
		studentType = '';
		conceptCode = '';
		chargeStatus = '';
		paymentMethod = '';
		movementType = '';
		onlyOverdue = false;
		onlyBlocked = false;
		onlyCancelled = false;
		currentPage = 1;
		updateURL();
	}

	// Función para exportar CSV
	function exportCSV() {
		if (!data.reportData || data.reportData.data.length === 0) {
			alert('No hay datos para exportar');
			return;
		}

		const headers = Object.keys(data.reportData.data[0]);
		const csvRows: string[] = [];
		csvRows.push(headers.join(','));

		for (const item of data.reportData.data) {
			const values = headers.map((header) => {
				const value = item[header];
				if (value === null || value === undefined) return '';
				if (typeof value === 'string') {
					const escaped = value.replace(/"/g, '""');
					if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
						return `"${escaped}"`;
					}
					return escaped;
				}
				return String(value);
			});
			csvRows.push(values.join(','));
		}

		const csv = csvRows.join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute(
			'download',
			`reporte_${selectedReportType}_${new Date().toISOString().split('T')[0]}.csv`
		);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Formatear moneda
	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	// Formatear fecha
	const formatDate = (dateStr: string) => {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		return date.toLocaleDateString('es-AR');
	};

	// Obtener color de estado
	function getStatusColor(status: string) {
		switch (status) {
			case 'PAID':
			case 'ACTIVE':
			case 'ISSUED':
				return 'bg-green-100 text-green-800';
			case 'PARTIAL':
				return 'bg-yellow-100 text-yellow-800';
			case 'PENDING':
				return 'bg-gray-100 text-gray-800';
			case 'CANCELLED':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	// Traducir método de pago
	function translatePaymentMethod(method: string) {
		const translations: Record<string, string> = {
			CASH: 'Efectivo',
			BANK_TRANSFER: 'Transferencia',
			DEBIT_CARD: 'Tarjeta Débito',
			CREDIT_CARD: 'Tarjeta Crédito',
			QR: 'QR'
		};
		return translations[method] || method;
	}

	// Traducir tipo de movimiento
	function translateMovementType(type: string) {
		const translations: Record<string, string> = {
			CHARGE: 'Cargo',
			PAYMENT: 'Pago',
			ALLOCATION: 'Asignación',
			RECEIPT: 'Recibo',
			CANCELLATION: 'Cancelación',
			ADJUSTMENT: 'Ajuste',
			LATE_FEE: 'Recargo',
			DISCOUNT: 'Descuento',
			SCHOLARSHIP: 'Beca'
		};
		return translations[type] || type;
	}

	// Traducir estado
	function translateStatus(status: string) {
		const translations: Record<string, string> = {
			PAID: 'Pagado',
			ACTIVE: 'Activo',
			ISSUED: 'Emitido',
			PARTIAL: 'Parcial',
			PENDING: 'Pendiente',
			CANCELLED: 'Cancelado'
		};
		return translations[status] || status;
	}

	// Traducir tipo de alumno
	function translateStudentType(type: string) {
		const translations: Record<string, string> = {
			NORMAL: 'Normal',
			BECADO: 'Becado',
			RECURSANTE: 'Recursante'
		};
		return translations[type] || type;
	}
</script>

<div class="space-y-6 p-6">
	<!-- Encabezado -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-200">Reportes financieros</h1>
			<p class="text-sm text-slate-400">
				Consulta de pagos, deudas, recibos, condonaciones, becas y movimientos financieros
			</p>
		</div>
		<a
			href="/finanzas"
			class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
		>
			Volver a Finanzas
		</a>
	</div>

	<!-- Selector de tipo de reporte -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
		<div class="mb-4">
			<label class="mb-2 block text-sm font-medium text-slate-300">Tipo de reporte</label>
			<select
				bind:value={selectedReportType}
				onchange={() => {
					currentPage = 1;
					updateURL();
				}}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
			>
				{#each reportTypes as type}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>
		</div>

		<!-- Filtros -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Fecha desde</label>
				<input
					type="date"
					bind:value={startDate}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Fecha hasta</label>
				<input
					type="date"
					bind:value={endDate}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Buscar alumno</label>
				<input
					type="text"
					bind:value={studentSearch}
					placeholder="Nombre, apellido o DNI"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Carrera</label>
				<select
					bind:value={careerId}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todas</option>
					{#each data.filters.careers as career}
						<option value={career.id}>{career.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Sede</label>
				<select
					bind:value={locationId}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todas</option>
					{#each data.filters.locations as location}
						<option value={location.id}>{location.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Tipo alumno</label>
				<select
					bind:value={studentType}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todos</option>
					{#each studentTypes as type}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Concepto</label>
				<select
					bind:value={conceptCode}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todos</option>
					{#each data.filters.concepts as concept}
						<option value={concept.code}>{concept.name}</option>
					{/each}
				</select>
			</div>

			<!-- Filtros específicos por tipo de reporte -->
			{#if selectedReportType === 'payments' || selectedReportType === 'receipts'}
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Método de pago</label>
					<select
						bind:value={paymentMethod}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Todos</option>
						{#each paymentMethods as method}
							<option value={method.value}>{method.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if selectedReportType === 'payments'}
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Solo anulados</label>
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={onlyCancelled}
							class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
						/>
						<span class="text-sm text-slate-300">Mostrar solo pagos anulados</span>
					</div>
				</div>
			{/if}

			{#if selectedReportType === 'movements'}
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Tipo de movimiento</label>
					<select
						bind:value={movementType}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Todos</option>
						{#each movementTypes as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if selectedReportType === 'debt' || selectedReportType === 'overdue_debt'}
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Estado del cargo</label>
					<select
						bind:value={chargeStatus}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Todos</option>
						{#each chargeStatuses as status}
							<option value={status.value}>{status.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Filtros adicionales</label>
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={onlyOverdue}
								class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
							/>
							<span class="text-sm text-slate-300">Solo deuda vencida</span>
						</div>
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={onlyBlocked}
								class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
							/>
							<span class="text-sm text-slate-300">Solo bloqueados</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Botones de acción -->
		<div class="mt-4 flex gap-3">
			<button
				onclick={applyFilters}
				class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				Aplicar filtros
			</button>
			<button
				onclick={clearFilters}
				class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
			>
				Limpiar filtros
			</button>
			<button
				onclick={exportCSV}
				class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
			>
				Exportar CSV
			</button>
		</div>
	</div>

	<!-- Métricas -->
	{#if data.reportData?.metrics}
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			{#if data.reportData.metrics.totalCollected !== undefined}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
					<p class="text-sm text-slate-400">Total cobrado</p>
					<p class="text-2xl font-bold text-slate-200">
						{currency.format(data.reportData.metrics.totalCollected)}
					</p>
				</div>
			{/if}
			{#if data.reportData.metrics.totalPending !== undefined}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
					<p class="text-sm text-slate-400">Total pendiente</p>
					<p class="text-2xl font-bold text-slate-200">
						{currency.format(data.reportData.metrics.totalPending)}
					</p>
				</div>
			{/if}
			{#if data.reportData.metrics.totalOverdue !== undefined}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
					<p class="text-sm text-slate-400">Total vencido</p>
					<p class="text-2xl font-bold text-red-400">
						{currency.format(data.reportData.metrics.totalOverdue)}
					</p>
				</div>
			{/if}
			{#if data.reportData.metrics.paymentCount !== undefined}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
					<p class="text-sm text-slate-400">Cantidad de pagos</p>
					<p class="text-2xl font-bold text-slate-200">{data.reportData.metrics.paymentCount}</p>
				</div>
			{/if}
			{#if data.reportData.metrics.studentCount !== undefined}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
					<p class="text-sm text-slate-400">Alumnos afectados</p>
					<p class="text-2xl font-bold text-slate-200">{data.reportData.metrics.studentCount}</p>
				</div>
			{/if}
			{#if data.reportData.metrics.receiptCount !== undefined}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
					<p class="text-sm text-slate-400">Recibos emitidos</p>
					<p class="text-2xl font-bold text-slate-200">{data.reportData.metrics.receiptCount}</p>
				</div>
			{/if}
			{#if data.reportData.metrics.totalDiscounted !== undefined}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
					<p class="text-sm text-slate-400">Total condonado</p>
					<p class="text-2xl font-bold text-indigo-400">
						{currency.format(data.reportData.metrics.totalDiscounted)}
					</p>
				</div>
			{/if}
			{#if data.reportData.metrics.totalScholarships !== undefined}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
					<p class="text-sm text-slate-400">Total becas</p>
					<p class="text-2xl font-bold text-green-400">
						{currency.format(data.reportData.metrics.totalScholarships)}
					</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Tabla de resultados -->
	<div class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50">
		<div class="overflow-x-auto">
			<table class="w-full text-sm text-slate-300">
				<thead class="bg-slate-950">
					<tr>
						{#if selectedReportType === 'payments'}
							<th class="px-4 py-3 text-left font-semibold">Fecha</th>
							<th class="px-4 py-3 text-left font-semibold">Alumno</th>
							<th class="px-4 py-3 text-left font-semibold">DNI</th>
							<th class="px-4 py-3 text-left font-semibold">Método</th>
							<th class="px-4 py-3 text-left font-semibold">Importe</th>
							<th class="px-4 py-3 text-left font-semibold">Estado</th>
							<th class="px-4 py-3 text-left font-semibold">Recibo</th>
						{:else if selectedReportType === 'debt' || selectedReportType === 'overdue_debt'}
							<th class="px-4 py-3 text-left font-semibold">Alumno</th>
							<th class="px-4 py-3 text-left font-semibold">DNI</th>
							<th class="px-4 py-3 text-left font-semibold">Carrera</th>
							<th class="px-4 py-3 text-left font-semibold">Tipo</th>
							<th class="px-4 py-3 text-left font-semibold">Deuda total</th>
							<th class="px-4 py-3 text-left font-semibold">Deuda vencida</th>
							<th class="px-4 py-3 text-left font-semibold">Bloqueado</th>
						{:else if selectedReportType === 'movements'}
							<th class="px-4 py-3 text-left font-semibold">Fecha</th>
							<th class="px-4 py-3 text-left font-semibold">Alumno</th>
							<th class="px-4 py-3 text-left font-semibold">Tipo</th>
							<th class="px-4 py-3 text-left font-semibold">Descripción</th>
							<th class="px-4 py-3 text-left font-semibold">Monto</th>
							<th class="px-4 py-3 text-left font-semibold">Usuario</th>
						{:else if selectedReportType === 'receipts'}
							<th class="px-4 py-3 text-left font-semibold">Número</th>
							<th class="px-4 py-3 text-left font-semibold">Fecha</th>
							<th class="px-4 py-3 text-left font-semibold">Alumno</th>
							<th class="px-4 py-3 text-left font-semibold">Total</th>
							<th class="px-4 py-3 text-left font-semibold">Método</th>
							<th class="px-4 py-3 text-left font-semibold">Estado</th>
						{:else if selectedReportType === 'discounts'}
							<th class="px-4 py-3 text-left font-semibold">Fecha</th>
							<th class="px-4 py-3 text-left font-semibold">Alumno</th>
							<th class="px-4 py-3 text-left font-semibold">Concepto</th>
							<th class="px-4 py-3 text-left font-semibold">Período</th>
							<th class="px-4 py-3 text-left font-semibold">Monto</th>
							<th class="px-4 py-3 text-left font-semibold">Motivo</th>
							<th class="px-4 py-3 text-left font-semibold">Usuario</th>
						{:else if selectedReportType === 'scholarships'}
							<th class="px-4 py-3 text-left font-semibold">Alumno</th>
							<th class="px-4 py-3 text-left font-semibold">Concepto</th>
							<th class="px-4 py-3 text-left font-semibold">Período</th>
							<th class="px-4 py-3 text-left font-semibold">Monto</th>
							<th class="px-4 py-3 text-left font-semibold">Fecha</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#if data.reportData?.data && data.reportData.data.length > 0}
						{#each data.reportData.data as item}
							<tr class="border-t border-slate-800 hover:bg-slate-800/50">
								{#if selectedReportType === 'payments'}
									<td class="px-4 py-3">{formatDate(item.date)}</td>
									<td class="px-4 py-3">{item.studentName}</td>
									<td class="px-4 py-3">{item.studentDni}</td>
									<td class="px-4 py-3">{translatePaymentMethod(item.method)}</td>
									<td class="px-4 py-3">{currency.format(item.amount)}</td>
									<td class="px-4 py-3">
										<span class="rounded-full px-2 py-1 text-xs {getStatusColor(item.status)}">
											{translateStatus(item.status)}
										</span>
									</td>
									<td class="px-4 py-3">
										{#if item.receiptNumber}
											<a
												href={`/recibos/${item.receiptId}`}
												class="text-indigo-400 hover:text-indigo-300"
											>
												{item.receiptNumber}/{item.receiptYear}
											</a>
										{:else}
											-
										{/if}
									</td>
								{:else if selectedReportType === 'debt' || selectedReportType === 'overdue_debt'}
									<td class="px-4 py-3">
										<a
											href={`/alumnos/${item.studentId}/finanzas`}
											class="text-indigo-400 hover:text-indigo-300"
										>
											{item.studentName}
										</a>
									</td>
									<td class="px-4 py-3">{item.studentDni}</td>
									<td class="px-4 py-3">{item.careerName}</td>
									<td class="px-4 py-3">
										<span
											class="rounded-full px-2 py-1 text-xs {item.studentType === 'BECADO'
												? 'bg-green-100 text-green-800'
												: item.studentType === 'RECURSANTE'
													? 'bg-orange-100 text-orange-800'
													: 'bg-gray-100 text-gray-800'}"
										>
											{translateStudentType(item.studentType)}
										</span>
									</td>
									<td class="px-4 py-3">{currency.format(item.totalDebt)}</td>
									<td class="px-4 py-3 text-red-400">{currency.format(item.overdueDebt)}</td>
									<td class="px-4 py-3">
										{#if item.isBlocked}
											<span class="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Sí</span>
										{:else}
											<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800"
												>No</span
											>
										{/if}
									</td>
								{:else if selectedReportType === 'movements'}
									<td class="px-4 py-3">{formatDate(item.date)}</td>
									<td class="px-4 py-3">{item.studentName}</td>
									<td class="px-4 py-3">{translateMovementType(item.movementType)}</td>
									<td class="px-4 py-3">{item.description}</td>
									<td class="px-4 py-3">{currency.format(item.amount)}</td>
									<td class="px-4 py-3">{item.userName}</td>
								{:else if selectedReportType === 'receipts'}
									<td class="px-4 py-3">
										<a href={`/recibos/${item.id}`} class="text-indigo-400 hover:text-indigo-300">
											{item.receiptNumber}/{item.receiptYear}
										</a>
									</td>
									<td class="px-4 py-3">{formatDate(item.date)}</td>
									<td class="px-4 py-3">{item.studentName}</td>
									<td class="px-4 py-3">{currency.format(item.totalAmount)}</td>
									<td class="px-4 py-3">{translatePaymentMethod(item.method)}</td>
									<td class="px-4 py-3">
										<span class="rounded-full px-2 py-1 text-xs {getStatusColor(item.status)}">
											{translateStatus(item.status)}
										</span>
									</td>
								{:else if selectedReportType === 'discounts'}
									<td class="px-4 py-3">{formatDate(item.date)}</td>
									<td class="px-4 py-3">{item.studentName}</td>
									<td class="px-4 py-3">{item.chargeConcept}</td>
									<td class="px-4 py-3">{item.periodLabel || '-'}</td>
									<td class="px-4 py-3 text-indigo-400">{currency.format(item.amount)}</td>
									<td class="px-4 py-3">{item.reason || '-'}</td>
									<td class="px-4 py-3">{item.userName}</td>
								{:else if selectedReportType === 'scholarships'}
									<td class="px-4 py-3">{item.studentName}</td>
									<td class="px-4 py-3">{item.chargeConcept}</td>
									<td class="px-4 py-3">{item.periodLabel || '-'}</td>
									<td class="px-4 py-3 text-green-400">{currency.format(item.amount)}</td>
									<td class="px-4 py-3">{formatDate(item.appliedAt)}</td>
								{/if}
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan="10" class="px-4 py-8 text-center text-slate-400">
								No hay datos para mostrar
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Paginación -->
	{#if data.reportData && data.reportData.totalPages > 1}
		<div
			class="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/50 p-4"
		>
			<div class="flex items-center gap-2">
				<span class="text-sm text-slate-400">Mostrar</span>
				<select
					bind:value={currentPageSize}
					onchange={() => changePageSize(currentPageSize)}
					class="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition focus:border-indigo-500 focus:outline-none"
				>
					{#each pageSizes as size}
						<option value={size}>{size}</option>
					{/each}
				</select>
				<span class="text-sm text-slate-400">por página</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm text-slate-400">
					{data.reportData.total} resultados - Página {data.reportData.page} de {data.reportData
						.totalPages}
				</span>
				<button
					disabled={data.reportData.page === 1}
					onclick={() => changePage(data.reportData.page - 1)}
					class="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Anterior
				</button>
				<button
					disabled={data.reportData.page === data.reportData.totalPages}
					onclick={() => changePage(data.reportData.page + 1)}
					class="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Siguiente
				</button>
			</div>
		</div>
	{/if}
</div>
