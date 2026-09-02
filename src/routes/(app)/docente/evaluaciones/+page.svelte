<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();
	type Evaluation = PageData['evaluations'][number];

	let selectedSubject = $state<string>('');
	let selectedCommission = $state<string>('');
	let selectedCareer = $state<string>('');
	let selectedLocation = $state<string>('');
	let title = $state<string>('');
	let description = $state<string>('');
	let selectedType = $state<string>('');
	let evaluationDate = $state<string>('');
	let maxScore = $state<string>('10');
	let minPassingScore = $state<string>('6');
	let gradingMode = $state<string>('NUMERIC');
	let participatesInAverage = $state(true);
	let mandatory = $state(true);
	let selectedParentEvaluation = $state<string>('');
	let viewingEvaluation = $state<Evaluation | null>(null);
	let editingEvaluation = $state<Evaluation | null>(null);

	function resetForm() {
		selectedSubject = '';
		selectedCommission = '';
		selectedCareer = '';
		selectedLocation = '';
		title = '';
		description = '';
		selectedType = '';
		evaluationDate = '';
		maxScore = '10';
		minPassingScore = '6';
		gradingMode = 'NUMERIC';
		participatesInAverage = true;
		mandatory = true;
		selectedParentEvaluation = '';
	}

	function dateInputValue(value: string | Date): string {
		return new Date(value).toISOString().slice(0, 10);
	}

	function getEvaluationTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			PARCIAL: 'Parcial',
			RECUPERATORIO: 'Recuperatorio',
			TRABAJO_PRACTICO: 'Trabajo práctico',
			INTEGRADOR: 'Integrador',
			EXAMEN_FINAL: 'Examen final',
			MESA_EXAMEN: 'Mesa de examen',
			OTRO: 'Otra instancia'
		};

		return labels[type] ?? type;
	}

	function deleteBlockedReason(evaluation: Evaluation): string {
		if (evaluation.isClosed) return 'Reabrí la evaluación antes de eliminarla';
		if (evaluation.gradeCount > 0) return 'No se puede eliminar porque tiene calificaciones';
		if (evaluation.hasRecovery) return 'No se puede eliminar porque tiene un recuperatorio';
		return 'Eliminar evaluación';
	}

	const evaluationTypeOptions = [
		{
			value: 'PARCIAL',
			label: 'Parcial',
			description: 'Evaluación parcial durante el desarrollo de la cursada.',
			group: 'CURSADA'
		},
		{
			value: 'RECUPERATORIO',
			label: 'Recuperatorio',
			description: 'Nueva oportunidad vinculada a una evaluación anterior.',
			group: 'CURSADA'
		},
		{
			value: 'TRABAJO_PRACTICO',
			label: 'Trabajo práctico',
			description: 'Trabajo o actividad práctica con calificación.',
			group: 'CURSADA'
		},
		{
			value: 'INTEGRADOR',
			label: 'Integrador',
			description: 'Evaluación que integra contenidos de la cursada.',
			group: 'CURSADA'
		},
		{
			value: 'EXAMEN_FINAL',
			label: 'Examen final',
			description: 'Evaluación final de la materia.',
			group: 'EXAMEN'
		},
		{
			value: 'MESA_EXAMEN',
			label: 'Mesa de examen',
			description: 'Instancia formal de mesa para rendir una materia.',
			group: 'EXAMEN'
		},
		{
			value: 'OTRO',
			label: 'Otra instancia',
			description: 'Evaluación que no corresponde a los tipos anteriores.',
			group: 'OTRO'
		}
	] as const;

	const courseTypes = ['PARCIAL', 'RECUPERATORIO', 'TRABAJO_PRACTICO', 'INTEGRADOR', 'OTRO'];
	const averageTypes = ['PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR'];

	// Comisiones filtradas por materia seleccionada
	let filteredCommissions = $state<any[]>([]);
	let filteredCareers = $state<any[]>([]);
	let filteredLocations = $state<any[]>([]);
	let parentEvaluations = $state<any[]>([]);

	// Actualizar listas filtradas cuando cambia la materia
	$effect(() => {
		filteredCommissions = data.commissions.filter(
			(c) => !selectedSubject || c.subjectId === selectedSubject
		);

		const subject = data.subjects.find((s) => s.id === selectedSubject);

		filteredCareers = subject?.careerOptions ?? [];

		const career = filteredCareers.find((c) => c.id === selectedCareer);

		filteredLocations = career
			? data.locations.filter((location) => career.locationIds.includes(location.id))
			: [];

		parentEvaluations = data.evaluations.filter(
			(e) =>
				e.subjectId === selectedSubject &&
				e.commissionId === selectedCommission &&
				['PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR'].includes(e.type) &&
				!e.hasRecovery
		);
	});

	$effect(() => {
		if (!courseTypes.includes(selectedType)) selectedCommission = '';
		if (!averageTypes.includes(selectedType) || gradingMode !== 'NUMERIC') {
			participatesInAverage = false;
		}
		if (averageTypes.includes(selectedType) && gradingMode === 'NUMERIC') {
			participatesInAverage = true;
		}
		if (selectedType !== 'RECUPERATORIO') selectedParentEvaluation = '';
	});
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-white">Evaluaciones</h1>
			<p class="text-slate-400">Definí cómo se califica cada instancia antes de cargar notas.</p>
		</div>

		<!-- Formulario de Evaluación -->
		<div class="mb-8">
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<div class="mb-6">
					<p class="text-xs font-semibold tracking-[0.15em] text-indigo-400 uppercase">
						Evaluaciones
					</p>

					<h2 class="mt-1 text-2xl font-semibold text-white">Nueva evaluación</h2>

					<p class="mt-2 max-w-3xl text-sm text-slate-400">
						Configurá la instancia evaluativa que deberán rendir los alumnos. Las mesas de examen
						habilitan una ventana de inscripción previa de 72 horas.
					</p>
				</div>

				{#if form && 'error' in form && form.error}
					<div class="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 p-4 text-red-400">
						{form.error}
					</div>
				{/if}

				{#if form && 'success' in form && form.success}
					<div
						class="mb-4 rounded-xl border border-green-500/50 bg-green-500/20 p-4 text-green-400"
					>
						{form.success}
					</div>
				{/if}

				<form method="POST" action="?/createEvaluation" class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div class="md:col-span-2">
							<label for="subject" class="mb-2 block text-sm font-medium text-slate-300"
								>Materia</label
							>
							<select
								id="subject"
								name="subjectId"
								value={selectedSubject}
								onchange={(event) => {
									selectedSubject = event.currentTarget.value;
									selectedCommission = '';
									selectedParentEvaluation = '';
								}}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="">Seleccionar materia...</option>
								{#each data.subjects as subject (subject.id)}
									<option value={subject.id}>
										{subject.code} - {subject.name} ({subject.careers.join(', ')})
									</option>
								{/each}
							</select>
						</div>

						<div class="md:col-span-2">
							<input type="hidden" name="type" value={selectedType} />

							<div class="rounded-2xl border border-indigo-900/70 bg-indigo-950/20 p-5">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<p class="text-sm font-semibold text-white">Tipo de instancia</p>
										<p class="mt-1 max-w-3xl text-sm text-slate-400">
											Las evaluaciones de cursada se gestionan dentro de la comisión. Solo las mesas
											de examen habilitan automáticamente una ventana de inscripción de 72 horas.
										</p>
									</div>

									<span
										class="w-fit shrink-0 rounded-full bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-300"
									>
										{selectedType === 'MESA_EXAMEN'
											? 'Inscripción · 72 hs'
											: 'Evaluación de cursada'}
									</span>
								</div>
							</div>

							{#if !selectedType}
								<div class="mt-4 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4">
									<p class="font-medium text-amber-300">Seleccioná qué instancia querés crear</p>
									<p class="mt-1 text-sm text-slate-400">
										Ningún tipo se selecciona automáticamente.
									</p>
								</div>
							{/if}

							<div class="mt-5 space-y-5">
								<div>
									<p class="mb-2 text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase">
										Evaluaciones de cursada
									</p>

									<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
										{#each evaluationTypeOptions.filter((option) => option.group === 'CURSADA') as option}
											<button
												type="button"
												aria-pressed={selectedType === option.value}
												onclick={() => (selectedType = option.value)}
												class="rounded-2xl border bg-slate-950 p-4 text-left transition hover:border-indigo-500"
												class:border-indigo-500={selectedType === option.value}
												class:ring-1={selectedType === option.value}
												class:ring-indigo-500={selectedType === option.value}
												class:border-slate-700={selectedType !== option.value}
											>
												<p class="font-semibold text-white">{option.label}</p>
												<p class="mt-1 text-xs text-slate-500">
													{option.description}
												</p>
											</button>
										{/each}
									</div>
								</div>

								<div>
									<p class="mb-2 text-xs font-semibold tracking-[0.15em] text-indigo-400 uppercase">
										Exámenes
									</p>

									<div class="grid gap-3 sm:grid-cols-2">
										{#each evaluationTypeOptions.filter((option) => option.group === 'EXAMEN') as option}
											<button
												type="button"
												aria-pressed={selectedType === option.value}
												onclick={() => (selectedType = option.value)}
												class="rounded-2xl border p-4 text-left transition hover:border-indigo-500 {selectedType ===
												option.value
													? 'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500'
													: 'border-slate-700 bg-slate-950'}"
											>
												<div class="flex items-start justify-between gap-3">
													<div>
														<p class="font-semibold text-white">
															{option.label}
														</p>
														<p class="mt-1 text-sm text-slate-400">
															{option.description}
														</p>
													</div>
												</div>
											</button>
										{/each}
									</div>
								</div>

								<div>
									{#each evaluationTypeOptions.filter((option) => option.group === 'OTRO') as option}
										<button
											type="button"
											aria-pressed={selectedType === option.value}
											onclick={() => (selectedType = option.value)}
											class="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-indigo-500 hover:text-white"
											class:border-indigo-500={selectedType === option.value}
										>
											{option.label}
										</button>
									{/each}
								</div>
							</div>
						</div>

						<div>
							<label for="title" class="mb-2 block text-sm font-medium text-slate-300">Título</label
							>
							<input
								id="title"
								name="title"
								type="text"
								bind:value={title}
								placeholder="Ej: Primer parcial, Recuperatorio Unidad 2, Mesa de agosto..."
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>

						<div>
							<label for="description" class="mb-2 block text-sm font-medium text-slate-300"
								>Descripción (opcional)</label
							>
							<textarea
								id="description"
								name="description"
								bind:value={description}
								rows="3"
								placeholder="Detalles de la evaluación..."
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							></textarea>
						</div>

						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="gradingMode" class="mb-2 block text-sm font-medium text-slate-300">
									Modalidad de calificación
								</label>
								<select
									id="gradingMode"
									name="gradingMode"
									bind:value={gradingMode}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								>
									<option value="NUMERIC">Numérica</option>
									<option value="QUALITATIVE">Cualitativa (AP/DES)</option>
								</select>
							</div>

							<div>
								<label for="date" class="mb-2 block text-sm font-medium text-slate-300">
									Fecha y hora de la evaluación
								</label>
								<input
									id="date"
									name="evaluationDate"
									type="datetime-local"
									bind:value={evaluationDate}
									required
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>

								{#if selectedType === 'MESA_EXAMEN'}
									<div
										class="mt-3 rounded-xl border border-indigo-800/60 bg-indigo-950/30 p-3 text-sm text-indigo-300"
									>
										<strong>Inscripción de alumnos:</strong>
										al crear la mesa se abrirá automáticamente un período de
										<strong>72 horas exactas</strong>. La fecha de la mesa debe ser posterior al
										cierre de ese período.
									</div>
								{/if}
							</div>

							{#if gradingMode === 'NUMERIC'}
								<div>
									<label for="maxScore" class="mb-2 block text-sm font-medium text-slate-300"
										>Puntaje Máximo</label
									>
									<input
										id="maxScore"
										name="maxScore"
										type="number"
										min="1"
										step="0.01"
										bind:value={maxScore}
										class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									/>
								</div>
							{/if}
						</div>

						{#if gradingMode === 'NUMERIC'}
							<div>
								<div>
									<label for="minPassingScore" class="mb-2 block text-sm font-medium text-slate-300"
										>Nota Mínima de Aprobación</label
									>
									<input
										id="minPassingScore"
										name="minPassingScore"
										type="number"
										min="0"
										step="0.01"
										bind:value={minPassingScore}
										class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									/>
								</div>
							</div>
						{/if}

						<div
							class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2"
						>
							<label class="flex items-start gap-3 text-sm text-slate-300">
								<input name="mandatory" type="checkbox" bind:checked={mandatory} class="mt-1" />
								<span
									><strong class="block text-white">Instancia obligatoria</strong>Debe completarse
									para cerrar la cursada.</span
								>
							</label>
							<label
								class="flex items-start gap-3 text-sm text-slate-300"
								class:opacity-50={!averageTypes.includes(selectedType) || gradingMode !== 'NUMERIC'}
							>
								<input
									name="participatesInAverage"
									type="checkbox"
									bind:checked={participatesInAverage}
									disabled={!averageTypes.includes(selectedType) || gradingMode !== 'NUMERIC'}
									class="mt-1"
								/>
								<span
									><strong class="block text-white">Integra el promedio</strong>El promedio de
									cursada es aritmético, sin pesos.</span
								>
							</label>
						</div>

						{#if courseTypes.includes(selectedType)}
							<div>
								<label for="commission" class="mb-2 block text-sm font-medium text-slate-300"
									>Comisión <span class="text-red-400">*</span></label
								>
								<select
									id="commission"
									name="commissionId"
									value={selectedCommission}
									onchange={(event) => {
										selectedCommission = event.currentTarget.value;
										selectedParentEvaluation = '';
									}}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									required
								>
									<option value="">Seleccionar comisión...</option>
									{#each filteredCommissions as commission (commission.id)}
										<option value={commission.id}>
											{commission.code} · {commission.career} · {commission.location} ({commission.academicTerm})
										</option>
									{/each}
								</select>
							</div>
						{/if}

						{#if selectedType === 'RECUPERATORIO'}
							<div>
								<label for="parentEvaluation" class="mb-2 block text-sm font-medium text-slate-300"
									>Evaluación Original <span class="text-red-400">*</span></label
								>
								<select
									id="parentEvaluation"
									name="parentEvaluationId"
									value={selectedParentEvaluation}
									onchange={(event) => {
										selectedParentEvaluation = event.currentTarget.value;
										const parent = parentEvaluations.find(
											(evaluation) => evaluation.id === selectedParentEvaluation
										);
										if (parent) gradingMode = parent.gradingMode;
									}}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									required
								>
									<option value="">Seleccionar evaluación original...</option>
									{#each parentEvaluations as parent (parent.id)}
										<option value={parent.id}>
											{parent.title} ({parent.type}) - {new Date(
												parent.evaluationDate
											).toLocaleDateString()}
										</option>
									{/each}
								</select>
							</div>
						{/if}

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
								disabled={!selectedType}
								class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
							>
								Crear evaluación
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>

		<!-- Evaluaciones Existentes -->
		<div>
			<h2 class="mb-4 text-xl font-semibold text-white">Evaluaciones Creadas</h2>
			<div class="space-y-4">
				{#each data.evaluations as evaluation (evaluation.id)}
					<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-2">
									<span
										class="rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-300"
										>{getEvaluationTypeLabel(evaluation.type)}</span
									>
									{#if evaluation.isClosed}
										<span
											class="rounded-full bg-red-900/50 px-2 py-1 text-xs font-semibold text-red-400"
											>Cerrada</span
										>
									{/if}
									{#if evaluation.commission}
										<span
											class="rounded-full bg-blue-900/50 px-2 py-1 text-xs font-semibold text-blue-400"
											>{evaluation.commission}</span
										>
									{/if}
								</div>
								<h3 class="font-semibold text-white">{evaluation.title}</h3>
								<p class="text-sm text-slate-400">{evaluation.subject}</p>
								{#if evaluation.description}
									<p class="mt-2 text-slate-300">{evaluation.description}</p>
								{/if}
								{#if evaluation.parentEvaluationTitle}
									<p class="mt-1 text-xs text-slate-500">
										Recuperatorio de: {evaluation.parentEvaluationTitle}
									</p>
								{/if}
							</div>
							<div class="text-right">
								<p class="text-sm text-slate-400">
									Puntaje: {evaluation.maxScore} (mín: {evaluation.minPassingScore})
								</p>
								<p class="text-sm text-slate-400">
									{evaluation.gradingMode === 'QUALITATIVE' ? 'AP/DES' : 'Numérica'} ·
									{evaluation.participatesInAverage ? 'Integra promedio' : 'No integra promedio'}
								</p>
								{#if evaluation.evaluationDate}
									<p class="text-sm text-slate-400">
										{new Date(evaluation.evaluationDate).toLocaleDateString()}
									</p>
								{/if}
								{#if evaluation.closedAt}
									<p class="text-xs text-slate-500">
										Cerrada: {new Date(evaluation.closedAt).toLocaleDateString()}
									</p>
								{/if}
								<p class="text-xs text-slate-500">
									{new Date(evaluation.createdAt).toLocaleDateString()}
								</p>
							</div>
						</div>
						<div
							class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4"
						>
							<p class="text-xs text-slate-500">
								Creado por {evaluation.creatorName} · {evaluation.gradeCount}
								{evaluation.gradeCount === 1 ? 'calificación' : 'calificaciones'}
							</p>
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									onclick={() => (viewingEvaluation = evaluation)}
									class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
								>
									Ver
								</button>
								<form
									method="POST"
									action={evaluation.isClosed ? '?/reopenEvaluation' : '?/closeEvaluation'}
									onsubmit={(event) => {
										const action = evaluation.isClosed ? 'reabrir' : 'cerrar';
										if (!confirm(`¿Querés ${action} "${evaluation.title}"?`)) {
											event.preventDefault();
										}
									}}
								>
									<input type="hidden" name="evaluationId" value={evaluation.id} />
									<button
										type="submit"
										class="rounded-xl border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-950/40"
									>
										{evaluation.isClosed ? 'Reabrir' : 'Cerrar'}
									</button>
								</form>
								<button
									type="button"
									onclick={() => (editingEvaluation = evaluation)}
									disabled={evaluation.isClosed}
									title={evaluation.isClosed
										? 'Reabrí la evaluación antes de editarla'
										: 'Editar evaluación'}
									class="rounded-xl border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-950/40 disabled:cursor-not-allowed disabled:opacity-40"
								>
									Editar
								</button>
								<form
									method="POST"
									action="?/deleteEvaluation"
									onsubmit={(event) => {
										if (!confirm(`¿Eliminar definitivamente "${evaluation.title}"?`)) {
											event.preventDefault();
										}
									}}
								>
									<input type="hidden" name="evaluationId" value={evaluation.id} />
									<button
										type="submit"
										disabled={!evaluation.canDelete}
										title={deleteBlockedReason(evaluation)}
										class="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
									>
										Eliminar
									</button>
								</form>
							</div>
						</div>
					</div>
				{/each}
				{#if data.evaluations.length === 0}
					<div
						class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400"
					>
						No hay evaluaciones creadas aún
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

{#if viewingEvaluation}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/75"
			onclick={() => (viewingEvaluation = null)}
			aria-label="Cerrar detalle"
		></button>
		<div
			class="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="evaluation-detail-title"
		>
			<div class="mb-6 flex items-start justify-between gap-4">
				<div>
					<p class="text-sm font-semibold tracking-wider text-blue-400 uppercase">
						Detalle de la evaluación
					</p>
					<h2 id="evaluation-detail-title" class="mt-1 text-2xl font-bold text-white">
						{viewingEvaluation.title}
					</h2>
				</div>
				<button
					type="button"
					onclick={() => (viewingEvaluation = null)}
					class="rounded-xl border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
					aria-label="Cerrar"
				>
					✕
				</button>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl bg-slate-950 p-4">
					<p class="text-xs text-slate-500 uppercase">Materia</p>
					<p class="mt-1 font-medium text-white">{viewingEvaluation.subject}</p>
				</div>
				<div class="rounded-2xl bg-slate-950 p-4">
					<p class="text-xs text-slate-500 uppercase">Comisión</p>
					<p class="mt-1 font-medium text-white">
						{viewingEvaluation.commission || 'Sin comisión'}
					</p>
				</div>
				<div class="rounded-2xl bg-slate-950 p-4">
					<p class="text-xs text-slate-500 uppercase">Tipo y modalidad</p>
					<p class="mt-1 font-medium text-white">
						{viewingEvaluation.type} · {viewingEvaluation.gradingMode === 'QUALITATIVE'
							? 'Cualitativa'
							: 'Numérica'}
					</p>
				</div>
				<div class="rounded-2xl bg-slate-950 p-4">
					<p class="text-xs text-slate-500 uppercase">Fecha</p>
					<p class="mt-1 font-medium text-white">
						{new Date(viewingEvaluation.evaluationDate).toLocaleDateString('es-AR')}
					</p>
				</div>
				<div class="rounded-2xl bg-slate-950 p-4">
					<p class="text-xs text-slate-500 uppercase">Escala</p>
					<p class="mt-1 font-medium text-white">
						Máximo {viewingEvaluation.maxScore} · Aprueba con {viewingEvaluation.minPassingScore}
					</p>
				</div>
				<div class="rounded-2xl bg-slate-950 p-4">
					<p class="text-xs text-slate-500 uppercase">Estado</p>
					<p
						class="mt-1 font-medium"
						class:text-red-400={viewingEvaluation.isClosed}
						class:text-green-400={!viewingEvaluation.isClosed}
					>
						{viewingEvaluation.isClosed ? 'Cerrada' : 'Abierta'}
					</p>
				</div>
			</div>

			{#if viewingEvaluation.description}
				<div class="mt-4 rounded-2xl border border-slate-800 p-4">
					<p class="text-xs text-slate-500 uppercase">Descripción</p>
					<p class="mt-2 whitespace-pre-line text-slate-300">{viewingEvaluation.description}</p>
				</div>
			{/if}

			<div class="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
				<p>{viewingEvaluation.mandatory ? 'Obligatoria' : 'No obligatoria'}</p>
				<p>
					{viewingEvaluation.participatesInAverage
						? 'Integra el promedio'
						: 'No integra el promedio'}
				</p>
				<p>
					{viewingEvaluation.gradeCount}
					{viewingEvaluation.gradeCount === 1 ? 'calificación' : 'calificaciones'}
				</p>
				<p>Creada por {viewingEvaluation.creatorName}</p>
				{#if viewingEvaluation.parentEvaluationTitle}
					<p class="sm:col-span-2">Recuperatorio de: {viewingEvaluation.parentEvaluationTitle}</p>
				{/if}
			</div>

			<div class="mt-6 flex justify-end gap-3">
				{#if !viewingEvaluation.isClosed}
					<button
						type="button"
						onclick={() => {
							editingEvaluation = viewingEvaluation;
							viewingEvaluation = null;
						}}
						class="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-500"
					>
						Editar
					</button>
				{/if}
				<button
					type="button"
					onclick={() => (viewingEvaluation = null)}
					class="rounded-xl border border-slate-700 px-5 py-2.5 font-semibold text-white hover:bg-slate-800"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}

{#if editingEvaluation}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/75"
			onclick={() => (editingEvaluation = null)}
			aria-label="Cancelar edición"
		></button>
		<div
			class="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="evaluation-edit-title"
		>
			<div class="mb-6 flex items-start justify-between gap-4">
				<div>
					<p class="text-sm font-semibold tracking-wider text-blue-400 uppercase">
						Editar evaluación
					</p>
					<h2 id="evaluation-edit-title" class="mt-1 text-2xl font-bold text-white">
						{editingEvaluation.title}
					</h2>
				</div>
				<button
					type="button"
					onclick={() => (editingEvaluation = null)}
					class="rounded-xl border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
					aria-label="Cerrar"
				>
					✕
				</button>
			</div>

			<div class="mb-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
				<p>{editingEvaluation.subject} · {editingEvaluation.commission || 'Sin comisión'}</p>
				<p>
					{editingEvaluation.type} · {editingEvaluation.gradingMode === 'QUALITATIVE'
						? 'Cualitativa'
						: 'Numérica'}
				</p>
				<p class="mt-2 text-xs text-slate-500">
					La materia, comisión, tipo y modalidad identifican la evaluación y no se modifican aquí.
				</p>
			</div>

			{#if editingEvaluation.gradeCount > 0}
				<div
					class="mb-5 rounded-2xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-300"
				>
					Ya tiene calificaciones. La escala y su participación en el promedio quedan protegidas.
				</div>
			{/if}

			<form method="POST" action="?/updateEvaluation" class="space-y-5">
				<input type="hidden" name="evaluationId" value={editingEvaluation.id} />
				<div>
					<label for="edit-title" class="mb-2 block text-sm font-medium text-slate-300"
						>Título</label
					>
					<input
						id="edit-title"
						name="title"
						type="text"
						value={editingEvaluation.title}
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
					/>
				</div>
				<div>
					<label for="edit-description" class="mb-2 block text-sm font-medium text-slate-300"
						>Descripción</label
					>
					<textarea
						id="edit-description"
						name="description"
						rows="3"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
						>{editingEvaluation.description || ''}</textarea
					>
				</div>
				<div>
					<label for="edit-date" class="mb-2 block text-sm font-medium text-slate-300">Fecha</label>
					<input
						id="edit-date"
						name="evaluationDate"
						type="date"
						value={dateInputValue(editingEvaluation.evaluationDate)}
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
					/>
				</div>

				{#if editingEvaluation.gradingMode === 'NUMERIC'}
					<div class="grid gap-5 sm:grid-cols-2">
						<div>
							<label for="edit-max-score" class="mb-2 block text-sm font-medium text-slate-300"
								>Puntaje máximo</label
							>
							<input
								id="edit-max-score"
								name="maxScore"
								type="number"
								min="1"
								step="0.01"
								value={editingEvaluation.maxScore}
								readonly={editingEvaluation.gradeCount > 0}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none read-only:cursor-not-allowed read-only:opacity-60 focus:border-blue-500"
							/>
						</div>
						<div>
							<label for="edit-min-score" class="mb-2 block text-sm font-medium text-slate-300"
								>Nota mínima</label
							>
							<input
								id="edit-min-score"
								name="minPassingScore"
								type="number"
								min="0"
								step="0.01"
								value={editingEvaluation.minPassingScore}
								readonly={editingEvaluation.gradeCount > 0}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none read-only:cursor-not-allowed read-only:opacity-60 focus:border-blue-500"
							/>
						</div>
					</div>
				{:else}
					<input type="hidden" name="maxScore" value={editingEvaluation.maxScore} />
					<input type="hidden" name="minPassingScore" value={editingEvaluation.minPassingScore} />
				{/if}

				<div class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2">
					<label class="flex items-start gap-3 text-sm text-slate-300">
						<input
							name="mandatory"
							type="checkbox"
							checked={editingEvaluation.mandatory}
							class="mt-1"
						/>
						<span
							><strong class="block text-white">Obligatoria</strong>Debe completarse para cerrar.</span
						>
					</label>
					{#if editingEvaluation.gradingMode === 'NUMERIC' && averageTypes.includes(editingEvaluation.type)}
						{#if editingEvaluation.gradeCount > 0 && editingEvaluation.participatesInAverage}
							<input type="hidden" name="participatesInAverage" value="on" />
						{/if}
						<label
							class="flex items-start gap-3 text-sm text-slate-300"
							class:opacity-50={editingEvaluation.gradeCount > 0}
						>
							<input
								name="participatesInAverage"
								type="checkbox"
								checked={editingEvaluation.participatesInAverage}
								disabled={editingEvaluation.gradeCount > 0}
								class="mt-1"
							/>
							<span
								><strong class="block text-white">Integra el promedio</strong>Se incluye en la
								cursada.</span
							>
						</label>
					{/if}
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (editingEvaluation = null)}
						class="rounded-xl border border-slate-700 px-5 py-2.5 font-semibold text-white hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-500"
					>
						Guardar cambios
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
