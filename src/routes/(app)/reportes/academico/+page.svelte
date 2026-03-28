<script lang="ts">
	let { data } = $props();

	const rows = $derived(data?.rows ?? []);

	const regularCount = $derived(rows.filter((row) => row.regularityStatus === 'REGULAR').length);

	const libreCount = $derived(rows.filter((row) => row.regularityStatus === 'LIBRE').length);
</script>

<svelte:head>
	<title>Reporte académico | Instituto Paulo Freire</title>
	<meta
		name="description"
		content="Reporte institucional de matrícula, regularidad y riesgo académico"
	/>
</svelte:head>

<div class="space-y-8">
	<section
		class="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 lg:flex-row lg:items-center lg:justify-between"
	>
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Reportes · Académico</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Reporte académico general</h1>
			<p class="mt-3 max-w-3xl text-sm text-slate-400">
				Consolidado institucional de matrícula, regularidad, asistencia y alumnos en riesgo.
			</p>
		</div>

		<div class="flex gap-3">
			<a
				href="/reportes/academico/export.xlsx"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Exportar Excel
			</a>
			<a
				href="/reportes/academico/export.pdf"
				class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Exportar PDF
			</a>
		</div>
	</section>

	<section class="grid gap-4 md:grid-cols-5">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Alumnos activos</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.activeStudents ?? 0}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Comisiones activas</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.activeCommissions ?? 0}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Regulares</p>
			<h2 class="mt-3 text-4xl font-bold">{regularCount}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Libres</p>
			<h2 class="mt-3 text-4xl font-bold">{libreCount}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">En riesgo</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.riskStudents ?? 0}</h2>
		</div>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Alumno</th>
					<th class="px-6 py-4 text-sm font-semibold">Carrera</th>
					<th class="px-6 py-4 text-sm font-semibold">Materia</th>
					<th class="px-6 py-4 text-sm font-semibold">Asistencia</th>
					<th class="px-6 py-4 text-sm font-semibold">Regularidad</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{row.student}</td>
						<td class="px-6 py-4">{row.career}</td>
						<td class="px-6 py-4">{row.subject}</td>
						<td class="px-6 py-4">{row.attendancePercent}%</td>
						<td class="px-6 py-4">{row.regularityStatus}</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{row.attendancePercent < 75 ? 'Riesgo' : 'Estable'}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
