<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const receipt = $derived(data.receipt);
	const institutional = $derived(data.institutional);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
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
		SCHOLARSHIP: 'BECA'
	};

	const totals = $derived.by(() => ({
		base: receipt.items.reduce((sum, item) => sum + item.baseAmount, 0),
		lateFee: receipt.items.reduce((sum, item) => sum + item.lateFeeAmount, 0),
		discount: receipt.items.reduce((sum, item) => sum + item.discountAmount, 0),
		final: receipt.items.reduce((sum, item) => sum + item.finalAmount, 0)
	}));

	const blankRowCount = $derived(Math.max(0, 4 - receipt.items.length));
	const compactTable = $derived(receipt.items.length > 4);

	function padReceiptNumber(number: number) {
		return number.toString().padStart(8, '0');
	}

	function formatActivityDate(value: Date | string | null | undefined) {
		if (!value) return '-';

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return '-';
		}

		return dateFormat.format(date);
	}

	function printReceipt() {
		window.print();
	}
</script>

<svelte:head>
	<title>
		Recibo {institutional.pointOfSale}-{padReceiptNumber(receipt.receiptNumber)}
	</title>

	<meta
		name="description"
		content="Recibo de pago del Instituto Superior de Formación Docente Paulo Freire"
	/>
</svelte:head>

