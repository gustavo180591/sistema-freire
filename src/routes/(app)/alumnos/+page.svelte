<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
	let editingStudent = $state<Student | null>(null);
	let deletingStudent = $state<Student | null>(null);
	let searchQuery = $state('');
	let dischargeReason = $state('');
	let dischargeNotes = $state('');

	// data.selectedLocationId is server-loaded and won't change reactively
	// We use it as initial value for the mutable state selectedLocation
	// svelte-ignore state_referenced_locally
	let selectedLocation = $state(data.selectedLocationId || '');

	// Filtrar estudiantes según búsqueda
	const filteredStudents = $derived(
		data.students.filter((student: any) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			const fullName = `${student.lastName} ${student.firstName}`.toLowerCase();
			return (
				fullName.includes(query) ||
				student.email.toLowerCase().includes(query) ||
				student.dni.toLowerCase().includes(query)
			);
		})
	);

	// Actualizar URL cuando cambia la localidad seleccionada
	function updateLocationFilter(event: Event) {
		const select = event.target as HTMLSelectElement;
		const locationId = select.value;
		const url = new URL(window.location.href);
		if (locationId) {
			url.searchParams.set('localidad', locationId);
		} else {
			url.searchParams.delete('localidad');
		}
		window.location.href = url.toString();
	}

	interface Student {
		id: string;
		userId: string;
		dni: string;
		firstName: string;
		lastName: string;
		email: string;
		career: string;
		careerId: string;
		status: string;
		isBecado: boolean;
		isRecursante: boolean;
		currentYear: number;
		createdAt: Date;
		// Campos extendidos
		birthDate: Date | null;
		bloodType: string | null;
		phone: string | null;
		address: string | null;
		locality: string | null;
		postalCode: string | null;
		highSchool: string | null;
		highSchoolYear: number | null;
		instituteYear: number | null;
		familyContactName: string | null;
		familyContactPhone: string | null;
		familyRelationship: string | null;
	}

	interface FilterData {
		careerId: string;
		careerName: string | null;
	}

	interface MetricCard {
		title: string;
		value: number;
		description: string;
		icon: string;
		color: string;
		bgColor: string;
	}

	// Type assertion for filter data
	const filter = $derived((data as { filter?: FilterData | null }).filter ?? null);

	// Métricas configuradas
	const metrics = $derived<MetricCard[]>([
		{
			title: 'Total Alumnos',
			value: data.students.length,
			description: 'Total de alumnos registrados',
			icon: 'users',
			color: 'text-slate-400',
			bgColor: 'bg-slate-500/10'
		},
		{
			title: 'Activos',
			value: data.students.filter((s: Student) => s.status === 'ACTIVE').length,
			description: 'Alumnos con estado activo',
			icon: 'user-check',
			color: 'text-emerald-400',
			bgColor: 'bg-emerald-500/10'
		},
		{
			title: 'Becados',
			value: data.students.filter((s: Student) => s.isBecado).length,
			description: 'Alumnos con beca activa',
			icon: 'graduation-cap',
			color: 'text-blue-400',
			bgColor: 'bg-blue-500/10'
		},
		{
			title: 'Recursantes',
			value: data.students.filter((s: Student) => s.isRecursante).length,
			description: 'Alumnos en condición de recursante',
			icon: 'arrow-path',
			color: 'text-amber-400',
			bgColor: 'bg-amber-500/10'
		}
	]);

	// Iconos SVG
	const icons: Record<string, string> = {
		users:
			'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		'user-check':
			'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z M9 12l2 2 4-4',
		'graduation-cap': 'M22 10v6M2 10l10-5 10 5-10 5z M12 12v9 M12 21l-7-3 M12 21l7-3',
		'arrow-path':
			'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
		plus: 'M12 4v16m8-8H4',
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		x: 'M6 18L18 6M6 6l12 12',
		eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
		pencil:
			'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
		trash:
			'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
		filter:
			'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
	};

	function getStatusBadgeColor(status: string) {
		switch (status) {
			case 'ACTIVE':
				return 'bg-emerald-950/50 text-emerald-400 border-emerald-800';
			case 'INACTIVE':
				return 'bg-yellow-950/50 text-yellow-400 border-yellow-800';
			case 'SUSPENDED':
				return 'bg-red-950/50 text-red-400 border-red-800';
			case 'GRADUATED':
				return 'bg-blue-950/50 text-blue-400 border-blue-800';
			default:
				return 'bg-slate-800 text-slate-400 border-slate-700';
		}
	}

	function getStatusText(status: string) {
		switch (status) {
			case 'ACTIVE':
				return 'Activo';
			case 'INACTIVE':
				return 'Inactivo';
			case 'SUSPENDED':
				return 'Suspendido';
			case 'GRADUATED':
				return 'Egresado';
			default:
				return status;
		}
	}

	function getStudentTypeBadge(student: Student) {
		if (student.isBecado)
			return { text: 'Becado', color: 'bg-blue-950/50 text-blue-400 border-blue-800' };
		if (student.isRecursante)
			return { text: 'Recursante', color: 'bg-amber-950/50 text-amber-400 border-amber-800' };
		return { text: 'Normal', color: 'bg-slate-800 text-slate-400 border-slate-700' };
	}

	function hasActiveFilters() {
		return searchQuery.trim() !== '' || selectedLocation !== '';
	}

	function clearFilters() {
		searchQuery = '';
		if (selectedLocation) {
			const url = new URL(window.location.href);
			url.searchParams.delete('localidad');
			window.location.href = url.toString();
		}
	}
