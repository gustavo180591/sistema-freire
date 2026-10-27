<script lang="ts">
	import { formatExamCallLabel } from '$lib/utils/exam-call-label';
	let { data, form } = $props();

	const isTeacherMode = $derived(data.examMode === 'TEACHER');

	let selectedCareerId = $state('');
	let selectedLocationId = $state('');
	let selectedSubjectId = $state('');
	let selectedPresidentTeacherId = $state('');
	let firstVocalTeacherId = $state('');
	let secondVocalTeacherId = $state('');
	let firstCallDate = $state('');
	let secondCallDate = $state('');

	function resetTeacherSelection() {
		selectedPresidentTeacherId = '';
		firstVocalTeacherId = '';
		secondVocalTeacherId = '';
	}

	/**
	 * Carreras realmente disponibles según las relaciones
	 * Carrera <-> Materia visibles para el usuario.
	 *
	 * En modo DOCENTE, data.careerSubjects ya viene filtrado
	 * desde el servidor con las materias asignadas al docente.
	 */
	const availableCareers = $derived.by(() => {
		const careerIdsWithSubjects = new Set(data.careerSubjects.map((relation) => relation.careerId));

		return data.careers.filter((career) => careerIdsWithSubjects.has(career.id));
	});

	/**
	 * Localidades donde realmente se dicta la carrera seleccionada
	 * y que además están dentro del alcance del usuario.
	 */
	const availableLocationIds = $derived(
		data.careerLocations
			.filter((relation) => relation.careerId === selectedCareerId)
			.map((relation) => relation.locationId)
	);

	const availableLocations = $derived(
		data.locations.filter((location) => availableLocationIds.includes(location.id))
	);

	/**
	 * Materias pertenecientes a la carrera seleccionada.
	 *
	 * Para DOCENTE, careerSubjects contiene solamente sus materias.
	 * Por lo tanto Carrera y Materia quedan vinculadas en ambos sentidos
	 * por la relación CareerSubject.
	 */
	const availableSubjects = $derived.by(() => {
		if (!selectedCareerId) {
			return [];
		}

		const seen = new Set<string>();

		return data.careerSubjects
			.filter((relation) => relation.careerId === selectedCareerId)
			.map((relation) => relation.subject)
			.filter((subject) => {
				if (seen.has(subject.id)) {
					return false;
				}

				seen.add(subject.id);
				return true;
			});
	});

	const availablePresidentTeachers = $derived(
		data.teachers.filter(
			(teacher) =>
				teacher.subjectIds.includes(selectedSubjectId) &&
				teacher.locationIds.includes(selectedLocationId)
		)
	);

	const availableTribunalTeachers = $derived(
		data.teachers.filter((teacher) => teacher.locationIds.includes(selectedLocationId))
	);

	function formatDate(value: Date | string) {
		return new Intl.DateTimeFormat('es-AR', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function statusLabel(status: string) {
		const labels: Record<string, string> = {
			CERRADA: 'Cerrada',
			FINALIZADA: 'Finalizada',
			PROGRAMADA: 'Programada',
			INSCRIPCION_ABIERTA: 'Inscripción abierta',
			INSCRIPCION_CERRADA: 'Inscripción cerrada'
		};

		return labels[status] ?? status;
	}

	function statusClass(status: string) {
		if (status === 'INSCRIPCION_ABIERTA') {
			return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
		}

		if (status === 'CERRADA' || status === 'FINALIZADA') {
			return 'border-slate-600 bg-slate-800 text-slate-300';
		}

		if (status === 'INSCRIPCION_CERRADA') {
			return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
		}

		return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300';
	}
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-8">
			<p class="text-xs font-semibold tracking-[0.15em] text-indigo-400 uppercase">
				Gestión académica
			</p>
			<h1 class="mt-2 text-3xl font-bold">Mesas de examen</h1>
			<p class="mt-2 max-w-3xl text-sm text-slate-400">
				{#if isTeacherMode}
					Creá mesas únicamente para tus materias y sedes asignadas. Al crear una mesa, quedarás
					automáticamente como docente responsable.
				{:else}
					Creá y consultá mesas institucionales definiendo carrera, sede, materia y docente
					responsable. Cada nueva mesa permite inscripciones hasta 72 horas hábiles antes de la
					fecha del examen.
				{/if}
			</p>
		</div>

		{#if form?.error}
			<div class="mb-6 rounded-2xl border border-red-500/40 p-4 text-red-900">
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

		<section class="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<div class="mb-6">
				<h2 class="text-xl font-semibold">Nueva mesa de examen</h2>
				<p class="mt-1 text-sm text-slate-400">
					La inscripción de cada llamado cierra automáticamente 72 horas hábiles antes de su fecha y
					hora.
				</p>
			</div>

			<form method="POST" action="?/create" class="space-y-6">
				<div class="grid gap-5 md:grid-cols-2">
					<div>
						<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300">
							Carrera
						</label>
						<select
							id="careerId"
							name="careerId"
							bind:value={selectedCareerId}
							onchange={() => {
								selectedLocationId = '';
								selectedSubjectId = '';
								resetTeacherSelection();
							}}
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
						>
							<option value="">Seleccionar carrera...</option>
							{#each availableCareers as career (career.id)}
								<option value={career.id}>{career.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="locationId" class="mb-2 block text-sm font-medium text-slate-300">
							Sede / localidad
						</label>
						<select
							id="locationId"
							name="locationId"
							bind:value={selectedLocationId}
							onchange={() => {
								selectedSubjectId = '';
								resetTeacherSelection();
							}}
							disabled={!selectedCareerId}
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="">Seleccionar sede...</option>
							{#each availableLocations as location (location.id)}
								<option value={location.id}>
									{location.name}{location.city ? ` · ${location.city}` : ''}
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="subjectId" class="mb-2 block text-sm font-medium text-slate-300">
							Materia
						</label>
						<select
							id="subjectId"
							name="subjectId"
							bind:value={selectedSubjectId}
							onchange={() => {
								resetTeacherSelection();
							}}
							disabled={!selectedCareerId}
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="">Seleccionar materia...</option>
							{#each availableSubjects as subject (subject.id)}
								<option value={subject.id}>
									{subject.code} · {subject.name} · {subject.yearLevel}º año
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="responsibleTeacherId" class="mb-2 block text-sm font-medium text-slate-300">
							Presidente
						</label>

						{#if isTeacherMode && data.currentTeacher}
							<input type="hidden" name="responsibleTeacherId" value={data.currentTeacher.id} />

							<div class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
								<p class="font-medium text-slate-200">
									{data.currentTeacher.lastName}, {data.currentTeacher.firstName}
									· DNI {data.currentTeacher.dni}
								</p>
								<p class="mt-1 text-xs text-slate-500">
									Quedarás asignado automáticamente como Presidente de esta mesa.
								</p>
							</div>
						{:else}
							<select
								id="responsibleTeacherId"
								name="responsibleTeacherId"
								bind:value={selectedPresidentTeacherId}
								disabled={!selectedSubjectId || !selectedLocationId}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="">Seleccionar docente...</option>
								{#each availablePresidentTeachers as teacher (teacher.id)}
									<option value={teacher.id}>
										{teacher.lastName}, {teacher.firstName} · DNI {teacher.dni}
									</option>
								{/each}
							</select>

							{#if selectedSubjectId && selectedLocationId && availablePresidentTeachers.length === 0}
								<p class="mt-2 text-xs text-amber-300">
									No hay docentes activos asignados a esta materia en la sede seleccionada.
								</p>
							{/if}
						{/if}
					</div>
					<div>
						<label for="firstVocalTeacherId" class="mb-2 block text-sm font-medium text-slate-300">
							1.er vocal
							<span class="font-normal text-slate-500">(opcional)</span>
						</label>

						<select
							id="firstVocalTeacherId"
							name="firstVocalTeacherId"
							bind:value={firstVocalTeacherId}
							disabled={!selectedLocationId}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="">Sin asignar...</option>
							{#each availableTribunalTeachers as teacher (teacher.id)}
								<option value={teacher.id}>
									{teacher.lastName}, {teacher.firstName} · DNI {teacher.dni}
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="secondVocalTeacherId" class="mb-2 block text-sm font-medium text-slate-300">
							2.º vocal
							<span class="font-normal text-slate-500">(opcional)</span>
						</label>

						<select
							id="secondVocalTeacherId"
							name="secondVocalTeacherId"
							bind:value={secondVocalTeacherId}
							disabled={!selectedLocationId}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="">Sin asignar...</option>
							{#each availableTribunalTeachers as teacher (teacher.id)}
								<option value={teacher.id}>
									{teacher.lastName}, {teacher.firstName} · DNI {teacher.dni}
								</option>
							{/each}
						</select>
					</div>

					<div class="md:col-span-2">
						<label for="title" class="mb-2 block text-sm font-medium text-slate-300">
							Título
						</label>
						<input
							id="title"
							name="title"
							type="text"
							required
							placeholder="Ej: Mesa ordinaria de septiembre"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
						/>
					</div>

					<div class="md:col-span-2">
						<label for="description" class="mb-2 block text-sm font-medium text-slate-300">
							Descripción
						</label>
						<textarea
							id="description"
							name="description"
							rows="3"
							placeholder="Observaciones o información adicional..."
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
						></textarea>
					</div>

					<div class="md:col-span-2">
						<div class="mb-3">
							<p class="text-sm font-semibold text-slate-200">Fechas de examen</p>
							<p class="mt-1 text-xs text-slate-500">
								El primer llamado es obligatorio. Completá el segundo solamente si esta mesa tendrá
								dos llamados.
							</p>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<div class="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
								<p class="mb-3 text-sm font-semibold text-indigo-300">
									{formatExamCallLabel(1, firstCallDate)}
								</p>

								<label for="firstCallDate" class="mb-2 block text-sm font-medium text-slate-300">
									Fecha y hora del primer llamado
								</label>

								<input
									id="firstCallDate"
									name="firstCallDate"
									type="datetime-local"
									bind:value={firstCallDate}
									required
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
								/>
							</div>

							<div class="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
								<p class="mb-3 text-sm font-semibold text-violet-300">
									{formatExamCallLabel(2, secondCallDate)}
								</p>

								<label for="secondCallDate" class="mb-2 block text-sm font-medium text-slate-300">
									Fecha y hora del segundo llamado
									<span class="font-normal text-slate-500">(opcional)</span>
								</label>

								<input
									id="secondCallDate"
									name="secondCallDate"
									type="datetime-local"
									bind:value={secondCallDate}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
								/>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="maxScore" class="mb-2 block text-sm font-medium text-slate-300">
								Nota máxima
							</label>
							<input
								id="maxScore"
								name="maxScore"
								type="number"
								min="1"
								step="0.01"
								value="10"
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
							/>
						</div>

						<div>
							<label for="minPassingScore" class="mb-2 block text-sm font-medium text-slate-300">
								Nota mínima
							</label>
							<input
								id="minPassingScore"
								name="minPassingScore"
								type="number"
								min="0"
								step="0.01"
								value="6"
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
							/>
						</div>
					</div>
				</div>

				<div class="rounded-xl border border-violet-300 bg-violet-50 p-4 text-sm text-violet-800">
					Cada llamado tiene su propio período de inscripción. El cierre se calcula automáticamente
					<strong>72 horas hábiles antes de cada examen</strong>, respetando los días laborables y
					feriados configurados.
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						class="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500"
					>
						Crear mesa de examen
					</button>
				</div>
			</form>
		</section>

		<section>
			<div class="mb-5">
				<h2 class="text-xl font-semibold">Mesas de examen registradas</h2>
				<p class="mt-1 text-sm text-slate-400">
					Cada fila representa una mesa completa. El primer y segundo llamado se muestran juntos.
				</p>
			</div>

			{#if data.mesas.length === 0}
				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
					<p class="font-medium text-slate-300">Todavía no hay mesas de examen registradas.</p>
				</div>
			{:else}
				{@const careerLocationKeys = [
					...new Set(
						data.mesas.map((mesa) => `${mesa.career?.id ?? 'none'}:${mesa.location?.id ?? 'none'}`)
					)
				]}

				<div class="space-y-10">
					{#each careerLocationKeys as groupKey (groupKey)}
						{@const groupMesas = data.mesas.filter(
							(mesa) => `${mesa.career?.id ?? 'none'}:${mesa.location?.id ?? 'none'}` === groupKey
						)}
						{@const groupFirst = groupMesas[0]}
						{@const yearLevels = [
							...new Set(groupMesas.map((mesa) => mesa.subject.yearLevel))
						].sort((a, b) => a - b)}

						<section class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
							<header class="border-b border-slate-800 bg-slate-950/70 px-5 py-4">
								<p class="text-xs font-semibold tracking-[0.15em] text-indigo-400 uppercase">
									Mesas de exámenes
								</p>
								<h3 class="mt-1 text-xl font-bold text-white">
									{groupFirst.career?.name ?? 'Sin carrera'}
								</h3>
								<p class="mt-1 text-sm text-slate-400">
									Localidad / sede: {groupFirst.location?.name ?? 'Sin sede'}
								</p>
							</header>

							<div class="space-y-8 p-4 sm:p-5">
								{#each yearLevels as yearLevel (yearLevel)}
									{@const yearMesas = groupMesas
										.filter((mesa) => mesa.subject.yearLevel === yearLevel)
										.sort((a, b) => a.subject.name.localeCompare(b.subject.name, 'es'))}

									<div>
										<div class="mb-3 flex items-center justify-between gap-3">
											<h4 class="text-lg font-semibold text-slate-100">
												{yearLevel}º año
											</h4>

											<span
												class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400"
											>
												{yearMesas.length} mesas
											</span>
										</div>

										<div class="overflow-x-auto rounded-xl border border-slate-800">
											<table class="w-full min-w-[1280px] border-collapse text-sm">
												<thead class="bg-slate-950">
													<tr>
														<th class="border-b border-slate-800 px-3 py-3 text-left">Año</th>
														<th class="border-b border-slate-800 px-3 py-3 text-left">
															Unidad Curricular
														</th>
														<th class="border-b border-slate-800 px-3 py-3 text-left">
															1.º llamado
														</th>
														<th class="border-b border-slate-800 px-3 py-3 text-left">
															2.º llamado
														</th>
														<th class="border-b border-slate-800 px-3 py-3 text-left">
															Presidente
														</th>
														<th class="border-b border-slate-800 px-3 py-3 text-left">
															1.er vocal
														</th>
														<th class="border-b border-slate-800 px-3 py-3 text-left">
															2.º vocal
														</th>
														<th class="border-b border-slate-800 px-3 py-3 text-left">
															Acciones
														</th>
													</tr>
												</thead>

												<tbody class="divide-y divide-slate-800">
													{#each yearMesas as mesa (mesa.id)}
														<tr
															class={mesa.isHidden ? 'bg-slate-950/70 opacity-65' : 'bg-slate-900'}
														>
															<td class="px-3 py-4 font-semibold text-slate-300">
																{mesa.subject.yearLevel}º
															</td>

															<td class="px-3 py-4">
																<p class="font-semibold text-white">{mesa.subject.name}</p>
																<p class="mt-1 text-xs text-slate-500">
																	{mesa.subject.code}
																</p>
																{#if mesa.isHidden}
																	<span
																		class="mt-2 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
																	>
																		Oculta
																	</span>
																{/if}
															</td>

															<td class="px-3 py-4 text-slate-300">
																<p class="font-medium">
																	{formatDate(mesa.firstCall.evaluationDate)}
																</p>
																<p class="mt-1 text-xs text-slate-500">
																	Cierra: {formatDate(mesa.firstCall.registrationClosesAt)}
																</p>
															</td>

															<td class="px-3 py-4 text-slate-300">
																{#if mesa.secondCall}
																	<p class="font-medium">
																		{formatDate(mesa.secondCall.evaluationDate)}
																	</p>
																	<p class="mt-1 text-xs text-slate-500">
																		Cierra: {formatDate(mesa.secondCall.registrationClosesAt)}
																	</p>
																{:else}
																	<span class="text-slate-600">—</span>
																{/if}
															</td>

															<td class="px-3 py-4 text-slate-300">
																{#if mesa.presidentTeacher}
																	{mesa.presidentTeacher.lastName},
																	{mesa.presidentTeacher.firstName}
																{:else}
																	<span class="text-slate-600">Sin asignar</span>
																{/if}
															</td>

															<td class="px-3 py-4 text-slate-300">
																{#if mesa.firstVocalTeacher}
																	{mesa.firstVocalTeacher.lastName},
																	{mesa.firstVocalTeacher.firstName}
																{:else}
																	<span class="text-slate-600">Sin asignar</span>
																{/if}
															</td>

															<td class="px-3 py-4 text-slate-300">
																{#if mesa.secondVocalTeacher}
																	{mesa.secondVocalTeacher.lastName},
																	{mesa.secondVocalTeacher.firstName}
																{:else}
																	<span class="text-slate-600">Sin asignar</span>
																{/if}
															</td>

															<td class="px-3 py-4">
																<div class="flex flex-wrap gap-2">
																	<a
																		href={`/mesas-examen/${mesa.firstCall.id}`}
																		class="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
																	>
																		Ver
																	</a>

																	<button
																		type="button"
																		disabled
																		title="La edición de la serie se habilita en el siguiente bloque"
																		class="cursor-not-allowed rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-500"
																	>
																		Editar
																	</button>

																	<form method="POST" action="?/visibility">
																		<input type="hidden" name="seriesId" value={mesa.id} />
																		<input
																			type="hidden"
																			name="isHidden"
																			value={mesa.isHidden ? 'false' : 'true'}
																		/>

																		<button
																			type="submit"
																			class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
																		>
																			{mesa.isHidden ? 'Mostrar' : 'Ocultar'}
																		</button>
																	</form>
																</div>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
								{/each}
							</div>
						</section>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
