<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let code = $state('');
</script>

<svelte:head>
	<title>Verificación 2FA | Paulo Freire</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
		<div class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
			<div class="text-center">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-950/50">
					<svg class="h-8 w-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
				</div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Verificación de Seguridad</p>
				<h1 class="mt-2 text-2xl font-bold">Autenticación de Dos Factores</h1>
				<p class="mt-2 text-sm text-slate-400">
					Hola <strong class="text-white">{data.user.fullName}</strong>, ingresá el código de 6 dígitos de tu app autenticadora.
				</p>
			</div>

			{#if form?.error}
				<div class="mt-6 rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
					<div class="flex items-center gap-2">
						<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p>{form.error}</p>
					</div>
				</div>
			{/if}

			<form method="POST" use:enhance class="mt-6 space-y-4">
				<div>
					<label for="code" class="mb-2 block text-sm font-medium text-slate-300">
						Código de 6 dígitos
					</label>
					<input
						id="code"
						name="code"
						type="text"
						bind:value={code}
						placeholder="000000"
						maxlength="6"
						autocomplete="off"
						inputmode="numeric"
						pattern="[0-9]*"
						class="w-full rounded-2xl border {form?.error ? 'border-red-600' : 'border-slate-700'} bg-slate-950 px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] transition outline-none focus:border-indigo-500"
						autofocus
					/>
				</div>

				<button
					type="submit"
					disabled={code.length !== 6}
					class="w-full rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Verificar y Continuar
				</button>
			</form>

			<div class="mt-6 text-center">
				<a href="/login" class="text-sm text-slate-400 hover:text-white transition">
					← Volver al login
				</a>
			</div>

			<div class="mt-6 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
				<p class="text-xs text-slate-500">
					<strong class="text-slate-400">¿Problemas con el código?</strong><br>
					Asegurate de que la hora de tu celular esté sincronizada automáticamente. 
					Los códigos TOTP caducan cada 30 segundos.
				</p>
			</div>
		</div>
	</div>
</div>
