<script lang="ts">
	let { data } = $props();

	const subjects = $derived(data?.subjects ?? []);
	const metrics = $derived(data?.metrics ?? { totalSubjects: 0, totalCommissions: 0, totalWithCorrelatives: 0 });
	const careers = $derived(data?.careers ?? []);
	const filters = $derived(data?.filters ?? {});
	const subjectTypes = $derived(data?.subjectTypes ?? []);
	const trainingFields = $derived(data?.trainingFields ?? []);
	const yearLevels = $derived(data?.yearLevels ?? [1, 2, 3, 4]);

	const groupedSubjects = $derived.by(() => {
		const groups: Record<number, typeof subjects> = {};
		subjects.forEach((subject) => {
			if (!groups[subject.yearLevel]) {
				groups[subject.yearLevel] = [];
			}
			groups[subject.yearLevel].push(subject);
		});
		return groups;
	});

	// Labels para los tipos
	const subjectTypeLabels: Record<string, string> = {
		COMMON: 'Común',
		CAREER_SPECIFIC: 'Específica',
		EDI: 'EDI'
	};

	const trainingFieldLabels: Record<string, string> = {
		GENERAL: 'General',
		ESPECIFICA: 'Específica',
		PRACTICA: 'Práctica',
		EDI: 'EDI'
	};

	const trainingFieldColors: Record<string, string> = {
		GENERAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
		ESPECIFICA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
		PRACTICA: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
		EDI: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
	};

	const accreditationModeLabels: Record<string, string> = {
		PROMOCIONAL: 'Promocional',
		EXAMEN_FINAL: 'Examen Final',
		PROMOCIONAL_SIN_FINAL: 'Prom. sin Final'
	};
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

	<!-- Filtros -->
	<section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
		<form class="flex flex-wrap gap-4 items-end" method="GET">
			<div class="flex-1 min-w-[200px]">
				<label class="block text-xs text-slate-400 mb-1">Buscar</label>
				<input
					type="text"
					name="search"
					value={filters.search}
					placeholder="Código o nombre..."
					class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm"
				/>
			</div>

			<div>
				<label class="block text-xs text-slate-400 mb-1">Carrera</label>
				<select name="careerId" class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm">
					<option value="">Todas</option>
					{#each careers as career}
						<option value={career.id} selected={filters.careerId === career.id}>
							{career.name}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-xs text-slate-400 mb-1">Año</label>
				<select name="yearLevel" class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm">
					<option value="">Todos</option>
					{#each yearLevels as year}
						<option value={year} selected={filters.yearLevel === year.toString()}>
							{year}°
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-xs text-slate-400 mb-1">Tipo</label>
				<select name="subjectType" class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm">
					<option value="">Todos</option>
					{#each subjectTypes as type}
						<option value={type} selected={filters.subjectType === type}>
							{subjectTypeLabels[type] || type}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-xs text-slate-400 mb-1">Campo</label>
				<select name="trainingField" class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm">
					<option value="">Todos</option>
					{#each trainingFields as field}
						<option value={field} selected={filters.trainingField === field}>
							{trainingFieldLabels[field] || field}
						</option>
					{/each}
				</select>
			</div>

			<div class="flex gap-2">
				<button type="submit" class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950">
					Filtrar
				</button>
				<a href="/materias" class="rounded-xl border border-slate-700 px-4 py-2 text-sm">
					Limpiar
				</a>
			</div>
		</form>
	</section>

	<!-- KPIs -->
	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total materias</p>
			<h2 class="mt-3 text-4xl font-bold">{metrics.totalSubjects}</h2>
			<p class="mt-2 text-sm text-slate-500">Materias activas</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Con correlativas</p>
			<h2 class="mt-3 text-4xl font-bold">{metrics.totalWithCorrelatives}</h2>
			<p class="mt-2 text-sm text-slate-500">Materias con requisitos</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total comisiones</p>
			<h2 class="mt-3 text-4xl font-bold">{metrics.totalCommissions}</h2>
			<p class="mt-2 text-sm text-slate-500">Grupos activos</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Promedio</p>
			<h2 class="mt-3 text-4xl font-bold">
				{metrics.totalSubjects > 0
					? (metrics.totalCommissions / metrics.totalSubjects).toFixed(1)
					: '0'}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Comisiones por materia</p>
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
							<!-- Row 1: Main headers with colspans -->
							<tr class="border-b border-slate-700">
								<th rowspan="3" class="px-4 py-4 text-sm font-semibold border-r border-slate-700">Código</th>
								<th rowspan="3" class="px-4 py-4 text-sm font-semibold border-r border-slate-700">Materia</th>
								<th rowspan="3" class="px-4 py-4 text-sm font-semibold border-r border-slate-700">Modalidad de Acreditación</th>
								<th colspan="3" class="px-4 py-2 text-sm font-semibold text-center border-r border-slate-700">Régimen de Correlatividades</th>
								<th rowspan="3" class="px-4 py-4 text-sm font-semibold border-r border-slate-700">Carreras</th>
								<th rowspan="3" class="px-4 py-4 text-right text-sm font-semibold">Acciones</th>
							</tr>
							<!-- Row 2: Second level grouping -->
							<tr class="border-b border-slate-700">
								<th colspan="2" class="px-4 py-2 text-sm font-semibold text-center border-r border-slate-700">Para cursar deberá</th>
								<th rowspan="2" class="px-4 py-2 text-sm font-semibold text-center border-r border-slate-700">Para aprobar deberá<br/>haber Aprobado</th>
							</tr>
							<!-- Row 3: Individual columns -->
							<tr>
								<th class="px-4 py-2 text-xs font-semibold text-center border-r border-slate-700">haber<br/>Regularizado</th>
								<th class="px-4 py-2 text-xs font-semibold text-center border-r border-slate-700">haber<br/>Aprobado</th>
							</tr>
						</thead>
						<tbody>
							{#each yearSubjects as subject}
								<tr class="border-b border-slate-800 last:border-none hover:bg-slate-800/50">
									<td class="px-4 py-4 font-mono text-sm text-slate-400">{subject.code}</td>
									<td class="px-4 py-4">
										<div class="font-medium">{subject.name}</div>
										{#if subject.isElective}
											<span class="text-xs text-amber-400">Optativa</span>
										{/if}
									</td>
									<td class="px-4 py-4">
										<span class="text-xs text-slate-300">
											{accreditationModeLabels[subject.accreditationMode] || subject.accreditationMode}
										</span>
									</td>
									<td class="px-4 py-4 text-center">
									{#if subject.correlativesRegular.length > 0}
										<span class="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-1 text-xs">
											{subject.correlativesRegular.join(', ')}
										</span>
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								</td>
									<td class="px-4 py-4 text-center">
									{#if subject.correlativesAprobadoCursar.length > 0}
										<span class="rounded-full bg-blue-500/20 text-blue-300 px-2 py-1 text-xs">
											{subject.correlativesAprobadoCursar.join(', ')}
										</span>
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								</td>
									<td class="px-4 py-4 text-center">
									{#if subject.correlativesAprobadoAprobar.length > 0}
										<span class="rounded-full bg-purple-500/20 text-purple-300 px-2 py-1 text-xs">
											{subject.correlativesAprobadoAprobar.join(', ')}
										</span>
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								</td>
									<td class="px-4 py-4">
										{#if subject.careers.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each subject.careers.slice(0, 2) as career}
													<span class="text-xs text-slate-400">{career.code}</span>
												{/each}
												{#if subject.careers.length > 2}
													<span class="text-xs text-slate-500">+{subject.careers.length - 2}</span>
												{/if}
											</div>
										{:else}
											<span class="text-xs text-slate-500">Todas</span>
										{/if}
									</td>
									<td class="px-4 py-4 text-right">
										<div class="flex gap-2 justify-end">
											<a
												href={`/materias/${subject.id}`}
												class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs transition hover:border-slate-500"
												title="Ver detalles"
											>
												Ver
											</a>
											<a
												href={`/materias/${subject.id}/correlativas`}
												class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs transition hover:border-slate-500"
												title="Gestionar correlativas"
											>
												Correl.
											</a>
											<a
												href={`/materias/${subject.id}/editar`}
												class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs transition hover:border-slate-500"
												title="Editar materia"
											>
												Editar
											</a>
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