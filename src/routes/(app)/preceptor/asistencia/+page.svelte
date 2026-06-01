<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let selectedCommission = $state('');
	let selectedDate = $state(new Date().toISOString().split('T')[0]);
	let attendanceData = $state<Array<{ studentId: string; present: boolean; notes?: string }>>([]);

	// Inicializar datos de asistencia cuando se selecciona una comisión
	$effect(() => {
		if (selectedCommission) {
			attendanceData = data.students.map(s => ({
				studentId: s.id,
				present: true,
				notes: ''
			}));
		}
	});

	function toggleAttendance(studentId: string) {
		const entry = attendanceData.find(e => e.studentId === studentId);
		if (entry) {
			entry.present = !entry.present;
		}
	}

	function updateNotes(studentId: string, notes: string) {
		const entry = attendanceData.find(e => e.studentId === studentId);
		if (entry) {
			entry.notes = notes;
		}
	}

	function markAllPresent() {
		attendanceData.forEach(e => e.present = true);
	}

	function markAllAbsent() {
		attendanceData.forEach(e => e.present = false);
	}
</script>

<svelte:head>
	<title>Registro de Asistencia | Preceptor</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Preceptor</p>
		<h1 class="mt-2 text-3xl font-bold">Registro de Asistencia</h1>
		<p class="mt-2 text-slate-400">Registrar asistencia de estudiantes</p>
	</div>

	<!-- Formulario -->
	<form
		method="POST"
		class="space-y-6"
		use:enhance={() => {
			if (form?.success) {
				selectedCommission = '';
				attendanceData = [];
			}
		}}
	>
		{#if form?.error}
			<div class="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-emerald-400">
				{form.success}
			</div>
		{/if}

		<!-- Selección de Comisión y Fecha -->
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<label for="commissionId" class="mb-2 block text-sm font-medium text-slate-300">Comisión</label>
					<select
						id="commissionId"
						name="commissionId"
						bind:value={selectedCommission}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
					>
						<option value="">Seleccionar comisión</option>
						{#each data.commissions as commission}
							<option value={commission.id}>
								{commission.name} - {commission.subject.name}
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
						required
					/>
				</div>
			</div>

			{#if selectedCommission}
				<div class="mt-4 flex gap-4">
					<button
						type="button"
						onclick={markAllPresent}
						class="rounded-xl bg-emerald-950/50 px-4 py-2 text-sm text-emerald-400 transition hover:bg-emerald-950/70"
					>
						Marcar todos presentes
					</button>
					<button
						type="button"
						onclick={markAllAbsent}
						class="rounded-xl bg-red-950/50 px-4 py-2 text-sm text-red-400 transition hover:bg-red-950/70"
					>
						Marcar todos ausentes
					</button>
				</div>
			{/if}
		</div>

		<!-- Lista de Estudiantes -->
		{#if selectedCommission}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<h2 class="mb-4 text-xl font-semibold">Estudiantes</h2>
				<div class="space-y-4">
					{#each attendanceData as entry}
						<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<p class="font-semibold text-white">
										{data.students.find(s => s.id === entry.studentId)?.lastName}, 
										{data.students.find(s => s.id === entry.studentId)?.firstName}
									</p>
									<p class="text-sm text-slate-400">
										DNI: {data.students.find(s => s.id === entry.studentId)?.dni}
									</p>
								</div>
								<div class="flex items-center gap-4">
									<label class="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={entry.present}
											onchange={() => toggleAttendance(entry.studentId)}
											class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
										/>
										<span class="text-sm text-slate-300">
											{entry.present ? 'Presente' : 'Ausente'}
										</span>
									</label>
								</div>
							</div>
							<div class="mt-3">
								<input
									type="text"
									placeholder="Notas (opcional)..."
									value={entry.notes}
									oninput={(e) => {
										const target = e.target as HTMLInputElement;
										updateNotes(entry.studentId, target.value);
									}}
									class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm transition outline-none focus:border-slate-500"
								/>
							</div>
						</div>
					{/each}
				</div>

				<input type="hidden" name="attendanceData" value={JSON.stringify(attendanceData)} />

				<div class="mt-6 flex justify-end">
					<button
						type="submit"
						class="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
					>
						Guardar Asistencia
					</button>
				</div>
			</div>
		{/if}
	</form>

	<!-- Registros Recientes -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<h2 class="mb-4 text-xl font-semibold">Registros Recientes</h2>
		<div class="space-y-3">
			{#each data.recentAttendance as record}
				<div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
					<div>
						<p class="font-semibold text-white">{record.commission}</p>
						<p class="text-sm text-slate-400">{record.subject}</p>
						<p class="text-xs text-slate-500">{new Date(record.date).toLocaleDateString('es-AR')}</p>
					</div>
					<div class="text-right">
						<p class="text-sm text-slate-400">
							{record.presentStudents}/{record.totalStudents} presentes
						</p>
						<p class="text-xs text-emerald-400">
							{Math.round((record.presentStudents / record.totalStudents) * 100)}% asistencia
						</p>
					</div>
				</div>
			{/each}
			{#if data.recentAttendance.length === 0}
				<p class="text-center text-slate-400">No hay registros recientes</p>
			{/if}
		</div>
	</div>

	<div class="flex justify-start">
		<a href="/preceptor" class="rounded-2xl border border-slate-700 px-6 py-3 transition hover:bg-slate-800">
			← Volver al panel
		</a>
	</div>
</div>
