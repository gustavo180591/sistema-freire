<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	let assigningSubject = $state(false);
	let removingSubject = $state<{ subjectId: string; subjectName: string } | null>(null);
	let selectedSubjectId = $state('');
	let editingAssignmentType = $state<{
		subjectId: string;
		subjectName: string;
		currentType: string;
	} | null>(null);

	// Filtros
	let searchQuery = $state('');
	let selectedCareerId = $state('');
	let selectedYear = $state('');
	let selectedAssignmentType = $state('TITULAR');

	interface SubjectByCareer {
		careerId: string;
		careerName: string;
		subjects: Array<{
			id: string;
			code: string;
			name: string;
			yearLevel: number;
			careerId: string;
			careerName: string;
			sortOrder: number;
			isAssigned: boolean;
		}>;
	}

	type Subject = SubjectByCareer['subjects'][number];

	// Obtener años únicos
	const availableYears = $derived(
		data.availableSubjectsByCareer
			.flatMap((career: { subjects: Array<{ yearLevel: number }> }) =>
				career.subjects.map((s) => s.yearLevel)
			)
			.filter((year: number, index: number, self: number[]) => self.indexOf(year) === index)
			.sort((a: number, b: number) => a - b)
	);

	// Filtrar materias
	const filteredSubjectsByCareer = $derived(
		data.availableSubjectsByCareer
			.filter((career: SubjectByCareer) => {
				if (selectedCareerId && career.careerId !== selectedCareerId) return false;
				return true;
			})
			.map((career: SubjectByCareer) => ({
				...career,
				subjects: career.subjects.filter((subject: Subject) => {
					if (selectedYear && subject.yearLevel !== parseInt(selectedYear)) return false;
					if (searchQuery) {
						const query = searchQuery.toLowerCase();
						return (
							subject.code.toLowerCase().includes(query) ||
							subject.name.toLowerCase().includes(query)
						);
					}
					return true;
				})
			}))
			.filter((career: SubjectByCareer) => career.subjects.length > 0)
	);

	// Asignar materia
	async function assignSubject(subjectId: string) {
		selectedSubjectId = subjectId;
		assigningSubject = true;
	}

	// Eliminar materia
	function confirmRemoveSubject(subject: PageData['assignedSubjects'][number]) {
		removingSubject = { subjectId: subject.subjectId, subjectName: subject.name };
	}

	// Editar condición de asignación
	function editAssignmentType(subject: PageData['assignedSubjects'][number]) {
		editingAssignmentType = {
			subjectId: subject.subjectId,
			subjectName: subject.name,
			currentType: subject.assignmentType || 'TITULAR'
		};
	}

	// Cancelar edición
	function cancelEditAssignmentType() {
		editingAssignmentType = null;
	}

	// Volver a la lista
	function goBack() {
		goto('/docentes');
	}

	// Limpiar filtros
	function clearFilters() {
		searchQuery = '';
		selectedCareerId = '';
		selectedYear = '';
	}
</script>

