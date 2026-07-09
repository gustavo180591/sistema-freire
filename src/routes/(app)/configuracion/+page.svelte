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
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 transition group-hover:bg-indigo-500 group-hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-xl font-bold text-white">Calendario</h3>
			<p class="text-sm text-slate-400">Configurar el calendario académico y fechas importantes</p>
		</a>

		<!-- Localidades / Sedes -->
		<a
			href="/configuracion/localidades"
			class="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-indigo-500 hover:bg-slate-800/50 dark:border-slate-700 dark:hover:border-indigo-400"
		>
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400">
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
			<p class="text-sm text-slate-400">Administrar sedes, carreras habilitadas y asignaciones institucionales</p>
		</a>
	</div>
</div>
