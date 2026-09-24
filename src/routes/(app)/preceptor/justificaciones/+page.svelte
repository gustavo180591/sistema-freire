<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedEntry = $state('');
	let justification = $state('');
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Justificación de Inasistencias | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>
		<h1 class="mt-2 text-3xl font-bold">Justificación de Inasistencias</h1>
		<p class="mt-2 text-slate-400">Registrar justificaciones de ausencias</p>
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

	{#if selectedEntry}
		<form
			method="POST"
			class="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
			use:enhance={() => {
				submitting = true;

				return async ({ result, update }) => {
					submitting = false;

					if (result.type === 'success') {
						selectedEntry = '';
						justification = '';
					}

					await update();
				};
			}}
		>
			<input type="hidden" name="entryId" value={selectedEntry} />

			<div>
				<label for="justification" class="mb-2 block text-sm font-medium text-slate-300">
					Justificación
				</label>

				<textarea
					id="justification"
					name="justification"
					bind:value={justification}
					rows="4"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					placeholder="Describe el motivo de la inasistencia..."
					required
				></textarea>
			</div>

			<div class="flex justify-between gap-4">
				<button
					type="button"
					onclick={() => {
						selectedEntry = '';
						justification = '';
					}}
					disabled={submitting}
					class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800 disabled:opacity-50"
				>
					Cancelar
				</button>

				<button
					type="submit"
					disabled={submitting}
					class="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? 'Guardando...' : 'Guardar Justificación'}
				</button>
			</div>
		</form>
	{/if}

	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<div class="mb-4 flex items-center justify-between gap-4">
			<h2 class="text-xl font-semibold">Inasistencias sin Justificar</h2>

			<span
				class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400"
			>
				{data.unexcusedAbsences.length}
			</span>
		</div>

		<div class="space-y-3">
			{#each data.unexcusedAbsences as absence}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<p class="font-semibold text-white">
								{absence.studentName}
							</p>

							<p class="text-sm text-slate-400">
								DNI: {absence.studentDni ?? 'Sin DNI'}
							</p>

							<p class="text-sm text-slate-400">
								{absence.subject}
							</p>

							<p class="mt-1 text-xs text-slate-500">
								Fecha:
								{new Date(absence.date).toLocaleDateString('es-AR')}
							</p>
						</div>

						<button
							type="button"
							onclick={() => {
								selectedEntry = absence.id;
								justification = '';
							}}
							class="rounded-xl bg-blue-950/50 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-950/70"
						>
							Justificar
						</button>
					</div>
				</div>
			{/each}

			{#if data.unexcusedAbsences.length === 0}
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-8 text-center">
					<p class="text-slate-400">No hay inasistencias pendientes de justificación</p>
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
