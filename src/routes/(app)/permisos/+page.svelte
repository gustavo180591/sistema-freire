<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let selectedRole = $state<string | null>(null);
	let saving = $state<Record<string, boolean>>({});

	const roleLabels: Record<string, string> = {
		'DIRECTOR': 'Director',
		'SECRETARIA': 'Secretaría',
		'DOCENTE': 'Docente',
		'FINANZAS': 'Finanzas',
		'ALUMNO': 'Alumno',
		'APODERADO': 'Apoderado',
		'PRECEPTOR': 'Preceptor'
	};

	function getPermissionForRole(role: string, entity: string) {
		const perms = data.permissionsByRole[role] || [];
		return perms.find(p => p.entity === entity) || {
			canCreate: false,
			canRead: entity === 'AUDIT_LOG' || entity === 'PERMISSION' ? false : true,
			canUpdate: false,
			canDelete: false
		};
	}

	function togglePermission(role: string, entity: string, field: string, value: boolean) {
		const key = `${role}-${entity}`;
		saving[key] = true;
		
		// Submit form
		const form = document.getElementById(`form-${key}`) as HTMLFormElement;
		if (form) {
			const checkbox = form.querySelector(`[name="${field}"]`) as HTMLInputElement;
			if (checkbox) {
				checkbox.value = value.toString();
				form.requestSubmit();
			}
		}
	}

	function handleSubmit(role: string, entity: string) {
		return async ({ result }: { result: any }) => {
			const key = `${role}-${entity}`;
			saving[key] = false;
			
			if (result.type === 'success') {
				await invalidateAll();
			}
		};
	}
</script>

<svelte:head>
	<title>Gestión de Permisos | Paulo Freire</title>
</svelte:head>

<div class="space-y-6 p-4 md:p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<p class="text-xs md:text-sm tracking-[0.2em] text-slate-400 uppercase">Seguridad</p>
			<h1 class="text-2xl md:text-3xl font-bold tracking-tight">Gestión de Permisos</h1>
			<p class="mt-1 text-sm text-slate-400">
				Configurar permisos granulares CRUD por rol y entidad.
			</p>
		</div>
		
		<form method="POST" action="?/reset" use:enhance>
			<button 
				type="submit"
				class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
			>
				Restablecer por defecto
			</button>
		</form>
	</div>

	{#if form?.success}
		<div class="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-emerald-400">
			✓ {form.message || 'Permisos actualizados correctamente'}
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-xl border border-red-800 bg-red-950/30 p-4 text-red-400">
			✗ {form.error}
		</div>
	{/if}

	<!-- Selector de Rol -->
	<div class="flex flex-wrap gap-2">
		{#each data.roleCodes as role}
			<button
				onclick={() => selectedRole = selectedRole === role ? null : role}
				class="rounded-xl px-4 py-2 text-sm font-medium transition {selectedRole === role ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
			>
				{roleLabels[role]}
			</button>
		{/each}
	</div>

	<!-- Tabla de Permisos -->
	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-4 py-3 text-sm font-semibold">Entidad</th>
					{#each data.roleCodes as role}
						<th class="px-4 py-3 text-sm font-semibold {selectedRole && selectedRole !== role ? 'hidden md:table-cell' : ''}">
							<div class="text-center">{roleLabels[role]}</div>
							<div class="flex justify-center gap-1 mt-1 text-[10px] text-slate-500">
								<span>C</span>
								<span>L</span>
								<span>E</span>
								<span>X</span>
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.entities as entity}
					<tr class="border-b border-slate-800 last:border-none hover:bg-slate-800/30">
						<td class="px-4 py-3 text-sm font-medium">
							{data.entityLabels[entity] || entity}
							<span class="text-xs text-slate-500 block">{entity}</span>
						</td>
						{#each data.roleCodes as role}
							{@const perm = getPermissionForRole(role, entity)}
							{@const key = `${role}-${entity}`}
							<td class="px-4 py-3 {selectedRole && selectedRole !== role ? 'hidden md:table-cell' : ''}">
								<form 
									id="form-{key}"
									method="POST" 
									action="?/update" 
									use:enhance={() => handleSubmit(role, entity)}
									class="flex justify-center gap-2"
								>
									<input type="hidden" name="roleCode" value={role} />
									<input type="hidden" name="entity" value={entity} />
									<input type="hidden" name="canCreate" value={perm.canCreate} />
									<input type="hidden" name="canRead" value={perm.canRead} />
									<input type="hidden" name="canUpdate" value={perm.canUpdate} />
									<input type="hidden" name="canDelete" value={perm.canDelete} />

									{#each ['canCreate', 'canRead', 'canUpdate', 'canDelete'] as field}
										<button
											type="button"
											disabled={saving[key]}
											onclick={() => {
												const newValue = !perm[field];
												const input = document.querySelector(`#form-${key} [name="${field}"]`) as HTMLInputElement;
												if (input) input.value = newValue.toString();
												const form = document.getElementById(`form-${key}`) as HTMLFormElement;
												if (form) {
													saving[key] = true;
													form.requestSubmit();
												}
											}}
											class="h-6 w-6 rounded transition {perm[field] ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-700 hover:bg-slate-600'} disabled:opacity-50"
											aria-label="{field}"
										>
											{#if saving[key]}
												<span class="block h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto"></span>
											{:else}
												{perm[field] ? '✓' : ''}
											{/if}
										</button>
									{/each}
								</form>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Leyenda -->
	<div class="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
		<p class="font-medium mb-2">Leyenda:</p>
		<div class="flex flex-wrap gap-4">
			<span class="flex items-center gap-2"><span class="h-5 w-5 rounded bg-emerald-500 flex items-center justify-center text-xs text-white">✓</span> Permiso habilitado</span>
			<span class="flex items-center gap-2"><span class="h-5 w-5 rounded bg-slate-700"></span> Permiso deshabilitado</span>
			<span class="flex items-center gap-2 text-slate-400">C = Crear, L = Leer, E = Editar, X = Eliminar</span>
		</div>
	</div>

	<!-- Nota SUPERADMIN -->
	<div class="rounded-xl border border-indigo-800 bg-indigo-950/30 p-4 text-sm text-indigo-300">
		<strong>Nota:</strong> SUPERADMIN tiene todos los permisos automáticamente y no aparece en esta tabla.
	</div>
</div>
