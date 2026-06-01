<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
	let editingStudent = $state<Student | null>(null);
	let deletingStudent = $state<Student | null>(null);
	let searchQuery = $state('');

	// Filtrar estudiantes según búsqueda
	const filteredStudents = $derived(
		data.students.filter((student: any) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			const fullName = `${student.lastName} ${student.firstName}`.toLowerCase();
			return (
				fullName.includes(query) ||
				student.email.toLowerCase().includes(query) ||
				student.dni.toLowerCase().includes(query)
			);
		})
	);

	interface Student {
		id: string;
		userId: string;
		dni: string;
		firstName: string;
		lastName: string;
		email: string;
		career: string;
		careerId: string;
		status: string;
		isBecado: boolean;
		isRecursante: boolean;
		currentYear: number;
		createdAt: Date;
		// Campos extendidos
		birthDate: Date | null;
		bloodType: string | null;
		phone: string | null;
		address: string | null;
		locality: string | null;
		postalCode: string | null;
		highSchool: string | null;
		highSchoolYear: number | null;
		instituteYear: number | null;
		familyContactName: string | null;
		familyContactPhone: string | null;
		familyRelationship: string | null;
	}

	interface FilterData {
		careerId: string;
		careerName: string | null;
	}

	// Type assertion for filter data
	const filter = $derived((data as { filter?: FilterData | null }).filter ?? null);

	function getStatusColor(status: string) {
		return status === 'ACTIVE' ? 'text-green-400' : 'text-red-400';
	}

	function getStatusText(status: string) {
		return status === 'ACTIVE' ? 'Activo' : 'Inactivo';
	}

	function getStudentType(student: Student) {
		if (student.isBecado) return 'Becado';
		if (student.isRecursante) return 'Recursante';
		return 'Normal';
	}

	function getStudentTypeColor(student: Student) {
		if (student.isBecado) return 'text-blue-400';
		if (student.isRecursante) return 'text-orange-400';
		return 'text-slate-400';
	}
</script>

