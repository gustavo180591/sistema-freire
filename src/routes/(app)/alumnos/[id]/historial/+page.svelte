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
		<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Legajo digital</p>
				<h1 class="mt-2 text-4xl font-bold tracking-tight">
					{student.fullName}
				</h1>
				<p class="mt-3 text-sm text-slate-400">
					DNI: {student.dni} · {student.career}
					{#if student.location}
						· Sede: {student.location}
					{/if}
				</p>
				<div class="mt-4 flex flex-wrap gap-2">
					<div class="inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm">
						{#if student.status === 'ACTIVE'}
							<span class="text-green-400">Activo</span>
						{:else if student.status === 'INACTIVE'}
							<span class="text-yellow-400">Inactivo</span>
						{:else if student.status === 'SUSPENDED'}
							<span class="text-red-400">Suspendido</span>
						{:else if student.status === 'GRADUATED'}
							<span class="text-blue-400">Egresado</span>
						{:else}
							{student.status}
						{/if}
					</div>
					{#if student.isRecursante}
						<div
							class="inline-flex rounded-full border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-sm"
						>
							<span class="text-amber-400">Recursante</span>
						</div>
					{/if}
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<a
					href="/alumnos/{student.id}/documentos"
					class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					Documentos
				</a>
				<a
					href="/alumnos/{student.id}/seguimiento"
					class="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
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
	<section class="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
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
			<p class="text-sm text-slate-400">Cursando</p>
			<h2 class="mt-3 text-4xl font-bold">{academic.currentSubjects}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Asistencia promedio</p>
			<h2 class="mt-3 text-4xl font-bold">{academic.averageAttendance}%</h2>
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
			href={`/alumnos/${student.id}/historial-anual`}
			class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
		>
			Historial por Ciclo Lectivo
		</a>

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
		{#if academic.subjects.length === 0}
			<div class="p-12 text-center">
				<p class="text-slate-400">Este alumno todavía no tiene materias/comisiones asignadas.</p>
			</div>
		{:else}
			<table class="w-full text-left">
				<thead class="border-b border-slate-800 bg-slate-900">
					<tr>
						<th class="px-6 py-4 text-sm font-semibold">Materia</th>
						<th class="px-6 py-4 text-sm font-semibold">Año</th>
						<th class="px-6 py-4 text-sm font-semibold">Comisión</th>
						<th class="px-6 py-4 text-sm font-semibold">Ciclo lectivo</th>
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
								{#if subject.commission}
									<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
										{subject.commission}
									</span>
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</td>
							<td class="px-6 py-4">
								{#if subject.academicTerm}
									{subject.academicTerm.year}
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</td>
							<td class="px-6 py-4">
								{#if subject.attendanceTotal > 0}
									<div class="flex items-center gap-2">
										<span class="text-sm">
											{subject.attendancePresent}/{subject.attendanceTotal} · {subject.attendancePercent}%
										</span>
										{#if subject.attendancePercent >= 75}
											<span
												class="rounded-full border border-green-800 bg-green-950/30 px-2 py-0.5 text-xs text-green-400"
											>
												OK
											</span>
										{:else}
											<span
												class="rounded-full border border-red-800 bg-red-950/30 px-2 py-0.5 text-xs text-red-400"
											>
												Baja
											</span>
										{/if}
									</div>
								{:else}
									<span class="text-sm text-slate-500">Sin registros</span>
								{/if}
							</td>
							<td class="px-6 py-4">
								<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
									{subject.regularityStatus}
								</span>
							</td>
							<td class="px-6 py-4">
								{#if subject.approved}
									<span class="text-green-400">Sí</span>
								{:else}
									<span class="text-slate-500">No</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
</div>

<!-- Modal de confirmación para restablecer contraseña -->
{#if showResetModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8">
			<div class="mb-6 flex items-center space-x-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
					<svg class="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
						/>
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-bold text-white">Restablecer contraseña</h2>
					<p class="text-sm text-slate-400">Esta acción no se puede deshacer</p>
				</div>
			</div>

			<div class="mb-6 rounded-2xl bg-slate-800/50 p-4">
				<p class="font-medium text-white">{student.fullName}</p>
				<p class="text-sm text-slate-400">DNI: {student.dni}</p>
				<p class="mt-2 text-sm text-amber-400">La contraseña se restablecerá a: 12345678</p>
			</div>

			<form
				method="POST"
				action="?/resetPassword"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data) {
							const data = result.data as { message?: string };
							resetMessage = {
								type: 'success',
								text: data.message || 'Contraseña restablecida'
							};
							showResetModal = false;
							await update();
							setTimeout(() => (resetMessage = null), 3000);
						} else if (result.type === 'failure' && result.data) {
							const data = result.data as { error?: string };
							resetMessage = {
								type: 'error',
								text: data.error || 'Error al restablecer contraseña'
							};
							await update();
							setTimeout(() => (resetMessage = null), 3000);
						}
					};
				}}
			>
				<div class="flex justify-end space-x-4">
					<button
						type="button"
						onclick={() => (showResetModal = false)}
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
	<div
		class="fixed right-4 bottom-4 rounded-2xl px-6 py-4 {resetMessage.type === 'success'
			? 'bg-green-500'
			: 'bg-red-500'} font-medium text-white shadow-lg"
	>
		{resetMessage.text}
	</div>
{/if}
