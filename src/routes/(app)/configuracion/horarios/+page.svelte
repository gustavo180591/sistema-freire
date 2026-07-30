<script lang="ts">
	type WeekDayValue =
		| 'MONDAY'
		| 'TUESDAY'
		| 'WEDNESDAY'
		| 'THURSDAY'
		| 'FRIDAY'
		| 'SATURDAY'
		| 'SUNDAY';

	const weekDayValues: WeekDayValue[] = [
		'MONDAY',
		'TUESDAY',
		'WEDNESDAY',
		'THURSDAY',
		'FRIDAY',
		'SATURDAY',
		'SUNDAY'
	];

	import type { PageData } from './$types';

	interface Schedule {
		id: string;
		startTime: string;
		endTime: string;
		subject: { name: string };
		teacher?: { firstName: string; lastName: string };
		classroom?: string;
		commission?: { code: string };
		active: boolean;
	}

	interface YearData {
		yearLevel: number;
		days: Record<string, Schedule[]>;
	}

	interface CareerData {
		career: { name: string };
		years: Record<number, YearData>;
	}

	function getDayName(dayOfWeek: WeekDayValue): string {
		const names: Record<WeekDayValue, string> = {
			['MONDAY']: 'Lunes',
			['TUESDAY']: 'Martes',
			['WEDNESDAY']: 'Miércoles',
			['THURSDAY']: 'Jueves',
			['FRIDAY']: 'Viernes',
			['SATURDAY']: 'Sábado',
			['SUNDAY']: 'Domingo'
		};
		return names[dayOfWeek];
	}

	let { data }: { data: PageData } = $props();

	const locations = $derived(data?.locations ?? []);
	const careers = $derived(data?.careers ?? []);
	const schedules = $derived(data?.schedules ?? ({} as Record<string, CareerData>));
	const filters = $derived(data?.filters ?? {});

	let selectedLocation = $state((filters.locationId as string) || '');
	let selectedCareer = $state((filters.careerId as string) || '');
	let selectedYear = $state((filters.yearLevel as string) || '');
	let selectedActive = $state((filters.active as string) || '');

	const yearLevels = [1, 2, 3, 4, 5, 6, 7];

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedLocation) params.set('locationId', selectedLocation);
		if (selectedCareer) params.set('careerId', selectedCareer);
		if (selectedYear) params.set('yearLevel', selectedYear);
		if (selectedActive) params.set('active', selectedActive);
		window.location.search = params.toString();
	}

	function clearFilters() {
		selectedLocation = '';
		selectedCareer = '';
		selectedYear = '';
		selectedActive = '';
		window.location.search = '';
	}

	const hasActiveFilters = $derived(
		!!(selectedLocation || selectedCareer || selectedYear || selectedActive)
	);

	let viewMode = $state<'list' | 'calendar'>('list');

	const weekDays = [
		'MONDAY',
		'TUESDAY',
		'WEDNESDAY',
		'THURSDAY',
		'FRIDAY'
	];

	const timeSlots = $derived(() => {
		const allTimes = new Set<string>();
		for (const careerId in schedules) {
			const careerData = schedules[careerId] as CareerData;
			for (const yearLevel in careerData.years) {
				const yearData = careerData.years[yearLevel] as YearData;
				for (const dayOfWeek in yearData.days) {
					const daySchedules = yearData.days[dayOfWeek] as Schedule[];
					for (const schedule of daySchedules) {
						allTimes.add(schedule.startTime);
					}
				}
			}
		}
		return Array.from(allTimes).sort();
	});
</script>

