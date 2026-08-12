<script lang="ts">
	type WeekDayValue =
		| 'MONDAY'
		| 'TUESDAY'
		| 'WEDNESDAY'
		| 'THURSDAY'
		| 'FRIDAY'
		| 'SATURDAY'
		| 'SUNDAY';

	interface ScheduleItem {
		id: string;
		dayOfWeek: WeekDayValue;
		startTime: string;
		endTime: string;
		yearLevel?: number;
		classroom?: string | null;
		observations?: string | null;
		active?: boolean;

		subject: {
			id?: string;
			name: string;
			code?: string;
		};

		teacher?: {
			id?: string;
			firstName: string;
			lastName: string;
		} | null;

		commission?: {
			id?: string;
			code: string;
		} | null;

		location?: {
			id?: string;
			name: string;
		} | null;

		career?: {
			id?: string;
			name: string;
		} | null;
	}

	interface Props {
		schedules?: ScheduleItem[];
		showTeacher?: boolean;
		showCareer?: boolean;
		showLocation?: boolean;
		showCommission?: boolean;
		emptyMessage?: string;
	}

	let {
		schedules = [],
		showTeacher = true,
		showCareer = false,
		showLocation = false,
		showCommission = true,
		emptyMessage = 'No hay horarios configurados.'
	}: Props = $props();

	const dayDefinitions: Array<{
		value: WeekDayValue;
		label: string;
		shortLabel: string;
	}> = [
		{ value: 'MONDAY', label: 'Lunes', shortLabel: 'Lun' },
		{ value: 'TUESDAY', label: 'Martes', shortLabel: 'Mar' },
		{ value: 'WEDNESDAY', label: 'Miércoles', shortLabel: 'Mié' },
		{ value: 'THURSDAY', label: 'Jueves', shortLabel: 'Jue' },
		{ value: 'FRIDAY', label: 'Viernes', shortLabel: 'Vie' },
		{ value: 'SATURDAY', label: 'Sábado', shortLabel: 'Sáb' },
		{ value: 'SUNDAY', label: 'Domingo', shortLabel: 'Dom' }
	];

	const palette = [
		{
			background: '#bfdbfe',
			border: '#60a5fa',
			text: '#172554'
		},
		{
			background: '#ddd6fe',
			border: '#a78bfa',
			text: '#2e1065'
		},
		{
			background: '#fed7aa',
			border: '#fb923c',
			text: '#431407'
		},
		{
			background: '#fde68a',
			border: '#fbbf24',
			text: '#422006'
		},
		{
			background: '#fecdd3',
			border: '#fb7185',
			text: '#4c0519'
		},
		{
			background: '#bbf7d0',
			border: '#4ade80',
			text: '#052e16'
		},
		{
			background: '#a5f3fc',
			border: '#22d3ee',
			text: '#083344'
		},
		{
			background: '#d9f99d',
			border: '#a3e635',
			text: '#1a2e05'
		},
		{
			background: '#e2e8f0',
			border: '#94a3b8',
			text: '#0f172a'
		}
	];

	const PX_PER_MINUTE = 1.22;
	const DEFAULT_START = 18 * 60;
	const DEFAULT_END = 23 * 60;

	function timeToMinutes(value: string): number {
		const [hours, minutes] = value.split(':').map(Number);

		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return 0;
		}

		return hours * 60 + minutes;
	}

	function minutesToTime(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;

		return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
	}

	function getStartMinute(): number {
		if (schedules.length === 0) {
			return DEFAULT_START;
		}

		const minimum = Math.min(...schedules.map((schedule) => timeToMinutes(schedule.startTime)));

		return Math.floor(minimum / 15) * 15;
	}

	function getEndMinute(): number {
		if (schedules.length === 0) {
			return DEFAULT_END;
		}

		const maximum = Math.max(...schedules.map((schedule) => timeToMinutes(schedule.endTime)));

		return Math.ceil(maximum / 15) * 15;
	}

	function getGridHeight(): number {
		return Math.max(240, (getEndMinute() - getStartMinute()) * PX_PER_MINUTE);
	}

	function getVisibleDays() {
		const weekdays = dayDefinitions.slice(0, 5);

		const hasSaturday = schedules.some((schedule) => schedule.dayOfWeek === 'SATURDAY');
		const hasSunday = schedules.some((schedule) => schedule.dayOfWeek === 'SUNDAY');

		if (hasSaturday) {
			weekdays.push(dayDefinitions[5]);
		}

		if (hasSunday) {
			weekdays.push(dayDefinitions[6]);
		}

		return weekdays;
	}

	function getSchedulesForDay(day: WeekDayValue): ScheduleItem[] {
		return schedules
			.filter((schedule) => schedule.dayOfWeek === day)
			.sort((a, b) => a.startTime.localeCompare(b.startTime));
	}

	function getTimeMarkers(): number[] {
		const markers = new Set<number>();

		markers.add(getStartMinute());
		markers.add(getEndMinute());

		for (const schedule of schedules) {
			markers.add(timeToMinutes(schedule.startTime));
			markers.add(timeToMinutes(schedule.endTime));
		}

		return Array.from(markers).sort((a, b) => a - b);
	}

	function getTop(schedule: ScheduleItem): number {
		return (timeToMinutes(schedule.startTime) - getStartMinute()) * PX_PER_MINUTE;
	}

	function getHeight(schedule: ScheduleItem): number {
		const duration = timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime);

		return Math.max(duration * PX_PER_MINUTE, 42);
	}

	function getMarkerTop(marker: number): number {
		return (marker - getStartMinute()) * PX_PER_MINUTE;
	}

	function getDuration(schedule: ScheduleItem): number {
		return timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime);
	}

	function hashSubject(subjectName: string): number {
		let hash = 0;

		for (let index = 0; index < subjectName.length; index += 1) {
			hash = subjectName.charCodeAt(index) + ((hash << 5) - hash);
		}

		return Math.abs(hash);
	}

	function getSubjectColor(subjectName: string) {
		return palette[hashSubject(subjectName) % palette.length];
	}

	function getScheduleTitle(schedule: ScheduleItem): string {
		const lines = [schedule.subject.name, `${schedule.startTime} - ${schedule.endTime}`];

		if (showTeacher && schedule.teacher) {
			lines.push(`${schedule.teacher.firstName} ${schedule.teacher.lastName}`);
		}

		if (schedule.classroom) {
			lines.push(`Aula: ${schedule.classroom}`);
		}

		if (showCommission && schedule.commission) {
			lines.push(`Comisión: ${schedule.commission.code}`);
		}

		if (showCareer && schedule.career) {
			lines.push(schedule.career.name);
		}

		if (showLocation && schedule.location) {
			lines.push(schedule.location.name);
		}

		return lines.join('\n');
	}
