<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const receipt = $derived(data.receipt);

	function formatCurrency(amount: any): string {
		const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS'
		}).format(num);
	}

	function formatDate(date: string | Date): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('es-AR');
	}

	function formatDateTime(date: string | Date): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleString('es-AR');
	}

	function printReceipt() {
		window.print();
	}
</script>

<svelte:head>
	<title>Recibo #{receipt.receiptNumber}/{receipt.receiptYear}</title>
	<style>
		@media print {
			.no-print {
				display: none !important;
			}
			body {
				background: white !important;
			}
			.receipt-container {
				box-shadow: none !important;
				margin: 0 !important;
				padding: 20px !important;
			}
		}
	</style>
</svelte:head>

<div class="container mx-auto p-6">
	<div class="no-print mb-4 flex gap-2">
		<button
			onclick={printReceipt}
			class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
		>
			Imprimir Recibo
		</button>
		<a
			href="/finanzas/recibos"
			class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
		>
			Volver
		</a>
	</div>

	<div class="receipt-container bg-white rounded-lg shadow p-8 max-w-4xl mx-auto">
		<!-- Header -->
		<div class="border-b-2 border-gray-800 pb-4 mb-6">
			<h1 class="text-2xl font-bold text-center">RECIBO INSTITUCIONAL</h1>
			<p class="text-center text-gray-600 mt-2">Comprobante de Pago</p>
		</div>

		<!-- Receipt Info -->
		<div class="grid grid-cols-2 gap-4 mb-6">
			<div>
				<p class="text-sm text-gray-600">Número de Recibo</p>
				<p class="font-bold text-lg">#{receipt.receiptNumber}/{receipt.receiptYear}</p>
			</div>
			<div>
				<p class="text-sm text-gray-600">Fecha de Emisión</p>
				<p class="font-bold">{formatDate(receipt.issuedAt)}</p>
			</div>
		</div>

		<!-- Student Info -->
		<div class="bg-gray-50 rounded p-4 mb-6">
			<h2 class="font-bold text-lg mb-3">Datos del Alumno</h2>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<div>
					<span class="text-gray-600">Nombre:</span>
					<span class="ml-2 font-medium">{receipt.studentName}</span>
				</div>
				<div>
					<span class="text-gray-600">DNI:</span>
					<span class="ml-2 font-medium">{receipt.studentDni || 'N/A'}</span>
				</div>
				<div class="col-span-2">
					<span class="text-gray-600">Dirección:</span>
					<span class="ml-2 font-medium">{receipt.studentAddress || 'N/A'}</span>
				</div>
			</div>
		</div>

		<!-- Items Table -->
		<div class="mb-6">
			<h2 class="font-bold text-lg mb-3">Detalle de Conceptos</h2>
			<table class="w-full border-collapse">
				<thead>
					<tr class="bg-gray-100">
						<th class="border border-gray-300 px-3 py-2 text-left">Concepto</th>
						<th class="border border-gray-300 px-3 py-2 text-left">Período</th>
						<th class="border border-gray-300 px-3 py-2 text-right">Base</th>
						<th class="border border-gray-300 px-3 py-2 text-right">Recargo</th>
						<th class="border border-gray-300 px-3 py-2 text-right">Descuento</th>
						<th class="border border-gray-300 px-3 py-2 text-right">Final</th>
					</tr>
				</thead>
				<tbody>
					{#each receipt.items as item}
						<tr>
							<td class="border border-gray-300 px-3 py-2">{item.concept}</td>
							<td class="border border-gray-300 px-3 py-2">{item.periodLabel || '-'}</td>
							<td class="border border-gray-300 px-3 py-2 text-right">
								{formatCurrency(item.baseAmount)}
							</td>
							<td class="border border-gray-300 px-3 py-2 text-right">
								{formatCurrency(item.lateFeeAmount)}
							</td>
							<td class="border border-gray-300 px-3 py-2 text-right">
								{formatCurrency(item.discountAmount)}
							</td>
							<td class="border border-gray-300 px-3 py-2 text-right font-bold">
								{formatCurrency(item.finalAmount)}
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="bg-gray-100 font-bold">
						<td colspan="5" class="border border-gray-300 px-3 py-2 text-right">TOTAL:</td>
						<td class="border border-gray-300 px-3 py-2 text-right text-lg">
							{formatCurrency(receipt.totalAmount)}
						</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<!-- Payment Info -->
		<div class="bg-gray-50 rounded p-4 mb-6">
			<h2 class="font-bold text-lg mb-3">Información de Pago</h2>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<div>
					<span class="text-gray-600">Método de Pago:</span>
					<span class="ml-2 font-medium">{receipt.paymentMethod}</span>
				</div>
				{#if receipt.paymentReference}
					<div>
						<span class="text-gray-600">Referencia:</span>
						<span class="ml-2 font-medium">{receipt.paymentReference}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Observations -->
		{#if receipt.observations}
			<div class="mb-6">
				<h2 class="font-bold text-lg mb-2">Observaciones</h2>
				<p class="text-sm text-gray-700 bg-gray-50 p-3 rounded">{receipt.observations}</p>
			</div>
		{/if}

		<!-- Footer -->
		<div class="border-t-2 border-gray-800 pt-4 mt-6">
			<div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
				<div>
					<p>Emitido por: {receipt.issuedByName}</p>
					<p>Fecha: {formatDateTime(receipt.issuedAt)}</p>
				</div>
				<div>
					<p>Estado: {receipt.status}</p>
					{#if receipt.status === 'CANCELLED'}
						<p>Anulado el: {formatDate(receipt.cancelledAt!)}</p>
					{/if}
				</div>
			</div>
			<div class="mt-4 text-center text-xs text-gray-500">
				<p>Este documento es un comprobante válido de pago.</p>
				<p>Impresiones: {receipt.printCount + 1}</p>
			</div>
		</div>
	</div>
</div>
