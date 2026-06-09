<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedSubject = $state<string>('');
	let selectedCommission = $state<string>('');
	let selectedDate = $state<string>(new Date().toISOString().split('T')[0]);
	let attendanceMap = $state<Map<string, boolean>>(new Map());
	let notesMap = $state<Map<string, string>>(new Map());
	let formError = $state<string>('');
	let formSuccess = $state<string>('');
	let editingAttendance = $state<any>(null);
	let editAttendanceMap = $state<Map<string, boolean>>(new Map());
	let editNotesMap = $state<Map<string, string>>(new Map());
	let editFormError = $state<string>('');
	let editFormSuccess = $state<string>('');

	// Set default subject when data is available
	$effect(() => {
		if (data.subjects.length > 0 && !selectedSubject) {
			selectedSubject = data.subjects[0].id;
		}
	});

	// Reset commission when subject changes
	$effect(() => {
		selectedCommission = '';
	});

	// Initialize attendance map with all students present by default
	$effect(() => {
		if (data.students.length > 0) {
			const newMap = new Map<string, boolean>();
			data.students.forEach((student: any) => {
				newMap.set(student.id, true);
			});
			attendanceMap = newMap;
		}
	});

	function toggleAttendance(studentId: string) {
		attendanceMap.set(studentId, !attendanceMap.get(studentId));
	}

	function resetForm() {
		selectedDate = new Date().toISOString().split('T')[0];
		selectedCommission = '';
		attendanceMap = new Map();
		notesMap = new Map();
		data.students.forEach((student: any) => {
			attendanceMap.set(student.id, true);
		});
		formError = '';
		formSuccess = '';
	}

	function startEditAttendance(attendance: any) {
		editingAttendance = attendance;
		editAttendanceMap = new Map();
		editNotesMap = new Map();
		attendance.entries.forEach((entry: any) => {
			editAttendanceMap.set(entry.studentId, entry.present);
			editNotesMap.set(entry.studentId, entry.notes || '');
		});
		editFormError = '';
		editFormSuccess = '';
	}

	function cancelEditAttendance() {
		editingAttendance = null;
		editAttendanceMap = new Map();
		editNotesMap = new Map();
		editFormError = '';
		editFormSuccess = '';
	}

	function toggleEditAttendance(studentId: string) {
		editAttendanceMap.set(studentId, !editAttendanceMap.get(studentId));
	}

	function getEditAttendanceData() {
		return JSON.stringify(
			editingAttendance.entries.map((entry: any) => ({
				studentId: entry.studentId,
				present: editAttendanceMap.get(entry.studentId) ?? true,
				notes: editNotesMap.get(entry.studentId) || ''
			}))
		);
	}

	function getAttendanceData() {
		return JSON.stringify(
			data.students.map((student: any) => ({
				studentId: student.id,
				present: attendanceMap.get(student.id) ?? true,
				notes: notesMap.get(student.id) || ''
			}))
		);
	}

	let presentCount = $derived.by(() => {
		return Array.from(attendanceMap.values()).filter((v) => v).length;
	});

	let absentCount = $derived.by(() => {
		return data.students.length - presentCount;
	});

	// Commissions filtered by selected subject
	let availableCommissions = $derived.by(() => {
		return data.commissions?.filter((c: any) => c.subjectId === selectedSubject) || [];
	});
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-white">Registrar Asistencia</h1>
			<p class="text-slate-400">Control de presencia en tus clases</p>
		</div>

		<!-- Formulario de Asistencia -->
		<div class="mb-8">
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="mb-6 text-xl font-semibold text-white">Nueva Asistencia</h2>

				{#if formError}
					<div class="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 p-4 text-red-400">
						{formError}
					</div>
				{/if}

				{#if formSuccess}
					<div
						class="mb-4 rounded-xl border border-green-500/50 bg-green-500/20 p-4 text-green-400"
					>
						{formSuccess}
					</div>
				{/if}

				<form method="POST" class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div>
							<label for="subject" class="mb-2 block text-sm font-medium text-slate-300"
								>Materia</label
							>
							<select
								id="subject"
								name="subjectId"
								bind:value={selectedSubject}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								{#each data.subjects as subject}
									<option value={subject.id}>
										{subject.code} - {subject.name} ({subject.careers.join(', ')})
									</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="date" class="mb-2 block text-sm font-medium text-slate-300">Fecha</label>
							<input
								id="date"
								name="date"
								type="date"
								bind:value={selectedDate}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
					</div>

					{#if availableCommissions.length > 0}
						<div>
							<label for="commission" class="mb-2 block text-sm font-medium text-slate-300"
								>Comisión (opcional)</label
							>
							<select
								id="commission"
								name="commissionId"
								bind:value={selectedCommission}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="">Sin comisión</option>
								{#each availableCommissions as commission}
									<option value={commission.id}>
										{commission.code} - {commission.locationName || 'Sin localidad'}
										{commission.schedule ? `(${commission.schedule})` : ''}
									</option>
								{/each}
							</select>
						</div>
					{/if}

					<!-- Resumen de asistencia -->
					<div class="grid gap-4 md:grid-cols-2">
						<div class="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
							<p class="text-sm text-green-400">Presentes</p>
							<p class="text-2xl font-bold text-green-400">{presentCount}</p>
						</div>
						<div class="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
							<p class="text-sm text-red-400">Ausentes</p>
							<p class="text-2xl font-bold text-red-400">{absentCount}</p>
						</div>
					</div>

					<!-- Lista de estudiantes -->
					<div>
						<h3 class="mb-4 text-lg font-semibold text-white">Estudiantes</h3>
						<div class="space-y-3">
							{#each data.students as student (student.id)}
								<div
									class="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 p-4"
								>
									<div class="flex-1">
										<p class="font-medium text-white">{student.lastName}, {student.firstName}</p>
										<p class="text-sm text-slate-400">
											{student.dni} - {student.career}
											{student.currentYear}°
										</p>
									</div>
									<div class="flex items-center gap-4">
										<label class="flex cursor-pointer items-center gap-2">
											<input
												type="checkbox"
												checked={attendanceMap.get(student.id)}
												onchange={() => toggleAttendance(student.id)}
												class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-green-500 focus:ring-green-500"
											/>
											<span class="text-sm text-slate-300">Presente</span>
										</label>
										<input
											type="text"
											placeholder="Notas..."
											value={notesMap.get(student.id) || ''}
											oninput={(e) => {
												const target = e.target as HTMLInputElement;
												notesMap.set(student.id, target.value);
											}}
											class="w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white transition outline-none focus:border-slate-500"
										/>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<input type="hidden" name="attendanceData" value={getAttendanceData()} />

					<div class="flex justify-end space-x-4">
						<button
							type="button"
							onclick={resetForm}
							class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
						>
							Limpiar
						</button>
						<button
							type="submit"
							class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
						>
							Guardar Asistencia
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Asistencia Reciente -->
		<div>
			<h2 class="mb-4 text-xl font-semibold text-white">Asistencia Reciente</h2>
			<div class="space-y-4">
				{#each data.recentAttendance as attendance}
					<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
						<div class="mb-4 flex items-center justify-between">
							<div>
								<p class="font-semibold text-white">{attendance.subject}</p>
								<p class="text-sm text-slate-400">
									{new Date(attendance.date).toLocaleDateString()}
								</p>
							</div>
							<div class="flex items-center gap-4">
								<div class="flex gap-4">
									<div class="text-center">
										<p class="text-sm text-green-400">Presentes</p>
										<p class="text-xl font-bold text-green-400">{attendance.presentStudents}</p>
									</div>
									<div class="text-center">
										<p class="text-sm text-red-400">Ausentes</p>
										<p class="text-xl font-bold text-red-400">
											{attendance.totalStudents - attendance.presentStudents}
										</p>
									</div>
								</div>
								<button
									onclick={() => startEditAttendance(attendance)}
									class="rounded-xl bg-blue-500/20 px-4 py-2 text-blue-400 transition-colors hover:bg-blue-500/30"
								>
									Editar
								</button>
							</div>
						</div>
						<div class="max-h-48 overflow-y-auto">
							<table class="w-full">
								<thead class="bg-slate-800">
									<tr>
										<th class="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase"
											>Alumno</th
										>
										<th class="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase"
											>Estado</th
										>
										<th class="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase"
											>Notas</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-800">
									{#each attendance.entries as entry}
										<tr class="hover:bg-slate-800/50">
											<td class="px-4 py-2 text-sm text-white">{entry.studentName}</td>
											<td class="px-4 py-2 text-sm">
												{#if entry.present}
													<span
														class="rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-400"
														>Presente</span
													>
												{:else}
													<span
														class="rounded-full bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-400"
														>Ausente</span
													>
												{/if}
											</td>
											<td class="px-4 py-2 text-sm text-slate-300">{entry.notes || '-'}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/each}
				{#if data.recentAttendance.length === 0}
					<div
						class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400"
					>
						No hay registros de asistencia aún
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal de Edición de Asistencia -->
{#if editingAttendance}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div
			class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-8"
		>
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold text-white">Editar Asistencia</h2>
					<p class="text-sm text-slate-400">
						{editingAttendance.subject} - {new Date(editingAttendance.date).toLocaleDateString()}
					</p>
				</div>
				<button
					onclick={cancelEditAttendance}
					class="rounded-xl bg-slate-800 px-4 py-2 text-slate-400 transition-colors hover:bg-slate-700"
				>
					Cancelar
				</button>
			</div>

			{#if editFormError}
				<div class="mb-4 rounded-xl border border-red-500/50 bg-red-500/20 p-4 text-red-400">
					{editFormError}
				</div>
			{/if}

			{#if editFormSuccess}
				<div class="mb-4 rounded-xl border border-green-500/50 bg-green-500/20 p-4 text-green-400">
					{editFormSuccess}
				</div>
			{/if}

			<form method="POST" action="?/editAttendance" class="space-y-6">
				<input type="hidden" name="attendanceId" value={editingAttendance.id} />
				<input type="hidden" name="attendanceData" value={getEditAttendanceData()} />

				<!-- Lista de estudiantes para editar -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">Estudiantes</h3>
					<div class="space-y-3">
						{#each editingAttendance.entries as entry (entry.studentId)}
							<div
								class="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 p-4"
							>
								<div class="flex-1">
									<p class="font-medium text-white">{entry.studentName}</p>
									<p class="text-sm text-slate-400">{entry.studentDni}</p>
								</div>
								<div class="flex items-center gap-4">
									<label class="flex cursor-pointer items-center gap-2">
										<input
											type="checkbox"
											checked={editAttendanceMap.get(entry.studentId)}
											onchange={() => toggleEditAttendance(entry.studentId)}
											class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-green-500 focus:ring-green-500"
										/>
										<span class="text-sm text-slate-300">Presente</span>
									</label>
									<input
										type="text"
										placeholder="Notas..."
										value={editNotesMap.get(entry.studentId) || ''}
										oninput={(e) => {
											const target = e.target as HTMLInputElement;
											editNotesMap.set(entry.studentId, target.value);
										}}
										class="w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white transition outline-none focus:border-slate-500"
									/>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="flex justify-end space-x-4">
					<button
						type="button"
						onclick={cancelEditAttendance}
						class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-2xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
					>
						Guardar Cambios
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