</script>

<svelte:head>
	<title>Gestión de Alumnos | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex-1">
			<p class="mb-2 text-sm font-semibold tracking-[0.2em] text-indigo-400 uppercase">
				{#if filter}
					<a href="/carreras/{filter.careerId}" class="transition hover:text-indigo-300"
						>{filter.careerName}</a
					>
				{:else}
					Gestión Académica
				{/if}
			</p>
			<h1 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
				{#if filter}
					Alumnos de {filter.careerName}
				{:else}
					Alumnos
				{/if}
			</h1>
			<p class="mt-2 text-sm text-slate-400 sm:text-base">
				{#if filter}
					Mostrando alumnos inscriptos en esta carrera.
				{:else}
					Administración completa del alumnado del instituto.
				{/if}
			</p>
			{#if filter}
				<div class="mt-3">
					<a
						href="/alumnos"
						class="inline-flex items-center gap-1 text-sm text-indigo-400 transition hover:text-indigo-300"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Ver todos los alumnos
					</a>
				</div>
			{/if}
		</div>
		<a
			href="/usuarios/nuevo"
			class="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
			aria-label="Agregar nuevo alumno"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons.plus} />
			</svg>
			Agregar Alumno
		</a>
	</div>

	<!-- Métricas -->
	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{#each metrics as metric}
			<div
				class="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/90"
			>
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<p class="text-sm font-medium text-slate-400">{metric.title}</p>
						<h2 class="mt-3 text-3xl font-bold text-white md:text-4xl">{metric.value}</h2>
						<p class="mt-2 text-xs text-slate-500 md:text-sm">{metric.description}</p>
					</div>
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl {metric.bgColor}"
					>
						<svg
							class="h-6 w-6 {metric.color}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d={icons[metric.icon]}
							/>
						</svg>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Filtros -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div class="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
				{#if data.hasGlobalAccess && data.locations.length > 1}
					<div class="flex items-center gap-2">
						<label
							for="locationFilter"
							class="text-sm font-medium whitespace-nowrap text-slate-300"
						>
							Localidad:
						</label>
						<select
							id="locationFilter"
							bind:value={selectedLocation}
							onchange={updateLocationFilter}
							class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
						>
							<option value="">Todas</option>
							{#each data.locations as location}
								<option value={location.id}>{location.name}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div class="relative flex-1">
					<svg
						class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d={icons.search}
						/>
					</svg>
					<input
						type="text"
						placeholder="Buscar por nombre, email o DNI"
						bind:value={searchQuery}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-4 pl-10 text-sm text-slate-300 placeholder-slate-500 transition outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
					/>
				</div>
			</div>
			{#if hasActiveFilters()}
				<button
					onclick={clearFilters}
					class="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
					aria-label="Limpiar filtros"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons.x} />
					</svg>
					Limpiar
				</button>
			{/if}
		</div>
	</div>

	<!-- Tabla de Alumnos -->
	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-slate-800/50">
					<tr>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							DNI
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Apellido y Nombre
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Carrera
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Año
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Tipo
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Estado
						</th>
						<th
							class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Acciones
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800">
					{#if filteredStudents.length === 0}
						<tr>
							<td colspan="7" class="px-4 py-12">
								<div class="flex flex-col items-center justify-center text-center">
									<div
										class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800"
									>
										<svg
											class="h-8 w-8 text-slate-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d={icons.search}
											/>
										</svg>
									</div>
									<h3 class="text-lg font-semibold text-white">
										{#if data.students.length === 0}
											No hay alumnos registrados
										{:else}
											No se encontraron alumnos
										{/if}
									</h3>
									<p class="mt-1 text-sm text-slate-400">
										{#if data.students.length === 0}
											Comienza agregando el primer alumno al sistema.
										{:else if hasActiveFilters()}
											No hay alumnos que coincidan con los filtros aplicados.
										{:else}
											No hay alumnos que coincidan con "{searchQuery}".
										{/if}
									</p>
									{#if data.students.length === 0}
										<a
											href="/usuarios/nuevo"
											class="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d={icons.plus}
												/>
											</svg>
											Agregar Alumno
										</a>
									{:else if hasActiveFilters()}
										<button
											onclick={clearFilters}
											class="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d={icons.x}
												/>
											</svg>
											Limpiar filtros
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{:else}
						{#each filteredStudents as student}
							<tr class="transition-colors hover:bg-slate-800/30">
								<td class="px-4 py-3 text-sm whitespace-nowrap text-slate-300">
									{student.dni}
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<div class="text-sm font-medium text-white">
										{student.lastName}, {student.firstName}
									</div>
								</td>
								<td
									class="px-4 py-3 text-sm whitespace-nowrap text-slate-300"
									title={student.career}
								>
									<div class="max-w-[200px] truncate">{student.career}</div>
								</td>
								<td class="px-4 py-3 text-sm whitespace-nowrap text-slate-300">
									{student.currentYear || 'En curso'}
								</td>
								<td class="px-4 py-3 text-sm whitespace-nowrap">
									<span
										class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {getStudentTypeBadge(
											student
										).color}"
									>
										{getStudentTypeBadge(student).text}
									</span>
								</td>
								<td class="px-4 py-3 text-sm whitespace-nowrap">
									<span
										class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {getStatusBadgeColor(
											student.status
										)}"
									>
										{getStatusText(student.status)}
									</span>
								</td>
								<td class="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
									<div class="flex items-center justify-end gap-2">
										<a
											href="/alumnos/{student.id}"
											class="inline-flex items-center justify-center rounded-lg p-2 text-emerald-400 transition hover:bg-emerald-950/30 hover:text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
											aria-label="Ver alumno"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d={icons.eye}
												/>
											</svg>
										</a>
										<button
											onclick={() => (editingStudent = student)}
											class="inline-flex items-center justify-center rounded-lg p-2 text-blue-400 transition hover:bg-blue-950/30 hover:text-blue-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
											aria-label="Editar alumno"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d={icons.pencil}
												/>
											</svg>
										</button>
										<button
											onclick={() => (deletingStudent = student)}
											class="inline-flex items-center justify-center rounded-lg p-2 text-red-400 transition hover:bg-red-950/30 hover:text-red-300 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
											aria-label="Eliminar alumno"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d={icons.trash}
												/>
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Modal de Edición -->
	{#if editingStudent}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div
				class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-8"
			>
				<div class="mb-6 flex items-center justify-between">
					<h2 class="text-2xl font-bold text-white">Editar Alumno</h2>
					<button
						onclick={() => (editingStudent = null)}
						class="text-slate-400 transition-colors hover:text-white"
						aria-label="Cerrar modal de edición"
					>
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<form
					method="POST"
					action="/alumnos/editar"
					class="space-y-6"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							editingStudent = null;
						};
					}}
				>
					<input type="hidden" name="id" value={editingStudent.id} />
					<input type="hidden" name="userId" value={editingStudent.userId} />

					<div class="grid gap-6 md:grid-cols-2">
						<div>
							<label for="dni" class="mb-2 block text-sm font-medium text-slate-300">DNI</label>
							<input
								id="dni"
								type="text"
								name="dni"
								value={editingStudent.dni}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								readonly
							/>
						</div>
						<div>
							<label for="email" class="mb-2 block text-sm font-medium text-slate-300">Email</label>
							<input
								id="email"
								type="email"
								name="email"
								value={editingStudent.email}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label for="firstName" class="mb-2 block text-sm font-medium text-slate-300"
								>Nombre</label
							>
							<input
								id="firstName"
								type="text"
								name="firstName"
								value={editingStudent.firstName}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label for="lastName" class="mb-2 block text-sm font-medium text-slate-300"
								>Apellido</label
							>
							<input
								id="lastName"
								type="text"
								name="lastName"
								value={editingStudent.lastName}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300"
								>Carrera</label
							>
							<select
								id="careerId"
								name="careerId"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								{#each data.careers as career}
									<option value={career.id} selected={editingStudent.careerId === career.id}>
										{career.name}
									</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="currentYear" class="mb-2 block text-sm font-medium text-slate-300"
								>Año de Carrera</label
							>
							<select
								id="currentYear"
								name="currentYear"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="1" selected={editingStudent.currentYear === 1}>1° Año</option>
								<option value="2" selected={editingStudent.currentYear === 2}>2° Año</option>
								<option value="3" selected={editingStudent.currentYear === 3}>3° Año</option>
								<option value="4" selected={editingStudent.currentYear === 4}>4° Año</option>
							</select>
						</div>
						<div>
							<label for="status" class="mb-2 block text-sm font-medium text-slate-300"
								>Estado Académico</label
							>
							<select
								id="status"
								name="status"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="ACTIVE" selected={editingStudent.status === 'ACTIVE'}>Activo</option>
								<option value="INACTIVE" selected={editingStudent.status === 'INACTIVE'}
									>Inactivo</option
								>
								<option value="SUSPENDED" selected={editingStudent.status === 'SUSPENDED'}
									>Suspendido</option
								>
								<option value="GRADUATED" selected={editingStudent.status === 'GRADUATED'}
									>Egresado</option
								>
							</select>
						</div>
					</div>

					<!-- Motivo de cambio de estado (solo si cambia el estado) -->
					{#if editingStudent.status !== 'ACTIVE'}
						<div class="space-y-6 border-t border-slate-800 pt-6">
							<h3 class="text-lg font-semibold text-white">Motivo del Estado Actual</h3>
							<div>
								<label for="statusReason" class="mb-2 block text-sm font-medium text-slate-300"
									>Motivo (obligatorio para estados no activos)</label
								>
								<textarea
									id="statusReason"
									name="statusReason"
									rows="3"
									placeholder="Describe el motivo del estado actual del alumno..."
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								></textarea>
							</div>
						</div>
					{/if}

					<!-- Datos Personales -->
					<div class="space-y-6 border-t border-slate-800 pt-6">
						<h3 class="text-lg font-semibold text-white">Datos Personales</h3>
						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="birthDate" class="mb-2 block text-sm font-medium text-slate-300"
									>Fecha de Nacimiento</label
								>
								<input
									id="birthDate"
									name="birthDate"
									type="date"
									value={editingStudent.birthDate
										? new Date(editingStudent.birthDate).toISOString().split('T')[0]
										: ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="bloodType" class="mb-2 block text-sm font-medium text-slate-300"
									>Grupo Sanguíneo</label
								>
								<select
									id="bloodType"
									name="bloodType"
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								>
									<option value="">Seleccionar...</option>
									<option value="O+" selected={editingStudent.bloodType === 'O+'}>O+</option>
									<option value="O-" selected={editingStudent.bloodType === 'O-'}>O-</option>
									<option value="A+" selected={editingStudent.bloodType === 'A+'}>A+</option>
									<option value="A-" selected={editingStudent.bloodType === 'A-'}>A-</option>
									<option value="B+" selected={editingStudent.bloodType === 'B+'}>B+</option>
									<option value="B-" selected={editingStudent.bloodType === 'B-'}>B-</option>
									<option value="AB+" selected={editingStudent.bloodType === 'AB+'}>AB+</option>
									<option value="AB-" selected={editingStudent.bloodType === 'AB-'}>AB-</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Contactos -->
					<div class="space-y-6 border-t border-slate-800 pt-6">
						<h3 class="text-lg font-semibold text-white">Contactos</h3>
						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="phone" class="mb-2 block text-sm font-medium text-slate-300"
									>Teléfono/Celular</label
								>
								<input
									id="phone"
									name="phone"
									type="tel"
									value={editingStudent.phone || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
						</div>
						<div class="space-y-4">
							<h4 class="text-md font-medium text-slate-300">Contacto Familiar</h4>
							<div class="grid gap-6 md:grid-cols-3">
								<div>
									<label
										for="familyContactName"
										class="mb-2 block text-sm font-medium text-slate-300">Nombre del Familiar</label
									>
									<input
										id="familyContactName"
										name="familyContactName"
										type="text"
										value={editingStudent.familyContactName || ''}
										class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									/>
								</div>
								<div>
									<label
										for="familyContactPhone"
										class="mb-2 block text-sm font-medium text-slate-300"
										>Teléfono del Familiar</label
									>
									<input
										id="familyContactPhone"
										name="familyContactPhone"
										type="tel"
										value={editingStudent.familyContactPhone || ''}
										class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									/>
								</div>
								<div>
									<label
										for="familyRelationship"
										class="mb-2 block text-sm font-medium text-slate-300">Parentesco</label
									>
									<select
										id="familyRelationship"
										name="familyRelationship"
										class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									>
										<option value="">Seleccionar...</option>
										<option value="PADRE" selected={editingStudent.familyRelationship === 'PADRE'}
											>Padre</option
										>
										<option value="MADRE" selected={editingStudent.familyRelationship === 'MADRE'}
											>Madre</option
										>
										<option value="TUTOR" selected={editingStudent.familyRelationship === 'TUTOR'}
											>Tutor</option
										>
										<option
											value="HERMANO"
											selected={editingStudent.familyRelationship === 'HERMANO'}>Hermano/a</option
										>
										<option value="ABUELO" selected={editingStudent.familyRelationship === 'ABUELO'}
											>Abuelo/a</option
										>
										<option value="OTRO" selected={editingStudent.familyRelationship === 'OTRO'}
											>Otro</option
										>
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Domicilio -->
					<div class="space-y-6 border-t border-slate-800 pt-6">
						<h3 class="text-lg font-semibold text-white">Domicilio</h3>
						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="address" class="mb-2 block text-sm font-medium text-slate-300"
									>Dirección</label
								>
								<input
									id="address"
									name="address"
									type="text"
									value={editingStudent.address || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="locality" class="mb-2 block text-sm font-medium text-slate-300"
									>Localidad</label
								>
								<input
									id="locality"
									name="locality"
									type="text"
									value={editingStudent.locality || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="postalCode" class="mb-2 block text-sm font-medium text-slate-300"
									>Código Postal</label
								>
								<input
									id="postalCode"
									name="postalCode"
									type="text"
									value={editingStudent.postalCode || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
						</div>
					</div>

					<!-- Datos Educativos -->
					<div class="space-y-6 border-t border-slate-800 pt-6">
						<h3 class="text-lg font-semibold text-white">Datos Educativos</h3>
						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="highSchool" class="mb-2 block text-sm font-medium text-slate-300"
									>Escuela Secundaria</label
								>
								<input
									id="highSchool"
									name="highSchool"
									type="text"
									value={editingStudent.highSchool || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="highSchoolYear" class="mb-2 block text-sm font-medium text-slate-300"
									>Año de Egreso Secundario</label
								>
								<input
									id="highSchoolYear"
									name="highSchoolYear"
									type="number"
									min="1950"
									max={new Date().getFullYear()}
									value={editingStudent.highSchoolYear || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="instituteYear" class="mb-2 block text-sm font-medium text-slate-300"
									>Año de Ingreso al Instituto</label
								>
								<input
									id="instituteYear"
									name="instituteYear"
									type="number"
									min="1950"
									max={new Date().getFullYear() + 1}
									value={editingStudent.instituteYear || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
						</div>
					</div>

					<div class="space-y-3">
						<div class="mb-2 text-sm font-medium text-slate-300">Tipo de Alumno</div>
						<div class="flex items-center space-x-6">
							<div class="flex items-center space-x-3">
								<input
									id="alumnoNormal"
									name="alumnoType"
									type="radio"
									value="normal"
									checked={!editingStudent.isBecado && !editingStudent.isRecursante}
									onchange={() => {
										editingStudent!.isBecado = false;
										editingStudent!.isRecursante = false;
									}}
									class="h-4 w-4 border-slate-600 bg-slate-950 text-blue-600 focus:ring-2 focus:ring-blue-500"
								/>
								<label for="alumnoNormal" class="text-sm text-slate-300"> Normal </label>
							</div>
							<div class="flex items-center space-x-3">
								<input
									id="alumnoBecado"
									name="alumnoType"
									type="radio"
									value="becado"
									checked={editingStudent.isBecado}
									onchange={() => {
										editingStudent!.isBecado = true;
										editingStudent!.isRecursante = false;
									}}
									class="h-4 w-4 border-slate-600 bg-slate-950 text-blue-600 focus:ring-2 focus:ring-blue-500"
								/>
								<label for="alumnoBecado" class="text-sm text-slate-300"> Becado </label>
							</div>
							<div class="flex items-center space-x-3">
								<input
									id="alumnoRecursante"
									name="alumnoType"
									type="radio"
									value="recursante"
									checked={editingStudent.isRecursante}
									onchange={() => {
										editingStudent!.isBecado = false;
										editingStudent!.isRecursante = true;
									}}
									class="h-4 w-4 border-slate-600 bg-slate-950 text-blue-600 focus:ring-2 focus:ring-blue-500"
								/>
								<label for="alumnoRecursante" class="text-sm text-slate-300"> Recursante </label>
							</div>
						</div>
					</div>

					<!-- Sección de restablecimiento de contraseña -->
					<div class="border-t border-slate-800 pt-6">
						<div class="mb-4">
							<h3 class="mb-1 text-lg font-semibold text-white">Restablecer Contraseña</h3>
							<p class="text-sm text-slate-400">
								Dejar en blanco si no deseas cambiar la contraseña.
							</p>
						</div>
						<div>
							<label for="newPassword" class="mb-2 block text-sm font-medium text-slate-300">
								Nueva Contraseña
							</label>
							<input
								id="newPassword"
								type="password"
								name="newPassword"
								placeholder="Ingresar nueva contraseña"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
					</div>

					<div class="flex justify-end space-x-4">
						<button
							type="button"
							onclick={() => (editingStudent = null)}
							class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
						>
							Guardar Cambios
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Modal de Eliminación -->
	{#if deletingStudent}
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
						<h2 class="text-xl font-bold text-white">Eliminar Alumno</h2>
						<p class="text-sm text-slate-400">Esta acción no se puede deshacer</p>
					</div>
				</div>

				<div class="mb-6 rounded-2xl bg-slate-800/50 p-4">
					<p class="font-medium text-white">
						{deletingStudent.lastName}, {deletingStudent.firstName}
					</p>
					<p class="text-sm text-slate-400">DNI: {deletingStudent.dni}</p>
					<p class="text-sm text-slate-400">Email: {deletingStudent.email}</p>
				</div>

				<form
					method="POST"
					action="/alumnos/eliminar"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							deletingStudent = null;
							dischargeReason = '';
							dischargeNotes = '';
						};
					}}
				>
					<input type="hidden" name="id" value={deletingStudent.id} />
					<input type="hidden" name="userId" value={deletingStudent.userId} />

					<div class="mb-4">
						<label for="dischargeReason" class="mb-2 block text-sm font-medium text-slate-300">
							Motivo de baja <span class="text-red-400">*</span>
						</label>
						<select
							id="dischargeReason"
							name="dischargeReason"
							bind:value={dischargeReason}
							required
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
						>
							<option value="">Seleccione un motivo</option>
							<option value="VOLUNTARY_WITHDRAWAL">Retiro voluntario</option>
							<option value="ACADEMIC_DISMISSAL">Baja académica</option>
							<option value="FINANCIAL_DISMISSAL">Baja por situación financiera</option>
							<option value="DISCIPLINARY_DISMISSAL">Baja disciplinaria</option>
							<option value="TRANSFER">Transferencia a otra institución</option>
							<option value="DECEASED">Fallecimiento</option>
							<option value="OTHER">Otro</option>
						</select>
					</div>

					<div class="mb-6">
						<label for="dischargeNotes" class="mb-2 block text-sm font-medium text-slate-300">
							Notas adicionales
						</label>
						<textarea
							id="dischargeNotes"
							name="dischargeNotes"
							bind:value={dischargeNotes}
							rows="3"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
							placeholder="Detalles adicionales sobre la baja..."
						></textarea>
					</div>

					<div class="flex justify-end space-x-4">
						<button
							type="button"
							onclick={() => {
								deletingStudent = null;
								dischargeReason = '';
								dischargeNotes = '';
							}}
							class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={!dischargeReason}
							class="rounded-2xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Eliminar Alumno
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
