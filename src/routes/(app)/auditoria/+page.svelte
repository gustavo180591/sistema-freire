<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const logs = $derived(data.logs);
	const pagination = $derived(data.pagination);
	const filters = $derived(data.filters);
	const currentFilters = $derived(data.currentFilters);

	// Actualizar URL con filtros
	function updateFilters(newFilters: Record<string, string | null>) {
		const params = new URLSearchParams(page.url.searchParams);
		
		Object.entries(newFilters).forEach(([key, value]) => {
			if (value) {
				params.set(key, value);
			} else {
				params.delete(key);
			}
		});
		
		// Resetear página al cambiar filtros
		params.delete('page');
		
		goto(`/auditoria?${params.toString()}`, { keepFocus: true });
	}

	function changePage(newPage: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', newPage.toString());
		goto(`/auditoria?${params.toString()}`);
	}

	function clearFilters() {
		goto('/auditoria');
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getActionColor(action: string): string {
		const colors: Record<string, string> = {
			'CREATE': 'text-emerald-400 bg-emerald-950/30',
			'UPDATE': 'text-blue-400 bg-blue-950/30',
			'DELETE': 'text-red-400 bg-red-950/30',
			'LOGIN': 'text-green-400 bg-green-950/30',
			'LOGOUT': 'text-slate-400 bg-slate-950/30',
			'DOWNLOAD': 'text-purple-400 bg-purple-950/30',
			'EXPORT': 'text-orange-400 bg-orange-950/30',
			'BLOCKED_ATTEMPT': 'text-red-500 bg-red-950/50 border border-red-800'
		};
		return colors[action] || 'text-slate-400 bg-slate-950/30';
	}

	function getActionLabel(action: string): string {
		const labels: Record<string, string> = {
			'CREATE': 'Crear',
			'UPDATE': 'Actualizar',
			'DELETE': 'Eliminar',
			'LOGIN': 'Iniciar sesión',
			'LOGOUT': 'Cerrar sesión',
			'DOWNLOAD': 'Descargar',
			'EXPORT': 'Exportar',
			'BLOCKED_ATTEMPT': 'Intento bloqueado'
		};
		return labels[action] || action;
	}
</script>

<svelte:head>
	<title>Auditoría | Paulo Freire</title>
</svelte:head>

<div class="space-y-6 p-4 md:p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<p class="text-xs md:text-sm tracking-[0.2em] text-slate-400 uppercase">Seguridad</p>
			<h1 class="text-2xl md:text-3xl font-bold tracking-tight">Auditoría del Sistema</h1>
			<p class="mt-1 text-sm text-slate-400">
				Registro completo de acciones y eventos de seguridad.
			</p>
		</div>
		<div class="text-right">
			<p class="text-sm text-slate-400">Total de registros</p>
			<p class="text-2xl font-bold">{pagination.totalCount.toLocaleString()}</p>
		</div>
	</div>

	<!-- Filtros -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-6">
		<div class="flex flex-wrap items-center gap-2 mb-4">
			<h2 class="text-lg font-semibold">Filtros</h2>
			{#if currentFilters.action || currentFilters.entityType || currentFilters.userId || currentFilters.dateFrom || currentFilters.dateTo}
				<button 
					onclick={clearFilters}
					class="text-sm text-red-400 hover:text-red-300 underline ml-auto"
				>
					Limpiar filtros
				</button>
			{/if}
		</div>
		
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
			<!-- Acción -->
			<div>
				<label for="action" class="block text-sm font-medium text-slate-400 mb-2">Acción</label>
				<select 
					id="action"
					value={currentFilters.action || ''}
					onchange={(e) => updateFilters({ action: e.currentTarget.value || null })}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
				>
					<option value="">Todas</option>
					{#each filters.actions as action}
						<option value={action}>{getActionLabel(action)}</option>
					{/each}
				</select>
			</div>

			<!-- Tipo de Entidad -->
			<div>
				<label for="entityType" class="block text-sm font-medium text-slate-400 mb-2">Entidad</label>
				<select 
					id="entityType"
					value={currentFilters.entityType || ''}
					onchange={(e) => updateFilters({ entityType: e.currentTarget.value || null })}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
				>
					<option value="">Todas</option>
					{#each filters.entityTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>

			<!-- Usuario -->
			<div>
				<label for="userId" class="block text-sm font-medium text-slate-400 mb-2">Usuario</label>
				<select 
					id="userId"
					value={currentFilters.userId || ''}
					onchange={(e) => updateFilters({ userId: e.currentTarget.value || null })}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
				>
					<option value="">Todos</option>
					{#each filters.users as user}
						<option value={user.id}>{user.fullName}</option>
					{/each}
				</select>
			</div>

			<!-- Fecha Desde -->
			<div>
				<label for="dateFrom" class="block text-sm font-medium text-slate-400 mb-2">Desde</label>
				<input 
					id="dateFrom"
					type="date"
					value={currentFilters.dateFrom || ''}
					onchange={(e) => updateFilters({ dateFrom: e.currentTarget.value || null })}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
				/>
			</div>

			<!-- Fecha Hasta -->
			<div>
				<label for="dateTo" class="block text-sm font-medium text-slate-400 mb-2">Hasta</label>
				<input 
					id="dateTo"
					type="date"
					value={currentFilters.dateTo || ''}
					onchange={(e) => updateFilters({ dateTo: e.currentTarget.value || null })}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
				/>
			</div>
		</div>
	</div>

	<!-- Tabla Desktop -->
	<div class="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-4 py-3 text-sm font-semibold">Fecha/Hora</th>
					<th class="px-4 py-3 text-sm font-semibold">Usuario</th>
					<th class="px-4 py-3 text-sm font-semibold">Acción</th>
					<th class="px-4 py-3 text-sm font-semibold">Entidad</th>
					<th class="px-4 py-3 text-sm font-semibold">Descripción</th>
				</tr>
			</thead>
			<tbody>
				{#each logs as log}
					<tr class="border-b border-slate-800 last:border-none hover:bg-slate-800/50">
						<td class="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
							{formatDate(log.createdAt)}
						</td>
						<td class="px-4 py-3">
							{#if log.user}
								<p class="text-sm font-medium">{log.user.fullName}</p>
								<p class="text-xs text-slate-500">{log.user.email}</p>
							{:else}
								<span class="text-sm text-slate-500">Sistema</span>
							{/if}
						</td>
						<td class="px-4 py-3">
							<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium {getActionColor(log.action)}">
								{getActionLabel(log.action)}
							</span>
						</td>
						<td class="px-4 py-3 text-sm">
							<span class="text-slate-300">{log.entityType}</span>
							{#if log.entityId}
								<p class="text-xs text-slate-500 truncate max-w-[100px]">{log.entityId}</p>
							{/if}
						</td>
						<td class="px-4 py-3 text-sm text-slate-300">
							{log.description}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Cards Mobile -->
	<div class="md:hidden space-y-3">
		{#each logs as log}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
				<div class="flex items-start justify-between mb-3">
					<div>
						<p class="text-xs text-slate-400">{formatDate(log.createdAt)}</p>
						{#if log.user}
							<p class="text-sm font-medium mt-1">{log.user.fullName}</p>
						{:else}
							<p class="text-sm text-slate-500 mt-1">Sistema</p>
						{/if}
					</div>
					<span class="inline-flex rounded-full px-2 py-1 text-xs font-medium {getActionColor(log.action)}">
						{getActionLabel(log.action)}
					</span>
				</div>
				<div class="text-sm text-slate-300 mb-2">
					<span class="text-slate-400">Entidad:</span> {log.entityType}
				</div>
				<p class="text-sm text-slate-400">{log.description}</p>
			</div>
		{/each}
	</div>

	<!-- Paginación -->
	{#if pagination.totalPages > 1}
		<div class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
			<button 
				class="rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed {pagination.hasPrev ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-800/50 text-slate-500'}"
				disabled={!pagination.hasPrev}
				onclick={() => changePage(pagination.page - 1)}
			>
				← Anterior
			</button>
			
			<p class="text-sm text-slate-400">
				Página {pagination.page} de {pagination.totalPages}
			</p>
			
			<button 
				class="rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed {pagination.hasNext ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-800/50 text-slate-500'}"
				disabled={!pagination.hasNext}
				onclick={() => changePage(pagination.page + 1)}
			>
				Siguiente →
			</button>
		</div>
	{/if}

	{#if logs.length === 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
			<p class="text-slate-400">No se encontraron registros de auditoría</p>
			{#if currentFilters.action || currentFilters.entityType || currentFilters.userId}
				<button onclick={clearFilters} class="mt-4 text-sm text-emerald-400 hover:text-emerald-300 underline">
					Limpiar filtros
				</button>
			{/if}
		</div>
	{/if}
</div>
