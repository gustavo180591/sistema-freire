<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form?: any } = $props();

	let showCreateModal = $state(false);
	let editingHistory = $state<{ id: string; status: string; observations: string } | null>(null);
	let deletingHistory = $state<string | null>(null);

	let newYear = $state(new Date().getFullYear());
	let newStatus = $state('ENROLLED');
	let newObservations = $state('');

	const statusIcons: Record<string, string> = {
		ENROLLED: '📝',
		ACTIVE: '📚',
		PROMOTED: '🎓',
		REPEATED: '🔄',
		DROPPED_OUT: '🚪',
		GRADUATED: '🏆'
	};

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleCreate() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
				showCreateModal = false;
				newYear = new Date().getFullYear();
				newStatus = 'ENROLLED';
				newObservations = '';
			}
		};
	}

	function handleUpdate() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
				editingHistory = null;
			}
		};
	}

	function handleDelete() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
				deletingHistory = null;
			}
		};
	}
</script>

<svelte:head>
	<title>Historial Anual | {data.student.fullName}</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<div class="mb-2 flex items-center gap-2">
					<a
						href="/alumnos/{data.student.id}/historial"
						class="text-sm text-slate-400 transition hover:text-white"
					>
						← Volver al historial
					</a>
				</div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">
					Historial Académico por Ciclo Lectivo
				</p>
				<h1 class="mt-2 text-2xl font-bold md:text-3xl">{data.student.fullName}</h1>
				<p class="mt-1 text-sm text-slate-400">
					DNI: {data.student.dni} · {data.student.career} · Año actual: {data.student.currentYear}°
				</p>
			</div>
			{#if data.canCreate}
				<button
					onclick={() => (showCreateModal = true)}
					class="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Agregar Año Académico
				</button>
			{/if}
		</div>
	</div>

	<!-- Mensajes -->
	{#if form?.error}
		<div class="rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z"
					/>
				</svg>
				<p>{form.error}</p>
			</div>
		</div>
	{/if}

	{#if form?.success}
		<div
			class="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-400"
		>
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
				<p>{form.message}</p>
			</div>
		</div>
	{/if}

	<!-- Historial Académico -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="mb-4 text-lg font-semibold">
			Trayectoria Académica ({data.academicHistory.length})
		</h2>

		{#if data.academicHistory.length === 0}
			<div class="py-12 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800"
				>
					<svg class="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
				</div>
				<p class="text-slate-400">No hay registros académicos</p>
				{#if data.canCreate}
					<p class="mt-1 text-sm text-slate-500">
						Hacé click en "Agregar Año Académico" para comenzar
					</p>
				{/if}
			</div>
		{:else}
			<div class="space-y-4">
				{#each data.academicHistory as history}
					<div
						class="rounded-2xl border border-slate-800 bg-slate-800/50 p-4 transition hover:border-slate-700"
					>
						<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-3">
									<span class="text-2xl font-bold text-white">{history.year}</span>
									<span
										class="rounded-full border px-3 py-1 text-xs font-medium {history.statusColor}"
									>
										{statusIcons[history.status]}
										{history.statusLabel}
									</span>
								</div>
								{#if history.observations}
									<p class="mt-2 text-sm text-slate-400">{history.observations}</p>
								{/if}
								<p class="mt-3 text-xs text-slate-500">
									Creado: {formatDate(history.createdAt)}
									{#if history.updatedAt !== history.createdAt}
										· Actualizado: {formatDate(history.updatedAt)}
									{/if}
								</p>
							</div>
							<div class="flex items-center gap-2">
								{#if data.canUpdate}
									<button
										onclick={() =>
											(editingHistory = {
												id: history.id,
												status: history.status,
												observations: history.observations || ''
											})}
										class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
										title="Editar"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
								{/if}
								{#if data.canDelete}
									<button
										onclick={() => (deletingHistory = history.id)}
										class="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-950/30 hover:text-red-400"
										title="Eliminar"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modal Crear -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
		<div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
			<h3 class="mb-4 text-lg font-semibold">Agregar Año Académico</h3>

			<form method="POST" action="?/create" use:enhance={handleCreate} class="space-y-4">
				<div>
					<label for="year" class="mb-2 block text-sm font-medium text-slate-300">Año</label>
					<input
						id="year"
						name="year"
						type="number"
						bind:value={newYear}
						min="2000"
						max={new Date().getFullYear() + 1}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					/>
				</div>

				<div>
					<label for="status" class="mb-2 block text-sm font-medium text-slate-300">Estado</label>
					<select
						id="status"
						name="status"
						bind:value={newStatus}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					>
						{#each Object.entries(data.statusLabels) as [value, label]}
							<option {value}>{statusIcons[value]} {label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="observations" class="mb-2 block text-sm font-medium text-slate-300"
						>Observaciones (opcional)</label
					>
					<textarea
						id="observations"
						name="observations"
						bind:value={newObservations}
						rows="3"
						placeholder="Detalles sobre el año académico..."
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					></textarea>
				</div>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="flex-1 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
					>
						Guardar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Editar -->
{#if editingHistory}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
		<div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
			<h3 class="mb-4 text-lg font-semibold">Editar Año Académico</h3>

			<form method="POST" action="?/update" use:enhance={handleUpdate} class="space-y-4">
				<input type="hidden" name="historyId" value={editingHistory.id} />

				<div>
					<label for="edit-status" class="mb-2 block text-sm font-medium text-slate-300"
						>Estado</label
					>
					<select
						id="edit-status"
						name="status"
						bind:value={editingHistory.status}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					>
						{#each Object.entries(data.statusLabels) as [value, label]}
							<option {value}>{statusIcons[value]} {label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="edit-observations" class="mb-2 block text-sm font-medium text-slate-300"
						>Observaciones</label
					>
					<textarea
						id="edit-observations"
						name="observations"
						bind:value={editingHistory.observations}
						rows="3"
						placeholder="Detalles sobre el año académico..."
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					></textarea>
				</div>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						onclick={() => (editingHistory = null)}
						class="flex-1 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
					>
						Actualizar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Eliminar -->
{#if deletingHistory}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
		<div class="w-full max-w-md rounded-2xl border border-red-900/50 bg-slate-900 p-6">
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-950/50">
					<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h3 class="text-lg font-semibold">¿Eliminar registro académico?</h3>
			</div>
			<p class="mb-6 text-sm text-slate-400">
				Esta acción no se puede deshacer. El registro se eliminará permanentemente.
			</p>
			<div class="flex gap-3">
				<button
					onclick={() => (deletingHistory = null)}
					class="flex-1 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
				>
					Cancelar
				</button>
				<form method="POST" action="?/delete" use:enhance={handleDelete} class="flex-1">
					<input type="hidden" name="historyId" value={deletingHistory} />
					<button
						type="submit"
						class="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
					>
						Eliminar
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
