<script lang="ts">
	let { data, form } = $props();

	const isTeacherMode = $derived(data.examMode === 'TEACHER');

	let selectedCareerId = $state('');
	let selectedLocationId = $state('');
	let selectedSubjectId = $state('');
	let selectedTeacherId = $state('');

	function resetTeacherSelection() {
		selectedTeacherId = '';
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

	const availableTeachers = $derived(
		data.teachers.filter(
			(teacher) =>
				teacher.subjectIds.includes(selectedSubjectId) &&
				teacher.locationIds.includes(selectedLocationId)
		)
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
					responsable. Cada nueva mesa habilita una ventana de inscripción de 72 horas.
				{/if}
			</p>
		</div>

		{#if form?.error}
			<div class="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
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
					La fecha del examen debe ser posterior al cierre de las 72 horas de inscripción.
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
							Docente responsable
						</label>

						{#if isTeacherMode && data.currentTeacher}
							<input type="hidden" name="responsibleTeacherId" value={data.currentTeacher.id} />

							<div class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
								<p class="font-medium text-slate-200">
									{data.currentTeacher.lastName}, {data.currentTeacher.firstName}
									· DNI {data.currentTeacher.dni}
								</p>
								<p class="mt-1 text-xs text-slate-500">
									Quedarás asignado automáticamente como responsable de esta mesa.
								</p>
							</div>
						{:else}
							<select
								id="responsibleTeacherId"
								name="responsibleTeacherId"
								bind:value={selectedTeacherId}
								disabled={!selectedSubjectId || !selectedLocationId}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="">Seleccionar docente...</option>
								{#each availableTeachers as teacher (teacher.id)}
									<option value={teacher.id}>
										{teacher.lastName}, {teacher.firstName} · DNI {teacher.dni}
									</option>
								{/each}
							</select>

							{#if selectedSubjectId && selectedLocationId && availableTeachers.length === 0}
								<p class="mt-2 text-xs text-amber-300">
									No hay docentes activos asignados a esta materia en la sede seleccionada.
								</p>
							{/if}
						{/if}
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

					<div>
						<label for="evaluationDate" class="mb-2 block text-sm font-medium text-slate-300">
							Fecha y hora del examen
						</label>
						<input
							id="evaluationDate"
							name="evaluationDate"
							type="datetime-local"
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
						/>
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
					La inscripción comienza en el momento de crear la mesa y permanece abierta durante
					<strong>72 horas exactas</strong>.
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
			<div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 class="text-xl font-semibold">Mesas registradas</h2>
					<p class="mt-1 text-sm text-slate-400">
						{#if isTeacherMode}
							Últimas {data.mesas.length} mesas en las que figurás como docente responsable.
						{:else}
							Últimas {data.mesas.length} mesas visibles según tu alcance institucional.
						{/if}
					</p>
				</div>
			</div>

			{#if data.mesas.length === 0}
				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
					<p class="font-medium text-slate-300">Todavía no hay mesas de examen registradas.</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.mesas as mesa (mesa.id)}
						<article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
							<div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="text-lg font-semibold text-white">{mesa.title}</h3>
										<span
											class="rounded-full border px-2.5 py-1 text-xs font-semibold {statusClass(
												mesa.status
											)}"
										>
											{statusLabel(mesa.status)}
										</span>
									</div>

									<p class="mt-2 text-sm text-slate-300">
										{mesa.subject.code} · {mesa.subject.name}
									</p>

									<p class="mt-1 text-sm text-slate-400">
										{mesa.career?.name ?? 'Sin carrera'} · {mesa.location?.name ?? 'Sin sede'}
									</p>

									{#if mesa.description}
										<p class="mt-3 max-w-3xl text-sm text-slate-500">
											{mesa.description}
										</p>
									{/if}
								</div>

								<div class="grid shrink-0 gap-3 text-sm sm:grid-cols-2 lg:min-w-[420px]">
									<div class="rounded-xl bg-slate-950 p-3">
										<p class="text-xs text-slate-500">Examen</p>
										<p class="mt-1 font-medium text-slate-200">
											{formatDate(mesa.evaluationDate)}
										</p>
									</div>

									<div class="rounded-xl bg-slate-950 p-3">
										<p class="text-xs text-slate-500">Inscriptos activos</p>
										<p class="mt-1 font-medium text-slate-200">
											{mesa.registeredCount}
										</p>
									</div>

									<div class="rounded-xl bg-slate-950 p-3">
										<p class="text-xs text-slate-500">Docente responsable</p>
										<p class="mt-1 font-medium text-slate-200">
											{mesa.responsibleTeacher
												? `${mesa.responsibleTeacher.lastName}, ${mesa.responsibleTeacher.firstName}`
												: 'Sin responsable explícito'}
										</p>
									</div>

									<div class="rounded-xl bg-slate-950 p-3">
										<p class="text-xs text-slate-500">Creada por</p>
										<p class="mt-1 font-medium text-slate-200">{mesa.createdBy}</p>
									</div>
								</div>
							</div>

							<div
								class="mt-4 grid gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500 sm:grid-cols-2"
							>
								<p>
									Inscripción: {formatDate(mesa.registrationOpensAt)} → {formatDate(
										mesa.registrationClosesAt
									)}
								</p>
								<div class="flex items-center justify-end gap-4">
									<span>
										Escala: {mesa.minPassingScore} / {mesa.maxScore}
									</span>

									<a
										href={`/mesas-examen/${mesa.id}`}
										class="font-semibold text-indigo-600 hover:text-indigo-500"
									>
										Ver mesa
									</a>
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
