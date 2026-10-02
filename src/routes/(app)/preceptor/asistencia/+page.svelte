<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	const NO_COMMISSION = '__NO_COMMISSION__';

	type AttendanceDraft = {
		studentId: string;
		present: boolean;
		notes?: string;
	};

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

	let {
		data,
		form
	}: {
		data: PageData;
		form: ActionData;
	} = $props();

	let selectedSubject = $state('');
	let selectedCommission = $state('');
	let selectedLocation = $state('');
	let selectedDate = $state(getInstitutionDateInputValue());
	let attendanceData = $state<AttendanceDraft[]>([]);
	let submitting = $state(false);

	let availableCommissions = $derived.by(() =>
		data.commissions.filter((commission) => commission.subjectId === selectedSubject)
	);

	let hasUnassignedEnrollments = $derived(
		data.enrollments.some(
			(enrollment) => enrollment.subjectId === selectedSubject && enrollment.commissionId === null
		)
	);

	let availableNoCommissionLocations = $derived.by(() => {
		const locations = new SvelteMap<string, string>();

		for (const enrollment of data.enrollments) {
			if (
				enrollment.subjectId !== selectedSubject ||
				enrollment.commissionId !== null ||
				!enrollment.student.locationId
			) {
				continue;
			}

			locations.set(enrollment.student.locationId, enrollment.student.locationName);
		}

		return [...locations.entries()]
			.map(([id, name]) => ({ id, name }))
			.sort((a, b) => a.name.localeCompare(b.name, 'es'));
	});

	let availableStudents = $derived.by(() => {
		if (!selectedSubject || !selectedCommission) {
			return [];
		}

		const commissionId = selectedCommission === NO_COMMISSION ? null : selectedCommission;

		if (commissionId === null && !selectedLocation) {
			return [];
		}

		const students = new SvelteMap<string, (typeof data.enrollments)[number]['student']>();

		for (const enrollment of data.enrollments) {
			if (enrollment.subjectId !== selectedSubject || enrollment.commissionId !== commissionId) {
				continue;
			}

			if (commissionId === null && enrollment.student.locationId !== selectedLocation) {
				continue;
			}

			students.set(enrollment.student.id, enrollment.student);
		}

		return [...students.values()].sort((a, b) => {
			const lastNameComparison = a.lastName.localeCompare(b.lastName, 'es');

			if (lastNameComparison !== 0) {
				return lastNameComparison;
			}

			return a.firstName.localeCompare(b.firstName, 'es');
		});
	});

	function syncAttendanceData() {
		const commissionId = selectedCommission === NO_COMMISSION ? null : selectedCommission;

		if (commissionId === null && !selectedLocation) {
			attendanceData = [];
			return;
		}

		const students = new SvelteMap<string, (typeof data.enrollments)[number]['student']>();

		for (const enrollment of data.enrollments) {
			if (enrollment.subjectId !== selectedSubject || enrollment.commissionId !== commissionId) {
				continue;
			}

			if (commissionId === null && enrollment.student.locationId !== selectedLocation) {
				continue;
			}

			students.set(enrollment.student.id, enrollment.student);
		}

		attendanceData = [...students.values()].map((student) => ({
			studentId: student.id,
			present: true,
			notes: ''
		}));
	}

	function handleSubjectChange() {
		selectedLocation = '';

		const subjectCommissions = data.commissions.filter(
			(commission) => commission.subjectId === selectedSubject
		);

		const hasUnassigned = data.enrollments.some(
			(enrollment) => enrollment.subjectId === selectedSubject && enrollment.commissionId === null
		);

		if (subjectCommissions.length === 1 && !hasUnassigned) {
			selectedCommission = subjectCommissions[0].id;
		} else if (subjectCommissions.length === 0 && hasUnassigned) {
			selectedCommission = NO_COMMISSION;
		} else {
			selectedCommission = '';
		}

		syncAttendanceData();
	}

	function handleCommissionChange() {
		selectedLocation = '';
		syncAttendanceData();
	}

	function handleLocationChange() {
		syncAttendanceData();
	}

	function toggleAttendance(studentId: string) {
		const entry = attendanceData.find((item) => item.studentId === studentId);

		if (entry) {
			entry.present = !entry.present;
		}
	}

	function updateNotes(studentId: string, notes: string) {
		const entry = attendanceData.find((item) => item.studentId === studentId);

		if (entry) {
			entry.notes = notes;
		}
	}

	function markAllPresent() {
		for (const entry of attendanceData) {
			entry.present = true;
		}
	}

	function markAllAbsent() {
		for (const entry of attendanceData) {
			entry.present = false;
		}
	}

	function studentFor(studentId: string) {
		return availableStudents.find((student) => student.id === studentId);
	}