</script>

{#if schedules.length === 0}
	<div
		class="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-12 text-center"
	>
		<div
			class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-xl"
		>
			🗓
		</div>

		<p class="font-semibold text-slate-300">{emptyMessage}</p>
	</div>
{:else}
	<div class="schedule-board overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
		<div class="overflow-x-auto">
			<div class="min-w-[940px]">
				<!-- Encabezado -->
				<div
					class="grid border-b border-slate-700 bg-slate-900"
					style={`grid-template-columns: 88px repeat(${getVisibleDays().length}, minmax(160px, 1fr));`}
				>
					<div
						class="flex min-h-16 items-center justify-center border-r border-slate-700 px-2 text-xs font-bold tracking-wider text-slate-400 uppercase"
					>
						Horario
					</div>

					{#each getVisibleDays() as day}
						<div
							class="flex min-h-16 items-center justify-center border-r border-slate-700 px-3 text-center last:border-r-0"
						>
							<div>
								<p class="hidden text-sm font-bold text-white sm:block">{day.label}</p>
								<p class="text-sm font-bold text-white sm:hidden">{day.shortLabel}</p>
							</div>
						</div>
					{/each}
				</div>

				<!-- Cuerpo -->
				<div
					class="grid"
					style={`grid-template-columns: 88px repeat(${getVisibleDays().length}, minmax(160px, 1fr));`}
				>
					<!-- Horas -->
					<div
						class="relative border-r border-slate-700 bg-slate-900/70"
						style={`height: ${getGridHeight()}px;`}
					>
						{#each getTimeMarkers() as marker}
							<div
								class="absolute right-3 text-xs font-semibold text-slate-400"
								style={`top: ${Math.max(4, getMarkerTop(marker) - 8)}px;`}
							>
								{minutesToTime(marker)}
							</div>
						{/each}
					</div>

					<!-- Días -->
					{#each getVisibleDays() as day}
						<div
							class="relative border-r border-slate-800 bg-slate-950 last:border-r-0"
							style={`height: ${getGridHeight()}px;`}
						>
							<!-- Líneas horarias -->
							{#each getTimeMarkers() as marker}
								<div
									class="pointer-events-none absolute right-0 left-0 border-t border-slate-800"
									style={`top: ${getMarkerTop(marker)}px;`}
								></div>
							{/each}

							<!-- Bloques -->
							{#each getSchedulesForDay(day.value) as schedule (schedule.id)}
								{@const subjectColor = getSubjectColor(schedule.subject.name)}
								{@const duration = getDuration(schedule)}

								<div
									class="absolute right-1.5 left-1.5 z-10 overflow-hidden rounded-xl border p-2 shadow-lg transition duration-200 hover:z-20 hover:-translate-y-0.5 hover:shadow-xl"
									style={`
										top: ${getTop(schedule) + 2}px;
										height: ${Math.max(38, getHeight(schedule) - 4)}px;
										background-color: ${subjectColor.background};
										border-color: ${subjectColor.border};
										color: ${subjectColor.text};
									`}
									title={getScheduleTitle(schedule)}
								>
									<div class="flex h-full flex-col">
										<p class="overflow-hidden text-xs leading-tight font-extrabold">
											{schedule.subject.name}
										</p>

										<p class="mt-1 text-[10px] leading-none font-bold opacity-75">
											{schedule.startTime} - {schedule.endTime}
										</p>

										{#if duration >= 45}
											<div class="mt-1 space-y-0.5 overflow-hidden">
												{#if showTeacher && schedule.teacher}
													<p class="truncate text-[10px] font-semibold opacity-80">
														{schedule.teacher.firstName}
														{schedule.teacher.lastName}
													</p>
												{/if}

												{#if showCareer && schedule.career}
													<p class="truncate text-[10px] font-semibold opacity-80">
														{schedule.career.name}
														{#if schedule.yearLevel}
															· {schedule.yearLevel}° año
														{/if}
													</p>
												{/if}

												{#if schedule.classroom}
													<p class="truncate text-[10px] opacity-75">
														Aula {schedule.classroom}
													</p>
												{/if}

												{#if showCommission && schedule.commission}
													<p class="truncate text-[10px] opacity-75">
														Comisión {schedule.commission.code}
													</p>
												{/if}

												{#if showLocation && schedule.location}
													<p class="truncate text-[10px] opacity-75">
														{schedule.location.name}
													</p>
												{/if}
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@media print {
		.schedule-board {
			border: 1px solid #94a3b8;
			break-inside: avoid;
		}
	}
</style>
