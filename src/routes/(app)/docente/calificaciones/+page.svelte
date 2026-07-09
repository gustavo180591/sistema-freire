<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedCommission = $state<string>('');
	let selectedEvaluation = $state<string>('');
	let formError = $state<string>('');
	let formSuccess = $state<string>('');
	let editingGrade = $state<any>(null);
	let editGradeValue = $state<string>('');
	let editGradeStatus = $state<string>('PRESENT');
	let editGradeObservations = $state<string>('');
	let editFormError = $state<string>('');
	let editFormSuccess = $state<string>('');

	// Estado para calificaciones masivas
	let studentGrades = $state<Map<string, { value: string; status: string; observations: string }>>(
		new Map()
	);

	// Set default commission when data is available
	$effect(() => {
		if (data.commissions.length > 0 && !selectedCommission) {
			selectedCommission = data.commissions[0].id;
		}
	});

	// Reset student grades when evaluation changes
	$effect(() => {
		if (selectedEvaluation) {
			studentGrades = new Map();
		}
	});

	function getCommissionEvaluations() {
		if (!selectedCommission) return [];
		return data.evaluations.filter((e) => e.commissionId === selectedCommission && !e.isClosed);
	}

	function getCommissionStudents() {
		if (!selectedCommission) return [];
		return data.students.filter((s) => s.commissionId === selectedCommission);
	}

	function setStudentGrade(
		studentId: string,
		field: 'value' | 'status' | 'observations',
		value: string
	) {
		const current = studentGrades.get(studentId) || {
			value: '',
			status: 'PRESENT',
			observations: ''
		};
		studentGrades.set(studentId, { ...current, [field]: value });
	}

	function getStudentGrade(studentId: string, field: 'value' | 'status' | 'observations') {
		return studentGrades.get(studentId)?.[field] || (field === 'status' ? 'PRESENT' : '');
	}

	function getExistingGrade(studentId: string) {
		if (!selectedEvaluation) return null;
		return data.existingGrades.find(
			(g) => g.studentId === studentId && g.evaluationId === selectedEvaluation
		);
	}

	function startEditGrade(gradeItem: any) {
		editingGrade = gradeItem;
		editGradeValue = gradeItem.value !== null ? gradeItem.value.toString() : '';
		editGradeStatus = gradeItem.status || 'PRESENT';
		editGradeObservations = gradeItem.observations || '';
		editFormError = '';
		editFormSuccess = '';
	}

	function cancelEditGrade() {
		editingGrade = null;
		editGradeValue = '';
		editGradeStatus = 'PRESENT';
		editGradeObservations = '';
		editFormError = '';
		editFormSuccess = '';
	}
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-white">Cargar Calificaciones</h1>
			<p class="text-slate-400">Registrar notas de evaluaciones para tus alumnos</p>
		</div>

		<!-- Selección de Comisión y Evaluación -->
		<div class="mb-8">
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="mb-6 text-xl font-semibold text-white">Seleccionar Evaluación</h2>

				{#if formError}
					<div class="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 p-4 text-red-400">
						{formError}
					</div>
				{/if}

				{#if formSuccess}
					<div
						class="mb-4 rounded-xl border border-green-500/50 bg-green-500/20 p-4 text-green-400"
					>
						{formSuccess}
					</div>
				{/if}

				<div class="grid gap-6 md:grid-cols-2">
					<div>
						<label for="commission" class="mb-2 block text-sm font-medium text-slate-300"
							>Comisión</label
						>
						<select
							id="commission"
							bind:value={selectedCommission}
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						>
							<option value="">Seleccionar comisión...</option>
							{#each data.commissions as commission}
								<option value={commission.id}>
									{commission.name} - {commission.subject} ({commission.career})
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="evaluation" class="mb-2 block text-sm font-medium text-slate-300"
							>Evaluación</label
						>
						<select
							id="evaluation"
							bind:value={selectedEvaluation}
							disabled={!selectedCommission}
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500 disabled:opacity-50"
						>
							<option value="">Seleccionar evaluación...</option>
							{#each getCommissionEvaluations() as evaluation}
								<option value={evaluation.id}>
									{evaluation.title} ({evaluation.type}) - {new Date(
										evaluation.evaluationDate
									).toLocaleDateString()}
								</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>

		<!-- Carga Masiva de Calificaciones -->
		{#if selectedEvaluation}
			{@const students = getCommissionStudents()}
			{@const evaluation = data.evaluations.find((e) => e.id === selectedEvaluation)}

			<div class="mb-8">
				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-xl font-semibold text-white">
							Cargar Notas: {evaluation?.title}
						</h2>
						<div class="text-sm text-slate-400">
							Máximo: {evaluation?.maxScore} | Aprobación: {evaluation?.minPassingScore}
						</div>
					</div>

					<form method="POST" action="?/loadGrades">
						<input type="hidden" name="evaluationId" value={selectedEvaluation} />

						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-slate-800">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
											>Alumno</th
										>
										<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
											>Estado</th
										>
										<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
											>Nota</th
										>
										<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
											>Observaciones</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-800">
									{#each students as student}
										{@const existingGrade = getExistingGrade(student.id)}
										<tr class="hover:bg-slate-800/50">
											<td class="px-4 py-3">
												<div class="text-sm font-medium text-white">
													{student.lastName}, {student.firstName}
												</div>
												<div class="text-xs text-slate-400">{student.dni}</div>
											</td>
											<td class="px-4 py-3">
												<select
													name="grades[{student.id}].status"
													class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-500"
												>
													<option
														value="PRESENT"
														selected={getStudentGrade(student.id, 'status') === 'PRESENT' ||
															(!getStudentGrade(student.id, 'status') &&
																existingGrade?.status === 'PRESENT')}>Presente</option
													>
													<option
														value="ABSENT"
														selected={getStudentGrade(student.id, 'status') === 'ABSENT' ||
															existingGrade?.status === 'ABSENT'}>Ausente</option
													>
													<option
														value="EXCUSED"
														selected={getStudentGrade(student.id, 'status') === 'EXCUSED' ||
															existingGrade?.status === 'EXCUSED'}>Justificado</option
													>
												</select>
											</td>
											<td class="px-4 py-3">
												<input
													type="number"
													name="grades[{student.id}].value"
													min="0"
													max={evaluation?.maxScore ? Number(evaluation.maxScore) : 10}
													step="0.01"
													value={getStudentGrade(student.id, 'value') ||
														(existingGrade && existingGrade.value !== null
															? Number(existingGrade.value)
															: '')}
													placeholder="0"
													class="w-24 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-500"
												/>
											</td>
											<td class="px-4 py-3">
												<input
													type="text"
													name="grades[{student.id}].observations"
													value={getStudentGrade(student.id, 'observations') ||
														existingGrade?.observations ||
														''}
													placeholder="Observaciones..."
													class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-500"
												/>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						<div class="mt-6 flex justify-end space-x-4">
							<button
								type="button"
								onclick={() => (studentGrades = new Map())}
								class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
							>
								Limpiar
							</button>
							<button
								type="submit"
								class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
							>
								Guardar Calificaciones
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
