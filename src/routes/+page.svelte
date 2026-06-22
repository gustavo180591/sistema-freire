<script lang="ts">
	import { page } from '$app/stores';

	interface ModuleCard {
		name: string;
		description: string;
		icon: string;
		href?: string;
		color: string;
		bgColor: string;
	}

	const modules: ModuleCard[] = [
		{
			name: 'Usuarios y Seguridad',
			description: 'Gestión de usuarios, roles, permisos y control de acceso al sistema.',
			icon: 'users-shield',
			href: '/usuarios',
			color: 'text-red-400',
			bgColor: 'bg-red-500/10'
		},
		{
			name: 'Gestión de Alumnos',
			description: 'Administración de datos personales, académicos y seguimiento de estudiantes.',
			icon: 'graduation-cap',
			href: '/alumnos',
			color: 'text-blue-400',
			bgColor: 'bg-blue-500/10'
		},
		{
			name: 'Gestión de Docentes',
			description: 'Control de profesores, asignaturas, horarios y evaluaciones docentes.',
			icon: 'chalkboard-teacher',
			href: '/docentes',
			color: 'text-emerald-400',
			bgColor: 'bg-emerald-500/10'
		},
		{
			name: 'Digitalización de Haberes Docentes',
			description: 'Liquidación de sueldos, generación de recibos y control de pagos al personal.',
			icon: 'receipt',
			href: '/recibos',
			color: 'text-rose-400',
			bgColor: 'bg-rose-500/10'
		},
		{
			name: 'Gestión Académica',
			description: 'Administración de carreras, materias, planes de estudio y correlatividades.',
			icon: 'building-columns',
			href: '/carreras',
			color: 'text-purple-400',
			bgColor: 'bg-purple-500/10'
		},
		{
			name: 'Inscripciones',
			description: 'Proceso de inscripción a materias, gestión de vacantes y control de cupos.',
			icon: 'clipboard-list',
			href: '/alumnos',
			color: 'text-cyan-400',
			bgColor: 'bg-cyan-500/10'
		},
		{
			name: 'Asistencias',
			description:
				'Control de presencias, registros de clase y seguimiento de asistencia por materia.',
			icon: 'user-clock',
			href: '/alumnos',
			color: 'text-amber-400',
			bgColor: 'bg-amber-500/10'
		},
		{
			name: 'Exámenes',
			description: 'Gestión de mesas de examen, inscripciones, actas y calificaciones finales.',
			icon: 'clipboard-check',
			href: '/reportes',
			color: 'text-orange-400',
			bgColor: 'bg-orange-500/10'
		},
		{
			name: 'Sistema Financiero',
			description: 'Cobro de cuotas, gestión de pagos, becas y reportes financieros del instituto.',
			icon: 'coins',
			href: '/finanzas',
			color: 'text-green-400',
			bgColor: 'bg-green-500/10'
		},
		{
			name: 'Convenios de Pago',
			description: 'Configuración de planes de pago, descuentos y acuerdos financieros.',
			icon: 'handshake',
			href: '/finanzas',
			color: 'text-teal-400',
			bgColor: 'bg-teal-500/10'
		},
		{
			name: 'Gestión Documental',
			description: 'Almacenamiento y control de documentos digitales de alumnos y personal.',
			icon: 'folder-open',
			href: '/alumnos',
			color: 'text-violet-400',
			bgColor: 'bg-violet-500/10'
		},
		{
			name: 'Reportes',
			description: 'Generación de reportes estadísticos y documentación para organismos rectores.',
			icon: 'chart-bar',
			href: '/reportes',
			color: 'text-indigo-400',
			bgColor: 'bg-indigo-500/10'
		}
	];

	// Iconos SVG
	const icons: Record<string, string> = {
		'users-shield':
			'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
		'graduation-cap': 'M22 10v6M2 10l10-5 10 5-10 5z M12 12v9 M12 21l-7-3 M12 21l7-3',
		'chalkboard-teacher':
			'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
		receipt:
			'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z M5 21h14',
		'building-columns': 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
		'clipboard-list':
			'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
		'user-clock': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z M8 12h8',
		'clipboard-check':
			'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
		coins:
			'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		handshake:
			'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11',
		'folder-open': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
		'chart-bar':
			'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z',
		'arrow-right': 'M13 7l5 5m0 0l-5 5m5-5H6'
	};
</script>

<svelte:head>
	<title>Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Sistema Integral de Gestión Académica y Administrativa" />
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<section class="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16">
		<!-- Hero Section -->
		<div class="max-w-4xl">
			<div
				class="relative overflow-hidden rounded-3xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900/95 to-indigo-950/30 p-8 md:p-12"
			>
				<div
					class="absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-size-[40px_40px] opacity-5"
				></div>
				<div class="relative">
					<p class="mb-4 text-sm font-semibold tracking-[0.2em] text-indigo-400 uppercase">
						Instituto Superior de Formación Docente
					</p>

					<h1 class="text-4xl font-bold tracking-tight md:text-6xl">
						Sistema Integral
						<span class="block text-slate-300">ISFD "PAULO FREIRE" 1117</span>
					</h1>

					<p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
						Plataforma institucional para la gestión académica, financiera, asistencia, regularidad,
						reportes oficiales y auditoría integral.
					</p>

					<div class="mt-8 flex flex-wrap gap-4">
						{#if !$page.data.user}
							<a
								href="/login"
								class="group inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
								aria-label="Ingresar al sistema"
							>
								Ingresar al sistema
								<svg
									class="h-4 w-4 transition-transform group-hover:translate-x-1"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={icons['arrow-right']}
									/>
								</svg>
							</a>
						{/if}

						<a
							href="/dashboard"
							class="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/50 px-6 py-3 font-semibold text-white transition-all duration-200 hover:border-indigo-500/50 hover:bg-indigo-950/20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
							aria-label="Ver dashboard"
						>
							Ver dashboard
							<svg
								class="h-4 w-4 transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={icons['arrow-right']}
								/>
							</svg>
						</a>
					</div>
				</div>
			</div>
		</div>

		<!-- Module Cards -->
		<div class="mt-16">
			<h2 class="mb-6 text-2xl font-semibold text-white">Módulos del sistema</h2>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each modules as module}
					<a
						href={module.href || '#'}
						class="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/90 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
						aria-label="{module.name}: {module.description}"
					>
						<div class="flex items-start gap-4">
							<div
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl {module.bgColor}"
							>
								<svg
									class="h-6 w-6 {module.color}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={icons[module.icon]}
									/>
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<h3
									class="text-lg font-semibold text-white transition-colors group-hover:text-indigo-300"
								>
									{module.name}
								</h3>
								<p class="mt-2 text-sm text-slate-400">
									{module.description}
								</p>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
</div>
