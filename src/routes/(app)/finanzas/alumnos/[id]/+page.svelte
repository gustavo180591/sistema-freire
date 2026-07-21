<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { report } = data;

	const statusTranslations: Record<string, string> = {
		PENDING: 'Pendiente',
		PAID: 'Pagado',
		OVERDUE: 'Vencido',
		CANCELLED: 'Cancelado',
		PARTIAL: 'Parcial',
		PARTIALLY_PAID: 'Parcialmente pagado'
	};

	const translateStatus = (status: string) => statusTranslations[status] || status;
</script>

<div class="p-6">
	<h1 class="mb-6 text-2xl font-bold">
		Estado Financiero: {report.student.user.firstName}
		{report.student.user.lastName}
	</h1>

	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
		<div class="rounded-lg bg-white p-4 shadow">
			<h3 class="text-sm font-medium text-gray-500">Total Cuotas</h3>
			<p class="text-2xl font-bold">${report.totalCharges.toString()}</p>
		</div>
		<div class="rounded-lg bg-white p-4 shadow">
			<h3 class="text-sm font-medium text-gray-500">Total Pagado</h3>
			<p class="text-2xl font-bold text-green-600">${report.totalPaid.toString()}</p>
		</div>
		<div class="rounded-lg bg-white p-4 shadow">
			<h3 class="text-sm font-medium text-gray-500">Deuda Pendiente</h3>
			<p class="text-2xl font-bold text-orange-600">${report.totalPending.toString()}</p>
		</div>
		<div class="rounded-lg bg-white p-4 shadow">
			<h3 class="text-sm font-medium text-gray-500">Deuda Vencida</h3>
			<p class="text-2xl font-bold text-red-600">${report.overdueDebt.toString()}</p>
		</div>
	</div>

	{#if report.activeBlocks.length > 0}
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
			<h3 class="mb-2 text-lg font-semibold text-red-800">Bloqueos Activos</h3>
			{#each report.activeBlocks as block}
				<div class="text-sm text-red-700">
					<strong>{block.blockType}</strong>: {block.blockReason}
					{#if block.exceptionGranted}
						<span class="ml-2 text-green-700">(Excepción otorgada)</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<div class="rounded-lg bg-white p-6 shadow">
			<h2 class="mb-4 text-lg font-semibold">Cuotas</h2>
			<div class="overflow-x-auto">
				<table class="min-w-full">
					<thead>
						<tr class="border-b">
							<th class="py-2 text-left">Concepto</th>
							<th class="py-2 text-left">Período</th>
							<th class="py-2 text-right">Monto</th>
							<th class="py-2 text-right">Pagado</th>
							<th class="py-2 text-right">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each report.charges as charge}
							<tr class="border-b">
								<td class="py-2">{charge.concept.name}</td>
								<td class="py-2">{charge.periodLabel}</td>
								<td class="py-2 text-right">${charge.finalAmount.toString()}</td>
								<td class="py-2 text-right">${charge.paidAmount.toString()}</td>
								<td class="py-2 text-right">
									<span
										class="rounded px-2 py-1 text-xs {charge.status === 'PAID'
											? 'bg-green-100 text-green-800'
											: charge.status === 'PARTIAL'
												? 'bg-yellow-100 text-yellow-800'
												: 'bg-red-100 text-red-800'}"
									>
										{translateStatus(charge.status)}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="rounded-lg bg-white p-6 shadow">
			<h2 class="mb-4 text-lg font-semibold">Pagos Recientes</h2>
			<div class="overflow-x-auto">
				<table class="min-w-full">
					<thead>
						<tr class="border-b">
							<th class="py-2 text-left">Fecha</th>
							<th class="py-2 text-left">Método</th>
							<th class="py-2 text-right">Monto</th>
							<th class="py-2 text-left">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each report.payments.slice(0, 10) as payment}
							<tr class="border-b">
								<td class="py-2">{new Date(payment.paidAt).toLocaleDateString()}</td>
								<td class="py-2">{payment.method}</td>
								<td class="py-2 text-right">${payment.amount.toString()}</td>
								<td class="py-2">
									{#if payment.isCancelled}
										<span class="rounded bg-red-100 px-2 py-1 text-xs text-red-800">Anulado</span>
									{:else}
										<span class="rounded bg-green-100 px-2 py-1 text-xs text-green-800">Activo</span
										>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
