<script lang="ts">
	import { enhance } from '$app/forms';
	import { canManageCareers } from '$lib/client/permissions';
	let { data, form } = $props();

	const plan = $derived(data?.plan);
	const metrics = $derived(data?.metrics ?? { totalSubjects: 0, totalYears: 0 });

	let removingSubject = $state<(typeof plan.subjects)[0] | null>(null);

	const groupedSubjects = $derived(() => {
		const groups: Record<number, typeof plan.subjects> = {};
		plan.subjects.forEach((subject) => {
			if (!groups[subject.yearLevel]) {
				groups[subject.yearLevel] = [];
			}
			groups[subject.yearLevel].push(subject);
		});
		return groups;
	});

	$effect(() => {
		if (form && !form.error) {
			removingSubject = null;
		}
	});
</script>

<svelte:head>
	<title>{plan.name} | {plan.career.name}</title>
	<meta name="description" content="Detalle del plan de estudio" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="mb-6">
			<a
				href={`/carreras/${plan.career.id}`}
				class="text-sm text-slate-400 transition hover:text-slate-300"
			>
				← Volver a {plan.career.name}
			</a>
		</div>

		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">{plan.name}</h1>
				<p class="mt-2 font-mono text-sm text-slate-400">Versión {plan.version}</p>
				<p class="mt-4 max-w-3xl text-sm text-slate-400">
					Plan curricular de la carrera {plan.career.name} con {metrics.totalSubjects} materias distribuidas
					en {metrics.totalYears} años.
				</p>
			</div>

			{#if canManageCareers()}
				<div class="flex gap-3">
					<a
						href={`/carreras/${plan.career.id}/planes/${plan.id}/editar`}
						class="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold transition hover:border-slate-500"
					>
						Editar plan
					</a>
					<a
						href={`/carreras/${plan.career.id}/planes/${plan.id}/materias/nueva`}
						class="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
					>
						+ Agregar materia
					</a>
				</div>
			{/if}
		</div>
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Estado</p>
			<h2 class="mt-3 text-4xl font-bold">
				{plan.active ? 'Activo' : 'Inactivo'}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Disponibilidad del plan</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total materias</p>
			<h2 class="mt-3 text-4xl font-bold">{metrics.totalSubjects}</h2>
			<p class="mt-2 text-sm text-slate-500">Materias en el plan</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Duración</p>
			<h2 class="mt-3 text-4xl font-bold">{metrics.totalYears} años</h2>
			<p class="mt-2 text-sm text-slate-500">Período académico</p>
		</div>
	</section>

	<section class="space-y-6">
		{#each Object.entries(groupedSubjects).sort(([a], [b]) => Number(a) - Number(b)) as [year, subjects]}
			<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
				<h2 class="text-2xl font-semibold">Año {year}</h2>
				<p class="mt-1 text-sm text-slate-400">{subjects.length} materias</p>

				<div class="mt-6 overflow-hidden rounded-2xl border border-slate-800">
					<table class="w-full text-left">
						<thead class="border-b border-slate-800 bg-slate-900">
							<tr>
								<th class="px-6 py-4 text-sm font-semibold">Código</th>
								<th class="px-6 py-4 text-sm font-semibold">Materia</th>
								<th class="px-6 py-4 text-sm font-semibold">Orden</th>
								<th class="px-6 py-4 text-sm font-semibold">Estado</th>
								<th class="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each subjects as subject}
								<tr class="border-b border-slate-800 last:border-none">
									<td class="px-6 py-4 font-mono text-sm">{subject.code}</td>
									<td class="px-6 py-4 font-medium">{subject.name}</td>
									<td class="px-6 py-4">{subject.sortOrder}</td>
									<td class="px-6 py-4">
										<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
											{subject.active ? 'Activa' : 'Inactiva'}
										</span>
									</td>
									<td class="px-6 py-4 text-right">
										<div class="flex items-center justify-end gap-2">
											<a
												href={`/materias/${subject.id}`}
												class="rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:border-slate-500"
											>
												Ver materia
											</a>
											{#if canManageCareers()}
												<button
													onclick={() => (removingSubject = subject)}
													class="rounded-xl border border-red-900/50 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/20"
												>
													Eliminar
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/each}
	</section>
</div>

{#if removingSubject}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8">
			<h2 class="text-2xl font-bold">Eliminar materia del plan</h2>
			<p class="mt-4 text-sm text-slate-400">
				¿Estás seguro de que deseas eliminar <strong>{removingSubject.name}</strong>
				({removingSubject.code}) del plan de estudio?
			</p>
			<p class="mt-2 text-sm text-slate-500">
				Esta acción no elimina la materia del sistema, solo la desvincula de este plan.
			</p>

			{#if form?.error}
				<div class="mt-4 rounded-2xl border border-red-900 bg-red-900/10 p-4 text-sm text-red-400">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/removeSubject" use:enhance class="mt-6 flex gap-4">
				<input type="hidden" name="subjectId" value={removingSubject.id} />
				<button
					type="button"
					onclick={() => (removingSubject = null)}
					class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold transition hover:border-slate-500"
				>
					Cancelar
				</button>
				<button
					type="submit"
					class="rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
				>
					Eliminar
				</button>
			</form>
		</div>
	</div>
{/if}
