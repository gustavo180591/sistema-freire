<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	type CommunicationType = 'NOTE' | 'MEETING';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedStudent = $state('');
	let selectedType = $state<CommunicationType>('NOTE');
	let title = $state('');
	let description = $state('');
	let submitting = $state(false);

	function getCommunicationLabel(type: string): string {
		return type === 'MEETING' ? 'Reunión' : 'Nota';
	}
</script>

<svelte:head>
	<title>Comunicados y Documentación | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>

		<h1 class="mt-2 text-3xl font-bold">Comunicados y Documentación</h1>

		<p class="mt-2 text-slate-400">
			Registrar notas, reuniones y consultar documentación pendiente
		</p>
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
						selectedType = 'NOTE';
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
				<option value="NOTE"> Nota / Comunicado </option>

				<option value="MEETING"> Reunión </option>
			</select>
		</div>

		<div>
			<label for="title" class="mb-2 block text-sm font-medium text-slate-300"> Título </label>

			<input
				id="title"
				name="title"
				type="text"
				bind:value={title}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				placeholder="Título del comunicado..."
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
				placeholder="Describe el comunicado..."
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
				{submitting ? 'Registrando...' : 'Registrar Comunicado'}
			</button>
		</div>
	</form>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<div class="mb-4 flex items-center justify-between gap-4">
			<h2 class="text-xl font-semibold">Comunicados Recientes</h2>

			<span
				class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400"
			>
				{data.recentCommunications.length}
			</span>
		</div>

		<div class="space-y-3">
			{#each data.recentCommunications as communication}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="font-semibold text-white">
									{communication.title}
								</p>

								<span
									class="inline-flex items-center rounded-full bg-blue-950/50 px-2 py-0.5 text-xs text-blue-400"
								>
									{getCommunicationLabel(communication.type)}
								</span>
							</div>

							<p class="mt-1 text-sm text-slate-400">
								{communication.studentName}
								- DNI:
								{communication.studentDni}
							</p>

							<p class="mt-2 text-sm text-slate-300">
								{communication.description}
							</p>

							<p class="mt-2 text-xs text-slate-500">
								{new Date(communication.createdAt).toLocaleDateString('es-AR', {
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

			{#if data.recentCommunications.length === 0}
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-8 text-center">
					<p class="text-slate-400">No hay comunicados recientes dentro de tus sedes asignadas.</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<div class="mb-4 flex items-center justify-between gap-4">
			<h2 class="text-xl font-semibold">Documentación Pendiente de Verificación</h2>

			<span
				class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400"
			>
				{data.pendingDocuments.length}
			</span>
		</div>

		<div class="space-y-3">
			{#each data.pendingDocuments as document}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<p class="font-semibold text-white">
								{document.fileName}
							</p>

							<p class="mt-1 text-sm text-slate-400">
								{document.studentName}
								- DNI:
								{document.studentDni}
							</p>

							<p class="text-sm text-slate-400">
								Tipo: {document.documentType}
							</p>

							<p class="mt-2 text-xs text-slate-500">
								Subido:
								{new Date(document.uploadedAt).toLocaleDateString('es-AR', {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>

						<span
							class="inline-flex items-center rounded-full bg-amber-950/50 px-3 py-1 text-xs text-amber-400"
						>
							Pendiente
						</span>
					</div>
				</div>
			{/each}

			{#if data.pendingDocuments.length === 0}
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-8 text-center">
					<p class="text-slate-400">
						No hay documentación pendiente dentro de tus sedes asignadas.
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
