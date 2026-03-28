<script lang="ts">
	type UserRow = {
		id: string;
		fullName: string;
		email: string;
		role: string;
		status: 'Activo' | 'Inactivo';
	};

	const users: UserRow[] = [
		{
			id: '1',
			fullName: 'María Gómez',
			email: 'maria@paulofreire.edu.ar',
			role: 'SECRETARIA',
			status: 'Activo'
		},
		{
			id: '2',
			fullName: 'Juan Pérez',
			email: 'juan@paulofreire.edu.ar',
			role: 'DOCENTE',
			status: 'Activo'
		}
	];

	let search = $state('');

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

	<div class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Usuario</th>
					<th class="px-6 py-4 text-sm font-semibold">Email</th>
					<th class="px-6 py-4 text-sm font-semibold">Rol</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as user}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4">{user.fullName}</td>
						<td class="px-6 py-4 text-slate-300">{user.email}</td>
						<td class="px-6 py-4">{user.role}</td>
						<td class="px-6 py-4">{user.status}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
