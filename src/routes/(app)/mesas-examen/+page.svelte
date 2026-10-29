<script lang="ts">
	import { resolve } from '$app/paths';
	import TeacherSearchSelect from '$lib/components/academic/TeacherSearchSelect.svelte';
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	type ExamPeriod = 'JULY' | 'NOVEMBER_DECEMBER';

	const today = new Date();

	let selectedExamYear = $state(today.getFullYear());
	let selectedExamPeriod = $state<ExamPeriod>(today.getMonth() <= 6 ? 'JULY' : 'NOVEMBER_DECEMBER');

	let showCreateModal = $state(false);

	let createCareerId = $state('');
	let createLocationId = $state('');
	let createSubjectId = $state('');
	let createSubjectName = $state('');

	let firstCallDate = $state('');
	let secondCallDate = $state('');
	let presidentTeacherId = $state('');
	let firstVocalTeacherId = $state('');
	let secondVocalTeacherId = $state('');

	let creatingRowKey = $state<string | null>(null);

	let editingSeriesId = $state<string | null>(null);
	let editFirstCallDate = $state('');
	let editSecondCallDate = $state('');
	let editPresidentTeacherId = $state('');
	let editFirstVocalTeacherId = $state('');
	let editSecondVocalTeacherId = $state('');

	const yearLevels = [1, 2, 3, 4];

	const examYearOptions = $derived(data.examYearConfigs.map((config) => config.year));

	const selectedYearConfig = $derived(
		data.examYearConfigs.find((config) => config.year === selectedExamYear)
	);

	function selectExamYear(year: number) {
		selectedExamYear = year;

		const config = data.examYearConfigs.find((item) => item.year === year);

		if (!config) return;

		if (selectedExamPeriod === 'JULY' && !config.julyEnabled && config.novemberDecemberEnabled) {
			selectedExamPeriod = 'NOVEMBER_DECEMBER';
		}

		if (
			selectedExamPeriod === 'NOVEMBER_DECEMBER' &&
			!config.novemberDecemberEnabled &&
			config.julyEnabled
		) {
			selectedExamPeriod = 'JULY';
		}
	}

	const selectedPeriodLabel = $derived(
		selectedExamPeriod === 'JULY' ? 'Julio · 1 llamado' : 'Noviembre – Diciembre · 2 llamados'
	);

	const selectedDateBounds = $derived(
		selectedExamPeriod === 'JULY'
			? {
					min: `${selectedExamYear}-07-01T00:00`,
					max: `${selectedExamYear}-07-31T23:59`
				}
			: {
					min: `${selectedExamYear}-11-01T00:00`,
					max: `${selectedExamYear}-12-31T23:59`
				}
	);

	function callMatchesSelectedPeriod(call: { evaluationDate: Date | string }) {
		const date = new Date(call.evaluationDate);

		if (date.getFullYear() !== selectedExamYear) {
			return false;
		}

		const month = date.getMonth();

		if (selectedExamPeriod === 'JULY') {
			return month === 6;
		}

		return month === 10 || month === 11;
	}

	function mesaMatchesSelectedPeriod(mesa: (typeof data.mesas)[number]) {
		return (
			callMatchesSelectedPeriod(mesa.firstCall) ||
			(mesa.secondCall ? callMatchesSelectedPeriod(mesa.secondCall) : false)
		);
	}

	const boardGroups = $derived.by(() => {
		const careerIndex = new Map(data.careers.map((career, index) => [career.id, index]));
		const locationIndex = new Map(data.locations.map((location, index) => [location.id, index]));

		return data.careerLocations
			.flatMap((careerLocation) => {
				const career = data.careers.find((item) => item.id === careerLocation.careerId);
				const location = data.locations.find((item) => item.id === careerLocation.locationId);

				if (!career || !location) {
					return [];
				}

				const rows = data.careerSubjects
					.filter((relation) => relation.careerId === career.id)
					.map((relation) => {
						const relatedMesas = data.mesas
							.filter(
								(mesa) =>
									mesa.career?.id === career.id &&
									mesa.location?.id === location.id &&
									mesa.subject.id === relation.subjectId &&
									mesaMatchesSelectedPeriod(mesa)
							)
							.sort(
								(a, b) =>
									new Date(b.firstCall.evaluationDate).getTime() -
									new Date(a.firstCall.evaluationDate).getTime()
							);

						return {
							subject: relation.subject,
							yearLevel: relation.yearLevel,
							mesa: relatedMesas[0] ?? null
						};
					})
					.sort((a, b) => {
						if (a.yearLevel !== b.yearLevel) {
							return a.yearLevel - b.yearLevel;
						}

						return a.subject.name.localeCompare(b.subject.name, 'es');
					});

				if (rows.length === 0) {
					return [];
				}

				return [
					{
						career,
						location,
						rows
					}
				];
			})
			.sort((a, b) => {
				const locationDifference =
					(locationIndex.get(a.location.id) ?? 9999) - (locationIndex.get(b.location.id) ?? 9999);

				if (locationDifference !== 0) {
					return locationDifference;
				}

				return (careerIndex.get(a.career.id) ?? 9999) - (careerIndex.get(b.career.id) ?? 9999);
			});
	});
	function teachersForLocation(locationId: string) {
		return data.teachers.filter((teacher) => teacher.locationIds.includes(locationId));
	}

	function formatDate(value: Date | string) {
		return new Intl.DateTimeFormat('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(new Date(value));
	}

	function formatDeadline(value: Date | string) {
		return new Intl.DateTimeFormat('es-AR', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(new Date(value));
	}

	function teacherName(teacher: { firstName: string; lastName: string } | null | undefined) {
		if (!teacher) {
			return 'Sin asignar';
		}

		return `${teacher.lastName}, ${teacher.firstName}`;
	}

	function openCreateModal(input: {
		careerId: string;
		locationId: string;
		subjectId: string;
		subjectName: string;
	}) {
		createCareerId = input.careerId;
		createLocationId = input.locationId;
		createSubjectId = input.subjectId;
		createSubjectName = input.subjectName;

		firstCallDate = '';
		secondCallDate = '';
		presidentTeacherId = '';
		firstVocalTeacherId = '';
		secondVocalTeacherId = '';

		showCreateModal = true;
	}

	function closeCreateModal() {
		showCreateModal = false;
	}

	function inlineCreateKey(careerId: string, locationId: string, subjectId: string) {
		return `${careerId}:${locationId}:${subjectId}`;
	}

	function inlineCreateFormId(careerId: string, locationId: string, subjectId: string) {
		return `create-exam-table-${careerId}-${locationId}-${subjectId}`;
	}

	function startInlineCreate(input: {
		careerId: string;
		locationId: string;
		subjectId: string;
		subjectName: string;
	}) {
		if (typeof cancelInlineEdit === 'function') cancelInlineEdit();

		createCareerId = input.careerId;
		createLocationId = input.locationId;
		createSubjectId = input.subjectId;
		createSubjectName = input.subjectName;

		firstCallDate = '';
		secondCallDate = '';
		presidentTeacherId = '';
		firstVocalTeacherId = '';
		secondVocalTeacherId = '';

		creatingRowKey = inlineCreateKey(input.careerId, input.locationId, input.subjectId);
	}

	function cancelInlineCreate() {
		creatingRowKey = null;

		firstCallDate = '';
		secondCallDate = '';
		presidentTeacherId = '';
		firstVocalTeacherId = '';
		secondVocalTeacherId = '';
	}

	function toDateTimeLocal(value: Date | string) {
		const date = new Date(value);
		const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

		return localDate.toISOString().slice(0, 16);
	}

	function inlineEditFormId(seriesId: string) {
		return `edit-exam-table-${seriesId}`;
	}

	function startInlineEdit(mesa: (typeof data.mesas)[number]) {
		editingSeriesId = mesa.id;
		editFirstCallDate = toDateTimeLocal(mesa.firstCall.evaluationDate);
		editSecondCallDate = mesa.secondCall ? toDateTimeLocal(mesa.secondCall.evaluationDate) : '';

		editPresidentTeacherId = mesa.presidentTeacher?.id ?? '';
		editFirstVocalTeacherId = mesa.firstVocalTeacher?.id ?? '';
		editSecondVocalTeacherId = mesa.secondVocalTeacher?.id ?? '';
	}

	function cancelInlineEdit() {
		editingSeriesId = null;
		editFirstCallDate = '';
		editSecondCallDate = '';
		editPresidentTeacherId = '';
		editFirstVocalTeacherId = '';
		editSecondVocalTeacherId = '';
	}
</script>

<svelte:head>
	<title>Mesas de examen</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto w-full max-w-[1600px] px-3 py-8 sm:px-4 lg:px-6">
		<div class="mb-8">
			<p class="text-xs font-semibold tracking-[0.15em] text-indigo-400 uppercase">
				Gestión académica
			</p>

			<h1 class="mt-2 text-3xl font-bold">Mesas de examen</h1>

			<p class="mt-2 max-w-4xl text-sm text-slate-400">
				Las materias se organizan por carrera, localidad y año. Cada unidad curricular puede darse
				de alta como mesa de examen con su Presidente, 1.er vocal y 2.º vocal.
			</p>
		</div>

		<div class="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
			<div class="grid gap-5 lg:grid-cols-[auto_1fr]">
				<div>
					<p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Año</p>

					<div class="flex flex-wrap gap-2">
						{#each examYearOptions as year (year)}
							<button
								type="button"
								onclick={() => selectExamYear(year)}
								class={[
									'rounded-xl border px-4 py-2 text-sm font-semibold transition',
									selectedExamYear === year
										? 'border-indigo-400 bg-indigo-500 text-white'
										: 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
								]}
							>
								{year}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
						Turno de examen
					</p>

					<div class="flex flex-wrap gap-2">
						{#if selectedYearConfig?.julyEnabled}
							<button
								type="button"
								onclick={() => {
									selectedExamPeriod = 'JULY';
								}}
								class={[
									'rounded-xl border px-4 py-2 text-sm font-semibold transition',
									selectedExamPeriod === 'JULY'
										? 'border-sky-400 bg-sky-500 text-white'
										: 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
								]}
							>
								Julio
								<span class="ml-1 text-xs opacity-80">· 1 llamado</span>
							</button>
						{/if}

						{#if selectedYearConfig?.novemberDecemberEnabled}
							<button
								type="button"
								onclick={() => {
									selectedExamPeriod = 'NOVEMBER_DECEMBER';
								}}
								class={[
									'rounded-xl border px-4 py-2 text-sm font-semibold transition',
									selectedExamPeriod === 'NOVEMBER_DECEMBER'
										? 'border-violet-400 bg-violet-500 text-white'
										: 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
								]}
							>
								Noviembre – Diciembre
								<span class="ml-1 text-xs opacity-80">· 2 llamados</span>
							</button>
						{/if}
					</div>
				</div>
			</div>

			<div class="mt-4 border-t border-slate-800 pt-4">
				<p class="text-sm text-slate-400">
					Mostrando:
					<strong class="text-white">{selectedExamYear}</strong>
					·
					<strong class="text-white">{selectedPeriodLabel}</strong>
				</p>
			</div>
		</div>

		{#if form?.error}
			<div class="mb-6 rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-red-200">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div
				class="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 font-medium text-emerald-800"
			>
				{form.success}
			</div>
		{/if}

		{#if boardGroups.length === 0}
			<div class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
				<p class="font-medium text-slate-300">
					No hay carreras con materias disponibles en las localidades habilitadas.
				</p>
			</div>
		{:else}
			<div class="space-y-10">
				{#each boardGroups as group (`${group.career.id}:${group.location.id}`)}
					<section class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
						<header class="border-b border-slate-800 bg-slate-950/70 px-5 py-5">
							<p class="text-xs font-semibold tracking-[0.15em] text-indigo-400 uppercase">
								Mesas de examen
							</p>

							<h2 class="mt-1 text-xl font-bold text-white">
								{group.career.name}
							</h2>

							<div class="mt-2 flex flex-wrap items-center gap-2">
								<p class="text-sm text-slate-400">
									Localidad / sede: {group.location.name}
								</p>

								<span
									class="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300"
								>
									{selectedExamYear} · {selectedPeriodLabel}
								</span>
							</div>
						</header>

						<div class="space-y-8 p-3 sm:p-5">
							{#each yearLevels as yearLevel (yearLevel)}
								{@const yearRows = group.rows.filter((row) => row.yearLevel === yearLevel)}

								<div>
									<div class="mb-3 flex items-center justify-between gap-3">
										<h3 class="text-lg font-semibold text-slate-100">
											{yearLevel}º año
										</h3>

										<span
											class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400"
										>
											{yearRows.length} materias
										</span>
									</div>

									{#if yearRows.length === 0}
										<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
											<p class="text-sm text-slate-500">
												No hay materias configuradas para este año.
											</p>
										</div>
									{:else}
										<!-- Escritorio -->
										<div class="hidden overflow-hidden rounded-xl border border-slate-800 md:block">
											<table class="w-full table-fixed border-collapse text-xs xl:text-sm">
												<thead class="bg-slate-950">
													<tr>
														<th class="w-[22%] border-b border-slate-800 px-2 py-3 text-left">
															Unidad Curricular
														</th>

														<th class="w-[11%] border-b border-slate-800 px-2 py-3 text-left">
															1.º llamado
														</th>

														<th class="w-[11%] border-b border-slate-800 px-2 py-3 text-left">
															2.º llamado
														</th>

														<th class="w-[13%] border-b border-slate-800 px-2 py-3 text-left">
															Presidente
														</th>

														<th class="w-[12%] border-b border-slate-800 px-2 py-3 text-left">
															1.er vocal
														</th>

														<th class="w-[12%] border-b border-slate-800 px-2 py-3 text-left">
															2.º vocal
														</th>

														<th class="w-[19%] border-b border-slate-800 px-2 py-3 text-left">
															Acciones
														</th>
													</tr>
												</thead>

												<tbody class="divide-y divide-slate-800">
													{#each yearRows as row (`${group.location.id}:${row.subject.id}`)}
														<tr
															class={row.mesa?.isHidden
																? 'bg-slate-950/70 opacity-65'
																: 'bg-slate-900'}
														>
															<td class="px-2 py-3 align-top">
																<p class="font-semibold break-words text-white">
																	{row.subject.name}
																</p>

																<p class="mt-1 text-[11px] text-slate-500">
																	{row.subject.code}
																</p>

																{#if row.mesa?.isHidden}
																	<span
																		class="mt-2 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
																	>
																		Oculta
																	</span>
																{/if}
															</td>

															<td class="px-2 py-3 align-top text-slate-300">
																{#if row.mesa && editingSeriesId === row.mesa.id}
																	<input
																		form={inlineEditFormId(row.mesa.id)}
																		name="firstCallDate"
																		type="datetime-local"
																		bind:value={editFirstCallDate}
																		required
																		class="w-full rounded-lg border border-sky-500/50 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-sky-400"
																	/>
																{:else if row.mesa}
																	<p class="font-medium">
																		{formatDate(row.mesa.firstCall.evaluationDate)}
																	</p>

																	<p class="mt-1 text-[10px] text-slate-500">
																		Cierre:
																		{formatDeadline(row.mesa.firstCall.registrationClosesAt)}
																	</p>
																{:else if creatingRowKey === inlineCreateKey(group.career.id, group.location.id, row.subject.id)}
																	<input
																		form={inlineCreateFormId(
																			group.career.id,
																			group.location.id,
																			row.subject.id
																		)}
																		name="firstCallDate"
																		type="datetime-local"
																		bind:value={firstCallDate}
																		required
																		class="w-full rounded-lg border border-emerald-500/50 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-emerald-400"
																	/>
																{:else}
																	<span class="text-slate-600">Sin mesa</span>
																{/if}
															</td>

															<td class="px-2 py-3 align-top text-slate-300">
																{#if row.mesa && editingSeriesId === row.mesa.id}
																	<input
																		form={inlineEditFormId(row.mesa.id)}
																		name="secondCallDate"
																		type="datetime-local"
																		bind:value={editSecondCallDate}
																		class="w-full rounded-lg border border-sky-500/50 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-sky-400"
																	/>

																	{#if !row.mesa.secondCall}
																		<p class="mt-1 text-[10px] text-slate-500">
																			Podés agregar el 2.º llamado desde acá.
																		</p>
																	{/if}
																{:else if row.mesa?.secondCall}
																	<p class="font-medium">
																		{formatDate(row.mesa.secondCall.evaluationDate)}
																	</p>

																	<p class="mt-1 text-[10px] text-slate-500">
																		Cierre:
																		{formatDeadline(row.mesa.secondCall.registrationClosesAt)}
																	</p>
																{:else if creatingRowKey === inlineCreateKey(group.career.id, group.location.id, row.subject.id)}
																	{#if selectedExamPeriod === 'NOVEMBER_DECEMBER'}
																		<input
																			form={inlineCreateFormId(
																				group.career.id,
																				group.location.id,
																				row.subject.id
																			)}
																			name="secondCallDate"
																			type="datetime-local"
																			bind:value={secondCallDate}
																			required
																			class="w-full rounded-lg border border-emerald-500/50 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-emerald-400"
																		/>
																	{:else}
																		<span class="text-xs text-sky-300"> Único llamado </span>
																	{/if}
																{:else}
																	<span class="text-slate-600">—</span>
																{/if}
															</td>

															<td class="px-2 py-3 align-top text-slate-300">
																{#if row.mesa && editingSeriesId === row.mesa.id}
																	<TeacherSearchSelect
																		form={inlineEditFormId(row.mesa.id)}
																		name="presidentTeacherId"
																		bind:value={editPresidentTeacherId}
																		teachers={teachersForLocation(group.location.id)}
																		placeholder="Buscar Presidente..."
																		required
																	/>
																{:else if creatingRowKey === inlineCreateKey(group.career.id, group.location.id, row.subject.id)}
																	<TeacherSearchSelect
																		form={inlineCreateFormId(
																			group.career.id,
																			group.location.id,
																			row.subject.id
																		)}
																		name="responsibleTeacherId"
																		bind:value={presidentTeacherId}
																		teachers={teachersForLocation(group.location.id)}
																		placeholder="Buscar Presidente..."
																		required
																	/>
																{:else}
																	{row.mesa ? teacherName(row.mesa.presidentTeacher) : '—'}
																{/if}
															</td>

															<td class="px-2 py-3 align-top text-slate-300">
																{#if row.mesa && editingSeriesId === row.mesa.id}
																	<TeacherSearchSelect
																		form={inlineEditFormId(row.mesa.id)}
																		name="firstVocalTeacherId"
																		bind:value={editFirstVocalTeacherId}
																		teachers={teachersForLocation(group.location.id)}
																		placeholder="Buscar 1.er vocal..."
																		required
																	/>
																{:else if creatingRowKey === inlineCreateKey(group.career.id, group.location.id, row.subject.id)}
																	<TeacherSearchSelect
																		form={inlineCreateFormId(
																			group.career.id,
																			group.location.id,
																			row.subject.id
																		)}
																		name="firstVocalTeacherId"
																		bind:value={firstVocalTeacherId}
																		teachers={teachersForLocation(group.location.id)}
																		placeholder="Buscar 1.er vocal..."
																		required
																	/>
																{:else}
																	{row.mesa ? teacherName(row.mesa.firstVocalTeacher) : '—'}
																{/if}
															</td>

															<td class="px-2 py-3 align-top text-slate-300">
																{#if row.mesa && editingSeriesId === row.mesa.id}
																	<TeacherSearchSelect
																		form={inlineEditFormId(row.mesa.id)}
																		name="secondVocalTeacherId"
																		bind:value={editSecondVocalTeacherId}
																		teachers={teachersForLocation(group.location.id)}
																		placeholder="Buscar 2.º vocal..."
																		required
																	/>
																{:else if creatingRowKey === inlineCreateKey(group.career.id, group.location.id, row.subject.id)}
																	<TeacherSearchSelect
																		form={inlineCreateFormId(
																			group.career.id,
																			group.location.id,
																			row.subject.id
																		)}
																		name="secondVocalTeacherId"
																		bind:value={secondVocalTeacherId}
																		teachers={teachersForLocation(group.location.id)}
																		placeholder="Buscar 2.º vocal..."
																		required
																	/>
																{:else}
																	{row.mesa ? teacherName(row.mesa.secondVocalTeacher) : '—'}
																{/if}
															</td>

															<td class="px-2 py-3 align-top">
																{#if row.mesa && editingSeriesId === row.mesa.id}
																	<form
																		id={inlineEditFormId(row.mesa.id)}
																		method="POST"
																		action="?/update"
																		class="grid grid-cols-2 gap-1.5"
																		use:enhance={() => {
																			return async ({ result, update }) => {
																				await update();

																				if (result.type === 'success') {
																					cancelInlineEdit();
																				}
																			};
																		}}
																	>
																		<input type="hidden" name="seriesId" value={row.mesa.id} />

																		<button
																			type="submit"
																			class="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-2 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
																		>
																			Guardar
																		</button>

																		<button
																			type="button"
																			onclick={cancelInlineEdit}
																			class="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-700"
																		>
																			Cancelar
																		</button>
																	</form>
																{:else}
																	<div class="grid grid-cols-2 gap-1.5">
																		{#if row.mesa}
																			<a
																				href={resolve(`/mesas-examen/${row.mesa.firstCall.id}`)}
																				class="w-full rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1.5 text-center text-[11px] font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
																			>
																				Ver
																			</a>

																			<button
																				type="button"
																				onclick={() => startInlineEdit(row.mesa)}
																				class="w-full rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-[11px] font-semibold text-sky-300 transition hover:bg-sky-500/20"
																			>
																				Editar
																			</button>

																			<form method="POST" action="?/visibility">
																				<input type="hidden" name="seriesId" value={row.mesa.id} />

																				<input
																					type="hidden"
																					name="isHidden"
																					value={row.mesa.isHidden ? 'false' : 'true'}
																				/>

																				<button
																					type="submit"
																					class="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/20"
																				>
																					{row.mesa.isHidden ? 'Mostrar' : 'Ocultar'}
																				</button>
																			</form>
																		{:else}
																			<button
																				type="button"
																				disabled
																				class="w-full cursor-not-allowed rounded-lg border border-slate-800 px-2 py-1.5 text-[11px] font-semibold text-slate-600"
																			>
																				Ver
																			</button>

																			<button
																				type="button"
																				disabled
																				class="w-full cursor-not-allowed rounded-lg border border-slate-800 px-2 py-1.5 text-[11px] font-semibold text-slate-600"
																			>
																				Editar
																			</button>

																			<button
																				type="button"
																				disabled
																				class="w-full cursor-not-allowed rounded-lg border border-slate-800 px-2 py-1.5 text-[11px] font-semibold text-slate-600"
																			>
																				Ocultar
																			</button>
																		{/if}

																		{#if creatingRowKey === inlineCreateKey(group.career.id, group.location.id, row.subject.id)}
																			<form
																				id={inlineCreateFormId(
																					group.career.id,
																					group.location.id,
																					row.subject.id
																				)}
																				method="POST"
																				action="?/create"
																				class="col-span-2 grid grid-cols-2 gap-1.5"
																				use:enhance={() => {
																					return async ({ result, update }) => {
																						await update();

																						if (result.type === 'success') {
																							cancelInlineCreate();
																						}
																					};
																				}}
																			>
																				<input
																					type="hidden"
																					name="careerId"
																					value={group.career.id}
																				/>
																				<input
																					type="hidden"
																					name="locationId"
																					value={group.location.id}
																				/>
																				<input
																					type="hidden"
																					name="subjectId"
																					value={row.subject.id}
																				/>

																				<input
																					type="hidden"
																					name="examYear"
																					value={selectedExamYear}
																				/>

																				<input
																					type="hidden"
																					name="examPeriod"
																					value={selectedExamPeriod}
																				/>

																				<input
																					type="hidden"
																					name="title"
																					value={`Mesa de examen · ${row.subject.name} · ${selectedExamYear}`}
																				/>

																				<input type="hidden" name="maxScore" value="10" />
																				<input type="hidden" name="minPassingScore" value="6" />

																				<button
																					type="submit"
																					class="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-2 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
																				>
																					Dar de alta
																				</button>

																				<button
																					type="button"
																					onclick={cancelInlineCreate}
																					class="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-700"
																				>
																					Cancelar
																				</button>
																			</form>
																		{:else}
																			<button
																				type="button"
																				onclick={() =>
																					startInlineCreate({
																						careerId: group.career.id,
																						locationId: group.location.id,
																						subjectId: row.subject.id,
																						subjectName: row.subject.name
																					})}
																				class="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
																			>
																				Dar de alta
																			</button>
																		{/if}
																	</div>
																{/if}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>

										<!-- Celular / pantalla angosta -->
										<div class="space-y-3 md:hidden">
											{#each yearRows as row (`mobile:${group.location.id}:${row.subject.id}`)}
												<article class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
													<div class="flex items-start justify-between gap-3">
														<div>
															<h4 class="font-semibold text-white">
																{row.subject.name}
															</h4>

															<p class="mt-1 text-xs text-slate-500">
																{row.subject.code}
															</p>
														</div>

														{#if row.mesa?.isHidden}
															<span
																class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300"
															>
																Oculta
															</span>
														{/if}
													</div>

													<div class="mt-4 grid grid-cols-2 gap-3 text-xs">
														<div>
															<p class="font-semibold text-slate-500">1.º llamado</p>
															<p class="mt-1 text-slate-200">
																{row.mesa
																	? formatDate(row.mesa.firstCall.evaluationDate)
																	: 'Sin mesa'}
															</p>
														</div>

														<div>
															<p class="font-semibold text-slate-500">2.º llamado</p>
															<p class="mt-1 text-slate-200">
																{row.mesa?.secondCall
																	? formatDate(row.mesa.secondCall.evaluationDate)
																	: '—'}
															</p>
														</div>

														<div>
															<p class="font-semibold text-slate-500">Presidente</p>
															<p class="mt-1 text-slate-200">
																{row.mesa ? teacherName(row.mesa.presidentTeacher) : '—'}
															</p>
														</div>

														<div>
															<p class="font-semibold text-slate-500">1.er vocal</p>
															<p class="mt-1 text-slate-200">
																{row.mesa ? teacherName(row.mesa.firstVocalTeacher) : '—'}
															</p>
														</div>

														<div>
															<p class="font-semibold text-slate-500">2.º vocal</p>
															<p class="mt-1 text-slate-200">
																{row.mesa ? teacherName(row.mesa.secondVocalTeacher) : '—'}
															</p>
														</div>
													</div>

													<div class="mt-4 grid grid-cols-2 gap-2">
														{#if row.mesa}
															<a
																href={resolve(`/mesas-examen/${row.mesa.firstCall.id}`)}
																class="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-center text-xs font-semibold text-indigo-300"
															>
																Ver
															</a>

															<a
																href={resolve(`/mesas-examen/${row.mesa.firstCall.id}/editar`)}
																class="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-center text-xs font-semibold text-sky-300"
															>
																Editar
															</a>

															<form method="POST" action="?/visibility">
																<input type="hidden" name="seriesId" value={row.mesa.id} />

																<input
																	type="hidden"
																	name="isHidden"
																	value={row.mesa.isHidden ? 'false' : 'true'}
																/>

																<button
																	type="submit"
																	class="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300"
																>
																	{row.mesa.isHidden ? 'Mostrar' : 'Ocultar'}
																</button>
															</form>
														{/if}

														<button
															type="button"
															onclick={() =>
																openCreateModal({
																	careerId: group.career.id,
																	locationId: group.location.id,
																	subjectId: row.subject.id,
																	subjectName: row.subject.name
																})}
															class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300"
														>
															Dar de alta la mesa
														</button>
													</div>
												</article>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
		<div
			class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-mesa-title"
		>
			<div class="mb-6 flex items-start justify-between gap-4">
				<div>
					<p class="text-xs font-semibold tracking-[0.15em] text-emerald-400 uppercase">
						Dar de alta
					</p>

					<h2 id="create-mesa-title" class="mt-1 text-2xl font-bold text-white">
						{createSubjectName}
					</h2>
				</div>

				<button
					type="button"
					onclick={closeCreateModal}
					class="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
				>
					Cerrar
				</button>
			</div>

			<div class="mb-5 flex flex-wrap gap-2">
				<span
					class="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300"
				>
					{selectedExamYear}
				</span>

				<span
					class="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300"
				>
					{selectedPeriodLabel}
				</span>
			</div>

			<form method="POST" action="?/create" class="space-y-6">
				<input type="hidden" name="careerId" value={createCareerId} />
				<input type="hidden" name="locationId" value={createLocationId} />
				<input type="hidden" name="subjectId" value={createSubjectId} />
				<input type="hidden" name="examYear" value={selectedExamYear} />
				<input type="hidden" name="examPeriod" value={selectedExamPeriod} />
				<input
					type="hidden"
					name="title"
					value={`Mesa de examen · ${createSubjectName} · ${selectedPeriodLabel} ${selectedExamYear}`}
				/>
				<input type="hidden" name="maxScore" value="10" />
				<input type="hidden" name="minPassingScore" value="6" />

				<div class="grid gap-5 md:grid-cols-2">
					<div class="md:col-span-2">
						<label for="responsibleTeacherId" class="mb-2 block text-sm font-medium text-slate-300">
							Presidente
						</label>

						<TeacherSearchSelect
							id="responsibleTeacherId"
							name="responsibleTeacherId"
							bind:value={presidentTeacherId}
							teachers={teachersForLocation(createLocationId)}
							placeholder="Buscar Presidente..."
							required
						/>
					</div>

					<div>
						<label for="firstVocalTeacherId" class="mb-2 block text-sm font-medium text-slate-300">
							1.er vocal
						</label>

						<TeacherSearchSelect
							id="firstVocalTeacherId"
							name="firstVocalTeacherId"
							bind:value={firstVocalTeacherId}
							teachers={teachersForLocation(createLocationId)}
							placeholder="Buscar 1.er vocal..."
							required
						/>
					</div>

					<div>
						<label for="secondVocalTeacherId" class="mb-2 block text-sm font-medium text-slate-300">
							2.º vocal
						</label>

						<TeacherSearchSelect
							id="secondVocalTeacherId"
							name="secondVocalTeacherId"
							bind:value={secondVocalTeacherId}
							teachers={teachersForLocation(createLocationId)}
							placeholder="Buscar 2.º vocal..."
							required
						/>
					</div>

					<div>
						<label for="firstCallDate" class="mb-2 block text-sm font-medium text-slate-300">
							1.º llamado
						</label>

						<input
							id="firstCallDate"
							name="firstCallDate"
							type="datetime-local"
							bind:value={firstCallDate}
							min={selectedDateBounds.min}
							max={selectedDateBounds.max}
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
						/>
					</div>

					{#if selectedExamPeriod === 'NOVEMBER_DECEMBER'}
						<div>
							<label for="secondCallDate" class="mb-2 block text-sm font-medium text-slate-300">
								2.º llamado
							</label>

							<input
								id="secondCallDate"
								name="secondCallDate"
								type="datetime-local"
								bind:value={secondCallDate}
								min={selectedDateBounds.min}
								max={selectedDateBounds.max}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
							/>

							<p class="mt-2 text-xs text-slate-500">
								El turno noviembre–diciembre requiere dos llamados.
							</p>
						</div>
					{:else}
						<div class="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-200">
							<p class="font-semibold">Turno julio</p>
							<p class="mt-1 text-xs text-sky-200/80">Este turno tiene un único llamado.</p>
						</div>
					{/if}
				</div>

				<div
					class="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm text-indigo-200"
				>
					Cada llamado cierra automáticamente 72 horas hábiles antes de la fecha y hora del examen.
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={closeCreateModal}
						class="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300"
					>
						Cancelar
					</button>

					<button
						type="submit"
						class="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
					>
						Dar de alta mesa
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
