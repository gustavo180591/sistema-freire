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
						class="rounded-2xl border border-amber-600 bg-amber-950/30 px-6 py-3 font-semibold text-amber-400 transition hover:bg-amber-950/50"
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
		<div class="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-400">
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
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Datos de Estudiante</h2>
			<div class="space-y-3">
				<div>
					<p class="text-sm text-slate-400">DNI</p>
					<p class="font-medium">{data.user.student.dni}</p>
				</div>
				<div>
					<p class="text-sm text-slate-400">Fecha de Nacimiento</p>
					<p class="font-medium">
						{data.user.student.birthDate
							? new Date(data.user.student.birthDate).toLocaleDateString('es-AR')
							: 'No especificada'}
					</p>
				</div>
			</div>
		</div>
	{/if}

	{#if data.user.teacher}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h2 class="mb-4 text-xl font-bold">Datos de Docente</h2>
			<div class="space-y-3">
				<div>
					<p class="text-sm text-slate-400">DNI</p>
					<p class="font-medium">{data.user.teacher.dni}</p>
				</div>
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
