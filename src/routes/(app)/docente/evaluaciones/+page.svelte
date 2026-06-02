<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedSubject = $state<string>('');
	let title = $state<string>('');
	let description = $state<string>('');
	let selectedType = $state<string>('PARCIAL');
	let date = $state<string>('');
	let maxScore = $state<string>('10');
	let formError = $state<string>('');
	let formSuccess = $state<string>('');

	function resetForm() {
		selectedSubject = '';
		title = '';
		description = '';
		selectedType = 'PARCIAL';
		date = '';
		maxScore = '10';
		formError = '';
		formSuccess = '';
	}
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">Evaluaciones</h1>
			<p class="text-slate-400">Crear y gestionar exámenes y evaluaciones</p>
		</div>

		<!-- Formulario de Evaluación -->
		<div class="mb-8">
			<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
				<h2 class="text-xl font-semibold text-white mb-6">Nueva Evaluación</h2>

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
							>
								<option value="PARCIAL">Parcial</option>
								<option value="FINAL">Final</option>
								<option value="RECUPERATORIO">Recuperatorio</option>
								<option value="TRABAJO_PRACTICO">Trabajo Práctico</option>
								<option value="EXAMEN">Examen</option>
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
						<label for="description" class="mb-2 block text-sm font-medium text-slate-300">Descripción (opcional)</label>
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
							<label for="date" class="mb-2 block text-sm font-medium text-slate-300">Fecha (opcional)</label>
							<input
								id="date"
								name="date"
								type="date"
								bind:value={date}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>

						<div>
							<label for="maxScore" class="mb-2 block text-sm font-medium text-slate-300">Puntaje Máximo</label>
							<input
								id="maxScore"
								name="maxScore"
								type="number"
								min="1"
								step="0.5"
								bind:value={maxScore}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
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
							Crear Evaluación
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Evaluaciones Existentes -->
		<div>
			<h2 class="text-xl font-semibold text-white mb-4">Evaluaciones Creadas</h2>
			<div class="space-y-4">
				{#each data.evaluations as evaluation}
					<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-2">
									<span class="px-2 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">{evaluation.type}</span>
								</div>
								<h3 class="font-semibold text-white">{evaluation.title}</h3>
								<p class="text-sm text-slate-400">{evaluation.subject}</p>
								{#if evaluation.description}
									<p class="mt-2 text-slate-300">{evaluation.description}</p>
								{/if}
							</div>
							<div class="text-right">
								<p class="text-sm text-slate-400">Puntaje: {evaluation.maxScore}</p>
								{#if evaluation.date}
									<p class="text-sm text-slate-400">{new Date(evaluation.date).toLocaleDateString()}</p>
								{/if}
								<p class="text-xs text-slate-500">{new Date(evaluation.createdAt).toLocaleDateString()}</p>
							</div>
						</div>
						<p class="text-xs text-slate-500">Creado por {evaluation.creatorName}</p>
					</div>
				{/each}
				{#if data.evaluations.length === 0}
					<div class="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
						No hay evaluaciones creadas aún
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