<svelte:head>
	<title>Horarios | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Sistema / Configuración</p>
			<h1 class="text-3xl font-bold">Horarios</h1>
		</div>
		<div class="flex gap-2">
			<div class="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-1">
				<button
					type="button"
					onclick={() => (viewMode = 'list')}
					class="rounded-xl px-4 py-2 text-sm font-semibold transition {viewMode === 'list'
						? 'bg-indigo-600 text-white'
						: 'text-slate-400 hover:bg-slate-800'}"
				>
					Vista listado
				</button>
				<button
					type="button"
					onclick={() => (viewMode = 'calendar')}
					class="rounded-xl px-4 py-2 text-sm font-semibold transition {viewMode === 'calendar'
						? 'bg-indigo-600 text-white'
						: 'text-slate-400 hover:bg-slate-800'}"
				>
					Vista calendario
				</button>
			</div>
			{#if viewMode === 'list'}
				<a
					href="/configuracion/horarios/nuevo"
					class="rounded-2xl bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-600"
				>
					Nuevo Horario
				</a>
			{/if}
			<a
				href="/configuracion"
				class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
			>
				Volver
			</a>
		</div>
	</div>

	<!-- Filters -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<form
			class="flex flex-wrap items-end gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				applyFilters();
			}}
		>
			<div class="min-w-[200px] flex-1">
				<label for="location" class="mb-1 block text-sm text-slate-400">Localidad</label>
				<select
					id="location"
					bind:value={selectedLocation}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
				>
					<option value="">Todas las localidades</option>
					{#each locations as location}
						<option value={location.id}>{location.name}</option>
					{/each}
				</select>
			</div>

			<div class="min-w-[200px] flex-1">
				<label for="career" class="mb-1 block text-sm text-slate-400">Carrera</label>
				<select
					id="career"
					bind:value={selectedCareer}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
				>
					<option value="">Todas las carreras</option>
					{#each careers as career}
						<option value={career.id}>{career.name}</option>
					{/each}
				</select>
			</div>

			<div class="min-w-[150px] flex-1">
				<label for="year" class="mb-1 block text-sm text-slate-400">Año</label>
				<select
					id="year"
					bind:value={selectedYear}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
				>
					<option value="">Todos los años</option>
					{#each yearLevels as year}
						<option value={year}>Año {year}</option>
					{/each}
				</select>
			</div>

			<div class="min-w-[150px] flex-1">
				<label for="active" class="mb-1 block text-sm text-slate-400">Estado</label>
				<select
					id="active"
					bind:value={selectedActive}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
				>
					<option value="">Todos los estados</option>
					<option value="true">Activos</option>
					<option value="false">Inactivos</option>
				</select>
			</div>

			<div class="flex gap-2">
				<button
					type="submit"
					class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
				>
					Filtrar
				</button>
				{#if hasActiveFilters}
					<button
						type="button"
						onclick={clearFilters}
						class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-800"
					>
						Limpiar
					</button>
				{/if}
			</div>
		</form>
	</div>

	<!-- Calendar View -->
	{#if viewMode === 'calendar'}
		{#if Object.keys(schedules).length === 0}
			<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
				<p class="text-slate-400">
					{selectedCareer
						? 'No hay horarios configurados para esta carrera y año.'
						: 'Seleccioná una carrera para ver sus horarios.'}
				</p>
			</div>
		{:else}
			{#each Object.entries(schedules) as [careerId, careerData]}
				{@const career = careerData.career}
				<div class="mb-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-2xl font-bold text-white">{career.name}</h2>
						<button
							type="button"
							onclick={() => window.print()}
							class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
						>
							Imprimir
						</button>
					</div>

					{#each Object.entries(careerData.years) as [yearLevel, yearData]}
						{@const yearTyped = yearData as YearData}
						<div class="mb-6">
							<h3 class="mb-4 text-xl font-semibold text-slate-300">Año {yearTyped.yearLevel}</h3>

							<div class="overflow-x-auto">
								<table class="w-full border-collapse border border-slate-700 bg-white text-sm">
									<thead>
										<tr class="bg-slate-100">
											<th
												class="border border-slate-700 px-3 py-2 text-left font-semibold text-slate-900"
											>
												Horario
											</th>
											{#each weekDays as day}
												<th
													class="border border-slate-700 px-3 py-2 text-center font-semibold text-slate-900"
												>
													{getDayName(day)}
												</th>
											{/each}
										</tr>
									</thead>
									<tbody>
										{#each timeSlots() as time}
											<tr>
												<td class="border border-slate-700 px-3 py-2 font-medium text-slate-900">
													{time}
												</td>
												{#each weekDays as day}
													{@const daySchedules = yearTyped.days[day] as Schedule[]}
													{@const scheduleAtTime = daySchedules?.find((s) => s.startTime === time)}
													<td class="border border-slate-700 px-2 py-2 align-top">
														{#if scheduleAtTime}
															<div class="space-y-1">
																<p class="font-medium text-slate-900">
																	{scheduleAtTime.subject.name}
																</p>
																{#if scheduleAtTime.teacher}
																	<p class="text-xs text-slate-600">
																		{scheduleAtTime.teacher.firstName}
																		{scheduleAtTime.teacher.lastName}
																	</p>
																{/if}
																{#if scheduleAtTime.classroom}
																	<p class="text-xs text-slate-600">
																		Aula: {scheduleAtTime.classroom}
																	</p>
																{/if}
																{#if scheduleAtTime.commission}
																	<p class="text-xs text-slate-600">
																		Comisión: {scheduleAtTime.commission.code}
																	</p>
																{/if}
															</div>
														{/if}
													</td>
												{/each}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	{/if}

	<!-- List View -->
	{#if viewMode === 'list'}
		<!-- Schedules Display -->
		{#if Object.keys(schedules).length === 0}
			<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
				<p class="text-slate-400">
					{selectedCareer
						? 'No hay horarios configurados para esta carrera y año.'
						: 'Seleccioná una carrera para ver sus horarios.'}
				</p>
			</div>
		{:else}
			{#each Object.entries(schedules) as [careerId, careerData]}
				{@const career = careerData.career}
				<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
					<h2 class="mb-4 text-2xl font-bold text-white">{career.name}</h2>

					{#each Object.entries(careerData.years) as [yearLevel, yearData]}
						{@const yearTyped = yearData as YearData}
						<div class="mb-6">
							<h3 class="mb-3 text-xl font-semibold text-slate-300">Año {yearTyped.yearLevel}</h3>

							{#each Object.entries(yearTyped.days) as [dayOfWeek, daySchedules]}
								{@const schedulesTyped = daySchedules as Schedule[]}
								<div class="mb-4 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
									<h4 class="mb-3 text-lg font-medium text-indigo-400">
										{getDayName(dayOfWeek as WeekDayValue)}
									</h4>

									<div class="space-y-2">
										{#each schedulesTyped as schedule}
											<div
												class="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/50 p-3"
											>
												<div class="flex flex-1 items-center gap-4">
													<div class="min-w-[120px]">
														<span class="text-sm font-medium text-white">
															{schedule.startTime} - {schedule.endTime}
														</span>
													</div>
													<div class="flex-1">
														<p class="text-sm font-medium text-white">{schedule.subject.name}</p>
														{#if schedule.teacher}
															<p class="text-xs text-slate-400">
																{schedule.teacher.firstName}
																{schedule.teacher.lastName}
															</p>
														{/if}
													</div>
													{#if schedule.classroom}
														<div class="min-w-[80px]">
															<span class="text-xs text-slate-400">Aula: {schedule.classroom}</span>
														</div>
													{/if}
													{#if schedule.commission}
														<div class="min-w-[100px]">
															<span class="text-xs text-slate-400">
																Comisión: {schedule.commission.code}
															</span>
														</div>
													{/if}
												</div>
												<div class="flex gap-2">
													<a
														href="/configuracion/horarios/{schedule.id}/editar"
														class="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-400 hover:bg-indigo-500/20"
													>
														Editar
													</a>
													{#if schedule.active}
														<span
															class="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400"
														>
															Activo
														</span>
													{:else}
														<span
															class="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-400"
														>
															Inactivo
														</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	{/if}
</div>
