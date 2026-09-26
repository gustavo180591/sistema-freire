<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function followUpLabel(type: string): string {
		const labels: Record<string, string> = {
			INTERVIEW: 'Entrevista',
			OBSERVATION: 'Observación',
			WARNING: 'Advertencia',
			MEETING: 'Reunión',
			INCIDENT: 'Incidencia',
			ACHIEVEMENT: 'Logro',
			NOTE: 'Nota'
		};

		return labels[type] ?? type;
	}
</script>

<svelte:head>
	<title>Reportes | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>

		<h1 class="mt-2 text-3xl font-bold">Reportes</h1>

		<p class="mt-2 text-slate-400">Métricas de los alumnos pertenecientes a tus sedes asignadas</p>

		<div class="mt-5 flex flex-wrap gap-2">
			{#each data.scope.locations as location}
				<span
					class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300"
				>
					{location.name}
				</span>
			{/each}
		</div>

		{#if data.scope.locations.length === 0}
			<div class="mt-5 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4">
				<p class="text-sm text-amber-300">
					No tenés sedes activas asignadas. Los reportes operativos permanecerán vacíos.
				</p>
			</div>
		{/if}
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-blue-950/50 p-3">
					<svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
				</div>

				<div>
					<p class="text-sm text-slate-400">Tasa de Asistencia</p>

					<p class="text-2xl font-bold">
						{data.stats.attendanceRate}%
					</p>
				</div>
			</div>

			<p class="mt-4 text-xs text-slate-500">
				{data.stats.presentAttendance}/{data.stats.totalAttendance}
				registros · últimos 30 días
			</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-red-950/50 p-3">
					<svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>

				<div>
					<p class="text-sm text-slate-400">Incidencias</p>

					<p class="text-2xl font-bold">
						{data.stats.incidentCount}
					</p>
				</div>
			</div>

			<p class="mt-4 text-xs text-slate-500">Últimos 30 días · dentro de tus sedes</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-emerald-950/50 p-3">
					<svg
						class="h-6 w-6 text-emerald-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>

				<div>
					<p class="text-sm text-slate-400">Alumnos activos</p>

					<p class="text-2xl font-bold">
						{data.stats.activeStudentCount}
					</p>
				</div>
			</div>

			<p class="mt-4 text-xs text-slate-500">Dentro de tus sedes asignadas</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-amber-950/50 p-3">
					<svg class="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
				</div>

				<div>
					<p class="text-sm text-slate-400">Seguimientos</p>

					<p class="text-2xl font-bold">
						{data.stats.followUpsByType.reduce((sum, followUp) => sum + followUp.count, 0)}
					</p>
				</div>
			</div>

			<p class="mt-4 text-xs text-slate-500">Últimos 30 días · dentro de tus sedes</p>
		</div>
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<div class="mb-4 flex items-center justify-between gap-4">
			<div>
				<h2 class="text-xl font-semibold">Estudiantes por Carrera</h2>

				<p class="mt-1 text-sm text-slate-500">
					Distribución de alumnos activos dentro de tus sedes
				</p>
			</div>
		</div>

		<div class="space-y-3">
			{#each data.stats.careerStats as stat}
				<div
					class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
				>
					<p class="font-semibold text-white">
						{stat.careerName}
					</p>

					<p class="text-2xl font-bold text-blue-400">
						{stat.count}
					</p>
				</div>
			{/each}

			{#if data.stats.careerStats.length === 0}
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-8 text-center">
					<p class="text-slate-400">
						No hay alumnos activos para reportar dentro de tus sedes asignadas.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<div class="mb-4">
			<h2 class="text-xl font-semibold">Seguimientos por Tipo</h2>

			<p class="mt-1 text-sm text-slate-500">Registros realizados durante los últimos 30 días</p>
		</div>

		<div class="space-y-3">
			{#each data.stats.followUpsByType as followUp}
				<div
					class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
				>
					<p class="font-semibold text-white">
						{followUpLabel(followUp.type)}
					</p>

					<p class="text-2xl font-bold text-amber-400">
						{followUp.count}
					</p>
				</div>
			{/each}

			{#if data.stats.followUpsByType.length === 0}
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-8 text-center">
					<p class="text-slate-400">
						No hay seguimientos registrados durante los últimos 30 días dentro de tus sedes.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex justify-start">
		<a
			href="/preceptor"
			class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800"
		>
			← Volver al panel
		</a>
	</div>
</div>
