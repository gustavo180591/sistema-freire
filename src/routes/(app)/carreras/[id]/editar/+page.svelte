<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Editar Carrera {data.career.name} | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<div>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Administración</p>
		<h1 class="text-3xl font-bold tracking-tight">Editar Carrera</h1>
		<p class="mt-2 text-sm text-slate-400">
			Modificá los datos de la carrera "{data.career.name}"
		</p>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-800 bg-red-950/50 p-4 text-red-200">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		action="?/updateCareer"
		class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		<!-- Datos básicos -->
		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-white">Datos básicos</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<label for="code" class="mb-2 block text-sm font-medium text-slate-300">Código</label>
					<input
						id="code"
						name="code"
						type="text"
						value={data.career.code}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
				</div>

				<div>
					<label for="name" class="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
					<input
						id="name"
						name="name"
						type="text"
						value={data.career.name}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
				</div>

				<div>
					<label for="trainingField" class="mb-2 block text-sm font-medium text-slate-300">Campo de formación</label>
					<input
						id="trainingField"
						name="trainingField"
						type="text"
						value={data.career.trainingField}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
				</div>

				<div>
					<label for="resolution" class="mb-2 block text-sm font-medium text-slate-300">Resolución</label>
					<input
						id="resolution"
						name="resolution"
						type="text"
						value={data.career.resolution || ''}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
				</div>

				<div>
					<label for="durationYears" class="mb-2 block text-sm font-medium text-slate-300">Duración (años)</label>
					<input
						id="durationYears"
						name="durationYears"
						type="number"
						min="1"
						max="10"
						value={data.career.durationYears}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
				</div>

				<div>
					<label for="active" class="mb-2 block text-sm font-medium text-slate-300">Estado</label>
					<select
						id="active"
						name="active"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					>
						<option value="true" selected={data.career.active}>Activa</option>
						<option value="false" selected={!data.career.active}>Inactiva</option>
					</select>
				</div>
			</div>
		</section>

		<!-- Botones -->
		<div class="flex gap-4">
			<button
				type="submit"
				disabled={loading}
				class="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Guardando...' : 'Guardar cambios'}
			</button>
			<a
				href="/carreras/{data.career.id}"
				class="rounded-xl border border-slate-600 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
			>
				Cancelar
			</a>
		</div>
	</form>
</div>
