<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form?: any } = $props();
	
	let showCreateModal = $state(false);
	let deletingFollowUp = $state<string | null>(null);
	let selectedType = $state('NOTE');
	let followUpTitle = $state('');
	let followUpDescription = $state('');
	let followUpDate = $state(new Date().toISOString().split('T')[0]);
	let isAlert = $state(false);
	let filterType = $state('ALL');

	const typeIcons: Record<string, string> = {
		INTERVIEW: '🎤',
		OBSERVATION: '👁️',
		WARNING: '⚠️',
		MEETING: '🤝',
		INCIDENT: '🚨',
		ACHIEVEMENT: '🏆',
		NOTE: '📝'
	};

	const typeColors: Record<string, { bg: string; border: string; text: string }> = {
		INTERVIEW: { bg: 'bg-blue-950/50', border: 'border-blue-800', text: 'text-blue-400' },
		OBSERVATION: { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-400' },
		WARNING: { bg: 'bg-amber-950/50', border: 'border-amber-800', text: 'text-amber-400' },
		MEETING: { bg: 'bg-purple-950/50', border: 'border-purple-800', text: 'text-purple-400' },
		INCIDENT: { bg: 'bg-red-950/50', border: 'border-red-800', text: 'text-red-400' },
		ACHIEVEMENT: { bg: 'bg-emerald-950/50', border: 'border-emerald-800', text: 'text-emerald-400' },
		NOTE: { bg: 'bg-gray-800', border: 'border-gray-700', text: 'text-gray-400' }
	};

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatDateTime(date: Date | string): string {
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
				followUpTitle = '';
				followUpDescription = '';
				selectedType = 'NOTE';
				isAlert = false;
			}
		};
	}

	function handleResolve(followUpId: string) {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
			}
		};
	}

	function handleDelete() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
				deletingFollowUp = null;
			}
		};
	}

	const filteredFollowUps = $derived(
		filterType === 'ALL' 
			? data.followUps 
			: data.followUps.filter(f => f.type === filterType)
	);
</script>

