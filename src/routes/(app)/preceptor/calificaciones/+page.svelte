<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let selectedStudent = $state('');
	let selectedCommission = $state('');
	let grade = $state('');
	let evaluationType = $state('PARCIAL');
	let notes = $state('');
</script>

<svelte:head>
	<title>Cargar Calificaciones | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>
		<h1 class="mt-2 text-3xl font-bold">Cargar Calificaciones</h1>
		<p class="mt-2 text-slate-400">Registrar notas de estudiantes</p>
	</div>

	<!-- Formulario de Carga -->
	<form
		method="POST"
		class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6"
		use:enhance={() => {
			if (form?.success) {
				selectedStudent = '';
				selectedCommission = '';
				grade = '';
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
				<label for="commissionId" class="mb-2 block text-sm font-medium text-slate-300">Comisión/Materia</label>
				<select
					id="commissionId"
					name="commissionId"
					bind:value={selectedCommission}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					required
				>
					<option value="">Seleccionar comisión</option>
					{#each data.commissions as commission}
						<option value={commission.id}>
							{commission.name} - {commission.subject.name}
						</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="grade" class="mb-2 block text-sm font-medium text-slate-300">Nota (0-10)</label>
				<input
					id="grade"
					name="grade"
					type="number"
					min="0"
					max="10"
					step="0.01"
					bind:value={grade}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					required
				/>
			</div>

			<div>
				<label for="evaluationType" class="mb-2 block text-sm font-medium text-slate-300">Tipo de Evaluación</label>
				<select
					id="evaluationType"
					name="evaluationType"
					bind:value={evaluationType}
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
			<label for="notes" class="mb-2 block text-sm font-medium text-slate-300">Notas (opcional)</label>
			<textarea
				id="notes"
				name="notes"
				bind:value={notes}
				rows="3"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				placeholder="Observaciones sobre la evaluación..."
			></textarea>
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				class="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Registrar Calificación
			</button>
		</div>
	</form>

	<div class="flex justify-start">
		<a href="/preceptor" class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800">
			← Volver al panel
		</a>
	</div>
</div>
