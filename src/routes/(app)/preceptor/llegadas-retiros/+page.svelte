<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';

	import type { ActionData, PageData } from './$types';

	type AttendanceEventTypeValue = 'LATE_ARRIVAL' | 'EARLY_DEPARTURE';

	function getInstitutionDateInputValue(date = new Date()): string {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/Argentina/Buenos_Aires',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).formatToParts(date);

		const year = parts.find((part) => part.type === 'year')?.value;
		const month = parts.find((part) => part.type === 'month')?.value;
		const day = parts.find((part) => part.type === 'day')?.value;

		if (!year || !month || !day) {
			return '';
		}

		return `${year}-${month}-${day}`;
	}

	function getInstitutionTimeInputValue(date = new Date()): string {
		const parts = new Intl.DateTimeFormat('en-GB', {
			timeZone: 'America/Argentina/Buenos_Aires',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		}).formatToParts(date);

		const hour = parts.find((part) => part.type === 'hour')?.value;
		const minute = parts.find((part) => part.type === 'minute')?.value;

		if (!hour || !minute) {
			return '';
		}

		return `${hour}:${minute}`;
	}

	function getEventTypeLabel(type: string): string {
		switch (type) {
			case 'LATE_ARRIVAL':
				return 'Llegada tarde';

			case 'EARLY_DEPARTURE':
				return 'Retiro anticipado';

			default:
				return 'Evento';
		}
	}

	function formatEventDate(value: Date | string): string {
		const date = value instanceof Date ? value : new Date(value);

		return date.toLocaleDateString('es-AR', {
			timeZone: 'UTC'
		});
	}

	let {
		data,
		form
	}: {
		data: PageData;
		form: ActionData;
	} = $props();

	let selectedStudent = $state('');
	let selectedEnrollment = $state('');
	let selectedDate = $state(getInstitutionDateInputValue());
	let selectedType = $state<AttendanceEventTypeValue>('LATE_ARRIVAL');
	let selectedTime = $state(getInstitutionTimeInputValue());
	let notes = $state('');
	let submitting = $state(false);

	let students = $derived.by(() => {
		const studentsById = new SvelteMap<string, (typeof data.enrollments)[number]['student']>();

		for (const enrollment of data.enrollments) {
			studentsById.set(enrollment.student.id, enrollment.student);
		}

		return [...studentsById.values()].sort((a, b) => {
			const lastNameComparison = a.lastName.localeCompare(b.lastName, 'es');

			if (lastNameComparison !== 0) {
				return lastNameComparison;
			}

			return a.firstName.localeCompare(b.firstName, 'es');
		});
	});

	let availableEnrollments = $derived.by(() =>
		data.enrollments.filter((enrollment) => enrollment.student.id === selectedStudent)
	);

	function handleStudentChange() {
		const matchingEnrollments = data.enrollments.filter(
			(enrollment) => enrollment.student.id === selectedStudent
		);

		selectedEnrollment = matchingEnrollments.length === 1 ? matchingEnrollments[0].id : '';
	}
</script>

