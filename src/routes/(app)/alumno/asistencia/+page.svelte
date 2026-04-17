<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Mi Asistencia | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Asistencia</p>
				<h1 class="mt-2 text-3xl font-bold">Registro de asistencias</h1>
				<p class="mt-2 text-slate-400">
					{data.student.firstName} {data.student.lastName}
				</p>
			</div>
			<div class="text-right">
				<p class="text-sm text-slate-400">Asistencia general</p>
				<p class="text-4xl font-bold {data.overallAttendance >= 80 ? 'text-emerald-400' : data.overallAttendance >= 60 ? 'text-amber-400' : 'text-red-400'}">
					{data.overallAttendance}%
				</p>
				<p class="text-sm text-slate-500">{data.totalClasses} clases registradas</p>
			</div>
		</div>
	</div>

	<!-- Asistencia por materia -->
	{#if data.subjects.length > 0}
		<div class="space-y-6">
			{#each data.subjects as subject}
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold">{subject.subject}</h2>
							<p class="text-sm text-slate-400">{subject.commission}</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold {subject.percentage >= 80 ? 'text-emerald-400' : subject.percentage >= 60 ? 'text-amber-400' : 'text-red-400'}">
								{subject.percentage}%
							</p>
							<p class="text-xs text-slate-500">
								{subject.present} presente / {subject.absent} ausente
							</p>
						</div>
					</div>

					<!-- Progress bar -->
					<div class="mb-4 h-2 w-full rounded-full bg-slate-800">
						<div 
							class="h-2 rounded-full transition-all {subject.percentage >= 80 ? 'bg-emerald-400' : subject.percentage >= 60 ? 'bg-amber-400' : 'bg-red-400'}"
							style="width: {subject.percentage}%"
						></div>
					</div>

					<!-- Lista de clases -->
					<div class="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
						{#each subject.entries.slice(0, 10) as entry}
							<div class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
								<span class="h-8 w-8 rounded-full flex items-center justify-center {entry.present ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950/50 text-red-400'}">
									{entry.present ? '✓' : '✗'}
								</span>
								<div class="flex-1">
									<p class="text-sm font-medium">
										{new Date(entry.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
									</p>
									{#if entry.notes}
										<p class="text-xs text-slate-500">{entry.notes}</p>
									{/if}
								</div>
							</div>
						{/each}
						{#if subject.entries.length > 10}
							<p class="text-center text-sm text-slate-500 col-span-full">
								+ {subject.entries.length - 10} clases más
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
			<p class="text-slate-400">No hay registros de asistencia aún</p>
		</div>
	{/if}

	<div class="flex justify-start">
		<a href="/alumno" class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800">
			← Volver al panel
		</a>
	</div>
</div>
