<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Administración de Asistencia | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="mb-2 text-3xl font-bold text-white">Administración de Asistencia</h1>
		<p class="text-slate-400">Gestión y reportes de asistencia institucional</p>
	</div>

	<!-- Accesos por permiso -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#if data.permissions?.canViewCommissions}
			<a
				href="/comisiones"
				class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-950/50 text-indigo-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white transition group-hover:text-indigo-400">
					Comisiones
				</h3>
				<p class="text-sm text-slate-400">
					Gestionar comisiones y ver reportes de asistencia por comisión
				</p>
			</a>
		{/if}

		{#if data.permissions?.canViewReports}
			<a
				href="/reportes/academico"
				class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950/50 text-emerald-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="20" x2="18" y2="10" />
						<line x1="12" y1="20" x2="12" y2="4" />
						<line x1="6" y1="20" x2="6" y2="14" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white transition group-hover:text-emerald-400">
					Reportes Académicos
				</h3>
				<p class="text-sm text-slate-400">
					Consolidado institucional de matrícula, regularidad y asistencia
				</p>
			</a>
		{/if}

		{#if data.permissions?.canViewStudents}
			<a
				href="/alumnos"
				class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-950/50 text-amber-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="8.5" cy="7" r="4" />
						<line x1="20" y1="8" x2="20" y2="14" />
						<line x1="23" y1="11" x2="17" y2="11" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white transition group-hover:text-amber-400">
					Estudiantes
				</h3>
				<p class="text-sm text-slate-400">
					Ver historial de asistencia y seguimiento de estudiantes
				</p>
			</a>
		{/if}

		{#if data.permissions?.canViewSubjects}
			<a
				href="/materias"
				class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-950/50 text-cyan-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
						<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white transition group-hover:text-cyan-400">Materias</h3>
				<p class="text-sm text-slate-400">Gestión de materias y asignación de docentes</p>
			</a>
		{/if}

		{#if data.permissions?.canViewTeachers}
			<a
				href="/docentes"
				class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-950/50 text-purple-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white transition group-hover:text-purple-400">
					Docentes
				</h3>
				<p class="text-sm text-slate-400">Gestión de docentes y sus asignaciones</p>
			</a>
		{/if}

		{#if data.permissions?.canViewPreceptors}
			<a
				href="/preceptores"
				class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-950/50 text-rose-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="8.5" cy="7" r="4" />
						<line x1="20" y1="8" x2="20" y2="14" />
						<line x1="23" y1="11" x2="17" y2="11" />
					</svg>
				</div>
				<h3 class="mb-2 font-semibold text-white transition group-hover:text-rose-400">
					Preceptores
				</h3>
				<p class="text-sm text-slate-400">Gestión de preceptores y sus localidades</p>
			</a>
		{/if}
	</div>

	<!-- Información de acceso -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
		<h2 class="mb-4 text-lg font-semibold text-white">Información de Acceso</h2>
		<div class="space-y-3 text-sm text-slate-400">
			<p>
				<strong class="text-slate-300">Docentes:</strong> Redirigidos automáticamente a /docente/asistencia
				para cargar asistencia de sus materias.
			</p>
			<p>
				<strong class="text-slate-300">Preceptores:</strong> Redirigidos automáticamente a /preceptor/asistencia
				para cargar asistencia de estudiantes.
			</p>
			<p>
				<strong class="text-slate-300">Alumnos:</strong> Redirigidos automáticamente a /alumno/asistencia
				para ver su asistencia personal.
			</p>
			<p>
				<strong class="text-slate-300">Roles administrativos:</strong> Pueden acceder a reportes generales,
				comisiones y gestión de asistencia institucional desde esta página.
			</p>
		</div>
	</div>
</div>
