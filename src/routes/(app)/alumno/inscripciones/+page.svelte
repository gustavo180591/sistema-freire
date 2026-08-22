<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCancelModal = $state(false);
	let enrollmentToCancel = $state<string | null>(null);

	const getEvaluationTypeLabel = (type: string) => {
		const labels: Record<string, string> = {
			PARCIAL: 'Parcial',
			RECUPERATORIO: 'Recuperatorio',
			TRABAJO_PRACTICO: 'Trabajo práctico',
			INTEGRADOR: 'Integrador',
			EXAMEN_FINAL: 'Examen final',
			MESA_EXAMEN: 'Mesa de examen',
			OTRO: 'Otra instancia'
		};

		return labels[type] ?? type;
	};

	const getStatusLabel = (status: string) => {
		const labels: Record<string, { label: string; color: string }> = {
			PENDING: { label: 'Pendiente', color: 'bg-amber-950/50 text-amber-400' },
			ACTIVE: { label: 'Activa', color: 'bg-green-950/50 text-green-400' },
			REJECTED: { label: 'Rechazada', color: 'bg-red-950/50 text-red-400' },
			CANCELLED: { label: 'Cancelada', color: 'bg-slate-950/50 text-slate-400' }
		};
		return labels[status] || { label: status, color: 'bg-slate-950/50 text-slate-400' };
	};

	const initiateCancel = (enrollmentId: string) => {
		enrollmentToCancel = enrollmentId;
		showCancelModal = true;
	};

	const handleCancel = () => {
		showCancelModal = false;
		enrollmentToCancel = null;
	};

	const formatDateTime = (value: string | Date | null) => {
		if (!value) return '-';

		return new Intl.DateTimeFormat('es-AR', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	};

	// Watch for form submission result
	$effect(() => {
		if (form?.success) {
			invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>Mis Inscripciones | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Inscripciones</p>
				<h1 class="mt-2 text-3xl font-bold">Mis Inscripciones</h1>
				<p class="mt-2 text-slate-400">
					{data.student.fullName} · {data.student.career}
				</p>
			</div>
			<a
				href="/alumno/inscripciones/materias"
				class="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Nueva Inscripción
			</a>
		</div>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-800 bg-red-950/30 p-5 text-red-300">
			{form.error}
		</div>
	{/if}

	<!-- Success Message -->
	{#if form?.success}
		<div class="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-emerald-500/20 p-2">
					<svg
						class="h-6 w-6 text-emerald-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<p class="font-semibold text-emerald-400">{form.message}</p>
			</div>
		</div>
	{/if}

	<!-- Mesas de examen -->
	<section class="space-y-4">
		<div class="flex items-end justify-between gap-4">
			<div>
				<p class="text-sm tracking-[0.2em] text-indigo-400 uppercase">Evaluaciones</p>
				<h2 class="mt-1 text-2xl font-bold">Inscripciones a evaluaciones</h2>
				<p class="mt-1 text-sm text-slate-400">
					Podés inscribirte durante las 72 horas habilitadas para cada instancia evaluativa.
				</p>
			</div>
		</div>

		{#if data.examTables.length === 0}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<p class="text-sm text-slate-400">
					No hay evaluaciones con inscripción disponible para tus materias.
				</p>
			</div>
		{:else}
			<div class="grid gap-4">
				{#each data.examTables as exam}
					<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
						<div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="rounded-full bg-indigo-950 px-3 py-1 text-xs font-medium text-indigo-300"
									>
										{getEvaluationTypeLabel(exam.type)}
									</span>

									{#if exam.registration?.status === 'REGISTERED'}
										<span
											class="rounded-full bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-300"
										>
											Inscripto
										</span>
									{:else if exam.registrationOpen}
										<span
											class="rounded-full bg-amber-950 px-3 py-1 text-xs font-medium text-amber-300"
										>
											Inscripción abierta
										</span>
									{:else}
										<span
											class="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400"
										>
											Inscripción cerrada
										</span>
									{/if}
								</div>

								<h3 class="mt-3 text-xl font-semibold text-white">
									{exam.subject.name}
								</h3>

								<p class="mt-1 text-sm text-slate-400">
									{exam.subject.code} · Año {exam.subject.yearLevel}
								</p>

								<p class="mt-3 font-medium text-slate-200">
									{exam.title}
								</p>

								{#if exam.description}
									<p class="mt-1 text-sm text-slate-400">
										{exam.description}
									</p>
								{/if}

								<div class="mt-5 grid gap-4 text-sm sm:grid-cols-3">
									<div>
										<p class="text-xs text-slate-500">Fecha del examen</p>
										<p class="mt-1 font-medium">
											{formatDateTime(exam.evaluationDate)}
										</p>
									</div>

									<div>
										<p class="text-xs text-slate-500">Inscripción hasta</p>
										<p class="mt-1 font-medium">
											{formatDateTime(exam.registrationClosesAt)}
										</p>
									</div>

									<div>
										<p class="text-xs text-slate-500">Docente</p>
										<p class="mt-1 font-medium">{exam.teacher}</p>
									</div>
								</div>
							</div>

							<div class="shrink-0">
								{#if exam.registration?.status === 'REGISTERED'}
									{#if exam.registrationOpen}
										<form method="POST" action="?/cancelExam" use:enhance>
											<input type="hidden" name="registrationId" value={exam.registration.id} />

											<button
												type="submit"
												class="rounded-xl border border-red-900/60 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/40"
											>
												Cancelar inscripción
											</button>
										</form>
									{:else}
										<p class="text-sm font-medium text-emerald-400">Inscripción confirmada</p>
									{/if}
								{:else if exam.registrationOpen}
									<form method="POST" action="?/registerExam" use:enhance>
										<input type="hidden" name="evaluationId" value={exam.id} />

										<button
											type="submit"
											class="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
										>
											Inscribirme
										</button>
									</form>
								{:else}
									<p class="text-sm text-slate-500">La ventana de inscripción finalizó</p>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Enrollments List -->
	{#if data.enrollments.length === 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
			<p class="text-lg text-slate-400">No tenés inscripciones registradas</p>
			<p class="mt-2 text-slate-500">
				<a href="/alumno/inscripciones/materias" class="text-indigo-400 hover:text-indigo-300">
					Inscribite a materias
				</a>
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each data.enrollments as enrollment}
				{@const status = getStatusLabel(enrollment.status)}
				<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3">
								<div>
									<h3 class="font-semibold">{enrollment.subject.name}</h3>
									<p class="text-sm text-slate-400">
										{enrollment.subject.code} · Año {enrollment.subject.yearLevel}
									</p>
								</div>
								<span class="rounded-full {status.color} px-3 py-1 text-xs">
									{status.label}
								</span>
							</div>

							<!-- Details -->
							<div class="mt-4 grid gap-4 md:grid-cols-2">
								{#if enrollment.commission}
									<div>
										<p class="text-xs text-slate-500">Comisión</p>
										<p class="text-sm font-medium">Comisión {enrollment.commission.code}</p>
										{#if enrollment.commission.schedule}
											<p class="text-sm text-slate-400">{enrollment.commission.schedule}</p>
										{/if}
									</div>
								{/if}
								{#if enrollment.commission?.teacher}
									<div>
										<p class="text-xs text-slate-500">Docente</p>
										<p class="text-sm font-medium">{enrollment.commission.teacher.name}</p>
									</div>
								{/if}
								{#if enrollment.academicTerm}
									<div>
										<p class="text-xs text-slate-500">Período</p>
										<p class="text-sm font-medium">{enrollment.academicTerm.name}</p>
										<p class="text-sm text-slate-400">{enrollment.academicTerm.year}</p>
									</div>
								{/if}
								{#if enrollment.studyPlan}
									<div>
										<p class="text-xs text-slate-500">Plan de Estudio</p>
										<p class="text-sm font-medium">{enrollment.studyPlan.name}</p>
										<p class="text-sm text-slate-400">Versión {enrollment.studyPlan.version}</p>
									</div>
								{/if}
							</div>

							<!-- Dates -->
							<div class="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
								<p>Inscripto: {new Date(enrollment.enrolledAt).toLocaleDateString('es-AR')}</p>
								{#if enrollment.confirmedAt}
									<p>Confirmado: {new Date(enrollment.confirmedAt).toLocaleDateString('es-AR')}</p>
								{/if}
								{#if enrollment.cancelledAt}
									<p>Cancelado: {new Date(enrollment.cancelledAt).toLocaleDateString('es-AR')}</p>
								{/if}
								{#if enrollment.rejectedAt}
									<p>Rechazado: {new Date(enrollment.rejectedAt).toLocaleDateString('es-AR')}</p>
								{/if}
							</div>

							<!-- Rejection/Cancellation Reason -->
							{#if enrollment.rejectionReason}
								<div class="mt-3 rounded-lg bg-red-950/30 p-3 text-sm text-red-400">
									Motivo de rechazo: {enrollment.rejectionReason}
								</div>
							{/if}
							{#if enrollment.cancellationReason}
								<div class="mt-3 rounded-lg bg-slate-950/30 p-3 text-sm text-slate-400">
									Motivo de cancelación: {enrollment.cancellationReason}
								</div>
							{/if}
						</div>

						<!-- Actions -->
						{#if enrollment.canCancel}
							<form method="POST" action="?/cancel" use:enhance>
								<input type="hidden" name="enrollmentId" value={enrollment.id} />
								<button
									type="button"
									onclick={() => initiateCancel(enrollment.id)}
									class="rounded-lg border border-red-900/50 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950/30"
								>
									Cancelar
								</button>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Cancel Confirmation Modal -->
	{#if showCancelModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
			<div class="mx-4 max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="text-xl font-bold">Cancelar Inscripción</h2>
				<p class="mt-2 text-slate-400">
					¿Estás seguro de que querés cancelar esta inscripción? Esta acción no se puede deshacer.
				</p>
				<div class="mt-6 flex gap-3">
					<button
						onclick={handleCancel}
						class="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Mantener
					</button>
					{#if enrollmentToCancel}
						<form method="POST" action="?/cancel" use:enhance onsubmit={handleCancel}>
							<input type="hidden" name="enrollmentId" value={enrollmentToCancel} />
							<button
								type="submit"
								class="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition hover:bg-red-600"
							>
								Cancelar Inscripción
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
