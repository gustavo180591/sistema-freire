<script lang="ts">
	import { page } from '$app/state';

	interface User {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		roles: string[];
	}

	interface NavItem {
		label: string;
		href: string;
		icon: string;
		roles: string[];
		exact?: boolean;
		children?: NavItem[];
	}

	interface NavSection {
		category: string;
		items: NavItem[];
		collapsible?: boolean;
	}

	let { user, isOpen = $bindable(false) }: { user: User | null; isOpen?: boolean } = $props();

	// Estado de submenús colapsados
	let collapsedSections = $state<Record<string, boolean>>({});

	// Navegación agrupada por categorías con submenús
	const navigation: NavSection[] = [
		{
			category: 'Principal',
			items: [
				{
					label: 'Dashboard',
					href: '/dashboard',
					icon: 'dashboard',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO']
				},
				{ label: 'Inicio', href: '/', icon: 'home', roles: [] }
			]
		},
		{
			category: 'Docencia',
			collapsible: true,
			items: [
				{
					label: 'Panel docente',
					href: '/docente',
					icon: 'chalkboard-teacher',
					roles: ['DOCENTE'],
					exact: true
				},
				{
					label: 'Evaluaciones',
					href: '/docente/evaluaciones',
					icon: 'clipboard-list',
					roles: ['DOCENTE']
				},
				{
					label: 'Calificaciones',
					href: '/docente/calificaciones',
					icon: 'book-open',
					roles: ['DOCENTE']
				},
				{
					label: 'Asistencia',
					href: '/docente/asistencia',
					icon: 'clipboard-user',
					roles: ['DOCENTE']
				},
				{
					label: 'Horarios',
					href: '/docente/horarios',
					icon: 'calendar',
					roles: ['DOCENTE']
				},
				{
					label: 'Materiales',
					href: '/docente/materiales',
					icon: 'folder-open',
					roles: ['DOCENTE']
				},
				{
					label: 'Comunicados',
					href: '/docente/comunicados',
					icon: 'megaphone',
					roles: ['DOCENTE']
				},
				{
					label: 'Observaciones',
					href: '/docente/observaciones',
					icon: 'chat-bubble',
					roles: ['DOCENTE']
				},
				{
					label: 'Reportes',
					href: '/docente/reportes',
					icon: 'chart-line',
					roles: ['DOCENTE']
				}
			]
		},
		{
			category: 'Mis Estudios',
			collapsible: true,
			items: [
				{
					label: 'Perfil',
					href: '/alumno/perfil',
					icon: 'user-circle',
					roles: ['ALUMNO']
				},
				{
					label: 'Mis materias',
					href: '/alumno/inscripciones',
					icon: 'book-open',
					roles: ['ALUMNO'],
					exact: true
				},
				{
					label: 'Asistencia',
					href: '/alumno/asistencia',
					icon: 'clipboard-user',
					roles: ['ALUMNO']
				},
				{
					label: 'Calificaciones',
					href: '/alumno/calificaciones',
					icon: 'book-open',
					roles: ['ALUMNO']
				},
				{
					label: 'Inscribirse a mesa de examen',
					href: '/alumno/inscripciones/examenes',
					icon: 'clipboard-list',
					roles: ['ALUMNO']
				},
				{
					label: 'Historial',
					href: '/alumno/historial',
					icon: 'graduation-cap',
					roles: ['ALUMNO']
				},
				{
					label: 'Finanzas',
					href: '/alumno/finanzas',
					icon: 'coins',
					roles: ['ALUMNO']
				}
			]
		},
		{
			category: 'Académico',
			collapsible: true,
			items: [
				{
					label: 'Alumnos',
					href: '/alumnos',
					icon: 'graduation-cap',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS']
				},
				{
					label: 'Docentes',
					href: '/docentes',
					icon: 'chalkboard-teacher',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA']
				},
				{
					label: 'Mesas de examen',
					href: '/mesas-examen',
					icon: 'calendar',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE']
				},
				{
					label: 'Preceptores',
					href: '/preceptores',
					icon: 'clipboard-user',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA']
				},
				{
					label: 'Secretarios',
					href: '/secretarios',
					icon: 'user-tie',
					roles: ['SUPERADMIN', 'DIRECTOR']
				},
				{
					label: 'Directores',
					href: '/directores',
					icon: 'user-shield',
					roles: ['SUPERADMIN', 'DIRECTOR']
				}
			]
		},
		{
			category: 'Administración',
			collapsible: true,
			items: [
				{
					label: 'Usuarios',
					href: '/usuarios',
					icon: 'users-gear',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO']
				},
				{
					label: 'Finanzas',
					href: '/finanzas',
					icon: 'coins',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS']
				},
				{
					label: 'Recibos de sueldo',
					href: '/recibos',
					icon: 'receipt',
					roles: ['SUPERADMIN', 'DIRECTOR', 'APODERADO', 'LIQUIDADOR']
				},
				{
					label: 'Reportes',
					href: '/reportes',
					icon: 'chart-line',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS']
				}
			]
		},
		{
			category: 'Sistema',
			collapsible: true,
			items: [
				{
					label: 'Auditoría',
					href: '/auditoria',
					icon: 'clipboard-list',
					roles: ['SUPERADMIN', 'DIRECTOR']
				},
				{ label: 'Permisos', href: '/permisos', icon: 'key', roles: ['SUPERADMIN'] },
				{
					label: 'Config. recibos sueldo',
					href: '/configuracion/recibos-sueldo',
					icon: 'receipt',
					roles: ['SUPERADMIN', 'DIRECTOR', 'APODERADO', 'LIQUIDADOR']
				},
				{
					label: 'Configuración',
					href: '/configuracion',
					icon: 'gear',
					roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS', 'PRECEPTOR']
				},
				{ label: 'Contacto', href: '/contacto', icon: 'envelope', roles: [] }
			]
		}
	];

	// Filtrar items según roles
	function hasAccess(item: NavItem): boolean {
		if (!user) return false;
		if (item.roles.length === 0) return true;
		return item.roles.some((role) => user.roles.includes(role));
	}

	function isActive(item: NavItem): boolean {
		if (item.exact) return page.url.pathname === item.href;
		return page.url.pathname === item.href || page.url.pathname.startsWith(item.href + '/');
	}

	function toggleSection(category: string) {
		collapsedSections[category] = !collapsedSections[category];
	}

	function isSectionCollapsed(category: string): boolean {
		return collapsedSections[category] ?? false;
	}

	// Iconos SVG mejorados y más específicos
	const icons: Record<string, string> = {
		home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		dashboard:
			'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
		'user-circle':
			'M18 9a3 3 0 11-6 0 3 3 0 016 0zm-9 3a3 3 0 11-6 0 3 3 0 016 0zm9 8a3 3 0 11-6 0 3 3 0 016 0zm-9 8a3 3 0 11-6 0 3 3 0 016 0z',
		'graduation-cap':
			'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z',
		'chalkboard-teacher':
			'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
		'clipboard-user':
			'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
		'user-tie': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z M8 21h8',
		'user-shield':
			'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z M9 12l2 2 4-4',
		'building-columns': 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
		'book-open':
			'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
		'diagram-project':
			'M7 17l.597-.267A2 2 0 018.238 17H9a2 2 0 012 2v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1a2 2 0 012-2h.762a2 2 0 01.641-.267L7 17zm3.414-5.656a2 2 0 00-2.828 0l-4 4a2 2 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
		'users-gear':
			'M10 6a2 2 0 110-4 2 2 0 010 4zM15 8a2 2 0 110-4 2 2 0 010 4zM5 8a2 2 0 110-4 2 2 0 010 4zM6 12a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2H6z M12 15v3m0 0v3m0-3h3m-3 0H9',
		coins:
			'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		receipt:
			'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z M5 21h14',
		'chart-line': 'M3 3v18h18 M3 18l6-6 4 4 8-8',
		'clipboard-list':
			'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
		calendar:
			'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
		'folder-open':
			'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v2M3 7v11a2 2 0 002 2h12a2 2 0 001.789-1.106L22 12H7l-4 8',
		megaphone: 'M11 5L6 9H3v6h3l5 4V5zm0 4c4 0 7-2 9-4v14c-2-2-5-4-9-4V9zM6 15l2 6h3l-2-5',
		'chat-bubble': 'M8 10h8m-8 4h5M21 12a8 8 0 01-8 8H7l-4 2 1.5-4A9 9 0 1121 12z',
		key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
		envelope:
			'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
		gear: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
		'chevron-down': 'M19 9l-7 7-7-7',
		'chevron-right': 'M9 5l7 7-7 7'
	};
