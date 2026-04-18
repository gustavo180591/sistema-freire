<script lang="ts">
	let { data } = $props();
	
	const career = $derived(data.career);
	const plans = $derived(data.plans);
	
	function getYearName(year: number): string {
		const years = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto'];
		return years[year - 1] || `Año ${year}`;
	}
</script>

<svelte:head>
	<title>Planes de Estudio | {career.name}</title>
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
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Planes de Estudio</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">{career.name}</h1>
				<p class="mt-2 font-mono text-sm text-slate-400">{career.code}</p>
			</div>
			<a
				href={`/carreras/${career.id}/planes/nuevo`}
				class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				+ Nuevo Plan
			</a>
		</div>
	</section>

	<!-- Lista de Planes -->
	{#if plans.length === 0}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-12 text-center">
			<p class="text-slate-400">No hay planes de estudio registrados para esta carrera.</p>
			<a
				href={`/carreras/${career.id}/planes/nuevo`}
				class="mt-4 inline-block rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Crear primer plan
			</a>
		</section>
	{:else}
		{#each plans as plan}
			<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
				<!-- Header del Plan -->
				<div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
					<div>
						<div class="flex items-center gap-3">
							<h2 class="text-2xl font-bold">{plan.name}</h2>
							{#if plan.active}
								<span class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
									Activo
								</span>
							{:else}
								<span class="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-400">
									Inactivo
								</span>
							{/if}
						</div>
						<p class="mt-1 text-sm text-slate-400">
							Versión {plan.version} • {plan.durationYears} años • {plan.totalSubjects} materias
						</p>
					</div>
					<div class="flex gap-2">
						<a
							href={`/carreras/${career.id}/planes/${plan.id}`}
							class="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:border-slate-500"
						>
							Ver detalle
						</a>
						<a
							href={`/carreras/${career.id}/planes/${plan.id}/editar`}
							class="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-500/20"
						>
							Editar
						</a>
					</div>
				</div>

				<!-- Materias por Año -->
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					{#each Object.entries(plan.subjectsByYear) as [year, subjects]}
						<div class="space-y-3">
							<h3 class="font-semibold text-slate-300 border-b border-slate-800 pb-2">
								{getYearName(parseInt(year))} Año
							</h3>
							<ul class="space-y-1">
								{#each subjects as subject}
									<li class="text-sm text-slate-400 py-1">
										<span class="font-mono text-xs text-slate-500 mr-2">{subject.subject.code}</span>
										{subject.subject.name}
									</li>
								{/each}
							</ul>
							{#if subjects.length === 0}
								<p class="text-sm text-slate-600 italic">Sin materias</p>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>
