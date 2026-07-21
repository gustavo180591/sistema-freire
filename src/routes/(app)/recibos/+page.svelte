<script lang="ts">
	import { PAYSLLIP_PORTAL_URL } from '$lib/config';
</script>

<svelte:head>
	<title>Recibos de sueldo | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Acceso al sistema de liquidación de recibos de sueldo" />
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center">
	<div
		class="max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70"
	>
		<div
			class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-600/20"
		>
			<svg
				class="h-8 w-8 text-indigo-600 dark:text-indigo-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z M5 21h14"
				/>
			</svg>
		</div>

		<div class="space-y-2">
			<h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
				Sistema de Liquidación
			</h1>
			<p class="text-lg text-slate-600 dark:text-slate-400">Acceso a recibos de sueldo</p>
		</div>

		<div
			class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left dark:border-slate-800 dark:bg-slate-950/50"
		>
			<p class="text-sm text-slate-700 dark:text-slate-300">
				<strong class="text-slate-900 dark:text-white">Información importante:</strong>
			</p>
			<ul class="ml-4 list-disc space-y-2 text-sm text-slate-600 dark:text-slate-400">
				<li>Los recibos de sueldo se gestionan a través de un sistema externo de liquidación.</li>
				<li>Al hacer clic en el botón de abajo, será redirigido a dicho sistema.</li>
				<li>Si tiene problemas de acceso, contacte al departamento de administración.</li>
			</ul>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
			{#if !PAYSLLIP_PORTAL_URL}
				<button
					disabled
					class="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-400 px-6 py-3 text-sm font-semibold text-white opacity-50"
				>
					<span>Pendiente de configuración</span>
				</button>
			{:else}
				<a
					href={PAYSLLIP_PORTAL_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
				>
					<span>Acceder al sistema de liquidación</span>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
						/>
					</svg>
				</a>
			{/if}

			<a
				href="/dashboard"
				class="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
			>
				Volver al dashboard
			</a>
		</div>

		{#if !PAYSLLIP_PORTAL_URL}
			<p class="text-xs text-slate-500 dark:text-slate-500">
				El enlace externo será informado por el liquidador.
			</p>
		{/if}
	</div>
</div>
