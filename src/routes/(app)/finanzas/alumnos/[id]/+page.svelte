<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { report } = data;
</script>

<div class="p-6">
	<h1 class="text-2xl font-bold mb-6">Estado Financiero: {report.student.user.firstName} {report.student.user.lastName}</h1>

	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
		<div class="bg-white p-4 rounded-lg shadow">
			<h3 class="text-sm font-medium text-gray-500">Total Cuotas</h3>
			<p class="text-2xl font-bold">${report.totalCharges.toString()}</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<h3 class="text-sm font-medium text-gray-500">Total Pagado</h3>
			<p class="text-2xl font-bold text-green-600">${report.totalPaid.toString()}</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<h3 class="text-sm font-medium text-gray-500">Deuda Pendiente</h3>
			<p class="text-2xl font-bold text-orange-600">${report.totalPending.toString()}</p>
		</div>
		<div class="bg-white p-4 rounded-lg shadow">
			<h3 class="text-sm font-medium text-gray-500">Deuda Vencida</h3>
			<p class="text-2xl font-bold text-red-600">${report.overdueDebt.toString()}</p>
		</div>
	</div>

	{#if report.activeBlocks.length > 0}
		<div class="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
			<h3 class="text-lg font-semibold text-red-800 mb-2">Bloqueos Activos</h3>
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

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<div class="bg-white p-6 rounded-lg shadow">
			<h2 class="text-lg font-semibold mb-4">Cuotas</h2>
			<div class="overflow-x-auto">
				<table class="min-w-full">
					<thead>
						<tr class="border-b">
							<th class="text-left py-2">Concepto</th>
							<th class="text-left py-2">Período</th>
							<th class="text-right py-2">Monto</th>
							<th class="text-right py-2">Pagado</th>
							<th class="text-right py-2">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each report.charges as charge}
							<tr class="border-b">
								<td class="py-2">{charge.concept.name}</td>
								<td class="py-2">{charge.periodLabel}</td>
								<td class="text-right py-2">${charge.finalAmount.toString()}</td>
								<td class="text-right py-2">${charge.paidAmount.toString()}</td>
								<td class="text-right py-2">
									<span
										class="px-2 py-1 rounded text-xs {charge.status === 'PAID'
											? 'bg-green-100 text-green-800'
											: charge.status === 'PARTIAL'
												? 'bg-yellow-100 text-yellow-800'
												: 'bg-red-100 text-red-800'}"
									>
										{charge.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="bg-white p-6 rounded-lg shadow">
			<h2 class="text-lg font-semibold mb-4">Pagos Recientes</h2>
			<div class="overflow-x-auto">
				<table class="min-w-full">
					<thead>
						<tr class="border-b">
							<th class="text-left py-2">Fecha</th>
							<th class="text-left py-2">Método</th>
							<th class="text-right py-2">Monto</th>
							<th class="text-left py-2">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each report.payments.slice(0, 10) as payment}
							<tr class="border-b">
								<td class="py-2">{new Date(payment.paidAt).toLocaleDateString()}</td>
								<td class="py-2">{payment.method}</td>
								<td class="text-right py-2">${payment.amount.toString()}</td>
								<td class="py-2">
									{#if payment.isCancelled}
										<span class="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Anulado</span>
									{:else}
										<span class="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Activo</span>
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
