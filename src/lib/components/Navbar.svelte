<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface User {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		roles: string[];
	}

	// Props
	let { user }: { user: User | null } = $props();

	// Estado del menú mobile
	let mobileMenuOpen = $state(false);
	let isScrolled = $state(false);
	let userMenuOpen = $state(false);

	// Links de navegación con sus permisos requeridos
	const navLinksConfig = [
		{ label: 'Inicio', href: '/', requiredRoles: [] }, // Todos pueden ver
		{ label: 'Dashboard', href: '/dashboard', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] },
		{ label: 'Usuarios', href: '/usuarios', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] },
		{ label: 'Carreras', href: '/carreras', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'] },
		{ label: 'Comisiones', href: '/comisiones', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE'] },
		{ label: 'Materias', href: '/materias', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE'] },
		{ label: 'Finanzas', href: '/finanzas', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS'] },
		{ label: 'Recibos', href: '/recibos', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'DOCENTE', 'FINANZAS'] },
		{ label: 'Reportes', href: '/reportes', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS'] },
		{ label: 'Alumnos', href: '/alumnos', requiredRoles: ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO', 'FINANZAS', 'ALUMNO'] },
		{ label: 'Mi Perfil', href: '/alumno', requiredRoles: ['ALUMNO','SUPERADMIN'] },
		{ label: 'Contacto', href: '/contacto', requiredRoles: [] } // Todos pueden 
	];

	// Filtrar enlaces según los roles del usuario
	const navLinks = $derived(
		navLinksConfig.filter(link => {
			// Si no requiere roles, mostrar a todos
			if (link.requiredRoles.length === 0) return true;
			// Si el usuario no está autenticado, no mostrar enlaces que requieren roles
			if (!user) return false;
			// Mostrar si el usuario tiene al menos uno de los roles requeridos
			return link.requiredRoles.some(role => user.roles.includes(role));
		})
	);

	// Logo
	const logoPath = '/logo.png';

	// Toggle menú mobile
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
		document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
	}

// Toggle user menu
	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

// Logout
	async function logout() {
		if (browser) {
			const formData = new FormData();
			await fetch('/logout', {
				method: 'POST',
				body: formData
			});
			window.location.href = '/login';
		}
	}

// Close user menu when clicking outside
	function handleUserMenuClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.user-menu-container')) {
			userMenuOpen = false;
		}
	}

	// Manejo de scroll para efecto sticky
	onMount(() => {
		if (browser) {
			// Manejo de scroll
			const handleScroll = () => {
				isScrolled = window.scrollY > 10;
			};

			window.addEventListener('scroll', handleScroll);

			// Cerrar menú del usuario al hacer click fuera
			document.addEventListener('click', handleUserMenuClickOutside);

			return () => {
				window.removeEventListener('scroll', handleScroll);
				document.removeEventListener('click', handleUserMenuClickOutside);
			};
		}
	});

	// Cerrar menú mobile al cambiar tamaño de pantalla
	$effect(() => {
		if (browser && window.innerWidth >= 768 && mobileMenuOpen) {
			mobileMenuOpen = false;
			document.body.style.overflow = '';
		}
	});
</script>

<nav
	class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 {isScrolled
		? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-slate-200 dark:border-slate-800'
		: 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'}"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<a
				href="/"
				class="flex items-center space-x-2 transition hover:scale-105"
			>
				<img
					src={logoPath}
					alt="Sistema Freire Logo"
					class="h-8 w-auto"
				/>
				<span class="text-xl font-bold text-slate-900 dark:text-white">Paulo Freire</span>
			</a>

			<!-- Desktop Navigation -->
			<div class="hidden md:flex md:items-center md:space-x-8">
				{#each navLinks as link}
					<a
						href={link.href}
						class="text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:text-blue-600 dark:hover:text-blue-400 relative group"
					>
						{link.label}
						<span
							class="absolute -bottom-1 left-0 h-0.5 w-0 bg-linear-to-r from-blue-500 to-purple-600 transition-all duration-300 group-hover:w-full"
						></span>
					</a>
				{/each}
			</div>

			<!-- Desktop Actions -->
			<div class="hidden md:flex md:items-center md:space-x-4">
				{#if user}
					<!-- User Avatar -->
					<div class="relative user-menu-container">
						<button
							onclick={toggleUserMenu}
							aria-label="User menu"
							class="flex items-center space-x-2 rounded-lg p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<div class="relative">
								<div
									class="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-green-400 to-blue-500 text-sm font-semibold text-white ring-2 ring-slate-200 dark:ring-slate-800"
								>
									{user.firstName[0]}{user.lastName[0]}
								</div>
								<span
									class="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"
								></span>
							</div>
							<div class="hidden lg:block text-left">
								<p class="text-sm font-medium text-slate-900 dark:text-white">
									{user.firstName} {user.lastName}
								</p>
								<p class="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
							</div>
						</button>

						<!-- User Dropdown Menu -->
						<div
							class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl transition-all {userMenuOpen
								? 'opacity-100 scale-100'
								: 'opacity-0 scale-95 pointer-events-none'}"
						>
							<div class="p-2">
								<div class="px-3 py-2 border-b border-slate-200 dark:border-slate-800 mb-2">
									<p class="text-sm font-medium text-slate-900 dark:text-white">
										{user.firstName} {user.lastName}
									</p>
									<p class="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
								</div>
								<button
									onclick={logout}
									class="w-full flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									<svg
										class="h-4 w-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
										></path>
									</svg>
									<span>Cerrar sesión</span>
								</button>
							</div>
						</div>
					</div>
				{:else}
					<!-- CTA Button -->
					<a
						href="/login"
						class="rounded-lg bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:scale-105 hover:shadow-blue-500/40"
					>
						Iniciar sesión
					</a>
				{/if}
			</div>

			<!-- Mobile menu button -->
			<div class="flex items-center space-x-2 md:hidden">
				<!-- Hamburger Menu Button -->
				<button
					onclick={toggleMobileMenu}
					aria-label="Toggle menu"
					aria-expanded={mobileMenuOpen}
					class="rounded-lg p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<div class="flex flex-col space-y-1.5">
						<span
							class="block h-0.5 w-6 transition-all duration-300 {mobileMenuOpen
								? 'translate-y-2 rotate-45 bg-slate-900 dark:bg-white'
								: 'bg-slate-600 dark:bg-slate-400'}"
						></span>
						<span
							class="block h-0.5 w-6 transition-all duration-300 {mobileMenuOpen
								? 'opacity-0 bg-slate-900 dark:bg-white'
								: 'bg-slate-600 dark:bg-slate-400'}"
						></span>
						<span
							class="block h-0.5 w-6 transition-all duration-300 {mobileMenuOpen
								? '-translate-y-2 -rotate-45 bg-slate-900 dark:bg-white'
								: 'bg-slate-600 dark:bg-slate-400'}"
						></span>
					</div>
				</button>
			</div>
		</div>

		<!-- Mobile Navigation Menu -->
		<div
			class="md:hidden overflow-hidden transition-all duration-300 {mobileMenuOpen
				? 'max-h-96 opacity-100'
				: 'max-h-0 opacity-0'}"
		>
			<div class="space-y-1 py-4 border-t border-slate-200 dark:border-slate-800">
				{#each navLinks as link}
					<a
						href={link.href}
						onclick={() => (mobileMenuOpen = false)}
						class="block rounded-lg px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400"
					>
						{link.label}
					</a>
				{/each}

				<div class="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-3">
					{#if user}
						<!-- User Avatar Mobile -->
						<div class="flex items-center space-x-3 px-4 py-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-green-400 to-blue-500 text-sm font-semibold text-white ring-2 ring-slate-200 dark:ring-slate-800"
							>
								{user.firstName[0]}{user.lastName[0]}
							</div>
							<div>
								<p class="text-sm font-medium text-slate-900 dark:text-white">
									{user.firstName} {user.lastName}
								</p>
								<p class="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
							</div>
						</div>
					{:else}
						<!-- CTA Button Mobile -->
						<a
							href="/login"
							onclick={() => (mobileMenuOpen = false)}
							class="block w-full rounded-lg bg-linear-to-r from-blue-500 to-purple-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:scale-105"
						>
							Iniciar sesión
						</a>
					{/if}
				</div>
			</div>
		</div>
	</div>
</nav>

<!-- Spacer para el navbar sticky -->
<div class="h-16"></div>
