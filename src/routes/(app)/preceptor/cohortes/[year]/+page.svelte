<script lang="ts">
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { formatDni } from '$lib/utils/dni';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function trajectoryQuery(): string {
		const params = new SvelteURLSearchParams({
			cohorte: String(data.cohortYear)
		});

		if (data.filters.careerId) {
			params.set('careerId', data.filters.careerId);
		}

		return `?${params.toString()}`;
	}

	function cohortsQuery(): string {
		const params = new SvelteURLSearchParams();

		if (data.filters.careerId) {
			params.set('careerId', data.filters.careerId);
		}

		const query = params.toString();

		return query ? `?${query}` : '';
	}

	function statusLabel(status: string): string {
		switch (status) {
			case 'ACTIVE':
				return 'Activo';
			case 'INACTIVE':
				return 'Inactivo';
			case 'GRADUATED':
				return 'Egresado';
			case 'SUSPENDED':
				return 'Suspendido';
			default:
				return status;
		}
	}
</script>

<svelte:head>
	<title>Cohorte {data.cohortYear} | Preceptoría</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-8">
		<div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptoría · Cohorte</p>

				<h1 class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
					Cohorte {data.cohortYear}
				</h1>

				<p class="mt-3 text-sm text-slate-400">
					{data.students.length} estudiante{data.students.length === 1 ? '' : 's'} encontrado{data
						.students.length === 1
						? ''
						: 's'} con los filtros actuales.
				</p>
			</div>

			<a
				href="{resolve('/preceptor/cohortes')}{cohortsQuery()}"
				class="self-start rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
			>
				← Volver a Cohortes
			</a>
		</div>
	</section>

	<section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
		<form method="GET" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
			<div>
				<label for="q" class="mb-2 block text-sm font-medium text-slate-300">
					Buscar estudiante
				</label>

				<input
					id="q"
					name="q"
					type="search"
					value={data.filters.search}
					placeholder="Apellido, nombre o DNI..."
					autocomplete="off"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
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

			<div class="flex items-end gap-2">
				<button
					type="submit"
					class="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
				>
					Buscar
				</button>

				<a
					href={resolve(`/preceptor/cohortes/${data.cohortYear}`)}
					class="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
				>
					Limpiar
				</a>
			</div>
		</form>
	</section>

	{#if data.students.length > 0}
		<section class="hidden overflow-hidden rounded-2xl border border-slate-800 md:block">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-800 bg-slate-900/60">
					<thead class="bg-slate-950/60">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
								Estudiante
							</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
								DNI
							</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
								Carrera
							</th>
							<th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
								Año actual
							</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
								Plan
							</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
								Estado
							</th>
							<th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">
								Acción
							</th>
						</tr>
					</thead>

					<tbody class="divide-y divide-slate-800/70">
						{#each data.students as student (student.id)}
							<tr class="transition hover:bg-slate-800/30">
								<td class="px-4 py-4">
									<p class="font-semibold text-white">
										{student.lastName}, {student.firstName}
									</p>

									{#if student.isRecursante}
										<p class="mt-1 text-xs text-amber-300">Recursante</p>
									{/if}
								</td>

								<td class="px-4 py-4 text-sm text-slate-300">
									{formatDni(student.dni)}
								</td>

								<td class="max-w-xs px-4 py-4 text-sm text-slate-300">
									{student.career.name}

									{#if student.location}
										<p class="mt-1 text-xs text-slate-500">{student.location.name}</p>
									{/if}
								</td>

								<td class="px-4 py-4 text-center text-sm font-semibold text-white">
									{student.currentYear}°
								</td>

								<td class="px-4 py-4 text-sm text-slate-300">
									{student.studyPlan?.code ?? 'Sin plan'}
								</td>

								<td class="px-4 py-4">
									<span
										class="inline-flex rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300"
									>
										{statusLabel(student.status)}
									</span>
								</td>

								<td class="px-4 py-4 text-right">
									<a
										href="{resolve(`/alumnos/${student.id}/trayectoria`)}{trajectoryQuery()}"
										class="inline-flex rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
									>
										Trayectoria →
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="grid gap-3 md:hidden">
			{#each data.students as student (student.id)}
				<article class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h2 class="font-semibold text-white">
								{student.lastName}, {student.firstName}
							</h2>

							<p class="mt-1 text-sm text-slate-400">
								DNI {formatDni(student.dni)}
							</p>
						</div>

						<span
							class="shrink-0 rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300"
						>
							{student.currentYear}° año
						</span>
					</div>

					<div class="mt-4 space-y-1 text-sm text-slate-400">
						<p>{student.career.name}</p>

						{#if student.location}
							<p>Sede: {student.location.name}</p>
						{/if}

						<p>Plan: {student.studyPlan?.code ?? 'Sin plan asignado'}</p>
						<p>Estado: {statusLabel(student.status)}</p>
					</div>

					<a
						href="{resolve(`/alumnos/${student.id}/trayectoria`)}{trajectoryQuery()}"
						class="mt-4 flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
					>
						Abrir trayectoria
					</a>
				</article>
			{/each}
		</section>
	{:else}
		<section
			class="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center"
		>
			<p class="font-medium text-slate-300">No se encontraron estudiantes</p>

			<p class="mt-2 text-sm text-slate-500">
				Revisá los filtros aplicados para la Cohorte {data.cohortYear}.
			</p>
		</section>
	{/if}
</div>
