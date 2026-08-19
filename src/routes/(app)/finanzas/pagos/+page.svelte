<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data } = $props();
	let { form } = $page;

	let selectedStudent = $state('');
	let amount = $state('');
	let method = $state('CASH');
	let reference = $state('');
	let paidAt = $state('');
	let notes = $state('');
	let selectedCharges = $state<string[]>([]);

	type PendingCharge = {
		id: string;
		concept: string;
		periodLabel: string;
		finalAmount: string | number;
		dueDate: string;
	};

	// Obtener cuotas pendientes del alumno seleccionado
	let pendingCharges = $state<PendingCharge[]>([]);

	$effect(() => {
		if (selectedStudent) {
			// Aquí podrías cargar las cuotas pendientes del alumno
			// Por ahora, es un placeholder
		}
	});

	function toggleCharge(chargeId: string) {
		if (selectedCharges.includes(chargeId)) {
			selectedCharges = selectedCharges.filter((id) => id !== chargeId);
		} else {
			selectedCharges = [...selectedCharges, chargeId];
		}
	}
</script>

<div class="p-6">
	<h1 class="mb-6 text-2xl font-bold text-slate-100">Registro de Pagos</h1>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Formulario de pago -->
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-6">
			<h2 class="mb-4 text-lg font-semibold text-slate-200">Nuevo Pago</h2>

			<form method="POST" action="?/registerPayment" use:enhance class="space-y-4">
				<input type="hidden" name="userId" value={form?.userId || ''} />

				<div>
					<label for="payment-student" class="mb-2 block text-sm font-medium text-slate-300"
						>Alumno</label
					>
					<select
						id="payment-student"
						name="studentId"
						bind:value={selectedStudent}
						class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
						required
					>
						<option value="">Seleccionar alumno</option>
						{#each data.students as student}
							<option value={student.id}>
								{student.user.firstName}
								{student.user.lastName} ({student.user.email})
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="payment-amount" class="mb-2 block text-sm font-medium text-slate-300"
						>Monto</label
					>
					<input
						id="payment-amount"
						type="number"
						name="amount"
						bind:value={amount}
						step="0.01"
						min="0"
						class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
						required
					/>
				</div>

				<div>
					<label for="payment-method" class="mb-2 block text-sm font-medium text-slate-300"
						>Método de Pago</label
					>
					<select
						id="payment-method"
						name="method"
						bind:value={method}
						class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
						required
					>
						<option value="CASH">Efectivo</option>
						<option value="BANK_TRANSFER">Transferencia Bancaria</option>
						<option value="DEBIT_CARD">Tarjeta de Débito</option>
						<option value="CREDIT_CARD">Tarjeta de Crédito</option>
						<option value="QR">QR</option>
					</select>
				</div>

				<div>
					<label for="payment-reference" class="mb-2 block text-sm font-medium text-slate-300"
						>Referencia (opcional)</label
					>
					<input
						id="payment-reference"
						type="text"
						name="reference"
						bind:value={reference}
						class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="payment-date" class="mb-2 block text-sm font-medium text-slate-300"
						>Fecha de Pago (opcional)</label
					>
					<input
						id="payment-date"
						type="date"
						name="paidAt"
						bind:value={paidAt}
						class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="payment-notes" class="mb-2 block text-sm font-medium text-slate-300"
						>Notas (opcional)</label
					>
					<textarea
						id="payment-notes"
						name="notes"
						bind:value={notes}
						rows="3"
						class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
					></textarea>
				</div>

				<div>
					<p class="mb-2 block text-sm font-medium text-slate-300">Cuotas a aplicar (opcional)</p>
					<input type="hidden" name="chargeIds" value={selectedCharges.join(',')} />
					<div class="text-sm text-slate-400">
						{selectedCharges.length > 0
							? `${selectedCharges.length} cuotas seleccionadas`
							: 'Se aplicará automáticamente a cuotas pendientes (FIFO)'}
					</div>
				</div>

				<button
					type="submit"
					class="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
				>
					Registrar Pago
				</button>
			</form>

			{#if form?.error}
				<div class="mt-4 rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-400">
					{form.error}
				</div>
			{/if}

			{#if form?.success}
				<div
					class="mt-4 rounded-lg border border-green-900 bg-green-950 p-3 text-sm text-green-400"
				>
					Pago registrado exitosamente
				</div>
			{/if}
		</div>

		<!-- Información del alumno y cuotas pendientes -->
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-6">
			<h2 class="mb-4 text-lg font-semibold text-slate-200">Cuotas Pendientes</h2>

			{#if selectedStudent}
				<div class="space-y-3">
					{#if pendingCharges.length === 0}
						<p class="text-sm text-slate-400">No hay cuotas pendientes para este alumno</p>
					{:else}
						{#each pendingCharges as charge}
							<div class="rounded-lg border border-slate-800 bg-slate-950 p-4">
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-slate-200">{charge.concept}</p>
										<p class="text-sm text-slate-400">{charge.periodLabel}</p>
									</div>
									<div class="text-right">
										<p class="font-medium text-slate-200">${charge.finalAmount}</p>
										<p class="text-sm text-slate-400">Vence: {charge.dueDate}</p>
									</div>
								</div>
								<label class="mt-2 flex items-center">
									<input
										type="checkbox"
										checked={selectedCharges.includes(charge.id)}
										onchange={() => toggleCharge(charge.id)}
										class="mr-2"
									/>
									<span class="text-sm text-slate-300">Aplicar pago a esta cuota</span>
								</label>
							</div>
						{/each}
					{/if}
				</div>
			{:else}
				<p class="text-sm text-slate-400">Selecciona un alumno para ver sus cuotas pendientes</p>
			{/if}
		</div>
	</div>
</div>
