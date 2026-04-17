<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type MetricCard = {
		title: string;
		value: string | number;
		description: string;
	};

	let metrics = $derived([
		{
			title: 'Alumnos activos',
			value: data.metrics.activeStudents,
			description: 'Inscripciones activas en el período vigente'
		},
		{
			title: 'Con deuda',
			value: data.metrics.blockedStudentsCount,
			description: 'Alumnos con bloqueo financiero potencial'
		},
		{
			title: 'Riesgo académico',
			value: data.metrics.attendanceRiskCount,
			description: 'Regularidad baja o asistencia crítica'
		},
		{
			title: 'Comisiones activas',
			value: data.metrics.activeCommissions,
			description: 'Cursos y materias en dictado'
		}
	]);

	const quickAccess = [
		{ label: 'Usuarios', href: '/usuarios' },
		{ label: 'Carreras', href: '/carreras' },
		{ label: 'Comisiones', href: '/comisiones' },
		{ label: 'Finanzas', href: '/finanzas' },
		{ label: 'Reportes', href: '/reportes' },
		{ label: 'Recibos', href: '/recibos' }
	];
</script>

<svelte:head>
	<title>Dashboard | Instituto Paulo Freire</title>
	<meta name="description" content="Panel institucional de gestión académica y administrativa" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Panel institucional</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Dashboard general</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Vista consolidada del estado académico, financiero y administrativo del Instituto Superior de
			Formación Docente Paulo Freire.
		</p>
	</section>

	<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{#each metrics as metric}
			<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
				<p class="text-sm text-slate-400">{metric.title}</p>
				<h2 class="mt-3 text-4xl font-bold">{metric.value}</h2>
				<p class="mt-2 text-sm text-slate-500">{metric.description}</p>
			</div>
		{/each}
	</section>

	<section class="grid gap-6 lg:grid-cols-3">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-2">
			<h2 class="text-xl font-semibold">Alertas prioritarias</h2>
			<div class="mt-4 space-y-4">
				<div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
					<p class="font-medium">Bloqueos por deuda</p>
					<p class="mt-1 text-sm text-slate-400">
						{data.metrics.blockedStudentsCount} alumnos no pueden inscribirse a mesas ni cursadas por saldo pendiente.
					</p>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
					<p class="font-medium">Asistencia crítica</p>
					<p class="mt-1 text-sm text-slate-400">
						{data.metrics.attendanceRiskCount} alumnos están por debajo del mínimo de regularidad configurado.
					</p>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
					<p class="font-medium">Actas pendientes</p>
					<p class="mt-1 text-sm text-slate-400">
						Existen {data.metrics.pendingExamRecords} actas de mesas pendientes de confirmar y cargar.
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="text-xl font-semibold">Accesos rápidos</h2>
			<div class="mt-4 grid gap-3">
				{#each quickAccess as item}
					<a
						href={item.href}
						class="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium transition hover:border-slate-600"
					>
						{item.label}
					</a>
				{/each}
			</div>
		</div>
	</section>
</div>
