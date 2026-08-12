<script lang="ts">
	import type { PageData } from './$types';
	import WeeklyScheduleGrid from '$lib/components/schedule/WeeklyScheduleGrid.svelte';

	let { data }: { data: PageData } = $props();

	function uniqueSubjectCount(): number {
		return new Set(data.schedules.map((schedule) => schedule.subjectId)).size;
	}

	function uniqueDayCount(): number {
		return new Set(data.schedules.map((schedule) => schedule.dayOfWeek)).size;
	}

	function totalWeeklyMinutes(): number {
		return data.schedules.reduce((total, schedule) => {
			const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
			const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

			const start = startHour * 60 + startMinute;
			const end = endHour * 60 + endMinute;

			return total + Math.max(0, end - start);
		}, 0);
	}

	function weeklyHoursLabel(): string {
		const total = totalWeeklyMinutes();
		const hours = Math.floor(total / 60);
		const minutes = total % 60;

		if (minutes === 0) {
			return `${hours} h`;
		}

		return `${hours} h ${minutes} min`;
	}
</script>

<svelte:head>
	<title>Mis horarios | Sistema Freire</title>
	<meta name="description" content="Horario semanal de clases del docente" />
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<!-- Header -->
	<header class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<div class="p-6 sm:p-8">
			<div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.2em] text-indigo-400 uppercase">
						Docente / Agenda académica
					</p>

					<h1 class="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
						Mis horarios
					</h1>

					<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
						Distribución semanal de las clases asignadas a
						{data.teacher.firstName}
						{data.teacher.lastName}.
					</p>
				</div>

				<div
					class="inline-flex w-fit items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400"
				>
					<span class="h-2 w-2 rounded-full bg-green-400"></span>
					Horario institucional
				</div>
			</div>
		</div>
	</header>

	<!-- Métricas -->
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
			<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Materias</p>

			<p class="mt-2 text-3xl font-black text-white">
				{uniqueSubjectCount()}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
			<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Días con clases</p>

			<p class="mt-2 text-3xl font-black text-white">
				{uniqueDayCount()}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
			<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Carga semanal</p>

			<p class="mt-2 text-3xl font-black text-white">
				{weeklyHoursLabel()}
			</p>
		</div>
	</div>

	<!-- Horario -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
		<div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-xl font-bold text-white">Semana de clases</h2>

				<p class="mt-1 text-sm text-slate-500">
					Los bloques representan la duración real de cada clase.
				</p>
			</div>

			{#if data.schedules.length > 0}
				<button
					type="button"
					onclick={() => window.print()}
					class="w-fit rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
				>
					Imprimir horario
				</button>
			{/if}
		</div>

		<WeeklyScheduleGrid
			schedules={data.schedules}
			showTeacher={false}
			showCareer={true}
			showLocation={true}
			showCommission={true}
			emptyMessage="Todavía no tenés horarios institucionales asignados."
		/>
	</section>

	<div class="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-5 py-4">
		<p class="text-sm leading-6 text-slate-400">
			Los horarios que aparecen en esta pantalla son los configurados institucionalmente. Si
			detectás un dato incorrecto, debe modificarse desde Configuración → Horarios.
		</p>
	</div>
</div>
