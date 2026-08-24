<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Inscripción a mesa de examen</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 p-6">
	<div>
		<a href="/alumno" class="text-sm text-slate-400 transition hover:text-white">
			← Volver al panel
		</a>
	</div>

	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-blue-400 uppercase">Mesa de examen</p>

		<h1 class="mt-2 text-3xl font-bold">{data.evaluation.subject}</h1>
		<p class="mt-2 text-slate-400">{data.evaluation.title}</p>

		<div class="mt-8 grid gap-4 sm:grid-cols-2">
			<div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
				<p class="text-xs text-slate-500 uppercase">Carrera</p>
				<p class="mt-1 font-medium">{data.evaluation.career}</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
				<p class="text-xs text-slate-500 uppercase">Sede / localidad</p>
				<p class="mt-1 font-medium">{data.evaluation.location}</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
				<p class="text-xs text-slate-500 uppercase">Fecha de examen</p>
				<p class="mt-1 font-medium">
					{new Date(data.evaluation.evaluationDate).toLocaleString('es-AR')}
				</p>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
				<p class="text-xs text-slate-500 uppercase">Inscripción disponible hasta</p>
				<p class="mt-1 font-medium">
					{new Date(data.evaluation.registrationClosesAt).toLocaleString('es-AR')}
				</p>
			</div>
		</div>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
			{form.message}
		</div>
	{/if}

	{#if data.registration?.status === 'REGISTERED'}
		<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
			<p class="font-semibold text-emerald-300">✓ Ya estás inscripto</p>
			<p class="mt-2 text-sm text-slate-400">
				Inscripción realizada:
				{new Date(data.registration.registeredAt).toLocaleString('es-AR')}
			</p>
		</div>
	{:else if data.canRegister}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<h2 class="text-lg font-semibold">Confirmar inscripción</h2>

			<p class="mt-2 text-sm text-slate-400">
				Confirmá que querés inscribirte a esta mesa de examen.
			</p>

			<form method="POST" class="mt-6">
				<button
					type="submit"
					class="w-full rounded-2xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
				>
					Inscribirme a la mesa
				</button>
			</form>
		</div>
	{:else}
		<div class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
			<p class="font-semibold text-amber-300">No podés inscribirte a esta mesa</p>
			<p class="mt-2 text-sm text-slate-300">{data.reason}</p>
		</div>
	{/if}
</div>
