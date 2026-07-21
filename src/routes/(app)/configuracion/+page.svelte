<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Configuración | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Sistema</p>
			<h1 class="text-3xl font-bold">Configuración</h1>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		<!-- Calendario -->
		<a
			href="/configuracion/calendario"
			class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
		>
			<div
				class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 transition group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-xl font-bold text-white">Calendario y Horarios</h3>
			<p class="text-sm text-slate-400">
				Configurar el calendario académico, fechas importantes y horarios de todas las carreras y
				años
			</p>
		</a>

		<!-- Localidades / Sedes -->
		<a
			href="/configuracion/localidades"
			class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
		>
			<div
				class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-xl font-bold text-white">Localidades / Sedes</h3>
			<p class="text-sm text-slate-400">
				Administrar sedes, carreras habilitadas y asignaciones institucionales
			</p>
		</a>

		<!-- Cuotas -->
		<a
			href="/configuracion/cuotas"
			class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
		>
			<div
				class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-500/20 dark:text-amber-400"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-xl font-bold text-white">Cuotas</h3>
			<p class="text-sm text-slate-400">Configurar beneficios de beca y recursante para cuotas</p>
		</a>

		<!-- Ciclos Lectivos -->
		<a
			href="/configuracion/ciclos-lectivos"
			class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
		>
			<div
				class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition group-hover:bg-purple-500 group-hover:text-white dark:bg-purple-500/20 dark:text-purple-400"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-xl font-bold text-white">Ciclos Lectivos</h3>
			<p class="text-sm text-slate-400">Gestionar ciclos lectivos activos y periodos académicos</p>
		</a>

		<!-- Conceptos de Cargo -->
		<a
			href="/configuracion/conceptos-cargo"
			class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
		>
			<div
				class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 transition group-hover:bg-rose-500 group-hover:text-white dark:bg-rose-500/20 dark:text-rose-400"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-xl font-bold text-white">Conceptos de Cargo</h3>
			<p class="text-sm text-slate-400">
				Administrar conceptos de cobro (inscripción, cuotas, etc.)
			</p>
		</a>

		<!-- Recibos de Sueldo -->
		<a
			href="/configuracion/recibos-sueldo"
			class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
		>
			<div
				class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 transition group-hover:bg-cyan-500 group-hover:text-white dark:bg-cyan-500/20 dark:text-cyan-400"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-xl font-bold text-white">Recibos de Sueldo</h3>
			<p class="text-sm text-slate-400">
				Configurar el dominio del portal externo de recibos de sueldo
			</p>
		</a>
	</div>
</div>
