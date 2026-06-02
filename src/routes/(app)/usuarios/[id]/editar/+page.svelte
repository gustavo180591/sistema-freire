<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form?: any } = $props();
</script>

<svelte:head>
	<title>Editar Usuario {data.user.firstName} {data.user.lastName} | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Usuario</p>
			<h1 class="text-3xl font-bold">Editar {data.user.firstName} {data.user.lastName}</h1>
		</div>
		<a
			href="/usuarios/{data.user.id}"
			class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
		>
			Volver
		</a>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
			Usuario actualizado correctamente
		</div>
	{/if}

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Datos Personales -->
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="text-xl font-bold mb-4">Datos Personales</h2>
			<form method="POST" action="?/updateUser" use:enhance class="space-y-4">
				<div>
					<label for="firstName" class="block text-sm text-slate-400 mb-1">Nombre</label>
					<input
						id="firstName"
						name="firstName"
						type="text"
						value={data.user.firstName}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>
				<div>
					<label for="lastName" class="block text-sm text-slate-400 mb-1">Apellido</label>
					<input
						id="lastName"
						name="lastName"
						type="text"
						value={data.user.lastName}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>
				<div>
					<label for="email" class="block text-sm text-slate-400 mb-1">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						value={data.user.email}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>
				<div>
					<label for="status" class="block text-sm text-slate-400 mb-1">Estado</label>
					<select
						id="status"
						name="status"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					>
						<option value="ACTIVE" selected={data.user.status === 'ACTIVE'}>Activo</option>
						<option value="INACTIVE" selected={data.user.status === 'INACTIVE'}>Inactivo</option>
					</select>
				</div>
				<button
					type="submit"
					class="w-full rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
				>
					Guardar Datos
				</button>
			</form>
		</div>

		<!-- Roles -->
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="text-xl font-bold mb-4">Roles</h2>
			<form method="POST" action="?/updateRoles" use:enhance class="space-y-4">
				<div class="space-y-2">
					{#each data.roles as role}
						<label class="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 cursor-pointer hover:bg-slate-800 transition">
							<input
								type="checkbox"
								name="roleIds"
								value={role.id}
								checked={data.user.roles.some(ur => ur.roleId === role.id)}
								class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500"
							/>
							<div>
								<p class="font-medium">{role.name}</p>
								<p class="text-sm text-slate-400">{role.code}</p>
							</div>
						</label>
					{/each}
				</div>
				<button
					type="submit"
					class="w-full rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
				>
					Guardar Roles
				</button>
			</form>
		</div>
	</div>
</div>
