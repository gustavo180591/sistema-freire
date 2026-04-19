<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Mi Perfil | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-4">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-lg">
					{data.user.firstName[0]}{data.user.lastName[0]}
				</div>
				<div>
					<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">{data.user.roles.join(', ')}</p>
					<h1 class="mt-1 text-3xl font-bold">{data.user.fullName}</h1>
					<p class="mt-1 text-slate-400">{data.user.email}</p>
				</div>
			</div>
			<div class="text-right">
				<p class="text-sm text-slate-400">Estado</p>
				<div class="mt-1 inline-flex items-center gap-2 rounded-full bg-emerald-950/50 px-4 py-1.5 text-sm text-emerald-400">
					<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
					{data.user.status}
				</div>
			</div>
		</div>
	</div>

	<!-- Información Personal -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="mb-6 text-xl font-semibold">Información Personal</h2>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label class="block text-sm font-medium text-slate-400 mb-2">Nombre</label>
				<p class="text-white">{data.user.firstName}</p>
			</div>
			<div>
				<label class="block text-sm font-medium text-slate-400 mb-2">Apellido</label>
				<p class="text-white">{data.user.lastName}</p>
			</div>
			<div>
				<label class="block text-sm font-medium text-slate-400 mb-2">Email</label>
				<p class="text-white">{data.user.email}</p>
			</div>
			<div>
				<label class="block text-sm font-medium text-slate-400 mb-2">Roles</label>
				<div class="flex flex-wrap gap-2">
					{#each data.user.roles as role}
						<span class="inline-flex rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs">
							{role}
						</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Accesos Rápidos -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="mb-6 text-xl font-semibold">Accesos Rápidos</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<a href="/usuarios" class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700">
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-blue-950/50 p-2">
						<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
					</div>
					<div>
						<p class="font-medium group-hover:text-white transition">Usuarios</p>
						<p class="text-xs text-slate-400">{data.metrics.totalUsers} registrados</p>
					</div>
				</div>
			</a>

			<a href="/alumnos" class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700">
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-emerald-950/50 p-2">
						<svg class="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
					</div>
					<div>
						<p class="font-medium group-hover:text-white transition">Alumnos</p>
						<p class="text-xs text-slate-400">{data.metrics.totalStudents} registrados</p>
					</div>
				</div>
			</a>

			<a href="/carreras" class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700">
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-purple-950/50 p-2">
						<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
						</svg>
					</div>
					<div>
						<p class="font-medium group-hover:text-white transition">Carreras</p>
						<p class="text-xs text-slate-400">{data.metrics.totalCareers} activas</p>
					</div>
				</div>
			</a>

			<a href="/comisiones" class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700">
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-orange-950/50 p-2">
						<svg class="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					</div>
					<div>
						<p class="font-medium group-hover:text-white transition">Comisiones</p>
						<p class="text-xs text-slate-400">{data.metrics.totalCommissions} activas</p>
					</div>
				</div>
			</a>

			<a href="/finanzas" class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700">
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-green-950/50 p-2">
						<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="font-medium group-hover:text-white transition">Finanzas</p>
						<p class="text-xs text-slate-400">Gestión de pagos</p>
					</div>
				</div>
			</a>

			<a href="/reportes" class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700">
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-pink-950/50 p-2">
						<svg class="h-5 w-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
					</div>
					<div>
						<p class="font-medium group-hover:text-white transition">Reportes</p>
						<p class="text-xs text-slate-400">Estadísticas</p>
					</div>
				</div>
			</a>
		</div>
	</div>
</div>
