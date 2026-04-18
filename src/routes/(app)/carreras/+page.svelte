<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	
	interface Career {
		id: string;
		code: string;
		name: string;
		active: boolean;
		plans: number;
		students: number;
	}
	
	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	const careers = $derived<Career[]>(
		(data?.careers as Career[]) ?? [
			{
				id: '1',
				code: 'PI-2025',
				name: 'Profesorado de Educación Inicial',
				active: true,
				plans: 2,
				students: 184
			},
			{
				id: '2',
				code: 'PM-2024',
				name: 'Profesorado de Matemática',
				active: true,
				plans: 3,
				students: 132
			}
		]
	);

	let search = $state('');
	let deletingCareer = $state<Career | null>(null);

	// Cerrar modal cuando la eliminación es exitosa
	$effect(() => {
		if (form && !form.error) {
			deletingCareer = null;
		}
	});

	const filtered = $derived<Career[]>(
		careers.filter((career: Career) => {
			const q = search.toLowerCase();
			return career.name.toLowerCase().includes(q) || career.code.toLowerCase().includes(q);
		})
	);
	
	function canDelete(career: Career): boolean {
		return career.plans === 0 && career.students === 0;
	}
</script>

<svelte:head>
	<title>Carreras | Instituto Paulo Freire</title>
	<meta name="description" content="Gestión institucional de carreras y planes de estudio" />
</svelte:head>

<div class="space-y-8">
	<section
		class="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Gestión de carreras</h1>
			<p class="mt-3 max-w-3xl text-sm text-slate-400">
				Administración de oferta académica, planes de estudio, cohortes y trazabilidad curricular.
			</p>
		</div>

		<a
			href="/carreras/nueva"
			class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			+ Nueva carrera
		</a>
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Carreras activas</p>
			<h2 class="mt-3 text-4xl font-bold">{careers.length}</h2>
			<p class="mt-2 text-sm text-slate-500">Oferta institucional vigente</p>
		</div>
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Planes de estudio</p>
			<h2 class="mt-3 text-4xl font-bold">
				{careers.reduce((acc: number, item: Career) => acc + (item.plans ?? 0), 0)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Versionado curricular por carrera</p>
		</div>
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Alumnos vinculados</p>
			<h2 class="mt-3 text-4xl font-bold">
				{careers.reduce((acc: number, item: Career) => acc + (item.students ?? 0), 0)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Matrícula total por carreras</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<input
			bind:value={search}
			type="text"
			placeholder="Buscar por nombre o código"
			class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
		/>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Código</th>
					<th class="px-6 py-4 text-sm font-semibold">Carrera</th>
					<th class="px-6 py-4 text-sm font-semibold">Planes</th>
					<th class="px-6 py-4 text-sm font-semibold">Alumnos</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
					<th class="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as career (career.id)}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-mono text-sm text-slate-300">{career.code}</td>
						<td class="px-6 py-4 font-medium">{career.name}</td>
						<td class="px-6 py-4">{career.plans ?? 0}</td>
						<td class="px-6 py-4">{career.students ?? 0}</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{career.active ? 'Activa' : 'Inactiva'}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
							<div class="flex items-center justify-end space-x-2">
								<a
									href={`/carreras/${career.id}`}
									class="text-emerald-400 hover:text-emerald-300 transition-colors"
									aria-label="Ver carrera"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								</a>
								<a
									href={`/alumnos?carrera=${career.id}`}
									class="text-blue-400 hover:text-blue-300 transition-colors"
									aria-label="Ver alumnos de la carrera"
									title="Ver alumnos"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
									</svg>
								</a>
								<a
									href={`/carreras/${career.id}/planes`}
									class="text-purple-400 hover:text-purple-300 transition-colors"
									aria-label="Ver planes de estudio"
									title="Ver planes"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
									</svg>
								</a>
								<button
									onclick={() => deletingCareer = career}
									class="text-red-400 hover:text-red-300 transition-colors"
									aria-label="Eliminar carrera"
									title={canDelete(career) ? 'Eliminar carrera' : 'No se puede eliminar: tiene planes o alumnos'}
									disabled={!canDelete(career)}
									class:text-slate-600={!canDelete(career)}
									class:cursor-not-allowed={!canDelete(career)}
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>

<!-- Modal de Confirmación para Eliminar -->
{#if deletingCareer}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6">
			<div class="flex items-center space-x-4 mb-6">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
					<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold">¿Eliminar carrera?</h3>
					<p class="text-sm text-slate-400 mt-1">
						<strong>{deletingCareer.name}</strong> ({deletingCareer.code})
					</p>
				</div>
			</div>
			
			<p class="text-sm text-slate-400 mb-6">
				Esta acción no se puede deshacer. La carrera se eliminará permanentemente del sistema.
			</p>
			
			{#if form?.error}
				<div class="mb-4 rounded-xl border border-red-900 bg-red-900/10 p-3 text-sm text-red-400">
					{form.error}
				</div>
			{/if}
			
			<div class="flex justify-end space-x-3">
				<button
					onclick={() => deletingCareer = null}
					class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium transition hover:border-slate-500"
				>
					Cancelar
				</button>
				<form
					method="POST"
					action="?/delete"
					use:enhance
					class="inline"
				>
					<input type="hidden" name="id" value={deletingCareer.id} />
					<button
						type="submit"
						class="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
					>
						Eliminar
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