<div class="receipt-screen-wrapper mx-auto max-w-5xl space-y-5 p-4">
	<div class="no-print flex flex-wrap items-center justify-end gap-3">
		<a
			href="/configuracion/recibo"
			class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-indigo-500"
		>
			Configurar recibo
		</a>

		<a
			href="/finanzas/pagos/nuevo"
			class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
		>
			Nuevo pago
		</a>

		<button
			type="button"
			onclick={printReceipt}
			class="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Imprimir / Guardar PDF
		</button>
	</div>

	<div class="receipt-print-root">
		<div class="receipt-paper">
			<!-- ===================================================
			     ENCABEZADO
			     =================================================== -->
			<section class="receipt-header-section">
				<!-- LETRA: PARTE SUPERIOR CENTRAL -->
				<div class="receipt-letter-box">
					{institutional.receiptLetter || 'C'}
				</div>

				<!-- INSTITUCIÓN -->
				<div class="receipt-brand-section">
					<div class="grid w-full grid-cols-[29mm_1fr] items-center gap-3">
						<div class="flex items-center justify-center">
							<img
								src="/uploads/logo-recibo-freire.png"
								alt="Logo Instituto Paulo Freire"
								class="receipt-logo"
							/>
						</div>

						<div class="text-center leading-tight">
							<p class="text-[12px] font-semibold">
								{institutional.name}
							</p>

							<p class="mt-1 text-[17px] font-bold">
								"{institutional.code}" - Cod. {institutional.codeNumber}
							</p>

							{#if institutional.owner}
								<p class="mt-2 text-[12px] font-semibold">
									Entidad Propietaria: {institutional.owner}
								</p>
							{/if}

							{#if institutional.email}
								<p class="mt-2 text-[10px]">
									Correo Electrónico: {institutional.email}
								</p>
							{/if}

							{#if institutional.address}
								<p class="mt-1 text-[10px]">
									{institutional.address}
								</p>
							{/if}

							{#if institutional.phone}
								<p class="mt-1 text-[9px]">
									Tel.: {institutional.phone}
								</p>
							{/if}

							{#if institutional.website}
								<p class="mt-1 text-[8px]">
									{institutional.website}
								</p>
							{/if}

							{#if institutional.receiptHeader}
								<p class="mt-1 text-[8px] whitespace-pre-line">
									{institutional.receiptHeader}
								</p>
							{/if}

							<p class="mt-3 text-[15px] font-bold uppercase">
								{institutional.taxStatus || 'IVA EXENTO'}
							</p>
						</div>
					</div>
				</div>

				<!-- DATOS COMPROBANTE -->
				<div class="receipt-fiscal-section">
					<div class="pl-3">
						<p class="text-[20px] font-bold">RECIBO</p>

						<p class="mt-2 font-mono text-[15px] font-bold whitespace-nowrap">
							Nº {institutional.pointOfSale || '0001'} -
							{padReceiptNumber(receipt.receiptNumber)}
						</p>
					</div>

					<div class="mt-6 space-y-[3mm] text-[10px]">
						<div class="grid grid-cols-[32mm_1fr] items-end">
							<span class="text-[14px] font-bold"> FECHA: </span>

							<span class="border-b border-black pb-1 text-center">
								{dateFormat.format(new Date(receipt.issuedAt))}
							</span>
						</div>

						<div class="grid grid-cols-[32mm_1fr] gap-2">
							<span>CUIT:</span>
							<span>{institutional.cuit || '-'}</span>
						</div>

						<div class="grid grid-cols-[32mm_1fr] gap-2">
							<span>Ing. Brutos Nº:</span>
							<span>{institutional.grossIncome || '-'}</span>
						</div>

						<div class="grid grid-cols-[32mm_1fr] gap-2">
							<span>Inicio de Actividades:</span>
							<span>
								{formatActivityDate(institutional.activityStart)}
							</span>
						</div>
					</div>
				</div>
			</section>

			<!-- ===================================================
			     ALUMNO
			     =================================================== -->
			<section class="receipt-student-section">
				<div class="student-info-grid text-[11px]">
					<div class="student-field">
						<span class="student-field-label">Recibí de:</span>
						<span class="student-field-value">
							{receipt.studentName}
						</span>
					</div>

					<div class="student-field">
						<span class="student-field-label">DNI:</span>
						<span class="student-field-value">
							{receipt.studentDni || '-'}
						</span>
					</div>

					<div class="student-field">
						<span class="student-field-label">Domicilio:</span>
						<span class="student-field-value">
							{receipt.studentAddress || '-'}
						</span>
					</div>

					<div class="student-field">
						<span class="student-field-label">Localidad:</span>
						<span class="student-field-value">
							{receipt.student?.locality || '-'}
						</span>
					</div>
				</div>

				<div class="student-iva-line">
					<span class="text-[11px] tracking-wide whitespace-nowrap">
						I. V. A. Consumidor Final
					</span>
				</div>
			</section>

			<!-- ===================================================
			     TABLA
			     =================================================== -->
			<section class="receipt-detail-section">
				<table class:compact={compactTable} class="receipt-detail-table">
					<thead>
						<tr>
							<th class="w-[50%] px-3 text-left font-bold"> En Concepto de </th>

							<th class="w-[13%] px-2 text-right font-bold"> Valor </th>

							<th class="w-[10%] px-2 text-right font-bold"> Rec. </th>

							<th class="w-[13%] px-2 text-right font-bold"> Desc. </th>

							<th class="w-[14%] px-2 text-right font-bold"> a Pagar </th>
						</tr>
					</thead>

					<tbody>
						{#each receipt.items as item}
							<tr class="align-top">
								<td class="px-3 py-2">
									<p class="font-medium">
										{item.concept}
									</p>

									<p class="item-description mt-1 text-[8px]">
										{item.periodLabel || ''}

										{#if receipt.studentDni}
											- {receipt.studentDni}
										{/if}

										{#if receipt.student?.currentYear}
											- {receipt.student.currentYear}° Año
										{/if}

										{#if receipt.student?.career?.name}
											- {receipt.student.career.name}
										{/if}
									</p>
								</td>

								<td class="px-2 py-2 text-right">
									{currency.format(item.baseAmount)}
								</td>

								<td class="px-2 py-2 text-right">
									{item.lateFeeAmount > 0 ? currency.format(item.lateFeeAmount) : '-'}
								</td>

								<td class="px-2 py-2 text-right">
									{item.discountAmount > 0 ? currency.format(item.discountAmount) : '-'}
								</td>

								<td class="px-2 py-2 text-right font-semibold">
									{currency.format(item.finalAmount)}
								</td>
							</tr>
						{/each}

						{#each Array.from({ length: blankRowCount }) as _}
							<tr>
								<td></td>
								<td></td>
								<td></td>
								<td></td>
								<td></td>
							</tr>
						{/each}
					</tbody>

					<tfoot>
						<tr class="font-bold">
							<td class="px-3 text-right"> Totales </td>

							<td class="px-2 text-right">
								{currency.format(totals.base)}
							</td>

							<td class="px-2 text-right">
								{totals.lateFee > 0 ? currency.format(totals.lateFee) : '-'}
							</td>

							<td class="px-2 text-right">
								{totals.discount > 0 ? currency.format(totals.discount) : '-'}
							</td>

							<td class="px-2 text-right">
								{currency.format(totals.final)}
							</td>
						</tr>
					</tfoot>
				</table>
			</section>

			<!-- ===================================================
			     FORMA DE PAGO
			     =================================================== -->
			<section class="receipt-payment-section">
				<div class="flex items-center justify-between gap-6">
					<p class="text-[13px]">
						FORMA DE PAGO:
						<strong>
							{paymentMethodNames[receipt.paymentMethod] || receipt.paymentMethod}
						</strong>
					</p>

					<p class="text-[11px] whitespace-nowrap">
						Importe abonado:
						<strong class="ml-2 text-[13px]">
							{currency.format(receipt.totalAmount)}
						</strong>
					</p>
				</div>

				{#if receipt.paymentReference}
					<p class="mt-2 text-[10px]">
						<strong>Referencia:</strong>
						{receipt.paymentReference}
					</p>
				{/if}

				<div class="mt-4">
					<p class="text-[11px] font-semibold">Observaciones:</p>

					{#if receipt.observations}
						<p class="mt-1 text-[10px] whitespace-pre-line">
							{receipt.observations}
						</p>
					{/if}

					<div class="mt-3 border-b border-black"></div>
					<div class="mt-4 border-b border-black"></div>
				</div>
			</section>

			<!-- ===================================================
			     FIRMAS
			     =================================================== -->
			<section class="receipt-signature-section">
				<div class="grid grid-cols-2 gap-[22mm] px-3 pt-4">
					<div class="text-center">
						<div class="border-t border-black pt-2">
							<p class="text-[12px] font-semibold">
								{institutional.signatureLeftLabel}
							</p>

							<p class="mt-4 text-[9px]">Aclaración: ________________________</p>

							<p class="mt-2 text-[9px]">Sello: ________________________</p>
						</div>
					</div>

					<div class="text-center">
						<div class="border-t border-black pt-2">
							<p class="text-[12px] font-semibold">
								{institutional.signatureRightLabel}
							</p>

							<p class="mt-4 text-[9px]">Aclaración: ________________________</p>
						</div>
					</div>
				</div>

				<div>
					{#if institutional.receiptFooter}
						<p class="mb-3 text-center text-[8px] whitespace-pre-line">
							{institutional.receiptFooter}
						</p>
					{/if}

					<p class="text-center text-[11px] font-bold">
						{receipt.originalCopy ? 'Original' : 'Copia'}
					</p>
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	/*
	 * ==========================================================
	 * RECIBO EN PANTALLA
	 * ==========================================================
	 */

	.receipt-screen-wrapper {
		width: 100%;
	}

	.receipt-print-root {
		width: 100%;
	}

	.receipt-paper {
		box-sizing: border-box;
		width: 196mm;
		min-height: 283mm;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		background: white;
		border: 0.35mm solid #000;
		color: #000;
		font-family: Arial, Helvetica, sans-serif;
		overflow: hidden;
	}

	.receipt-header-section {
		position: relative;
		display: grid;
		grid-template-columns: 50% 50%;
		flex: 0 0 62mm;
		border-bottom: 0.35mm solid #000;
	}

	.receipt-brand-section {
		display: flex;
		align-items: center;
		padding: 4mm 12mm 4mm 5mm;
	}

	.receipt-fiscal-section {
		border-left: 0.35mm solid #000;
		padding: 4mm 5mm 3mm 13mm;
	}

	/*
	 * La letra queda montada exactamente sobre la división
	 * de las dos partes superiores.
	 */
	.receipt-letter-box {
		position: absolute;
		z-index: 5;
		top: 4mm;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		width: 14mm;
		height: 17mm;
		align-items: center;
		justify-content: center;
		border: 0.45mm solid #000;
		background: #fff;
		font-size: 10mm;
		font-weight: 700;
		line-height: 1;
	}

	.receipt-logo {
		display: block;
		width: 27mm;
		height: 35mm;
		object-fit: contain;
	}

	.student-info-grid {
		display: grid;
		grid-template-columns: 58% 42%;
		column-gap: 8mm;
		row-gap: 4.5mm;
		align-items: end;
	}

	.student-field {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		align-items: end;
		gap: 2mm;
		min-width: 0;
	}

	.student-field-label {
		font-weight: 600;
		white-space: nowrap;
	}

	.student-field-value {
		min-width: 0;
		min-height: 4mm;
		overflow: hidden;
		border-bottom: 0.25mm solid #000;
		padding: 0 1mm 0.7mm;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.student-iva-line {
		margin-top: 4.5mm;
		display: flex;
		align-items: center;
		gap: 2mm;
	}

	.student-iva-line::before,
	.student-iva-line::after {
		height: 0.25mm;
		flex: 1;
		background: #000;
		content: '';
	}

	.receipt-student-section {
		flex: 0 0 30mm;
		border-bottom: 0.35mm solid #000;
		padding: 4.5mm 4mm 0;
	}

	.receipt-detail-section {
		flex: 0 0 82mm;
		min-height: 0;
	}

	.receipt-detail-table {
		width: 100%;
		height: 100%;
		table-layout: fixed;
		border-collapse: collapse;
		font-size: 10px;
	}

	.receipt-detail-table th,
	.receipt-detail-table td {
		border-right: 0.3mm solid #000;
	}

	.receipt-detail-table th:last-child,
	.receipt-detail-table td:last-child {
		border-right: 0;
	}

	.receipt-detail-table thead tr {
		height: 9mm;
		border-bottom: 0.35mm solid #000;
	}

	.receipt-detail-table tbody tr {
		height: 13mm;
		border-bottom: 0.3mm solid #000;
	}

	.receipt-detail-table.compact tbody tr {
		height: 7mm;
	}

	.receipt-detail-table tfoot tr {
		height: 8mm;
	}

	.item-description {
		overflow: hidden;
		line-height: 1.25;
	}

	.receipt-detail-table.compact .item-description {
		display: -webkit-box;
		max-height: 2.5em;
		font-size: 7px;
		line-height: 1.2;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.receipt-payment-section {
		flex: 0 0 38mm;
		border-top: 0.35mm solid #000;
		padding: 5mm 4mm;
	}

	.receipt-signature-section {
		display: flex;
		min-height: 0;
		flex: 1 1 auto;
		flex-direction: column;
		justify-content: space-between;
		padding: 8mm 9mm 5mm;
	}

	/*
	 * ==========================================================
	 * IMPRESIÓN / GUARDAR COMO PDF
	 * ==========================================================
	 */

	@page {
		size: A4 portrait;
		margin: 0;
	}

	@media print {
		:global(html),
		:global(body) {
			width: 210mm !important;
			height: 297mm !important;
			margin: 0 !important;
			padding: 0 !important;
			overflow: hidden !important;
			background: #fff !important;
		}

		/*
		 * Oculta completamente la interfaz general del sistema.
		 * A diferencia de visibility:hidden, display:none elimina
		 * también el espacio que ocupaba el header/layout.
		 */
		:global(body header),
		:global(body nav),
		:global(body aside),
		.no-print {
			display: none !important;
		}

		:global(main) {
			width: 100% !important;
			max-width: none !important;
			margin: 0 !important;
			padding: 0 !important;
		}

		.receipt-screen-wrapper {
			width: 210mm !important;
			height: 297mm !important;
			margin: 0 !important;
			padding: 0 !important;
		}

		/*
		 * Esta es la clave:
		 * el recibo se separa completamente del layout de la app
		 * y se coloca encima de toda la página.
		 */
		.receipt-print-root {
			position: fixed !important;
			z-index: 2147483647 !important;
			inset: 0 !important;

			display: flex !important;
			width: 210mm !important;
			height: 297mm !important;

			align-items: center !important;
			justify-content: center !important;

			box-sizing: border-box !important;
			margin: 0 !important;
			padding: 7mm !important;

			overflow: hidden !important;
			background: #fff !important;
		}

		.receipt-paper {
			width: 196mm !important;
			height: 283mm !important;
			min-height: 283mm !important;
			max-height: 283mm !important;

			margin: 0 !important;

			border: 0.35mm solid #000 !important;

			overflow: hidden !important;

			box-shadow: none !important;

			break-inside: avoid !important;
			page-break-inside: avoid !important;

			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}
	}
</style>
