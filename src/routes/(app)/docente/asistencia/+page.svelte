<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let {
		data,
		form
	}: {
		data: PageData;
		form: ActionData;
	} = $props();

	type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';

	let selectedSubject = $state('');
	let selectedCommission = $state('');
	let selectedSchedule = $state('');

	let selectedDate = $state(
		new Intl.DateTimeFormat('en-CA', {
			timeZone: 'America/Argentina/Buenos_Aires'
		}).format(new Date())
	);

	let statuses = $state<Record<string, AttendanceStatus>>({});
	let notes = $state<Record<string, string>>({});

	let editingAttendance = $state<any>(null);
	let editStatuses = $state<Record<string, AttendanceStatus>>({});
	let editNotes = $state<Record<string, string>>({});

	const dayLabels: Record<string, string> = {
		MONDAY: 'Lunes',
		TUESDAY: 'Martes',
		WEDNESDAY: 'Miércoles',
		THURSDAY: 'Jueves',
		FRIDAY: 'Viernes',
		SATURDAY: 'Sábado',
		SUNDAY: 'Domingo'
	};

	const statusLabels: Record<AttendanceStatus, string> = {
		PRESENT: 'Presente',
		ABSENT: 'Ausente',
		LATE: 'Tarde',
		JUSTIFIED: 'Justificada'
	};

	let availableCommissions = $derived.by(() => {
		return data.commissions.filter((commission) => commission.subjectId === selectedSubject);
	});

	let availableSchedules = $derived.by(() => {
		return data.schedules.filter(
			(schedule) =>
				schedule.subjectId === selectedSubject && schedule.commissionId === selectedCommission
		);
	});

	let currentStudents = $derived.by(() => {
		if (!selectedCommission) return [];

		return (
			data.studentsByCommission[selectedCommission as keyof typeof data.studentsByCommission] ?? []
		);
	});

	let presentCount = $derived.by(
		() =>
			currentStudents.filter((student: any) => (statuses[student.id] ?? 'PRESENT') === 'PRESENT')
				.length
	);

	let lateCount = $derived.by(
		() => currentStudents.filter((student: any) => statuses[student.id] === 'LATE').length
	);

	let absentCount = $derived.by(
		() => currentStudents.filter((student: any) => statuses[student.id] === 'ABSENT').length
	);

	let justifiedCount = $derived.by(
		() => currentStudents.filter((student: any) => statuses[student.id] === 'JUSTIFIED').length
	);

	function changeSubject() {
		selectedCommission = '';
		selectedSchedule = '';
		statuses = {};
		notes = {};
	}

	function changeCommission() {
		selectedSchedule = '';

		const students =
			data.studentsByCommission[selectedCommission as keyof typeof data.studentsByCommission] ?? [];

		statuses = Object.fromEntries(students.map((student: any) => [student.id, 'PRESENT']));

		notes = Object.fromEntries(students.map((student: any) => [student.id, '']));
	}

	function setAll(status: AttendanceStatus) {
		const next = { ...statuses };

		for (const student of currentStudents) {
			next[student.id] = status;
		}

		statuses = next;
	}

	function attendanceData() {
		return JSON.stringify(
			currentStudents.map((student: any) => ({
				studentId: student.id,
				status: statuses[student.id] ?? 'PRESENT',
				notes: notes[student.id] ?? ''
			}))
		);
	}

	function startEdit(record: any) {
		editingAttendance = record;

		editStatuses = Object.fromEntries(
			record.entries.map((entry: any) => [entry.studentId, entry.status])
		);

		editNotes = Object.fromEntries(
			record.entries.map((entry: any) => [entry.studentId, entry.notes ?? ''])
		);
	}

	function editAttendanceData() {
		if (!editingAttendance) return '[]';

		return JSON.stringify(
			editingAttendance.entries.map((entry: any) => ({
				studentId: entry.studentId,
				status: editStatuses[entry.studentId] ?? entry.status,
				notes: editNotes[entry.studentId] ?? entry.notes ?? ''
			}))
		);
	}
</script>

