<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const formatDateTime = (value: string | Date | null) => {
		if (!value) return '-';

		return new Intl.DateTimeFormat('es-AR', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	};

	$effect(() => {
		if (form?.success) {
			invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>Mesas de examen | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<header class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-indigo-400 uppercase">Evaluaciones</p>
				<h1 class="mt-2 text-3xl font-bold">Inscribirse a mesa de examen</h1>

				<p class="mt-2 text-slate-400">
					{data.student.fullName} · {data.student.career}
					{#if data.student.location}
						· {data.student.location}
					{/if}
				</p>
			</div>

			<a
				href="/alumno/inscripciones"
				class="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
			>
				Ver mis materias
			</a>
		</div>
	</header>

	{#if data.student.status !== 'ACTIVE'}
		<div class="rounded-2xl border border-amber-800 bg-amber-950/30 p-5 text-amber-200">
			Tu condición de alumno no se encuentra activa. No podés inscribirte a mesas de examen.
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-2xl border border-red-800 bg-red-950/30 p-5 text-red-300">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5 text-emerald-300">
			{form.message}
		</div>
	{/if}

	<div class="rounded-2xl border border-indigo-900/60 bg-indigo-950/20 p-5">
		<h2 class="font-semibold text-indigo-200">Mesas habilitadas para vos</h2>
		<p class="mt-1 text-sm text-slate-400">
			Solo se muestran mesas correspondientes a tu carrera, sede y materias en las que tenés una
			inscripción activa. El sistema vuelve a validar todas las condiciones al confirmar la
			inscripción.
		</p>
	</div>

	{#if data.examTables.length === 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
			<h2 class="text-lg font-semibold text-slate-200">No hay mesas disponibles</h2>
			<p class="mt-2 text-sm text-slate-400">
				En este momento no existen mesas habilitadas para tu situación académica.
			</p>
		</div>
	{:else}
		<div class="grid gap-5">
			{#each data.examTables as exam}
				<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
					<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span
									class="rounded-full bg-indigo-950 px-3 py-1 text-xs font-medium text-indigo-300"
								>
									Mesa de examen
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

							<h2 class="mt-3 text-xl font-semibold text-white">
								{exam.subject.name}
							</h2>

							<p class="mt-1 text-sm text-slate-400">
								{exam.subject.code} · Año {exam.subject.yearLevel}
							</p>

							<p class="mt-4 font-medium text-slate-200">
								{exam.title}
							</p>

							{#if exam.description}
								<p class="mt-1 text-sm text-slate-400">
									{exam.description}
								</p>
							{/if}

							<div class="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
								<div>
									<p class="text-xs text-slate-500">Fecha de examen</p>
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
									<p class="text-xs text-slate-500">Sede</p>
									<p class="mt-1 font-medium">
										{exam.location?.name ?? '-'}
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
											class="w-full rounded-xl border border-red-900/60 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/40"
										>
											Cancelar inscripción
										</button>
									</form>
								{:else}
									<p class="text-sm font-medium text-emerald-400">Inscripción confirmada</p>
								{/if}
							{:else if exam.registrationOpen && data.student.status === 'ACTIVE'}
								<form method="POST" action="?/registerExam" use:enhance>
									<input type="hidden" name="evaluationId" value={exam.id} />

									<button
										type="submit"
										class="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
									>
										Inscribirme
									</button>
								</form>
							{:else}
								<p class="text-sm text-slate-500">La inscripción no está disponible</p>
							{/if}
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
