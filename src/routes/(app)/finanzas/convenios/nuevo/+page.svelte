<script lang="ts">
	import { enhance } from '$app/forms';

	interface StudentCharge {
		id: string;
		amount: { toString: () => string };
		status: string;
		concept?: { name: string };
	}

	interface Student {
		id: string;
		firstName: string;
		lastName: string;
		dni: string;
		studentCharges: StudentCharge[];
	}

	interface InstallmentData {
		installmentNumber: number;
		dueDate: string;
		amount: number;
	}

	interface PageData {
		students: Student[];
	}

	let { data }: { data: PageData } = $props();

	let selectedStudent = $state<string>('');
	let selectedCharges = $state<string[]>([]);
	let agreedAmount = $state<number>(0);
	let reason = $state<string>('');
	let observations = $state<string>('');
	let installmentCount = $state<number>(1);
	let installmentAmount = $state<number>(0);
	let firstDueDate = $state<string>('');
	let installmentsData = $state<InstallmentData[]>([]);

	$effect(() => {
		if (selectedStudent && data.students) {
			const student = data.students.find((s: Student) => s.id === selectedStudent);
			if (student) {
				const totalDebt = student.studentCharges.reduce(
					(sum: number, charge: StudentCharge) => sum + Number(charge.amount.toString()),
					0
				);
				agreedAmount = totalDebt;
				selectedCharges = student.studentCharges.map((c: StudentCharge) => c.id);
			}
		}
	});

	$effect(() => {
		if (installmentCount && agreedAmount) {
			installmentAmount = agreedAmount / installmentCount;
			updateInstallments();
		}
	});

	$effect(() => {
		if (firstDueDate && installmentCount && installmentAmount) {
			updateInstallments();
		}
	});

	function updateInstallments() {
		if (!firstDueDate || !installmentCount || !installmentAmount) return;

		const startDate = new Date(firstDueDate);
		installmentsData = Array.from({ length: installmentCount }, (_, i) => {
			const dueDate = new Date(startDate);
			dueDate.setMonth(dueDate.getMonth() + i);
			return {
				installmentNumber: i + 1,
				dueDate: dueDate.toISOString(),
				amount: installmentAmount
			};
		});
	}

	function toggleCharge(chargeId: string) {
		if (selectedCharges.includes(chargeId)) {
			selectedCharges = selectedCharges.filter((id) => id !== chargeId);
		} else {
			selectedCharges = [...selectedCharges, chargeId];
		}
	}
</script>

<svelte:head>
	<title>Nuevo Convenio de Pago | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-white">Nuevo Convenio de Pago</h1>
		<p class="text-slate-400">Crear un nuevo convenio de pago con un alumno</p>
	</div>

	<form method="POST" use:enhance>
		<div class="space-y-6 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Alumno</label>
				<select
					bind:value={selectedStudent}
					name="studentId"
					required
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Seleccionar alumno...</option>
					{#each data.students as student}
						<option value={student.id}>
							{student.firstName}
							{student.lastName} - {student.dni}
						</option>
					{/each}
				</select>
			</div>

			{#if selectedStudent}
				{@const student = data.students.find((s: Student) => s.id === selectedStudent)}
				{#if student}
					<div>
						<label class="mb-2 block text-sm font-medium text-slate-300">Cargos a incluir</label>
						<div class="space-y-2">
							{#each student.studentCharges as charge}
								{@const isSelected = selectedCharges.includes(charge.id)}
								<label
									class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3 hover:bg-slate-800"
								>
									<input
										type="checkbox"
										checked={isSelected}
										onchange={() => toggleCharge(charge.id)}
										name="chargeIds"
										value={charge.id}
										class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
									/>
									<div class="flex-1">
										<p class="text-sm font-medium text-white">{charge.concept?.name || 'Cargo'}</p>
										<p class="text-xs text-slate-400">
											${Number(charge.amount).toFixed(2)} - {charge.status}
										</p>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-slate-300">Monto Acordado</label>
						<input
							type="number"
							bind:value={agreedAmount}
							name="agreedAmount"
							required
							min="0"
							step="0.01"
							class="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-slate-300">Motivo</label>
						<input
							type="text"
							bind:value={reason}
							name="reason"
							required
							class="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-slate-300">Observaciones</label>
						<textarea
							bind:value={observations}
							name="observations"
							class="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
							rows="3"
						></textarea>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-slate-300">Cantidad de Cuotas</label>
						<input
							type="number"
							bind:value={installmentCount}
							required
							min="1"
							class="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label class="mb-2 block text-sm font-medium text-slate-300"
							>Fecha de Primera Cuota</label
						>
						<input
							type="date"
							bind:value={firstDueDate}
							required
							class="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					{#if installmentsData.length > 0}
						<div>
							<label class="mb-2 block text-sm font-medium text-slate-300">Cuotas</label>
							<div class="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-4">
								{#each installmentsData as installment}
									<div class="flex justify-between text-sm">
										<span class="text-slate-300">Cuota {installment.installmentNumber}</span>
										<span class="text-white">
											${installment.amount.toFixed(2)} - {new Date(
												installment.dueDate
											).toLocaleDateString('es-AR')}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<input type="hidden" name="installments" value={JSON.stringify(installmentsData)} />
				{/if}
			{/if}

			<div class="flex justify-end gap-3">
				<a
					href="/finanzas/convenios"
					class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
				>
					Cancelar
				</a>
				<button
					type="submit"
					disabled={!selectedStudent ||
						!agreedAmount ||
						!reason ||
						!installmentCount ||
						!firstDueDate}
					class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Crear Convenio
				</button>
			</div>
		</div>
	</form>
</div>