<svelte:head>
	<title>Asignación de Materias | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<button
				onclick={goBack}
				class="mb-4 flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Volver a Docentes
			</button>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Gestión Académica</p>
			<h1 class="text-3xl font-bold tracking-tight">Asignación de Materias</h1>
			<p class="mt-2 text-sm text-slate-400">
				Docente: <span class="font-medium text-white"
					>{data.teacher.lastName}, {data.teacher.firstName}</span
				>
			</p>
		</div>
	</div>

	<!-- Materias Asignadas -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="mb-4 text-xl font-bold text-white">
			Materias Asignadas ({data.assignedSubjects.length})
		</h2>

		{#if data.assignedSubjects.length === 0}
			<div class="py-8 text-center text-slate-400">
				<p>Este docente no tiene materias asignadas</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.assignedSubjects as subject}
					<div
						class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-4"
					>
						<div class="flex-1">
							<div class="flex items-center gap-3">
								<span
									class="rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-medium text-indigo-400"
								>
									{subject.code}
								</span>
								<div>
									<p class="font-medium text-white">{subject.name}</p>
									<p class="text-sm text-slate-400">
										Año {subject.yearLevel} · {subject.careers
											.map((c: { name: string }) => c.name)
											.join(', ')}
									</p>
									<p class="text-sm text-slate-400">
										Condición: <span class="font-medium text-white"
											>{subject.assignmentType === 'TITULAR' ? 'Titular' : 'Suplente'}</span
										>
									</p>
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if editingAssignmentType?.subjectId === subject.subjectId}
								<form
									method="POST"
									action="?/updateAssignmentType"
									use:enhance={() => {
										return async ({ update }) => {
											await update();
											editingAssignmentType = null;
										};
									}}
									class="flex items-center gap-2"
								>
									<input type="hidden" name="teacherId" value={data.teacher.id} />
									<input type="hidden" name="subjectId" value={subject.subjectId} />
									<select
										name="assignmentType"
										class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition outline-none focus:border-slate-500"
									>
										<option
											value="TITULAR"
											selected={editingAssignmentType?.currentType === 'TITULAR'}>Titular</option
										>
										<option
											value="SUPLENTE"
											selected={editingAssignmentType?.currentType === 'SUPLENTE'}>Suplente</option
										>
									</select>
									<button
										type="submit"
										class="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-400 transition-colors hover:bg-emerald-500/20"
									>
										Guardar
									</button>
									<button
										type="button"
										onclick={cancelEditAssignmentType}
										class="rounded-xl bg-slate-700/50 px-3 py-2 text-slate-400 transition-colors hover:bg-slate-700"
									>
										Cancelar
									</button>
								</form>
							{:else}
								<button
									onclick={() => editAssignmentType(subject)}
									class="rounded-xl bg-slate-700/50 px-3 py-2 text-slate-400 transition-colors hover:bg-slate-700"
								>
									Editar
								</button>
								<button
									onclick={() => confirmRemoveSubject(subject)}
									class="rounded-xl bg-red-500/10 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/20"
								>
									Eliminar
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Asignar Nueva Materia -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="mb-4 text-xl font-bold text-white">Asignar Nueva Materia</h2>

		{#if data.error}
			<div class="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-400">
				{data.error}
			</div>
		{/if}

		{#if data.teacherLocation}
			<div class="mb-6 rounded-2xl bg-slate-800/50 p-4">
				<p class="text-sm text-slate-400">
					Localidad de la docente: <span class="font-medium text-white"
						>{data.teacherLocation.name}</span
					>
				</p>
			</div>
		{/if}

		{#if data.availableSubjectsByCareer.length === 0}
			<div class="py-8 text-center text-slate-400">
				<p>No hay materias disponibles para asignar</p>
			</div>
		{:else}
			<!-- Filtros -->
			<div class="mb-6 grid gap-4 md:grid-cols-4">
				<div>
					<label for="search" class="mb-2 block text-sm font-medium text-slate-300">Buscar</label>
					<input
						id="search"
						type="text"
						bind:value={searchQuery}
						placeholder="Código o nombre de materia"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 transition outline-none focus:border-slate-500"
					/>
				</div>
				<div>
					<label for="careerFilter" class="mb-2 block text-sm font-medium text-slate-300"
						>Carrera</label
					>
					<select
						id="careerFilter"
						bind:value={selectedCareerId}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 transition outline-none focus:border-slate-500"
					>
						<option value="">Todas las carreras</option>
						{#each data.availableSubjectsByCareer as career}
							<option value={career.careerId}>{career.careerName}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="yearFilter" class="mb-2 block text-sm font-medium text-slate-300">Año</label>
					<select
						id="yearFilter"
						bind:value={selectedYear}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 transition outline-none focus:border-slate-500"
					>
						<option value="">Todos los años</option>
						{#each availableYears as year}
							<option value={year}>{year}º año</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="assignmentType" class="mb-2 block text-sm font-medium text-slate-300"
						>Condición</label
					>
					<select
						id="assignmentType"
						bind:value={selectedAssignmentType}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 transition outline-none focus:border-slate-500"
					>
						<option value="TITULAR">Titular</option>
						<option value="SUPLENTE">Suplente</option>
					</select>
				</div>
			</div>

			{#if searchQuery || selectedCareerId || selectedYear}
				<button
					onclick={clearFilters}
					class="mb-6 text-sm text-slate-400 transition hover:text-white"
				>
					Limpiar filtros
				</button>
			{/if}

			<!-- Materias agrupadas por carrera -->
			{#if filteredSubjectsByCareer.length === 0}
				<div class="py-8 text-center text-slate-400">
					<p>No hay materias que coincidan con los filtros</p>
				</div>
			{:else}
				{#each filteredSubjectsByCareer as career}
					<div class="mb-8">
						<h3 class="mb-4 text-lg font-bold text-white">{career.careerName}</h3>
						<div class="space-y-3">
							{#each career.subjects as subject}
								<div
									class="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-4"
								>
									<div class="flex-1">
										<div class="flex items-center gap-3">
											<span
												class="rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-medium text-indigo-400"
											>
												{subject.code}
											</span>
											<div>
												<p class="font-medium text-white">{subject.name}</p>
												<p class="text-sm text-slate-400">Año {subject.yearLevel}</p>
											</div>
										</div>
									</div>
									{#if subject.isAssigned}
										<span class="text-sm text-slate-400">Ya asignada</span>
									{:else}
										<form
											method="POST"
											action="?/assignSubject"
											use:enhance={() => {
												return async ({ update }) => {
													await update();
													assigningSubject = false;
													selectedSubjectId = '';
												};
											}}
										>
											<input type="hidden" name="teacherId" value={data.teacher.id} />
											<input type="hidden" name="subjectId" value={subject.id} />
											<input type="hidden" name="assignmentType" value={selectedAssignmentType} />
											<button
												type="submit"
												disabled={assigningSubject}
												class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
											>
												{assigningSubject && selectedSubjectId === subject.id
													? 'Asignando...'
													: 'Asignar'}
											</button>
										</form>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		{/if}
	</div>

	<!-- Mensajes de éxito/error -->
	{#if form?.success}
		<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
			{form.success}
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
			{form.error}
		</div>
	{/if}
</div>

<!-- Modal de Confirmación de Eliminación -->
{#if removingSubject}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8">
			<div class="mb-6 flex items-center space-x-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
					<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-bold text-white">Eliminar Materia</h2>
					<p class="text-sm text-slate-400">Esta acción no se puede deshacer</p>
				</div>
			</div>

			<div class="mb-6 rounded-2xl bg-slate-800/50 p-4">
				<p class="font-medium text-white">{removingSubject.subjectName}</p>
			</div>

			<form
				method="POST"
				action="?/removeSubject"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						removingSubject = null;
					};
				}}
			>
				<input type="hidden" name="subjectId" value={removingSubject.subjectId} />
				<input type="hidden" name="teacherId" value={data.teacher.id} />

				<div class="flex justify-end space-x-4">
					<button
						type="button"
						onclick={() => (removingSubject = null)}
						class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-2xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600"
					>
						Eliminar Materia
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
