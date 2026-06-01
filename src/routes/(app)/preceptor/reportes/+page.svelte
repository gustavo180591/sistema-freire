<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Reportes Básicos | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>
		<h1 class="mt-2 text-3xl font-bold">Reportes Básicos</h1>
		<p class="mt-2 text-slate-400">Estadísticas y métricas del sistema</p>
	</div>

	<!-- Estadísticas Generales -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-blue-950/50 p-3">
					<svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Tasa de Asistencia</p>
					<p class="text-2xl font-bold">{data.stats.attendanceRate}%</p>
				</div>
			</div>
			<p class="mt-4 text-xs text-slate-500">
				{data.stats.presentAttendance}/{data.stats.totalAttendance} registros
			</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-red-950/50 p-3">
					<svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Incidencias</p>
					<p class="text-2xl font-bold">{data.stats.incidentCount}</p>
				</div>
			</div>
			<p class="mt-4 text-xs text-slate-500">Últimos 30 días</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-emerald-950/50 p-3">
					<svg class="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Carreras Activas</p>
					<p class="text-2xl font-bold">{data.careers.length}</p>
				</div>
			</div>
			<p class="mt-4 text-xs text-slate-500">Total en el sistema</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-amber-950/50 p-3">
					<svg class="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Observaciones</p>
					<p class="text-2xl font-bold">{data.stats.observationsByType.reduce((sum, o) => sum + o.count, 0)}</p>
				</div>
			</div>
			<p class="mt-4 text-xs text-slate-500">Últimos 30 días</p>
		</div>
	</div>

	<!-- Estudiantes por Carrera -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Estudiantes por Carrera</h2>
		<div class="space-y-3">
			{#each data.stats.careerStats as stat}
				<div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
					<p class="font-semibold text-white">{stat.careerName}</p>
					<p class="text-2xl font-bold text-blue-400">{stat.count}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Observaciones por Tipo -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Observaciones por Tipo (Últimos 30 días)</h2>
		<div class="space-y-3">
			{#each data.stats.observationsByType as obs}
				<div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
					<p class="font-semibold text-white">{obs.type}</p>
					<p class="text-2xl font-bold text-amber-400">{obs.count}</p>
				</div>
			{/each}
			{#if data.stats.observationsByType.length === 0}
				<p class="text-center text-slate-400">No hay observaciones registradas</p>
			{/if}
		</div>
	</div>

	<div class="flex justify-start">
		<a href="/preceptor" class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800">
			← Volver al panel
		</a>
	</div>
</div>
