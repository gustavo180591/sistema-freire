<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedStudent = $state<string>('');
	let selectedSubject = $state<string>('');
	let grade = $state<string>('');
	let evaluationType = $state<string>('PARCIAL');
	let notes = $state<string>('');
	let formError = $state<string>('');
	let formSuccess = $state<string>('');
	let editingGrade = $state<any>(null);
	let editGradeValue = $state<string>('');
	let editEvaluationType = $state<string>('PARCIAL');
	let editFormError = $state<string>('');
	let editFormSuccess = $state<string>('');

	// Set default subject when data is available
	$effect(() => {
		if (data.subjects.length > 0 && !selectedSubject) {
			selectedSubject = data.subjects[0].id;
		}
	});

	function handleSubmit() {
		formError = '';
		formSuccess = '';

		if (!selectedStudent || !selectedSubject || !grade) {
			formError = 'Por favor completá todos los campos requeridos';
			return;
		}

		const gradeNum = parseFloat(grade);
		if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) {
			formError = 'La nota debe estar entre 0 y 10';
			return;
		}
	}

	function resetForm() {
		selectedStudent = '';
		grade = '';
		evaluationType = 'PARCIAL';
		notes = '';
		formError = '';
		formSuccess = '';
	}

	function startEditGrade(gradeItem: any) {
		editingGrade = gradeItem;
		editGradeValue = gradeItem.value.toString();
		editEvaluationType = gradeItem.gradeType;
		editFormError = '';
		editFormSuccess = '';
	}

	function cancelEditGrade() {
		editingGrade = null;
		editGradeValue = '';
		editEvaluationType = 'PARCIAL';
		editFormError = '';
		editFormSuccess = '';
	}
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">Cargar Calificaciones</h1>
			<p class="text-slate-400">Registrar notas de evaluaciones para tus alumnos</p>
		</div>

		<!-- Formulario de Carga -->
		<div class="mb-8">
			<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
				<h2 class="text-xl font-semibold text-white mb-6">Nueva Calificación</h2>

				{#if formError}
					<div class="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
						{formError}
					</div>
				{/if}

				{#if formSuccess}
					<div class="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400">
						{formSuccess}
					</div>
				{/if}

				<form method="POST" class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div>
							<label for="subject" class="mb-2 block text-sm font-medium text-slate-300">Materia</label>
							<select
								id="subject"
								name="subjectId"
								bind:value={selectedSubject}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								{#each data.subjects as subject}
									<option value={subject.id}>
										{subject.code} - {subject.name} ({subject.careers.join(', ')})
									</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="student" class="mb-2 block text-sm font-medium text-slate-300">Alumno</label>
							<select
								id="student"
								name="studentId"
								bind:value={selectedStudent}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="">Seleccionar alumno...</option>
								{#each data.students as student}
									<option value={student.id}>
										{student.lastName}, {student.firstName} ({student.dni})
									</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="grade" class="mb-2 block text-sm font-medium text-slate-300">Nota (0-10)</label>
							<input
								id="grade"
								name="grade"
								type="number"
								min="0"
								max="10"
								step="0.01"
								bind:value={grade}
								placeholder="Ej: 7.5"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>

						<div>
							<label for="evaluationType" class="mb-2 block text-sm font-medium text-slate-300">Tipo de Evaluación</label>
							<select
								id="evaluationType"
								name="evaluationType"
								bind:value={evaluationType}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="PARCIAL">Parcial</option>
								<option value="FINAL">Final</option>
								<option value="RECUPERATORIO">Recuperatorio</option>
								<option value="TRABAJO_PRACTICO">Trabajo Práctico</option>
								<option value="EXAMEN">Examen</option>
								<option value="OTRO">Otro</option>
							</select>
						</div>
					</div>

					<div>
						<label for="notes" class="mb-2 block text-sm font-medium text-slate-300">Notas (opcional)</label>
						<textarea
							id="notes"
							name="notes"
							bind:value={notes}
							rows="3"
							placeholder="Observaciones sobre la evaluación..."
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						></textarea>
					</div>

					<div class="flex justify-end space-x-4">
						<button
							type="button"
							onclick={resetForm}
							class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
						>
							Limpiar
						</button>
						<button
							type="submit"
							class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
						>
							Guardar Calificación
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Calificaciones Existentes -->
		<div>
			<h2 class="text-xl font-semibold text-white mb-4">Calificaciones Registradas</h2>
			<div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
				<table class="w-full">
					<thead class="bg-slate-800">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Alumno</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Materia</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nota</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fecha</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800">
						{#each data.existingGrades as grade}
							<tr class="hover:bg-slate-800/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-white">{grade.studentName}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{grade.subject}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">{grade.value}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{grade.gradeType}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{new Date(grade.gradedAt).toLocaleDateString()}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm">
									<button
										onclick={() => startEditGrade(grade)}
										class="rounded-xl bg-blue-500/20 px-3 py-1 text-blue-400 hover:bg-blue-500/30 transition-colors"
									>
										Editar
									</button>
								</td>
							</tr>
						{/each}
						{#if data.existingGrades.length === 0}
							<tr>
								<td colspan="6" class="px-6 py-8 text-center text-slate-400">
									No hay calificaciones registradas aún
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Modal de Edición de Calificación -->
{#if editingGrade}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div class="bg-slate-900 rounded-3xl border border-slate-800 p-8 max-w-md w-full">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h2 class="text-2xl font-bold text-white">Editar Calificación</h2>
					<p class="text-sm text-slate-400">{editingGrade.studentName} - {editingGrade.subject}</p>
				</div>
				<button
					onclick={cancelEditGrade}
					class="rounded-xl bg-slate-800 px-4 py-2 text-slate-400 hover:bg-slate-700 transition-colors"
				>
					Cancelar
				</button>
			</div>

			{#if editFormError}
				<div class="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
					{editFormError}
				</div>
			{/if}

			{#if editFormSuccess}
				<div class="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400">
					{editFormSuccess}
				</div>
			{/if}

			<form
				method="POST"
				action="?/editGrade"
				class="space-y-6"
			>
				<input type="hidden" name="gradeId" value={editingGrade.id} />

				<div>
					<label for="editGrade" class="mb-2 block text-sm font-medium text-slate-300">Nota (0-10)</label>
					<input
						id="editGrade"
						name="grade"
						type="number"
						min="0"
						max="10"
						step="0.01"
						bind:value={editGradeValue}
						placeholder="Ej: 7.5"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
				</div>

				<div>
					<label for="editEvaluationType" class="mb-2 block text-sm font-medium text-slate-300">Tipo de Evaluación</label>
					<select
						id="editEvaluationType"
						name="evaluationType"
						bind:value={editEvaluationType}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					>
						<option value="PARCIAL">Parcial</option>
						<option value="FINAL">Final</option>
						<option value="RECUPERATORIO">Recuperatorio</option>
						<option value="TRABAJO_PRACTICO">Trabajo Práctico</option>
						<option value="EXAMEN">Examen</option>
						<option value="OTRO">Otro</option>
					</select>
				</div>

				<div class="flex justify-end space-x-4">
					<button
						type="button"
						onclick={cancelEditGrade}
						class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-2xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
					>
						Guardar Cambios
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
