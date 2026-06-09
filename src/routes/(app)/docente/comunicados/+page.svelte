<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedStudent = $state<string>('');
	let selectedType = $state<string>('NOTE');
	let title = $state<string>('');
	let description = $state<string>('');
	let formError = $state<string>('');
	let formSuccess = $state<string>('');

	function resetForm() {
		selectedStudent = '';
		selectedType = 'NOTE';
		title = '';
		description = '';
		formError = '';
		formSuccess = '';
	}
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-white">Comunicados</h1>
			<p class="text-slate-400">Enviar avisos y comunicaciones a tus alumnos</p>
		</div>

		<!-- Formulario de Comunicado -->
		<div class="mb-8">
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="mb-6 text-xl font-semibold text-white">Nuevo Comunicado</h2>

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
							<label for="student" class="mb-2 block text-sm font-medium text-slate-300"
								>Alumno</label
							>
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
								<option value="NOTE">Nota</option>
								<option value="MEETING">Reunión</option>
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
							placeholder="Ej: Recordatorio de examen"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
					</div>

					<div>
						<label for="description" class="mb-2 block text-sm font-medium text-slate-300"
							>Mensaje</label
						>
						<textarea
							id="description"
							name="description"
							bind:value={description}
							rows="4"
							placeholder="Contenido del comunicado..."
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
							Enviar Comunicado
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Comunicados Recientes -->
		<div>
			<h2 class="mb-4 text-xl font-semibold text-white">Comunicados Enviados</h2>
			<div class="space-y-4">
				{#each data.recentCommunications as communication}
					<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-2">
									<span
										class="rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-300"
										>{communication.type}</span
									>
								</div>
								<h3 class="font-semibold text-white">{communication.title}</h3>
								<p class="text-sm text-slate-400">{communication.studentName}</p>
							</div>
							<div class="text-right">
								<p class="text-sm text-slate-400">
									{new Date(communication.date).toLocaleDateString()}
								</p>
								<p class="text-xs text-slate-500">Por {communication.creatorName}</p>
							</div>
						</div>
						<p class="text-slate-300">{communication.description}</p>
					</div>
				{/each}
				{#if data.recentCommunications.length === 0}
					<div
						class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400"
					>
						No hay comunicados enviados aún
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
