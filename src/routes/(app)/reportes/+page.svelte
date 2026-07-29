<script lang="ts">
	import { DEFAULT_PAYSLLIP_PORTAL_URL } from '$lib/config';

	let { data } = $props();

	type ReportStatus = 'available' | 'external' | 'pending';

	interface ReportItem {
		id: string;
		title: string;
		description: string;
		format: string;
		href: string;
		status: ReportStatus;
		isExternal?: boolean;
	}

	const reports = $derived(
		data?.reports ?? [
			{
				id: 'academic-summary',
				title: 'Reporte académico general',
				description: 'Matrícula, regularidad, materias activas y alumnos en riesgo.',
				format: 'PDF / Excel',
				href: '/reportes/academico',
				status: 'available' as ReportStatus
			},
			{
				id: 'financial-delinquency',
				title: 'Reporte de morosidad',
				description: 'Deuda consolidada, pagos y alumnos bloqueados por saldo pendiente.',
				format: 'PDF / Excel',
				href: '/reportes/financiero',
				status: 'available' as ReportStatus
			},
			{
				id: 'salary-receipts',
				title: 'Recibos de sueldo',
				description: 'Acceso al portal externo de recibos de sueldo generado por el liquidador.',
				format: 'PDF',
				href: DEFAULT_PAYSLLIP_PORTAL_URL || '#',
				status: (DEFAULT_PAYSLLIP_PORTAL_URL ? 'external' : 'pending') as ReportStatus,
				isExternal: Boolean(DEFAULT_PAYSLLIP_PORTAL_URL)
			},
			{
				id: 'official-records',
				title: 'Actas y libro matriz',
				description: 'Documentación oficial para inspección y archivo institucional.',
				format: 'PDF / Excel',
				href: '/reportes/oficiales',
				status: 'available' as ReportStatus
			}
		]
	);

	function getReportStatusColor(status: ReportStatus): string {
		switch (status) {
			case 'available':
				return 'bg-green-100 text-green-800';
			case 'external':
				return 'bg-blue-100 text-blue-800';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getReportStatusLabel(status: ReportStatus): string {
		switch (status) {
			case 'available':
				return 'Disponible';
			case 'external':
				return 'Externo';
			case 'pending':
				return 'Pendiente de configuración';
			default:
				return '';
		}
	}
</script>

<svelte:head>
	<title>Reportes | Instituto ISFD "PAULO FREIRE" 1117</title>
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
			{#if report.status === 'pending'}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 opacity-60">
					<div class="flex items-start justify-between">
						<div>
							<p class="text-sm tracking-[0.2em] text-slate-500 uppercase">{report.format}</p>
							<h2 class="mt-3 text-2xl font-semibold">{report.title}</h2>
							<p class="mt-3 text-sm leading-6 text-slate-400">{report.description}</p>
						</div>
						<span
							class="rounded-full px-3 py-1 text-xs font-medium {getReportStatusColor(
								report.status
							)}"
						>
							{getReportStatusLabel(report.status)}
						</span>
					</div>
					<div class="mt-6 text-sm text-slate-500">
						El enlace externo será informado por el liquidador.
					</div>
				</div>
			{:else}
				<a
					href={report.href}
					class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-slate-600"
					target={report.isExternal ? '_blank' : undefined}
					rel={report.isExternal ? 'noopener noreferrer' : undefined}
				>
					<div class="flex items-start justify-between">
						<div>
							<p class="text-sm tracking-[0.2em] text-slate-500 uppercase">{report.format}</p>
							<h2 class="mt-3 text-2xl font-semibold">{report.title}</h2>
							<p class="mt-3 text-sm leading-6 text-slate-400">{report.description}</p>
						</div>
						{#if report.status !== 'available'}
							<span
								class="rounded-full px-3 py-1 text-xs font-medium {getReportStatusColor(
									report.status
								)}"
							>
								{getReportStatusLabel(report.status)}
							</span>
						{/if}
					</div>
					<div class="mt-6 text-sm font-medium text-slate-300">
						{report.isExternal ? 'Abrir portal externo →' : 'Abrir módulo →'}
					</div>
				</a>
			{/if}
		{/each}
	</section>
</div>
