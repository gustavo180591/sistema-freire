<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	interface PaymentAgreement {
		id: string;
		agreementNumber: number;
		agreementYear: number;
		studentName: string;
		studentId: string;
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

	interface ActiveException {
		blockId: string;
		studentId: string;
		exceptionGranted: boolean;
		exceptionBy: string;
		exceptionAt: Date;
		exceptionReason: string;
		exceptionSource: string;
		exceptionAgreementId: string;
		agreementNumber: number;
		agreementYear: number;
	}

	interface AgreementEvent {
		id: string;
		eventType: string;
		description: string;
		previousStatus: string | null;
		newStatus: string | null;
		metadata: unknown;
		reason: string | null;
		createdAt: Date;
		userId: string;
		userName: string;
	}

	interface PageData {
		agreement: PaymentAgreement;
		summary?: AgreementSummary;
		paymentsWithReceipts?: PaymentWithReceipt[];
		activeException?: ActiveException | null;
		events?: AgreementEvent[];
	}

	let { data }: { data: PageData } = $props();

	let statusResult: { success: boolean; result?: unknown; error?: string } | null = $state(null);
	let exceptionResult: { success: boolean; result?: unknown; error?: string } | null = $state(null);

	let formStatusResult: { success: boolean; result?: unknown; error?: string } | null =
		$state(null);
	let formExceptionResult: { success: boolean; result?: unknown; error?: string } | null =
		$state(null);

	function getStatusColor(status: string): string {
		switch (status) {
			case 'ACTIVE':
				return 'bg-green-900/30 text-green-400 border-green-800';
			case 'COMPLETED':
				return 'bg-blue-900/30 text-blue-400 border-blue-800';
			case 'DEFAULTED':
				return 'bg-red-900/30 text-red-400 border-red-800';
			case 'DRAFT':
				return 'bg-slate-700/30 text-slate-400 border-slate-600';
			case 'CANCELLED':
				return 'bg-orange-900/30 text-orange-400 border-orange-800';
			default:
				return 'bg-slate-700/30 text-slate-400 border-slate-600';
		}
	}

	function getInstallmentStatusColor(status: string): string {
		switch (status) {
			case 'PAID':
				return 'bg-green-900/30 text-green-400 border-green-800';
			case 'OVERDUE':
				return 'bg-red-900/30 text-red-400 border-red-800';
			case 'PENDING':
				return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
			case 'WAIVED':
				return 'bg-purple-900/30 text-purple-400 border-purple-800';
			case 'CANCELLED':
				return 'bg-slate-700/30 text-slate-400 border-slate-600';
			default:
				return 'bg-slate-700/30 text-slate-400 border-slate-600';
		}
	}
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

	<!-- Status Card -->
	<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-white">Estado del Convenio</h2>
			<span
				class={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(data.agreement.status)}`}
			>
				{data.agreement.status}
			</span>
		</div>
		<div class="grid grid-cols-2 gap-4">
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
			<div>
				<p class="text-sm text-slate-400">Motivo</p>
				<p class="text-white">{data.agreement.reason}</p>
			</div>
		</div>
		{#if data.agreement.observations}
			<div class="mt-4">
				<p class="text-sm text-slate-400">Observaciones</p>
				<p class="text-white">{data.agreement.observations}</p>
			</div>
		{/if}
	</div>

	<!-- Block Exception Status -->
	{#if data.activeException}
		<div class="rounded-lg border border-indigo-900 bg-indigo-950/30 p-6">
			<h2 class="mb-4 text-lg font-semibold text-indigo-300">Excepción de Bloqueo Activa</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="text-sm text-slate-400">Otorgada por</p>
					<p class="text-white">{data.activeException.exceptionBy}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Fecha</p>
					<p class="text-white">
						{new Date(data.activeException.exceptionAt).toLocaleDateString('es-AR')}
					</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Motivo</p>
					<p class="text-white">{data.activeException.exceptionReason}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Fuente</p>
					<p class="text-white">{data.activeException.exceptionSource}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Manual Actions -->
	<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
		<h2 class="mb-4 text-lg font-semibold text-white">Acciones Manuales</h2>
		<div class="flex gap-4">
			<form method="POST" action="?/evaluateStatus">
				<button
					type="submit"
					class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
				>
					Evaluar Estado
				</button>
			</form>
			<form method="POST" action="?/evaluateBlockException">
				<button
					type="submit"
					class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
				>
					Evaluar Excepción de Bloqueo
				</button>
			</form>
		</div>
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
						<span
							class={`rounded-full border px-2 py-1 text-xs font-medium ${getInstallmentStatusColor(installment.status)}`}
						>
							{installment.status}
						</span>
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
								Método: {payment.method}
								{payment.reference ? `(${payment.reference})` : ''}
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

	{#if data.events && data.events.length > 0}
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
			<h2 class="mb-4 text-lg font-semibold text-white">Eventos del Convenio</h2>
			<div class="space-y-2">
				{#each data.events as event (event.id)}
					<div class="rounded-lg border border-slate-700 bg-slate-900 p-3">
						<div class="flex items-start justify-between">
							<div>
								<p class="text-sm font-medium text-white">{event.eventType}</p>
								<p class="text-xs text-slate-400">{event.description}</p>
								{#if event.previousStatus && event.newStatus}
									<p class="text-xs text-slate-400">
										Estado: {event.previousStatus} → {event.newStatus}
									</p>
								{/if}
								{#if event.reason}
									<p class="text-xs text-slate-400">Motivo: {event.reason}</p>
								{/if}
							</div>
							<div class="text-right">
								<p class="text-xs text-slate-400">
									{new Date(event.createdAt).toLocaleDateString('es-AR')}
									{new Date(event.createdAt).toLocaleTimeString('es-AR')}
								</p>
								<p class="text-xs text-slate-400">{event.userName}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
