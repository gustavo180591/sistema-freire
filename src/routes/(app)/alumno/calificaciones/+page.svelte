<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function getGradeColor(value: number): string {
		if (value >= 7) return 'text-emerald-400 bg-emerald-950/50';
		if (value >= 4) return 'text-amber-400 bg-amber-950/50';
		return 'text-red-400 bg-red-950/50';
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'REGULAR': return 'text-amber-400 bg-amber-950/50';
			case 'APROBADO': return 'text-emerald-400 bg-emerald-950/50';
			case 'LIBRE': return 'text-red-400 bg-red-950/50';
			default: return 'text-slate-400 bg-slate-800';
		}
	}
</script>

<svelte:head>
	<title>Mis Calificaciones | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Calificaciones</p>
				<h1 class="mt-2 text-3xl font-bold">Mis notas</h1>
				<p class="mt-2 text-slate-400">
					{data.student.firstName} {data.student.lastName}
				</p>
			</div>
			<div class="text-right">
				<p class="text-sm text-slate-400">Promedio general</p>
				<p class="text-4xl font-bold {getGradeColor(data.overallAverage)}">
					{data.overallAverage.toFixed(2)}
				</p>
				<p class="text-sm text-slate-500">{data.totalGrades} evaluaciones</p>
			</div>
		</div>
	</div>

	<!-- Resumen de materias -->
	{#if data.subjectStatuses.length > 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<h2 class="mb-4 text-lg font-semibold">📚 Estado de materias</h2>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.subjectStatuses as status}
					<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
						<div class="flex items-start justify-between">
							<div>
								<p class="font-medium">{status.subject}</p>
								<span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs {getStatusColor(status.status)}">
									{status.status}
								</span>
							</div>
							<div class="text-right">
								<p class="text-sm text-slate-400">Asistencia</p>
								<p class="font-semibold {status.attendancePercent >= 80 ? 'text-emerald-400' : 'text-amber-400'}">
									{status.attendancePercent}%
								</p>
							</div>
						</div>
						{#if status.approved}
							<div class="mt-3 flex items-center gap-2 text-emerald-400">
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span class="text-sm font-medium">Materia aprobada</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Calificaciones detalladas -->
	{#if data.subjects.length > 0}
		<div class="space-y-6">
			<h2 class="text-lg font-semibold">📝 Evaluaciones detalladas</h2>
			
			{#each data.subjects as subject}
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h3 class="font-semibold">{subject.subject}</h3>
							<p class="text-sm text-slate-400">{subject.commission}</p>
						</div>
						<div class="text-right">
							<p class="text-sm text-slate-400">Promedio</p>
							<p class="text-2xl font-bold {getGradeColor(subject.average)}">
								{subject.average.toFixed(2)}
							</p>
						</div>
					</div>

					<!-- Lista de notas -->
					<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
						{#each subject.grades as grade}
							<div class="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
								<p class="text-2xl font-bold {getGradeColor(grade.value)}">
									{grade.value.toFixed(1)}
								</p>
								<p class="mt-1 text-sm text-slate-400">{grade.type}</p>
								<p class="text-xs text-slate-500">
									{new Date(grade.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
								</p>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
			<p class="text-slate-400">No hay calificaciones registradas aún</p>
		</div>
	{/if}

	<div class="flex justify-start">
		<a href="/alumno" class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800">
			← Volver al panel
		</a>
	</div>
</div>
