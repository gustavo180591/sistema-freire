<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-white">Reporte de Calificaciones por Comisión</h1>
			<p class="text-slate-400">Estadísticas detalladas de la comisión</p>
		</div>

		<!-- Datos de la Comisión -->
		<div class="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<h2 class="mb-4 text-xl font-semibold text-white">Datos de la Comisión</h2>
			<div class="grid gap-4 md:grid-cols-3">
				<div>
					<div class="text-sm text-slate-400">Comisión</div>
					<div class="text-lg font-medium text-white">{data.commission.name}</div>
				</div>
				<div>
					<div class="text-sm text-slate-400">Materia</div>
					<div class="text-lg font-medium text-white">
						{data.commission.subject} ({data.commission.subjectCode})
					</div>
				</div>
				<div>
					<div class="text-sm text-slate-400">Carrera</div>
					<div class="text-lg font-medium text-white">{data.commission.career}</div>
				</div>
				<div>
					<div class="text-sm text-slate-400">Ciclo Lectivo</div>
					<div class="text-lg font-medium text-white">{data.commission.academicTerm}</div>
				</div>
				<div>
					<div class="text-sm text-slate-400">Docente</div>
					<div class="text-lg font-medium text-white">{data.commission.teacher}</div>
				</div>
				<div>
					<div class="text-sm text-slate-400">Localidad</div>
					<div class="text-lg font-medium text-white">{data.commission.location}</div>
				</div>
			</div>
		</div>

		<!-- Resumen General -->
		<div class="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<h2 class="mb-4 text-xl font-semibold text-white">Resumen General</h2>
			<div class="grid gap-4 md:grid-cols-4">
				<div class="rounded-xl bg-slate-800 p-4">
					<div class="text-sm text-slate-400">Total Alumnos</div>
					<div class="text-2xl font-bold text-white">{data.summary.totalStudents}</div>
				</div>
				<div class="rounded-xl bg-slate-800 p-4">
					<div class="text-sm text-slate-400">Promedio Comisión</div>
					<div class="text-2xl font-bold text-white">{data.summary.average}</div>
				</div>
				<div class="rounded-xl border border-green-800 bg-green-900/30 p-4">
					<div class="text-sm text-green-400">Aprobados</div>
					<div class="text-2xl font-bold text-green-400">{data.summary.approved}</div>
				</div>
				<div class="rounded-xl border border-red-800 bg-red-900/30 p-4">
					<div class="text-sm text-red-400">En Riesgo</div>
					<div class="text-2xl font-bold text-red-400">{data.summary.atRisk}</div>
				</div>
			</div>
		</div>

		<!-- Evaluaciones -->
		<div class="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<h2 class="mb-4 text-xl font-semibold text-white">Evaluaciones</h2>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-slate-800">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Título</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Tipo</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">Fecha</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Promedio</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Presentes</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Ausentes</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Aprobados</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Estado</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800">
						{#each data.evaluations as evaluation}
							<tr class="hover:bg-slate-800/50">
								<td class="px-4 py-3 text-sm text-white">{evaluation.title}</td>
								<td class="px-4 py-3 text-sm text-slate-300">{evaluation.type}</td>
								<td class="px-4 py-3 text-sm text-slate-300"
									>{new Date(evaluation.date).toLocaleDateString()}</td
								>
								<td class="px-4 py-3 text-sm font-semibold text-white">{evaluation.average}</td>
								<td class="px-4 py-3 text-sm text-green-400">{evaluation.present}</td>
								<td class="px-4 py-3 text-sm text-red-400">{evaluation.absent}</td>
								<td class="px-4 py-3 text-sm text-blue-400">{evaluation.passed}</td>
								<td class="px-4 py-3">
									{#if evaluation.isClosed}
										<span class="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-300"
											>Cerrada</span
										>
									{:else}
										<span class="rounded-full bg-green-900/30 px-2 py-1 text-xs text-green-400"
											>Abierta</span
										>
									{/if}
								</td>
							</tr>
						{/each}
						{#if data.evaluations.length === 0}
							<tr>
								<td colspan="8" class="px-4 py-8 text-center text-slate-400">
									No hay evaluaciones registradas
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Alumnos -->
		<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<h2 class="mb-4 text-xl font-semibold text-white">Alumnos</h2>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-slate-800">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Alumno</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase">DNI</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Promedio</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Presentes</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Ausentes</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Estado Curso</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Estado Académico</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase"
								>Riesgo</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800">
						{#each data.students as student}
							<tr class="hover:bg-slate-800/50">
								<td class="px-4 py-3 text-sm text-white">{student.name}</td>
								<td class="px-4 py-3 text-sm text-slate-300">{student.dni}</td>
								<td class="px-4 py-3 text-sm font-semibold text-white">{student.average}</td>
								<td class="px-4 py-3 text-sm text-green-400">{student.present}</td>
								<td class="px-4 py-3 text-sm text-red-400">{student.absent}</td>
								<td class="px-4 py-3 text-sm text-slate-300">{student.courseStatus}</td>
								<td class="px-4 py-3 text-sm text-slate-300">{student.academicStatus}</td>
								<td class="px-4 py-3">
									{#if student.atRisk}
										<span class="rounded-full bg-red-900/30 px-2 py-1 text-xs text-red-400"
											>En Riesgo</span
										>
									{:else}
										<span class="rounded-full bg-green-900/30 px-2 py-1 text-xs text-green-400"
											>OK</span
										>
									{/if}
								</td>
							</tr>
						{/each}
						{#if data.students.length === 0}
							<tr>
								<td colspan="8" class="px-4 py-8 text-center text-slate-400">
									No hay alumnos inscriptos
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
