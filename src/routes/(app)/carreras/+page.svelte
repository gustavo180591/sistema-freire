<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { canManageCareers, canDeleteCareers } from '$lib/client/permissions';

	interface Career {
		id: string;
		name: string;
		active: boolean;
		plans: number;
		students: number;
	}

	let { data, form }: { data: PageData; form?: { error?: string } } = $props();

	const careers = $derived<Career[]>((data?.careers as Career[]) ?? []);

	let search = $state('');
	let deletingCareer = $state<Career | null>(null);

	// Calcular métricas
	const metrics = $derived(() => {
		const total = careers.length;
		const active = careers.filter((c) => c.active).length;
		const totalPlans = careers.reduce((acc, c) => acc + (c.plans ?? 0), 0);
		const totalStudents = careers.reduce((acc, c) => acc + (c.students ?? 0), 0);
		return { total, active, totalPlans, totalStudents };
	});

	// Cerrar modal cuando la eliminación es exitosa
	$effect(() => {
		if (form && !form.error) {
			deletingCareer = null;
		}
	});

	const filtered = $derived<Career[]>(
		careers.filter((career: Career) => {
			const q = search.toLowerCase();
			return career.name.toLowerCase().includes(q);
		})
	);

	// Limpiar búsqueda
	function clearSearch() {
		search = '';
	}

	// Obtener badge de estado
	function getStatusBadge(active: boolean) {
		if (active) {
			return {
				class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
				text: 'Activa'
			};
		}
		return {
			class: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
			text: 'Inactiva'
		};
	}

	// Verificar si se puede eliminar
	function canDelete(career: Career): boolean {
		return career.plans === 0 && career.students === 0;
	}

	// Obtener mensaje de no eliminación
	function getDeleteDisabledReason(career: Career): string {
		if (career.plans > 0 && career.students > 0) {
			return 'No se puede eliminar: tiene planes y alumnos';
		}
		if (career.plans > 0) {
			return 'No se puede eliminar: tiene planes de estudio';
		}
		if (career.students > 0) {
			return 'No se puede eliminar: tiene alumnos inscriptos';
		}
		return '';
	}
</script>

