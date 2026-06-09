<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let selectedStudent = $state('');
	let selectedSubject = $state('');
	let selectedDate = $state(new Date().toISOString().split('T')[0]);
	let selectedType = $state('LLEGADA_TARDE');
	let selectedTime = $state('');
	let notes = $state('');
</script>

<svelte:head>
	<title>Llegadas Tarde y Retiros | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>
		<h1 class="mt-2 text-3xl font-bold">Llegadas Tarde y Retiros</h1>
		<p class="mt-2 text-slate-400">Registrar llegadas tarde y retiros anticipados</p>
	</div>

	<!-- Formulario -->
	<form
		method="POST"
		class="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
		use:enhance={() => {
			if (form?.success) {
				selectedStudent = '';
				selectedSubject = '';
				selectedTime = '';
				notes = '';
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

		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="studentId" class="mb-2 block text-sm font-medium text-slate-300"
					>Estudiante</label
				>
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
				<label for="subjectId" class="mb-2 block text-sm font-medium text-slate-300">Materia</label>
				<select
					id="subjectId"
					name="subjectId"
					bind:value={selectedSubject}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					required
				>
					<option value="">Seleccionar materia</option>
					{#each data.subjects as subject}
						<option value={subject.id}>
							{subject.code} - {subject.name} ({subject.yearLevel}° Año)
						</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="date" class="mb-2 block text-sm font-medium text-slate-300">Fecha</label>
				<input
					id="date"
					name="date"
					type="date"
					bind:value={selectedDate}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					required
				/>
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
					<option value="LLEGADA_TARDE">Llegada Tarde</option>
					<option value="RETIRO_ANTICIPADO">Retiro Anticipado</option>
				</select>
			</div>
		</div>

		<div>
			<label for="time" class="mb-2 block text-sm font-medium text-slate-300">Hora</label>
			<input
				id="time"
				name="time"
				type="time"
				bind:value={selectedTime}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				required
			/>
		</div>

		<div>
			<label for="notes" class="mb-2 block text-sm font-medium text-slate-300"
				>Notas (opcional)</label
			>
			<textarea
				id="notes"
				name="notes"
				bind:value={notes}
				rows="3"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				placeholder="Detalles adicionales..."
			></textarea>
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				class="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Registrar Evento
			</button>
		</div>
	</form>

	<!-- Registros Recientes -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Registros Recientes</h2>
		<div class="space-y-3">
			{#each data.recentRecords as record}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<p class="font-semibold text-white">{record.studentName}</p>
							<p class="text-sm text-slate-400">DNI: {record.studentDni}</p>
							<p class="text-sm text-slate-400">{record.subject}</p>
							<p class="mt-1 text-xs text-slate-500">
								Fecha: {new Date(record.date).toLocaleDateString('es-AR')}
							</p>
							<p class="mt-2 text-sm text-amber-400">
								{record.notes}
							</p>
						</div>
					</div>
				</div>
			{/each}
			{#if data.recentRecords.length === 0}
				<p class="text-center text-slate-400">No hay registros recientes</p>
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
