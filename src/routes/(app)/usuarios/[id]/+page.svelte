<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form?: any } = $props();

	const isTeacher = $derived(data.user.roles.some((ur) => ur.role.code === 'DOCENTE'));

	const canViewEvaluations = $derived(
		data.user.roles.some((ur) => ['SUPERADMIN', 'DIRECTOR', 'DOCENTE'].includes(ur.role.code))
	);

	const isAdministrative = $derived(
		data.user.roles.some((ur) =>
			['SECRETARIA', 'PRECEPTOR', 'FINANZAS', 'APODERADO'].includes(ur.role.code)
		)
	);

	let resettingPassword = $state(false);

	function handleResetPassword() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				resettingPassword = false;
			}
		};
	}

	function formatDate(value: string | Date | null | undefined): string {
		if (!value) return 'No informado';

		return new Date(value).toLocaleDateString('es-AR');
	}

	function studentStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			ACTIVE: 'Activo',
			INACTIVE: 'Inactivo',
			GRADUATED: 'Egresado',
			SUSPENDED: 'Suspendido'
		};

		return labels[status] || status;
	}

	function dischargeReasonLabel(value: string | null | undefined): string {
		if (!value) return 'No informado';

		const labels: Record<string, string> = {
			VOLUNTARY_WITHDRAWAL: 'Baja voluntaria',
			ACADEMIC_DISMISSAL: 'Baja académica',
			FINANCIAL_DISMISSAL: 'Baja financiera',
			DISCIPLINARY_DISMISSAL: 'Baja disciplinaria',
			TRANSFER: 'Transferencia',
			DECEASED: 'Fallecimiento',
			OTHER: 'Otro'
		};

		return labels[value] || value;
	}
</script>

