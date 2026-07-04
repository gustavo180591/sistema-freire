<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const student = $derived(data.student);
	const academic = $derived(data.academic);
	const financial = $derived(data.financial);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	// Funciones para colores semánticos
	function getAttendanceColor(percent: number): string {
		if (percent >= 75) return 'text-emerald-400';
		if (percent >= 60) return 'text-amber-400';
		return 'text-red-400';
	}

	function getRegularityBadgeColor(status: string): string {
		switch (status) {
			case 'REGULAR':
				return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
			case 'LIBRE':
				return 'bg-red-500/20 text-red-400 border-red-500/30';
			case 'PROMOCIONADO':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			default:
				return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
		}
	}

	function getApprovedBadge(approved: boolean): string {
		return approved
			? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
			: 'bg-slate-500/20 text-slate-400 border-slate-500/30';
	}
</script>

<svelte:head>
	<title>Historial académico | {student.fullName}</title>
	<meta name="description" content="Legajo académico y financiero del alumno" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Legajo digital</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">
					{student.fullName}
				</h1>
				<p class="mt-3 text-sm text-slate-400">
					DNI: {student.dni} · {student.career} · {student.currentYear}° Año
				</p>
				<div class="mt-4 inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm">
					{student.status}
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<a
					href="/alumno"
					class="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
				>
					← Volver al panel
				</a>
			</div>
		</div>
	</section>

	<!-- KPIs -->
	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Progreso carrera</p>
			<h2 class="mt-3 text-4xl font-bold">{academic.progress}%</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Aprobadas</p>
			<h2 class="mt-3 text-4xl font-bold text-emerald-400">{academic.approvedSubjects}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Regulares</p>
			<h2 class="mt-3 text-4xl font-bold text-blue-400">{academic.regularSubjects}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Libres</p>
			<h2 class="mt-3 text-4xl font-bold text-red-400">{academic.freeSubjects || 0}</h2>
		</div>
	</section>

	<!-- Financial KPI -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm text-slate-400">Deuda pendiente</p>
				<h2 class="mt-2 text-3xl font-bold {financial.totalDebt > 0 ? 'text-red-400' : 'text-emerald-400'}">
					{currency.format(financial.totalDebt)}
				</h2>
			</div>
			{#if financial.totalDebt > 0}
				<div class="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
					Pendiente de pago
				</div>
			{:else}
				<div class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
					Al día
				</div>
			{/if}
		</div>
	</section>

	<!-- Historial -->
	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Materia</th>
					<th class="px-6 py-4 text-sm font-semibold">Año</th>
					<th class="px-6 py-4 text-sm font-semibold">Asistencia</th>
					<th class="px-6 py-4 text-sm font-semibold">Regularidad</th>
					<th class="px-6 py-4 text-sm font-semibold">Aprobada</th>
				</tr>
			</thead>
			<tbody>
				{#each academic.subjects as subject}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{subject.subject}</td>
						<td class="px-6 py-4">{subject.yearLevel}°</td>
						<td class="px-6 py-4">
							<span class="font-semibold {getAttendanceColor(subject.attendancePercent)}">
								{subject.attendancePercent}%
							</span>
						</td>
						<td class="px-6 py-4">
							<span class="rounded-full border px-3 py-1 text-xs {getRegularityBadgeColor(subject.regularityStatus)}">
								{subject.regularityStatus}
							</span>
						</td>
						<td class="px-6 py-4">
							<span class="rounded-full border px-3 py-1 text-xs {getApprovedBadge(subject.approved)}">
								{subject.approved ? 'Sí' : 'No'}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
