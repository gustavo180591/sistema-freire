<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let {
		data,
		form
	}: {
		data: PageData;
		form: ActionData;
	} = $props();

	function roleLabel(role: string): string {
		const labels: Record<string, string> = {
			SUPERADMIN: 'Superadmin',
			DIRECTOR: 'Director',
			SECRETARIA: 'Secretaría',
			DOCENTE: 'Docente',
			FINANZAS: 'Finanzas',
			PRECEPTOR: 'Preceptor',
			ALUMNO: 'Alumno',
			APODERADO: 'Apoderado',
			LIQUIDADOR: 'Liquidador',
			SIN_TIPO: 'Sin tipo'
		};

		return labels[role] ?? role;
	}
</script>

<svelte:head>
	<title>Impersonar usuario | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8">
		<p class="text-sm tracking-[0.2em] text-indigo-400 uppercase">Superadministración</p>

		<h1 class="mt-2 text-2xl font-bold md:text-3xl">Impersonar usuario</h1>

		<p class="mt-2 max-w-3xl text-sm text-slate-400">
			Operá temporalmente con los roles, permisos y sedes reales de otro usuario sin cerrar tu
			sesión de SUPERADMIN.
		</p>
	</div>

	<div class="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4">
		<p class="font-medium text-amber-300">Impersonación completa</p>

		<p class="mt-1 text-sm text-amber-200/70">
			Las acciones que realices tendrán exactamente los permisos y restricciones de la cuenta
			seleccionada.
		</p>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
			{form.error}
		</div>
	{/if}

	<form
		method="GET"
		class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-[1fr_240px_auto] md:p-6"
	>
		<div>
			<label for="q" class="mb-2 block text-sm font-medium text-slate-300"> Buscar usuario </label>

			<input
				id="q"
				name="q"
				value={data.query}
				placeholder="Nombre, apellido, email o DNI..."
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
			/>
		</div>

		<div>
			<label for="role" class="mb-2 block text-sm font-medium text-slate-300"> Rol </label>

			<select
				id="role"
				name="role"
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
			>
				<option value=""> Todos los roles </option>

				{#each data.roleOptions as role}
					<option value={role} selected={data.selectedRole === role}>
						{roleLabel(role)}
					</option>
				{/each}
			</select>
		</div>

		<div class="flex items-end">
			<button
				type="submit"
				class="w-full rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-500 md:w-auto"
			>
				Filtrar
			</button>
		</div>
	</form>

	<div class="space-y-3">
		{#each data.users as user}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5">
				<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h2 class="font-semibold text-white">
								{user.lastName},
								{user.firstName}
							</h2>

							{#each user.roles as role}
								<span
									class="rounded-full border border-indigo-800/50 bg-indigo-950/40 px-2.5 py-1 text-xs font-medium text-indigo-300"
								>
									{roleLabel(role.code)}
								</span>
							{/each}
						</div>

						<p class="mt-1 truncate text-sm text-slate-400">
							{user.email}
						</p>

						<div class="mt-3 flex flex-wrap gap-2">
							{#each user.locations as location}
								<span
									class="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400"
								>
									{location.name}
								</span>
							{/each}

							{#if user.locations.length === 0}
								<span class="text-xs text-slate-500"> Sin sedes asignadas </span>
							{/if}
						</div>
					</div>

					<form method="POST" action="?/impersonate">
						<input type="hidden" name="targetUserId" value={user.id} />

						<button
							type="submit"
							class="w-full rounded-xl border border-indigo-700 bg-indigo-950/40 px-5 py-2.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-900/60 md:w-auto"
						>
							Impersonar
						</button>
					</form>
				</div>
			</div>
		{/each}

		{#if data.users.length === 0}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
				<p class="text-slate-400">No encontramos usuarios activos con esos filtros.</p>
			</div>
		{/if}
	</div>
</div>
