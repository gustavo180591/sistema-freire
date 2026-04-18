<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	
	interface FormData {
		success?: boolean;
		errors?: {
			general?: string;
			name?: string[];
			version?: string[];
			durationYears?: string[];
		};
	}
	
	let { data, form }: { data: PageData; form?: FormData } = $props();

	const errors = $derived(form?.errors ?? {});
	const success = $derived(form?.success ?? true);
</script>

<svelte:head>
	<title>Nuevo plan de estudio | {data.career.name}</title>
	<meta name="description" content="Crear nuevo plan de estudio para la carrera" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="mb-6">
			<a
				href={`/carreras/${data.career.id}`}
				class="text-sm text-slate-400 transition hover:text-slate-300"
			>
				← Volver a {data.career.name}
			</a>
		</div>

		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Nuevo plan de estudio</h1>
			<p class="mt-2 font-mono text-sm text-slate-400">{data.career.code}</p>
			<p class="mt-4 max-w-3xl text-sm text-slate-400">
				Crear un nuevo plan curricular para la carrera {data.career.name}.
			</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<form
			method="POST"
			use:enhance
			class="space-y-6"
		>
			{#if !success && errors.general}
				<div class="rounded-2xl border border-red-900 bg-red-900/10 p-4 text-sm text-red-400">
					{errors.general}
				</div>
			{/if}

			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label for="name" class="mb-2 block text-sm font-medium text-slate-300">
						Nombre del plan <span class="text-red-400">*</span>
					</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						placeholder="Plan 2025"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.name}
						<p class="mt-1 text-sm text-red-400">{errors.name}</p>
					{/if}
				</div>

				<div>
					<label for="version" class="mb-2 block text-sm font-medium text-slate-300">
						Versión <span class="text-red-400">*</span>
					</label>
					<input
						id="version"
						name="version"
						type="text"
						required
						placeholder="2025"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.version}
						<p class="mt-1 text-sm text-red-400">{errors.version}</p>
					{/if}
				</div>

				<div>
					<label for="durationYears" class="mb-2 block text-sm font-medium text-slate-300">
						Duración (años) <span class="text-red-400">*</span>
					</label>
					<input
						id="durationYears"
						name="durationYears"
						type="number"
						min="1"
						max="10"
						required
						placeholder="4"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.durationYears}
						<p class="mt-1 text-sm text-red-400">{errors.durationYears}</p>
					{/if}
				</div>
			</div>

			<div>
				<label class="flex items-center gap-3">
					<input
						name="active"
						type="checkbox"
						checked
						value="true"
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Plan activo</span>
				</label>
				<p class="mt-2 text-sm text-slate-500">
					Los planes activos estarán disponibles para nuevas inscripciones.
				</p>
			</div>

			<div class="flex gap-4 pt-4">
				<a
					href={`/carreras/${data.career.id}`}
					class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold transition hover:border-slate-500"
				>
					Cancelar
				</a>
				<button
					type="submit"
					class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
				>
					Crear plan
				</button>
			</div>
		</form>
	</section>
</div>
