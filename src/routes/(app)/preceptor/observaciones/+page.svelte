<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	type ObservationType = 'OBSERVATION' | 'WARNING' | 'INTERVIEW' | 'ACHIEVEMENT' | 'NOTE';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedStudent = $state('');
	let selectedType = $state<ObservationType>('OBSERVATION');
	let title = $state('');
	let description = $state('');
	let submitting = $state(false);

	function getTypeLabel(type: string): string {
		switch (type) {
			case 'OBSERVATION':
				return 'Observación';
			case 'WARNING':
				return 'Alerta';
			case 'INTERVIEW':
				return 'Entrevista';
			case 'ACHIEVEMENT':
				return 'Logro';
			case 'NOTE':
				return 'Nota';
			default:
				return type;
		}
	}
</script>

<svelte:head>
	<title>Observaciones de Estudiantes | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>

		<h1 class="mt-2 text-3xl font-bold">Observaciones de Estudiantes</h1>

		<p class="mt-2 text-slate-400">Registrar seguimiento y observaciones</p>
	</div>

	{#if form?.error}
		<div class="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-emerald-400">
			{form.success}
		</div>
	{/if}

	<form
		method="POST"
		class="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
		use:enhance={() => {
			submitting = true;

			return async ({ result, update }) => {
				try {
					if (result.type === 'success') {
						selectedStudent = '';
						selectedType = 'OBSERVATION';
						title = '';
						description = '';
					}

					await update();
				} finally {
					submitting = false;
				}
			};
		}}
	>
		<div>
			<label for="studentId" class="mb-2 block text-sm font-medium text-slate-300">
				Estudiante
			</label>

			<select
				id="studentId"
				name="studentId"
				bind:value={selectedStudent}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				required
				disabled={submitting}
			>
				<option value=""> Seleccionar estudiante </option>

				{#each data.students as student}
					<option value={student.id}>
						{student.lastName},
						{student.firstName}
						- {student.dni}
					</option>
				{/each}
			</select>

			{#if data.students.length === 0}
				<p class="mt-2 text-sm text-amber-400">
					No hay alumnos activos disponibles dentro de tus sedes asignadas.
				</p>
			{/if}
		</div>

		<div>
			<label for="type" class="mb-2 block text-sm font-medium text-slate-300"> Tipo </label>

			<select
				id="type"
				name="type"
				bind:value={selectedType}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				required
				disabled={submitting}
			>
				<option value="OBSERVATION"> Observación </option>

				<option value="WARNING"> Alerta </option>

				<option value="INTERVIEW"> Entrevista </option>

				<option value="ACHIEVEMENT"> Logro </option>

				<option value="NOTE"> Nota </option>
			</select>

			<p class="mt-2 text-xs text-slate-500">
				Las alertas se registran como seguimientos destacados.
			</p>
		</div>

		<div>
			<label for="title" class="mb-2 block text-sm font-medium text-slate-300"> Título </label>

			<input
				id="title"
				name="title"
				type="text"
				bind:value={title}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				placeholder="Título de la observación..."
				required
				disabled={submitting}
			/>
		</div>

		<div>
			<label for="description" class="mb-2 block text-sm font-medium text-slate-300">
				Descripción
			</label>

			<textarea
				id="description"
				name="description"
				bind:value={description}
				rows="5"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				placeholder="Describe la observación o seguimiento..."
				required
				disabled={submitting}
			></textarea>
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={submitting || data.students.length === 0}
				class="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{submitting ? 'Registrando...' : 'Registrar Observación'}
			</button>
		</div>
	</form>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<div class="mb-4 flex items-center justify-between gap-4">
			<h2 class="text-xl font-semibold">Observaciones Recientes</h2>

			<span
				class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400"
			>
				{data.recentFollowUps.length}
			</span>
		</div>

		<div class="space-y-3">
			{#each data.recentFollowUps as followUp}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="font-semibold text-white">
									{followUp.title}
								</p>

								{#if followUp.type === 'WARNING'}
									<span
										class="inline-flex items-center rounded-full bg-red-950/50 px-2 py-0.5 text-xs text-red-400"
									>
										Alerta
									</span>
								{:else if followUp.type === 'ACHIEVEMENT'}
									<span
										class="inline-flex items-center rounded-full bg-emerald-950/50 px-2 py-0.5 text-xs text-emerald-400"
									>
										Logro
									</span>
								{:else}
									<span
										class="inline-flex items-center rounded-full bg-blue-950/50 px-2 py-0.5 text-xs text-blue-400"
									>
										{getTypeLabel(followUp.type)}
									</span>
								{/if}

								{#if followUp.resolved}
									<span
										class="inline-flex items-center rounded-full bg-emerald-950/50 px-2 py-0.5 text-xs text-emerald-400"
									>
										Resuelto
									</span>
								{/if}
							</div>

							<p class="mt-1 text-sm text-slate-400">
								{followUp.studentName}
								- DNI:
								{followUp.studentDni}
							</p>

							<p class="mt-2 text-sm text-slate-300">
								{followUp.description}
							</p>

							<p class="mt-2 text-xs text-slate-500">
								{new Date(followUp.createdAt).toLocaleDateString('es-AR', {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>
					</div>
				</div>
			{/each}

			{#if data.recentFollowUps.length === 0}
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-8 text-center">
					<p class="text-slate-400">
						No hay observaciones recientes dentro de tus sedes asignadas.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex justify-start">
		<a
			href="/preceptor"
			class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800"
		>
			← Volver al panel
		</a>
	</div>
</div>
