<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	
	interface Plan {
		id: string;
		name: string;
		version: string;
		subjects: number;
		active: boolean;
	}
	
	let { data, form }: { data: PageData; form?: { error?: string } } = $props();
	
	let deletingPlan = $state<Plan | null>(null);

	// Cerrar modal cuando la eliminación es exitosa
	$effect(() => {
		if (form && !form.error) {
			deletingPlan = null;
		}
	});

	const career = $derived(
		data?.career ?? {
			id: '1',
			code: 'PI-2025',
			name: 'Profesorado de Educación Inicial',
			active: true,
			students: 184,
			plans: [
				{
					id: 'p1',
					name: 'Plan 2022',
					version: '2022',
					subjects: 32,
					active: true
				},
				{
					id: 'p2',
					name: 'Plan 2025',
					version: '2025',
					subjects: 36,
					active: true
				}
			]
		}
	);
</script>

<svelte:head>
	<title>{career.name} | Carreras</title>
	<meta name="description" content="Detalle académico de carrera y planes de estudio" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">{career.name}</h1>
				<p class="mt-2 font-mono text-sm text-slate-400">{career.code}</p>
				<p class="mt-4 max-w-3xl text-sm text-slate-400">
					Gestión detallada de planes, materias, cohortes y trazabilidad curricular.
				</p>
			</div>

			<div class="flex gap-3">
				<a
					href={`/carreras/${career.id}/editar`}
					class="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold transition hover:border-slate-500"
				>
					Editar carrera
				</a>
				<a
					href={`/carreras/${career.id}/planes/nuevo`}
					class="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
				>
					+ Nuevo plan
				</a>
			</div>
		</div>
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Planes activos</p>
			<h2 class="mt-3 text-4xl font-bold">{career.plans.length}</h2>
			<p class="mt-2 text-sm text-slate-500">Versiones curriculares disponibles</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Alumnos vinculados</p>
			<h2 class="mt-3 text-4xl font-bold">{career.students}</h2>
			<p class="mt-2 text-sm text-slate-500">Matrícula total de la carrera</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Materias totales</p>
			<h2 class="mt-3 text-4xl font-bold">
				{career.plans.reduce((acc, plan) => acc + plan.subjects, 0)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Suma consolidada entre planes</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-semibold">Planes de estudio</h2>
			<span class="text-sm text-slate-400">{career.plans.length} registros</span>
		</div>

		<div class="mt-6 overflow-hidden rounded-2xl border border-slate-800">
			<table class="w-full text-left">
				<thead class="border-b border-slate-800 bg-slate-900">
					<tr>
						<th class="px-6 py-4 text-sm font-semibold">Plan</th>
						<th class="px-6 py-4 text-sm font-semibold">Versión</th>
						<th class="px-6 py-4 text-sm font-semibold">Materias</th>
						<th class="px-6 py-4 text-sm font-semibold">Estado</th>
						<th class="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each career.plans as plan}
						<tr class="border-b border-slate-800 last:border-none">
							<td class="px-6 py-4 font-medium">{plan.name}</td>
							<td class="px-6 py-4">{plan.version}</td>
							<td class="px-6 py-4">{plan.subjects}</td>
							<td class="px-6 py-4">
								<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
									{plan.active ? 'Activo' : 'Inactivo'}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
							<div class="flex items-center justify-end space-x-2">
								<a
									href={`/carreras/${career.id}/planes/${plan.id}`}
									class="text-emerald-400 hover:text-emerald-300 transition-colors"
									aria-label="Ver plan"
									title="Ver plan"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								</a>
								<a
									href={`/carreras/${career.id}/planes/${plan.id}/editar`}
									class="text-blue-400 hover:text-blue-300 transition-colors"
									aria-label="Editar plan"
									title="Editar plan"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</a>
								<button
									onclick={() => deletingPlan = plan}
									class="text-red-400 hover:text-red-300 transition-colors"
									aria-label="Eliminar plan"
									title="Eliminar plan"
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
		</div>
	</section>
</div>

<!-- Modal de Confirmación para Eliminar Plan -->
{#if deletingPlan}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6">
			<div class="flex items-center space-x-4 mb-6">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
					<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold">¿Eliminar plan de estudio?</h3>
					<p class="text-sm text-slate-400 mt-1">
						<strong>{deletingPlan.name}</strong> (v{deletingPlan.version})
					</p>
				</div>
			</div>
			
			<p class="text-sm text-slate-400 mb-6">
				Esta acción no se puede deshacer. El plan y todas sus materias asociadas se eliminarán permanentemente.
			</p>
			
			{#if form?.error}
				<div class="mb-4 rounded-xl border border-red-900 bg-red-900/10 p-3 text-sm text-red-400">
					{form.error}
				</div>
			{/if}
			
			<div class="flex justify-end space-x-3">
				<button
					onclick={() => deletingPlan = null}
					class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium transition hover:border-slate-500"
				>
					Cancelar
				</button>
				<form
					method="POST"
					action="?/deletePlan"
					use:enhance
					class="inline"
				>
					<input type="hidden" name="planId" value={deletingPlan.id} />
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
