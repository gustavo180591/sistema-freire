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

	function getInitialStudentSelection() {
		return {
			careerId: data.user.student?.careerId ?? '',
			locationId: data.user.student?.locationId ?? ''
		};
	}

	const initialStudentSelection = getInitialStudentSelection();

	let selectedStudentCareerId = $state(initialStudentSelection.careerId);
	let selectedStudentLocationId = $state(initialStudentSelection.locationId);

	const studentCareerLocations = $derived(
		data.careers.find((career) => career.id === selectedStudentCareerId)?.locations ?? []
	);

	function handleStudentCareerChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		selectedStudentCareerId = select.value;

		const career = data.careers.find((item) => item.id === selectedStudentCareerId);
		const validLocation = career?.locations.some(
			(item) => item.location.id === selectedStudentLocationId
		);

		if (!validLocation) {
			selectedStudentLocationId = '';
		}
	}

	function dateInputValue(value: string | Date | null | undefined): string {
		if (!value) return '';

		return new Date(value).toISOString().slice(0, 10);
	}
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
			{form?.message || 'Datos actualizados correctamente'}
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
					<label for="cuil" class="mb-1 block text-sm text-slate-400">CUIL</label>
					<input
						id="cuil"
						name="cuil"
						type="text"
						value={data.user.cuil ?? ''}
						placeholder="20-12345678-9"
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

	{#if data.user.student}
		<div class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
			<div class="border-b border-slate-800 p-6">
				<p class="text-xs font-semibold tracking-[0.18em] text-indigo-300 uppercase">Alumno</p>
				<h2 class="mt-1 text-xl font-bold text-white">Datos personales y académicos</h2>
				<p class="mt-1 text-sm text-slate-400">
					Editá la carrera, sede donde cursa, localidad de origen y datos personales del alumno.
				</p>
			</div>

			<form method="POST" action="?/updateStudent" use:enhance class="space-y-6 p-6">
				<!-- Carrera y cursado -->
				<section class="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
					<p class="text-xs font-semibold tracking-[0.16em] text-indigo-300 uppercase">
						Carrera y cursado
					</p>

					<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<div class="xl:col-span-2">
							<label for="studentCareerId" class="mb-2 block text-sm text-slate-400">
								Carrera
							</label>

							<select
								id="studentCareerId"
								name="studentCareerId"
								bind:value={selectedStudentCareerId}
								onchange={handleStudentCareerChange}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
							>
								<option value="">Seleccionar carrera</option>

								{#each data.careers as career}
									<option value={career.id}>
										{career.name}
									</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="studentLocationId" class="mb-2 block text-sm text-slate-400">
								Localidad / sede de la carrera
							</label>

							<select
								id="studentLocationId"
								name="studentLocationId"
								bind:value={selectedStudentLocationId}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
							>
								<option value="">Sin sede asignada</option>

								{#each studentCareerLocations as careerLocation}
									<option value={careerLocation.location.id}>
										{careerLocation.location.name}
									</option>
								{/each}
							</select>

							<p class="mt-1 text-xs text-slate-500">
								Solo aparecen las sedes habilitadas para la carrera seleccionada.
							</p>
						</div>

						<div>
							<label for="currentYear" class="mb-2 block text-sm text-slate-400">
								Año actual
							</label>

							<input
								id="currentYear"
								name="currentYear"
								type="number"
								min="1"
								value={data.user.student.currentYear}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
							/>
						</div>
					</div>

					<div class="mt-4">
						<label for="studentType" class="mb-2 block text-sm text-slate-400">
							Tipo de alumno
						</label>

						<select
							id="studentType"
							name="studentType"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500 md:max-w-sm"
						>
							<option
								value="normal"
								selected={!data.user.student.isBecado && !data.user.student.isRecursante}
							>
								Normal
							</option>

							<option value="becado" selected={data.user.student.isBecado}> Becado </option>

							<option value="recursante" selected={data.user.student.isRecursante}>
								Recursante
							</option>
						</select>
					</div>
				</section>

				<!-- Información personal -->
				<section class="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
						Información personal del alumno
					</p>

					<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						<div>
							<label for="birthDate" class="mb-2 block text-sm text-slate-400">
								Fecha de nacimiento
							</label>
							<input
								id="birthDate"
								name="birthDate"
								type="date"
								value={dateInputValue(data.user.student.birthDate)}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>

						<div>
							<label for="bloodType" class="mb-2 block text-sm text-slate-400">
								Grupo sanguíneo
							</label>
							<input
								id="bloodType"
								name="bloodType"
								type="text"
								value={data.user.student.bloodType ?? ''}
								placeholder="Ej.: O+"
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>

						<div>
							<label for="studentPhone" class="mb-2 block text-sm text-slate-400">
								Teléfono del alumno
							</label>
							<input
								id="studentPhone"
								name="studentPhone"
								type="tel"
								value={data.user.student.phone ?? ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
					</div>
				</section>

				<!-- Domicilio y procedencia -->
				<section class="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
						Domicilio y procedencia
					</p>

					<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						<div class="xl:col-span-2">
							<label for="address" class="mb-2 block text-sm text-slate-400"> Domicilio </label>
							<input
								id="address"
								name="address"
								type="text"
								value={data.user.student.address ?? ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>

						<div>
							<label for="postalCode" class="mb-2 block text-sm text-slate-400">
								Código postal
							</label>
							<input
								id="postalCode"
								name="postalCode"
								type="text"
								value={data.user.student.postalCode ?? ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>

						<div class="md:col-span-2 xl:col-span-3">
							<label for="locality" class="mb-2 block text-sm text-slate-400">
								Localidad de origen
							</label>
							<input
								id="locality"
								name="locality"
								type="text"
								value={data.user.student.locality ?? ''}
								placeholder="Ej.: Eldorado, Oberá, Posadas..."
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
							<p class="mt-1 text-xs text-slate-500">
								Esta localidad corresponde al domicilio/procedencia del alumno, no a la sede donde
								cursa.
							</p>
						</div>
					</div>
				</section>

				<!-- Estudios previos -->
				<section class="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
						Estudios previos
					</p>

					<div class="mt-4 grid gap-4 md:grid-cols-3">
						<div>
							<label for="highSchool" class="mb-2 block text-sm text-slate-400">
								Escuela secundaria
							</label>
							<input
								id="highSchool"
								name="highSchool"
								type="text"
								value={data.user.student.highSchool ?? ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>

						<div>
							<label for="highSchoolYear" class="mb-2 block text-sm text-slate-400">
								Año secundario
							</label>
							<input
								id="highSchoolYear"
								name="highSchoolYear"
								type="number"
								min="1900"
								max="2200"
								value={data.user.student.highSchoolYear ?? ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>

						<div>
							<label for="instituteYear" class="mb-2 block text-sm text-slate-400">
								Año de ingreso al instituto
							</label>
							<input
								id="instituteYear"
								name="instituteYear"
								type="number"
								min="1900"
								max="2200"
								value={data.user.student.instituteYear ?? ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
					</div>
				</section>

				<!-- Contacto familiar -->
				<section class="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
					<p class="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
						Contacto familiar
					</p>

					<div class="mt-4 grid gap-4 md:grid-cols-3">
						<div>
							<label for="familyContactName" class="mb-2 block text-sm text-slate-400">
								Nombre y apellido
							</label>
							<input
								id="familyContactName"
								name="familyContactName"
								type="text"
								value={data.user.student.familyContactName ?? ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>

						<div>
							<label for="familyRelationship" class="mb-2 block text-sm text-slate-400">
								Vínculo
							</label>
							<input
								id="familyRelationship"
								name="familyRelationship"
								type="text"
								value={data.user.student.familyRelationship ?? ''}
								placeholder="Madre, padre, tutor..."
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>

						<div>
							<label for="familyContactPhone" class="mb-2 block text-sm text-slate-400">
								Teléfono
							</label>
							<input
								id="familyContactPhone"
								name="familyContactPhone"
								type="tel"
								value={data.user.student.familyContactPhone ?? ''}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
							/>
						</div>
					</div>
				</section>

				<div class="flex justify-end">
					<button
						type="submit"
						class="rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400"
					>
						Guardar datos del alumno
					</button>
				</div>
			</form>
		</div>
	{/if}

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
