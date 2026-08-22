<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let {
		data,
		form
	}: { data: PageData; form?: { success?: boolean; error?: string; message?: string } } = $props();

	const isTeacher = $derived(data.user.roles.some((ur) => ur.role.code === 'DOCENTE'));

	const assignedSubjects = $derived(data.user.teacher?.subjects ?? []);

	const availableSubjects = $derived(
		data.subjects.filter(
			(subject) => !assignedSubjects.some((assignment) => assignment.subject.id === subject.id)
		)
	);

	const hasStudentOrTeacher = $derived(data.user.student || data.user.teacher);
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

	<!-- Card Datos Personales -->
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
						<option value="BLOCKED" selected={data.user.status === 'BLOCKED'}>Bloqueado</option>
					</select>
				</div>
				<div>
					<label for="dni" class="mb-1 block text-sm text-slate-400">DNI</label>
					<input
						id="dni"
						name="dni"
						type="text"
						value={data.user.dni || data.user.student?.dni || data.user.teacher?.dni || ''}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>
				<div>
					<label for="phone" class="mb-1 block text-sm text-slate-400">Teléfono</label>
					<input
						id="phone"
						name="phone"
						type="tel"
						value={data.user.phone ?? ''}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
					/>
				</div>
			</div>
			<button
				type="submit"
				class="w-full rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:scale-[1.02]"
			>
				Guardar Datos
			</button>
		</form>
	</div>

	<!-- Card Sedes Habilitadas -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="mb-4 text-xl font-bold">Sedes Habilitadas</h2>
		<form method="POST" action="?/updateLocations" use:enhance class="space-y-4">
			<div class="space-y-2">
				{#each data.locations as location}
					<label
						class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:bg-slate-800"
					>
						<input
							type="checkbox"
							name="locationIds"
							value={location.id}
							checked={data.user.locationPermissions.some((lp) => lp.location.id === location.id)}
							class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500"
						/>
						<div>
							<p class="font-medium">{location.name}</p>
							<p class="text-sm text-slate-400">{location.code}</p>
						</div>
					</label>
				{/each}
			</div>
			<button
				type="submit"
				class="w-full rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:scale-[1.02]"
			>
				Guardar Sedes
			</button>
		</form>
	</div>

	<!-- Card Roles -->
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
							checked={data.user.roles.some((ur) => ur.role.id === role.id)}
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
				class="w-full rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:scale-[1.02]"
			>
				Guardar Roles
			</button>
		</form>
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
			<div class="mb-5">
				<h2 class="text-xl font-bold">Materias Asignadas</h2>
				<p class="mt-1 text-sm text-slate-400">
					Administrá las materias del docente y su condición como titular o suplente.
				</p>
			</div>

			{#if assignedSubjects.length > 0}
				<div class="mb-6 space-y-3">
					{#each assignedSubjects as assignment}
						{@const subject = assignment.subject}

						<div
							class="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-800/50 p-4 lg:flex-row lg:items-center lg:justify-between"
						>
							<div class="min-w-0 flex-1">
								<p class="font-medium">{subject.name}</p>
								<p class="text-sm text-slate-400">
									{subject.code} · Año {subject.yearLevel}
								</p>

								<div class="mt-2">
									<span
										class="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium {assignment.assignmentType ===
										'SUPLENTE'
											? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
											: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}"
									>
										{assignment.assignmentType === 'SUPLENTE' ? 'Suplente' : 'Titular'}
									</span>
								</div>
							</div>

							<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
								<form
									method="POST"
									action="?/updateSubjectAssignment"
									use:enhance
									class="flex items-center gap-2"
								>
									<input type="hidden" name="subjectId" value={subject.id} />

									<label for={`assignment-${subject.id}`} class="sr-only">
										Condición docente
									</label>

									<select
										id={`assignment-${subject.id}`}
										name="assignmentType"
										class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
									>
										<option value="TITULAR" selected={assignment.assignmentType !== 'SUPLENTE'}>
											Titular
										</option>
										<option value="SUPLENTE" selected={assignment.assignmentType === 'SUPLENTE'}>
											Suplente
										</option>
									</select>

									<button
										type="submit"
										class="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
									>
										Guardar
									</button>
								</form>

								<form method="POST" action="?/removeSubject" use:enhance>
									<input type="hidden" name="subjectId" value={subject.id} />

									<button
										type="submit"
										class="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/20"
									>
										Eliminar
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="mb-6 text-slate-400">Este docente no tiene materias asignadas.</p>
			{/if}

			{#if availableSubjects.length > 0}
				<div class="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
					<h3 class="font-medium">Asignar Materia</h3>
					<p class="mt-1 mb-4 text-sm text-slate-400">
						Seleccioná la materia y la condición docente.
					</p>

					<form
						method="POST"
						action="?/addSubject"
						use:enhance
						class="grid gap-3 md:grid-cols-[1fr_auto_auto]"
					>
						<select
							name="subjectId"
							class="min-w-0 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
							required
						>
							<option value="">Seleccionar materia...</option>

							{#each availableSubjects as subject}
								<option value={subject.id}>
									{subject.code} - {subject.name} (Año {subject.yearLevel})
								</option>
							{/each}
						</select>

						<select
							name="assignmentType"
							aria-label="Condición docente"
							class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
							required
						>
							<option value="TITULAR">Titular</option>
							<option value="SUPLENTE">Suplente</option>
						</select>

						<button
							type="submit"
							class="rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:scale-[1.02]"
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
