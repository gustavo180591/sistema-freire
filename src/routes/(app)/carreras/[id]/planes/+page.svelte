<script lang="ts">
	let { data } = $props();

	const career = $derived(data.career);
	const subjectsByYear = $derived(data.subjectsByYear ?? {});
	const totalSubjects = $derived(data.totalSubjects ?? 0);
	const totalCorrelatives = $derived(data.totalCorrelatives ?? 0);
	const plans = $derived(data.plans ?? []);

	function getYearName(year: number): string {
		const years = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto'];
		return years[year - 1] || `Año ${year}`;
	}

	const subjectTypeLabels: Record<string, string> = {
		COMMON: 'Común',
		CAREER_SPECIFIC: 'Específica',
		EDI: 'EDI'
	};

	const trainingFieldColors: Record<string, string> = {
		GENERAL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
		ESPECIFICA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
		PRACTICA: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
		EDI: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
	};

	const yearLevels = [1, 2, 3, 4];
</script>

<svelte:head>
	<title>Plan de Estudios | {career.name}</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="mb-6">
			<a
				href={`/carreras/${career.id}`}
				class="text-sm text-slate-400 transition hover:text-slate-300"
			>
				← Volver a {career.name}
			</a>
		</div>
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Plan de Estudios</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">{career.name}</h1>
				<p class="mt-2 font-mono text-sm text-slate-400">{career.code} • {career.resolution}</p>
			</div>
			<div class="flex gap-2">
				{#if plans.length > 0}
					<span
						class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400"
					>
						Plan activo: {plans[0].version}
					</span>
				{/if}
				<a
					href={`/carreras/${career.id}/planes/nuevo`}
					class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
				>
					+ Nuevo Plan
				</a>
			</div>
		</div>
	</section>

	<!-- KPIs -->
	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total materias</p>
			<h2 class="mt-3 text-4xl font-bold">{totalSubjects}</h2>
			<p class="mt-2 text-sm text-slate-500">Materias del plan</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Correlativas</p>
			<h2 class="mt-3 text-4xl font-bold">{totalCorrelatives}</h2>
			<p class="mt-2 text-sm text-slate-500">Relaciones definidas</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Duración</p>
			<h2 class="mt-3 text-4xl font-bold">{career.durationYears}</h2>
			<p class="mt-2 text-sm text-slate-500">Años de cursado</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Planes</p>
			<h2 class="mt-3 text-4xl font-bold">{plans.length}</h2>
			<p class="mt-2 text-sm text-slate-500">Versiones registradas</p>
		</div>
	</section>

	<!-- Lista de Planes -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-semibold">Planes de Estudio</h2>
			<span class="text-sm text-slate-400">{plans.length} registros</span>
		</div>

		{#if plans.length === 0}
			<p class="mt-4 text-slate-400">No hay planes de estudio registrados.</p>
		{:else}
			<div class="mt-6 overflow-hidden rounded-2xl border border-slate-800">
				<table class="w-full text-left">
					<thead class="border-b border-slate-800 bg-slate-900">
						<tr>
							<th class="px-6 py-4 text-sm font-semibold">Plan</th>
							<th class="px-6 py-4 text-sm font-semibold">Versión</th>
							<th class="px-6 py-4 text-sm font-semibold">Estado</th>
							<th class="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each plans as plan}
							<tr class="border-b border-slate-800 last:border-none hover:bg-slate-800/50">
								<td class="px-6 py-4 font-medium">{plan.name}</td>
								<td class="px-6 py-4">{plan.version}</td>
								<td class="px-6 py-4">
									<span
										class="rounded-full border px-3 py-1 text-xs {plan.active
											? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
											: 'border-slate-700 bg-slate-800/50 text-slate-400'}"
									>
										{plan.active ? 'Activo' : 'Inactivo'}
									</span>
								</td>
								<td class="px-6 py-4 text-right">
									<a
										href={`/carreras/${career.id}/planes/${plan.id}`}
										class="text-emerald-400 transition-colors hover:text-emerald-300"
										aria-label="Ver plan"
										title="Ver plan"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Malla Curricular por Año -->
	{#if totalSubjects === 0}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-12 text-center">
			<p class="text-slate-400">No hay materias registradas para esta carrera.</p>
			<a
				href="/materias/nueva"
				class="mt-4 inline-block rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Agregar primera materia
			</a>
		</section>
	{:else}
		{#each yearLevels as year}
			{@const yearSubjects = subjectsByYear[year] || []}
			<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
				<div class="mb-6 border-b border-slate-800 pb-4">
					<h2 class="text-2xl font-bold">{getYearName(year)} Año</h2>
					<p class="mt-1 text-sm text-slate-400">{yearSubjects.length} materias</p>
				</div>

				{#if yearSubjects.length === 0}
					<p class="text-sm text-slate-600 italic">Sin materias en este año</p>
				{:else}
					<div class="overflow-hidden rounded-2xl border border-slate-800">
						<table class="w-full text-left">
							<thead class="border-b border-slate-800 bg-slate-900">
								<tr>
									<th class="px-4 py-4 text-sm font-semibold">Código</th>
									<th class="px-4 py-4 text-sm font-semibold">Materia</th>
									<th class="px-4 py-4 text-sm font-semibold">Campo</th>
									<th class="px-4 py-4 text-sm font-semibold">Hs/Sem</th>
									<th class="px-4 py-4 text-center text-sm font-semibold">Corr.</th>
								</tr>
							</thead>
							<tbody>
								{#each yearSubjects as cs}
									<tr class="border-b border-slate-800 last:border-none hover:bg-slate-800/50">
										<td class="px-4 py-4 font-mono text-sm text-slate-400">{cs.subject.code}</td>
										<td class="px-4 py-4">
											<a
												href={`/materias/${cs.subject.id}`}
												class="font-medium transition hover:text-blue-400"
											>
												{cs.subject.name}
											</a>
										</td>
										<td class="px-4 py-4">
											<span
												class="rounded-full border px-2 py-1 text-xs {trainingFieldColors[
													cs.subject.trainingField
												]}"
											>
												{cs.subject.trainingField}
											</span>
										</td>
										<td class="px-4 py-4 text-center">
											{cs.subject.hoursPerWeek || '-'}
										</td>
										<td class="px-4 py-4 text-center">
											{#if cs.subject.correlatives.length > 0}
												<a
													href={`/materias/${cs.subject.id}/correlativas`}
													class="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-300 hover:bg-blue-500/30"
												>
													{cs.subject.correlatives.length}
												</a>
											{:else}
												<span class="text-slate-500">-</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/each}
	{/if}
</div>
