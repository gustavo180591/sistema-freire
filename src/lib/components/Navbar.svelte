<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

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

	interface ImpersonationData {
		active: true;
		startedAt: Date;
		originalUser: User;
	}

	const impersonation = $derived(
		(
			page.data as {
				impersonation?: ImpersonationData | null;
			}
		).impersonation ?? null
	);

	const canImpersonate = $derived(Boolean(user?.roles.includes('SUPERADMIN')) && !impersonation);

	const logoPath = '/logo.png';

	// Determinar URL de inicio según rol
	const homeUrl = $derived(() => {
		if (!user) return '/';
		if (user.roles.includes('ALUMNO')) return '/alumno';
		if (user.roles.includes('DOCENTE')) return '/docente';
		if (user.roles.includes('PRECEPTOR')) return '/preceptor';
		return '/dashboard';
	});

	// Determinar URL de perfil según rol
	const profileUrl = $derived(() => {
		if (!user) return '/login';
		if (user.roles.includes('ALUMNO')) return '/alumno/perfil';
		if (user.roles.includes('DOCENTE')) return '/docente';
		if (user.roles.includes('PRECEPTOR')) return '/preceptor';
		return '/perfil';
	});

	// Obtener nombre de la sección actual
	const currentSection = $derived(() => {
		const path = page.url.pathname;
		if (path === '/dashboard') return 'Dashboard';
		if (path.startsWith('/alumnos')) return 'Alumnos';
		if (path.startsWith('/usuarios')) return 'Usuarios';
		if (path.startsWith('/carreras')) return 'Carreras';
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
			const handleScroll = () => (isScrolled = window.scrollY > 10);
			window.addEventListener('scroll', handleScroll);
			document.addEventListener('click', handleClickOutside);
			return () => {
				window.removeEventListener('scroll', handleScroll);
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<nav
	class="fixed top-0 right-0 left-0 z-50 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
>
	<div class="mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-full items-center justify-between">
			<!-- Logo + Sección -->
			<div class="flex items-center gap-6">
				<a href={homeUrl()} class="flex items-center gap-2 transition hover:opacity-80">
					<img src={logoPath} alt="Logo" class="h-16 w-auto" />
					<span class="text-lg font-bold text-slate-900 dark:text-white"
						>ISFD "PAULO FREIRE" 1117</span
					>
				</a>
				{#if currentSection()}
					<span class="hidden text-slate-400 md:block dark:text-slate-500">/</span>
					<span class="hidden text-sm font-medium text-slate-600 md:block dark:text-slate-300"
						>{currentSection()}</span
					>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-4">
				{#if user}
					<!-- User Menu -->
					<div class="user-menu relative">
						<button
							onclick={toggleUserMenu}
							class="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
						>
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-white dark:bg-slate-700 dark:text-white"
							>
								{user.firstName[0]}{user.lastName[0]}
							</div>
							<span class="hidden text-sm font-medium text-slate-900 lg:block dark:text-white"
								>{user.firstName}</span
							>
							<svg
								class="h-4 w-4 text-slate-500 dark:text-slate-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>

						{#if userMenuOpen}
							<div
								class="absolute top-full right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/20 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/95"
							>
								<!-- User Info Header -->
								<div
									class="bg-linear-to-br from-slate-100 to-slate-200 p-4 dark:from-slate-800 dark:to-slate-900"
								>
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-lg"
										>
											{user.firstName[0]}{user.lastName[0]}
										</div>
										<div class="min-w-0">
											<p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
												{user.firstName}
												{user.lastName}
											</p>
											<p class="truncate text-xs text-slate-600 dark:text-slate-400">
												{user.email}
											</p>
										</div>
									</div>
								</div>

								<!-- Menu Items -->
								<div class="p-2">
									<a
										href={profileUrl()}
										onclick={() => (userMenuOpen = false)}
										class="light-hover-contrast group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
									>
										<svg
											class="h-4 w-4 text-slate-500 transition-colors group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
											/>
										</svg>
										<span>Mi Perfil</span>
									</a>

									{#if canImpersonate}
										<a
											href="/impersonar"
											onclick={() => (userMenuOpen = false)}
											class="light-hover-contrast group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-indigo-600 transition-all hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
												/>
											</svg>

											<span>Impersonar usuario</span>
										</a>
									{/if}

									<div class="my-1.5 border-t border-slate-200 dark:border-slate-800"></div>

									<div class="px-3 py-2">
										<ThemeToggle />
									</div>

									<div class="my-1.5 border-t border-slate-200 dark:border-slate-800"></div>

									<button
										onclick={logout}
										class="light-hover-contrast group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
									>
										<svg
											class="h-4 w-4 text-red-500/70 transition-colors group-hover:text-red-600 dark:text-red-400/70 dark:group-hover:text-red-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
											/>
										</svg>
										<span>Cerrar sesión</span>
									</button>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<a
						href="/login"
						class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
					>
						Iniciar sesión
					</a>
				{/if}
			</div>
		</div>
	</div>
</nav>

{#if impersonation && user}
	<div
		class="fixed top-16 right-0 left-0 z-40 border-y border-indigo-500/50 bg-transparent px-4 py-2.5 text-slate-900 dark:text-white"
	>
		<div
			class="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="min-w-0">
				<p
					class="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-indigo-600 uppercase dark:text-indigo-400"
				>
					<span class="h-2 w-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/60"></span>
					Modo impersonación
				</p>

				<p class="truncate text-sm">
					Estás operando como
					<strong>
						{user.firstName}
						{user.lastName}
					</strong>
					· {user.roles.join(' · ')}
				</p>
			</div>

			<form method="POST" action="/api/impersonation/stop">
				<button
					type="submit"
					class="rounded-lg border border-indigo-500/60 bg-transparent px-4 py-1.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-600 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-300 focus:outline-none dark:text-indigo-300 dark:hover:bg-indigo-950/30"
				>
					Volver a {impersonation.originalUser.firstName}
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Spacer -->
<div class={impersonation ? 'h-28' : 'h-16'}></div>
