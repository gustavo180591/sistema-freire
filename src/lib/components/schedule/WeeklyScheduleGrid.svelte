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
		editable?: boolean;
		contextCareerId?: string;
		contextCareerName?: string;
		contextYearLevel?: number;
		contextLocationId?: string;
		contextLocationName?: string;
	}

	let {
		schedules = [],
		showTeacher = true,
		showCareer = false,
		showLocation = false,
		showCommission = true,
		emptyMessage = 'No hay horarios configurados.',
		editable = false,
		contextCareerId = '',
		contextCareerName = '',
		contextYearLevel,
		contextLocationId = '',
		contextLocationName = ''
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

	interface SubjectOption {
		id: string;
		name: string;
		code: string;
		yearLevel: number;
	}

	interface CommissionOption {
		id: string;
		code: string;
	}

	let selectedSchedule = $state<ScheduleItem | null>(null);
	let modalOpen = $state(false);

	let modalCareerId = $state('');
	let modalCareerName = $state('');
	let modalYearLevel = $state<number | undefined>(undefined);
	let modalLocationId = $state('');
	let modalLocationName = $state('');
	let modalTeacherId = $state('');
	let modalDay = $state<WeekDayValue>('MONDAY');
	let modalClassroom = $state('');
	let modalObservations = $state('');
	let modalActive = $state(true);

	let modalSubjectId = $state('');
	let modalCommissionId = $state('');
	let modalStartTime = $state('');
	let modalEndTime = $state('');

	let subjectOptions = $state<SubjectOption[]>([]);
	let commissionOptions = $state<CommissionOption[]>([]);

	let loadingSubjects = $state(false);
	let loadingCommissions = $state(false);
	let returnTo = $state('/configuracion/horarios');

	const institutionalStartTimes = ['18:00', '18:45', '19:30', '20:30', '21:15', '22:00'];

	const institutionalBlocks = [
		['18:00', '18:45', '19:30', '20:15'],
		['20:30', '21:15', '22:00', '22:45']
	];

	const PX_PER_MINUTE = 1.22;

	/*
	 * Horario institucional del ISFD.
	 *
	 * Estas franjas son independientes de los horarios existentes
	 * en la base de datos y representan la grilla académica oficial.
	 */
	const academicSlots = [
		{ start: '18:00', end: '18:45' },
		{ start: '18:45', end: '19:30' },
		{ start: '19:30', end: '20:15' },

		// Receso institucional: 20:15 a 20:30

		{ start: '20:30', end: '21:15' },
		{ start: '21:15', end: '22:00' },
		{ start: '22:00', end: '22:45' }
	];

	const DEFAULT_START = 18 * 60;
	const DEFAULT_END = 22 * 60 + 45;

	function timeToMinutes(value: string): number {
		const [hours, minutes] = value.split(':').map(Number);

		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return 0;
		}

		return hours * 60 + minutes;
	}

	function getStartMinute(): number {
		if (schedules.length === 0) {
			return DEFAULT_START;
		}

		const minimumScheduleTime = Math.min(
			...schedules.map((schedule) => timeToMinutes(schedule.startTime))
		);

		return Math.min(DEFAULT_START, Math.floor(minimumScheduleTime / 15) * 15);
	}

	function getEndMinute(): number {
		if (schedules.length === 0) {
			return DEFAULT_END;
		}

		const maximumScheduleTime = Math.max(
			...schedules.map((schedule) => timeToMinutes(schedule.endTime))
		);

		return Math.max(DEFAULT_END, Math.ceil(maximumScheduleTime / 15) * 15);
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

		for (const slot of academicSlots) {
			markers.add(timeToMinutes(slot.start));
			markers.add(timeToMinutes(slot.end));
		}

		/*
		 * Si excepcionalmente existe una clase fuera del horario
		 * institucional, agregamos sus extremos para no ocultarla.
		 */
		for (const schedule of schedules) {
			const start = timeToMinutes(schedule.startTime);
			const end = timeToMinutes(schedule.endTime);

			if (start < DEFAULT_START || start > DEFAULT_END) {
				markers.add(start);
			}

			if (end < DEFAULT_START || end > DEFAULT_END) {
				markers.add(end);
			}
		}

		return Array.from(markers).sort((a, b) => a - b);
	}

	function getSlotTop(startTime: string): number {
		return (timeToMinutes(startTime) - getStartMinute()) * PX_PER_MINUTE;
	}

	function getSlotHeight(startTime: string, endTime: string): number {
		return (timeToMinutes(endTime) - timeToMinutes(startTime)) * PX_PER_MINUTE;
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

	function getStartOptions(): string[] {
		const options = [...institutionalStartTimes];

		if (
			selectedSchedule &&
			selectedSchedule.startTime &&
			!options.includes(selectedSchedule.startTime)
		) {
			options.push(selectedSchedule.startTime);
		}

		return options.sort();
	}

	function getEndOptions(startTime: string): string[] {
		const block = institutionalBlocks.find((times) => times.includes(startTime));

		let options: string[] = [];

		if (block) {
			const startIndex = block.indexOf(startTime);

			if (startIndex >= 0) {
				options = block.slice(startIndex + 1);
			}
		}

		if (
			selectedSchedule &&
			startTime === selectedSchedule.startTime &&
			selectedSchedule.endTime &&
			!options.includes(selectedSchedule.endTime)
		) {
			options.push(selectedSchedule.endTime);
		}

		return options.sort();
	}

	function handleStartTimeChange() {
		const availableEndTimes = getEndOptions(modalStartTime);

		if (!availableEndTimes.includes(modalEndTime)) {
			modalEndTime = availableEndTimes[0] ?? '';
		}
	}

	async function loadSubjects(
		careerId: string,
		yearLevel: number,
		currentSubject?: ScheduleItem['subject']
	) {
		if (!careerId || !yearLevel) {
			subjectOptions = [];
			return;
		}

		loadingSubjects = true;

		try {
			const response = await fetch(
				`/api/schedules/subjects?careerId=${encodeURIComponent(careerId)}&yearLevel=${yearLevel}`
			);

			if (!response.ok) {
				subjectOptions = [];
				return;
			}

			subjectOptions = await response.json();

			if (
				currentSubject?.id &&
				!subjectOptions.some((subject) => subject.id === currentSubject.id)
			) {
				subjectOptions = [
					{
						id: currentSubject.id,
						name: currentSubject.name,
						code: currentSubject.code ?? '',
						yearLevel
					},
					...subjectOptions
				];
			}
		} catch (error) {
			console.error('Error cargando materias:', error);
			subjectOptions = [];
		} finally {
			loadingSubjects = false;
		}
	}

	async function loadCommissions(subjectId: string) {
		if (!subjectId) {
			commissionOptions = [];
			return;
		}

		loadingCommissions = true;

		try {
			const response = await fetch(
				`/api/schedules/commissions?subjectId=${encodeURIComponent(subjectId)}`
			);

			if (!response.ok) {
				commissionOptions = [];
				return;
			}

			commissionOptions = await response.json();
		} catch (error) {
			console.error('Error cargando comisiones:', error);
			commissionOptions = [];
		} finally {
			loadingCommissions = false;
		}
	}

	function prepareReturnTo() {
		if (typeof window !== 'undefined') {
			returnTo = `${window.location.pathname}${window.location.search}`;
		}
	}

	async function openSchedule(schedule: ScheduleItem) {
		if (!editable) {
			return;
		}

		selectedSchedule = schedule;
		modalOpen = true;

		modalCareerId = schedule.career?.id ?? contextCareerId;
		modalCareerName = schedule.career?.name ?? contextCareerName;
		modalYearLevel = schedule.yearLevel ?? contextYearLevel;

		modalLocationId = schedule.location?.id ?? contextLocationId;
		modalLocationName = schedule.location?.name ?? contextLocationName;

		modalTeacherId = schedule.teacher?.id ?? '';
		modalDay = schedule.dayOfWeek;
		modalClassroom = schedule.classroom ?? '';
		modalObservations = schedule.observations ?? '';
		modalActive = schedule.active !== false;

		modalSubjectId = schedule.subject.id ?? '';
		modalCommissionId = schedule.commission?.id ?? '';
		modalStartTime = schedule.startTime;
		modalEndTime = schedule.endTime;

		prepareReturnTo();

		await Promise.all([
			loadSubjects(modalCareerId, modalYearLevel ?? 0, schedule.subject),
			loadCommissions(schedule.subject.id ?? '')
		]);
	}

	async function openEmptySlot(day: WeekDayValue, slot: { start: string; end: string }) {
		if (!editable) {
			return;
		}

		if (!contextCareerId || !contextYearLevel) {
			console.error('No se puede crear el horario: falta carrera o año en el contexto.');
			return;
		}

		selectedSchedule = null;
		modalOpen = true;

		modalCareerId = contextCareerId;
		modalCareerName = contextCareerName;
		modalYearLevel = contextYearLevel;

		modalLocationId = contextLocationId;
		modalLocationName = contextLocationName;

		modalTeacherId = '';
		modalDay = day;
		modalClassroom = '';
		modalObservations = '';
		modalActive = true;

		modalSubjectId = '';
		modalCommissionId = '';

		/*
		 * La casilla pulsada define automáticamente
		 * la franja inicial del nuevo horario.
		 */
		modalStartTime = slot.start;
		modalEndTime = slot.end;

		subjectOptions = [];
		commissionOptions = [];

		prepareReturnTo();

		await loadSubjects(modalCareerId, modalYearLevel, undefined);
	}

	function closeSchedule() {
		modalOpen = false;
		selectedSchedule = null;

		subjectOptions = [];
		commissionOptions = [];

		modalSubjectId = '';
		modalCommissionId = '';
	}

	async function handleSubjectChange() {
		modalCommissionId = '';
		await loadCommissions(modalSubjectId);
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeSchedule();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && modalOpen) {
			closeSchedule();
		}
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
</script>

{#if schedules.length === 0 && !editable}
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
					style={`grid-template-columns: 108px repeat(${getVisibleDays().length}, minmax(160px, 1fr));`}
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
					style={`grid-template-columns: 108px repeat(${getVisibleDays().length}, minmax(160px, 1fr));`}
				>
					<!-- Horas -->
					<div
						class="relative border-r border-slate-700 bg-slate-900/70"
						style={`height: ${getGridHeight()}px;`}
					>
						{#each academicSlots as slot}
							<div
								class="absolute right-0 left-0 flex items-center justify-center border-t border-slate-700 px-2 text-center"
								style={`
									top: ${getSlotTop(slot.start)}px;
									height: ${getSlotHeight(slot.start, slot.end)}px;
								`}
							>
								<div class="flex flex-col items-center justify-center leading-none">
									<span class="text-xs font-extrabold text-white">
										{slot.start}
									</span>

									<span class="my-1 text-[9px] font-semibold text-slate-500"> a </span>

									<span class="text-xs font-extrabold text-white">
										{slot.end}
									</span>
								</div>
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

							<!-- Casillas vacías clickeables -->
							{#if editable}
								{#each academicSlots as slot}
									<button
										type="button"
										onclick={() => void openEmptySlot(day.value, slot)}
										class="absolute right-0 left-0 z-[1] cursor-pointer transition hover:bg-indigo-500/10 focus:bg-indigo-500/10 focus:outline-none"
										style={`
											top: ${getSlotTop(slot.start)}px;
											height: ${getSlotHeight(slot.start, slot.end)}px;
										`}
										title={`Agregar materia · ${day.label} ${slot.start} - ${slot.end}`}
										aria-label={`Agregar materia el ${day.label} de ${slot.start} a ${slot.end}`}
									></button>
								{/each}
							{/if}

							<!-- Bloques existentes -->
							{#each getSchedulesForDay(day.value) as schedule (schedule.id)}
								{@const subjectColor = getSubjectColor(schedule.subject.name)}

								<button
									type="button"
									disabled={!editable}
									onclick={() => void openSchedule(schedule)}
									class="absolute right-1.5 left-1.5 z-10 flex items-center justify-center overflow-hidden rounded-xl border px-2 text-center shadow-lg transition duration-200 hover:z-20 hover:-translate-y-0.5 hover:shadow-xl {editable
										? 'cursor-pointer focus:ring-2 focus:ring-indigo-400 focus:outline-none'
										: 'cursor-default'}"
									style={`
										top: ${getTop(schedule) + 2}px;
										height: ${Math.max(38, getHeight(schedule) - 4)}px;
										background-color: ${subjectColor.background};
										border-color: ${subjectColor.border};
										color: ${subjectColor.text};
									`}
									title={schedule.subject.name}
									aria-label={editable
										? `Abrir horario de ${schedule.subject.name}`
										: schedule.subject.name}
								>
									<p class="line-clamp-3 text-xs leading-tight font-extrabold">
										{schedule.subject.name}
									</p>
								</button>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<svelte:window onkeydown={handleKeydown} />

{#if editable && modalOpen}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		role="presentation"
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="schedule-modal-title"
		>
			<!-- Header -->
			<div class="flex items-start justify-between border-b border-slate-800 p-6">
				<div class="min-w-0">
					<p class="text-xs font-semibold tracking-[0.2em] text-indigo-400 uppercase">
						{selectedSchedule ? 'Editar bloque horario' : 'Nuevo bloque horario'}
					</p>

					<h2 id="schedule-modal-title" class="mt-2 text-xl font-bold text-white">
						{selectedSchedule?.subject.name ?? 'Agregar materia'}
					</h2>

					<p class="mt-1 text-sm text-slate-400">
						{modalCareerName || 'Carrera'}
						{#if modalYearLevel}
							· {modalYearLevel}° año
						{/if}
					</p>
				</div>

				<button
					type="button"
					onclick={closeSchedule}
					class="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
					aria-label="Cerrar"
				>
					×
				</button>
			</div>

			<form
				method="POST"
				action={selectedSchedule?.id
					? `/configuracion/horarios/${selectedSchedule.id}/editar`
					: '/configuracion/horarios/nuevo'}
				class="space-y-6 p-6"
			>
				<input type="hidden" name="locationId" value={modalLocationId} />

				<input type="hidden" name="careerId" value={modalCareerId} />

				<input type="hidden" name="teacherId" value={modalTeacherId} />

				<input type="hidden" name="yearLevel" value={modalYearLevel ?? ''} />

				<input type="hidden" name="classroom" value={modalClassroom} />

				<input type="hidden" name="observations" value={modalObservations} />

				<input type="hidden" name="active" value={modalActive ? 'true' : 'false'} />

				<input type="hidden" name="returnTo" value={returnTo} />

				<div class="grid gap-5 sm:grid-cols-2">
					<!-- Materia -->
					<div class="sm:col-span-2">
						<div class="mb-2 flex items-center justify-between gap-3">
							<label for="modalSubjectId" class="block text-sm font-semibold text-slate-300">
								Materia
							</label>

							{#if modalSubjectId}
								<a
									href={`/materias/${modalSubjectId}`}
									class="text-xs font-semibold text-indigo-400 transition hover:text-indigo-300"
								>
									Ver materia →
								</a>
							{/if}
						</div>

						<select
							id="modalSubjectId"
							name="subjectId"
							bind:value={modalSubjectId}
							onchange={() => void handleSubjectChange()}
							required
							disabled={loadingSubjects}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-50"
						>
							{#if loadingSubjects}
								<option value={modalSubjectId}> Cargando materias... </option>
							{:else}
								<option value="">Seleccionar materia</option>

								{#each subjectOptions as subject}
									<option value={subject.id}>
										{subject.code ? `${subject.code} · ` : ''}{subject.name}
									</option>
								{/each}
							{/if}
						</select>

						<p class="mt-2 text-xs text-slate-500">
							Solo aparecen materias correspondientes a esta carrera y a
							{modalYearLevel}° año.
						</p>
					</div>

					<!-- Día -->
					<div class="sm:col-span-2">
						<label for="modalDay" class="mb-2 block text-sm font-semibold text-slate-300">
							Día
						</label>

						<select
							id="modalDay"
							name="dayOfWeek"
							bind:value={modalDay}
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
						>
							{#each dayDefinitions as day}
								<option value={day.value}>
									{day.label}
								</option>
							{/each}
						</select>
					</div>

					<!-- Inicio -->
					<div>
						<label for="modalStartTime" class="mb-2 block text-sm font-semibold text-slate-300">
							Hora de inicio
						</label>

						<select
							id="modalStartTime"
							name="startTime"
							bind:value={modalStartTime}
							onchange={handleStartTimeChange}
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
						>
							{#each getStartOptions() as time}
								<option value={time}>{time}</option>
							{/each}
						</select>
					</div>

					<!-- Fin -->
					<div>
						<label for="modalEndTime" class="mb-2 block text-sm font-semibold text-slate-300">
							Hora de finalización
						</label>

						<select
							id="modalEndTime"
							name="endTime"
							bind:value={modalEndTime}
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
						>
							{#each getEndOptions(modalStartTime) as time}
								<option value={time}>{time}</option>
							{/each}
						</select>
					</div>

					<!-- Comisión -->
					<div class="sm:col-span-2">
						<label for="modalCommissionId" class="mb-2 block text-sm font-semibold text-slate-300">
							Comisión
						</label>

						<select
							id="modalCommissionId"
							name="commissionId"
							bind:value={modalCommissionId}
							disabled={loadingCommissions || !modalSubjectId}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-50"
						>
							<option value="">
								{loadingCommissions
									? 'Cargando comisiones...'
									: 'Sin comisión / seleccionar comisión'}
							</option>

							{#each commissionOptions as commission}
								<option value={commission.id}>
									{commission.code}
								</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Contexto -->
				<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
					<p class="text-xs text-slate-500">Localidad</p>

					<p class="mt-1 font-semibold text-slate-300">
						{modalLocationName || 'Sin localidad seleccionada'}
					</p>
				</div>

				<!-- Acciones -->
				<div
					class="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-between"
				>
					<div>
						{#if selectedSchedule}
							<a
								href={`/configuracion/horarios/${selectedSchedule.id}/editar`}
								class="inline-flex rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
							>
								Edición completa
							</a>
						{:else}
							<a
								href="/configuracion/horarios/nuevo"
								class="inline-flex rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
							>
								Formulario completo
							</a>
						{/if}
					</div>

					<div class="flex flex-col-reverse gap-3 sm:flex-row">
						<button
							type="button"
							onclick={closeSchedule}
							class="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
						>
							Cancelar
						</button>

						<button
							type="submit"
							class="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
						>
							{selectedSchedule ? 'Guardar cambios' : 'Crear horario'}
						</button>
					</div>
				</div>
			</form>
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
