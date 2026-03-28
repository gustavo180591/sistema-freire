<script lang="ts">
	const modules = [
		'Gestión Académica',
		'Inscripciones',
		'Asistencia',
		'Finanzas',
		'Recibos Docentes',
		'Auditoría',
		'Reportes Oficiales'
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
				<a
					href="/login"
					class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
				>
					Ingresar al sistema
				</a>

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
					<h2 class="text-lg font-semibold">{module}</h2>
					<p class="mt-2 text-sm text-slate-400">
						Módulo preparado para integrarse al ecosistema institucional.
					</p>
				</div>
			{/each}
		</div>
	</section>
</div>
