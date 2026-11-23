<script lang="ts">
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function cohortQuery(): string {
		const params = new SvelteURLSearchParams();

		if (data.filters.careerId) {
			params.set('careerId', data.filters.careerId);
		}

		const query = params.toString();

		return query ? `?${query}` : '';
	}
</script>

<svelte:head>
	<title>Cohortes | Preceptoría</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptoría</p>

		<h1 class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Cohortes</h1>

		<p class="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
			Seleccioná el año de ingreso para trabajar con los estudiantes de esa cohorte y acceder
			directamente a su trayectoria académica.
		</p>
	</section>

	<section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
		<form method="GET" class="flex flex-col gap-4 sm:flex-row sm:items-end">
			<div class="min-w-0 flex-1">
				<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300">
					Carrera
				</label>

				<select
					id="careerId"
					name="careerId"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white transition outline-none focus:border-slate-500"
				>
					<option value="" selected={!data.filters.careerId}>Todas las carreras</option>

					{#each data.careers as career (career.id)}
						<option value={career.id} selected={data.filters.careerId === career.id}>
							{career.name}
						</option>
					{/each}
				</select>
			</div>

			<div class="flex gap-2">
				<button
					type="submit"
					class="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
				>
					Aplicar
				</button>

				<a
					href={resolve('/preceptor/cohortes')}
					class="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
				>
					Limpiar
				</a>
			</div>
		</form>
	</section>

	<section>
		<div class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-white">Años de ingreso</h2>
				<p class="mt-1 text-sm text-slate-400">
					Las cohortes se obtienen del año de ingreso registrado en cada estudiante.
				</p>
			</div>

			<p class="text-sm text-slate-500">
				{data.cohorts.length} cohorte{data.cohorts.length === 1 ? '' : 's'}
			</p>
		</div>

		{#if data.cohorts.length > 0}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each data.cohorts as cohort (cohort.year)}
					<a
						href="{resolve(`/preceptor/cohortes/${cohort.year}`)}{cohortQuery()}"
						class="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-indigo-500/70 hover:bg-slate-900"
					>
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
									Cohorte
								</p>

								<p class="mt-1 text-3xl font-bold text-white">{cohort.year}</p>
							</div>

							<div
								class="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-center"
							>
								<p class="text-xl font-bold text-indigo-300">{cohort.studentCount}</p>
								<p class="text-[11px] text-slate-400">
									estudiante{cohort.studentCount === 1 ? '' : 's'}
								</p>
							</div>
						</div>

						<div
							class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-sm"
						>
							<span class="text-slate-400">Ver estudiantes</span>
							<span class="font-semibold text-indigo-300 transition group-hover:translate-x-1">
								→
							</span>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div
				class="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center"
			>
				<p class="font-medium text-slate-300">No hay cohortes disponibles</p>
				<p class="mt-2 text-sm text-slate-500">
					No se encontraron estudiantes con año de ingreso cargado para los filtros actuales.
				</p>
			</div>
		{/if}
	</section>
</div>
