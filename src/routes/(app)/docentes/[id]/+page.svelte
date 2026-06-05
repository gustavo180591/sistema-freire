<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let assigningSubject = $state(false);
	let removingSubject = $state<{ subjectId: string; subjectName: string } | null>(null);
	let selectedSubjectId = $state('');

	interface Subject {
		id: string;
		code: string;
		name: string;
		yearLevel: number;
		careers: Array<{ name: string }>;
	}

	interface AssignedSubject extends Subject {
		subjectId: string;
		teacherId: string;
	}

	// Asignar materia
	async function assignSubject() {
		if (!selectedSubjectId) return;
		assigningSubject = true;
	}

	// Eliminar materia
	function confirmRemoveSubject(subject: AssignedSubject) {
		removingSubject = { subjectId: subject.subjectId, subjectName: subject.name };
	}

	// Volver a la lista
	function goBack() {
		goto('/docentes');
	}
</script>

<svelte:head>
	<title>Asignación de Materias | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<button onclick={goBack} class="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Volver a Docentes
			</button>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Gestión Académica</p>
			<h1 class="text-3xl font-bold tracking-tight">Asignación de Materias</h1>
			<p class="mt-2 text-sm text-slate-400">
				Docente: <span class="text-white font-medium">{data.teacher.lastName}, {data.teacher.firstName}</span>
			</p>
		</div>
	</div>

	<!-- Materias Asignadas -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="text-xl font-bold text-white mb-4">Materias Asignadas ({data.assignedSubjects.length})</h2>

		{#if data.assignedSubjects.length === 0}
			<div class="text-center py-8 text-slate-400">
				<p>Este docente no tiene materias asignadas</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.assignedSubjects as subject}
					<div class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
						<div class="flex-1">
							<div class="flex items-center gap-3">
								<span class="rounded-full bg-indigo-500/20 text-indigo-400 px-3 py-1 text-sm font-medium">
									{subject.code}
								</span>
								<div>
									<p class="text-white font-medium">{subject.name}</p>
									<p class="text-sm text-slate-400">
										Año {subject.yearLevel} · {subject.careers.map(c => c.name).join(', ')}
									</p>
								</div>
							</div>
						</div>
						<button
							onclick={() => confirmRemoveSubject(subject)}
							class="ml-4 rounded-xl bg-red-500/10 px-4 py-2 text-red-400 hover:bg-red-500/20 transition-colors"
						>
							Eliminar
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Asignar Nueva Materia -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="text-xl font-bold text-white mb-4">Asignar Nueva Materia</h2>

		{#if data.availableSubjects.length === 0}
			<div class="text-center py-8 text-slate-400">
				<p>No hay materias disponibles para asignar</p>
			</div>
		{:else}
			<form
				method="POST"
				action="?/assignSubject"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						assigningSubject = false;
						selectedSubjectId = '';
					};
				}}
			>
				<input type="hidden" name="teacherId" value={data.teacher.id} />

				<div class="mb-4">
					<label for="subjectSelect" class="mb-2 block text-sm font-medium text-slate-300">Seleccionar Materia</label>
					<select
						id="subjectSelect"
						bind:value={selectedSubjectId}
						name="subjectId"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 transition outline-none focus:border-slate-500"
						required
					>
						<option value="">-- Seleccionar materia --</option>
						{#each data.availableSubjects as subject}
							<option value={subject.id}>
								{subject.code} - {subject.name} (Año {subject.yearLevel})
							</option>
						{/each}
					</select>
				</div>

				<button
					type="submit"
					disabled={!selectedSubjectId || assigningSubject}
					class="rounded-2xl bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{assigningSubject ? 'Asignando...' : 'Asignar Materia'}
				</button>
			</form>
		{/if}
	</div>

	<!-- Mensajes de éxito/error -->
	{#if form?.success}
		<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
			{form.success}
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
			{form.error}
		</div>
	{/if}
</div>

<!-- Modal de Confirmación de Eliminación -->
{#if removingSubject}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div class="bg-slate-900 rounded-3xl border border-slate-800 p-8 max-w-md w-full">
			<div class="flex items-center space-x-4 mb-6">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
					<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-bold text-white">Eliminar Materia</h2>
					<p class="text-sm text-slate-400">Esta acción no se puede deshacer</p>
				</div>
			</div>

			<div class="bg-slate-800/50 rounded-2xl p-4 mb-6">
				<p class="text-white font-medium">{removingSubject.subjectName}</p>
			</div>

			<form
				method="POST"
				action="?/removeSubject"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						removingSubject = null;
					};
				}}
			>
				<input type="hidden" name="subjectId" value={removingSubject.subjectId} />
				<input type="hidden" name="teacherId" value={data.teacher.id} />

				<div class="flex justify-end space-x-4">
					<button
						type="button"
						onclick={() => removingSubject = null}
						class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-2xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600"
					>
						Eliminar Materia
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
