<script lang="ts">
	let { data } = $props();

	const careers = $derived(
		data?.careers ?? [
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

	const filtered = $derived(
		careers.filter((career) => {
			const q = search.toLowerCase();
			return career.name.toLowerCase().includes(q) || career.code.toLowerCase().includes(q);
		})
	);
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
				{careers.reduce((acc, item) => acc + (item.plans ?? 0), 0)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Versionado curricular por carrera</p>
		</div>
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Alumnos vinculados</p>
			<h2 class="mt-3 text-4xl font-bold">
				{careers.reduce((acc, item) => acc + (item.students ?? 0), 0)}
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
				{#each filtered as career}
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
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
