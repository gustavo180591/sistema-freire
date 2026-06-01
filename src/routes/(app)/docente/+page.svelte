<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedCommission = $state<string | null>(null);
	let searchQuery = $state('');

	let filteredStudents = $derived.by(() => {
		return data.students.filter((s: any) => {
			const matchesSearch = !searchQuery ||
				s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.dni.includes(searchQuery);
			return matchesSearch;
		});
	});
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">
				Bienvenido, Prof. {data.teacher.lastName} {data.teacher.firstName}
			</h1>
			<p class="text-slate-400">Panel de control docente</p>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
			<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-slate-400 text-sm">Materias Asignadas</p>
						<p class="text-3xl font-bold text-white mt-1">{data.commissions.length}</p>
					</div>
					<div class="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
						<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
					</div>
				</div>
			</div>

			<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-slate-400 text-sm">Alumnos</p>
						<p class="text-3xl font-bold text-white mt-1">{data.students.length}</p>
					</div>
					<div class="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center">
						<svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
					</div>
				</div>
			</div>

			<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-slate-400 text-sm">Calificaciones Cargadas</p>
						<p class="text-3xl font-bold text-white mt-1">{data.recentGrades.length}</p>
					</div>
					<div class="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
						<svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
				</div>
			</div>

			<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-slate-400 text-sm">Registros de Asistencia</p>
						<p class="text-3xl font-bold text-white mt-1">{data.recentAttendance.length}</p>
					</div>
					<div class="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
						<svg class="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
				</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="mb-8">
			<h2 class="text-xl font-semibold text-white mb-4">Acciones Rápidas</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<a href="/docente/calificaciones" class="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-colors group">
					<div class="flex items-center space-x-4">
						<div class="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
							<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
							</svg>
						</div>
						<div>
							<p class="font-semibold text-white">Cargar Calificaciones</p>
							<p class="text-sm text-slate-400">Registrar notas de evaluaciones</p>
						</div>
					</div>
				</a>

				<a href="/docente/asistencia" class="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-colors group">
					<div class="flex items-center space-x-4">
						<div class="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
							<svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
						</div>
						<div>
							<p class="font-semibold text-white">Registrar Asistencia</p>
							<p class="text-sm text-slate-400">Control de presencia en clases</p>
						</div>
					</div>
				</a>

				<a href="/docente/materiales" class="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-colors group">
					<div class="flex items-center space-x-4">
						<div class="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
							<svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<div>
							<p class="font-semibold text-white">Materiales de Clase</p>
							<p class="text-sm text-slate-400">Subir y gestionar recursos</p>
						</div>
					</div>
				</a>

				<a href="/docente/evaluaciones" class="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-colors group">
					<div class="flex items-center space-x-4">
						<div class="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
							<svg class="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
						</div>
						<div>
							<p class="font-semibold text-white">Evaluaciones</p>
							<p class="text-sm text-slate-400">Crear y gestionar exámenes</p>
						</div>
					</div>
				</a>

				<a href="/docente/comunicados" class="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-colors group">
					<div class="flex items-center space-x-4">
						<div class="h-12 w-12 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
							<svg class="h-6 w-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
							</svg>
						</div>
						<div>
							<p class="font-semibold text-white">Comunicados</p>
							<p class="text-sm text-slate-400">Enviar avisos a alumnos</p>
						</div>
					</div>
				</a>

				<a href="/docente/horarios" class="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-colors group">
					<div class="flex items-center space-x-4">
						<div class="h-12 w-12 bg-cyan-500/20 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
							<svg class="h-6 w-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div>
							<p class="font-semibold text-white">Horarios</p>
							<p class="text-sm text-slate-400">Consultar horarios de clases</p>
						</div>
					</div>
				</a>
			</div>
		</div>

		<!-- Materias Asignadas -->
		<div class="mb-8">
			<h2 class="text-xl font-semibold text-white mb-4">Materias Asignadas</h2>
			<div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
				<table class="w-full">
					<thead class="bg-slate-800">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Materia</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Comisión</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Ciclo</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estado</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800">
						{#each data.commissions as commission}
							<tr class="hover:bg-slate-800/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-white">{commission.subject}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{commission.name}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{commission.term}</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if commission.active}
										<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">Activa</span>
									{:else}
										<span class="px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400">Inactiva</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Alumnos -->
		<div class="mb-8">
			<h2 class="text-xl font-semibold text-white mb-4">Alumnos</h2>
			<div class="mb-4">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Buscar por nombre, apellido o DNI..."
					class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 transition outline-none focus:border-slate-500"
				/>
			</div>
			<div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
				<table class="w-full">
					<thead class="bg-slate-800">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">DNI</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Apellido</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nombre</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Carrera</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Año</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800">
						{#each filteredStudents as student (student.id)}
							<tr class="hover:bg-slate-800/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{student.dni}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-white">{student.lastName}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-white">{student.firstName}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{student.career}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{student.currentYear}°</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Calificaciones Recientes -->
		<div class="mb-8">
			<h2 class="text-xl font-semibold text-white mb-4">Calificaciones Recientes</h2>
			<div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
				<table class="w-full">
					<thead class="bg-slate-800">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Alumno</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Materia</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nota</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tipo</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fecha</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800">
						{#each data.recentGrades as grade}
							<tr class="hover:bg-slate-800/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-white">{grade.studentName}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{grade.subject}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">{grade.value}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{grade.gradeType}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{new Date(grade.gradedAt).toLocaleDateString()}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Asistencia Reciente -->
		<div>
			<h2 class="text-xl font-semibold text-white mb-4">Asistencia Reciente</h2>
			<div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
				<table class="w-full">
					<thead class="bg-slate-800">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Fecha</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Materia</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Comisión</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Presentes</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Total</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800">
						{#each data.recentAttendance as attendance}
							<tr class="hover:bg-slate-800/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-white">{new Date(attendance.date).toLocaleDateString()}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{attendance.subject}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{attendance.commission}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-green-400">{attendance.presentStudents}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{attendance.totalStudents}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