</script>

<svelte:head>
	<title>Registro de Asistencia | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>

		<h1 class="mt-2 text-3xl font-bold">Registro de Asistencia</h1>

		<p class="mt-2 text-slate-400">
			Registrar asistencia de estudiantes según su inscripción activa
		</p>
	</div>

	<form
		method="POST"
		class="space-y-6"
		use:enhance={() => {
			submitting = true;

			return async ({ result, update }) => {
				try {
					await update({
						reset: false
					});

					if (result.type === 'success') {
						selectedSubject = '';
						selectedCommission = '';
						selectedLocation = '';
						selectedDate = getInstitutionDateInputValue();
						attendanceData = [];
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

		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<label for="subjectId" class="mb-2 block text-sm font-medium text-slate-300">
						Materia
					</label>

					<select
						id="subjectId"
						name="subjectId"
						bind:value={selectedSubject}
						onchange={handleSubjectChange}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
						disabled={submitting}
					>
						<option value=""> Seleccionar materia </option>

						{#each data.subjects as subject (subject.id)}
							<option value={subject.id}>
								{subject.code} - {subject.name}
								({subject.yearLevel}° Año)
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="date" class="mb-2 block text-sm font-medium text-slate-300"> Fecha </label>

					<input
						id="date"
						name="date"
						type="date"
						bind:value={selectedDate}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
						disabled={submitting}
					/>
				</div>
			</div>

			{#if selectedSubject}
				<div class="mt-4">
					<label for="commissionId" class="mb-2 block text-sm font-medium text-slate-300">
						Comisión
					</label>

					<select
						id="commissionId"
						name="commissionId"
						bind:value={selectedCommission}
						onchange={handleCommissionChange}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
						disabled={submitting}
					>
						<option value=""> Seleccionar comisión </option>

						{#if hasUnassignedEnrollments}
							<option value={NO_COMMISSION}> Sin comisión asignada </option>
						{/if}

						{#each availableCommissions as commission (commission.id)}
							<option value={commission.id}>
								{commission.code}
								-
								{commission.locationName ?? 'Sin sede'}
								{commission.schedule ? ` (${commission.schedule})` : ''}
							</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if selectedCommission === NO_COMMISSION}
				<div class="mt-4">
					<label for="locationId" class="mb-2 block text-sm font-medium text-slate-300">
						Sede
					</label>

					<select
						id="locationId"
						name="locationId"
						bind:value={selectedLocation}
						onchange={handleLocationChange}
						disabled={submitting}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500 disabled:opacity-60"
						required
					>
						<option value="">Seleccionar sede</option>

						{#each availableNoCommissionLocations as location (location.id)}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>

					<p class="mt-2 text-xs text-slate-500">
						La sede define qué alumnos sin comisión forman parte de este registro.
					</p>
				</div>
			{/if}

			{#if selectedCommission && (selectedCommission !== NO_COMMISSION || selectedLocation) && attendanceData.length > 0}
				<div class="mt-4 flex flex-wrap gap-3">
					<button
						type="button"
						onclick={markAllPresent}
						disabled={submitting}
						class="rounded-xl border border-emerald-600/60 bg-transparent px-4 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-50 dark:border-emerald-500/60 dark:text-emerald-400 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
					>
						Marcar todos presentes
					</button>

					<button
						type="button"
						onclick={markAllAbsent}
						disabled={submitting}
						class="rounded-xl border border-red-600/60 bg-transparent px-4 py-2 text-sm font-medium text-red-700 transition hover:border-red-700 hover:text-red-800 disabled:opacity-50 dark:border-red-500/60 dark:text-red-400 dark:hover:border-red-400 dark:hover:text-red-300"
					>
						Marcar todos ausentes
					</button>
				</div>
			{/if}
		</div>

		{#if selectedSubject && selectedCommission && (selectedCommission !== NO_COMMISSION || selectedLocation)}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<div class="mb-4 flex items-center justify-between gap-4">
					<h2 class="text-xl font-semibold">Estudiantes</h2>

					<span class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
						{attendanceData.length}
					</span>
				</div>

				<div class="space-y-4">
					{#each attendanceData as entry (entry.studentId)}
						{@const student = studentFor(entry.studentId)}

						{#if student}
							<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1">
										<p class="font-semibold text-white">
											{student.lastName},
											{student.firstName}
										</p>

										<p class="text-sm text-slate-400">
											DNI: {student.dni}
										</p>

										<p class="text-xs text-slate-500">
											{student.career}
										</p>
									</div>

									<label class="flex cursor-pointer items-center gap-2">
										<input
											type="checkbox"
											checked={entry.present}
											onchange={() => toggleAttendance(entry.studentId)}
											disabled={submitting}
											class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
										/>

										<span class="text-sm text-slate-300">
											{entry.present ? 'Presente' : 'Ausente'}
										</span>
									</label>
								</div>

								<div class="mt-3">
									<input
										type="text"
										placeholder="Notas (opcional)..."
										value={entry.notes}
										maxlength="500"
										oninput={(event) => {
											const target = event.target as HTMLInputElement;

											updateNotes(entry.studentId, target.value);
										}}
										disabled={submitting}
										class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm transition outline-none focus:border-slate-500"
									/>
								</div>
							</div>
						{/if}
					{/each}

					{#if attendanceData.length === 0}
						<div class="rounded-xl border border-slate-800 p-8 text-center">
							<p class="text-slate-400">
								No hay alumnos activos inscriptos en esta materia y comisión.
							</p>
						</div>
					{/if}
				</div>

				<input type="hidden" name="attendanceData" value={JSON.stringify(attendanceData)} />

				<div class="mt-6 flex justify-end">
					<button
						type="submit"
						disabled={submitting || attendanceData.length === 0}
						class="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
					>
						{submitting ? 'Guardando...' : 'Guardar Asistencia'}
					</button>
				</div>
			</div>
		{/if}
	</form>

	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Registros Recientes</h2>

		<div class="space-y-3">
			{#each data.recentAttendance as record (record.id)}
				<div
					class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
				>
					<div>
						<p class="font-semibold text-white">
							{record.subject}
						</p>

						{#if record.commissionCode}
							<p class="text-xs text-slate-400">
								Comisión:
								{record.commissionCode}
							</p>
						{/if}

						<p class="text-xs text-slate-500">
							{new Date(record.date).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
						</p>
					</div>

					<div class="text-right">
						<p class="text-sm text-slate-400">
							{record.presentStudents}/{record.totalStudents}
							presentes
						</p>

						<p class="text-xs text-emerald-600 dark:text-emerald-400">
							{record.totalStudents > 0
								? Math.round((record.presentStudents / record.totalStudents) * 100)
								: 0}% asistencia
						</p>
					</div>
				</div>
			{/each}

			{#if data.recentAttendance.length === 0}
				<p class="text-center text-slate-400">
					No hay registros recientes dentro de tus sedes asignadas.
				</p>
			{/if}
		</div>
	</div>

	<div class="flex justify-start">
		<a
			href={resolve('/preceptor')}
			class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800"
		>
			← Volver al panel
		</a>
	</div>
</div>
