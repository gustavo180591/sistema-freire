<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form?: any } = $props();

	// Estados del 2FA
	let setupMode = $state(false);
	let verifying = $state(false);
	let disabling = $state(false);
	let qrCode = $state<string | null>(null);
	let secret = $state<string | null>(null);
	let verifyCode = $state('');
	let disableCode = $state('');

	// Manejar resultado del setup
	$effect(() => {
		if (form?.success && form?.qrCode) {
			qrCode = form.qrCode;
			secret = form.secret;
			setupMode = true;
		}
	});

	function handleVerify() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
				setupMode = false;
				qrCode = null;
				secret = null;
				verifyCode = '';
			}
		};
	}

	function handleDisable() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
				disabling = false;
				disableCode = '';
			}
		};
	}
</script>

<svelte:head>
	<title>Mi Perfil | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4 md:space-y-8 md:p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 md:p-8">
		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div class="flex items-center gap-3 md:gap-4">
				<div
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-lg font-bold text-white shadow-lg md:h-16 md:w-16 md:text-xl"
				>
					{data.user.firstName[0]}{data.user.lastName[0]}
				</div>
				<div class="min-w-0">
					<p class="truncate text-xs tracking-[0.2em] text-slate-400 uppercase md:text-sm">
						{data.user.roles.join(', ')}
					</p>
					<h1 class="mt-1 truncate text-xl font-bold md:text-3xl">{data.user.fullName}</h1>
					<p class="mt-1 truncate text-sm text-slate-400">{data.user.email}</p>
				</div>
			</div>
			<div class="md:text-right">
				<p class="text-xs text-slate-400 md:text-sm">Estado</p>
				<div
					class="mt-1 inline-flex items-center gap-2 rounded-full bg-emerald-950/50 px-3 py-1 text-xs text-emerald-400 md:px-4 md:py-1.5 md:text-sm"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 md:h-2 md:w-2"></span>
					{data.user.status}
				</div>
			</div>
		</div>
	</div>

	<!-- Información Personal -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 md:p-6">
		<h2 class="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Información Personal</h2>
		<div class="grid gap-4 md:grid-cols-2 md:gap-6">
			<div>
				<p class="mb-2 text-sm font-medium text-slate-400">Nombre</p>
				<p class="text-white">{data.user.firstName}</p>
			</div>
			<div>
				<p class="mb-2 text-sm font-medium text-slate-400">Apellido</p>
				<p class="text-white">{data.user.lastName}</p>
			</div>
			<div>
				<p class="mb-2 text-sm font-medium text-slate-400">Email</p>
				<p class="text-white">{data.user.email}</p>
			</div>
			{#if data.user.phone}
				<div>
					<p class="mb-2 text-sm font-medium text-slate-400">Teléfono</p>
					<p class="text-white">{data.user.phone}</p>
				</div>
			{/if}
			<div>
				<p class="mb-2 text-sm font-medium text-slate-400">Roles</p>
				<div class="flex flex-wrap gap-2">
					{#each data.user.roleNames as roleName}
						<span
							class="inline-flex rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs"
						>
							{roleName}
						</span>
					{/each}
				</div>
			</div>
			{#if data.user.locationPermissions && data.user.locationPermissions.length > 0}
				<div class="md:col-span-2">
					<p class="mb-2 text-sm font-medium text-slate-400">Localidad de Trabajo</p>
					<div class="flex flex-wrap gap-2">
						{#each data.user.locationPermissions as location}
							<span
								class="inline-flex rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs"
							>
								{location.name}
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Accesos Rápidos -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 md:p-6">
		<h2 class="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Accesos Rápidos</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
			<a
				href="/usuarios"
				class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-blue-950/50 p-2">
						<svg
							class="h-5 w-5 text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium transition group-hover:text-white">Usuarios</p>
						<p class="text-xs text-slate-400">{data.metrics.totalUsers} registrados</p>
					</div>
				</div>
			</a>

			<a
				href="/alumnos"
				class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-emerald-950/50 p-2">
						<svg
							class="h-5 w-5 text-emerald-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium transition group-hover:text-white">Alumnos</p>
						<p class="text-xs text-slate-400">{data.metrics.totalStudents} registrados</p>
					</div>
				</div>
			</a>

			<a
				href="/carreras"
				class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-purple-950/50 p-2">
						<svg
							class="h-5 w-5 text-purple-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium transition group-hover:text-white">Carreras</p>
						<p class="text-xs text-slate-400">{data.metrics.totalCareers} activas</p>
					</div>
				</div>
			</a>

			<a
				href="/materias"
				class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-orange-950/50 p-2">
						<svg
							class="h-5 w-5 text-orange-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium transition group-hover:text-white">Materias</p>
						<p class="text-xs text-slate-400">{data.metrics.totalSubjects} activas</p>
					</div>
				</div>
			</a>

			<a
				href="/finanzas"
				class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-green-950/50 p-2">
						<svg
							class="h-5 w-5 text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium transition group-hover:text-white">Finanzas</p>
						<p class="text-xs text-slate-400">Gestión de pagos</p>
					</div>
				</div>
			</a>

			<a
				href="/reportes"
				class="group rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-pink-950/50 p-2">
						<svg
							class="h-5 w-5 text-pink-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium transition group-hover:text-white">Reportes</p>
						<p class="text-xs text-slate-400">Estadísticas</p>
					</div>
				</div>
			</a>
		</div>
	</div>

	<!-- Seguridad - 2FA -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 md:p-6">
		<div class="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-xl bg-indigo-950/50 p-2">
					<svg
						class="h-5 w-5 text-indigo-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
				</div>
				<h2 class="text-lg font-semibold md:text-xl">Autenticación de Dos Factores (2FA)</h2>
			</div>
			{#if data.user.totpEnabled}
				<span
					class="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-950/50 px-3 py-1.5 text-sm text-emerald-400"
				>
					<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
					Activado
				</span>
			{:else}
				<span
					class="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-400"
				>
					<span class="h-2 w-2 rounded-full bg-slate-500"></span>
					Desactivado
				</span>
			{/if}
		</div>

		{#if form?.error}
			<div class="mb-4 rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
				✗ {form.error}
			</div>
		{/if}

		{#if form?.success && form?.message}
			<div
				class="mb-4 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-400"
			>
				✓ {form.message}
			</div>
		{/if}

		{#if !data.user.totpEnabled && !setupMode}
			<!-- Setup inicial -->
			<div class="space-y-4">
				<p class="text-sm text-slate-400">
					El 2FA agrega una capa extra de seguridad. Requerirá un código de 6 dígitos de tu app
					autenticadora (Google Authenticator, Authy, etc.) al iniciar sesión.
				</p>
				<form method="POST" action="?/setup2FA" use:enhance>
					<button
						type="submit"
						class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
					>
						Activar 2FA
					</button>
				</form>
			</div>
		{/if}

		{#if setupMode}
			<!-- Mostrar QR y verificar -->
			<div class="space-y-6">
				<div class="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 md:p-6">
					<p class="mb-4 text-sm text-slate-300">
						1. Escaneá este código QR con tu app autenticadora (Google Authenticator, Authy,
						Microsoft Authenticator):
					</p>

					{#if qrCode}
						<div class="mb-4 flex justify-center">
							<img src={qrCode} alt="QR Code 2FA" class="h-48 w-48 rounded-xl md:h-56 md:w-56" />
						</div>
					{/if}

					{#if secret}
						<div class="mb-4 text-center">
							<p class="mb-2 text-xs text-slate-500">O ingresá manualmente este código:</p>
							<code
								class="inline-block rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-slate-300"
							>
								{secret.match(/.{1,4}/g)?.join(' ')}
							</code>
						</div>
					{/if}
				</div>

				<div class="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 md:p-6">
					<p class="mb-4 text-sm text-slate-300">
						2. Ingresá el código de 6 dígitos generado por tu app para verificar:
					</p>

					<form
						method="POST"
						action="?/verify2FA"
						use:enhance={handleVerify}
						class="flex flex-col gap-3 sm:flex-row"
					>
						<input
							type="text"
							name="code"
							bind:value={verifyCode}
							placeholder="000000"
							maxlength="6"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-center font-mono text-lg tracking-widest transition outline-none focus:border-indigo-500 sm:w-32"
						/>
						<button
							type="submit"
							disabled={verifyCode.length !== 6}
							class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Verificar y Activar
						</button>
						<button
							type="button"
							onclick={() => {
								setupMode = false;
								qrCode = null;
								secret = null;
							}}
							class="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
						>
							Cancelar
						</button>
					</form>
				</div>
			</div>
		{/if}

		{#if data.user.totpEnabled}
			<!-- 2FA Activado - opciones -->
			<div class="space-y-4">
				<p class="text-sm text-slate-400">
					El 2FA está activado. Cada vez que inicies sesión, deberás ingresar un código de 6 dígitos
					de tu app autenticadora.
				</p>

				{#if !disabling}
					<button
						onclick={() => (disabling = true)}
						class="rounded-xl border border-red-800 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950/50"
					>
						Desactivar 2FA
					</button>
				{:else}
					<div class="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
						<p class="mb-3 text-sm text-slate-300">
							Para desactivar, ingresá un código válido de tu app autenticadora:
						</p>
						<form
							method="POST"
							action="?/disable2FA"
							use:enhance={handleDisable}
							class="flex flex-col gap-3 sm:flex-row"
						>
							<input
								type="text"
								name="code"
								bind:value={disableCode}
								placeholder="000000"
								maxlength="6"
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-center font-mono text-lg tracking-widest transition outline-none focus:border-indigo-500 sm:w-32"
							/>
							<button
								type="submit"
								disabled={disableCode.length !== 6}
								class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Confirmar Desactivación
							</button>
							<button
								type="button"
								onclick={() => {
									disabling = false;
									disableCode = '';
								}}
								class="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
							>
								Cancelar
							</button>
						</form>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