<svelte:head>
	<title>Carreras | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Gestión institucional de carreras y planes de estudio" />
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6">
	<!-- Encabezado -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
				Secretaría Académica
			</p>
			<h1 class="text-3xl font-bold tracking-tight text-white">Carreras</h1>
			<p class="text-sm text-slate-400">
				Administración de oferta académica, planes de estudio y trazabilidad curricular
			</p>
		</div>
		{#if canManageCareers()}
			<a
				href="/carreras/nueva"
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
				Nueva carrera
			</a>
		{/if}
	</div>

	<!-- Métricas -->
	<div class="grid gap-4 sm:grid-cols-4">
		<div
			class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:bg-slate-900/70"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
					<svg
						class="h-5 w-5 text-blue-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
						/>
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-white">{metrics().total}</p>
					<p class="text-xs text-slate-400">Total Carreras</p>
				</div>
			</div>
		</div>
		<div
			class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:bg-slate-900/70"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
					<svg
						class="h-5 w-5 text-emerald-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-white">{metrics().active}</p>
					<p class="text-xs text-slate-400">Activas</p>
				</div>
			</div>
		</div>
		<div
			class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:bg-slate-900/70"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
					<svg
						class="h-5 w-5 text-purple-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
						/>
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-white">{metrics().totalPlans}</p>
					<p class="text-xs text-slate-400">Planes de Estudio</p>
				</div>
			</div>
		</div>
		<div
			class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:bg-slate-900/70"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
					<svg
						class="h-5 w-5 text-orange-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-white">{metrics().totalStudents}</p>
					<p class="text-xs text-slate-400">Alumnos Vinculados</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Barra de búsqueda -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<div class="relative">
			<label for="search" class="sr-only">Buscar carreras</label>
			<svg
				class="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-500"
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
				placeholder="Buscar por nombre de carrera"
				bind:value={search}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pr-10 pl-12 text-sm text-slate-300 placeholder-slate-500 transition-all outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
			/>
			{#if search}
				<button
					onclick={clearSearch}
					class="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
					aria-label="Limpiar búsqueda"
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
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Tabla de Carreras -->
	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="border-b border-slate-800 bg-slate-800/30">
					<tr>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Carrera
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Planes
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Alumnos
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
					{#if careers.length === 0}
						<tr>
							<td colspan="5" class="px-4 py-12 text-center">
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
												d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
											/>
										</svg>
									</div>
									<div class="space-y-1">
										<p class="text-sm font-medium text-white">No hay carreras registradas</p>
										<p class="text-sm text-slate-400">
											Comienza agregando la primera carrera al sistema
										</p>
									</div>
									{#if canManageCareers()}
										<a
											href="/carreras/nueva"
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
											Nueva carrera
										</a>
									{/if}
								</div>
							</td>
						</tr>
					{:else if filtered.length === 0}
						<tr>
							<td colspan="5" class="px-4 py-12 text-center">
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
												d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
											/>
										</svg>
									</div>
									<div class="space-y-1">
										<p class="text-sm font-medium text-white">No se encontraron resultados</p>
										<p class="text-sm text-slate-400">
											No hay carreras que coincidan con "{search}"
										</p>
									</div>
									<button
										onclick={clearSearch}
										class="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700"
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
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
										Limpiar búsqueda
									</button>
								</div>
							</td>
						</tr>
					{:else}
						{#each filtered as career (career.id)}
							{@const statusBadge = getStatusBadge(career.active)}
							{@const deleteDisabled = !canDelete(career)}
							{@const deleteReason = getDeleteDisabledReason(career)}
							<tr class="transition-colors hover:bg-slate-800/30">
								<td class="px-4 py-3">
									<div class="min-w-0">
										<p class="truncate text-sm font-medium text-white" title={career.name}>
											{career.name}
										</p>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<span class="text-sm text-slate-300">{career.plans ?? 0}</span>
										<span class="text-xs text-slate-500">planes</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<span class="text-sm text-slate-300">{career.students ?? 0}</span>
										<span class="text-xs text-slate-500">alumnos</span>
									</div>
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
											href={`/carreras/${career.id}`}
											class="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
											aria-label="Ver carrera"
											title="Ver carrera"
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
										<a
											href={`/alumnos?carrera=${career.id}`}
											class="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
											aria-label="Ver alumnos de la carrera"
											title="Ver alumnos"
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
													d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
												/>
											</svg>
										</a>
										<a
											href={`/carreras/${career.id}/planes`}
											class="rounded-lg p-2 text-purple-400 transition-colors hover:bg-purple-500/10 hover:text-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
											aria-label="Ver planes de estudio"
											title="Ver planes"
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
													d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
												/>
											</svg>
										</a>
										{#if canDeleteCareers()}
											<button
												onclick={() => (deletingCareer = career)}
												class="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 focus:ring-2 focus:ring-red-500/50 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent"
												aria-label={deleteDisabled ? deleteReason : 'Eliminar carrera'}
												title={deleteDisabled ? deleteReason : 'Eliminar carrera'}
												disabled={deleteDisabled}
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
														d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
													/>
												</svg>
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Modal de Eliminación -->
	{#if deletingCareer}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-modal-title"
		>
			<div class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
				<div class="mb-6 flex items-start gap-4">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
						<svg
							class="h-6 w-6 text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<div class="flex-1">
						<h2 id="delete-modal-title" class="text-lg font-semibold text-white">
							Eliminar Carrera
						</h2>
						<p class="mt-1 text-sm text-slate-400">
							Esta acción no se puede deshacer. La carrera se eliminará permanentemente del sistema.
						</p>
					</div>
				</div>

				<div class="mb-6 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
					<p class="font-medium text-white">{deletingCareer.name}</p>
					<p class="text-sm text-slate-400">
						{deletingCareer.plans} planes • {deletingCareer.students} alumnos
					</p>
				</div>

				{#if form?.error}
					<div class="mb-4 rounded-xl border border-red-900 bg-red-900/10 p-3 text-sm text-red-400">
						{form.error}
					</div>
				{/if}

				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							if (!form?.error) {
								deletingCareer = null;
							}
						};
					}}
				>
					<input type="hidden" name="id" value={deletingCareer.id} />

					<div class="flex justify-end gap-3">
						<button
							type="button"
							onclick={() => (deletingCareer = null)}
							class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-500/50 focus:outline-none"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
						>
							Eliminar Carrera
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
