<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form?: any } = $props();
	let searchQuery = $state('');
	let deletingTeacher = $state<Teacher | null>(null);

	interface Teacher {
		id: string;
		userId: string;
		dni: string;
		firstName: string;
		lastName: string;
		email: string;
		createdAt: Date;
		subjects: Array<{
			id: string;
			code: string;
			name: string;
			yearLevel: number;
		}>;
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
					<th class="w-48 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
						Materias
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
						<td colspan="6" class="px-3 py-8 text-center text-sm text-slate-400">
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
							<td class="px-3 py-3">
								{#if teacher.subjects.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each teacher.subjects.slice(0, 2) as subject}
											<span class="rounded-full bg-slate-700 text-slate-300 px-2 py-0.5 text-xs" title={subject.name}>
												{subject.code}
											</span>
										{/each}
										{#if teacher.subjects.length > 2}
											<span class="text-xs text-slate-500">+{teacher.subjects.length - 2}</span>
										{/if}
									</div>
								{:else}
									<span class="text-xs text-slate-500">Sin materias</span>
								{/if}
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
								{new Date(teacher.createdAt).toLocaleDateString('es-AR')}
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
								<div class="flex items-center justify-end space-x-2">
									<a
										href="/usuarios/{teacher.userId}"
										class="text-emerald-400 hover:text-emerald-300 transition-colors"
										aria-label="Ver docente"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									</a>
									<a
										href="/usuarios/{teacher.userId}/editar"
										class="text-blue-400 hover:text-blue-300 transition-colors"
										aria-label="Editar docente"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</a>
									<button
										onclick={() => deletingTeacher = teacher}
										class="text-red-400 hover:text-red-300 transition-colors"
										aria-label="Eliminar docente"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Modal de Eliminación -->
	{#if deletingTeacher}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div class="bg-slate-900 rounded-3xl border border-slate-800 p-8 max-w-md w-full">
				<div class="flex items-center space-x-4 mb-6">
					<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
						<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-bold text-white">Eliminar Docente</h2>
						<p class="text-sm text-slate-400">Esta acción no se puede deshacer</p>
					</div>
				</div>

				<div class="bg-slate-800/50 rounded-2xl p-4 mb-6">
					<p class="text-white font-medium">{deletingTeacher.lastName}, {deletingTeacher.firstName}</p>
					<p class="text-sm text-slate-400">DNI: {deletingTeacher.dni}</p>
					<p class="text-sm text-slate-400">Email: {deletingTeacher.email}</p>
				</div>

				<form
					method="POST"
					action="?/deleteTeacher"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							deletingTeacher = null;
						};
					}}
				>
					<input type="hidden" name="id" value={deletingTeacher.id} />
					<input type="hidden" name="userId" value={deletingTeacher.userId} />

					<div class="flex justify-end space-x-4">
						<button
							type="button"
							onclick={() => deletingTeacher = null}
							class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-2xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600"
						>
							Eliminar Docente
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
