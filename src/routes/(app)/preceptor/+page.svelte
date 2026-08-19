<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let selectedCareer = $state('');
	let searchQuery = $state('');

	let filteredStudents = $derived.by(() => {
		return data.students.filter((s: any) => {
			const matchesCareer = !selectedCareer || s.careerId === selectedCareer;
			const matchesSearch =
				!searchQuery ||
				s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.dni.includes(searchQuery);
			return matchesCareer && matchesSearch;
		});
	});
</script>

<svelte:head>
	<title>Panel Preceptor | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>
				<h1 class="mt-2 text-3xl font-bold">Panel de Gestión</h1>
				<p class="mt-2 text-slate-400">Gestión de estudiantes, asistencia y calificaciones</p>
			</div>
			<div class="text-right">
				<p class="text-sm text-slate-400">Total Estudiantes</p>
				<p class="text-3xl font-bold">{data.students.length}</p>
			</div>
		</div>
	</div>

	<!-- Filtros -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<div class="grid gap-4 md:grid-cols-2">
			<div>
				<label for="preceptor-search" class="mb-2 block text-sm font-medium text-slate-300"
					>Buscar estudiante</label
				>
				<input
					id="preceptor-search"
					type="text"
					bind:value={searchQuery}
					placeholder="Nombre, apellido o DNI..."
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>
			<div>
				<label for="preceptor-career" class="mb-2 block text-sm font-medium text-slate-300"
					>Filtrar por carrera</label
				>
				<select
					id="preceptor-career"
					bind:value={selectedCareer}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				>
					<option value="">Todas las carreras</option>
					{#each data.careers as career}
						<option value={career.id}>{career.name}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Acciones Rápidas -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<a
			href="/preceptor/asistencia"
			class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
		>
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
					<p class="text-sm text-slate-400">Asistencia</p>
					<p class="text-lg font-bold">Registrar</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Gestionar asistencia →</p>
		</a>

		<a
			href="/preceptor/calificaciones"
			class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
		>
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
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Calificaciones</p>
					<p class="text-lg font-bold">Cargar</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Ingresar notas →</p>
		</a>

		<a
			href="/preceptor/justificaciones"
			class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
		>
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-purple-950/50 p-3">
					<svg
						class="h-6 w-6 text-purple-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Justificaciones</p>
					<p class="text-lg font-bold">Gestionar</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Justificar ausencias →</p>
		</a>

		<a
			href="/preceptor/llegadas-retiros"
			class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
		>
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-orange-950/50 p-3">
					<svg
						class="h-6 w-6 text-orange-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Llegadas/Retiros</p>
					<p class="text-lg font-bold">Registrar</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Eventos horarios →</p>
		</a>

		<a
			href="/preceptor/observaciones"
			class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
		>
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
					<p class="text-sm text-slate-400">Observaciones</p>
					<p class="text-lg font-bold">Registrar</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Seguimiento →</p>
		</a>

		<a
			href="/preceptor/incidencias"
			class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
		>
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
					<p class="text-lg font-bold">Reportar</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Registrar eventos →</p>
		</a>

		<a
			href="/preceptor/comunicados"
			class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
		>
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-cyan-950/50 p-3">
					<svg class="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Comunicados</p>
					<p class="text-lg font-bold">Gestionar</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Documentación →</p>
		</a>

		<a
			href="/preceptor/reportes"
			class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
		>
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-indigo-950/50 p-3">
					<svg
						class="h-6 w-6 text-indigo-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Reportes</p>
					<p class="text-lg font-bold">Ver</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Estadísticas →</p>
		</a>
	</div>

	<!-- Lista de Estudiantes -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Estudiantes Activos</h2>
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-slate-800">
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-400">DNI</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-400">Nombre</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-400">Apellido</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-400">Carrera</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-400">Año</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-400">Estado</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-400">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredStudents as student (student.id)}
						<tr class="border-b border-slate-800/50 hover:bg-slate-800/30">
							<td class="px-4 py-3 text-sm">{student.dni}</td>
							<td class="px-4 py-3 text-sm">{student.firstName}</td>
							<td class="px-4 py-3 text-sm">{student.lastName}</td>
							<td class="px-4 py-3 text-sm">{student.career}</td>
							<td class="px-4 py-3 text-sm">{student.currentYear}°</td>
							<td class="px-4 py-3">
								<span
									class="inline-flex items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-1 text-xs text-emerald-400"
								>
									{student.status}
								</span>
							</td>
							<td class="px-4 py-3">
								<a href="/alumnos/{student.id}" class="text-sm text-blue-400 hover:text-blue-300">
									Ver perfil
								</a>
							</td>
						</tr>
					{/each}
					{#if filteredStudents.length === 0}
						<tr>
							<td colspan="7" class="px-4 py-8 text-center text-slate-400">
								No se encontraron estudiantes
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Información de Materias -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Materias Activas</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.subjects as subject}
				<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
					<p class="font-semibold text-white">{subject.code} - {subject.name}</p>
					<p class="text-sm text-slate-400">{subject.yearLevel}° Año</p>
					<p class="mt-2 text-xs text-slate-500">{subject.careers.join(', ')}</p>
				</div>
			{/each}
		</div>
	</div>
</div>
