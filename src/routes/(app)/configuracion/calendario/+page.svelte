<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let currentDate = $state(new Date());
	let selectedMonth = $state(currentDate.getMonth());
	let selectedYear = $state(currentDate.getFullYear());
	let activeTab = $state<'calendario' | 'laborables' | 'feriados' | 'fechas'>('calendario');

	// Estado para días laborables
	let workingDays = $state<number[]>(data.workingDays || [1, 2, 3, 4, 5]);

	const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

	function toggleDay(dayIndex: number) {
		if (workingDays.includes(dayIndex)) {
			workingDays = workingDays.filter((d: number) => d !== dayIndex);
		} else {
			workingDays = [...workingDays, dayIndex];
		}
	}

	const monthNames = [
		'Enero',
		'Febrero',
		'Marzo',
		'Abril',
		'Mayo',
		'Junio',
		'Julio',
		'Agosto',
		'Septiembre',
		'Octubre',
		'Noviembre',
		'Diciembre'
	];

	const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

	function getDaysInMonth(year: number, month: number): number {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfMonth(year: number, month: number): number {
		return new Date(year, month, 1).getDay();
	}

	function prevMonth() {
		if (selectedMonth === 0) {
			selectedMonth = 11;
			selectedYear--;
		} else {
			selectedMonth--;
		}
	}

	function nextMonth() {
		if (selectedMonth === 11) {
			selectedMonth = 0;
			selectedYear++;
		} else {
			selectedMonth++;
		}
	}

	const daysInMonth = $derived(getDaysInMonth(selectedYear, selectedMonth));
	const firstDayOfMonth = $derived(getFirstDayOfMonth(selectedYear, selectedMonth));
	const calendarDays = $derived.by(() => {
		const days: (number | null)[] = [];
		// Empty cells for days before the first day of the month
		for (let i = 0; i < firstDayOfMonth; i++) {
			days.push(null);
		}
		// Days of the month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}
		return days;
	});
</script>

<svelte:head>
	<title>Calendario | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Sistema / Configuración</p>
			<h1 class="text-3xl font-bold">Calendario</h1>
		</div>
		<a
			href="/configuracion"
			class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
		>
			Volver
		</a>
	</div>

	<!-- Tabs -->
	<div class="mb-6 flex gap-2 border-b border-slate-800 pb-4">
		<button
			onclick={() => (activeTab = 'calendario')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition {activeTab === 'calendario' ? 'rounded-xl bg-indigo-500 px-4 py-2 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
		>
			Calendario
		</button>
		<button
			onclick={() => (activeTab = 'laborables')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition {activeTab === 'laborables' ? 'rounded-xl bg-indigo-500 px-4 py-2 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
		>
			Días Laborables
		</button>
		<button
			onclick={() => (activeTab = 'feriados')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition {activeTab === 'feriados' ? 'rounded-xl bg-indigo-500 px-4 py-2 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
		>
			Feriados
		</button>
		<button
			onclick={() => (activeTab = 'fechas')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition {activeTab === 'fechas' ? 'rounded-xl bg-indigo-500 px-4 py-2 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
		>
			Fechas Importantes
		</button>
	</div>

	{#if activeTab === 'calendario'}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<!-- Calendar Header -->
			<div class="mb-6 flex items-center justify-between">
				<button
					onclick={prevMonth}
					aria-label="Mes anterior"
					class="rounded-xl border border-slate-700 bg-slate-800/50 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<h2 class="text-2xl font-bold text-white">
					{monthNames[selectedMonth]} {selectedYear}
				</h2>
				<button
					onclick={nextMonth}
					aria-label="Mes siguiente"
					class="rounded-xl border border-slate-700 bg-slate-800/50 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			<!-- Calendar Grid -->
			<div class="grid grid-cols-7 gap-2">
				<!-- Days of week header -->
				{#each daysOfWeek as day}
					<div class="text-center text-sm font-semibold text-slate-400">{day}</div>
				{/each}

				<!-- Calendar days -->
				{#each calendarDays as day}
					{#if day}
						<div
							class="flex aspect-square items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 transition hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-white"
						>
							<span class="text-sm font-medium">{day}</span>
						</div>
					{:else}
						<div class="aspect-square"></div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	{#if activeTab === 'laborables'}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold text-white">Días Laborables</h2>
			<p class="mb-6 text-slate-400">Selecciona los días de la semana que son laborables.</p>
			<form method="POST" action="?/updateWorkingDays" use:enhance class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					{#each dayNames as day, index}
						<label class="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:bg-slate-800">
							<input
								type="checkbox"
								name="days"
								value={index}
								checked={workingDays.includes(index)}
								onchange={() => toggleDay(index)}
								class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
							/>
							<span class="text-white">{day}</span>
						</label>
					{/each}
				</div>
				<button
					type="submit"
					class="w-full rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:scale-[1.02]"
				>
					Guardar Configuración
				</button>
			</form>
		</div>
	{/if}

	{#if activeTab === 'feriados'}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold text-white">Feriados</h2>
			<p class="mb-6 text-slate-400">Agrega los feriados del año académico.</p>
			<form method="POST" action="?/addHoliday" use:enhance class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="holidayName" class="mb-1 block text-sm text-slate-400">Nombre</label>
						<input
							id="holidayName"
							name="name"
							type="text"
							placeholder="Ej: Día de la Independencia"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
						/>
					</div>
					<div>
						<label for="holidayDate" class="mb-1 block text-sm text-slate-400">Fecha</label>
						<input
							id="holidayDate"
							name="date"
							type="date"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
						/>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<input type="checkbox" name="recurring" id="recurring" class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500" />
					<label for="recurring" class="text-sm text-slate-400">Repetir anualmente</label>
				</div>
				<button
					type="submit"
					class="w-full rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:scale-[1.02]"
				>
					Agregar Feriado
				</button>
			</form>
			<div class="mt-6">
				<h3 class="mb-3 text-lg font-semibold text-white">Feriados Configurados</h3>
				<div class="space-y-2">
					{#each data.holidays as holiday}
						<div class="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 p-4">
							<div>
								<p class="font-medium text-white">{holiday.name}</p>
								<p class="text-sm text-slate-400">{new Date(holiday.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</p>
							</div>
							<form method="POST" action="?/deleteHoliday" use:enhance>
								<input type="hidden" name="id" value={holiday.id} />
								<button
									type="submit"
									class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
								>
									Eliminar
								</button>
							</form>
						</div>
					{/each}
					{#if data.holidays.length === 0}
						<p class="text-slate-400">No hay feriados configurados</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if activeTab === 'fechas'}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold text-white">Fechas Importantes</h2>
			<p class="mb-6 text-slate-400">Configura fechas importantes como aniversarios de la institución.</p>
			<form method="POST" action="?/addImportantDate" use:enhance class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="importantDateName" class="mb-1 block text-sm text-slate-400">Nombre</label>
						<input
							id="importantDateName"
							name="name"
							type="text"
							placeholder="Ej: Aniversario del Instituto"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
						/>
					</div>
					<div>
						<label for="importantDate" class="mb-1 block text-sm text-slate-400">Fecha</label>
						<input
							id="importantDate"
							name="date"
							type="date"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
						/>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<input type="checkbox" name="recurring" id="recurringDate" class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500" />
					<label for="recurringDate" class="text-sm text-slate-400">Repetir anualmente</label>
				</div>
				<button
					type="submit"
					class="w-full rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:scale-[1.02]"
				>
					Agregar Fecha Importante
				</button>
			</form>
			<div class="mt-6">
				<h3 class="mb-3 text-lg font-semibold text-white">Fechas Importantes Configuradas</h3>
				<div class="space-y-2">
					{#each data.importantDates as date}
						<div class="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 p-4">
							<div>
								<p class="font-medium text-white">{date.name}</p>
								<p class="text-sm text-slate-400">{new Date(date.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</p>
							</div>
							<form method="POST" action="?/deleteImportantDate" use:enhance>
								<input type="hidden" name="id" value={date.id} />
								<button
									type="submit"
									class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
								>
									Eliminar
								</button>
							</form>
						</div>
					{/each}
					{#if data.importantDates.length === 0}
						<p class="text-slate-400">No hay fechas importantes configuradas</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
