<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { WeekDay } from '@prisma/client';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const locations = $derived(data?.locations ?? []);
	const careers = $derived(data?.careers ?? []);
	const teachers = $derived(data?.teachers ?? []);

	let selectedLocation = $state('');
	let selectedCareer = $state('');
	let selectedSubject = $state('');
	let selectedCommission = $state('');
	let selectedTeacher = $state('');
	let selectedYear = $state(1);
	let selectedDay = $state('');
	let startTime = $state('');
	let endTime = $state('');
	let classroom = $state('');
	let observations = $state('');
	let active = $state(true);

	const yearLevels = [1, 2, 3, 4, 5, 6, 7];
	const days = [
		{ value: WeekDay.MONDAY, label: 'Lunes' },
		{ value: WeekDay.TUESDAY, label: 'Martes' },
		{ value: WeekDay.WEDNESDAY, label: 'Miércoles' },
		{ value: WeekDay.THURSDAY, label: 'Jueves' },
		{ value: WeekDay.FRIDAY, label: 'Viernes' },
		{ value: WeekDay.SATURDAY, label: 'Sábado' },
		{ value: WeekDay.SUNDAY, label: 'Domingo' }
	];

	// Fetch subjects when career is selected
	let subjects = $state<any[]>([]);

	async function fetchSubjects() {
		if (selectedCareer) {
			const response = await fetch(
				`/api/schedules/subjects?careerId=${selectedCareer}&yearLevel=${selectedYear}`
			);
			if (response.ok) {
				subjects = await response.json();
			}
		} else {
			subjects = [];
		}
	}

	$effect(() => {
		fetchSubjects();
	});

	// Fetch commissions when subject is selected
	let commissions = $state<any[]>([]);

	async function fetchCommissions() {
		if (selectedSubject) {
			const response = await fetch(`/api/schedules/commissions?subjectId=${selectedSubject}`);
			if (response.ok) {
				commissions = await response.json();
			}
		} else {
			commissions = [];
		}
	}

	$effect(() => {
		fetchCommissions();
	});
</script>

<svelte:head>
	<title>Nuevo Horario | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">
				Sistema / Configuración / Horarios
			</p>
			<h1 class="text-3xl font-bold">Nuevo Horario</h1>
		</div>
		<a
			href="/configuracion/horarios"
			class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
		>
			Volver
		</a>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
			{form.error}
		</div>
	{/if}

	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<form method="POST" use:enhance class="space-y-6">
			<div class="grid gap-6 md:grid-cols-2">
				<!-- Localidad -->
				<div>
					<label for="locationId" class="mb-1 block text-sm text-slate-400">Localidad</label>
					<select
						id="locationId"
						name="locationId"
						bind:value={selectedLocation}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value="">Seleccionar localidad</option>
						{#each locations as location}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>
				</div>

				<!-- Carrera -->
				<div>
					<label for="careerId" class="mb-1 block text-sm text-slate-400">Carrera *</label>
					<select
						id="careerId"
						name="careerId"
						bind:value={selectedCareer}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value="">Seleccionar carrera</option>
						{#each careers as career}
							<option value={career.id}>{career.name}</option>
						{/each}
					</select>
				</div>

				<!-- Año -->
				<div>
					<label for="yearLevel" class="mb-1 block text-sm text-slate-400">Año *</label>
					<select
						id="yearLevel"
						name="yearLevel"
						bind:value={selectedYear}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						{#each yearLevels as year}
							<option value={year}>Año {year}</option>
						{/each}
					</select>
				</div>

				<!-- Materia -->
				<div>
					<label for="subjectId" class="mb-1 block text-sm text-slate-400">Materia *</label>
					<select
						id="subjectId"
						name="subjectId"
						bind:value={selectedSubject}
						required
						disabled={!selectedCareer}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-50"
					>
						<option value="">Seleccionar materia</option>
						{#each subjects as subject}
							<option value={subject.id}>{subject.name}</option>
						{/each}
					</select>
					{#if selectedCareer && subjects.length === 0}
						<p class="mt-1 text-xs text-slate-500">No hay materias para esta carrera y año</p>
					{/if}
				</div>

				<!-- Comisión -->
				<div>
					<label for="commissionId" class="mb-1 block text-sm text-slate-400">Comisión</label>
					<select
						id="commissionId"
						name="commissionId"
						bind:value={selectedCommission}
						disabled={!selectedSubject}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-50"
					>
						<option value="">Seleccionar comisión</option>
						{#each commissions as commission}
							<option value={commission.id}>{commission.code}</option>
						{/each}
					</select>
				</div>

				<!-- Docente -->
				<div>
					<label for="teacherId" class="mb-1 block text-sm text-slate-400">Docente</label>
					<select
						id="teacherId"
						name="teacherId"
						bind:value={selectedTeacher}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value="">Seleccionar docente</option>
						{#each teachers as teacher}
							<option value={teacher.id}>{teacher.lastName}, {teacher.firstName}</option>
						{/each}
					</select>
				</div>

				<!-- Día de la semana -->
				<div>
					<label for="dayOfWeek" class="mb-1 block text-sm text-slate-400">Día de la semana *</label
					>
					<select
						id="dayOfWeek"
						name="dayOfWeek"
						bind:value={selectedDay}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value="">Seleccionar día</option>
						{#each days as day}
							<option value={day.value}>{day.label}</option>
						{/each}
					</select>
				</div>

				<!-- Hora inicio -->
				<div>
					<label for="startTime" class="mb-1 block text-sm text-slate-400">Hora inicio *</label>
					<input
						id="startTime"
						name="startTime"
						type="time"
						bind:value={startTime}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>

				<!-- Hora fin -->
				<div>
					<label for="endTime" class="mb-1 block text-sm text-slate-400">Hora fin *</label>
					<input
						id="endTime"
						name="endTime"
						type="time"
						bind:value={endTime}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>

				<!-- Aula -->
				<div>
					<label for="classroom" class="mb-1 block text-sm text-slate-400">Aula</label>
					<input
						id="classroom"
						name="classroom"
						type="text"
						bind:value={classroom}
						placeholder="Ej: Aula 101"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>

				<!-- Estado -->
				<div>
					<label for="active" class="mb-1 block text-sm text-slate-400">Estado</label>
					<select
						id="active"
						name="active"
						bind:value={active}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value={true}>Activo</option>
						<option value={false}>Inactivo</option>
					</select>
				</div>
			</div>

			<!-- Observaciones -->
			<div>
				<label for="observations" class="mb-1 block text-sm text-slate-400">Observaciones</label>
				<textarea
					id="observations"
					name="observations"
					bind:value={observations}
					rows="3"
					placeholder="Observaciones opcionales..."
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
				></textarea>
			</div>

			<div class="flex gap-4">
				<button
					type="submit"
					class="flex-1 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-600"
				>
					Guardar Horario
				</button>
				<a
					href="/configuracion/horarios"
					class="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-400 transition hover:bg-slate-800"
				>
					Cancelar
				</a>
			</div>
		</form>
	</div>
</div>
