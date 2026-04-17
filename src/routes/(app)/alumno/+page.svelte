<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Mi Panel | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Estudiante</p>
				<h1 class="mt-2 text-3xl font-bold">{data.student.fullName}</h1>
				<p class="mt-2 text-slate-400">{data.student.career}</p>
				<div class="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-950/50 px-4 py-1.5 text-sm text-emerald-400">
					<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
					{data.student.status}
				</div>
			</div>
			<div class="text-right">
				<p class="text-sm text-slate-400">DNI</p>
				<p class="text-xl font-semibold">{data.student.dni}</p>
			</div>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<a href="/alumnos/{data.student.id}/historial" class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-blue-950/50 p-3">
					<svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Materias cursadas</p>
					<p class="text-2xl font-bold">{data.academic.totalSubjects}</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400 group-hover:text-slate-300">Ver historial académico →</p>
		</a>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-emerald-950/50 p-3">
					<svg class="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Aprobadas</p>
					<p class="text-2xl font-bold text-emerald-400">{data.academic.approvedSubjects}</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400">{data.academic.progress}% de avance</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-amber-950/50 p-3">
					<svg class="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Regularizadas</p>
					<p class="text-2xl font-bold text-amber-400">{data.academic.regularSubjects}</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400">Materias en curso</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-red-950/50 p-3">
					<svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div>
					<p class="text-sm text-slate-400">Deuda total</p>
					<p class="text-2xl font-bold {data.finances.totalDebt > 0 ? 'text-red-400' : 'text-emerald-400'}">
						${data.finances.totalDebt.toLocaleString()}
					</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-slate-400">
				{data.finances.totalDebt > 0 ? 'Pendiente de pago' : 'Al día'}
			</p>
		</div>
	</div>

	<!-- Inscripciones -->
	{#if data.enrollments.length > 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<h2 class="text-lg font-semibold mb-4">📚 Mis Inscripciones</h2>
			<div class="space-y-3">
				{#each data.enrollments as enrollment}
					<div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
						<div>
							<p class="font-medium">{enrollment.subject}</p>
							<p class="text-sm text-slate-400">{enrollment.commission} • Año {enrollment.year}</p>
						</div>
						<span class="rounded-full bg-emerald-950/50 px-3 py-1 text-sm text-emerald-400">Activa</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Últimos cargos -->
	{#if data.finances.charges.length > 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<h2 class="text-lg font-semibold mb-4">💰 Últimos Movimientos</h2>
			<div class="space-y-3">
				{#each data.finances.charges as charge}
					<div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
						<div>
							<p class="font-medium">{charge.concept?.name || 'Concepto'}</p>
							<p class="text-sm text-slate-400">{new Date(charge.createdAt).toLocaleDateString('es-AR')}</p>
						</div>
						<p class="font-semibold text-red-400">${Number(charge.amount).toLocaleString()}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Navegación -->
	<div class="grid gap-4 md:grid-cols-3">
		<a href="/alumno/perfil" class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700">
			<div class="flex items-center gap-3">
				<span class="text-2xl">👤</span>
				<div>
					<p class="font-semibold group-hover:text-white">Mi Perfil</p>
					<p class="text-sm text-slate-400">Editar mis datos</p>
				</div>
			</div>
		</a>

		<a href="/alumno/asistencia" class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700">
			<div class="flex items-center gap-3">
				<span class="text-2xl">📋</span>
				<div>
					<p class="font-semibold group-hover:text-white">Asistencia</p>
					<p class="text-sm text-slate-400">Ver mi asistencia</p>
				</div>
			</div>
		</a>

		<a href="/alumno/calificaciones" class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700">
			<div class="flex items-center gap-3">
				<span class="text-2xl">📝</span>
				<div>
					<p class="font-semibold group-hover:text-white">Calificaciones</p>
					<p class="text-sm text-slate-400">Ver mis notas</p>
				</div>
			</div>
		</a>
	</div>
</div>
