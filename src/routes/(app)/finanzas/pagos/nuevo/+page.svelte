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
	let editingChargeSnapshot = $state<{
		amountToPay: number;
		forgivenAmount: number;
		forgivenessReason: string;
	} | null>(null);
	let validationError = $state('');

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

	function shouldIgnoreChargeToggle(event: Event): boolean {
		const target = event.target;

		if (!(target instanceof Element)) {
			return false;
		}

		return Boolean(target.closest('button, input, textarea, select, a, [data-charge-editor]'));
	}

	function updateChargeAmount(chargeId: string, value: string) {
		const charge = charges.find((c) => c.id === chargeId);
		if (!charge) return;

		if (value.trim() === '') return;

		const numValue = Number(value);

		if (!Number.isFinite(numValue) || numValue < 0) {
			validationError = 'El importe a cobrar debe ser un número mayor o igual a cero.';
			return;
		}

		if (numValue > charge.pending) {
			validationError = `El importe a cobrar no puede superar ${currency.format(charge.pending)}.`;
			return;
		}

		const forgivenAmount = Math.max(0, charge.pending - numValue);

		chargeForgiveness = {
			...chargeForgiveness,
			[chargeId]: {
				amountToPay: numValue,
				forgivenAmount,
				forgivenessReason: chargeForgiveness[chargeId]?.forgivenessReason || ''
			}
		};

		validationError = '';
		amount = totalSelected();
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
		validationError = '';
		editingChargeId = chargeId;

		const current = chargeForgiveness[chargeId];
		editingChargeSnapshot = current ? { ...current } : null;
	}

	function saveEditing(chargeId: string) {
		const adjustment = chargeForgiveness[chargeId];

		if (
			adjustment?.forgivenAmount > 0 &&
			(!adjustment.forgivenessReason || adjustment.forgivenessReason.trim().length === 0)
		) {
			validationError = 'Ingresá el motivo de la condonación antes de aplicar el nuevo importe.';
			return;
		}

		validationError = '';
		editingChargeId = null;
		editingChargeSnapshot = null;
	}

	function cancelEditing(chargeId: string) {
		const next = { ...chargeForgiveness };

		if (editingChargeSnapshot) {
			next[chargeId] = { ...editingChargeSnapshot };
		} else {
			delete next[chargeId];
		}

		chargeForgiveness = next;
		editingChargeId = null;
		editingChargeSnapshot = null;
		validationError = '';
		amount = totalSelected();
	}

	function validateForm(): { valid: boolean; error?: string } {
		if (!studentId) {
			return { valid: false, error: 'Debés seleccionar un alumno.' };
		}

		if (selectedChargeIds.size === 0) {
			return { valid: false, error: 'Debés seleccionar al menos un cargo.' };
		}

		for (const chargeId of selectedChargeIds) {
			const data = chargeForgiveness[chargeId];
			if (!data) continue;

			if (
				data.forgivenAmount > 0 &&
				(!data.forgivenessReason || data.forgivenessReason.trim().length === 0)
			) {
				return {
					valid: false,
					error: 'Completá el motivo de todas las condonaciones antes de registrar el pago.'
				};
			}
		}

		if (amount === '' || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
			return {
				valid: false,
				error: 'El importe recibido debe ser mayor o igual a cero.'
			};
		}

		if (Number(amount) > totalSelected() + 0.01) {
			return {
				valid: false,
				error: `El importe recibido no puede superar el total a cobrar (${currency.format(totalSelected())}).`
			};
		}

		return { valid: true };
	}

	function handleSubmit(e: Event) {
		const validation = validateForm();

		if (!validation.valid) {
			e.preventDefault();
			validationError = validation.error ?? 'Revisá los datos ingresados.';

			window.scrollTo({
				top: 0,
				behavior: 'smooth'
			});

			return;
		}

		validationError = '';
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
		{#if validationError || form?.message}
			<div
				role="alert"
				class="rounded-2xl border border-red-800 bg-red-950/30 px-5 py-4 text-sm text-red-300"
			>
				<p class="font-semibold">Revisá los datos del pago</p>
				<p class="mt-1 text-red-300/90">{validationError || form?.message}</p>
			</div>
		{/if}

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
					min="0"
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
							onclick={(e) => {
								if (shouldIgnoreChargeToggle(e)) return;
								toggleCharge(charge.id);
							}}
							onkeydown={(e) => {
								if (shouldIgnoreChargeToggle(e)) return;

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
									<div
										class="w-72 rounded-xl border border-indigo-800/70 bg-slate-900 p-4 text-left shadow-lg"
										data-charge-editor
									>
										<div class="mb-3 flex items-start justify-between gap-3">
											<div>
												<p class="text-sm font-semibold text-slate-100">Editar importe</p>
												<p class="mt-0.5 text-xs text-slate-500">
													{charge.conceptCode} · {charge.periodLabel}
												</p>
											</div>
											<p class="text-xs text-slate-400">
												Pendiente {currency.format(charge.pending)}
											</p>
										</div>

										<label
											for={`charge-amount-${charge.id}`}
											class="mb-1 block text-xs font-medium text-slate-300"
										>
											Importe a cobrar
										</label>

										<input
											id={`charge-amount-${charge.id}`}
											type="number"
											min="0"
											step="0.01"
											max={charge.pending}
											value={getChargeAmount(charge.id, charge.pending)}
											oninput={(e) => {
												const target = e.target as HTMLInputElement;
												updateChargeAmount(charge.id, target.value);
											}}
											onclick={(e) => e.stopPropagation()}
											class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right text-sm font-semibold text-slate-100 outline-none focus:border-indigo-500"
										/>

										{#if getForgivenAmount(charge.id) > 0}
											<div
												class="mt-3 rounded-lg border border-emerald-900/70 bg-emerald-950/20 p-3"
											>
												<div class="flex items-center justify-between gap-3">
													<span class="text-xs text-slate-400">Monto condonado</span>
													<span class="text-sm font-semibold text-emerald-400">
														-{currency.format(getForgivenAmount(charge.id))}
													</span>
												</div>

												<p class="mt-2 text-xs leading-5 text-slate-500">
													La diferencia se registrará como una condonación permanente de la deuda.
												</p>
											</div>

											<label
												for={`forgiveness-reason-${charge.id}`}
												class="mt-3 mb-1 block text-xs font-medium text-slate-300"
											>
												Motivo de condonación
												<span class="text-red-400">*</span>
											</label>

											<textarea
												id={`forgiveness-reason-${charge.id}`}
												rows="3"
												placeholder="Ej.: descuento autorizado por Dirección"
												bind:value={chargeForgiveness[charge.id].forgivenessReason}
												oninput={() => (validationError = '')}
												onclick={(e) => e.stopPropagation()}
												class="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
											></textarea>

											{#if !chargeForgiveness[charge.id]?.forgivenessReason?.trim()}
												<p class="mt-1.5 text-xs text-red-400">
													Ingresá el motivo para poder aplicar este importe.
												</p>
											{/if}
										{/if}

										<div class="mt-4 flex justify-end gap-2">
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													cancelEditing(charge.id);
												}}
												class="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500"
											>
												Cancelar
											</button>

											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													saveEditing(charge.id);
												}}
												disabled={getForgivenAmount(charge.id) > 0 &&
													!chargeForgiveness[charge.id]?.forgivenessReason?.trim()}
												class="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
											>
												Aplicar
											</button>
										</div>
									</div>
								{:else}
									<div class="flex items-start justify-end gap-2">
										<div class="max-w-56 text-right">
											<p class="font-semibold text-slate-200">
												{currency.format(getChargeAmount(charge.id, charge.pending))}
											</p>

											{#if getForgivenAmount(charge.id) > 0}
												<p class="text-xs font-medium text-emerald-400">
													-{currency.format(getForgivenAmount(charge.id))} condonado
												</p>

												{#if chargeForgiveness[charge.id]?.forgivenessReason}
													<p class="mt-1 text-xs leading-4 text-slate-500">
														Motivo: {chargeForgiveness[charge.id].forgivenessReason}
													</p>
												{/if}
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
