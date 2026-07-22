<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const student = $derived(data.student);
	const metrics = $derived(data.metrics);
	const charges = $derived(data.charges);

	let showSuccess = $state(false);
	let successOpacity = $state(1);
	let showTypeChangeModal = $state(false);
	let selectedType = $state<'NORMAL' | 'BECADO' | 'RECURSANTE'>('NORMAL');
	let changeReason = $state('');
	let recalculateCharges = $state(false);
	let selectedCharge = $state<any>(null);
	let showViewModal = $state(false);
	let showEditModal = $state(false);

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
			<h2 class="mt-3 text-4xl font-bold">
				{student.isBecado ? 'Becado' : 'Sin beca'}
			</h2>
		</div>
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
									onclick={() => {
										selectedCharge = charge;
										showEditModal = true;
									}}
									class="text-sm text-indigo-400 hover:text-indigo-300"
								>
									Editar
								</button>
								<a
									href={`/finanzas/pagos/nuevo?studentId=${student.id}`}
									class="text-sm text-emerald-400 hover:text-emerald-300"
								>
									Registrar pago
								</a>
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
				<p><span class="text-slate-400">Importe a cobrar:</span> {currency.format(selectedCharge.finalAmount)}</p>
				<p><span class="text-slate-400">Pagado:</span> {currency.format(selectedCharge.paid)}</p>
				<p><span class="text-slate-400">Pendiente:</span> {currency.format(selectedCharge.pending)}</p>
				<p><span class="text-slate-400">Estado:</span> {translateStatus(selectedCharge.status)}</p>
				<p><span class="text-slate-400">Tipo de cuota:</span> {selectedCharge.chargeType}</p>
				{#if selectedCharge.benefitReason}
					<p><span class="text-slate-400">Motivo:</span> {selectedCharge.benefitReason}</p>
				{/if}
			</div>
			<div class="mt-6 flex justify-end">
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
			<form
				method="POST"
				action="?/editCharge"
				use:enhance
				class="space-y-4"
			>
				<input type="hidden" name="chargeId" value={selectedCharge.id} />
				<div>
					<label for="finalAmount" class="mb-2 block text-sm font-medium text-slate-300">
						Importe a cobrar
					</label>
					<input
						type="number"
						id="finalAmount"
						name="finalAmount"
						value={selectedCharge.finalAmount}
						class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						step="0.01"
						required
					/>
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
