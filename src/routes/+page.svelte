<script lang="ts">
	import { page } from '$app/stores';

	const modules = [
		{
			name: 'Gestión Académica',
			description: 'Administración de carreras, materias, planes de estudio y estados académicos de los alumnos.'
		},
		{
			name: 'Inscripciones',
			description: 'Gestión de comisiones, cátedras y inscripciones de alumnos por ciclo lectivo.'
		},
		{
			name: 'Asistencia',
			description: 'Control de presencias, registros de clase y seguimiento de asistencia por comisión.'
		},
		{
			name: 'Finanzas',
			description: 'Cobro de cuotas, gestión de pagos, becas y reportes financieros del instituto.'
		},
		{
			name: 'Recibos Docentes',
			description: 'Liquidación de haberes, generación de recibos y control de pagos al personal.'
		},
		{
			name: 'Auditoría',
			description: 'Registro de acciones, seguimiento de cambios y trazabilidad de operaciones.'
		},
		{
			name: 'Reportes Oficiales',
			description: 'Generación de reportes estadísticos y documentación para organismos rectores.'
		}
	];
</script>

<svelte:head>
	<title>Instituto Paulo Freire</title>
	<meta name="description" content="Sistema Integral de Gestión Académica y Administrativa" />
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<section class="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16">
		<div class="max-w-4xl">
			<p class="mb-4 text-sm font-medium tracking-[0.2em] text-slate-400 uppercase">
				Instituto Superior de Formación Docente
			</p>

			<h1 class="text-4xl font-bold tracking-tight md:text-6xl">
				Sistema Integral
				<span class="block text-slate-300"> Paulo Freire </span>
			</h1>

			<p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
				Plataforma institucional para la gestión académica, financiera, asistencia, regularidad,
				reportes oficiales y auditoría integral.
			</p>

			<div class="mt-8 flex flex-wrap gap-4">
				{#if !$page.data.user}
					<a
						href="/login"
						class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
					>
						Ingresar al sistema
					</a>
				{/if}

				<a
					href="/dashboard"
					class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold transition hover:bg-slate-900"
				>
					Ver dashboard
				</a>
			</div>
		</div>

		<div class="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each modules as module}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
					<h2 class="text-lg font-semibold">{module.name}</h2>
					<p class="mt-2 text-sm text-slate-400">
						{module.description}
					</p>
				</div>
			{/each}
		</div>
	</section>
</div>
