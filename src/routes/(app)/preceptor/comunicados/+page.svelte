<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let selectedStudent = $state('');
	let selectedType = $state('NOTE');
	let title = $state('');
	let description = $state('');
</script>

<svelte:head>
	<title>Comunicados y Documentación | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>
		<h1 class="mt-2 text-3xl font-bold">Comunicados y Documentación</h1>
		<p class="mt-2 text-slate-400">Gestionar comunicados y ver documentación pendiente</p>
	</div>

	<!-- Formulario de Comunicado -->
	<form
		method="POST"
		class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6"
		use:enhance={() => {
			if (form?.success) {
				selectedStudent = '';
				title = '';
				description = '';
			}
		}}
	>
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

		<div>
			<label for="studentId" class="mb-2 block text-sm font-medium text-slate-300">Estudiante</label>
			<select
				id="studentId"
				name="studentId"
				bind:value={selectedStudent}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				required
			>
				<option value="">Seleccionar estudiante</option>
				{#each data.students as student}
					<option value={student.id}>
						{student.lastName}, {student.firstName} - {student.dni}
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
				required
			>
				<option value="NOTE">Nota/Comunicado</option>
				<option value="MEETING">Reunión</option>
			</select>
		</div>

		<div>
			<label for="title" class="mb-2 block text-sm font-medium text-slate-300">Título</label>
			<input
				id="title"
				name="title"
				type="text"
				bind:value={title}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				placeholder="Título del comunicado..."
				required
			/>
		</div>

		<div>
			<label for="description" class="mb-2 block text-sm font-medium text-slate-300">Descripción</label>
			<textarea
				id="description"
				name="description"
				bind:value={description}
				rows="5"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				placeholder="Describe el comunicado..."
				required
			></textarea>
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				class="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Enviar Comunicado
			</button>
		</div>
	</form>

	<!-- Comunicados Recientes -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Comunicados Recientes</h2>
		<div class="space-y-3">
			{#each data.recentCommunications as comm}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<p class="font-semibold text-white">{comm.title}</p>
								<span class="inline-flex items-center gap-1 rounded-full bg-blue-950/50 px-2 py-0.5 text-xs text-blue-400">
									{comm.type === 'MEETING' ? 'Reunión' : 'Nota'}
								</span>
							</div>
							<p class="text-sm text-slate-400 mt-1">
								{comm.studentName} - DNI: {comm.studentDni}
							</p>
							<p class="text-sm text-slate-300 mt-2">{comm.description}</p>
							<p class="text-xs text-slate-500 mt-2">
								{new Date(comm.createdAt).toLocaleDateString('es-AR', {
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
				<p class="text-center text-slate-400">No hay comunicados recientes</p>
			{/if}
		</div>
	</div>

	<!-- Documentación Pendiente -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Documentación Pendiente de Verificación</h2>
		<div class="space-y-3">
			{#each data.pendingDocuments as doc}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<p class="font-semibold text-white">{doc.fileName}</p>
							<p class="text-sm text-slate-400 mt-1">
								{doc.studentName} - DNI: {doc.studentDni}
							</p>
							<p class="text-sm text-slate-400">Tipo: {doc.documentType}</p>
							<p class="text-xs text-slate-500 mt-2">
								Subido: {new Date(doc.uploadedAt).toLocaleDateString('es-AR', {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>
						<span class="inline-flex items-center gap-1 rounded-full bg-amber-950/50 px-3 py-1 text-xs text-amber-400">
							Pendiente
						</span>
					</div>
				</div>
			{/each}
			{#if data.pendingDocuments.length === 0}
				<p class="text-center text-slate-400">No hay documentación pendiente</p>
			{/if}
		</div>
	</div>

	<div class="flex justify-start">
		<a href="/preceptor" class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800">
			← Volver al panel
		</a>
	</div>
</div>
