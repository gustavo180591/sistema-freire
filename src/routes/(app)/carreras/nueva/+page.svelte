<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();

	let code = $state('');
	let name = $state('');
	let description = $state('');
	let isActive = $state(true);
</script>

<svelte:head>
	<title>Nueva carrera | Instituto Paulo Freire</title>
	<meta name="description" content="Alta institucional de carreras y estructura académica" />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Nueva carrera</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Creá una nueva oferta académica institucional. Luego podrás asociar planes de estudio,
			cohortes, materias y correlatividades.
		</p>
	</section>

	<form
		method="POST"
		use:enhance
		class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
	>
		{#if form?.error}
			<div class="rounded-2xl border border-red-900/50 bg-red-500/10 p-4 text-sm text-red-400">
				{form.error}
			</div>
		{/if}

		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Código</label>
				<input
					bind:value={code}
					name="code"
					placeholder="PEI-2026"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
				<p class="mt-2 text-xs text-slate-500">
					Identificador único para reportes, planes y trazabilidad.
				</p>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Estado inicial</label>
				<select
					bind:value={isActive}
					name="active"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value={true}>Activa</option>
					<option value={false}>Inactiva</option>
				</select>
			</div>
		</div>

		<div>
			<label class="mb-2 block text-sm font-medium text-slate-300">Nombre de la carrera</label>
			<input
				bind:value={name}
				name="name"
				placeholder="Profesorado de Educación Inicial"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
			/>
		</div>

		<div>
			<label class="mb-2 block text-sm font-medium text-slate-300">Descripción</label>
			<textarea
				bind:value={description}
				name="description"
				rows="5"
				placeholder="Detalle institucional, alcance, resolución y observaciones"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
			></textarea>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
			Al guardar la carrera, quedará disponible para vincular alumnos, crear planes de estudio
			versionados y estructurar el recorrido académico.
		</div>

		<div class="flex items-center justify-end gap-3">
			<a
				href="/carreras"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Cancelar
			</a>
			<button
				type="submit"
				class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Crear carrera
			</button>
		</div>
	</form>
</div>