<svelte:head>
	<title>Asistencia | Docente</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<header class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Docente</p>
		<h1 class="mt-2 text-3xl font-bold">Asistencia por materia</h1>
		<p class="mt-2 text-slate-400">Seleccioná la materia, comisión y clase programada.</p>
	</header>

	{#if form?.error}
		<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
			{form.success}
		</div>
	{/if}

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<form method="POST" class="space-y-6">
			<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
				<div>
					<label for="subjectId" class="mb-2 block text-sm font-medium text-slate-300">
						Materia
					</label>

					<select
						id="subjectId"
						name="subjectId"
						bind:value={selectedSubject}
						onchange={changeSubject}
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
					>
						<option value=""> Seleccionar materia... </option>

						{#each data.subjects as subject}
							<option value={subject.id}>
								{subject.code} - {subject.name}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="commissionId" class="mb-2 block text-sm font-medium text-slate-300">
						Comisión
					</label>

					<select
						id="commissionId"
						name="commissionId"
						bind:value={selectedCommission}
						onchange={changeCommission}
						disabled={!selectedSubject}
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500 disabled:opacity-50"
					>
						<option value=""> Seleccionar comisión... </option>

						{#each availableCommissions as commission}
							<option value={commission.id}>
								{commission.code}
								{commission.career ? ` · ${commission.career}` : ''}
								{commission.location ? ` · ${commission.location}` : ''}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="classScheduleId" class="mb-2 block text-sm font-medium text-slate-300">
						Clase programada
					</label>

					<select
						id="classScheduleId"
						name="classScheduleId"
						bind:value={selectedSchedule}
						disabled={!selectedCommission}
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500 disabled:opacity-50"
					>
						<option value=""> Seleccionar horario... </option>

						{#each availableSchedules as schedule}
							<option value={schedule.id}>
								{dayLabels[schedule.dayOfWeek]}
								· {schedule.startTime} - {schedule.endTime}
								{schedule.classroom ? ` · ${schedule.classroom}` : ''}
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
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
					/>
				</div>
			</div>

			{#if selectedCommission && currentStudents.length > 0}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
						<p class="text-sm text-emerald-300">Presentes</p>
						<p class="mt-1 text-2xl font-bold">
							{presentCount}
						</p>
					</div>

					<div class="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
						<p class="text-sm text-amber-300">Tarde</p>
						<p class="mt-1 text-2xl font-bold">
							{lateCount}
						</p>
					</div>

					<div class="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
						<p class="text-sm text-red-300">Ausentes</p>
						<p class="mt-1 text-2xl font-bold">
							{absentCount}
						</p>
					</div>

					<div class="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
						<p class="text-sm text-blue-300">Justificadas</p>
						<p class="mt-1 text-2xl font-bold">
							{justifiedCount}
						</p>
					</div>
				</div>

				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						onclick={() => setAll('PRESENT')}
						class="rounded-xl border border-emerald-500/30 px-4 py-2 text-sm text-emerald-300"
					>
						Todos presentes
					</button>

					<button
						type="button"
						onclick={() => setAll('ABSENT')}
						class="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300"
					>
						Todos ausentes
					</button>
				</div>

				<div class="overflow-hidden rounded-2xl border border-slate-800">
					<div class="border-b border-slate-800 bg-slate-950 px-5 py-4">
						<h2 class="font-semibold">Alumnos de la comisión</h2>
						<p class="mt-1 text-sm text-slate-400">
							{currentStudents.length} alumnos activos
						</p>
					</div>

					<div class="divide-y divide-slate-800">
						{#each currentStudents as student}
							<div class="grid gap-4 p-4 lg:grid-cols-[1fr_220px_1fr] lg:items-center">
								<div>
									<p class="font-medium">
										{student.lastName},
										{student.firstName}
									</p>
									<p class="mt-1 text-sm text-slate-500">
										DNI {student.dni} · {student.career}
									</p>
								</div>

								<select
									value={statuses[student.id] ?? 'PRESENT'}
									onchange={(event) => {
										statuses = {
											...statuses,
											[student.id]: (event.currentTarget as HTMLSelectElement)
												.value as AttendanceStatus
										};
									}}
									class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500"
								>
									<option value="PRESENT"> Presente </option>
									<option value="ABSENT"> Ausente </option>
									<option value="LATE"> Tarde </option>
									<option value="JUSTIFIED"> Justificada </option>
								</select>

								<input
									type="text"
									placeholder="Observación opcional..."
									value={notes[student.id] ?? ''}
									oninput={(event) => {
										notes = {
											...notes,
											[student.id]: (event.currentTarget as HTMLInputElement).value
										};
									}}
									class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500"
								/>
							</div>
						{/each}
					</div>
				</div>

				<input type="hidden" name="attendanceData" value={attendanceData()} />

				<div class="flex justify-end">
					<button
						type="submit"
						disabled={!selectedSchedule}
						class="rounded-2xl bg-white px-7 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:opacity-40"
					>
						Guardar asistencia
					</button>
				</div>
			{:else if selectedCommission}
				<div class="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-200">
					Esta comisión no tiene alumnos con inscripción activa.
				</div>
			{/if}
		</form>
	</section>

	<section class="space-y-4">
		<div>
			<h2 class="text-xl font-semibold">Asistencias recientes</h2>
			<p class="text-sm text-slate-400">Historial registrado por este docente.</p>
		</div>

		{#each data.recentAttendance as record}
			<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<p class="font-semibold">
							{record.subject}
						</p>
						<p class="mt-1 text-sm text-slate-400">
							{record.commission ? `Comisión ${record.commission} · ` : ''}
							{new Date(record.date).toLocaleDateString('es-AR')}
							{record.startTime ? ` · ${record.startTime} - ${record.endTime}` : ''}
						</p>
					</div>

					<div class="flex flex-wrap gap-2 text-xs">
						<span class="rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-300">
							{record.presentStudents} presentes
						</span>
						<span class="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-300">
							{record.lateStudents} tarde
						</span>
						<span class="rounded-lg bg-red-500/10 px-3 py-2 text-red-300">
							{record.absentStudents} ausentes
						</span>
						<span class="rounded-lg bg-blue-500/10 px-3 py-2 text-blue-300">
							{record.justifiedStudents} justificadas
						</span>
					</div>
				</div>

				<div class="mt-4 flex justify-end">
					<button
						type="button"
						onclick={() => startEdit(record)}
						class="rounded-xl border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
					>
						Editar
					</button>
				</div>
			</article>
		{/each}

		{#if data.recentAttendance.length === 0}
			<div
				class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400"
			>
				No hay asistencias registradas todavía.
			</div>
		{/if}
	</section>
</div>

{#if editingAttendance}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
		<div
			class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6"
		>
			<div class="mb-6 flex items-start justify-between gap-4">
				<div>
					<h2 class="text-2xl font-bold">Editar asistencia</h2>
					<p class="mt-1 text-sm text-slate-400">
						{editingAttendance.subject} ·
						{new Date(editingAttendance.date).toLocaleDateString('es-AR')}
					</p>
				</div>

				<button
					type="button"
					onclick={() => (editingAttendance = null)}
					class="rounded-xl border border-slate-700 px-4 py-2"
				>
					Cerrar
				</button>
			</div>

			<form method="POST" action="?/editAttendance" class="space-y-5">
				<input type="hidden" name="attendanceId" value={editingAttendance.id} />

				<input type="hidden" name="attendanceData" value={editAttendanceData()} />

				<div class="divide-y divide-slate-800 rounded-2xl border border-slate-800">
					{#each editingAttendance.entries as entry}
						<div class="grid gap-4 p-4 lg:grid-cols-[1fr_220px_1fr] lg:items-center">
							<div>
								<p class="font-medium">
									{entry.studentName}
								</p>
								<p class="text-sm text-slate-500">
									DNI {entry.studentDni}
								</p>
							</div>

							<select
								value={editStatuses[entry.studentId]}
								onchange={(event) => {
									editStatuses = {
										...editStatuses,
										[entry.studentId]: (event.currentTarget as HTMLSelectElement)
											.value as AttendanceStatus
									};
								}}
								class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
							>
								{#each Object.entries(statusLabels) as [value, label]}
									<option {value}>
										{label}
									</option>
								{/each}
							</select>

							<input
								type="text"
								value={editNotes[entry.studentId] ?? ''}
								oninput={(event) => {
									editNotes = {
										...editNotes,
										[entry.studentId]: (event.currentTarget as HTMLInputElement).value
									};
								}}
								placeholder="Observación..."
								class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
							/>
						</div>
					{/each}
				</div>

				<div class="flex justify-end">
					<button type="submit" class="rounded-xl bg-blue-500 px-6 py-3 font-semibold">
						Guardar cambios
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
