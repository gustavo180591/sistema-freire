<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { canManageSubjects } from '$lib/client/permissions';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const subjects = $derived(data?.subjects ?? []);
	const filters = $derived(data?.filters ?? {});
	const subjectTypes = $derived(data?.subjectTypes ?? []);
	const careers = $derived(data?.careers ?? []);
	const accreditationModes = $derived(data?.accreditationModes ?? []);
	const yearLevels = $derived(data?.yearLevels ?? [1, 2, 3, 4, 5, 6, 7]);

	// Helpers para badges
	const subjectTypeLabels: Record<string, string> = {
		COMMON: 'Común',
		CAREER_SPECIFIC: 'Específica',
		EDI: 'EDI'
	};

	const trainingFieldLabels: Record<string, string> = {
		GENERAL: 'General',
		ESPECIFICA: 'Específica',
		PRACTICA: 'Práctica',
		EDI: 'EDI'
	};

	const trainingFieldColors: Record<string, string> = {
		GENERAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
		ESPECIFICA: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
		PRACTICA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
		EDI: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
	};

	const accreditationModeLabels: Record<string, string> = {
		PROMOCIONAL: 'Promocional',
		EXAMEN_FINAL: 'Examen Final',
		PROMOCIONAL_SIN_FINAL: 'Prom. sin Final'
	};

	const accreditationModeColors: Record<string, string> = {
		PROMOCIONAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
		EXAMEN_FINAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
		PROMOCIONAL_SIN_FINAL: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
	};

	// Obtener badge de estado
	function getStatusBadge(active: boolean) {
		if (active) {
			return {
				class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
				text: 'Activo'
			};
		}
		return {
			class: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
			text: 'Inactivo'
		};
	}

	// Verificar si hay filtros activos
	const hasActiveFilters = $derived(
		!!(
			filters.search ||
			filters.yearLevel ||
			filters.subjectType ||
			filters.careerId ||
			filters.accreditationMode ||
			filters.active
		)
	);
</script>

