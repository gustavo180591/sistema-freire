<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	const users = $derived(data.users);
	let search = $state('');
	let editingUser = $state<User | null>(null);
	let deletingUser = $state<User | null>(null);

	interface User {
		id: string;
		fullName: string;
		email: string;
		role: string;
		status: string;
	}

	const filtered = $derived(
		users.filter((user) => {
			const q = search.toLowerCase();
			return (
				user.fullName.toLowerCase().includes(q) ||
				user.email.toLowerCase().includes(q) ||
				user.role.toLowerCase().includes(q)
			);
		})
	);
</script>

<svelte:head>
	<title>Usuarios | Paulo Freire</title>
</svelte:head>

<div class="space-y-8">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Administración</p>
			<h1 class="text-3xl font-bold tracking-tight">Gestión de usuarios</h1>
			<p class="mt-2 text-sm text-slate-400">
				Alta institucional, control de roles y trazabilidad de accesos.
			</p>
		</div>

		<a
			href="/usuarios/nuevo"
			class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			+ Nuevo usuario
		</a>
	</div>

	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<input
			bind:value={search}
			type="text"
			placeholder="Buscar por nombre, email o rol"
			class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
		/>
	</div>

	<!-- Vista Desktop: Tabla -->
	<div class="hidden md:block overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left table-fixed">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="w-1/4 px-4 py-3 text-sm font-semibold">Usuario</th>
					<th class="w-1/3 px-4 py-3 text-sm font-semibold">Email</th>
					<th class="w-1/6 px-4 py-3 text-sm font-semibold">Rol</th>
					<th class="w-1/6 px-4 py-3 text-sm font-semibold">Estado</th>
					<th class="w-24 px-4 py-3 text-right text-sm font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as user}
					<tr class="border-b border-slate-800 last:border-none hover:bg-slate-800/50 transition-colors">
						<td class="px-4 py-3 truncate" title={user.fullName}>
							<span class="font-medium">{user.fullName}</span>
						</td>
						<td class="px-4 py-3 text-slate-300 truncate" title={user.email}>{user.email}</td>
						<td class="px-4 py-3">
							<span class="inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-xs">
								{user.role}
							</span>
						</td>
						<td class="px-4 py-3">
							<span class={user.status === 'Activo' ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
								{user.status}
							</span>
						</td>
						<td class="px-4 py-3 text-right">
							<div class="flex items-center justify-end space-x-2">
								<a
									href="/usuarios/{user.id}"
									class="text-emerald-400 hover:text-emerald-300 transition-colors"
									aria-label="Ver usuario"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								</a>
								<button
									onclick={() => editingUser = user}
									class="text-blue-400 hover:text-blue-300 transition-colors"
									aria-label="Editar usuario"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
								<button
									onclick={() => deletingUser = user}
									class="text-red-400 hover:text-red-300 transition-colors"
									aria-label="Eliminar usuario"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Vista Mobile: Cards -->
	<div class="md:hidden space-y-3">
		{#each filtered as user}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<p class="font-semibold text-white truncate">{user.fullName}</p>
						<p class="text-sm text-slate-400 truncate">{user.email}</p>
					</div>
					<span class={user.status === 'Activo' ? 'text-green-400 text-xs font-medium shrink-0' : 'text-red-400 text-xs font-medium shrink-0'}>
						{user.status}
					</span>
				</div>
				<div class="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
					<span class="inline-flex rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-xs">
						{user.role}
					</span>
					<div class="flex items-center space-x-3">
						<a
							href="/usuarios/{user.id}"
							class="text-emerald-400 hover:text-emerald-300 transition-colors"
							aria-label="Ver usuario"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
						</a>
						<button
							onclick={() => editingUser = user}
							class="text-blue-400 hover:text-blue-300 transition-colors"
							aria-label="Editar usuario"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</button>
						<button
							onclick={() => deletingUser = user}
							class="text-red-400 hover:text-red-300 transition-colors"
							aria-label="Eliminar usuario"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				</div>
			</div>
		{/each}
		{#if filtered.length === 0}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
				<p class="text-slate-400">No se encontraron usuarios</p>
			</div>
		{/if}
	</div>
</div>

	<!-- Modal de Edición -->
	{#if editingUser}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onclick={() => editingUser = null}>
			<div class="relative mx-4 max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-white">Editar Usuario</h3>
					<button onclick={() => editingUser = null} class="text-slate-400 hover:text-slate-300 transition-colors">
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<form method="POST" action="/usuarios/{editingUser.id}/editar" use:enhance>
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
							<input
								type="text"
								name="firstName"
								value={editingUser.fullName.split(' ')[0]}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-300 mb-2">Apellido</label>
							<input
								type="text"
								name="lastName"
								value={editingUser.fullName.split(' ')[1]}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-300 mb-2">Email</label>
							<input
								type="email"
								name="email"
								value={editingUser.email}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-300 mb-2">Rol</label>
							<select
								name="role"
								value={editingUser.role}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
							>
								<option value="SUPERADMIN">Super Administrador</option>
								<option value="DIRECTOR">Director</option>
								<option value="SECRETARIA">Secretaría</option>
								<option value="DOCENTE">Docente</option>
								<option value="ALUMNO">Alumno</option>
								<option value="FINANZAS">Finanzas</option>
								<option value="APODERADO">Apoderado</option>
								<option value="PRECEPTOR">Preceptor</option>
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-300 mb-2">Estado</label>
							<select
								name="status"
								value={editingUser.status === 'Activo' ? 'ACTIVE' : 'INACTIVE'}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
							>
								<option value="ACTIVE">Activo</option>
								<option value="INACTIVE">Inactivo</option>
							</select>
						</div>
						<div class="flex justify-end gap-3 pt-4">
							<button
								type="button"
								onclick={() => editingUser = null}
								class="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
							>
								Cancelar
							</button>
							<button
								type="submit"
								class="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:scale-[1.02] transition"
							>
								Guardar Cambios
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Modal de Eliminación -->
	{#if deletingUser}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onclick={() => deletingUser = null}>
			<div class="relative mx-4 max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-white">Eliminar Usuario</h3>
					<button onclick={() => deletingUser = null} class="text-slate-400 hover:text-slate-300 transition-colors">
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="space-y-4">
					<p class="text-slate-300">
						¿Estás seguro de que deseas eliminar al usuario <span class="font-semibold text-white">{deletingUser.fullName}</span>?
					</p>
					<p class="text-sm text-slate-400">
						Esta acción no se puede deshacer.
					</p>
					<form method="POST" action="/usuarios/{deletingUser.id}/eliminar" use:enhance>
						<div class="flex justify-end gap-3 pt-4">
							<button
								type="button"
								onclick={() => deletingUser = null}
								class="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
							>
								Cancelar
							</button>
							<button
								type="submit"
								class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
							>
								Eliminar Usuario
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