<svelte:head>
	<title>Seguimiento | {data.student.fullName}</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				<div class="flex items-center gap-2 mb-2">
					<a href="/alumnos/{data.student.id}/historial" class="text-sm text-slate-400 hover:text-white transition">
						← Volver al historial
					</a>
				</div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Seguimiento Individual</p>
				<h1 class="mt-2 text-2xl md:text-3xl font-bold">{data.student.fullName}</h1>
				<p class="mt-1 text-sm text-slate-400">
					DNI: {data.student.dni} · {data.student.career}
				</p>
			</div>
			{#if data.canCreate}
				<button
					onclick={() => showCreateModal = true}
					class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 flex items-center gap-2"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Nuevo Seguimiento
				</button>
			{/if}
		</div>
	</div>

	<!-- Stats -->
	<div class="grid gap-4 md:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
			<p class="text-sm text-slate-400">Total</p>
			<p class="mt-1 text-2xl font-bold">{data.stats.total}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
			<p class="text-sm text-slate-400">Alertas</p>
			<p class="mt-1 text-2xl font-bold {data.stats.alerts > 0 ? 'text-amber-400' : ''}">{data.stats.alerts}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
			<p class="text-sm text-slate-400">Alertas pendientes</p>
			<p class="mt-1 text-2xl font-bold {data.stats.unresolvedAlerts > 0 ? 'text-red-400' : ''}">{data.stats.unresolvedAlerts}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
			<p class="text-sm text-slate-400">Último seguimiento</p>
			<p class="mt-1 text-sm font-medium">
				{data.stats.lastFollowUp ? formatDate(data.stats.lastFollowUp) : 'Sin registros'}
			</p>
		</div>
	</div>

	<!-- Mensajes -->
	{#if form?.error}
		<div class="rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p>{form.error}</p>
			</div>
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-400">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				<p>{form.message}</p>
			</div>
		</div>
	{/if}

	<!-- Filtros -->
	<div class="flex flex-wrap gap-2">
		<button
			onclick={() => filterType = 'ALL'}
			class="rounded-full px-3 py-1.5 text-sm transition {filterType === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
		>
			Todos
		</button>
		{#each Object.entries(data.typeLabels) as [type, label]}
			<button
				onclick={() => filterType = type}
				class="rounded-full px-3 py-1.5 text-sm transition {filterType === type ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
			>
				{typeIcons[type]} {label}
			</button>
		{/each}
	</div>

	<!-- Timeline -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="text-lg font-semibold mb-6">Timeline de Seguimiento ({filteredFollowUps.length})</h2>
		
		{#if filteredFollowUps.length === 0}
			<div class="text-center py-12">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
					<svg class="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
				</div>
				<p class="text-slate-400">No hay seguimientos registrados</p>
				{#if data.canCreate}
					<p class="text-sm text-slate-500 mt-1">Hacé click en "Nuevo Seguimiento" para agregar el primero</p>
				{/if}
			</div>
		{:else}
			<div class="relative">
				<!-- Línea vertical -->
				<div class="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-slate-700"></div>
				
				<div class="space-y-6">
					{#each filteredFollowUps as followUp}
						{@const colors = typeColors[followUp.type]}
						<div class="relative flex gap-4 md:gap-6">
							<!-- Ícono en la línea -->
							<div class="relative z-10 flex h-8 w-8 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full border-2 {colors.bg} {colors.border}">
								<span class="text-sm md:text-lg">{typeIcons[followUp.type]}</span>
							</div>
							
							<!-- Contenido -->
							<div class="flex-1 min-w-0">
								<div class="rounded-2xl border border-slate-800 bg-slate-800/50 p-4 {followUp.isAlert && !followUp.isResolved ? 'border-l-4 border-l-red-500' : ''}">
									<!-- Header del item -->
									<div class="flex flex-wrap items-start justify-between gap-2 mb-3">
										<div class="flex items-center gap-2">
											<span class="rounded-full px-2 py-0.5 text-xs font-medium {colors.bg} {colors.text} border {colors.border}">
												{followUp.typeLabel}
											</span>
											{#if followUp.isAlert}
												<span class="rounded-full bg-red-950/50 px-2 py-0.5 text-xs text-red-400 border border-red-800">
													{followUp.isResolved ? 'Resuelta' : 'Alerta'}
												</span>
											{/if}
										</div>
										<span class="text-xs text-slate-500">{formatDate(followUp.date)}</span>
									</div>
									
									<!-- Título y descripción -->
									<h3 class="font-semibold text-white mb-2">{followUp.title}</h3>
									<p class="text-sm text-slate-400 whitespace-pre-wrap">{followUp.description}</p>
									
									<!-- Resuelto por -->
									{#if followUp.isResolved && followUp.resolvedBy}
										<div class="mt-3 p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/50">
											<p class="text-xs text-emerald-400">
												✓ Resuelto por {followUp.resolvedBy}
												{#if followUp.resolvedAt}
													· {formatDateTime(followUp.resolvedAt)}
												{/if}
											</p>
										</div>
									{/if}
									
									<!-- Footer -->
									<div class="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
										<span class="text-xs text-slate-500">Por {followUp.createdBy}</span>
										
										<div class="flex items-center gap-2">
											{#if followUp.isAlert && !followUp.isResolved && data.canResolve}
												<form method="POST" action="?/resolve" use:enhance={() => handleResolve(followUp.id)}>
													<input type="hidden" name="followUpId" value={followUp.id} />
													<button
														type="submit"
														class="rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition"
													>
														Marcar resuelto
													</button>
												</form>
											{/if}
											
											{#if data.canCreate}
												<button
													onclick={() => deletingFollowUp = followUp.id}
													class="rounded-lg p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition"
													title="Eliminar"
												>
													<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
												</button>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Crear Seguimiento -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
		<div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
			<h3 class="text-lg font-semibold mb-4">Nuevo Seguimiento</h3>
			
			<form method="POST" action="?/create" use:enhance={handleCreate} class="space-y-4">
				<div>
					<label for="fu-type" class="mb-2 block text-sm font-medium text-slate-300">Tipo</label>
					<select
						id="fu-type"
						name="type"
						bind:value={selectedType}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					>
						{#each Object.entries(data.typeLabels) as [value, label]}
							<option value={value}>{typeIcons[value]} {label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="fu-title" class="mb-2 block text-sm font-medium text-slate-300">Título</label>
					<input
						id="fu-title"
						type="text"
						name="title"
						bind:value={followUpTitle}
						placeholder="Ej: Entrevista con apoderado, Observación conducta"
						required
						maxlength="200"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					/>
				</div>

				<div>
					<label for="fu-date" class="mb-2 block text-sm font-medium text-slate-300">Fecha</label>
					<input
						id="fu-date"
						type="date"
						name="date"
						bind:value={followUpDate}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					/>
				</div>

				<div>
					<label for="fu-description" class="mb-2 block text-sm font-medium text-slate-300">Descripción</label>
					<textarea
						id="fu-description"
						name="description"
						bind:value={followUpDescription}
						rows="4"
						placeholder="Detalles del seguimiento..."
						required
						maxlength="2000"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					></textarea>
					<p class="mt-1 text-xs text-slate-500">Máximo 2000 caracteres</p>
				</div>

				<div class="flex items-center gap-2">
					<input
						id="fu-alert"
						type="checkbox"
						name="isAlert"
						value="true"
						bind:checked={isAlert}
						class="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
					/>
					<label for="fu-alert" class="text-sm text-slate-300">
						Marcar como alerta importante
					</label>
				</div>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						onclick={() => showCreateModal = false}
						class="flex-1 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={!followUpTitle.trim() || !followUpDescription.trim()}
						class="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Guardar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Eliminar -->
{#if deletingFollowUp}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
		<div class="w-full max-w-md rounded-2xl border border-red-900/50 bg-slate-900 p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-950/50">
					<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				</div>
				<h3 class="text-lg font-semibold">¿Eliminar seguimiento?</h3>
			</div>
			<p class="text-sm text-slate-400 mb-6">
				Esta acción no se puede deshacer.
			</p>
			<div class="flex gap-3">
				<button
					onclick={() => deletingFollowUp = null}
					class="flex-1 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
				>
					Cancelar
				</button>
				<form method="POST" action="?/delete" use:enhance={handleDelete} class="flex-1">
					<input type="hidden" name="followUpId" value={deletingFollowUp} />
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