<svelte:head>
	<title>Materias | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Gestión de materias" />
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6">
	<!-- Encabezado -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
				Gestión Académica
			</p>
			<h1 class="text-3xl font-bold tracking-tight text-white">Materias</h1>
			<p class="text-sm text-slate-400">Administración de materias del sistema</p>
		</div>
		{#if canManageSubjects()}
			<a
				href="/materias/nueva"
				class="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:scale-[1.02] hover:bg-slate-100 focus:ring-2 focus:ring-white/50 focus:outline-none"
			>
				<svg
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Nueva materia
			</a>
		{/if}
	</div>

	<!-- Barra de filtros -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<form class="flex flex-wrap items-end gap-3" method="GET">
			<div class="min-w-[200px] flex-1">
				<label for="search" class="sr-only">Buscar materias</label>
				<div class="relative">
					<svg
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<input
						id="search"
						type="text"
						name="search"
						value={filters.search}
						placeholder="Código o nombre..."
						class="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-3 pl-10 text-sm text-slate-300 placeholder-slate-500 transition-all outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
					/>
				</div>
			</div>

			<div>
				<label for="yearLevel" class="sr-only">Filtrar por año</label>
				<select
					id="yearLevel"
					name="yearLevel"
					class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition-all outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
				>
					<option value="">Todos los años</option>
					{#each yearLevels as year}
						<option value={year} selected={filters.yearLevel === year.toString()}>
							Año {year}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="subjectType" class="sr-only">Filtrar por tipo</label>
				<select
					id="subjectType"
					name="subjectType"
					class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition-all outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
				>
					<option value="">Todos los tipos</option>
					{#each subjectTypes as type}
						<option value={type} selected={filters.subjectType === type}>
							{subjectTypeLabels[type] || type}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="careerId" class="sr-only">Filtrar por carrera</label>
				<select
					id="careerId"
					name="careerId"
					class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition-all outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
				>
					<option value="">Todas las carreras</option>
					{#each careers as career}
						<option value={career.id} selected={filters.careerId === career.id}>
							{career.name}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="accreditationMode" class="sr-only">Filtrar por modalidad</label>
				<select
					id="accreditationMode"
					name="accreditationMode"
					class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition-all outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
				>
					<option value="">Todas las modalidades</option>
					{#each accreditationModes as mode}
						<option value={mode} selected={filters.accreditationMode === mode}>
							{accreditationModeLabels[mode] || mode}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="active" class="sr-only">Filtrar por estado</label>
				<select
					id="active"
					name="active"
					class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition-all outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
				>
					<option value="">Todos los estados</option>
					<option value="true" selected={filters.active === 'true'}>Activos</option>
					<option value="false" selected={filters.active === 'false'}>Inactivos</option>
				</select>
			</div>

			<div class="flex gap-2">
				<button
					type="submit"
					class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100 focus:ring-2 focus:ring-white/50 focus:outline-none"
				>
					Filtrar
				</button>
				{#if hasActiveFilters}
					<a
						href="/materias"
						class="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-all hover:bg-slate-800 focus:ring-2 focus:ring-slate-500/50 focus:outline-none"
					>
						Limpiar
					</a>
				{/if}
			</div>
		</form>
	</div>

	<!-- Tabla de materias -->
	<section>
		{#if subjects.length === 0}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
				<div class="flex flex-col items-center gap-4">
					<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
						<svg
							class="h-8 w-8 text-slate-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
							/>
						</svg>
					</div>
					<div class="space-y-1">
						<p class="text-sm font-medium text-white">No hay materias registradas</p>
						<p class="text-sm text-slate-400">Comienza agregando la primera materia al sistema</p>
					</div>
					{#if canManageSubjects()}
						<a
							href="/materias/nueva"
							class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
						>
							<svg
								class="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Nueva materia
						</a>
					{/if}
				</div>
			</div>
		{:else}
			<div class="overflow-x-auto rounded-xl border border-slate-800">
				<table class="w-full min-w-[1200px]">
					<thead class="border-b border-slate-800 bg-slate-800/30">
						<tr>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
								>Código</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
								>Nombre</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
								>Año</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
								>Campo</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
								>Modalidad</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
								>Horas</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
								>Estado</th
							>
							<th
								class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-slate-400 uppercase"
								>Acciones</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800">
						{#each subjects as subject}
							{@const statusBadge = getStatusBadge(subject.active)}
							{@const typeBadge =
								trainingFieldColors[subject.trainingField] || 'bg-slate-500/10 text-slate-400'}
							{@const accreditationBadge =
								accreditationModeColors[subject.accreditationMode] ||
								'bg-slate-500/10 text-slate-400'}
							<tr class="transition-colors hover:bg-slate-800/30">
								<td class="px-4 py-3">
									<span class="font-mono text-sm text-slate-400">{subject.code}</span>
								</td>
								<td class="px-4 py-3">
									<div class="min-w-0">
										<p class="truncate text-sm font-medium text-white" title={subject.name}>
											{subject.name}
										</p>
										{#if subject.isElective}
											<span
												class="mt-1 inline-flex items-center rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400"
												>Optativa</span
											>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-slate-300">Año {subject.yearLevel}</span>
								</td>
								<td class="px-4 py-3">
									<span
										class="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium {typeBadge}"
									>
										{trainingFieldLabels[subject.trainingField] || subject.trainingField}
									</span>
								</td>
								<td class="px-4 py-3">
									<span
										class="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium {accreditationBadge}"
									>
										{accreditationModeLabels[subject.accreditationMode] ||
											subject.accreditationMode}
									</span>
								</td>
								<td class="px-4 py-3">
									<span class="text-sm text-slate-300">
										{subject.hoursPerWeek ? `${subject.hoursPerWeek}h` : '-'}
									</span>
								</td>
								<td class="px-4 py-3">
									<span
										class="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium {statusBadge.class}"
									>
										{statusBadge.text}
									</span>
								</td>
								<td class="px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<a
											href={`/materias/${subject.id}`}
											class="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
											aria-label="Ver detalles de materia"
											title="Ver"
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
												/>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
												/>
											</svg>
										</a>
										{#if canManageSubjects()}
											<a
												href={`/materias/${subject.id}/editar`}
												class="rounded-lg p-2 text-purple-400 transition-colors hover:bg-purple-500/10 hover:text-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
												aria-label="Editar materia"
												title="Editar"
											>
												<svg
													class="h-4 w-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
													/>
												</svg>
											</a>
											{#if subject.active}
												<form method="POST" action="?/deactivate">
													<input type="hidden" name="id" value={subject.id} />
													<button
														type="submit"
														class="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
														aria-label="Desactivar materia"
														title="Desactivar"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															aria-hidden="true"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
															/>
														</svg>
													</button>
												</form>
											{:else}
												<form method="POST" action="?/activate">
													<input type="hidden" name="id" value={subject.id} />
													<button
														type="submit"
														class="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
														aria-label="Activar materia"
														title="Activar"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															aria-hidden="true"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M5 13l4 4L19 7"
															/>
														</svg>
													</button>
												</form>
											{/if}
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
