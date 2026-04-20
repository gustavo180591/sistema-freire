<script lang="ts">
	import { page } from '$app/state';

	interface User {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		roles: string[];
	}

	let { user, isOpen = $bindable(false) }: { user: User | null; isOpen?: boolean } = $props();

	// Navegación agrupada por categorías
	const navigation = [
		{
			category: 'Principal',
			items: [
				{ label: 'Dashboard', href: '/dashboard', icon: 'home', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] },
				{ label: 'Inicio', href: '/', icon: 'home', roles: [] },
			]
		},
		{
			category: 'Académico',
			items: [
				{ label: 'Alumnos', href: '/alumnos', icon: 'users', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS'] },
				{ label: 'Carreras', href: '/carreras', icon: 'academic', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] },
				{ label: 'Comisiones', href: '/comisiones', icon: 'users', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE'] },
				{ label: 'Materias', href: '/materias', icon: 'book', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE'] },
			]
		},
		{
			category: 'Administración',
			items: [
				{ label: 'Usuarios', href: '/usuarios', icon: 'users', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] },
				{ label: 'Finanzas', href: '/finanzas', icon: 'currency', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS'] },
				{ label: 'Recibos', href: '/recibos', icon: 'document', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE', 'FINANZAS'] },
				{ label: 'Reportes', href: '/reportes', icon: 'chart', roles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS'] },
			]
		},
		{
			category: 'Sistema',
			items: [
				{ label: 'Auditoría', href: '/auditoria', icon: 'shield', roles: ['SUPERADMIN', 'DIRECTOR'] },
				{ label: 'Permisos', href: '/permisos', icon: 'lock', roles: ['SUPERADMIN'] },
				{ label: 'Contacto', href: '/contacto', icon: 'mail', roles: [] },
			]
		}
	];

	// Filtrar items según roles
	function hasAccess(item: { roles: string[] }) {
		if (!user) return false;
		if (item.roles.length === 0) return true;
		return item.roles.some(role => user.roles.includes(role));
	}

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	// Iconos SVG
	const icons: Record<string, string> = {
		home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		academic: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z',
		book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
		currency: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z',
		mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
		shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
		lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
	};
</script>

<!-- Desktop Sidebar -->
<aside class="hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-slate-900 border-r border-slate-800 overflow-y-auto">
	<nav class="p-4 space-y-6">
		{#each navigation as group}
			{@const visibleItems = group.items.filter(hasAccess)}
			{#if visibleItems.length > 0}
				<div>
					<h3 class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
						{group.category}
						</h3>
						<ul class="space-y-1">
							{#each visibleItems as item}
								<li>
									<a
										href={item.href}
										class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition {isActive(item.href) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
									>
										<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[item.icon]} />
										</svg>
										<span>{item.label}</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/each}
	</nav>
</aside>

<!-- Mobile Sidebar Overlay -->
{#if isOpen}
	<div class="lg:hidden fixed inset-0 z-40">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/50"
			onclick={() => isOpen = false}
			aria-label="Cerrar menú"
		></button>

		<!-- Mobile Sidebar -->
		<aside class="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 overflow-y-auto">
			<div class="p-4 border-b border-slate-800">
				<div class="flex items-center gap-2">
					<img src="/logo.png" alt="Logo" class="h-8 w-auto" />
					<span class="text-lg font-bold text-white">Paulo Freire</span>
				</div>
			</div>

			<nav class="p-4 space-y-6">
				{#each navigation as group}
					{@const visibleItems = group.items.filter(hasAccess)}
					{#if visibleItems.length > 0}
						<div>
							<h3 class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
								{group.category}
							</h3>
							<ul class="space-y-1">
								{#each visibleItems as item}
									<li>
										<a
											href={item.href}
											onclick={() => isOpen = false}
											class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition {isActive(item.href) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
										>
											<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[item.icon]} />
											</svg>
											<span>{item.label}</span>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			</nav>
		</aside>
	</div>
{/if}

<!-- Spacer para desktop -->
<div class="hidden lg:block w-64 shrink-0"></div>
