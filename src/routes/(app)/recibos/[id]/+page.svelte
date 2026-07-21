<script lang="ts">
	let { data } = $props();

	const receipt = $derived(data.receipt);
	const institutional = $derived(data.institutional);

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

	const paymentMethodNames: Record<string, string> = {
		CASH: 'EFECTIVO',
		BANK_TRANSFER: 'TRANSFERENCIA',
		DEBIT_CARD: 'TARJETA DÉBITO',
		CREDIT_CARD: 'TARJETA CRÉDITO',
		QR: 'QR',
		SCHOLARSHIP: 'Beca'
	};

	// Calcular totales
	const totals = $derived(() => {
		const totalBase = receipt.items.reduce((sum, item) => sum + item.baseAmount, 0);
		const totalLateFee = receipt.items.reduce((sum, item) => sum + item.lateFeeAmount, 0);
		const totalDiscount = receipt.items.reduce((sum, item) => sum + item.discountAmount, 0);
		const totalFinal = receipt.items.reduce((sum, item) => sum + item.finalAmount, 0);

		return {
			totalBase,
			totalLateFee,
			totalDiscount,
			totalFinal
		};
	});

	function printReceipt() {
		window.print();
	}
</script>

<svelte:head>
	<title>Recibo {receipt.receiptNumber}/{receipt.receiptYear} | ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Recibo de pago institucional" />
	<style>
		@media print {
			body {
				background: white !important;
			}
			.no-print {
				display: none !important;
			}
			.receipt-container {
				box-shadow: none !important;
				border: 1px solid #000 !important;
			}
		}
	</style>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4">
	<!-- Botones de acción (no imprimir) -->
	<div class="no-print flex items-center justify-end gap-3">
		<a
			href="/finanzas/pagos/nuevo"
			class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
		>
			Nuevo pago
		</a>
		<button
			onclick={printReceipt}
			class="cursor-pointer rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Imprimir recibo
		</button>
	</div>

	<!-- Recibo -->
	<div class="receipt-container rounded-3xl border border-slate-800 bg-white p-8 text-black">
		<!-- Encabezado institucional -->
		<div class="mb-8 border-b-2 border-black pb-6">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<h1 class="text-xl font-bold uppercase">{institutional.name}</h1>
					<p class="text-lg font-semibold">
						{institutional.code} - Cod. {institutional.codeNumber}
					</p>
					<p class="text-sm">Entidad Propietaria: {institutional.owner}</p>
					<p class="text-sm">{institutional.email}</p>
					<p class="text-sm">{institutional.address}</p>
				</div>
				<div class="text-right text-sm">
					<p class="font-semibold">{institutional.taxStatus}</p>
					<p>CUIT: {institutional.cuit}</p>
					<p>{institutional.grossIncome}</p>
					<p>{institutional.activityStart}</p>
				</div>
			</div>
		</div>

		<!-- Datos del comprobante -->
		<div class="mb-6 flex items-center justify-between border-b border-slate-300 pb-4">
			<div>
				<p class="text-sm font-semibold">Tipo de comprobante: Recibo</p>
				<p class="text-sm">Letra: C</p>
				<p class="text-sm">Número: {receipt.receiptNumber.toString().padStart(8, '0')}</p>
			</div>
			<div class="text-right">
				<p class="text-sm">Fecha: {dateFormat.format(new Date(receipt.issuedAt))}</p>
				<p class="text-sm">Emitido por: {receipt.issuedByName}</p>
				<p class="text-sm">Estado: {receipt.originalCopy ? 'Original' : 'Copia'}</p>
			</div>
		</div>

		<!-- Datos del alumno -->
		<div class="mb-6 border-b border-slate-300 pb-4">
			<h2 class="mb-3 text-lg font-bold">Recibí de:</h2>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<p class="font-semibold">Nombre:</p>
					<p>{receipt.studentName}</p>
				</div>
				<div>
					<p class="font-semibold">DNI:</p>
					<p>{receipt.studentDni || '-'}</p>
				</div>
				<div>
					<p class="font-semibold">Domicilio:</p>
					<p>{receipt.studentAddress || '-'}</p>
				</div>
				<div>
					<p class="font-semibold">Localidad:</p>
					<p>{receipt.student?.location?.name || '-'}</p>
				</div>
				<div>
					<p class="font-semibold">Carrera:</p>
					<p>{receipt.student?.career?.name || '-'}</p>
				</div>
				<div>
					<p class="font-semibold">Año:</p>
					<p>{receipt.student?.currentYear || '-'}</p>
				</div>
			</div>
		</div>

		<!-- Detalle de conceptos -->
		<div class="mb-6">
			<h2 class="mb-3 text-lg font-bold">Detalle de conceptos:</h2>
			<table class="w-full border-collapse border border-black text-sm">
				<thead>
					<tr class="border-b-2 border-black bg-slate-100">
						<th class="border border-black px-3 py-2 text-left font-semibold">En concepto de</th>
						<th class="border border-black px-3 py-2 text-right font-semibold">Valor</th>
						<th class="border border-black px-3 py-2 text-right font-semibold">Recargo</th>
						<th class="border border-black px-3 py-2 text-right font-semibold">Descuento/Beca</th>
						<th class="border border-black px-3 py-2 text-right font-semibold">A pagar</th>
					</tr>
				</thead>
				<tbody>
					{#each receipt.items as item}
						<tr class="border-b border-black">
							<td class="border border-black px-3 py-2">
								{item.concept}
								{#if item.periodLabel}
									<br />
									<span class="text-xs text-slate-600"
										>{item.periodLabel} - {receipt.studentDni || 'DNI'} -
										{receipt.student?.career?.name || 'Carrera'} / {receipt.student?.currentYear ||
											'Año'}</span
									>
								{/if}
								{#if item.charge && item.charge.scholarshipApplied === 0 && item.charge.amount > item.charge.finalAmount}
									<br />
									<span class="text-xs text-red-600"
										>Beneficio perdido por pago fuera de término</span
									>
								{/if}
							</td>
							<td class="border border-black px-3 py-2 text-right"
								>{currency.format(item.baseAmount)}</td
							>
							<td class="border border-black px-3 py-2 text-right">
								{item.lateFeeAmount > 0 ? currency.format(item.lateFeeAmount) : '-'}
							</td>
							<td class="border border-black px-3 py-2 text-right">
								{item.discountAmount > 0 ? currency.format(item.discountAmount) : '-'}
							</td>
							<td class="border border-black px-3 py-2 text-right font-semibold">
								{currency.format(item.finalAmount)}
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="border-t-2 border-black bg-slate-100 font-semibold">
						<td class="border border-black px-3 py-2 text-right" colspan="1">Totales:</td>
						<td class="border border-black px-3 py-2 text-right"
							>{currency.format(totals().totalBase)}</td
						>
						<td class="border border-black px-3 py-2 text-right">
							{totals().totalLateFee > 0 ? currency.format(totals().totalLateFee) : '-'}
						</td>
						<td class="border border-black px-3 py-2 text-right">
							{totals().totalDiscount > 0 ? currency.format(totals().totalDiscount) : '-'}
						</td>
						<td class="border border-black px-3 py-2 text-right"
							>{currency.format(totals().totalFinal)}</td
						>
					</tr>
				</tfoot>
			</table>
		</div>

		<!-- Totales y forma de pago -->
		<div class="mb-6 grid grid-cols-2 gap-6 border-b border-slate-300 pb-4">
			<div>
				<h2 class="mb-3 text-lg font-bold">Forma de pago:</h2>
				<div class="space-y-2 text-sm">
					<div>
						<p class="font-semibold">Método:</p>
						<p>{paymentMethodNames[receipt.paymentMethod] || receipt.paymentMethod}</p>
					</div>
					{#if receipt.paymentReference}
						<div>
							<p class="font-semibold">Referencia:</p>
							<p>{receipt.paymentReference}</p>
						</div>
					{/if}
					{#if receipt.observations}
						<div>
							<p class="font-semibold">Observaciones:</p>
							<p>{receipt.observations}</p>
						</div>
					{/if}
				</div>
			</div>
			<div class="text-right">
				<h2 class="mb-3 text-lg font-bold">Resumen:</h2>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<p>Importe abonado:</p>
						<p class="font-semibold">{currency.format(receipt.totalAmount)}</p>
					</div>
					{#if totals().totalFinal > receipt.totalAmount}
						<div class="flex justify-between text-red-600">
							<p>Saldo pendiente:</p>
							<p class="font-semibold">
								{currency.format(totals().totalFinal - receipt.totalAmount)}
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Pie del recibo -->
		<div class="mt-8 grid grid-cols-2 gap-8 pt-4">
			<div class="border-t-2 border-black pt-2 text-center">
				<p class="text-sm font-semibold">Firma Secretaría</p>
				<p class="text-xs">Aclaración: _______________________</p>
				<p class="text-xs">Sello: _______________________</p>
			</div>
			<div class="border-t-2 border-black pt-2 text-center">
				<p class="text-sm font-semibold">Firma Responsable</p>
				<p class="text-xs">Aclaración: _______________________</p>
			</div>
		</div>

		<div class="mt-6 text-center">
			<p class="text-sm font-bold">Original</p>
		</div>
	</div>
</div>