<svelte:head>
	<title>Usuario {data.user.firstName} {data.user.lastName} | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Usuario</p>
			<h1 class="text-3xl font-bold">{data.user.firstName} {data.user.lastName}</h1>
			<p class="mt-2 text-sm text-slate-400">{data.user.email}</p>
		</div>
		<div class="flex gap-3">
			{#if data.canResetPassword}
				{#if !resettingPassword}
					<button
						onclick={() => (resettingPassword = true)}
						class="rounded-2xl border border-amber-700 bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
					>
						Reestablecer Contraseña
					</button>
				{:else}
					<form method="POST" action="?/resetPassword" use:enhance={handleResetPassword}>
						<button
							type="submit"
							class="rounded-2xl bg-amber-600 px-6 py-3 font-semibold text-white transition hover:bg-amber-500"
						>
							Confirmar Reestablecer
						</button>
					</form>
					<button
						onclick={() => (resettingPassword = false)}
						class="rounded-2xl border border-slate-600 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
				{/if}
			{/if}
			<a
				href="/usuarios/{data.user.id}/editar"
				class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Editar Usuario
			</a>
		</div>
	</div>

	{#if form?.error}
		<div class="rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
			✗ {form.error}
		</div>
	{/if}

	{#if form?.success && form?.message}
		<div
			class="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-400"
		>
			✓ {form.message}
		</div>
	{/if}

	<div class="grid gap-6 md:grid-cols-2">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Información Personal</h2>
			<div class="space-y-3">
				<div>
					<p class="text-sm text-slate-400">Nombre</p>
					<p class="font-medium">{data.user.firstName}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Apellido</p>
					<p class="font-medium">{data.user.lastName}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Email</p>
					<p class="font-medium">{data.user.email}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">DNI</p>
					<p class="font-medium">
						{data.user.dni || data.user.student?.dni || data.user.teacher?.dni || '-'}
					</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Estado</p>
					<p
						class="font-medium {data.user.status === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}"
					>
						{data.user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Roles</h2>
			<div class="space-y-2">
				{#if data.user.roles.length > 0}
					{#each data.user.roles as userRole}
						<div class="rounded-xl bg-slate-800/50 px-4 py-2">
							<p class="font-medium">{userRole.role.name}</p>
							<p class="text-sm text-slate-400">{userRole.role.code}</p>
						</div>
					{/each}
				{:else}
					<p class="text-slate-400">Sin roles asignados</p>
				{/if}
			</div>
		</div>
	</div>

	{#if data.user.student}
		<div class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
			<div class="border-b border-slate-800 p-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p class="text-xs font-semibold tracking-[0.18em] text-indigo-300 uppercase">
							Ficha del alumno
						</p>
						<h2 class="mt-1 text-2xl font-bold text-white">Datos personales y académicos</h2>
						<p class="mt-1 text-sm text-slate-400">
							Información personal, carrera, sede, procedencia y contacto familiar.
						</p>
					</div>

					<span
						class="inline-flex w-fit rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200"
					>
						{studentStatusLabel(data.user.student.status)}
					</span>
				</div>
			</div>

			<div class="p-6">
				<div class="grid gap-6 xl:grid-cols-3">
					<!-- Identificación -->
					<section class="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Identificación y contacto
						</p>

						<div class="mt-5 space-y-4">
							<div>
								<p class="text-xs text-slate-500">Nombre completo</p>
								<p class="mt-1 font-semibold text-slate-100">
									{data.user.student.firstName}
									{data.user.student.lastName}
								</p>
							</div>

							<div class="grid gap-4 sm:grid-cols-2">
								<div>
									<p class="text-xs text-slate-500">DNI</p>
									<p class="mt-1 font-medium text-slate-200">{data.user.student.dni}</p>
								</div>

								<div>
									<p class="text-xs text-slate-500">CUIL</p>
									<p class="mt-1 font-medium text-slate-200">{data.user.cuil || 'No informado'}</p>
								</div>
							</div>

							<div class="grid gap-4 sm:grid-cols-2">
								<div>
									<p class="text-xs text-slate-500">Fecha de nacimiento</p>
									<p class="mt-1 font-medium text-slate-200">
										{formatDate(data.user.student.birthDate)}
									</p>
								</div>

								<div>
									<p class="text-xs text-slate-500">Grupo sanguíneo</p>
									<p class="mt-1 font-medium text-slate-200">
										{data.user.student.bloodType || 'No informado'}
									</p>
								</div>
							</div>

							<div>
								<p class="text-xs text-slate-500">Email</p>
								<p class="mt-1 font-medium break-all text-slate-200">
									{data.user.email}
								</p>
							</div>

							<div>
								<p class="text-xs text-slate-500">Teléfono</p>
								<p class="mt-1 font-medium text-slate-200">
									{data.user.student.phone || data.user.phone || 'No informado'}
								</p>
							</div>
						</div>
					</section>

					<!-- Carrera -->
					<section class="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
						<p class="text-xs font-semibold tracking-[0.16em] text-indigo-300 uppercase">
							Carrera y cursado
						</p>

						<div class="mt-5 space-y-4">
							<div>
								<p class="text-xs text-slate-500">Carrera</p>
								<p class="mt-1 text-lg font-bold text-white">
									{data.user.student.career?.name || 'No informada'}
								</p>

								{#if data.user.student.career?.code}
									<p class="mt-1 text-xs text-slate-400">
										Código: {data.user.student.career.code}
									</p>
								{/if}
							</div>

							<div>
								<p class="text-xs text-slate-500">Localidad / sede de la carrera</p>
								<p class="mt-1 font-semibold text-indigo-200">
									{data.user.student.location?.name || 'No asignada'}
								</p>
							</div>

							{#if data.user.student.career?.locations?.length}
								<div>
									<p class="text-xs text-slate-500">Localidades donde se dicta</p>
									<div class="mt-2 flex flex-wrap gap-2">
										{#each data.user.student.career.locations as careerLocation}
											<span
												class="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300"
											>
												{careerLocation.location.name}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<div class="grid gap-4 sm:grid-cols-2">
								<div>
									<p class="text-xs text-slate-500">Año actual</p>
									<p class="mt-1 font-medium text-slate-200">
										{data.user.student.currentYear}º año
									</p>
								</div>

								<div>
									<p class="text-xs text-slate-500">Estado académico</p>
									<p class="mt-1 font-medium text-slate-200">
										{studentStatusLabel(data.user.student.status)}
									</p>
								</div>
							</div>

							<div class="grid gap-3 sm:grid-cols-3">
								<div class="rounded-xl bg-slate-900/70 p-3">
									<p class="text-xs text-slate-500">Becado</p>
									<p class="mt-1 font-semibold text-slate-200">
										{data.user.student.isBecado ? 'Sí' : 'No'}
									</p>
								</div>

								<div class="rounded-xl bg-slate-900/70 p-3">
									<p class="text-xs text-slate-500">Recursante</p>
									<p class="mt-1 font-semibold text-slate-200">
										{data.user.student.isRecursante ? 'Sí' : 'No'}
									</p>
								</div>

								<div class="rounded-xl bg-slate-900/70 p-3">
									<p class="text-xs text-slate-500">Bloqueo financiero</p>
									<p class="mt-1 font-semibold text-slate-200">
										{data.user.student.financialBlocked ? 'Sí' : 'No'}
									</p>
								</div>
							</div>
						</div>
					</section>

					<!-- Procedencia -->
					<section class="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Domicilio y procedencia
						</p>

						<div class="mt-5 space-y-4">
							<div>
								<p class="text-xs text-slate-500">Domicilio</p>
								<p class="mt-1 font-medium text-slate-200">
									{data.user.student.address || 'No informado'}
								</p>
							</div>

							<div>
								<p class="text-xs text-slate-500">Localidad de origen</p>
								<p class="mt-1 text-lg font-semibold text-white">
									{data.user.student.locality || 'No informada'}
								</p>
							</div>

							<div>
								<p class="text-xs text-slate-500">Código postal</p>
								<p class="mt-1 font-medium text-slate-200">
									{data.user.student.postalCode || 'No informado'}
								</p>
							</div>

							<div class="border-t border-slate-800 pt-4">
								<p class="text-xs text-slate-500">Escuela secundaria</p>
								<p class="mt-1 font-medium text-slate-200">
									{data.user.student.highSchool || 'No informada'}
								</p>
							</div>

							<div class="grid gap-4 sm:grid-cols-2">
								<div>
									<p class="text-xs text-slate-500">Año secundario</p>
									<p class="mt-1 font-medium text-slate-200">
										{data.user.student.highSchoolYear || 'No informado'}
									</p>
								</div>

								<div>
									<p class="text-xs text-slate-500">Año instituto</p>
									<p class="mt-1 font-medium text-slate-200">
										{data.user.student.instituteYear || 'No informado'}
									</p>
								</div>
							</div>
						</div>
					</section>
				</div>

				<!-- Contacto familiar -->
				<div class="mt-6 grid gap-6 lg:grid-cols-2">
					<section class="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
						<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
							Contacto familiar
						</p>

						<div class="mt-4 grid gap-4 sm:grid-cols-3">
							<div>
								<p class="text-xs text-slate-500">Nombre</p>
								<p class="mt-1 font-medium text-slate-200">
									{data.user.student.familyContactName || 'No informado'}
								</p>
							</div>

							<div>
								<p class="text-xs text-slate-500">Vínculo</p>
								<p class="mt-1 font-medium text-slate-200">
									{data.user.student.familyRelationship || 'No informado'}
								</p>
							</div>

							<div>
								<p class="text-xs text-slate-500">Teléfono</p>
								<p class="mt-1 font-medium text-slate-200">
									{data.user.student.familyContactPhone || 'No informado'}
								</p>
							</div>
						</div>
					</section>

					{#if data.user.student.dischargeReason || data.user.student.dischargeDate || data.user.student.dischargeNotes}
						<section class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
							<p class="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
								Información de baja
							</p>

							<div class="mt-4 space-y-3">
								<div>
									<p class="text-xs text-slate-500">Motivo</p>
									<p class="mt-1 font-medium text-slate-200">
										{dischargeReasonLabel(data.user.student.dischargeReason)}
									</p>
								</div>

								<div>
									<p class="text-xs text-slate-500">Fecha</p>
									<p class="mt-1 font-medium text-slate-200">
										{formatDate(data.user.student.dischargeDate)}
									</p>
								</div>

								{#if data.user.student.dischargeNotes}
									<div>
										<p class="text-xs text-slate-500">Observaciones</p>
										<p class="mt-1 text-sm whitespace-pre-line text-slate-300">
											{data.user.student.dischargeNotes}
										</p>
									</div>
								{/if}
							</div>
						</section>
					{:else}
						<section class="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
							<p class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
								Situación
							</p>

							<p class="mt-4 text-sm text-slate-300">No registra información de baja.</p>
						</section>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if isTeacher && data.teacherCareer}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Carrera</h2>
			<div class="rounded-xl bg-slate-800/50 p-4">
				<p class="font-medium">{data.teacherCareer.name}</p>
				<p class="text-sm text-slate-400">{data.teacherCareer.code}</p>
				{#if data.teacherCareer.locations && data.teacherCareer.locations.length > 0}
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each data.teacherCareer.locations as location}
							<span
								class="inline-flex items-center rounded-lg bg-slate-700 px-2 py-1 text-xs font-medium text-slate-300"
							>
								{location}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if isAdministrative}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Datos Administrativos</h2>
			<div class="space-y-3">
				{#if data.user.phone}
					<div>
						<p class="text-sm text-slate-400">Teléfono</p>
						<p class="font-medium">{data.user.phone}</p>
					</div>
				{/if}
				{#if data.user.locationPermissions && data.user.locationPermissions.length > 0}
					<div>
						<p class="text-sm text-slate-400">Localidad de Trabajo</p>
						<div class="space-y-1">
							{#each data.user.locationPermissions as lp}
								<p class="font-medium">{lp.location.name}</p>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if isTeacher && data.user.teacher}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Materias Asignadas</h2>
			{#if data.user.teacher.subjects.length > 0}
				<div class="space-y-3">
					{#each data.user.teacher.subjects as subjectTeacher}
						<div class="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium">{subjectTeacher.subject.name}</p>
									<p class="text-sm text-slate-400">
										{subjectTeacher.subject.code} - Año {subjectTeacher.subject.yearLevel}
									</p>
								</div>
								<a
									href="/materias/{subjectTeacher.subject.id}"
									class="text-sm text-blue-400 hover:text-blue-300"
								>
									Ver materia
								</a>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-slate-400">Este docente no tiene materias asignadas.</p>
			{/if}
		</div>
	{/if}

	{#if canViewEvaluations && data.evaluations && data.evaluations.length > 0}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Evaluaciones Creadas</h2>
			<div class="space-y-3">
				{#each data.evaluations as evaluation}
					<div class="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">{evaluation.title}</p>
								<p class="text-sm text-slate-400">
									{evaluation.subject} ({evaluation.subjectCode}) - {evaluation.type}
								</p>
								{#if evaluation.date}
									<p class="text-sm text-slate-400">
										Fecha: {new Date(evaluation.date).toLocaleDateString('es-AR')}
									</p>
								{/if}
							</div>
							<p class="text-sm text-slate-400">Creado por: {evaluation.creator}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
