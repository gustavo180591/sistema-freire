<script lang="ts">
	let { data } = $props();

	const reports = $derived(
		data?.reports ?? [
			{
				id: 'academic-summary',
				title: 'Reporte académico general',
				description: 'Matrícula, regularidad, comisiones activas y alumnos en riesgo.',
				format: 'PDF / Excel',
				href: '/reportes/academico'
			},
			{
				id: 'financial-delinquency',
				title: 'Reporte de morosidad',
				description: 'Deuda consolidada, pagos y alumnos bloqueados por saldo pendiente.',
				format: 'PDF / Excel',
				href: '/reportes/financiero'
			},
			{
				id: 'salary-receipts',
				title: 'Recibos docentes',
				description: 'Exportación histórica de recibos por período y estado.',
				format: 'PDF',
				href: '/recibos'
			},
			{
				id: 'official-records',
				title: 'Actas y libro matriz',
				description: 'Documentación oficial para inspección y archivo institucional.',
				format: 'PDF / Excel',
				href: '/reportes/oficiales'
			}
		]
	);
</script>

<svelte:head>
	<title>Reportes | Instituto Paulo Freire</title>
	<meta name="description" content="Centro de reportes académicos, financieros y oficiales" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">
			Dirección · Secretaría · Finanzas
		</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Centro de reportes institucionales</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Generación y exportación de documentación oficial académica, financiera y administrativa
			requerida por inspección, auditoría y gestión directiva.
		</p>
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Reportes disponibles</p>
			<h2 class="mt-3 text-4xl font-bold">{reports.length}</h2>
			<p class="mt-2 text-sm text-slate-500">Módulos listos para exportación</p>
		</div>
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Último período</p>
			<h2 class="mt-3 text-4xl font-bold">2026</h2>
			<p class="mt-2 text-sm text-slate-500">Período académico vigente</p>
		</div>
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Formatos</p>
			<h2 class="mt-3 text-4xl font-bold">PDF · XLSX</h2>
			<p class="mt-2 text-sm text-slate-500">Compatibles con inspección y archivo</p>
		</div>
	</section>

	<section class="grid gap-6 lg:grid-cols-2">
		{#each reports as report}
			<a
				href={report.href}
				class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-slate-600"
			>
				<p class="text-sm tracking-[0.2em] text-slate-500 uppercase">{report.format}</p>
				<h2 class="mt-3 text-2xl font-semibold">{report.title}</h2>
				<p class="mt-3 text-sm leading-6 text-slate-400">{report.description}</p>
				<div class="mt-6 text-sm font-medium text-slate-300">Abrir módulo →</div>
			</a>
		{/each}
	</section>
</div>
