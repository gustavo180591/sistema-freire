<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const student = $derived(data.student);
	const metrics = $derived(data.metrics);
	const charges = $derived.by(() => {
		return [...data.charges].sort((a, b) => {
			const aConcept = String(a.concept ?? '').toUpperCase();
			const bConcept = String(b.concept ?? '').toUpperCase();

			const aPeriod = String(a.period ?? '').toUpperCase();
			const bPeriod = String(b.period ?? '').toUpperCase();

			// La inscripción siempre debe quedar al final.
			const aIsEnrollment = aConcept.includes('INSCRIP') || aPeriod.includes('INSCRIPCION');

			const bIsEnrollment = bConcept.includes('INSCRIP') || bPeriod.includes('INSCRIPCION');

			if (aIsEnrollment !== bIsEnrollment) {
				return aIsEnrollment ? 1 : -1;
			}

			// Para períodos mensuales YYYY-MM:
			// el más reciente debe mostrarse primero.
			const periodValue = (period: string) => {
				const match = period.match(/^(\d{4})-(\d{2})$/);

				if (!match) {
					return 0;
				}

				const year = Number(match[1]);
				const month = Number(match[2]);

				return year * 100 + month;
			};

			const monthlyDifference = periodValue(bPeriod) - periodValue(aPeriod);

			if (monthlyDifference !== 0) {
				return monthlyDifference;
			}

			// Para otros cargos, si poseen fecha, mostrar
			// también el más reciente primero.
			const aDate = new Date(a.dueDate ?? 0).getTime();

			const bDate = new Date(b.dueDate ?? 0).getTime();

			return bDate - aDate;
		});
	});

	const scholarshipLifecycle = $derived(data.scholarshipLifecycle);
	const scholarship = $derived(scholarshipLifecycle.scholarship);

	const openNegotiation = $derived(
		scholarship?.negotiations?.find((negotiation) => negotiation.status === 'OPEN') ?? null
	);

	let showSuccess = $state(false);
	let successOpacity = $state(1);
	let showTypeChangeModal = $state(false);
	let selectedType = $state<'NORMAL' | 'BECADO' | 'RECURSANTE'>('NORMAL');
	let changeReason = $state('');
	let recalculateCharges = $state(false);
	type EditChargeType = 'NORMAL' | 'BECADO' | 'RECURSANTE';

	let selectedCharge = $state<any>(null);
	let showViewModal = $state(false);
	let showEditModal = $state(false);
	let showScholarshipHistory = $state(false);
	let editChargeType = $state<EditChargeType>('NORMAL');

	const editFinalAmount = $derived(
		editChargeType === 'BECADO'
			? data.feeAmounts.BECADO
			: editChargeType === 'RECURSANTE'
				? data.feeAmounts.RECURSANTE
				: data.feeAmounts.NORMAL
	);

	// Mostrar mensaje de éxito cuando hay form.success
	$effect(() => {
		if (form?.success) {
			showSuccess = true;
			successOpacity = 1;

			// Desvanecer después de 5 segundos
			const fadeTimer = setTimeout(() => {
				successOpacity = 0;
			}, 5000);

			// Ocultar después de la animación de desvanecimiento
			const hideTimer = setTimeout(() => {
				showSuccess = false;
			}, 5500);

			return () => {
				clearTimeout(fadeTimer);
				clearTimeout(hideTimer);
			};
		}
	});

	// Cerrar modal si hay éxito
	$effect(() => {
		if (form?.success && showTypeChangeModal) {
			showTypeChangeModal = false;
			changeReason = '';
			recalculateCharges = false;
		}
	});

	function getCurrentType(): 'NORMAL' | 'BECADO' | 'RECURSANTE' {
		if (student.isBecado) return 'BECADO';
		if (student.isRecursante) return 'RECURSANTE';
		return 'NORMAL';
	}

	function getChargeTypeForEdit(charge: any): EditChargeType {
		if (charge.benefitType === 'SCHOLARSHIP') return 'BECADO';
		if (charge.benefitType === 'RECURSANT') return 'RECURSANTE';
		return 'NORMAL';
	}

	function openEditChargeModal(charge: any) {
		selectedCharge = charge;
		editChargeType = getChargeTypeForEdit(charge);
		showEditModal = true;
	}

	function getTypeLabel(type: 'NORMAL' | 'BECADO' | 'RECURSANTE'): string {
		const labels = {
			NORMAL: 'Normal',
			BECADO: 'Becado',
			RECURSANTE: 'Recursante'
		};
		return labels[type];
	}

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	const statusTranslations: Record<string, string> = {
		PENDING: 'Pendiente',
		PAID: 'Pagado',
		OVERDUE: 'Vencido',
		CANCELLED: 'Cancelado',
		PARTIAL: 'Parcial',
		PARTIALLY_PAID: 'Parcialmente pagado'
	};

	const translateStatus = (status: string) => statusTranslations[status] || status;

	function formatPaymentMethod(value: string | null | undefined): string {
		if (!value) return '—';

		const methods: Record<string, string> = {
			CASH: 'Efectivo',
			BANK_TRANSFER: 'Transferencia bancaria',
			DEBIT_CARD: 'Tarjeta de débito',
			CREDIT_CARD: 'Tarjeta de crédito',
			QR: 'QR',
			SCHOLARSHIP: 'Beca'
		};

		return methods[value] || value;
	}

	function getScholarshipStatusLabel(status: string | null): string {
		const labels: Record<string, string> = {
			ACTIVE: 'Activa',
			SUSPENDED_DEBT: 'Suspendida por mora',
			NEGOTIATION: 'En negociación',
			CANCELLED: 'Cancelada',
			EXPIRED: 'Vencida'
		};

		return status ? labels[status] || status : 'Sin beca';
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';

		return new Intl.DateTimeFormat('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(value));
	}
</script>

<svelte:head>
	<title>Estado financiero | {student.fullName}</title>
	<meta name="description" content="Estado financiero consolidado del alumno" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Estado financiero</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">
			{student.fullName}
		</h1>
		<p class="mt-3 text-sm text-slate-400">
			DNI: {student.dni} · {student.career}
		</p>

		{#if metrics.blocked}
			<div class="mt-5 rounded-2xl border border-red-600 bg-white px-4 py-3 text-sm text-red-600">
				⚠️ El alumno posee deuda pendiente. Las acciones académicas pueden estar bloqueadas.
			</div>
		{/if}
	</section>

	<!-- KPIs -->
	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">{metrics.financialLabel}</p>
			<h2 class="mt-3 text-4xl font-bold">
				{#if metrics.hasCredit}
					+
				{/if}
				{currency.format(metrics.financialAmount)}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Pagos realizados</p>
			<h2 class="mt-3 text-4xl font-bold">
				{currency.format(metrics.totalPaid)}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Cargos pendientes</p>
			<h2 class="mt-3 text-4xl font-bold">
				{metrics.pendingCharges}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Estado de beca</p>
			<h2 class="mt-3 text-2xl font-bold">
				{getScholarshipStatusLabel(scholarshipLifecycle.status)}
			</h2>

			{#if scholarship}
				<p class="mt-2 text-sm text-slate-500">
					{scholarship.percentage}% registrado
				</p>
			{/if}
		</div>
	</section>

	<!-- Gestión de beca -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
					Beneficio financiero
				</p>

				<h2 class="mt-1 text-2xl font-bold text-white">Estado de la beca</h2>
			</div>

			<div class="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3">
				<p class="text-xs text-slate-500">Estado actual</p>
				<p class="mt-1 font-bold text-white">
					{getScholarshipStatusLabel(scholarshipLifecycle.status)}
				</p>
			</div>
		</div>

		{#if scholarship}
			<div class="mt-6 grid gap-4 md:grid-cols-3">
				<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
					<p class="text-xs text-slate-500">Beca</p>
					<p class="mt-2 font-semibold text-white">
						{scholarship.name}
					</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
					<p class="text-xs text-slate-500">Porcentaje registrado</p>
					<p class="mt-2 font-semibold text-white">
						{scholarship.percentage}%
					</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
					<p class="text-xs text-slate-500">Última reactivación</p>
					<p class="mt-2 font-semibold text-white">
						{formatDate(scholarship.reinstatedAt)}
					</p>
				</div>
			</div>

			{#if scholarship.status === 'SUSPENDED_DEBT'}
				<div class="mt-5 rounded-2xl border border-amber-700/60 bg-amber-950/20 p-5">
					<p class="font-semibold text-amber-300">Beca suspendida por mora</p>

					{#if scholarship.suspensionReason}
						<p class="mt-2 text-sm text-slate-300">
							{scholarship.suspensionReason}
						</p>
					{/if}

					<p class="mt-3 text-sm text-slate-400">
						Para devolverle la beca al alumno utilizá
						<strong class="text-slate-200">Cambiar tipo de alumno</strong>, seleccioná
						<strong class="text-slate-200">Becado</strong>
						y registrá obligatoriamente el motivo de la reactivación.
					</p>
				</div>
			{/if}

			{#if scholarship.history.length > 0}
				<div class="mt-6 border-t border-slate-800 pt-5">
					<div
						class="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
					>
						<div>
							<div class="flex items-center gap-2">
								<h3 class="font-semibold text-white">Historial de la beca</h3>

								<span
									class="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-medium text-slate-400"
								>
									{scholarship.history.length}
								</span>
							</div>

							<p class="mt-1 text-xs text-slate-500">
								{scholarship.history.length === 1
									? '1 movimiento registrado'
									: `${scholarship.history.length} movimientos registrados`}
							</p>
						</div>

						<button
							type="button"
							onclick={() => {
								showScholarshipHistory = !showScholarshipHistory;
							}}
							aria-expanded={showScholarshipHistory}
							class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-indigo-500 hover:text-white"
						>
							{showScholarshipHistory ? 'Ocultar historial' : 'Ver historial'}

							<span
								class={`text-xs transition-transform duration-200 ${
									showScholarshipHistory ? 'rotate-180' : ''
								}`}
							>
								▼
							</span>
						</button>
					</div>

					{#if showScholarshipHistory}
						<div class="mt-4 space-y-3">
							{#each scholarship.history as history}
								<div class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
									<div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
										<div>
											<p class="font-medium text-slate-200">
												{history.reason}
											</p>

											<p class="mt-1 text-xs text-slate-500">
												{history.previousStatus
													? `${getScholarshipStatusLabel(history.previousStatus)} → `
													: ''}
												{getScholarshipStatusLabel(history.newStatus)}
											</p>

											{#if history.notes}
												<p class="mt-2 text-sm text-slate-400">
													{history.notes}
												</p>
											{/if}

											{#if history.changedByName}
												<p class="mt-2 text-xs text-slate-600">
													Responsable: {history.changedByName}
												</p>
											{/if}
										</div>

										<p class="shrink-0 text-xs text-slate-500">
											{formatDate(history.createdAt)}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{:else}
			<p class="mt-5 text-sm text-slate-500">El alumno no posee una beca registrada.</p>
		{/if}
	</section>

	<!-- CTA -->
	<section class="flex flex-wrap gap-3">
		<a
			href={`/alumnos/${student.id}/historial`}
			class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
		>
			Ver historial académico
		</a>

		<a
			href={`/alumnos/${student.id}/certificados`}
			class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Generar certificado
		</a>

		<button
			onclick={() => {
				selectedType = getCurrentType();
				showTypeChangeModal = true;
			}}
			class="cursor-pointer rounded-2xl border border-amber-700 bg-amber-950/50 px-5 py-3 text-sm font-semibold text-amber-300 transition hover:border-amber-500 hover:bg-amber-950 hover:shadow-lg"
		>
			Cambiar tipo de alumno
		</button>

		<form method="POST" action="?/recalculateCharges">
			<button
				type="submit"
				class="cursor-pointer rounded-2xl border border-indigo-700 bg-indigo-950/50 px-5 py-3 text-sm font-semibold text-indigo-300 transition hover:border-indigo-500 hover:bg-indigo-950 hover:shadow-lg"
			>
				Recalcular cargos pendientes
			</button>
		</form>
	</section>

	{#if showSuccess}
		<div
			class="rounded-2xl border border-green-600 bg-green-950/30 px-4 py-3 text-sm text-black transition-opacity duration-500"
			style="opacity: {successOpacity}"
		>
			✓ {form?.message ||
				`Cargos recalculados: ${form?.updatedCount} actualizados, ${form?.skippedCount} omitidos`}
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-2xl border border-red-600 bg-red-950/30 px-4 py-3 text-sm text-red-400">
			✗ {form.error}
		</div>
	{/if}

	<!-- Modal de cambio de tipo de alumno -->
	{#if showTypeChangeModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6">
				<h2 class="mb-4 text-2xl font-bold">Cambiar tipo de alumno</h2>
				<p class="mb-4 text-sm text-slate-400">
					Tipo actual: <span class="font-semibold text-slate-300"
						>{getTypeLabel(getCurrentType())}</span
					>
				</p>

				<form method="POST" action="?/changeStudentType">
					<div class="mb-4">
						<label for="newType" class="mb-2 block text-sm font-medium text-slate-300"
							>Nuevo tipo</label
						>
						<select
							id="newType"
							name="newType"
							bind:value={selectedType}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						>
							<option value="NORMAL">Normal</option>
							<option value="BECADO">Becado</option>
							<option value="RECURSANTE">Recursante</option>
						</select>
					</div>

					<div class="mb-4">
						<label for="reason" class="mb-2 block text-sm font-medium text-slate-300"
							>Motivo (obligatorio)</label
						>
						<textarea
							id="reason"
							name="reason"
							bind:value={changeReason}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
							rows="3"
							required
						></textarea>
					</div>

					<div class="mb-6">
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								name="recalculateCharges"
								bind:checked={recalculateCharges}
								class="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
							/>
							<span class="text-sm text-slate-300">Recalcular cuotas pendientes con nuevo tipo</span
							>
						</label>
						<p class="mt-1 text-xs text-slate-500">
							Solo aplica a cuotas PENDING/PARTIAL. No modifica pagos históricos.
						</p>
					</div>

					<div class="flex justify-end gap-3">
						<button
							type="button"
							onclick={() => {
								showTypeChangeModal = false;
								changeReason = '';
								recalculateCharges = false;
							}}
							class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
						>
							Confirmar cambio
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Tabla financiera -->
	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-4 py-4 text-sm font-semibold">Concepto</th>
					<th class="px-4 py-4 text-sm font-semibold">Período</th>
					<th class="px-4 py-4 text-sm font-semibold">Tipo de cuota</th>
					<th class="px-4 py-4 text-right text-sm font-semibold">Importe a cobrar</th>
					<th class="px-4 py-4 text-right text-sm font-semibold">Pagado</th>
					<th class="px-4 py-4 text-sm font-semibold">Fecha de pago</th>
					<th class="px-4 py-4 text-right text-sm font-semibold">Pendiente</th>
					<th class="px-4 py-4 text-sm font-semibold">Estado</th>
					<th class="px-4 py-4 text-sm font-semibold">Vencimiento</th>
					<th class="px-4 py-4 text-sm font-semibold">Acción</th>
				</tr>
			</thead>
			<tbody>
				{#each charges as charge}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-4 py-4 font-medium">{charge.concept}</td>
						<td class="px-4 py-4">{charge.period}</td>
						<td class="px-4 py-4">
							{#if charge.benefitType === 'SCHOLARSHIP'}
								<span
									class="inline-flex items-center rounded-full border border-emerald-500 bg-white px-2 py-1 text-xs font-medium text-black"
								>
									Becado
								</span>
							{:else if charge.benefitType === 'RECURSANT'}
								<span
									class="inline-flex items-center rounded-full bg-amber-950/50 px-2 py-1 text-xs font-medium text-amber-400"
								>
									Recursante
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400"
								>
									Normal
								</span>
							{/if}
						</td>
						<td class="px-4 py-4 text-right font-semibold">
							{currency.format(charge.finalAmount)}
						</td>
						<td class="px-4 py-4 text-right">
							{currency.format(charge.paid)}
						</td>
						<td class="px-4 py-4 whitespace-nowrap">
							{#if charge.paymentDate}
								<span class="text-sm text-slate-300">
									{formatDate(charge.paymentDate)}
								</span>
							{:else}
								<span class="text-sm text-slate-500">—</span>
							{/if}
						</td>
						<td class="px-4 py-4 text-right">
							{#if charge.pending > 0}
								<span class="text-red-400">{currency.format(charge.pending)}</span>
							{:else}
								<span class="text-emerald-400">{currency.format(charge.pending)}</span>
							{/if}
						</td>
						<td class="px-4 py-4">
							<span class="rounded-full border border-slate-700 px-2 py-1 text-xs">
								{translateStatus(charge.status)}
							</span>
						</td>
						<td class="px-4 py-4">
							{#if charge.conceptCode === 'CUOTA_MENSUAL' && charge.dueDate}
								{#if charge.isOverdue}
									<span
										class="rounded-full border border-red-600 bg-red-950/30 px-2 py-1 text-xs text-red-400"
									>
										Vencida
									</span>
								{:else}
									<span
										class="rounded-full border border-emerald-600 bg-white px-2 py-1 text-xs text-black"
									>
										Al día
									</span>
								{/if}
							{:else}
								<span class="text-xs text-slate-500">-</span>
							{/if}
						</td>
						<td class="px-4 py-4">
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									onclick={() => {
										selectedCharge = charge;
										showViewModal = true;
									}}
									class="text-sm text-slate-400 hover:text-white"
								>
									Ver
								</button>
								<button
									type="button"
									onclick={() => openEditChargeModal(charge)}
									class="text-sm text-indigo-400 hover:text-indigo-300"
								>
									Editar
								</button>
								{#if charge.status !== 'PAID'}
									<a
										href={`/finanzas/pagos/nuevo?studentId=${student.id}`}
										class="text-sm text-emerald-400 hover:text-emerald-300"
									>
										Registrar pago
									</a>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>

<!-- Modal Ver cargo -->
{#if showViewModal && selectedCharge}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold">Detalle del cargo</h2>
				<button
					type="button"
					onclick={() => {
						showViewModal = false;
						selectedCharge = null;
					}}
					class="text-slate-400 hover:text-white"
				>
					✕
				</button>
			</div>
			<div class="space-y-3 text-sm">
				<p><span class="text-slate-400">Concepto:</span> {selectedCharge.concept}</p>
				<p><span class="text-slate-400">Período:</span> {selectedCharge.period}</p>
				<p>
					<span class="text-slate-400">Importe a cobrar:</span>
					{currency.format(selectedCharge.finalAmount)}
				</p>
				<p><span class="text-slate-400">Pagado:</span> {currency.format(selectedCharge.paid)}</p>
				<p>
					<span class="text-slate-400">Fecha de pago:</span>
					{#if selectedCharge.paymentDate}
						{formatDate(selectedCharge.paymentDate)}
					{:else}
						—
					{/if}
				</p>

				<p>
					<span class="text-slate-400">Forma de pago:</span>
					{formatPaymentMethod(selectedCharge.paymentMethod)}
				</p>

				<p>
					<span class="text-slate-400">Pendiente:</span>
					{currency.format(selectedCharge.pending)}
				</p>
				<p><span class="text-slate-400">Estado:</span> {translateStatus(selectedCharge.status)}</p>
				<p><span class="text-slate-400">Tipo de cuota:</span> {selectedCharge.chargeType}</p>
			</div>
			<div class="mt-6 flex justify-end gap-3">
				{#if selectedCharge.receiptId}
					<a
						href={`/recibos/${selectedCharge.receiptId}`}
						target="_blank"
						class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
					>
						Ver recibo de pago
					</a>
				{/if}
				<button
					type="button"
					onclick={() => {
						showViewModal = false;
						selectedCharge = null;
					}}
					class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Editar cargo -->
{#if showEditModal && selectedCharge}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold">Editar cargo</h2>
				<button
					type="button"
					onclick={() => {
						showEditModal = false;
						selectedCharge = null;
					}}
					class="text-slate-400 hover:text-white"
				>
					✕
				</button>
			</div>
			<form method="POST" action="?/editCharge" use:enhance class="space-y-4">
				<input type="hidden" name="chargeId" value={selectedCharge.id} />
				<div>
					<label for="chargeType" class="mb-2 block text-sm font-medium text-slate-300">
						Tipo de cuota
					</label>
					<select
						id="chargeType"
						name="chargeType"
						bind:value={editChargeType}
						class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						required
					>
						<option value="NORMAL">Normal</option>
						<option value="BECADO">Becado</option>
						<option value="RECURSANTE">Recursante</option>
					</select>
				</div>
				<div>
					<label for="finalAmount" class="mb-2 block text-sm font-medium text-slate-300">
						Importe a cobrar (se recalcula según el tipo)
					</label>
					<input
						type="number"
						id="finalAmount"
						value={editFinalAmount}
						disabled
						class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-500"
						step="0.01"
					/>
					<p class="mt-2 text-xs text-slate-500">Monto tomado de Configuración → Cuotas.</p>
				</div>
				<div>
					<label for="paidAmount" class="mb-2 block text-sm font-medium text-slate-300">
						Monto pagado
					</label>
					<input
						type="number"
						id="paidAmount"
						name="paidAmount"
						value={selectedCharge.paid}
						class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						step="0.01"
						required
					/>
				</div>
				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => {
							showEditModal = false;
							selectedCharge = null;
						}}
						class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
					>
						Guardar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
