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

	// Obtener cuotas pendientes del alumno seleccionado
	let pendingCharges = $state<any[]>([]);

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
	<h1 class="text-2xl font-bold text-slate-100 mb-6">Registro de Pagos</h1>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Formulario de pago -->
		<div class="bg-slate-900 rounded-xl p-6 border border-slate-800">
			<h2 class="text-lg font-semibold text-slate-200 mb-4">Nuevo Pago</h2>

			<form
				method="POST"
				action="?/registerPayment"
				use:enhance
				class="space-y-4"
			>
				<input type="hidden" name="userId" value={form?.userId || ''} />

				<div>
					<label class="block text-sm font-medium text-slate-300 mb-2">Alumno</label>
					<select
						name="studentId"
						bind:value={selectedStudent}
						class="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
						required
					>
						<option value="">Seleccionar alumno</option>
						{#each data.students as student}
							<option value={student.id}>
								{student.user.firstName} {student.user.lastName} ({student.user.email})
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-300 mb-2">Monto</label>
					<input
						type="number"
						name="amount"
						bind:value={amount}
						step="0.01"
						min="0"
						class="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
						required
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-300 mb-2">Método de Pago</label>
					<select
						name="method"
						bind:value={method}
						class="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
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
					<label class="block text-sm font-medium text-slate-300 mb-2">Referencia (opcional)</label>
					<input
						type="text"
						name="reference"
						bind:value={reference}
						class="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-300 mb-2">Fecha de Pago (opcional)</label>
					<input
						type="date"
						name="paidAt"
						bind:value={paidAt}
						class="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-300 mb-2">Notas (opcional)</label>
					<textarea
						name="notes"
						bind:value={notes}
						rows="3"
						class="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
					></textarea>
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-300 mb-2">Cuotas a aplicar (opcional)</label>
					<input
						type="hidden"
						name="chargeIds"
						value={selectedCharges.join(',')}
					/>
					<div class="text-sm text-slate-400">
						{selectedCharges.length > 0
							? `${selectedCharges.length} cuotas seleccionadas`
							: 'Se aplicará automáticamente a cuotas pendientes (FIFO)'}
					</div>
				</div>

				<button
					type="submit"
					class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition"
				>
					Registrar Pago
				</button>
			</form>

			{#if form?.error}
				<div class="mt-4 p-3 bg-red-950 border border-red-900 rounded-lg text-red-400 text-sm">
					{form.error}
				</div>
			{/if}

			{#if form?.success}
				<div class="mt-4 p-3 bg-green-950 border border-green-900 rounded-lg text-green-400 text-sm">
					Pago registrado exitosamente
				</div>
			{/if}
		</div>

		<!-- Información del alumno y cuotas pendientes -->
		<div class="bg-slate-900 rounded-xl p-6 border border-slate-800">
			<h2 class="text-lg font-semibold text-slate-200 mb-4">Cuotas Pendientes</h2>

			{#if selectedStudent}
				<div class="space-y-3">
					{#if pendingCharges.length === 0}
						<p class="text-slate-400 text-sm">No hay cuotas pendientes para este alumno</p>
					{:else}
						{#each pendingCharges as charge}
							<div class="bg-slate-950 rounded-lg p-4 border border-slate-800">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-slate-200 font-medium">{charge.concept}</p>
										<p class="text-slate-400 text-sm">{charge.periodLabel}</p>
									</div>
									<div class="text-right">
										<p class="text-slate-200 font-medium">${charge.finalAmount}</p>
										<p class="text-slate-400 text-sm">Vence: {charge.dueDate}</p>
									</div>
								</div>
								<label class="flex items-center mt-2">
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
				<p class="text-slate-400 text-sm">Selecciona un alumno para ver sus cuotas pendientes</p>
			{/if}
		</div>
	</div>
</div>
