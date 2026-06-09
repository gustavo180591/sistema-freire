<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedSubject = $state<string>('');
	let selectedCommission = $state<string>('');
	let title = $state<string>('');
	let description = $state<string>('');
	let selectedType = $state<string>('PARCIAL');
	let evaluationDate = $state<string>('');
	let maxScore = $state<string>('10');
	let minPassingScore = $state<string>('6');
	let weight = $state<string>('1');
	let selectedParentEvaluation = $state<string>('');
	let formError = $state<string>('');
	let formSuccess = $state<string>('');

	function resetForm() {
		selectedSubject = '';
		selectedCommission = '';
		title = '';
		description = '';
		selectedType = 'PARCIAL';
		evaluationDate = '';
		maxScore = '10';
		minPassingScore = '6';
		weight = '1';
		selectedParentEvaluation = '';
		formError = '';
		formSuccess = '';
	}

	// Comisiones filtradas por materia seleccionada
	let filteredCommissions = $state<any[]>([]);
	let parentEvaluations = $state<any[]>([]);

	// Actualizar listas filtradas cuando cambia la materia
	$effect(() => {
		filteredCommissions = data.commissions.filter(
			(c) => !selectedSubject || c.subjectId === selectedSubject
		);
		parentEvaluations = data.evaluations.filter(
			(e) =>
				!selectedSubject || e.subject === data.subjects.find((s) => s.id === selectedSubject)?.name
		);
	});
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-white">Evaluaciones</h1>
			<p class="text-slate-400">Crear y gestionar exámenes y evaluaciones</p>
		</div>

		<!-- Formulario de Evaluación -->
		<div class="mb-8">
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="mb-6 text-xl font-semibold text-white">Nueva Evaluación</h2>

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

				<form method="POST" class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div>
							<label for="subject" class="mb-2 block text-sm font-medium text-slate-300"
								>Materia</label
							>
							<select
								id="subject"
								name="subjectId"
								bind:value={selectedSubject}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="">Seleccionar materia...</option>
								{#each data.subjects as subject}
									<option value={subject.id}>
										{subject.code} - {subject.name} ({subject.careers.join(', ')})
									</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="type" class="mb-2 block text-sm font-medium text-slate-300">Tipo</label>
							<select
								id="type"
								name="type"
								bind:value={selectedType}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								onchange={() => {
									// Resetear comisión si cambia tipo
									if (!['PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR'].includes(selectedType)) {
										selectedCommission = '';
									}
								}}
							>
								<option value="PARCIAL">Parcial</option>
								<option value="RECUPERATORIO">Recuperatorio</option>
								<option value="TRABAJO_PRACTICO">Trabajo Práctico</option>
								<option value="INTEGRADOR">Integrador</option>
								<option value="EXAMEN_FINAL">Examen Final</option>
								<option value="OTRO">Otro</option>
							</select>
						</div>
					</div>

					<div>
						<label for="title" class="mb-2 block text-sm font-medium text-slate-300">Título</label>
						<input
							id="title"
							name="title"
							type="text"
							bind:value={title}
							placeholder="Ej: Parcial Unidad 1"
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
							<label for="date" class="mb-2 block text-sm font-medium text-slate-300"
								>Fecha de Evaluación</label
							>
							<input
								id="date"
								name="evaluationDate"
								type="date"
								bind:value={evaluationDate}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>

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
					</div>

					<div class="grid gap-6 md:grid-cols-2">
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

						<div>
							<label for="weight" class="mb-2 block text-sm font-medium text-slate-300"
								>Peso en Promedio</label
							>
							<input
								id="weight"
								name="weight"
								type="number"
								min="0.01"
								step="0.01"
								bind:value={weight}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
					</div>

					{#if ['PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR'].includes(selectedType)}
						<div>
							<label for="commission" class="mb-2 block text-sm font-medium text-slate-300"
								>Comisión <span class="text-red-400">*</span></label
							>
							<select
								id="commission"
								name="commissionId"
								bind:value={selectedCommission}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								required
							>
								<option value="">Seleccionar comisión...</option>
								{#each filteredCommissions as commission}
									<option value={commission.id}>
										{commission.code} - {commission.subjectName} ({commission.academicTerm})
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
								bind:value={selectedParentEvaluation}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								required
							>
								<option value="">Seleccionar evaluación original...</option>
								{#each parentEvaluations as parent}
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
							class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
						>
							Crear Evaluación
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Evaluaciones Existentes -->
		<div>
			<h2 class="mb-4 text-xl font-semibold text-white">Evaluaciones Creadas</h2>
			<div class="space-y-4">
				{#each data.evaluations as evaluation}
					<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-2">
									<span
										class="rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-300"
										>{evaluation.type}</span
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
								<p class="text-sm text-slate-400">Peso: {evaluation.weight}</p>
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
						<p class="text-xs text-slate-500">Creado por {evaluation.creatorName}</p>
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
