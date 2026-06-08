<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let { commission, students, attendanceRecords, stats, userRole } = $derived(data);

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function getRegularityBadge(status: string): string {
		switch (status) {
			case 'REGULAR':
				return 'bg-green-900/30 text-green-400 border-green-800';
			case 'LIBRE':
				return 'bg-red-900/30 text-red-400 border-red-800';
			default:
				return 'bg-slate-800 text-slate-400';
		}
	}

	function getAttendanceColor(percent: number): string {
		if (percent >= 75) return 'text-green-400';
		if (percent >= 50) return 'text-yellow-400';
		return 'text-red-400';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-white">Asistencia de Comisión</h1>
			<p class="text-slate-400">
				{commission.subject.code} - {commission.subject.name} | Comisión {commission.code}
			</p>
		</div>
		<button
			onclick={() => goto('/comisiones')}
			class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-300 transition hover:bg-slate-700"
		>
			Volver
		</button>
	</div>

	<!-- Info de la comisión -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div>
				<p class="text-sm text-slate-400">Carrera</p>
				<p class="font-medium text-white">{commission.career?.name || 'No asignada'}</p>
			</div>
			<div>
				<p class="text-sm text-slate-400">Período</p>
				<p class="font-medium text-white">{commission.academicTerm?.name || 'No asignado'}</p>
			</div>
			<div>
				<p class="text-sm text-slate-400">Docente</p>
				<p class="font-medium text-white">
					{commission.teacher
						? `${commission.teacher.firstName} ${commission.teacher.lastName}`
						: 'No asignado'}
				</p>
			</div>
		</div>
	</div>

	<!-- Estadísticas -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-5">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<p class="text-sm text-slate-400">Total Estudiantes</p>
			<p class="text-2xl font-bold text-white">{stats.totalStudents}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<p class="text-sm text-slate-400">Regulares</p>
			<p class="text-2xl font-bold text-green-400">{stats.regularStudents}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<p class="text-sm text-slate-400">Libres</p>
			<p class="text-2xl font-bold text-red-400">{stats.libreStudents}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<p class="text-sm text-slate-400">En Riesgo</p>
			<p class="text-2xl font-bold text-yellow-400">{stats.criticalStudents}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<p class="text-sm text-slate-400">Asistencia Promedio</p>
			<p class="text-2xl font-bold {getAttendanceColor(stats.avgAttendance)}">{stats.avgAttendance}%</p>
		</div>
	</div>

	<!-- Tabla de estudiantes -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
		<div class="border-b border-slate-800 bg-slate-800/50 px-6 py-4">
			<h2 class="text-lg font-semibold text-white">Asistencia por Estudiante</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-slate-800 bg-slate-800/30">
						<th class="px-6 py-3 text-left text-sm font-medium text-slate-400">Estudiante</th>
						<th class="px-6 py-3 text-center text-sm font-medium text-slate-400">Asistencia</th>
						<th class="px-6 py-3 text-center text-sm font-medium text-slate-400">Clases</th>
						<th class="px-6 py-3 text-center text-sm font-medium text-slate-400">Presentes</th>
						<th class="px-6 py-3 text-center text-sm font-medium text-slate-400">Ausentes</th>
						<th class="px-6 py-3 text-center text-sm font-medium text-slate-400">Estado</th>
					</tr>
				</thead>
				<tbody>
					{#each students as student}
						<tr class="border-b border-slate-800 hover:bg-slate-800/30">
							<td class="px-6 py-4">
								<div>
									<p class="font-medium text-white">
										{student.student.lastName}, {student.student.firstName}
									</p>
									<p class="text-sm text-slate-400">{student.student.dni}</p>
								</div>
							</td>
							<td class="px-6 py-4 text-center">
								<span class="text-lg font-bold {getAttendanceColor(student.attendancePercent)}"
									>{student.attendancePercent}%</span
								>
							</td>
							<td class="px-6 py-4 text-center text-slate-300">{student.totalClasses}</td>
							<td class="px-6 py-4 text-center text-green-400">{student.presentClasses}</td>
							<td class="px-6 py-4 text-center text-red-400">{student.absentClasses}</td>
							<td class="px-6 py-4 text-center">
								<span
									class="rounded-full border px-3 py-1 text-xs font-medium {getRegularityBadge(
										student.regularityStatus
									)}"
								>
									{student.regularityStatus}
									{#if student.isCritical}
										<span class="ml-1 text-yellow-400">⚠️</span>
									{/if}
								</span>
							</td>
						</tr>
					{/each}
					{#if students.length === 0}
						<tr>
							<td colspan="6" class="px-6 py-8 text-center text-slate-400">
								No hay estudiantes inscriptos en esta comisión
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Historial de registros de asistencia -->
	{#if attendanceRecords.length > 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
			<div class="border-b border-slate-800 bg-slate-800/50 px-6 py-4">
				<h2 class="text-lg font-semibold text-white">Historial de Registros</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-slate-800 bg-slate-800/30">
							<th class="px-6 py-3 text-left text-sm font-medium text-slate-400">Fecha</th>
							<th class="px-6 py-3 text-left text-sm font-medium text-slate-400">Materia</th>
							<th class="px-6 py-3 text-center text-sm font-medium text-slate-400">Total</th>
							<th class="px-6 py-3 text-center text-sm font-medium text-slate-400">Presentes</th>
						</tr>
					</thead>
					<tbody>
						{#each attendanceRecords as record}
							<tr class="border-b border-slate-800 hover:bg-slate-800/30">
								<td class="px-6 py-4 text-slate-300">{formatDate(record.date)}</td>
								<td class="px-6 py-4 text-slate-300">{record.subject}</td>
								<td class="px-6 py-4 text-center text-slate-300">{record.totalStudents}</td>
								<td class="px-6 py-4 text-center text-green-400">{record.presentStudents}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
