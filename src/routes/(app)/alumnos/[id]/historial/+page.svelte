<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
	let showResetModal = $state(false);
	let resetMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const student = $derived(data.student);
	const academic = $derived(data.academic);
	const financial = $derived(data.financial);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});
</script>

<svelte:head>
	<title>Historial académico | {student.fullName}</title>
	<meta name="description" content="Legajo académico y financiero del alumno" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Legajo digital</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">
					{student.fullName}
				</h1>
				<p class="mt-3 text-sm text-slate-400">
					DNI: {student.dni} · {student.career}
				</p>
				<div class="mt-4 inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm">
					{student.status}
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<a
					href="/alumnos/{student.id}/documentos"
					class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					Documentos
				</a>
				<a
					href="/alumnos/{student.id}/seguimiento"
					class="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					Seguimiento
				</a>
				<a
					href="/alumnos"
					class="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
				>
					← Volver a alumnos
				</a>
			</div>
		</div>
	</section>

	<!-- KPIs -->
	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Progreso</p>
			<h2 class="mt-3 text-4xl font-bold">{academic.progress}%</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Aprobadas</p>
			<h2 class="mt-3 text-4xl font-bold">{academic.approvedSubjects}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Regulares</p>
			<h2 class="mt-3 text-4xl font-bold">{academic.regularSubjects}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda pendiente</p>
			<h2 class="mt-3 text-4xl font-bold">
				{currency.format(financial.totalDebt)}
			</h2>
		</div>
	</section>

	<!-- CTA -->
	<section class="flex flex-wrap gap-3">
		<a
			href={`/alumnos/${student.id}/certificados`}
			class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Generar certificado
		</a>

		<a
			href={`/alumnos/${student.id}/finanzas`}
			class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
		>
			Ver finanzas
		</a>
	</section>

	<!-- Historial -->
	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Materia</th>
					<th class="px-6 py-4 text-sm font-semibold">Año</th>
					<th class="px-6 py-4 text-sm font-semibold">Asistencia</th>
					<th class="px-6 py-4 text-sm font-semibold">Regularidad</th>
					<th class="px-6 py-4 text-sm font-semibold">Aprobada</th>
				</tr>
			</thead>
			<tbody>
				{#each academic.subjects as subject}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{subject.subject}</td>
						<td class="px-6 py-4">{subject.yearLevel}°</td>
						<td class="px-6 py-4">
							{subject.attendancePercent}%
						</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{subject.regularityStatus}
							</span>
						</td>
						<td class="px-6 py-4">
							{subject.approved ? 'Sí' : 'No'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>

<!-- Modal de confirmación para restablecer contraseña -->
{#if showResetModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<div class="bg-slate-900 rounded-3xl border border-slate-800 p-8 max-w-md w-full">
			<div class="flex items-center space-x-4 mb-6">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
					<svg class="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-bold text-white">Restablecer contraseña</h2>
					<p class="text-sm text-slate-400">Esta acción no se puede deshacer</p>
				</div>
			</div>

			<div class="bg-slate-800/50 rounded-2xl p-4 mb-6">
				<p class="text-white font-medium">{student.fullName}</p>
				<p class="text-sm text-slate-400">DNI: {student.dni}</p>
				<p class="text-sm text-amber-400 mt-2">La contraseña se restablecerá a: 12345678</p>
			</div>

			<form
				method="POST"
				action="?/resetPassword"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data) {
							resetMessage = { type: 'success', text: (result.data as any).message || 'Contraseña restablecida' };
							showResetModal = false;
							await update();
							setTimeout(() => resetMessage = null, 3000);
						} else if (result.type === 'failure' && result.data) {
							resetMessage = { type: 'error', text: (result.data as any).error || 'Error al restablecer contraseña' };
							await update();
							setTimeout(() => resetMessage = null, 3000);
						}
					};
				}}
			>
				<div class="flex justify-end space-x-4">
					<button
						type="button"
						onclick={() => showResetModal = false}
						class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-2xl bg-amber-500 px-6 py-3 font-semibold text-white transition hover:bg-amber-600"
					>
						Restablecer
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Mensaje de éxito/error -->
{#if resetMessage}
	<div class="fixed bottom-4 right-4 rounded-2xl px-6 py-4 {resetMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white font-medium shadow-lg">
		{resetMessage.text}
	</div>
{/if}
