<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const student = $derived(data.student);
	const financial = $derived(data.financial);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	const dateFormat = new Intl.DateTimeFormat('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});

	function getStatusColor(status: string): string {
		switch (status) {
			case 'PAID':
				return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
			case 'PENDING':
				return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
			case 'OVERDUE':
				return 'bg-red-500/20 text-red-400 border-red-500/30';
			default:
				return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
		}
	}

	function getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			PAID: 'Pagado',
			PENDING: 'Pendiente',
			OVERDUE: 'Vencido'
		};
		return labels[status] || status;
	}

	function getPaymentMethodLabel(method: string): string {
		const labels: Record<string, string> = {
			CASH: 'Efectivo',
			TRANSFER: 'Transferencia',
			CARD: 'Tarjeta',
			CHEQUE: 'Cheque',
			MERCADO_PAGO: 'Mercado Pago',
			MP: 'Mercado Pago',
			DEBIT: 'Débito',
			CREDIT: 'Crédito'
		};
		return labels[method] || method;
	}
</script>

<svelte:head>
	<title>Situación financiera | {student.fullName}</title>
	<meta name="description" content="Situación financiera del alumno" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Situación financiera</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">
					{student.fullName}
				</h1>
				<p class="mt-3 text-sm text-slate-400">
					DNI: {student.dni} · {student.career} · {student.currentYear}° Año
					{#if student.location}
						· {student.location}
					{/if}
				</p>
				{#if student.financialBlocked && student.blockingMessage}
					<div
						class="mt-3 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400"
					>
						{student.blockingMessage}
					</div>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				<a
					href="/alumno"
					class="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
				>
					← Volver al panel
				</a>
			</div>
		</div>
	</section>

	<!-- KPIs -->
	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda total</p>
			<h2
				class="mt-3 text-4xl font-bold {financial.totalDebt > 0
					? 'text-red-400'
					: 'text-emerald-400'}"
			>
				{currency.format(financial.totalDebt)}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total cargos</p>
			<h2 class="mt-3 text-4xl font-bold text-slate-300">
				{currency.format(financial.totalCharges)}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total pagado</p>
			<h2 class="mt-3 text-4xl font-bold text-emerald-400">
				{currency.format(financial.totalPayments)}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda vencida</p>
			<h2
				class="mt-3 text-4xl font-bold {financial.overdueDebt > 0
					? 'text-red-400'
					: 'text-emerald-400'}"
			>
				{currency.format(financial.overdueDebt)}
			</h2>
		</div>
	</section>

	<!-- Cargos por concepto -->
	{#if Object.keys(financial.chargesByConcept).length > 0}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-2xl font-bold">Resumen por concepto</h2>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each Object.entries(financial.chargesByConcept) as [concept, data]}
					<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
						<p class="text-sm text-slate-400">{concept}</p>
						<div class="mt-2 flex items-center justify-between">
							<span class="text-lg font-semibold"
								>{data.count} cargo{data.count !== 1 ? 's' : ''}</span
							>
							<span class="text-lg font-bold text-slate-300">{currency.format(data.total)}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Cargos recientes -->
	{#if financial.charges.length > 0}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-2xl font-bold">Cargos recientes</h2>
			<div class="overflow-x-auto">
				<table class="w-full text-left">
					<thead class="border-b border-slate-800 bg-slate-900">
						<tr>
							<th class="px-4 py-3 text-sm font-semibold">Concepto</th>
							<th class="px-4 py-3 text-sm font-semibold">Periodo</th>
							<th class="px-4 py-3 text-sm font-semibold">Monto</th>
							<th class="px-4 py-3 text-sm font-semibold">Beca</th>
							<th class="px-4 py-3 text-sm font-semibold">Pagado</th>
							<th class="px-4 py-3 text-sm font-semibold">Saldo</th>
							<th class="px-4 py-3 text-sm font-semibold">Vencimiento</th>
							<th class="px-4 py-3 text-sm font-semibold">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each financial.charges as charge}
							<tr class="border-b border-slate-800 last:border-none">
								<td class="px-4 py-3 font-medium">{charge.concept?.name || 'Sin concepto'}</td>
								<td class="px-4 py-3">{charge.periodLabel}</td>
								<td class="px-4 py-3">{currency.format(charge.amount)}</td>
								<td class="px-4 py-3">
									{#if charge.scholarshipApplied > 0}
										<span class="text-emerald-400"
											>{currency.format(charge.scholarshipApplied)}</span
										>
									{:else if charge.scholarshipLost}
										<span class="text-red-400" title="Beneficio perdido por pago fuera de término">
											Perdida
										</span>
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								</td>
								<td class="px-4 py-3">{currency.format(charge.paidAmount)}</td>
								<td class="px-4 py-3 font-semibold">
									{currency.format(charge.amount - charge.paidAmount)}
								</td>
								<td class="px-4 py-3">
									{#if charge.dueDate}
										{dateFormat.format(new Date(charge.dueDate))}
									{:else}
										<span class="text-slate-500">Sin fecha</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									<span
										class="rounded-full border px-3 py-1 text-xs {getStatusColor(charge.status)}"
									>
										{getStatusLabel(charge.status)}
									</span>
								</td>
							</tr>
							{#if charge.scholarshipLost}
								<tr class="border-b border-slate-800/50 bg-red-950/10">
									<td colspan="8" class="px-4 py-2 text-xs text-red-400">
										⚠️ Beneficio de beca perdido por pago fuera del mes correspondiente
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{:else}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-2xl font-bold">Cargos recientes</h2>
			<p class="text-slate-400">No hay cargos registrados</p>
		</section>
	{/if}

	<!-- Pagos recientes -->
	{#if financial.payments.length > 0}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-2xl font-bold">Pagos realizados</h2>
			<div class="overflow-x-auto">
				<table class="w-full text-left">
					<thead class="border-b border-slate-800 bg-slate-900">
						<tr>
							<th class="px-4 py-3 text-sm font-semibold">Fecha</th>
							<th class="px-4 py-3 text-sm font-semibold">Monto</th>
							<th class="px-4 py-3 text-sm font-semibold">Método</th>
							<th class="px-4 py-3 text-sm font-semibold">Referencia</th>
							<th class="px-4 py-3 text-sm font-semibold">Recibo</th>
						</tr>
					</thead>
					<tbody>
						{#each financial.payments as payment}
							<tr class="border-b border-slate-800 last:border-none">
								<td class="px-4 py-3">{dateFormat.format(new Date(payment.paidAt))}</td>
								<td class="px-4 py-3 font-semibold text-emerald-400">
									{currency.format(Number(payment.amount))}
								</td>
								<td class="px-4 py-3">{getPaymentMethodLabel(payment.method)}</td>
								<td class="px-4 py-3">{payment.reference || '-'}</td>
								<td class="px-4 py-3">
									{#if payment.receipt}
										<span class="text-emerald-400">#{payment.receipt.receiptNumber}</span>
									{:else}
										<span class="text-slate-500">Pendiente</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{:else}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-2xl font-bold">Pagos realizados</h2>
			<p class="text-slate-400">No hay pagos registrados</p>
		</section>
	{/if}
</div>
