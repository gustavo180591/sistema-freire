<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let selectedRole = $state<string | null>(null);
	let saving = $state<Record<string, boolean>>({});

	const roleLabels: Record<string, string> = {
		DIRECTOR: 'Director',
		SECRETARIA: 'Secretaría',
		DOCENTE: 'Docente',
		FINANZAS: 'Finanzas',
		ALUMNO: 'Alumno',
		APODERADO: 'Apoderado',
		PRECEPTOR: 'Preceptor',
		LIQUIDADOR: 'Liquidador'
	};

	function getPermissionForRole(role: string, entity: string) {
		const perms = data.permissionsByRole[role] || [];
		return (
			perms.find((p) => p.entity === entity) || {
				canCreate: false,
				canRead: entity === 'AUDIT_LOG' || entity === 'PERMISSION' ? false : true,
				canUpdate: false,
				canDelete: false
			}
		);
	}

	function hasExplicitPermission(role: string, entity: string): boolean {
		const perms = data.permissionsByRole[role] || [];
		return perms.some((permission) => permission.entity === entity);
	}

	function getExplicitPermissionCount(role: string): number {
		return (data.permissionsByRole[role] || []).length;
	}

	function getMissingPermissionCount(role: string): number {
		return data.entities.length - getExplicitPermissionCount(role);
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
	<title>Gestión de Permisos | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="space-y-6 p-4 md:p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<p class="text-xs tracking-[0.2em] text-slate-400 uppercase md:text-sm">Seguridad</p>
			<h1 class="text-2xl font-bold tracking-tight md:text-3xl">Gestión de Permisos</h1>
			<p class="mt-1 text-sm text-slate-400">
				Configurar permisos granulares CRUD por rol y entidad.
			</p>
		</div>

		<form method="POST" action="?/reset" use:enhance>
			<button
				type="submit"
				class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
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

	<div class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
		<div class="flex gap-3">
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-300"
			>
				!
			</div>

			<div>
				<p class="font-semibold text-amber-200">Diagnóstico de permisos</p>
				<p class="mt-1 text-sm leading-6 text-slate-400">
					Algunas combinaciones de rol y entidad todavía no tienen un registro explícito en la base
					de datos. En esos casos el sistema actual aplica un permiso de lectura por defecto,
					excepto para Auditoría y Permisos.
				</p>
				<p class="mt-2 text-sm font-medium text-amber-300">
					En esta etapa solo identificaremos esos casos. Todavía no se modificará el comportamiento
					de acceso.
				</p>
			</div>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
		<div class="border-b border-slate-800 p-5">
			<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
				Diagnóstico general
			</p>
			<h2 class="mt-1 text-lg font-bold text-white">Cobertura de permisos por rol</h2>
			<p class="mt-1 text-sm text-slate-400">
				Permite identificar qué roles todavía dependen del comportamiento por defecto.
			</p>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left">
				<thead class="border-b border-slate-800 bg-slate-950/40">
					<tr>
						<th class="px-5 py-3 text-xs font-semibold text-slate-400 uppercase"> Rol </th>
						<th class="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
							Explícitos
						</th>
						<th class="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
							Sin definir
						</th>
						<th class="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
							Cobertura
						</th>
					</tr>
				</thead>

				<tbody>
					{#each data.roleCodes as role}
						{@const explicitCount = getExplicitPermissionCount(role)}
						{@const missingCount = getMissingPermissionCount(role)}
						{@const percentage =
							data.entities.length > 0
								? Math.round((explicitCount / data.entities.length) * 100)
								: 0}

						<tr class="border-b border-slate-800 last:border-none">
							<td class="px-5 py-4">
								<button type="button" onclick={() => (selectedRole = role)} class="text-left">
									<p class="font-semibold text-white hover:text-indigo-300">
										{roleLabels[role]}
									</p>
									<p class="text-xs text-slate-500">{role}</p>
								</button>
							</td>

							<td class="px-5 py-4 text-center">
								<span
									class="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-300"
								>
									{explicitCount}
								</span>
							</td>

							<td class="px-5 py-4 text-center">
								<span
									class="rounded-lg bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-300"
								>
									{missingCount}
								</span>
							</td>

							<td class="px-5 py-4">
								<div class="mx-auto max-w-[180px]">
									<div class="flex items-center justify-between text-xs">
										<span class="text-slate-500">
											{explicitCount}/{data.entities.length}
										</span>
										<span class="font-semibold text-slate-300">
											{percentage}%
										</span>
									</div>

									<div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
										<div
											class="h-full rounded-full bg-emerald-500 transition-all"
											style={`width: ${percentage}%`}
										></div>
									</div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-indigo-300 uppercase">
					Matriz institucional
				</p>
				<h2 class="mt-1 text-lg font-bold text-white">Director</h2>
				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					El Director tendrá acceso completo para crear, leer, editar y eliminar en todas las
					entidades operativas del sistema. La administración de permisos continuará reservada
					exclusivamente a SUPERADMIN.
				</p>
			</div>

			<form
				method="POST"
				action="?/applyDirectorMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Aplicar la matriz institucional completa al rol Director?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-indigo-400"
				>
					Aplicar matriz Director
				</button>
			</form>
		</div>
	</div>

	<div class="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-sky-300 uppercase">
					Matriz institucional
				</p>

				<h2 class="mt-1 text-lg font-bold text-white">Secretaría</h2>

				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					Administra usuarios, alumnos, docentes, inscripciones, becas, documentación, comisiones y
					organización académica. Puede consultar la situación financiera del alumno, pero no
					modificar pagos, recibos, bloqueos ni convenios.
				</p>
			</div>

			<form
				method="POST"
				action="?/applySecretaryMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Aplicar la matriz institucional al rol Secretaría?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-sky-400"
				>
					Aplicar matriz Secretaría
				</button>
			</form>
		</div>
	</div>

	<div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-emerald-300 uppercase">
					Matriz institucional
				</p>

				<h2 class="mt-1 text-lg font-bold text-white">Docente</h2>

				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					Puede gestionar calificaciones, asistencia, evaluaciones, seguimiento, comunicaciones y
					materiales dentro de su ámbito docente. El alcance final se restringirá a sus materias,
					comisiones, alumnos y materiales propios.
				</p>
			</div>

			<form
				method="POST"
				action="?/applyTeacherMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Aplicar la matriz institucional al rol Docente?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-emerald-400"
				>
					Aplicar matriz Docente
				</button>
			</form>
		</div>
	</div>

	<div class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
					Matriz institucional
				</p>

				<h2 class="mt-1 text-lg font-bold text-white">Finanzas</h2>

				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					Gestiona cargos, pagos, recibos, becas, bloqueos y convenios. Los pagos y recibos no se
					eliminan físicamente: deben conservar trazabilidad mediante anulación. Las becas sí
					permiten eliminación.
				</p>
			</div>

			<form
				method="POST"
				action="?/applyFinanceMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Aplicar la matriz institucional al rol Finanzas?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-slate-950 transition hover:bg-amber-400"
				>
					Aplicar matriz Finanzas
				</button>
			</form>
		</div>
	</div>

	<div class="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-violet-300 uppercase">
					Matriz institucional
				</p>

				<h2 class="mt-1 text-lg font-bold text-white">Preceptor</h2>

				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					Gestiona asistencia, calificaciones, seguimiento, observaciones, incidencias,
					justificaciones, llegadas y retiros, comunicaciones y documentación dentro de su ámbito
					asignado.
				</p>
			</div>

			<form
				method="POST"
				action="?/applyPreceptorMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Aplicar la matriz institucional al rol Preceptor?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-violet-400"
				>
					Aplicar matriz Preceptor
				</button>
			</form>
		</div>
	</div>

	<div class="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-cyan-300 uppercase">
					Matriz institucional
				</p>

				<h2 class="mt-1 text-lg font-bold text-white">Alumno</h2>

				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					Accede únicamente a su propia información académica, personal y financiera. Puede
					inscribirse y cancelar sus propias inscripciones, siempre sujeto a correlatividades,
					fechas, estado académico y bloqueos financieros.
				</p>
			</div>

			<form
				method="POST"
				action="?/applyStudentMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Aplicar la matriz institucional al rol Alumno?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-slate-950 transition hover:bg-cyan-400"
				>
					Aplicar matriz Alumno
				</button>
			</form>
		</div>
	</div>

	<div class="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-rose-300 uppercase">
					Matriz institucional
				</p>

				<h2 class="mt-1 text-lg font-bold text-white">Apoderado · Dueño del instituto</h2>

				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					Máxima autoridad institucional. Tiene acceso completo a la operación académica,
					administrativa y financiera. La administración técnica de permisos continúa reservada
					exclusivamente al Superadministrador.
				</p>
			</div>

			<form
				method="POST"
				action="?/applyOwnerMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Aplicar la matriz institucional completa al rol Apoderado?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-rose-400"
				>
					Aplicar matriz Apoderado
				</button>
			</form>
		</div>
	</div>

	<div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-emerald-300 uppercase">
					Matriz institucional
				</p>
				<h2 class="mt-1 text-lg font-bold text-white">Liquidador</h2>
				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					Acceso exclusivo al módulo de recibos de sueldo y su configuración. Puede crear, consultar
					y modificar recibos, pero no eliminarlos.
				</p>
			</div>

			<form
				method="POST"
				action="?/applyPayrollMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Aplicar la matriz institucional al rol Liquidador?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
				>
					Aplicar matriz Liquidador
				</button>
			</form>
		</div>
	</div>

	<div class="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.16em] text-slate-300 uppercase">
					Matriz de seguridad
				</p>
				<h2 class="mt-1 text-lg font-bold text-white">Sin tipo</h2>
				<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
					Rol sin funciones institucionales. Las 26 entidades quedan explícitamente denegadas.
				</p>
			</div>

			<form
				method="POST"
				action="?/applyNoRoleMatrix"
				use:enhance
				onsubmit={(event) => {
					if (!confirm('¿Denegar explícitamente todos los permisos a Sin tipo?')) {
						event.preventDefault();
					}
				}}
			>
				<button
					type="submit"
					class="rounded-xl bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-500"
				>
					Aplicar matriz Sin tipo
				</button>
			</form>
		</div>
	</div>

	<!-- Selector de Rol -->
	<div class="flex flex-wrap gap-2">
		{#each data.roleCodes as role}
			<button
				onclick={() => (selectedRole = selectedRole === role ? null : role)}
				class="rounded-xl px-4 py-2 text-sm font-medium transition {selectedRole === role
					? 'bg-white text-slate-950'
					: 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
			>
				{roleLabels[role]}
			</button>
		{/each}
	</div>

	{#if selectedRole}
		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
				<p class="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase">
					Rol seleccionado
				</p>
				<p class="mt-2 text-xl font-bold text-white">{roleLabels[selectedRole]}</p>
				<p class="mt-1 text-xs text-slate-500">{selectedRole}</p>
			</div>

			<div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
				<p class="text-xs font-semibold tracking-[0.15em] text-emerald-300 uppercase">
					Configuración explícita
				</p>
				<p class="mt-2 text-2xl font-bold text-white">
					{getExplicitPermissionCount(selectedRole)}
				</p>
				<p class="mt-1 text-sm text-slate-400">
					de {data.entities.length} entidades
				</p>
			</div>

			<div class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
				<p class="text-xs font-semibold tracking-[0.15em] text-amber-300 uppercase">Sin definir</p>
				<p class="mt-2 text-2xl font-bold text-white">
					{getMissingPermissionCount(selectedRole)}
				</p>
				<p class="mt-1 text-sm text-slate-400">entidades sin configuración explícita</p>
			</div>
		</div>
	{/if}

	<!-- Tabla de Permisos -->
	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-4 py-3 text-sm font-semibold">Entidad</th>
					{#each data.roleCodes as role}
						<th
							class="px-4 py-3 text-sm font-semibold {selectedRole && selectedRole !== role
								? 'hidden md:table-cell'
								: ''}"
						>
							<div class="text-center">{roleLabels[role]}</div>
							<div class="mt-1 flex justify-center gap-1 text-[10px] text-slate-500">
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
							<span class="block text-xs text-slate-500">{entity}</span>
						</td>
						{#each data.roleCodes as role}
							{@const perm = getPermissionForRole(role, entity)}
							{@const explicitPermission = hasExplicitPermission(role, entity)}
							{@const key = `${role}-${entity}`}
							<td
								class="px-4 py-3 {selectedRole && selectedRole !== role
									? 'hidden md:table-cell'
									: ''}"
							>
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
												const input = document.querySelector(
													`#form-${key} [name="${field}"]`
												) as HTMLInputElement;
												if (input) input.value = newValue.toString();
												const form = document.getElementById(`form-${key}`) as HTMLFormElement;
												if (form) {
													saving[key] = true;
													form.requestSubmit();
												}
											}}
											class="h-6 w-6 rounded transition {perm[field]
												? 'bg-emerald-500 hover:bg-emerald-400'
												: 'bg-slate-700 hover:bg-slate-600'} disabled:opacity-50"
											aria-label={field}
										>
											{#if saving[key]}
												<span
													class="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
												></span>
											{:else}
												{perm[field] ? '✓' : ''}
											{/if}
										</button>
									{/each}
								</form>

								<div class="mt-1 text-center">
									{#if explicitPermission}
										<span class="text-[9px] font-medium text-emerald-500/80"> Explícito </span>
									{:else}
										<span
											class="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-300"
											title="Este permiso utiliza el comportamiento por defecto del sistema"
										>
											Sin definir
										</span>
									{/if}
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Leyenda -->
	<div class="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
		<p class="mb-2 font-medium">Leyenda:</p>
		<div class="flex flex-wrap gap-4">
			<span class="flex items-center gap-2"
				><span
					class="flex h-5 w-5 items-center justify-center rounded bg-emerald-500 text-xs text-white"
					>✓</span
				> Permiso habilitado</span
			>
			<span class="flex items-center gap-2"
				><span class="h-5 w-5 rounded bg-slate-700"></span> Permiso deshabilitado</span
			>
			<span class="flex items-center gap-2 text-slate-400">
				C = Crear, L = Leer, E = Editar, X = Eliminar
			</span>

			<span class="flex items-center gap-2 text-emerald-400">
				<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
				Explícito = existe un registro de permiso en la base
			</span>

			<span class="flex items-center gap-2 text-amber-300">
				<span class="h-2 w-2 rounded-full bg-amber-400"></span>
				Sin definir = no existe un permiso explícito para esa entidad. Por seguridad, el acceso queda
				denegado.
			</span>
		</div>
	</div>

	<!-- Nota SUPERADMIN -->
	<div class="rounded-xl border border-indigo-800 bg-indigo-950/30 p-4 text-sm text-indigo-300">
		<strong>Nota:</strong> SUPERADMIN tiene todos los permisos automáticamente y no aparece en esta tabla.
	</div>
</div>
