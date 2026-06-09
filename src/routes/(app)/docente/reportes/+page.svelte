<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-white">Reportes de Materias</h1>
			<p class="text-slate-400">Estadísticas y rendimiento de tus materias</p>
		</div>

		<!-- Resumen General -->
		<div class="mb-8 grid gap-6 md:grid-cols-4">
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<p class="text-sm text-slate-400">Total Materias</p>
				<p class="mt-1 text-3xl font-bold text-white">{data.subjectReports.length}</p>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<p class="text-sm text-slate-400">Total Alumnos</p>
				<p class="mt-1 text-3xl font-bold text-white">
					{data.subjectReports.reduce((sum, r) => sum + r.totalStudents, 0)}
				</p>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<p class="text-sm text-slate-400">Promedio General</p>
				<p class="mt-1 text-3xl font-bold text-white">
					{data.subjectReports.length > 0
						? Math.round(
								(data.subjectReports.reduce((sum, r) => sum + r.averageGrade, 0) /
									data.subjectReports.length) *
									100
							) / 100
						: 0}
				</p>
			</div>
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<p class="text-sm text-slate-400">Asistencia Promedio</p>
				<p class="mt-1 text-3xl font-bold text-white">
					{data.subjectReports.length > 0
						? Math.round(
								(data.subjectReports.reduce((sum, r) => sum + r.attendanceRate, 0) /
									data.subjectReports.length) *
									10
							) / 10
						: 0}%
				</p>
			</div>
		</div>

		<!-- Reportes por Materia -->
		<div>
			<h2 class="mb-4 text-xl font-semibold text-white">Reportes por Materia</h2>
			<div class="space-y-4">
				{#each data.subjectReports as report}
					<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
						<div class="mb-4 flex items-start justify-between">
							<div>
								<h3 class="text-lg font-semibold text-white">{report.subject}</h3>
							</div>
						</div>

						<div class="grid gap-4 md:grid-cols-4">
							<div class="rounded-xl bg-slate-800 p-4">
								<p class="text-xs text-slate-400">Alumnos</p>
								<p class="text-2xl font-bold text-white">{report.totalStudents}</p>
							</div>
							<div class="rounded-xl bg-slate-800 p-4">
								<p class="text-xs text-slate-400">Calificaciones</p>
								<p class="text-2xl font-bold text-white">{report.totalGrades}</p>
							</div>
							<div class="rounded-xl bg-slate-800 p-4">
								<p class="text-xs text-slate-400">Promedio</p>
								<p class="text-2xl font-bold text-white">{report.averageGrade}</p>
							</div>
							<div class="rounded-xl bg-slate-800 p-4">
								<p class="text-xs text-slate-400">Asistencia</p>
								<p class="text-2xl font-bold text-white">{report.attendanceRate}%</p>
							</div>
						</div>

						<!-- Barra de progreso de asistencia -->
						<div class="mt-4">
							<div class="mb-2 flex justify-between text-sm">
								<span class="text-slate-400">Asistencia</span>
								<span class="text-slate-300">{report.attendanceRate}%</span>
							</div>
							<div class="h-2 w-full rounded-full bg-slate-800">
								<div
									class="h-2 rounded-full {report.attendanceRate >= 80
										? 'bg-green-500'
										: report.attendanceRate >= 60
											? 'bg-yellow-500'
											: 'bg-red-500'}"
									style="width: {report.attendanceRate}%"
								></div>
							</div>
						</div>

						<!-- Barra de progreso de promedio -->
						<div class="mt-4">
							<div class="mb-2 flex justify-between text-sm">
								<span class="text-slate-400">Promedio</span>
								<span class="text-slate-300">{report.averageGrade}/10</span>
							</div>
							<div class="h-2 w-full rounded-full bg-slate-800">
								<div
									class="h-2 rounded-full {report.averageGrade >= 7
										? 'bg-green-500'
										: report.averageGrade >= 5
											? 'bg-yellow-500'
											: 'bg-red-500'}"
									style="width: {(report.averageGrade / 10) * 100}%"
								></div>
							</div>
						</div>
					</div>
				{/each}
				{#if data.subjectReports.length === 0}
					<div
						class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400"
					>
						No hay datos de reportes disponibles
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
