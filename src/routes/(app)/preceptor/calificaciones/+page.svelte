<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Consultar Calificaciones | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>
		<h1 class="mt-2 text-3xl font-bold">Consultar Calificaciones</h1>
		<p class="mt-2 text-slate-400">Visualización de notas de estudiantes (solo lectura)</p>
	</div>

	<!-- Tabla de Calificaciones -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold text-white">Calificaciones Recientes</h2>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-slate-800">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
							>Estudiante</th
						>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Materia</th
						>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
							>Evaluación</th
						>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Nota</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Estado</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Fecha</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800">
					{#each data.grades as grade}
						<tr class="transition-colors hover:bg-slate-800/50">
							<td class="px-4 py-3 text-sm text-white">{grade.studentName}</td>
							<td class="px-4 py-3 text-sm text-slate-300">{grade.subject}</td>
							<td class="px-4 py-3 text-sm text-slate-300">{grade.evaluationTitle}</td>
							<td class="px-4 py-3 text-sm font-semibold text-white">{grade.value}</td>
							<td class="px-4 py-3 text-sm text-slate-300">{grade.status}</td>
							<td class="px-4 py-3 text-sm text-slate-300"
								>{new Date(grade.createdAt).toLocaleDateString()}</td
							>
						</tr>
					{/each}
					{#if data.grades.length === 0}
						<tr>
							<td colspan="6" class="px-4 py-8 text-center text-slate-400">
								No hay calificaciones registradas
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
