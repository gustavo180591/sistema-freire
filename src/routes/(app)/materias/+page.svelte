<script lang="ts">
	let { data } = $props();

	const subjects = $derived(data?.subjects ?? []);
	const metrics = $derived(data?.metrics ?? { totalSubjects: 0, totalCommissions: 0 });

	const groupedSubjects = $derived(() => {
		const groups: Record<number, typeof subjects> = {};
		subjects.forEach((subject) => {
			if (!groups[subject.yearLevel]) {
				groups[subject.yearLevel] = [];
			}
			groups[subject.yearLevel].push(subject);
		});
		return groups;
	});
</script>

<svelte:head>
	<title>Materias | Sistema Freire</title>
	<meta name="description" content="Gestión de materias del sistema" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Gestión académica</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">Materias</h1>
				<p class="mt-4 max-w-3xl text-sm text-slate-400">
					Administración de todas las materias del sistema educativo.
				</p>
			</div>

			<a
				href="/materias/nueva"
				class="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				+ Nueva materia
			</a>
		</div>
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total materias</p>
			<h2 class="mt-3 text-4xl font-bold">{metrics.totalSubjects}</h2>
			<p class="mt-2 text-sm text-slate-500">Materias activas en el sistema</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total comisiones</p>
			<h2 class="mt-3 text-4xl font-bold">{metrics.totalCommissions}</h2>
			<p class="mt-2 text-sm text-slate-500">Grupos activos</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Promedio comisiones</p>
			<h2 class="mt-3 text-4xl font-bold">
				{metrics.totalSubjects > 0
					? (metrics.totalCommissions / metrics.totalSubjects).toFixed(1)
					: '0'}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Por materia</p>
		</div>
	</section>

	<section class="space-y-6">
		{#each Object.entries(groupedSubjects).sort(([a], [b]) => Number(a) - Number(b)) as [year, yearSubjects]}
			<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
				<h2 class="text-2xl font-semibold">Año {year}</h2>
				<p class="mt-1 text-sm text-slate-400">{yearSubjects.length} materias</p>

				<div class="mt-6 overflow-hidden rounded-2xl border border-slate-800">
					<table class="w-full text-left">
						<thead class="border-b border-slate-800 bg-slate-900">
							<tr>
								<th class="px-6 py-4 text-sm font-semibold">Código</th>
								<th class="px-6 py-4 text-sm font-semibold">Materia</th>
								<th class="px-6 py-4 text-sm font-semibold">Año</th>
								<th class="px-6 py-4 text-sm font-semibold">Comisiones</th>
								<th class="px-6 py-4 text-sm font-semibold">Estado</th>
								<th class="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each yearSubjects as subject}
								<tr class="border-b border-slate-800 last:border-none">
									<td class="px-6 py-4 font-mono text-sm">{subject.code}</td>
									<td class="px-6 py-4 font-medium">{subject.name}</td>
									<td class="px-6 py-4">{subject.yearLevel}</td>
									<td class="px-6 py-4">{subject.commissionsCount}</td>
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
											Ver detalles
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