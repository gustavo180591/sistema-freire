<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { canManageSecretaries } from '$lib/client/permissions';

	let { data, form }: { data: PageData; form?: any } = $props();
	let searchQuery = $state('');
	let deletingSecretary = $state<Secretary | null>(null);

	interface Secretary {
		id: string;
		dni: string;
		firstName: string;
		lastName: string;
		email: string;
		status: string;
		createdAt: Date;
	}

	// Calcular métricas
	const metrics = $derived(() => {
		const total = data.secretaries.length;
		const active = data.secretaries.filter((s) => s.status === 'ACTIVE').length;
		const inactive = total - active;
		return { total, active, inactive };
	});

	// Filtrar secretarios según búsqueda
	const filteredSecretaries = $derived(
		data.secretaries.filter((secretary: Secretary) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			const fullName = `${secretary.lastName} ${secretary.firstName}`.toLowerCase();
			return fullName.includes(query) || secretary.email.toLowerCase().includes(query);
		})
	);

	// Obtener iniciales del secretario
	function getInitials(firstName: string, lastName: string): string {
		return `${firstName[0]}${lastName[0]}`.toUpperCase();
	}

	// Limpiar búsqueda
	function clearSearch() {
		searchQuery = '';
	}

	// Obtener badge de estado
	function getStatusBadge(status: string) {
		if (status === 'ACTIVE') {
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
</script>

<svelte:head>
	<title>Gestión de Secretarios | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6">
	<!-- Encabezado -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<p class="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
				Gestión Académica
			</p>
			<h1 class="text-3xl font-bold tracking-tight text-white">Secretarios</h1>
			<p class="text-sm text-slate-400">Administración del cuerpo de secretarios del instituto</p>
		</div>
		{#if canManageSecretaries()}
			<a
				href="/usuarios/nuevo?type=SECRETARIA"
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
				Agregar Secretario
			</a>
		{/if}
	</div>

	<!-- Métricas -->
	<div class="grid gap-4 sm:grid-cols-3">
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
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-white">{metrics().total}</p>
					<p class="text-xs text-slate-400">Total Secretarios</p>
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
					<p class="text-xs text-slate-400">Activos</p>
				</div>
			</div>
		</div>
		<div
			class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:bg-slate-900/70"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10">
					<svg
						class="h-5 w-5 text-slate-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-white">{metrics().inactive}</p>
					<p class="text-xs text-slate-400">Inactivos</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Barra de búsqueda -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<div class="relative">
			<label for="search" class="sr-only">Buscar secretarios</label>
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
				placeholder="Buscar por nombre o email"
				bind:value={searchQuery}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pr-10 pl-12 text-sm text-slate-300 placeholder-slate-500 transition-all outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
			/>
			{#if searchQuery}
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

	<!-- Tabla de Secretarios -->
	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="border-b border-slate-800 bg-slate-800/30">
					<tr>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Secretario
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Email
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Estado
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Fecha Alta
						</th>
						<th
							class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-slate-400 uppercase"
						>
							Acciones
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800">
					{#if data.secretaries.length === 0}
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
												d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
											/>
										</svg>
									</div>
									<div class="space-y-1">
										<p class="text-sm font-medium text-white">No hay secretarios registrados</p>
										<p class="text-sm text-slate-400">
											Comienza agregando el primer secretario al sistema
										</p>
									</div>
									{#if canManageSecretaries()}
										<a
											href="/usuarios/nuevo?type=SECRETARIA"
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
											Agregar Secretario
										</a>
									{/if}
								</div>
							</td>
						</tr>
					{:else if filteredSecretaries.length === 0}
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
											No hay secretarios que coincidan con "{searchQuery}"
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
						{#each filteredSecretaries as secretary}
							{@const statusBadge = getStatusBadge(secretary.status)}
							<tr class="transition-colors hover:bg-slate-800/30">
								<td class="px-4 py-3">
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-blue-600 text-sm font-semibold text-white"
										>
											{getInitials(secretary.firstName, secretary.lastName)}
										</div>
										<div class="min-w-0">
											<p
												class="truncate text-sm font-medium text-white"
												title={`${secretary.lastName}, ${secretary.firstName}`}
											>
												{secretary.lastName}, {secretary.firstName}
											</p>
											<p class="text-xs text-slate-500">DNI: {secretary.dni}</p>
										</div>
									</div>
								</td>
								<td class="px-4 py-3">
									<p class="truncate text-sm text-slate-300" title={secretary.email}>
										{secretary.email}
									</p>
								</td>
								<td class="px-4 py-3">
									<span
										class="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium {statusBadge.class}"
									>
										{statusBadge.text}
									</span>
								</td>
								<td class="px-4 py-3">
									<p class="text-sm text-slate-300">
										{new Date(secretary.createdAt).toLocaleDateString('es-AR')}
									</p>
								</td>
								<td class="px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<a
											href="/usuarios/{secretary.id}"
											class="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
											aria-label="Ver secretario"
											title="Ver secretario"
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
											href="/usuarios/{secretary.id}/editar"
											class="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
											aria-label="Editar secretario"
											title="Editar secretario"
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
										<button
											onclick={() => (deletingSecretary = secretary)}
											class="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
											aria-label="Eliminar secretario"
											title="Eliminar secretario"
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
	{#if deletingSecretary}
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
							Eliminar Secretario
						</h2>
						<p class="mt-1 text-sm text-slate-400">
							Esta acción no se puede deshacer. Se eliminará el rol de secretario del usuario.
						</p>
					</div>
				</div>

				<div class="mb-6 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
					<p class="font-medium text-white">
						{deletingSecretary.lastName}, {deletingSecretary.firstName}
					</p>
					<p class="text-sm text-slate-400">{deletingSecretary.email}</p>
				</div>

				<form
					method="POST"
					action="?/deleteSecretary"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							deletingSecretary = null;
						};
					}}
				>
					<input type="hidden" name="id" value={deletingSecretary.id} />

					<div class="flex justify-end gap-3">
						<button
							type="button"
							onclick={() => (deletingSecretary = null)}
							class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-500/50 focus:outline-none"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
						>
							Eliminar Secretario
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
