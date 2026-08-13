<script lang="ts">
	import { enhance } from '$app/forms';

	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let selectedLocation = $state(data.schedule.locationId);
	let selectedCareer = $state(data.schedule.careerId);
	let selectedYear = $state(data.schedule.yearLevel);
	let selectedSubject = $state(data.schedule.subjectId);
	let selectedCommission = $state(data.schedule.commissionId);
	let selectedTeacher = $state(data.schedule.teacherId);
	let selectedDay = $state(data.schedule.dayOfWeek);
	let startTime = $state(data.schedule.startTime);
	let endTime = $state(data.schedule.endTime);
	let classroom = $state(data.schedule.classroom);
	let observations = $state(data.schedule.observations);
	let active = $state(data.schedule.active);

	let subjects = $state([...data.subjects]);
	let commissions = $state([...data.commissions]);

	let subjectsRequest = 0;
	let commissionsRequest = 0;

	const yearLevels = [1, 2, 3, 4, 5, 6, 7];

	const days = [
		{ value: 'MONDAY', label: 'Lunes' },
		{ value: 'TUESDAY', label: 'Martes' },
		{ value: 'WEDNESDAY', label: 'Miércoles' },
		{ value: 'THURSDAY', label: 'Jueves' },
		{ value: 'FRIDAY', label: 'Viernes' },
		{ value: 'SATURDAY', label: 'Sábado' },
		{ value: 'SUNDAY', label: 'Domingo' }
	];

	async function fetchSubjects(careerId: string, yearLevel: number) {
		const requestId = ++subjectsRequest;

		if (!careerId || !yearLevel) {
			subjects = [];
			selectedSubject = '';
			commissions = [];
			selectedCommission = '';
			return;
		}

		try {
			const response = await fetch(
				`/api/schedules/subjects?careerId=${encodeURIComponent(careerId)}&yearLevel=${yearLevel}`
			);

			if (!response.ok) {
				return;
			}

			const result = await response.json();

			if (requestId !== subjectsRequest) {
				return;
			}

			subjects = result;

			if (!subjects.some((subject) => subject.id === selectedSubject)) {
				selectedSubject = '';
				selectedCommission = '';
				commissions = [];
			}
		} catch (error) {
			console.error('Error cargando materias:', error);
		}
	}

	async function fetchCommissions(subjectId: string) {
		const requestId = ++commissionsRequest;

		if (!subjectId) {
			commissions = [];
			selectedCommission = '';
			return;
		}

		try {
			const response = await fetch(
				`/api/schedules/commissions?subjectId=${encodeURIComponent(subjectId)}`
			);

			if (!response.ok) {
				return;
			}

			const result = await response.json();

			if (requestId !== commissionsRequest) {
				return;
			}

			commissions = result;

			if (
				selectedCommission &&
				!commissions.some((commission) => commission.id === selectedCommission)
			) {
				selectedCommission = '';
			}
		} catch (error) {
			console.error('Error cargando comisiones:', error);
		}
	}

	let previousCareer = selectedCareer;
	let previousYear = selectedYear;
	let previousSubject = selectedSubject;

	$effect(() => {
		const career = selectedCareer;
		const year = selectedYear;

		if (career !== previousCareer || year !== previousYear) {
			previousCareer = career;
			previousYear = year;

			void fetchSubjects(career, year);
		}
	});

	$effect(() => {
		const subject = selectedSubject;

		if (subject !== previousSubject) {
			previousSubject = subject;

			void fetchCommissions(subject);
		}
	});
</script>

<svelte:head>
	<title>Editar horario | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">
				Sistema / Configuración / Horarios
			</p>

			<h1 class="mt-1 text-3xl font-bold text-white">Editar horario</h1>

			<p class="mt-2 text-sm text-slate-400">
				{data.schedule.subject.name} · {data.schedule.career.name}
			</p>
		</div>

		<a
			href="/configuracion/horarios"
			class="w-fit rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
		>
			Volver
		</a>
	</header>

	{#if form?.error}
		<div class="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
			{form.error}
		</div>
	{/if}

	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<form method="POST" use:enhance class="space-y-6">
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<label for="locationId" class="mb-2 block text-sm font-medium text-slate-300">
						Localidad
					</label>

					<select
						id="locationId"
						name="locationId"
						bind:value={selectedLocation}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value="">Sin localidad específica</option>

						{#each data.locations as location}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300">
						Carrera *
					</label>

					<select
						id="careerId"
						name="careerId"
						bind:value={selectedCareer}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value="">Seleccionar carrera</option>

						{#each data.careers as career}
							<option value={career.id}>{career.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="yearLevel" class="mb-2 block text-sm font-medium text-slate-300">
						Año *
					</label>

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

				<div>
					<label for="subjectId" class="mb-2 block text-sm font-medium text-slate-300">
						Materia *
					</label>

					<select
						id="subjectId"
						name="subjectId"
						bind:value={selectedSubject}
						required
						disabled={!selectedCareer}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="">Seleccionar materia</option>

						{#each subjects as subject}
							<option value={subject.id}>
								{subject.code} · {subject.name}
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
						disabled={!selectedSubject}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="">Sin comisión</option>

						{#each commissions as commission}
							<option value={commission.id}>{commission.code}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="teacherId" class="mb-2 block text-sm font-medium text-slate-300">
						Docente
					</label>

					<select
						id="teacherId"
						name="teacherId"
						bind:value={selectedTeacher}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value="">Sin docente asignado</option>

						{#each data.teachers as teacher}
							<option value={teacher.id}>
								{teacher.lastName}, {teacher.firstName}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="dayOfWeek" class="mb-2 block text-sm font-medium text-slate-300">
						Día *
					</label>

					<select
						id="dayOfWeek"
						name="dayOfWeek"
						bind:value={selectedDay}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						{#each days as day}
							<option value={day.value}>{day.label}</option>
						{/each}
					</select>
				</div>

				<div class="hidden md:block"></div>

				<div>
					<label for="startTime" class="mb-2 block text-sm font-medium text-slate-300">
						Hora de inicio *
					</label>

					<input
						id="startTime"
						name="startTime"
						type="time"
						bind:value={startTime}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>

				<div>
					<label for="endTime" class="mb-2 block text-sm font-medium text-slate-300">
						Hora de finalización *
					</label>

					<input
						id="endTime"
						name="endTime"
						type="time"
						bind:value={endTime}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>

				<div>
					<label for="classroom" class="mb-2 block text-sm font-medium text-slate-300">
						Aula
					</label>

					<input
						id="classroom"
						name="classroom"
						type="text"
						bind:value={classroom}
						placeholder="Ej: Aula 1"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>

				<div>
					<label for="active" class="mb-2 block text-sm font-medium text-slate-300"> Estado </label>

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

			<div>
				<label for="observations" class="mb-2 block text-sm font-medium text-slate-300">
					Observaciones
				</label>

				<textarea
					id="observations"
					name="observations"
					bind:value={observations}
					rows="3"
					placeholder="Observaciones opcionales..."
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
				></textarea>
			</div>

			<div
				class="flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end"
			>
				<a
					href="/configuracion/horarios"
					class="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
				>
					Cancelar
				</a>

				<button
					type="submit"
					class="rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-600"
				>
					Guardar cambios
				</button>
			</div>
		</form>
	</div>
</div>
