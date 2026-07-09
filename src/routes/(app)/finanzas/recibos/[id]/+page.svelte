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
			class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
		>
			Imprimir Recibo
		</button>
		<a href="/finanzas/recibos" class="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
			Volver
		</a>
	</div>

	<div class="receipt-container mx-auto max-w-4xl rounded-lg bg-white p-8 shadow">
		<!-- Header -->
		<div class="mb-6 border-b-2 border-gray-800 pb-4">
			<h1 class="text-center text-2xl font-bold">RECIBO INSTITUCIONAL</h1>
			<p class="mt-2 text-center text-gray-600">Comprobante de Pago</p>
		</div>

		<!-- Receipt Info -->
		<div class="mb-6 grid grid-cols-2 gap-4">
			<div>
				<p class="text-sm text-gray-600">Número de Recibo</p>
				<p class="text-lg font-bold">#{receipt.receiptNumber}/{receipt.receiptYear}</p>
			</div>
			<div>
				<p class="text-sm text-gray-600">Fecha de Emisión</p>
				<p class="font-bold">{formatDate(receipt.issuedAt)}</p>
			</div>
		</div>

		<!-- Student Info -->
		<div class="mb-6 rounded bg-gray-50 p-4">
			<h2 class="mb-3 text-lg font-bold">Datos del Alumno</h2>
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
			<h2 class="mb-3 text-lg font-bold">Detalle de Conceptos</h2>
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
		<div class="mb-6 rounded bg-gray-50 p-4">
			<h2 class="mb-3 text-lg font-bold">Información de Pago</h2>
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
				<h2 class="mb-2 text-lg font-bold">Observaciones</h2>
				<p class="rounded bg-gray-50 p-3 text-sm text-gray-700">{receipt.observations}</p>
			</div>
		{/if}

		<!-- Footer -->
		<div class="mt-6 border-t-2 border-gray-800 pt-4">
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
