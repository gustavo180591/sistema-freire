<script lang="ts">
	let { data } = $props();

	const plan = $derived(data?.plan);
	const metrics = $derived(data?.metrics ?? { totalSubjects: 0, totalYears: 0 });

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
					Plan curricular de la carrera {plan.career.name} con {metrics.totalSubjects} materias
					distribuidas en {metrics.totalYears} años.
				</p>
			</div>

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
										<a
											href={`/materias/${subject.id}`}
											class="rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:border-slate-500"
										>
											Ver materia
										</a>
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