<svelte:head>
	<title>Gestión de Alumnos | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">
				{#if filter}
					<a href="/carreras/{filter.careerId}" class="hover:text-slate-300 transition">{filter.careerName}</a>
				{:else}
					Gestión Académica
				{/if}
			</p>
			<h1 class="text-3xl font-bold tracking-tight">
				{#if filter}
					Alumnos de {filter.careerName}
				{:else}
					Alumnos
				{/if}
			</h1>
			<p class="mt-2 text-sm text-slate-400">
				{#if filter}
					Mostrando alumnos inscriptos en esta carrera.
				{:else}
					Administración completa del alumnado del instituto.
				{/if}
			</p>
			{#if filter}
				<div class="mt-2">
					<a href="/alumnos" class="text-sm text-blue-400 hover:text-blue-300 transition">
						← Ver todos los alumnos
					</a>
				</div>
			{/if}
		</div>
		<a
			href="/usuarios/nuevo"
			class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Agregar Alumno
		</a>
	</div>

	<!-- Estadísticas -->
	<div class="grid gap-4 md:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="text-2xl font-bold text-white">{data.students.length}</div>
			<div class="text-sm text-slate-400">Total Alumnos</div>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="text-2xl font-bold text-green-400">
				{data.students.filter((s: Student) => s.status === 'ACTIVE').length}
			</div>
			<div class="text-sm text-slate-400">Activos</div>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="text-2xl font-bold text-blue-400">
				{data.students.filter((s: Student) => s.isBecado).length}
			</div>
			<div class="text-sm text-slate-400">Becados</div>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="text-2xl font-bold text-orange-400">
				{data.students.filter((s: Student) => s.isRecursante).length}
			</div>
			<div class="text-sm text-slate-400">Recursantes</div>
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

	<!-- Tabla de Alumnos -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full table-fixed">
				<thead class="bg-slate-800/50">
					<tr>
						<th class="w-24 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
							DNI
						</th>
						<th class="w-40 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
							Apellido y Nombre
						</th>
						<th class="w-56 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider truncate">
							Carrera
						</th>
						<th class="w-12 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
							Año
						</th>
						<th class="w-20 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
							Tipo
						</th>
						<th class="w-16 px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
							Estado
						</th>
						<th class="w-24 px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
							Acciones
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800">
					{#if filteredStudents.length === 0}
						<tr>
							<td colspan="7" class="px-3 py-8 text-center text-sm text-slate-400">
								No se encontraron alumnos que coincidan con "{searchQuery}"
							</td>
						</tr>
					{:else}
						{#each filteredStudents as student}
						<tr class="hover:bg-slate-800/30 transition-colors">
							<td class="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
								{student.dni}
							</td>
							<td class="px-3 py-3 whitespace-nowrap">
								<div class="text-sm font-medium text-white truncate">
									{student.lastName}, {student.firstName}
								</div>
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-sm text-slate-300 truncate" title={student.career}>
								{student.career}
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
								{student.currentYear || 'En curso'}
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-sm">
								<span class={getStudentTypeColor(student)}>
									{getStudentType(student)}
								</span>
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-sm">
								<span class={getStatusColor(student.status)}>
									{getStatusText(student.status)}
								</span>
							</td>
							<td class="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
								<div class="flex items-center justify-end space-x-2">
									<a
										href="/alumnos/{student.id}"
										class="text-emerald-400 hover:text-emerald-300 transition-colors"
										aria-label="Ver alumno"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									</a>
									<button
										onclick={() => editingStudent = student}
										class="text-blue-400 hover:text-blue-300 transition-colors"
										aria-label="Editar alumno"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
									<button
										onclick={() => deletingStudent = student}
										class="text-red-400 hover:text-red-300 transition-colors"
										aria-label="Eliminar alumno"
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

	<!-- Modal de Edición -->
	{#if editingStudent}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div class="bg-slate-900 rounded-3xl border border-slate-800 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-2xl font-bold text-white">Editar Alumno</h2>
					<button
						onclick={() => editingStudent = null}
						class="text-slate-400 hover:text-white transition-colors"
						aria-label="Cerrar modal de edición"
					>
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form
					method="POST"
					action="/alumnos/editar"
					class="space-y-6"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							editingStudent = null;
						};
					}}
				>
					<input type="hidden" name="id" value={editingStudent.id} />
					<input type="hidden" name="userId" value={editingStudent.userId} />

					<div class="grid gap-6 md:grid-cols-2">
						<div>
							<label for="dni" class="mb-2 block text-sm font-medium text-slate-300">DNI</label>
							<input
								id="dni"
								type="text"
								name="dni"
								value={editingStudent.dni}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								readonly
							/>
						</div>
						<div>
							<label for="email" class="mb-2 block text-sm font-medium text-slate-300">Email</label>
							<input
								id="email"
								type="email"
								name="email"
								value={editingStudent.email}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label for="firstName" class="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
							<input
								id="firstName"
								type="text"
								name="firstName"
								value={editingStudent.firstName}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label for="lastName" class="mb-2 block text-sm font-medium text-slate-300">Apellido</label>
							<input
								id="lastName"
								type="text"
								name="lastName"
								value={editingStudent.lastName}
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300">Carrera</label>
							<select
								id="careerId"
								name="careerId"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								{#each data.careers as career}
									<option value={career.id} selected={editingStudent.careerId === career.id}>
										{career.name}
									</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="locality" class="mb-2 block text-sm font-medium text-slate-300">Localidad</label>
							<select
								id="locality"
								name="locality"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							>
								<option value="">Seleccionar localidad</option>
								<option value="ALEM" selected={editingStudent.locality === 'ALEM'}>Leandro N. Alem</option>
								<option value="CAPIOVI" selected={editingStudent.locality === 'CAPIOVI'}>Capiovi</option>
							</select>
						</div>
					</div>

					<!-- Datos Personales -->
					<div class="space-y-6 border-t border-slate-800 pt-6">
						<h3 class="text-lg font-semibold text-white">Datos Personales</h3>
						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="birthDate" class="mb-2 block text-sm font-medium text-slate-300">Fecha de Nacimiento</label>
								<input
									id="birthDate"
									name="birthDate"
									type="date"
									value={editingStudent.birthDate ? new Date(editingStudent.birthDate).toISOString().split('T')[0] : ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="bloodType" class="mb-2 block text-sm font-medium text-slate-300">Grupo Sanguíneo</label>
								<select
									id="bloodType"
									name="bloodType"
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								>
									<option value="">Seleccionar...</option>
									<option value="O+" selected={editingStudent.bloodType === 'O+'}>O+</option>
									<option value="O-" selected={editingStudent.bloodType === 'O-'}>O-</option>
									<option value="A+" selected={editingStudent.bloodType === 'A+'}>A+</option>
									<option value="A-" selected={editingStudent.bloodType === 'A-'}>A-</option>
									<option value="B+" selected={editingStudent.bloodType === 'B+'}>B+</option>
									<option value="B-" selected={editingStudent.bloodType === 'B-'}>B-</option>
									<option value="AB+" selected={editingStudent.bloodType === 'AB+'}>AB+</option>
									<option value="AB-" selected={editingStudent.bloodType === 'AB-'}>AB-</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Contactos -->
					<div class="space-y-6 border-t border-slate-800 pt-6">
						<h3 class="text-lg font-semibold text-white">Contactos</h3>
						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="phone" class="mb-2 block text-sm font-medium text-slate-300">Teléfono/Celular</label>
								<input
									id="phone"
									name="phone"
									type="tel"
									value={editingStudent.phone || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
						</div>
						<div class="space-y-4">
							<h4 class="text-md font-medium text-slate-300">Contacto Familiar</h4>
							<div class="grid gap-6 md:grid-cols-3">
								<div>
									<label for="familyContactName" class="mb-2 block text-sm font-medium text-slate-300">Nombre del Familiar</label>
									<input
										id="familyContactName"
										name="familyContactName"
										type="text"
										value={editingStudent.familyContactName || ''}
										class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									/>
								</div>
								<div>
									<label for="familyContactPhone" class="mb-2 block text-sm font-medium text-slate-300">Teléfono del Familiar</label>
									<input
										id="familyContactPhone"
										name="familyContactPhone"
										type="tel"
										value={editingStudent.familyContactPhone || ''}
										class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									/>
								</div>
								<div>
									<label for="familyRelationship" class="mb-2 block text-sm font-medium text-slate-300">Parentesco</label>
									<select
										id="familyRelationship"
										name="familyRelationship"
										class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
									>
										<option value="">Seleccionar...</option>
										<option value="PADRE" selected={editingStudent.familyRelationship === 'PADRE'}>Padre</option>
										<option value="MADRE" selected={editingStudent.familyRelationship === 'MADRE'}>Madre</option>
										<option value="TUTOR" selected={editingStudent.familyRelationship === 'TUTOR'}>Tutor</option>
										<option value="HERMANO" selected={editingStudent.familyRelationship === 'HERMANO'}>Hermano/a</option>
										<option value="ABUELO" selected={editingStudent.familyRelationship === 'ABUELO'}>Abuelo/a</option>
										<option value="OTRO" selected={editingStudent.familyRelationship === 'OTRO'}>Otro</option>
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Domicilio -->
					<div class="space-y-6 border-t border-slate-800 pt-6">
						<h3 class="text-lg font-semibold text-white">Domicilio</h3>
						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="address" class="mb-2 block text-sm font-medium text-slate-300">Dirección</label>
								<input
									id="address"
									name="address"
									type="text"
									value={editingStudent.address || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="locality" class="mb-2 block text-sm font-medium text-slate-300">Localidad</label>
								<input
									id="locality"
									name="locality"
									type="text"
									value={editingStudent.locality || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="postalCode" class="mb-2 block text-sm font-medium text-slate-300">Código Postal</label>
								<input
									id="postalCode"
									name="postalCode"
									type="text"
									value={editingStudent.postalCode || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
						</div>
					</div>

					<!-- Datos Educativos -->
					<div class="space-y-6 border-t border-slate-800 pt-6">
						<h3 class="text-lg font-semibold text-white">Datos Educativos</h3>
						<div class="grid gap-6 md:grid-cols-2">
							<div>
								<label for="highSchool" class="mb-2 block text-sm font-medium text-slate-300">Escuela Secundaria</label>
								<input
									id="highSchool"
									name="highSchool"
									type="text"
									value={editingStudent.highSchool || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="highSchoolYear" class="mb-2 block text-sm font-medium text-slate-300">Año de Egreso Secundario</label>
								<input
									id="highSchoolYear"
									name="highSchoolYear"
									type="number"
									min="1950"
									max={new Date().getFullYear()}
									value={editingStudent.highSchoolYear || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
							<div>
								<label for="instituteYear" class="mb-2 block text-sm font-medium text-slate-300">Año de Ingreso al Instituto</label>
								<input
									id="instituteYear"
									name="instituteYear"
									type="number"
									min="1950"
									max={new Date().getFullYear() + 1}
									value={editingStudent.instituteYear || ''}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
								/>
							</div>
						</div>
					</div>

					<div class="space-y-3">
						<div class="text-sm font-medium text-slate-300 mb-2">Tipo de Alumno</div>
						<div class="flex items-center space-x-6">
							<div class="flex items-center space-x-3">
								<input
									id="alumnoNormal"
									name="alumnoType"
									type="radio"
									value="normal"
									checked={!editingStudent.isBecado && !editingStudent.isRecursante}
									onchange={() => { editingStudent!.isBecado = false; editingStudent!.isRecursante = false; }}
									class="h-4 w-4 border-slate-600 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-2"
								/>
								<label for="alumnoNormal" class="text-sm text-slate-300">
									Normal
								</label>
							</div>
							<div class="flex items-center space-x-3">
								<input
									id="alumnoBecado"
									name="alumnoType"
									type="radio"
									value="becado"
									checked={editingStudent.isBecado}
									onchange={() => { editingStudent!.isBecado = true; editingStudent!.isRecursante = false; }}
									class="h-4 w-4 border-slate-600 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-2"
								/>
								<label for="alumnoBecado" class="text-sm text-slate-300">
									Becado
								</label>
							</div>
							<div class="flex items-center space-x-3">
								<input
									id="alumnoRecursante"
									name="alumnoType"
									type="radio"
									value="recursante"
									checked={editingStudent.isRecursante}
									onchange={() => { editingStudent!.isBecado = false; editingStudent!.isRecursante = true; }}
									class="h-4 w-4 border-slate-600 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-2"
								/>
								<label for="alumnoRecursante" class="text-sm text-slate-300">
									Recursante
								</label>
							</div>
						</div>
					</div>

					<!-- Sección de restablecimiento de contraseña -->
					<div class="border-t border-slate-800 pt-6">
						<div class="mb-4">
							<h3 class="text-lg font-semibold text-white mb-1">Restablecer Contraseña</h3>
							<p class="text-sm text-slate-400">Dejar en blanco si no deseas cambiar la contraseña.</p>
						</div>
						<div>
							<label for="newPassword" class="mb-2 block text-sm font-medium text-slate-300">
								Nueva Contraseña
							</label>
							<input
								id="newPassword"
								type="password"
								name="newPassword"
								placeholder="Ingresar nueva contraseña"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
					</div>

					<div class="flex justify-end space-x-4">
						<button
							type="button"
							onclick={() => editingStudent = null}
							class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
						>
							Guardar Cambios
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Modal de Eliminación -->
	{#if deletingStudent}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div class="bg-slate-900 rounded-3xl border border-slate-800 p-8 max-w-md w-full">
				<div class="flex items-center space-x-4 mb-6">
					<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
						<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-bold text-white">Eliminar Alumno</h2>
						<p class="text-sm text-slate-400">Esta acción no se puede deshacer</p>
					</div>
				</div>

				<div class="bg-slate-800/50 rounded-2xl p-4 mb-6">
					<p class="text-white font-medium">{deletingStudent.lastName}, {deletingStudent.firstName}</p>
					<p class="text-sm text-slate-400">DNI: {deletingStudent.dni}</p>
					<p class="text-sm text-slate-400">Email: {deletingStudent.email}</p>
				</div>

				<form
					method="POST"
					action="/alumnos/eliminar"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							deletingStudent = null;
						};
					}}
				>
					<input type="hidden" name="id" value={deletingStudent.id} />
					<input type="hidden" name="userId" value={deletingStudent.userId} />

					<div class="flex justify-end space-x-4">
						<button
							type="button"
							onclick={() => deletingStudent = null}
							class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-2xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600"
						>
							Eliminar Alumno
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>