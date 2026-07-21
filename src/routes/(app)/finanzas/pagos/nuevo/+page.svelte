<script lang="ts">
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	const students = $derived(data?.students ?? []);
	const initialStudentId = $derived(data?.selectedStudent?.id ?? null);
	const initialCharges = $derived(data?.charges ?? []);

	let studentId = $state('');
	let amount = $state<number | ''>('');
	let method = $state('CASH');
	let reference = $state('');
	let notes = $state('');

	let charges = $state<
		Array<{
			id: string;
			concept: string;
			conceptCode: string;
			periodLabel: string;
			amount: number;
			paidAmount: number;
			finalAmount: number;
			pending: number;
			scholarshipApplied: number;
			lateFeeApplied: number;
			discountApplied: number;
			status: string;
			dueDate: string | null;
		}>
	>([]);

	let selectedChargeIds = $state<Set<string>>(new Set());
	let chargeForgiveness = $state<
		Record<string, { amountToPay: number; forgivenAmount: number; forgivenessReason: string }>
	>({});
	let editingChargeId = $state<string | null>(null);

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

	// Calcular total seleccionado
	const totalSelected = $derived(() => {
		return charges
			.filter((charge) => selectedChargeIds.has(charge.id))
			.reduce((sum, charge) => {
				const forgiveness = chargeForgiveness[charge.id];
				return (
					sum + (forgiveness?.amountToPay !== undefined ? forgiveness.amountToPay : charge.pending)
				);
			}, 0);
	});

	// Calcular total condonado
	const totalForgiven = $derived(() => {
		return charges
			.filter((charge) => selectedChargeIds.has(charge.id))
			.reduce((sum, charge) => {
				const forgiveness = chargeForgiveness[charge.id];
				return sum + (forgiveness?.forgivenAmount || 0);
			}, 0);
	});

	// Calcular total deuda original seleccionada
	const totalOriginal = $derived(() => {
		return charges
			.filter((charge) => selectedChargeIds.has(charge.id))
			.reduce((sum, charge) => sum + charge.pending, 0);
	});

	// Inicializar con datos del servidor
	$effect(() => {
		if (initialStudentId && !studentId) {
			studentId = initialStudentId;
		}
		if (initialCharges.length > 0 && charges.length === 0) {
			charges = initialCharges;
			selectedChargeIds = new Set(initialCharges.map((c) => c.id));
			amount = totalSelected();
		}
	});

	// Inicializar amount con el total seleccionado
	$effect(() => {
		if (charges.length > 0 && amount === '') {
			amount = totalSelected();
		}
	});

	// Actualizar URL cuando cambia el alumno
	$effect(() => {
		if (studentId) {
			const url = new URL(window.location.href);
			url.searchParams.set('studentId', studentId);
			window.history.replaceState({}, '', url.toString());
		}
	});

	// Cargar cargos cuando cambia el alumno (solo si no viene del servidor)
	$effect(() => {
		if (studentId && studentId !== initialStudentId) {
			loadCharges();
		} else if (!studentId) {
			charges = [];
			selectedChargeIds = new Set();
		}
	});

	async function loadCharges() {
		if (!studentId) return;

		const formData = new FormData();
		formData.append('studentId', studentId);

		const response = await fetch('?/getCharges', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();
		if (result.data?.charges) {
			charges = result.data.charges;
			// Seleccionar todos por defecto
			selectedChargeIds = new Set(charges.map((c) => c.id));
			amount = totalSelected();
		}
	}

	function toggleCharge(chargeId: string) {
		if (selectedChargeIds.has(chargeId)) {
			selectedChargeIds.delete(chargeId);
		} else {
			selectedChargeIds.add(chargeId);
		}
		amount = totalSelected();
	}

	function toggleAll() {
		if (selectedChargeIds.size === charges.length) {
			selectedChargeIds = new Set();
		} else {
			selectedChargeIds = new Set(charges.map((c) => c.id));
		}
		amount = totalSelected();
	}

	function updateChargeAmount(chargeId: string, value: string) {
		const charge = charges.find((c) => c.id === chargeId);
		if (!charge) return;

		const numValue = Number(value);
		if (!isNaN(numValue) && numValue >= 0) {
			const pending = charge.pending;
			const forgivenAmount = Math.max(0, pending - numValue);

			chargeForgiveness[chargeId] = {
				amountToPay: numValue,
				forgivenAmount,
				forgivenessReason: chargeForgiveness[chargeId]?.forgivenessReason || ''
			};
			amount = totalSelected();
		}
	}

	function getChargeAmount(chargeId: string, originalAmount: number): number {
		return chargeForgiveness[chargeId]?.amountToPay !== undefined
			? chargeForgiveness[chargeId].amountToPay
			: originalAmount;
	}

	function getForgivenAmount(chargeId: string): number {
		return chargeForgiveness[chargeId]?.forgivenAmount || 0;
	}

	function startEditing(chargeId: string) {
		editingChargeId = chargeId;
	}

	function saveEditing(chargeId: string) {
		editingChargeId = null;
	}

	function cancelEditing(chargeId: string) {
		editingChargeId = null;
		delete chargeForgiveness[chargeId];
		amount = totalSelected();
	}

	function validateForm(): { valid: boolean; error?: string } {
		// Validar que haya alumno seleccionado
		if (!studentId) {
			return { valid: false, error: 'Debes seleccionar un alumno' };
		}

		// Validar que haya cargos seleccionados
		if (selectedChargeIds.size === 0) {
			return { valid: false, error: 'Debes seleccionar al menos un cargo' };
		}

		// Validar condonaciones
		for (const [chargeId, data] of Object.entries(chargeForgiveness)) {
			if (data.forgivenAmount > 0) {
				if (!data.forgivenessReason || data.forgivenessReason.trim().length === 0) {
					return {
						valid: false,
						error: 'El motivo de condonación es obligatorio cuando hay monto condonado'
					};
				}
			}
		}

		// Validar que el monto a pagar sea correcto
		if (amount === '' || amount < 0) {
			return { valid: false, error: 'El monto a pagar debe ser mayor o igual a 0' };
		}

		return { valid: true };
	}

	function handleSubmit(e: Event) {
		const validation = validateForm();
		if (!validation.valid) {
			e.preventDefault();
			alert(validation.error);
		}
	}
</script>

<svelte:head>
	<title>Nuevo pago | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Registro manual de pagos institucionales" />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Área financiera</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Registrar pago</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Registrá un pago manual y asociá el importe a cargos pendientes del alumno. El sistema podrá
			imputarlo total o parcialmente y actualizar su estado financiero.
		</p>
	</section>

	<form
		method="POST"
		action="?/create"
		onsubmit={handleSubmit}
		class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
	>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="studentId" class="mb-2 block text-sm font-medium text-slate-300">Alumno</label>
				<select
					id="studentId"
					bind:value={studentId}
					name="studentId"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value="">Seleccionar alumno</option>
					{#each students as student}
						<option value={student.id}>{student.fullName}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="amount" class="mb-2 block text-sm font-medium text-slate-300">Importe</label>
				<input
					id="amount"
					bind:value={amount}
					name="amount"
					type="number"
					min="1"
					step="0.01"
					placeholder="15000"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="method" class="mb-2 block text-sm font-medium text-slate-300">Método</label>
				<select
					id="method"
					bind:value={method}
					name="method"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value="CASH">Efectivo</option>
					<option value="BANK_TRANSFER">Transferencia</option>
					<option value="DEBIT_CARD">Tarjeta débito</option>
					<option value="CREDIT_CARD">Tarjeta crédito</option>
					<option value="QR">QR</option>
				</select>
			</div>

			<div>
				<label for="reference" class="mb-2 block text-sm font-medium text-slate-300"
					>Referencia</label
				>
				<input
					id="reference"
					bind:value={reference}
					name="reference"
					placeholder="Comprobante / operación"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
			</div>
		</div>

		<div>
			<label for="notes" class="mb-2 block text-sm font-medium text-slate-300">Observaciones</label>
			<textarea
				id="notes"
				bind:value={notes}
				name="notes"
				rows="4"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
			></textarea>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Cargos pendientes</h2>
				{#if charges.length > 0}
					<button
						type="button"
						onclick={toggleAll}
						class="text-sm text-indigo-400 hover:text-indigo-300"
					>
						{selectedChargeIds.size === charges.length
							? 'Deseleccionar todos'
							: 'Seleccionar todos'}
					</button>
				{/if}
			</div>
			<div class="mt-4 space-y-3 text-sm text-slate-400">
				{#if charges.length === 0}
					<p>Seleccioná un alumno para ver sus cargos pendientes.</p>
				{:else}
					{#each charges as charge}
						<div
							role="button"
							tabindex="0"
							class="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-800 px-4 py-3 transition hover:border-slate-600"
							class:border-indigo-600={selectedChargeIds.has(charge.id)}
							onclick={() => toggleCharge(charge.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleCharge(charge.id);
								}
							}}
						>
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									checked={selectedChargeIds.has(charge.id)}
									onclick={(e) => {
										e.stopPropagation();
										toggleCharge(charge.id);
									}}
									class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
								/>
								<div>
									<p class="font-medium text-slate-200">{charge.concept}</p>
									<p class="text-xs text-slate-500">{charge.periodLabel}</p>
									{#if charge.scholarshipApplied > 0}
										<p class="text-xs text-emerald-400">
											Beca aplicada: {currency.format(charge.scholarshipApplied)}
										</p>
									{/if}
									{#if charge.lateFeeApplied > 0}
										<p class="text-xs text-red-400">
											Recargo: {currency.format(charge.lateFeeApplied)}
										</p>
									{/if}
								</div>
							</div>
							<div class="text-right">
								{#if editingChargeId === charge.id}
									<div class="flex flex-col items-end gap-2">
										<div class="flex items-center justify-end gap-2">
											<input
												type="number"
												min="0"
												step="0.01"
												max={charge.pending}
												value={getChargeAmount(charge.id, charge.pending)}
												oninput={(e) => {
													const target = e.target as HTMLInputElement;
													if (target) {
														updateChargeAmount(charge.id, target.value);
													}
												}}
												onclick={(e) => e.stopPropagation()}
												class="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm font-semibold text-slate-200 outline-none focus:border-indigo-500"
											/>
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													saveEditing(charge.id);
												}}
												class="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
											>
												✓
											</button>
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													cancelEditing(charge.id);
												}}
												class="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
											>
												✕
											</button>
										</div>
										{#if getForgivenAmount(charge.id) > 0}
											<div class="flex flex-col items-end gap-1">
												<p class="text-xs text-emerald-400">
													Condonado: {currency.format(getForgivenAmount(charge.id))}
												</p>
												<input
													type="text"
													placeholder="Motivo de condonación (obligatorio)"
													bind:value={chargeForgiveness[charge.id].forgivenessReason}
													onclick={(e) => e.stopPropagation()}
													class="w-48 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500"
												/>
											</div>
										{/if}
									</div>
								{:else}
									<div class="flex items-center justify-end gap-2">
										<div class="text-right">
											<p class="font-semibold text-slate-200">
												{currency.format(getChargeAmount(charge.id, charge.pending))}
											</p>
											{#if getForgivenAmount(charge.id) > 0}
												<p class="text-xs text-emerald-400">
													-{currency.format(getForgivenAmount(charge.id))}
												</p>
											{/if}
										</div>
										<button
											type="button"
											onclick={(e) => {
												e.stopPropagation();
												startEditing(charge.id);
											}}
											class="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-400 hover:border-indigo-500 hover:text-indigo-400"
										>
											Editar
										</button>
									</div>
								{/if}
								<p class="text-xs text-slate-500">Pendiente</p>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Hidden input for chargeIds -->
		<input type="hidden" name="chargeIds" value={Array.from(selectedChargeIds).join(',')} />

		<!-- Hidden inputs for forgiveness data -->
		{#each Object.entries(chargeForgiveness) as [chargeId, data]}
			<input type="hidden" name={`charge_${chargeId}_amountToPay`} value={data.amountToPay} />
			<input type="hidden" name={`charge_${chargeId}_forgivenAmount`} value={data.forgivenAmount} />
			<input
				type="hidden"
				name={`charge_${chargeId}_forgivenessReason`}
				value={data.forgivenessReason}
			/>
		{/each}

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5">
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold">Total deuda seleccionada</h2>
					<p class="text-2xl font-bold text-slate-200">{currency.format(totalOriginal())}</p>
				</div>
				{#if totalForgiven() > 0}
					<div class="flex items-center justify-between">
						<p class="text-sm text-slate-400">Total condonado</p>
						<p class="text-lg font-semibold text-emerald-400">
							-{currency.format(totalForgiven())}
						</p>
					</div>
				{/if}
				<div class="flex items-center justify-between">
					<p class="text-sm text-slate-400">Total a cobrar</p>
					<p class="text-2xl font-bold text-indigo-400">{currency.format(amount || 0)}</p>
				</div>
			</div>
		</div>

		<div class="flex items-center justify-end gap-3">
			<a
				href="/finanzas"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Cancelar
			</a>
			<button
				type="submit"
				class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Registrar pago
			</button>
		</div>
	</form>
</div>
