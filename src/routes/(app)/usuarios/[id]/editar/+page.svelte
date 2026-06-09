<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form?: any } = $props();

	const isTeacher = $derived(data.user.roles.some((ur) => ur.role.code === 'DOCENTE'));

	const assignedSubjects = $derived(data.user.teacher?.subjects.map((st) => st.subject) ?? []);

	const availableSubjects = $derived(
		data.subjects.filter((s) => !assignedSubjects.some((as) => as.id === s.id))
	);
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
			<h2 class="mb-4 text-xl font-bold">Datos Personales</h2>
			<form method="POST" action="?/updateUser" use:enhance class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="firstName" class="mb-1 block text-sm text-slate-400">Nombre</label>
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
						<label for="lastName" class="mb-1 block text-sm text-slate-400">Apellido</label>
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
						<label for="email" class="mb-1 block text-sm text-slate-400">Email</label>
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
						<label for="status" class="mb-1 block text-sm text-slate-400">Estado</label>
						<select
							id="status"
							name="status"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
						>
							<option value="ACTIVE" selected={data.user.status === 'ACTIVE'}>Activo</option>
							<option value="INACTIVE" selected={data.user.status === 'INACTIVE'}>Inactivo</option>
						</select>
					</div>
				</div>

				{#if data.user.student}
					<div class="mt-4 border-t border-slate-800 pt-4">
						<h3 class="mb-4 text-lg font-semibold">Datos de Estudiante</h3>
						<div class="grid gap-4 md:grid-cols-2">
							<div>
								<label for="dni" class="mb-1 block text-sm text-slate-400">DNI</label>
								<input
									id="dni"
									name="dni"
									type="text"
									value={data.user.student.dni}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div>
								<label for="birthDate" class="mb-1 block text-sm text-slate-400"
									>Fecha de Nacimiento</label
								>
								<input
									id="birthDate"
									name="birthDate"
									type="date"
									value={data.user.student.birthDate
										? new Date(data.user.student.birthDate).toISOString().split('T')[0]
										: ''}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div>
								<label for="bloodType" class="mb-1 block text-sm text-slate-400"
									>Grupo Sanguíneo</label
								>
								<select
									id="bloodType"
									name="bloodType"
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								>
									<option value="">Seleccionar...</option>
									<option value="O+" selected={data.user.student.bloodType === 'O+'}>O+</option>
									<option value="O-" selected={data.user.student.bloodType === 'O-'}>O-</option>
									<option value="A+" selected={data.user.student.bloodType === 'A+'}>A+</option>
									<option value="A-" selected={data.user.student.bloodType === 'A-'}>A-</option>
									<option value="B+" selected={data.user.student.bloodType === 'B+'}>B+</option>
									<option value="B-" selected={data.user.student.bloodType === 'B-'}>B-</option>
									<option value="AB+" selected={data.user.student.bloodType === 'AB+'}>AB+</option>
									<option value="AB-" selected={data.user.student.bloodType === 'AB-'}>AB-</option>
								</select>
							</div>
							<div>
								<label for="phone" class="mb-1 block text-sm text-slate-400">Teléfono</label>
								<input
									id="phone"
									name="phone"
									type="tel"
									value={data.user.student.phone || ''}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div>
								<label for="address" class="mb-1 block text-sm text-slate-400">Dirección</label>
								<input
									id="address"
									name="address"
									type="text"
									value={data.user.student.address || ''}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div>
								<label for="locality" class="mb-1 block text-sm text-slate-400">Localidad</label>
								<select
									id="locality"
									name="locality"
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								>
									<option value="">Seleccionar...</option>
									<option value="ALEM" selected={data.user.student.locality === 'ALEM'}
										>Leandro N. Alem</option
									>
									<option value="CAPIOVI" selected={data.user.student.locality === 'CAPIOVI'}
										>Capiovi</option
									>
								</select>
							</div>
							<div>
								<label for="postalCode" class="mb-1 block text-sm text-slate-400"
									>Código Postal</label
								>
								<input
									id="postalCode"
									name="postalCode"
									type="text"
									value={data.user.student.postalCode || ''}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div>
								<label for="careerId" class="mb-1 block text-sm text-slate-400">Carrera</label>
								<select
									id="careerId"
									name="careerId"
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								>
									<option value="">Seleccionar...</option>
									{#each data.careers as career}
										<option value={career.id} selected={data.user.student.careerId === career.id}
											>{career.name}</option
										>
									{/each}
								</select>
							</div>
							<div>
								<label for="currentYear" class="mb-1 block text-sm text-slate-400"
									>Año de Carrera</label
								>
								<select
									id="currentYear"
									name="currentYear"
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								>
									<option value="1" selected={data.user.student.currentYear === 1}>1° Año</option>
									<option value="2" selected={data.user.student.currentYear === 2}>2° Año</option>
									<option value="3" selected={data.user.student.currentYear === 3}>3° Año</option>
									<option value="4" selected={data.user.student.currentYear === 4}>4° Año</option>
								</select>
							</div>
						</div>
					</div>
				{/if}

				{#if data.user.teacher}
					<div class="mt-4 border-t border-slate-800 pt-4">
						<h3 class="mb-4 text-lg font-semibold">Datos de Docente</h3>
						<div class="grid gap-4 md:grid-cols-2">
							<div>
								<label for="dni" class="mb-1 block text-sm text-slate-400">DNI</label>
								<input
									id="dni"
									name="dni"
									type="text"
									value={data.user.teacher.dni}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div>
								<label for="phone" class="mb-1 block text-sm text-slate-400">Teléfono</label>
								<input
									id="phone"
									name="phone"
									type="tel"
									value={data.user.phone || ''}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div>
								<label for="teacherStatus" class="mb-1 block text-sm text-slate-400"
									>Estado Laboral</label
								>
								<select
									id="teacherStatus"
									name="teacherStatus"
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								>
									<option value="ACTIVE" selected={data.user.teacher.status === 'ACTIVE'}
										>Activo</option
									>
									<option value="INACTIVE" selected={data.user.teacher.status === 'INACTIVE'}
										>Inactivo</option
									>
									<option value="SUSPENDED" selected={data.user.teacher.status === 'SUSPENDED'}
										>Suspendido</option
									>
									<option value="RESIGNED" selected={data.user.teacher.status === 'RESIGNED'}
										>Renunció</option
									>
								</select>
							</div>
							<div>
								<label for="hireDate" class="mb-1 block text-sm text-slate-400"
									>Fecha de Ingreso</label
								>
								<input
									id="hireDate"
									name="hireDate"
									type="date"
									value={data.user.teacher.hireDate
										? new Date(data.user.teacher.hireDate).toISOString().split('T')[0]
										: ''}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div class="md:col-span-2">
								<label for="observations" class="mb-1 block text-sm text-slate-400"
									>Observaciones</label
								>
								<textarea
									id="observations"
									name="observations"
									rows="3"
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
									placeholder="Notas adicionales sobre el docente..."
									>{data.user.teacher.observations || ''}</textarea
								>
							</div>
						</div>
					</div>
				{/if}

				{#if !data.user.student && !data.user.teacher}
					<div class="mt-4 border-t border-slate-800 pt-4">
						<h3 class="mb-4 text-lg font-semibold">Datos Administrativos</h3>
						<div class="grid gap-4 md:grid-cols-2">
							<div>
								<label for="phone" class="mb-1 block text-sm text-slate-400">Teléfono</label>
								<input
									id="phone"
									name="phone"
									type="tel"
									value={data.user.phone || ''}
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								/>
							</div>
							<div>
								<label for="locality" class="mb-1 block text-sm text-slate-400"
									>Localidad de Trabajo</label
								>
								<select
									id="locality"
									name="locality"
									class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
								>
									<option value="">Seleccionar...</option>
									{#each data.locations as location}
										<option
											value={location.code}
											selected={data.user.locationPermissions?.some(
												(lp) => lp.location.code === location.code
											)}>{location.name}</option
										>
									{/each}
								</select>
								<p class="mt-1 text-xs text-slate-500">
									El usuario tendrá acceso a los datos de esta localidad
								</p>
							</div>
						</div>
					</div>
				{/if}

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
			<h2 class="mb-4 text-xl font-bold">Roles</h2>
			<form method="POST" action="?/updateRoles" use:enhance class="space-y-4">
				<div class="space-y-2">
					{#each data.roles as role}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:bg-slate-800"
						>
							<input
								type="checkbox"
								name="roleIds"
								value={role.id}
								checked={data.user.roles.some((ur) => ur.roleId === role.id)}
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

	<!-- Seguridad -->
	{#if data.currentUserRoles && data.currentUserRoles.some( (r) => ['SUPERADMIN', 'DIRECTOR'].includes(r) )}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Seguridad</h2>
			<div class="space-y-4">
				<form method="POST" action="?/revokeAllSessions" use:enhance>
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium text-white">Revocar todas las sesiones</p>
							<p class="text-sm text-slate-400">
								Este usuario deberá volver a iniciar sesión en todos sus dispositivos
							</p>
						</div>
						<button
							type="submit"
							class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
						>
							Revocar Sesiones
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if isTeacher}
		<!-- Materias del Docente -->
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Materias Asignadas</h2>

			<!-- Lista de materias actuales -->
			{#if assignedSubjects.length > 0}
				<div class="mb-6 space-y-3">
					{#each assignedSubjects as subject}
						<div
							class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 p-4"
						>
							<div>
								<p class="font-medium">{subject.name}</p>
								<p class="text-sm text-slate-400">{subject.code} - Año {subject.yearLevel}</p>
							</div>
							<form
								method="POST"
								action="?/removeSubject"
								use:enhance
								class="flex items-center gap-2"
							>
								<input type="hidden" name="subjectId" value={subject.id} />
								<button
									type="submit"
									class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
								>
									Eliminar
								</button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="mb-6 text-slate-400">Este docente no tiene materias asignadas.</p>
			{/if}

			<!-- Agregar nueva materia -->
			{#if availableSubjects.length > 0}
				<div class="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
					<h3 class="mb-4 font-medium">Asignar Materia</h3>
					<form method="POST" action="?/addSubject" use:enhance class="flex gap-3">
						<select
							name="subjectId"
							class="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
							required
						>
							<option value="">Seleccionar materia...</option>
							{#each availableSubjects as subject}
								<option value={subject.id}
									>{subject.code} - {subject.name} (Año {subject.yearLevel})</option
								>
							{/each}
						</select>
						<button
							type="submit"
							class="rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-600"
						>
							Asignar
						</button>
					</form>
				</div>
			{:else}
				<p class="text-slate-400">No hay materias disponibles para asignar.</p>
			{/if}
		</div>
	{/if}
</div>
