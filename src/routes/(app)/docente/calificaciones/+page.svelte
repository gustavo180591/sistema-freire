<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	type DraftGrade = {
		status: string;
		value: string;
		qualitativeValue: string;
		observations: string;
	};

	let selectedCommission = $state('');
	let selectedEvaluation = $state('');
	let studentGrades = $state<Record<string, DraftGrade>>({});

	const selectedEvaluationData = $derived(
		data.evaluations.find((evaluation) => evaluation.id === selectedEvaluation)
	);
	const selectedCommissionData = $derived(
		data.commissions.find((commission) => commission.id === selectedCommission)
	);
	const dirtyCount = $derived(Object.keys(studentGrades).length);

	$effect(() => {
		if (
			selectedEvaluation &&
			!data.evaluations.some(
				(evaluation) =>
					evaluation.id === selectedEvaluation && evaluation.commissionId === selectedCommission
			)
		) {
			selectedEvaluation = '';
		}
	});

	$effect(() => {
		if (selectedEvaluation !== undefined) studentGrades = {};
	});

	function getCommissionEvaluations(includeClosed = false) {
		if (!selectedCommission) return [];
		return data.evaluations.filter(
			(evaluation) =>
				evaluation.commissionId === selectedCommission && (includeClosed || !evaluation.isClosed)
		);
	}

	function getCommissionStudents() {
		if (!selectedCommission) return [];
		return data.students
			.filter((student) => student.commissionId === selectedCommission)
			.sort((a, b) =>
				`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es')
			);
	}

	function getExistingGrade(student: PageData['students'][number]) {
		if (!selectedEvaluation) return null;
		return data.existingGrades.find(
			(grade) =>
				grade.evaluationId === selectedEvaluation &&
				(grade.subjectEnrollmentId === student.enrollmentId ||
					(!grade.subjectEnrollmentId && grade.studentId === student.studentId))
		);
	}

	function getDraft(student: PageData['students'][number]): DraftGrade {
		const changed = studentGrades[student.enrollmentId];
		if (changed) return changed;

		const existing = getExistingGrade(student);
		return {
			status: existing?.status || 'PENDING',
			value:
				existing?.value === null || existing?.value === undefined ? '' : String(existing.value),
			qualitativeValue: existing?.qualitativeValue || '',
			observations: existing?.observations || ''
		};
	}

	function updateDraft(
		student: PageData['students'][number],
		field: keyof DraftGrade,
		value: string
	) {
		const current = { ...getDraft(student), [field]: value };
		if (field === 'status' && value !== 'PRESENT') {
			current.value = '';
			current.qualitativeValue = '';
		}
		studentGrades = { ...studentGrades, [student.enrollmentId]: current };
	}

	function markAllQualitativeApproved() {
		const updated = { ...studentGrades };
		for (const student of getCommissionStudents()) {
			updated[student.enrollmentId] = {
				...getDraft(student),
				status: 'PRESENT',
				value: '',
				qualitativeValue: 'APPROVED'
			};
		}
		studentGrades = updated;
	}

	function resetChanges() {
		studentGrades = {};
	}

	function statusLabel(status: string) {
		const labels: Record<string, string> = {
			PENDING: 'Pendiente',
			PRESENT: 'Calificado',
			ABSENT: 'Ausente',
			EXCUSED: 'Justificado'
		};
		return labels[status] || status;
	}
</script>

<svelte:head>
	<title>Cargar calificaciones | Sistema Freire</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-8">
			<p class="mb-2 text-sm font-semibold tracking-[0.2em] text-indigo-300 uppercase">
				Libro de cátedra
			</p>
			<h1 class="text-3xl font-bold">Carga de calificaciones</h1>
			<p class="mt-2 text-slate-400">
				Registrá borradores, notas numéricas, resultados AP/DES y ausencias por comisión.
			</p>
		</div>

		{#if form && 'error' in form && form.error}
			<div class="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
				<p class="font-semibold">No se guardaron los cambios</p>
				<p class="mt-1 text-sm">{form.error}</p>
				{#if 'errors' in form && form.errors}
					<ul class="mt-3 list-disc space-y-1 pl-5 text-sm">
						{#each form.errors as item (item.enrollmentId)}
							<li>{item.error}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		{#if form && 'success' in form && form.success}
			<div
				class="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200"
			>
				{form.success}
			</div>
		{/if}

		<section class="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
			<h2 class="text-xl font-semibold">Contexto de la carga</h2>
			<p class="mt-1 text-sm text-slate-400">
				Seleccioná expresamente la comisión y luego una evaluación abierta.
			</p>

			<div class="mt-6 grid gap-6 lg:grid-cols-2">
				<div>
					<label for="commission" class="mb-2 block text-sm font-medium text-slate-300">
						Comisión
					</label>
					<select
						id="commission"
						bind:value={selectedCommission}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
					>
						<option value="">Seleccionar comisión...</option>
						{#each data.commissions as commission (commission.id)}
							<option value={commission.id}>
								{commission.name} · {commission.subject} · {commission.career} · {commission.location}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="evaluation" class="mb-2 block text-sm font-medium text-slate-300">
						Evaluación abierta
					</label>
					<select
						id="evaluation"
						bind:value={selectedEvaluation}
						disabled={!selectedCommission}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="">Seleccionar evaluación...</option>
						{#each getCommissionEvaluations() as evaluation (evaluation.id)}
							<option value={evaluation.id}>
								{evaluation.title} · {evaluation.type} · {new Date(
									evaluation.evaluationDate
								).toLocaleDateString('es-AR')}
							</option>
						{/each}
					</select>
				</div>
			</div>

			{#if selectedCommissionData}
				<div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-2xl bg-slate-950 p-4">
						<p class="text-xs text-slate-500 uppercase">Sede</p>
						<p class="mt-1 font-semibold">{selectedCommissionData.location}</p>
					</div>
					<div class="rounded-2xl bg-slate-950 p-4">
						<p class="text-xs text-slate-500 uppercase">Carrera</p>
						<p class="mt-1 font-semibold">{selectedCommissionData.career}</p>
					</div>
					<div class="rounded-2xl bg-slate-950 p-4">
						<p class="text-xs text-slate-500 uppercase">Período</p>
						<p class="mt-1 font-semibold">{selectedCommissionData.academicTerm}</p>
					</div>
					<div class="rounded-2xl bg-slate-950 p-4">
						<p class="text-xs text-slate-500 uppercase">Alumnos activos</p>
						<p class="mt-1 text-2xl font-bold">{getCommissionStudents().length}</p>
					</div>
				</div>
			{/if}
		</section>

		{#if selectedCommission && getCommissionEvaluations().length === 0}
			<div class="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
				Esta comisión no tiene evaluaciones abiertas. Creá o reabrí una evaluación desde el módulo
				Evaluaciones.
			</div>
		{/if}

		{#if selectedEvaluationData}
			{@const students = getCommissionStudents()}
			<section class="mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
				<div
					class="flex flex-col gap-4 border-b border-slate-800 p-6 lg:flex-row lg:items-center lg:justify-between"
				>
					<div>
						<div class="flex flex-wrap items-center gap-2">
							<h2 class="text-xl font-semibold">{selectedEvaluationData.title}</h2>
							<span class="rounded-full bg-indigo-500/15 px-3 py-1 text-xs text-indigo-200">
								{selectedEvaluationData.gradingMode === 'QUALITATIVE' ? 'Cualitativa' : 'Numérica'}
							</span>
						</div>
						<p class="mt-2 text-sm text-slate-400">
							{selectedEvaluationData.subject} · {students.length} alumnos ·
							{new Date(selectedEvaluationData.evaluationDate).toLocaleDateString('es-AR')}
						</p>
					</div>
					<div class="flex flex-wrap gap-3">
						{#if selectedEvaluationData.gradingMode === 'QUALITATIVE'}
							<button
								type="button"
								onclick={markAllQualitativeApproved}
								class="rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
							>
								Marcar todos AP
							</button>
						{/if}
						<span class="rounded-xl bg-slate-950 px-4 py-2 text-sm text-slate-300">
							{dirtyCount} cambios
						</span>
					</div>
				</div>

				<form method="POST" action="?/loadGrades">
					<input type="hidden" name="evaluationId" value={selectedEvaluation} />

					<div class="overflow-x-auto">
						<table class="w-full min-w-[880px]">
							<thead class="bg-slate-950/80">
								<tr class="text-left text-xs tracking-wider text-slate-400 uppercase">
									<th class="px-5 py-4">Alumno</th>
									<th class="px-5 py-4">Estado</th>
									<th class="px-5 py-4">Resultado</th>
									<th class="px-5 py-4">Observaciones</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-800">
								{#each students as student (student.enrollmentId)}
									{@const draft = getDraft(student)}
									<tr class={studentGrades[student.enrollmentId] ? 'bg-indigo-500/5' : ''}>
										<td class="px-5 py-4">
											<p class="font-semibold">{student.lastName}, {student.firstName}</p>
											<p class="mt-1 text-xs text-slate-500">DNI {student.dni}</p>
											<input
												type="hidden"
												name={`grades[${student.enrollmentId}].dirty`}
												value={studentGrades[student.enrollmentId] ? 'true' : 'false'}
											/>
										</td>
										<td class="px-5 py-4">
											<label class="sr-only" for={`status-${student.enrollmentId}`}>
												Estado de {student.firstName}
												{student.lastName}
											</label>
											<select
												id={`status-${student.enrollmentId}`}
												name={`grades[${student.enrollmentId}].status`}
												value={draft.status}
												onchange={(event) =>
													updateDraft(student, 'status', event.currentTarget.value)}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-400"
											>
												{#each ['PENDING', 'PRESENT', 'ABSENT', 'EXCUSED'] as status (status)}
													<option value={status}>{statusLabel(status)}</option>
												{/each}
											</select>
										</td>
										<td class="px-5 py-4">
											{#if selectedEvaluationData.gradingMode === 'NUMERIC'}
												<label class="sr-only" for={`value-${student.enrollmentId}`}>
													Nota de {student.firstName}
													{student.lastName}
												</label>
												<input
													id={`value-${student.enrollmentId}`}
													name={`grades[${student.enrollmentId}].value`}
													type="number"
													min="0"
													max={Number(selectedEvaluationData.maxScore)}
													step="0.01"
													value={draft.value}
													disabled={draft.status !== 'PRESENT'}
													oninput={(event) =>
														updateDraft(student, 'value', event.currentTarget.value)}
													class="w-28 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400 disabled:opacity-40"
													placeholder="0,00"
												/>
											{:else}
												<label class="sr-only" for={`qualitative-${student.enrollmentId}`}>
													Resultado de {student.firstName}
													{student.lastName}
												</label>
												<select
													id={`qualitative-${student.enrollmentId}`}
													name={`grades[${student.enrollmentId}].qualitativeValue`}
													value={draft.qualitativeValue}
													disabled={draft.status !== 'PRESENT'}
													onchange={(event) =>
														updateDraft(student, 'qualitativeValue', event.currentTarget.value)}
													class="w-28 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400 disabled:opacity-40"
												>
													<option value="">Seleccionar</option>
													<option value="APPROVED">AP</option>
													<option value="FAILED">DES</option>
												</select>
											{/if}
										</td>
										<td class="px-5 py-4">
											<label class="sr-only" for={`observations-${student.enrollmentId}`}>
												Observaciones de {student.firstName}
												{student.lastName}
											</label>
											<input
												id={`observations-${student.enrollmentId}`}
												name={`grades[${student.enrollmentId}].observations`}
												type="text"
												value={draft.observations}
												oninput={(event) =>
													updateDraft(student, 'observations', event.currentTarget.value)}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-400"
												placeholder="Observación opcional"
											/>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div
						class="flex flex-col gap-3 border-t border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between"
					>
						<p class="text-sm text-slate-400">
							Solo se guardarán las filas marcadas como modificadas.
						</p>
						<div class="flex gap-3">
							<button
								type="button"
								onclick={resetChanges}
								disabled={dirtyCount === 0}
								class="rounded-xl border border-slate-700 px-5 py-3 font-semibold disabled:opacity-40"
							>
								Descartar cambios
							</button>
							<button
								type="submit"
								disabled={dirtyCount === 0}
								class="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
							>
								Guardar {dirtyCount} cambios
							</button>
						</div>
					</div>
				</form>
			</section>
		{/if}

		{#if selectedCommission && getCommissionEvaluations(true).some((evaluation) => evaluation.isClosed)}
			<section class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
				<h2 class="text-lg font-semibold">Evaluaciones cerradas</h2>
				<p class="mt-1 text-sm text-slate-400">
					Se muestran en modo consulta y no admiten cambios.
				</p>
				<div class="mt-4 grid gap-3 md:grid-cols-2">
					{#each getCommissionEvaluations(true).filter((evaluation) => evaluation.isClosed) as evaluation (evaluation.id)}
						<div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
							<p class="font-semibold">{evaluation.title}</p>
							<p class="mt-1 text-sm text-slate-400">
								{evaluation.type} · {new Date(evaluation.evaluationDate).toLocaleDateString(
									'es-AR'
								)}
							</p>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>
