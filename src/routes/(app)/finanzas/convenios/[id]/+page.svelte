<script lang="ts">
	import { resolve } from '$app/paths';

	interface PaymentAgreement {
		id: string;
		agreementNumber: number;
		agreementYear: number;
		studentName: string;
		originalDebt: { toString: () => string };
		agreedAmount: { toString: () => string };
		paidAmount: { toString: () => string };
		pendingAmount: { toString: () => string };
		status: string;
		reason: string;
		observations?: string;
		createdAt: Date;
		installments: PaymentAgreementInstallment[];
	}

	interface PaymentAgreementInstallment {
		id: string;
		installmentNumber: number;
		dueDate: Date;
		amount: { toString: () => string };
		paidAmount: { toString: () => string };
		pendingAmount: { toString: () => string };
		status: string;
	}

	interface AgreementSummary {
		totalInstallments: number;
		pendingInstallments: number;
		overdueInstallments: number;
		originalDebtIncluded: { toString: () => string };
	}

	interface PaymentWithReceipt {
		id: string;
		paidAt: Date;
		amount: { toString: () => string };
		method: string;
		reference: string | null;
		receipt: {
			id: string;
			receiptNumber: number;
			receiptYear: number;
			issuedAt: Date;
			totalAmount: { toString: () => string };
		} | null;
		installment: PaymentAgreementInstallment | null;
	}

	interface PageData {
		agreement: PaymentAgreement;
		summary?: AgreementSummary;
		paymentsWithReceipts?: PaymentWithReceipt[];
	}

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title
		>Convenio {data.agreement.agreementNumber}/{data.agreement.agreementYear} | ISFD "PAULO FREIRE" 1117</title
	>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-white">
				Convenio {data.agreement.agreementNumber}/{data.agreement.agreementYear}
			</h1>
			<p class="text-slate-400">{data.agreement.studentName}</p>
		</div>
		<a
			href={resolve('/finanzas/convenios')}
			class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
		>
			Volver
		</a>
	</div>

	<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
		<h2 class="mb-4 text-lg font-semibold text-white">Información del Convenio</h2>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<p class="text-sm text-slate-400">Estado</p>
				<p class="text-white">{data.agreement.status}</p>
			</div>
			<div>
				<p class="text-sm text-slate-400">Fecha de Creación</p>
				<p class="text-white">{new Date(data.agreement.createdAt).toLocaleDateString('es-AR')}</p>
			</div>
			<div>
				<p class="text-sm text-slate-400">Monto Original</p>
				<p class="text-white">${data.agreement.originalDebt.toString()}</p>
			</div>
			<div>
				<p class="text-sm text-slate-400">Monto Acordado</p>
				<p class="text-white">${data.agreement.agreedAmount.toString()}</p>
			</div>
			<div>
				<p class="text-sm text-slate-400">Pagado</p>
				<p class="text-white">${data.agreement.paidAmount.toString()}</p>
			</div>
			<div>
				<p class="text-sm text-slate-400">Pendiente</p>
				<p class="text-white">${data.agreement.pendingAmount.toString()}</p>
			</div>
		</div>
		<div class="mt-4">
			<p class="text-sm text-slate-400">Motivo</p>
			<p class="text-white">{data.agreement.reason}</p>
		</div>
		{#if data.agreement.observations}
			<div class="mt-4">
				<p class="text-sm text-slate-400">Observaciones</p>
				<p class="text-white">{data.agreement.observations}</p>
			</div>
		{/if}
	</div>

	{#if data.summary}
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
			<h2 class="mb-4 text-lg font-semibold text-white">Resumen</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="text-sm text-slate-400">Total de Cuotas</p>
					<p class="text-white">{data.summary.totalInstallments}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Cuotas Pendientes</p>
					<p class="text-white">{data.summary.pendingInstallments}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Cuotas Vencidas</p>
					<p class="text-white">{data.summary.overdueInstallments}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Deuda Original Incluida</p>
					<p class="text-white">${data.summary.originalDebtIncluded.toString()}</p>
				</div>
			</div>
		</div>
	{/if}

	<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
		<h2 class="mb-4 text-lg font-semibold text-white">Cuotas</h2>
		<div class="space-y-2">
			{#each data.agreement.installments as installment (installment.id)}
				<div class="flex justify-between rounded-lg border border-slate-700 bg-slate-900 p-3">
					<div>
						<p class="text-sm font-medium text-white">Cuota {installment.installmentNumber}</p>
						<p class="text-xs text-slate-400">
							Vencimiento: {new Date(installment.dueDate).toLocaleDateString('es-AR')}
						</p>
						<p class="text-xs text-slate-400">
							Pagado: ${installment.paidAmount.toString()} / Pendiente: ${installment.pendingAmount.toString()}
						</p>
					</div>
					<div class="text-right">
						<p class="text-sm font-medium text-white">${installment.amount.toString()}</p>
						<p class="text-xs text-slate-400">{installment.status}</p>
						{#if data.agreement.status === 'ACTIVE' && installment.status !== 'PAID' && installment.status !== 'CANCELLED' && installment.status !== 'WAIVED'}
							<form method="POST" action="?/registerPayment" class="mt-2">
								<input type="hidden" name="installmentId" value={installment.id} />
								<input
									type="number"
									name="amount"
									placeholder="Monto"
									step="0.01"
									min="0.01"
									max={installment.pendingAmount.toString()}
									class="mb-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
								/>
								<select
									name="method"
									class="mb-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
								>
									<option value="CASH">Efectivo</option>
									<option value="BANK_TRANSFER">Transferencia</option>
									<option value="DEBIT_CARD">Tarjeta Débito</option>
									<option value="CREDIT_CARD">Tarjeta Crédito</option>
									<option value="QR">QR</option>
								</select>
								<button
									type="submit"
									class="w-full rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-indigo-700"
								>
									Pagar
								</button>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	{#if data.paymentsWithReceipts && data.paymentsWithReceipts.length > 0}
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
			<h2 class="mb-4 text-lg font-semibold text-white">Pagos y Recibos</h2>
			<div class="space-y-2">
				{#each data.paymentsWithReceipts as payment (payment.id)}
					<div class="flex justify-between rounded-lg border border-slate-700 bg-slate-900 p-3">
						<div>
							<p class="text-sm font-medium text-white">
								Cuota {payment.installment?.installmentNumber || '?'} - ${payment.amount.toString()}
							</p>
							<p class="text-xs text-slate-400">
								Fecha: {new Date(payment.paidAt).toLocaleDateString('es-AR')}
							</p>
							<p class="text-xs text-slate-400">
								Método: {payment.method} {payment.reference ? `(${payment.reference})` : ''}
							</p>
						</div>
						<div class="text-right">
							{#if payment.receipt}
								<p class="text-sm font-medium text-indigo-400">
									Recibo #{payment.receipt.receiptNumber}/{payment.receipt.receiptYear}
								</p>
								<p class="text-xs text-slate-400">
									{new Date(payment.receipt.issuedAt).toLocaleDateString('es-AR')}
								</p>
								<a
									href={`/recibos/${payment.receipt.id}`}
									class="mt-1 inline-block rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-indigo-700"
									target="_blank"
									rel="noopener noreferrer"
								>
									Ver Recibo
								</a>
							{:else}
								<p class="text-sm font-medium text-slate-500">Sin recibo</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if data.agreement.status === 'DRAFT'}
		<form method="POST" action="?/activate">
			<button
				type="submit"
				class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
			>
				Activar Convenio
			</button>
		</form>
	{/if}
</div>
