<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';

	interface User {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		roles: string[];
	}

	let { user }: { user: User | null } = $props();

	let userMenuOpen = $state(false);
	let isScrolled = $state(false);

	const logoPath = '/logo.png';

	// Obtener nombre de la sección actual
	const currentSection = $derived(() => {
		const path = page.url.pathname;
		if (path === '/dashboard') return 'Dashboard';
		if (path.startsWith('/alumnos')) return 'Alumnos';
		if (path.startsWith('/usuarios')) return 'Usuarios';
		if (path.startsWith('/carreras')) return 'Carreras';
		if (path.startsWith('/comisiones')) return 'Comisiones';
		if (path.startsWith('/materias')) return 'Materias';
		if (path.startsWith('/finanzas')) return 'Finanzas';
		if (path.startsWith('/reportes')) return 'Reportes';
		return '';
	});

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	async function logout() {
		if (browser) {
			await fetch('/logout', { method: 'POST' });
			window.location.href = '/login';
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.user-menu')) {
			userMenuOpen = false;
		}
	}

	onMount(() => {
		if (browser) {
			const handleScroll = () => isScrolled = window.scrollY > 10;
			window.addEventListener('scroll', handleScroll);
			document.addEventListener('click', handleClickOutside);
			return () => {
				window.removeEventListener('scroll', handleScroll);
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<nav class="fixed top-0 left-0 right-0 z-50 h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
	<div class="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8">
		<div class="flex h-full items-center justify-between">
			<!-- Logo + Sección -->
			<div class="flex items-center gap-6">
				<a href="/" class="flex items-center gap-2 transition hover:opacity-80">
					<img src={logoPath} alt="Logo" class="h-8 w-auto" />
					<span class="text-lg font-bold text-white">Paulo Freire</span>
				</a>
				{#if currentSection()}
					<span class="hidden md:block text-slate-500">/</span>
					<span class="hidden md:block text-sm font-medium text-slate-300">{currentSection()}</span>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-4">
				{#if user}
					<!-- User Menu -->
					<div class="user-menu relative">
						<button
							onclick={toggleUserMenu}
							class="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-slate-800"
						>
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
								{user.firstName[0]}{user.lastName[0]}
							</div>
							<span class="hidden lg:block text-sm font-medium text-white">{user.firstName}</span>
							<svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>

						{#if userMenuOpen}
							<div class="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-sm shadow-2xl shadow-black/20 overflow-hidden">
								<!-- User Info Header -->
								<div class="bg-gradient-to-br from-slate-800 to-slate-900 p-4">
									<div class="flex items-center gap-3">
										<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-lg">
											{user.firstName[0]}{user.lastName[0]}
										</div>
										<div class="min-w-0">
											<p class="text-sm font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
											<p class="text-xs text-slate-400 truncate">{user.email}</p>
										</div>
									</div>
								</div>

								<!-- Menu Items -->
								<div class="p-2">
									<a href="/alumno" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all">
										<svg class="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
										<span>Mi Perfil</span>
									</a>

									<div class="my-1.5 border-t border-slate-800"></div>

									<button
										onclick={logout}
										class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-950/20 transition-all"
									>
										<svg class="h-4 w-4 text-red-400/70 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
										</svg>
										<span>Cerrar sesión</span>
									</button>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<a href="/login" class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 transition">
						Iniciar sesión
					</a>
				{/if}
			</div>
		</div>
	</div>
</nav>

<!-- Spacer -->
<div class="h-16"></div>
