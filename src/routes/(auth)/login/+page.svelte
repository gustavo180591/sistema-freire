<script lang="ts">
	let { form } = $props();
	
	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
</script>

<svelte:head>
	<title>Login | Instituto Paulo Freire</title>
	<meta
		name="description"
		content="Acceso al Sistema Integral de Gestión Académica y Administrativa"
	/>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-16">
		<div class="grid w-full gap-10 lg:grid-cols-2">
			<section class="hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-10 lg:block">
				<p class="text-sm font-medium tracking-[0.2em] text-slate-400 uppercase">
					Instituto Superior de Formación Docente
				</p>
				<h1 class="mt-4 text-5xl font-bold tracking-tight">
					Acceso institucional
					<span class="block text-slate-300">Paulo Freire</span>
				</h1>
				<p class="mt-6 max-w-xl text-lg leading-8 text-slate-300">
					Ingresá con tus credenciales para acceder a módulos académicos, financieros, asistencia,
					reportes oficiales y documentación docente.
				</p>

				<div class="mt-10 grid gap-4">
					<div class="rounded-2xl border border-slate-800 p-5">
						<h2 class="font-semibold">Seguridad y trazabilidad</h2>
						<p class="mt-2 text-sm text-slate-400">
							Todas las acciones quedan registradas mediante auditoría institucional.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-800 p-5">
						<h2 class="font-semibold">Acceso por roles</h2>
						<p class="mt-2 text-sm text-slate-400">
							Dirección, Secretaría, Docentes, Alumnos y Finanzas.
						</p>
					</div>
				</div>
			</section>

			<section
				class="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl"
			>
				<div>
					<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Iniciar sesión</p>
					<h2 class="mt-2 text-3xl font-bold">Bienvenido</h2>
					<p class="mt-2 text-sm text-slate-400">Ingresá tus credenciales institucionales.</p>
				</div>

				{#if form?.error}
					<div class="mt-4 rounded-xl border p-4 text-sm {form?.locked ? 'border-red-800 bg-red-950/30 text-red-400' : 'border-red-800 bg-red-950/30 text-red-400'}">
						<div class="flex items-center gap-2">
							<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<p class="font-medium">{form.error}</p>
								{#if form?.attemptsLeft !== undefined && form.attemptsLeft > 0}
									<p class="text-xs mt-1">Te quedan {form.attemptsLeft} intentos antes del bloqueo.</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<form method="POST" class="mt-8 space-y-5">
					<div>
						<label for="email" class="mb-2 block text-sm font-medium text-slate-300">
							Correo institucional
						</label>
						<input
							id="email"
							bind:value={email}
							name="email"
							type="email"
							autocomplete="email"
							placeholder="nombre@instituto.edu.ar"
							class="w-full rounded-2xl border {form?.error ? 'border-red-600' : 'border-slate-700'} bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
					</div>

					<div>
						<label for="password" class="mb-2 block text-sm font-medium text-slate-300"> Contraseña </label>
						<input
							id="password"
							bind:value={password}
							name="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="current-password"
							placeholder="••••••••"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
					</div>

					<div class="flex items-center justify-between text-sm">
						<label class="flex items-center gap-2 text-slate-400">
							<input bind:checked={showPassword} type="checkbox" />
							Mostrar contraseña
						</label>

						<a href="/forgot-password" class="text-slate-300 hover:text-white">
							¿Olvidaste tu contraseña?
						</a>
					</div>

					<button
						type="submit"
						disabled={form?.locked}
						class="w-full rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{form?.locked ? `Bloqueado (${form.minutesLeft} min)` : 'Ingresar al sistema'}
					</button>
				</form>

				<p class="mt-8 text-center text-sm text-slate-400">
					¿No tenés acceso?
					<span class="font-medium text-slate-300">
						Solicitá tu alta en Secretaría Académica.
					</span>
				</p>
			</section>
		</div>
	</div>
</div>
