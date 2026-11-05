<script lang="ts">
	import { formatDni } from '$lib/utils/dni';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	const dateFormatter = new Intl.DateTimeFormat('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	const paymentMethodNames: Record<string, string> = {
		CASH: 'Efectivo',
		BANK_TRANSFER: 'Transferencia',
		DEBIT_CARD: 'Tarjeta de débito',
		CREDIT_CARD: 'Tarjeta de crédito',
		QR: 'QR',
		SCHOLARSHIP: 'Beca'
	};

	function formatReceiptNumber(pointOfSale: string | null, receiptNumber: number): string {
		return `${pointOfSale || '0001'}-${String(receiptNumber).padStart(8, '0')}`;
	}

	function formatPaymentMethod(value: string): string {
		return paymentMethodNames[value] ?? value;
	}

	function formatDate(value: string): string {
		return dateFormatter.format(new Date(value));
	}
</script>

<svelte:head>
	<title>Recibos emitidos | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Listado cronológico de recibos institucionales emitidos" />
</svelte:head>

<div class="space-y-8">
	<section
		class="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Área financiera</p>

			<h1 class="mt-2 text-4xl font-bold tracking-tight">Recibos emitidos</h1>

			<p class="mt-3 text-sm text-slate-400">
				Historial de comprobantes ordenado desde el más reciente.
			</p>
		</div>

		<div class="flex flex-wrap gap-3">
			<a
				href="/finanzas"
				class="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
			>
				← Volver a Finanzas
			</a>

			<a
				href="/finanzas/pagos/nuevo"
				class="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				+ Registrar pago
			</a>
		</div>
	</section>

	<section class="grid gap-4 sm:grid-cols-2">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total de recibos</p>
			<p class="mt-3 text-4xl font-bold text-white">
				{data.receipts.length}
			</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Último comprobante</p>

			{#if data.receipts[0]}
				<p class="mt-3 text-xl font-bold text-white">
					{formatDate(data.receipts[0].issuedAt)}
				</p>
			{:else}
				<p class="mt-3 text-xl font-bold text-slate-500">—</p>
			{/if}
		</div>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<div class="border-b border-slate-800 px-5 py-4">
			<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Historial</p>

			<h2 class="mt-1 text-xl font-bold text-white">Comprobantes generados</h2>
		</div>

		{#if data.receipts.length === 0}
			<div class="px-6 py-14 text-center">
				<p class="font-semibold text-slate-300">No hay recibos emitidos.</p>

				<p class="mt-2 text-sm text-slate-500">
					Los nuevos comprobantes aparecerán aquí automáticamente.
				</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[1050px] text-left text-sm">
					<thead class="border-b border-slate-800 bg-slate-950/60">
						<tr>
							<th class="px-4 py-3 font-semibold text-slate-300"> Fecha </th>

							<th class="px-4 py-3 font-semibold text-slate-300"> Recibo </th>

							<th class="px-4 py-3 font-semibold text-slate-300"> Alumno </th>

							<th class="px-4 py-3 font-semibold text-slate-300"> DNI </th>

							<th class="px-4 py-3 font-semibold text-slate-300"> Sede </th>

							<th class="px-4 py-3 text-right font-semibold text-slate-300"> Importe </th>

							<th class="px-4 py-3 font-semibold text-slate-300"> Medio </th>

							<th class="px-4 py-3 font-semibold text-slate-300"> Estado </th>

							<th class="px-4 py-3 font-semibold text-slate-300"> Acciones </th>
						</tr>
					</thead>

					<tbody>
						{#each data.receipts as receipt (receipt.id)}
							<tr
								class="border-b border-slate-800 transition last:border-none hover:bg-slate-800/35"
							>
								<td class="px-4 py-3 whitespace-nowrap text-slate-300">
									{formatDate(receipt.issuedAt)}
								</td>

								<td class="px-4 py-3 font-mono font-semibold text-white">
									{formatReceiptNumber(receipt.pointOfSale, receipt.receiptNumber)}
								</td>

								<td class="px-4 py-3">
									<a
										href={`/alumnos/${receipt.studentId}/finanzas`}
										class="font-semibold text-slate-200 transition hover:text-indigo-300"
									>
										{receipt.studentName}
									</a>
								</td>

								<td class="px-4 py-3 text-slate-400">
									{receipt.studentDni ? formatDni(receipt.studentDni) : '—'}
								</td>

								<td class="px-4 py-3 text-slate-400">
									{receipt.locationName || '—'}
								</td>

								<td class="px-4 py-3 text-right font-semibold text-white">
									{currency.format(receipt.totalAmount)}
								</td>

								<td class="px-4 py-3 text-slate-400">
									{formatPaymentMethod(receipt.paymentMethod)}
								</td>

								<td class="px-4 py-3">
									{#if receipt.status === 'CANCELLED'}
										<span
											class="inline-flex rounded-full border border-red-700 bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-300"
										>
											Anulado
										</span>
									{:else}
										<span
											class="inline-flex rounded-full border border-emerald-700 bg-white px-2 py-1 text-xs font-semibold text-emerald-800"
										>
											Emitido
										</span>
									{/if}
								</td>

								<td class="px-4 py-3">
									<a
										href={`/recibos/${receipt.id}`}
										class="inline-flex rounded-lg border border-indigo-700 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:border-indigo-500 hover:bg-indigo-950/40 hover:text-white"
									>
										Ver recibo
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
