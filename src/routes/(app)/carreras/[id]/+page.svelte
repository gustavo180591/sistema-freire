<script lang="ts">
	let { data } = $props();

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
							<td class="px-6 py-4 text-right">
								<a
									href={`/carreras/${career.id}/planes/${plan.id}`}
									class="rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:border-slate-500"
								>
									Ver plan
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>
