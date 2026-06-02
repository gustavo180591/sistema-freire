<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let searchQuery = $state('');

	interface Teacher {
		id: string;
		userId: string;
		dni: string;
		firstName: string;
		lastName: string;
		email: string;
		createdAt: Date;
	}

	// Filtrar docentes según búsqueda
	const filteredTeachers = $derived(
		data.teachers.filter((teacher: Teacher) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			const fullName = `${teacher.lastName} ${teacher.firstName}`.toLowerCase();
			return (
				fullName.includes(query) ||
				teacher.email.toLowerCase().includes(query) ||
				teacher.dni.toLowerCase().includes(query)
			);
		})
	);
</script>

<svelte:head>
	<title>Gestión de Docentes | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Gestión Académica</p>
			<h1 class="text-3xl font-bold tracking-tight">Docentes</h1>
			<p class="mt-2 text-sm text-slate-400">Administración del cuerpo docente del instituto.</p>
		</div>
		<a
			href="/usuarios/nuevo"
			class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Agregar Docente
		</a>
	</div>

	<!-- Estadísticas -->
	<div class="grid gap-4 md:grid-cols-2">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="text-2xl font-bold text-white">{data.teachers.length}</div>
			<div class="text-sm text-slate-400">Total Docentes</div>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="text-2xl font-bold text-emerald-400">{data.teachers.length}</div>
			<div class="text-sm text-slate-400">Activos</div>
		</div>
	</div>

	<!-- Filtro de búsqueda -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<input
			type="text"
			placeholder="Buscar por nombre, email o DNI"
			bind:value={searchQuery}
			class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 transition outline-none focus:border-slate-500"
		/>
	</div>

	<!-- Tabla de Docentes -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full table-fixed">
			<thead class="bg-slate-800/50">
				<tr>
					<th class="w-24 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
						DNI
					</th>
					<th class="w-64 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
						Apellido y Nombre
					</th>
					<th class="w-80 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider truncate">
						Email
					</th>
					<th class="w-32 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
						Fecha Alta
					</th>
					<th class="w-24 px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
						Acciones
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800">
				{#if filteredTeachers.length === 0}
					<tr>
						<td colspan="5" class="px-3 py-8 text-center text-sm text-slate-400">
							No se encontraron docentes que coincidan con "{searchQuery}"
						</td>
					</tr>
				{:else}
					{#each filteredTeachers as teacher}
						<tr class="hover:bg-slate-800/30 transition-colors">
							<td class="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
								{teacher.dni}
							</td>
							<td class="px-3 py-3 whitespace-nowrap">
								<div class="text-sm font-medium text-white truncate">
									{teacher.lastName}, {teacher.firstName}
								</div>
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-sm text-slate-300 truncate" title={teacher.email}>
								{teacher.email}
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
								{new Date(teacher.createdAt).toLocaleDateString('es-AR')}
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
								<div class="flex items-center justify-end space-x-2">
									<a
										href="/docentes/{teacher.id}"
										class="text-emerald-400 hover:text-emerald-300 transition-colors"
										aria-label="Ver docente"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									</a>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
