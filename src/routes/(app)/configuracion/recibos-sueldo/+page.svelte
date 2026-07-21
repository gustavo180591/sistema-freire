<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let url = $derived(data.currentUrl || '');
</script>

<svelte:head>
	<title>Configuración de Recibos de Sueldo | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-8 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Configuración</p>
			<h1 class="text-3xl font-bold">Recibos de Sueldo</h1>
			<p class="text-slate-400">Configurar el dominio del portal externo de recibos de sueldo</p>
		</div>
		<a
			href="/configuracion"
			class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
		>
			Volver a Configuración
		</a>
	</div>

	<!-- Formulario -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<form method="POST" use:enhance>
			<div class="space-y-6">
				<div>
					<label for="url" class="mb-2 block text-sm font-medium text-slate-300">
						URL del Portal de Recibos de Sueldo
					</label>
					<input
						id="url"
						name="url"
						type="url"
						bind:value={url}
						placeholder="https://ejemplo.com/recibos"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition focus:border-indigo-500 focus:outline-none"
					/>
					<p class="mt-2 text-sm text-slate-400">
						Ingrese la URL completa del portal externo donde los docentes pueden acceder a sus
						recibos de sueldo.
					</p>
				</div>

				{#if form?.success}
					<div
						class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400"
					>
						{form.success}
					</div>
				{/if}

				{#if form?.error}
					<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
						{form.error}
					</div>
				{/if}

				<div class="flex gap-3">
					<button
						type="submit"
						class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
					>
						Guardar Configuración
					</button>
					{#if data.currentUrl}
						<a
							href={data.currentUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
						>
							Probar URL
						</a>
					{/if}
				</div>
			</div>
		</form>
	</div>

	<!-- Información actual -->
	{#if data.currentUrl}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h3 class="mb-4 text-lg font-semibold">Configuración Actual</h3>
			<div
				class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
			>
				<div>
					<p class="text-sm text-slate-400">URL Configurada</p>
					<p class="font-medium text-slate-200">{data.currentUrl}</p>
				</div>
				<span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
					Activo
				</span>
			</div>
		</div>
	{:else}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h3 class="mb-4 text-lg font-semibold">Estado Actual</h3>
			<div
				class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
			>
				<div>
					<p class="text-sm text-slate-400">URL Configurada</p>
					<p class="font-medium text-slate-200">No configurada</p>
				</div>
				<span class="rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-400">
					Pendiente
				</span>
			</div>
		</div>
	{/if}
</div>
