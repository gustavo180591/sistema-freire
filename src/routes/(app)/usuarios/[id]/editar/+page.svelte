<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form?: any } = $props();

	const isTeacher = $derived(
		data.user.roles.some((ur) => ur.role.code === 'DOCENTE')
	);

	const assignedSubjects = $derived(
		data.user.teacher?.subjects.map((st) => st.subject) ?? []
	);

	const availableSubjects = $derived(
		data.subjects.filter(
			(s) => !assignedSubjects.some((as) => as.id === s.id)
		)
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
			<h2 class="text-xl font-bold mb-4">Datos Personales</h2>
			<form method="POST" action="?/updateUser" use:enhance class="space-y-4">
				<div class="grid gap-4 md:grid-cols-2">
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
				</div>

				{#if data.user.student}
				<div class="border-t border-slate-800 pt-4 mt-4">
					<h3 class="text-lg font-semibold mb-4">Datos de Estudiante</h3>
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<label for="dni" class="block text-sm text-slate-400 mb-1">DNI</label>
							<input
								id="dni"
								name="dni"
								type="text"
								value={data.user.student.dni}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
						<div>
							<label for="birthDate" class="block text-sm text-slate-400 mb-1">Fecha de Nacimiento</label>
							<input
								id="birthDate"
								name="birthDate"
								type="date"
								value={data.user.student.birthDate ? new Date(data.user.student.birthDate).toISOString().split('T')[0] : ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
						<div>
							<label for="bloodType" class="block text-sm text-slate-400 mb-1">Grupo Sanguíneo</label>
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
							<label for="phone" class="block text-sm text-slate-400 mb-1">Teléfono</label>
							<input
								id="phone"
								name="phone"
								type="tel"
								value={data.user.student.phone || ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
						<div>
							<label for="address" class="block text-sm text-slate-400 mb-1">Dirección</label>
							<input
								id="address"
								name="address"
								type="text"
								value={data.user.student.address || ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
						<div>
							<label for="locality" class="block text-sm text-slate-400 mb-1">Localidad</label>
							<select
								id="locality"
								name="locality"
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							>
								<option value="">Seleccionar...</option>
								<option value="ALEM" selected={data.user.student.locality === 'ALEM'}>Leandro N. Alem</option>
								<option value="CAPIOVI" selected={data.user.student.locality === 'CAPIOVI'}>Capiovi</option>
							</select>
						</div>
						<div>
							<label for="postalCode" class="block text-sm text-slate-400 mb-1">Código Postal</label>
							<input
								id="postalCode"
								name="postalCode"
								type="text"
								value={data.user.student.postalCode || ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
						<div>
							<label for="careerId" class="block text-sm text-slate-400 mb-1">Carrera</label>
							<select
								id="careerId"
								name="careerId"
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							>
								<option value="">Seleccionar...</option>
								{#each data.careers as career}
									<option value={career.id} selected={data.user.student.careerId === career.id}>{career.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="currentYear" class="block text-sm text-slate-400 mb-1">Año de Carrera</label>
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
				<div class="border-t border-slate-800 pt-4 mt-4">
					<h3 class="text-lg font-semibold mb-4">Datos de Docente</h3>
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<label for="dni" class="block text-sm text-slate-400 mb-1">DNI</label>
							<input
								id="dni"
								name="dni"
								type="text"
								value={data.user.teacher.dni}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
						<div>
							<label for="phone" class="block text-sm text-slate-400 mb-1">Teléfono</label>
							<input
								id="phone"
								name="phone"
								type="tel"
								value={data.user.phone || ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
					</div>
				</div>
				{/if}

				{#if !data.user.student && !data.user.teacher}
				<div class="border-t border-slate-800 pt-4 mt-4">
					<h3 class="text-lg font-semibold mb-4">Datos Administrativos</h3>
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<label for="phone" class="block text-sm text-slate-400 mb-1">Teléfono</label>
							<input
								id="phone"
								name="phone"
								type="tel"
								value={data.user.phone || ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
						<div>
							<label for="locality" class="block text-sm text-slate-400 mb-1">Localidad de Trabajo</label>
							<select
								id="locality"
								name="locality"
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							>
								<option value="">Seleccionar...</option>
								{#each data.locations as location}
									<option value={location.code} selected={data.user.locationPermissions?.some(lp => lp.location.code === location.code)}>{location.name}</option>
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

	<!-- Seguridad -->
	{#if data.currentUserRoles && data.currentUserRoles.some(r => ['SUPERADMIN', 'DIRECTOR'].includes(r))}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="text-xl font-bold mb-4">Seguridad</h2>
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
							class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition"
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
			<h2 class="text-xl font-bold mb-4">Materias Asignadas</h2>

			<!-- Lista de materias actuales -->
			{#if assignedSubjects.length > 0}
				<div class="mb-6 space-y-3">
					{#each assignedSubjects as subject}
						<div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 p-4">
							<div>
								<p class="font-medium">{subject.name}</p>
								<p class="text-sm text-slate-400">{subject.code} - Año {subject.yearLevel}</p>
							</div>
							<form method="POST" action="?/removeSubject" use:enhance class="flex items-center gap-2">
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
								<option value={subject.id}>{subject.code} - {subject.name} (Año {subject.yearLevel})</option>
							{/each}
						</select>
						<button
							type="submit"
							class="rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium text-white hover:bg-blue-600 transition"
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
