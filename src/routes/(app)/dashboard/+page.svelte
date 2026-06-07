<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	interface MetricCard {
		title: string;
		value: number;
		description: string;
		icon: string;
		color: string;
		bgColor: string;
		trend?: 'up' | 'down' | 'neutral';
	}

	interface AlertItem {
		title: string;
		description: string;
		value: number;
		priority: 'high' | 'medium' | 'low';
		icon: string;
		href?: string;
	}

	interface QuickAccessItem {
		label: string;
		href: string;
		icon: string;
		description: string;
		roles?: string[];
	}

	let metrics = $derived<MetricCard[]>([
		{
			title: 'Alumnos activos',
			value: data.metrics.activeStudents,
			description: 'Inscripciones activas en el período vigente',
			icon: 'users',
			color: 'text-emerald-400',
			bgColor: 'bg-emerald-500/10',
			trend: 'neutral'
		},
		{
			title: 'Con deuda',
			value: data.metrics.blockedStudentsCount,
			description: 'Alumnos con bloqueo financiero potencial',
			icon: 'exclamation-triangle',
			color: 'text-amber-400',
			bgColor: 'bg-amber-500/10',
			trend: 'down'
		},
		{
			title: 'Riesgo académico',
			value: data.metrics.attendanceRiskCount,
			description: 'Regularidad baja o asistencia crítica',
			icon: 'chart-line',
			color: 'text-rose-400',
			bgColor: 'bg-rose-500/10',
			trend: 'down'
		},
		{
			title: 'Materias activas',
			value: data.metrics.activeSubjects,
			description: 'Materias en dictado',
			icon: 'book-open',
			color: 'text-blue-400',
			bgColor: 'bg-blue-500/10',
			trend: 'neutral'
		}
	]);

	let alerts = $derived<AlertItem[]>([
		{
			title: 'Bloqueos por deuda',
			description: 'Alumnos no pueden inscribirse a mesas ni cursadas por saldo pendiente',
			value: data.metrics.blockedStudentsCount,
			priority: data.metrics.blockedStudentsCount > 10 ? 'high' : 'medium',
			icon: 'currency-dollar',
			href: '/finanzas'
		},
		{
			title: 'Asistencia crítica',
			description: 'Alumnos por debajo del mínimo de regularidad configurado',
			value: data.metrics.attendanceRiskCount,
			priority: data.metrics.attendanceRiskCount > 5 ? 'high' : 'medium',
			icon: 'user-clock',
			href: '/alumnos'
		},
		{
			title: 'Actas pendientes',
			description: 'Actas de mesas pendientes de confirmar y cargar',
			value: data.metrics.pendingExamRecords,
			priority: data.metrics.pendingExamRecords > 0 ? 'medium' : 'low',
			icon: 'clipboard-list',
			href: '/reportes'
		}
	]);

	const quickAccess: QuickAccessItem[] = [
		{ label: 'Usuarios', href: '/usuarios', icon: 'users-cog', description: 'Gestión de usuarios y roles', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'] },
		{ label: 'Carreras', href: '/carreras', icon: 'building-columns', description: 'Planes de estudio y carreras', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] },
		{ label: 'Materias', href: '/materias', icon: 'book-open', description: 'Materias y correlatividades', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE'] },
		{ label: 'Finanzas', href: '/finanzas', icon: 'coins', description: 'Pagos, recibos y configuración', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS'] },
		{ label: 'Reportes', href: '/reportes', icon: 'chart-bar', description: 'Reportes y estadísticas', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS'] },
		{ label: 'Recibos', href: '/recibos', icon: 'receipt', description: 'Gestión de recibos', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE', 'FINANZAS'] }
	];

	// Iconos SVG
	const icons: Record<string, string> = {
		users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		'exclamation-triangle': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		'chart-line': 'M3 3v18h18 M3 18l6-6 4 4 8-8',
		'book-open': 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
		'currency-dollar': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		'user-clock': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z M8 12h8',
		'clipboard-list': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
		'users-cog': 'M10 6a2 2 0 110-4 2 2 0 010 4zM15 8a2 2 0 110-4 2 2 0 010 4zM5 8a2 2 0 110-4 2 2 0 010 4zM6 12a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2H6z M12 15v3m0 0v3m0-3h3m-3 0H9',
		'building-columns': 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
		coins: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z',
		receipt: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z M5 21h14',
		'chevron-right': 'M9 5l7 7-7 7',
		calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
	};

	// Obtener período académico activo para mostrar en el header
	const currentTerm = $derived(
		data.activeTerms.length > 0 ? data.activeTerms[0] : null
	);

	// Formatear fecha
	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
	};
</script>

<svelte:head>
	<title>Dashboard | Instituto Paulo Freire</title>
	<meta name="description" content="Panel institucional de gestión académica y administrativa" />
</svelte:head>

<div class="space-y-8">
	<!-- Header Institucional -->
	<section class="relative overflow-hidden rounded-3xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900/95 to-indigo-950/30 p-8 md:p-10">
		<div class="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-size-[40px_40px]"></div>
		<div class="relative">
			<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div class="flex-1">
					<p class="text-sm tracking-[0.2em] text-indigo-400 uppercase font-semibold">Panel institucional</p>
					<h1 class="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Dashboard general</h1>
					<p class="mt-3 max-w-3xl text-sm text-slate-400 md:text-base">
						Vista consolidada del estado académico, financiero y administrativo del Instituto Superior de
						Formación Docente Paulo Freire.
					</p>
				</div>
				{#if currentTerm}
					<div class="flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 backdrop-blur-sm">
						<svg class="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons.calendar} />
						</svg>
						<div class="text-sm">
							<p class="text-slate-400">Período actual</p>
							<p class="font-semibold text-white">{currentTerm.name}</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Métricas -->
	<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{#each metrics as metric}
			<div class="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/90">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<p class="text-sm font-medium text-slate-400">{metric.title}</p>
						<h2 class="mt-3 text-3xl font-bold text-white md:text-4xl">{metric.value}</h2>
						<p class="mt-2 text-xs text-slate-500 md:text-sm">{metric.description}</p>
					</div>
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl {metric.bgColor}">
						<svg class="h-6 w-6 {metric.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[metric.icon]} />
						</svg>
					</div>
				</div>
			</div>
		{/each}
	</section>

	<!-- Alertas y Accesos Rápidos -->
	<section class="grid gap-6 lg:grid-cols-3">
		<!-- Alertas Prioritarias -->
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-2">
			<div class="flex items-center gap-3">
				<h2 class="text-xl font-semibold text-white">Alertas prioritarias</h2>
				<span class="rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400">
					{alerts.length}
				</span>
			</div>
			<div class="mt-6 space-y-3">
				{#each alerts as alert}
					<a
						href={alert.href || '#'}
						class="group relative flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
						aria-label="{alert.title}: {alert.description}"
					>
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
							{alert.priority === 'high' ? 'bg-rose-500/10' : alert.priority === 'medium' ? 'bg-amber-500/10' : 'bg-slate-800'}
						">
							<svg class="h-5 w-5
								{alert.priority === 'high' ? 'text-rose-400' : alert.priority === 'medium' ? 'text-amber-400' : 'text-slate-400'}
							" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[alert.icon]} />
							</svg>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<p class="font-semibold text-white">{alert.title}</p>
								{#if alert.priority === 'high'}
									<span class="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400">Alta</span>
								{:else if alert.priority === 'medium'}
									<span class="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">Media</span>
								{:else}
									<span class="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-400">Baja</span>
								{/if}
							</div>
							<p class="mt-1 text-sm text-slate-400">{alert.description}</p>
							<p class="mt-1 text-xs font-medium text-slate-500">
								{alert.value} {alert.value === 1 ? 'caso' : 'casos'}{alert.href ? ' → Ver detalles' : ''}
							</p>
						</div>
						{#if alert.href}
							<svg class="h-5 w-5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons['chevron-right']} />
							</svg>
						{/if}
					</a>
				{/each}
			</div>
		</div>

		<!-- Accesos Rápidos -->
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="text-xl font-semibold text-white">Accesos rápidos</h2>
			<div class="mt-6 grid gap-3">
				{#each quickAccess as item}
					<a
						href={item.href}
						class="group flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition-all duration-200 hover:border-indigo-500/50 hover:bg-indigo-950/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
						aria-label="{item.label}: {item.description}"
					>
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
							<svg class="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[item.icon]} />
							</svg>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-white group-hover:text-indigo-300 transition-colors">{item.label}</p>
							<p class="text-xs text-slate-500">{item.description}</p>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
</div>
