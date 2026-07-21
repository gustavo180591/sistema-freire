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
						<button
							type="button"
							class="flex w-full items-center justify-between rounded-xl border border-slate-800 px-4 py-3 transition hover:border-slate-600"
							class:border-indigo-600={selectedChargeIds.has(charge.id)}
							onclick={() => toggleCharge(charge.id)}
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
								<p class="font-semibold text-slate-200">{currency.format(charge.pending)}</p>
								<p class="text-xs text-slate-500">Pendiente</p>
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Hidden input for chargeIds -->
		<input type="hidden" name="chargeIds" value={Array.from(selectedChargeIds).join(',')} />

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">Total a pagar</h2>
				<p class="text-2xl font-bold text-indigo-400">{currency.format(amount || 0)}</p>
			</div>
			{#if amount && totalSelected() > amount}
				<p class="mt-2 text-sm text-amber-400">
					Pago parcial: faltan {currency.format(totalSelected() - (amount || 0))}
				</p>
			{/if}
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