<svelte:head>
	<title>Llegadas y Retiros | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>

		<h1 class="mt-2 text-3xl font-bold">Llegadas y Retiros</h1>

		<p class="mt-2 text-slate-400">
			Registrá llegadas tarde y retiros anticipados sobre inscripciones académicas activas.
		</p>
	</div>

	<form
		method="POST"
		class="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
		use:enhance={() => {
			submitting = true;

			return async ({ result, update }) => {
				try {
					await update({
						reset: false
					});

					if (result.type === 'success') {
						selectedStudent = '';
						selectedEnrollment = '';
						selectedDate = getInstitutionDateInputValue();
						selectedType = 'LATE_ARRIVAL';
						selectedTime = getInstitutionTimeInputValue();
						notes = '';
					}
				} finally {
					submitting = false;
				}
			};
		}}
	>
		{#if form?.error}
			<div class="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="rounded-xl border border-emerald-700 bg-white p-4 font-medium text-emerald-800">
				{form.success}
			</div>
		{/if}

		{#if form?.warning}
			<div class="rounded-xl border border-amber-600 bg-white p-4 font-medium text-amber-800">
				{form.warning}
			</div>
		{/if}

		{#if data.enrollments.length === 0}
			<div class="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-amber-300">
				No hay inscripciones activas disponibles dentro de tus sedes asignadas.
			</div>
		{/if}

		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="student" class="mb-2 block text-sm font-medium text-slate-300">
					Estudiante
				</label>

				<select
					id="student"
					bind:value={selectedStudent}
					onchange={handleStudentChange}
					disabled={submitting || data.enrollments.length === 0}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
					required
				>
					<option value="">Seleccionar estudiante</option>

					{#each students as student (student.id)}
						<option value={student.id}>
							{student.lastName}, {student.firstName} · DNI {student.dni}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="subjectEnrollmentId" class="mb-2 block text-sm font-medium text-slate-300">
					Materia / comisión
				</label>

				<select
					id="subjectEnrollmentId"
					name="subjectEnrollmentId"
					bind:value={selectedEnrollment}
					disabled={!selectedStudent || submitting}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
					required
				>
					<option value="">Seleccionar inscripción</option>

					{#each availableEnrollments as enrollment (enrollment.id)}
						<option value={enrollment.id}>
							{enrollment.subject.code} - {enrollment.subject.name}
							· {enrollment.commissionCode ?? 'Sin comisión'}
							· {enrollment.locationName}
						</option>
					{/each}
				</select>

				{#if selectedStudent && availableEnrollments.length === 0}
					<p class="mt-2 text-sm text-amber-400">
						El estudiante no posee inscripciones activas disponibles.
					</p>
				{/if}
			</div>
		</div>

		{#if selectedEnrollment}
			{@const enrollment = data.enrollments.find((item) => item.id === selectedEnrollment)}

			{#if enrollment}
				<div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
					<div class="grid gap-3 text-sm md:grid-cols-3">
						<div>
							<p class="text-slate-500">Carrera</p>
							<p class="mt-1 text-slate-200">{enrollment.student.career}</p>
						</div>

						<div>
							<p class="text-slate-500">Año</p>
							<p class="mt-1 text-slate-200">
								{enrollment.student.currentYear}°
							</p>
						</div>

						<div>
							<p class="text-slate-500">Sede</p>
							<p class="mt-1 text-slate-200">{enrollment.locationName}</p>
						</div>
					</div>
				</div>
			{/if}
		{/if}

		<div class="grid gap-6 md:grid-cols-3">
			<div>
				<label for="date" class="mb-2 block text-sm font-medium text-slate-300"> Fecha </label>

				<input
					id="date"
					name="date"
					type="date"
					bind:value={selectedDate}
					disabled={submitting}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500 disabled:opacity-60"
					required
				/>
			</div>

			<div>
				<label for="type" class="mb-2 block text-sm font-medium text-slate-300">
					Tipo de evento
				</label>

				<select
					id="type"
					name="type"
					bind:value={selectedType}
					disabled={submitting}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500 disabled:opacity-60"
					required
				>
					<option value="LATE_ARRIVAL"> Llegada tarde </option>

					<option value="EARLY_DEPARTURE"> Retiro anticipado </option>
				</select>
			</div>

			<div>
				<label for="time" class="mb-2 block text-sm font-medium text-slate-300"> Hora </label>

				<input
					id="time"
					name="time"
					type="time"
					bind:value={selectedTime}
					disabled={submitting}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500 disabled:opacity-60"
					required
				/>
			</div>
		</div>

		<div>
			<label for="notes" class="mb-2 block text-sm font-medium text-slate-300">
				Observaciones
			</label>

			<textarea
				id="notes"
				name="notes"
				bind:value={notes}
				rows="3"
				maxlength="500"
				disabled={submitting}
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500 disabled:opacity-60"
				placeholder="Ej.: presentó certificado, retiro autorizado por familiar..."
			></textarea>

			<p class="mt-1 text-xs text-slate-500">
				{notes.length}/500 caracteres
			</p>
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={submitting || !selectedEnrollment}
				class="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{submitting ? 'Registrando…' : 'Registrar evento'}
			</button>
		</div>
	</form>

	<section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<div class="mb-5">
			<h2 class="text-xl font-semibold">Eventos recientes</h2>

			<p class="mt-1 text-sm text-slate-400">
				Últimos registros realizados dentro de tus sedes asignadas.
			</p>
		</div>

		{#if data.recentEvents.length === 0}
			<div class="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
				Todavía no hay llegadas tarde ni retiros anticipados registrados.
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.recentEvents as event (event.id)}
					<article class="rounded-xl border border-slate-800 bg-slate-950 p-4">
						<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<p class="font-semibold text-white">
										{event.student.lastName}, {event.student.firstName}
									</p>

									<span
										class="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300"
									>
										{getEventTypeLabel(event.type)}
									</span>

									{#if event.attendanceLinked}
										<span
											class="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-400"
										>
											Asistencia vinculada
										</span>
									{/if}
								</div>

								<p class="mt-1 text-sm text-slate-400">
									DNI {event.student.dni}
								</p>

								<p class="mt-2 text-sm text-slate-300">
									{event.subject.code} - {event.subject.name}
								</p>

								<p class="mt-1 text-sm text-slate-400">
									{event.commissionCode ?? 'Sin comisión'}
									· {event.locationName}
								</p>

								{#if event.notes}
									<div class="mt-3 rounded-lg bg-slate-900 p-3">
										<p class="text-xs text-slate-500">Observaciones</p>

										<p class="mt-1 text-sm text-slate-300">
											{event.notes}
										</p>
									</div>
								{/if}
							</div>

							<div class="shrink-0 text-left md:text-right">
								<p class="text-lg font-semibold text-white">
									{event.time}
								</p>

								<p class="text-sm text-slate-400">
									{formatEventDate(event.date)}
								</p>

								<p class="mt-2 text-xs text-slate-500">
									Registró: {event.createdByName}
								</p>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<div class="flex justify-start">
		<a
			href={resolve('/preceptor')}
			class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800"
		>
			← Volver al panel
		</a>
	</div>
</div>
