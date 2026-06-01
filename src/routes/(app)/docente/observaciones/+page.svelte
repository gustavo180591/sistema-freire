<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedStudent = $state<string>('');
	let selectedType = $state<string>('OBSERVATION');
	let title = $state<string>('');
	let description = $state<string>('');
	let isAlert = $state<boolean>(false);
	let formError = $state<string>('');
	let formSuccess = $state<string>('');

	function resetForm() {
		selectedStudent = '';
		selectedType = 'OBSERVATION';
		title = '';
		description = '';
		isAlert = false;
		formError = '';
		formSuccess = '';
	}
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">Observaciones Académicas</h1>
			<p class="text-slate-400">Registrar desempeño y notas académicas de tus alumnos</p>
		</div>

		<!-- Formulario de Observación -->
		<div class="mb-8">
			<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
				<h2 class="text-xl font-semibold text-white mb-6">Nueva Observación</h2>

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
							<label for="type" class="mb-2 block text-sm font-medium text-slate-300">Tipo</label>
							<select
								id="type"
								name="type"
								bind:value={selectedType}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="OBSERVATION">Observación</option>
								<option value="NOTE">Nota</option>
								<option value="ACHIEVEMENT">Logro</option>
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
							placeholder="Ej: Buen desempeño en clase"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
					</div>

					<div>
						<label for="description" class="mb-2 block text-sm font-medium text-slate-300">Descripción</label>
						<textarea
							id="description"
							name="description"
							bind:value={description}
							rows="4"
							placeholder="Detalles de la observación..."
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						></textarea>
					</div>

					<div>
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								name="isAlert"
								bind:checked={isAlert}
								class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-red-500 focus:ring-red-500"
							/>
							<span class="text-sm text-slate-300">Marcar como alerta importante</span>
						</label>
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
							Guardar Observación
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Observaciones Recientes -->
		<div>
			<h2 class="text-xl font-semibold text-white mb-4">Observaciones Registradas</h2>
			<div class="space-y-4">
				{#each data.recentObservations as observation}
					<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-2">
									{#if observation.isAlert}
										<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">ALERTA</span>
									{/if}
									<span class="px-2 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">{observation.type}</span>
								</div>
								<h3 class="font-semibold text-white">{observation.title}</h3>
								<p class="text-sm text-slate-400">{observation.studentName}</p>
							</div>
							<div class="text-right">
								<p class="text-sm text-slate-400">{new Date(observation.date).toLocaleDateString()}</p>
								<p class="text-xs text-slate-500">Por {observation.creatorName}</p>
							</div>
						</div>
						<p class="text-slate-300">{observation.description}</p>
					</div>
				{/each}
				{#if data.recentObservations.length === 0}
					<div class="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
						No hay observaciones registradas aún
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