</script>

<!-- Desktop Sidebar -->
<aside
	class="fixed top-16 bottom-0 left-0 hidden w-64 overflow-y-auto border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900"
>
	<nav class="space-y-2 p-4">
		{#each navigation as group}
			{@const visibleItems = group.items.filter(hasAccess)}
			{#if visibleItems.length > 0}
				<div class="mb-4">
					{#if group.collapsible}
						<button
							onclick={() => toggleSection(group.category)}
							class="flex w-full items-center justify-between rounded px-3 py-2 text-xs font-semibold tracking-wider text-slate-600 uppercase transition-colors hover:text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white focus:outline-none dark:text-slate-500 dark:hover:text-slate-400 dark:focus:ring-offset-slate-900"
							aria-expanded={!isSectionCollapsed(group.category)}
							aria-controls="section-{group.category}"
						>
							<span>{group.category}</span>
							<svg
								class="h-4 w-4 transition-transform duration-200"
								class:rotate-180={!isSectionCollapsed(group.category)}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={icons['chevron-down']}
								/>
							</svg>
						</button>
						{#if !isSectionCollapsed(group.category)}
							<ul id="section-{group.category}" class="mt-1 space-y-1">
								{#each visibleItems as item}
									<li>
										<a
											href={item.href}
											class="light-hover-contrast group/link relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 {isActive(
												item
											)
												? 'border-l-2 border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400'
												: 'border-l-2 border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}"
											aria-current={isActive(item) ? 'page' : undefined}
										>
											<svg
												class="h-5 w-5 shrink-0"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d={icons[item.icon]}
												/>
											</svg>
											<span>{item.label}</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						<h3 class="px-3 py-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
							{group.category}
						</h3>
						<ul class="mt-1 space-y-1">
							{#each visibleItems as item}
								<li>
									<a
										href={item.href}
										class="light-hover-contrast group/link relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 {isActive(
											item
										)
											? 'border-l-2 border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400'
											: 'border-l-2 border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}"
										aria-current={isActive(item) ? 'page' : undefined}
									>
										<svg
											class="h-5 w-5 shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d={icons[item.icon]}
											/>
										</svg>
										<span>{item.label}</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		{/each}
	</nav>
</aside>

<!-- Mobile Sidebar Overlay -->
{#if isOpen}
	<div class="fixed inset-0 z-40 lg:hidden">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/50"
			onclick={() => (isOpen = false)}
			aria-label="Cerrar menú"
		></button>

		<!-- Mobile Sidebar -->
		<aside
			class="absolute top-0 bottom-0 left-0 w-64 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<div class="border-b border-slate-200 p-4 dark:border-slate-800">
				<div class="flex items-center gap-2">
					<img src="/logo.png" alt="Logo" class="h-16 w-auto" />
					<span class="text-lg font-bold text-slate-900 dark:text-white"
						>ISFD "PAULO FREIRE" 1117</span
					>
				</div>
			</div>

			<nav class="space-y-2 p-4">
				{#each navigation as group}
					{@const visibleItems = group.items.filter(hasAccess)}
					{#if visibleItems.length > 0}
						<div class="mb-4">
							{#if group.collapsible}
								<button
									onclick={() => toggleSection(group.category)}
									class="flex w-full items-center justify-between rounded px-3 py-2 text-xs font-semibold tracking-wider text-slate-500 uppercase transition-colors hover:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
									aria-expanded={!isSectionCollapsed(group.category)}
									aria-controls="mobile-section-{group.category}"
								>
									<span>{group.category}</span>
									<svg
										class="h-4 w-4 transition-transform duration-200"
										class:rotate-180={!isSectionCollapsed(group.category)}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d={icons['chevron-down']}
										/>
									</svg>
								</button>
								{#if !isSectionCollapsed(group.category)}
									<ul id="mobile-section-{group.category}" class="mt-1 space-y-1">
										{#each visibleItems as item}
											<li>
												<a
													href={item.href}
													onclick={() => (isOpen = false)}
													class="light-hover-contrast group/link relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 {isActive(
														item
													)
														? 'border-l-2 border-indigo-500 bg-indigo-600/20 text-indigo-400'
														: 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}"
													aria-current={isActive(item) ? 'page' : undefined}
												>
													<svg
														class="h-5 w-5 shrink-0"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d={icons[item.icon]}
														/>
													</svg>
													<span>{item.label}</span>
												</a>
											</li>
										{/each}
									</ul>
								{/if}
							{:else}
								<h3
									class="px-3 py-2 text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-slate-500"
								>
									{group.category}
								</h3>
								<ul class="mt-1 space-y-1">
									{#each visibleItems as item}
										<li>
											<a
												href={item.href}
												onclick={() => (isOpen = false)}
												class="light-hover-contrast group/link relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 {isActive(
													item
												)
													? 'border-l-2 border-indigo-500 bg-indigo-600/20 text-indigo-400'
													: 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}"
												aria-current={isActive(item) ? 'page' : undefined}
											>
												<svg
													class="h-5 w-5 shrink-0"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d={icons[item.icon]}
													/>
												</svg>
												<span>{item.label}</span>
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				{/each}
			</nav>
		</aside>
	</div>
{/if}

<!-- Spacer para desktop -->
<div class="hidden w-64 shrink-0 lg:block"></div>
