<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let userType = $state('ALUMNO');
	let loading = $state(false);

	const emailLabel = $derived(
		userType === 'ALUMNO' ? 'Correo' : 'Correo institucional'
	);
</script>

<svelte:head>
	<title>Nuevo usuario | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<div>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Administración</p>
		<h1 class="text-3xl font-bold tracking-tight">Alta institucional de usuario</h1>
		<p class="mt-2 text-sm text-slate-400">
			El alta genera identidad, rol, perfil institucional y auditoría.
		</p>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-800 bg-red-950/50 p-4 text-red-200">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-2xl border border-green-800 bg-green-950/50 p-4 text-green-200">
			{form.success}
		</div>
	{/if}

	<form
		method="POST"
		class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="type" class="mb-2 block text-sm font-medium text-slate-300">Tipo de usuario</label>
				<select
					id="type"
					bind:value={userType}
					name="type"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				>
					<option value="ALUMNO">Alumno</option>
					<option value="DOCENTE">Docente</option>
					<option value="SECRETARIA">Secretaría</option>
					<option value="FINANZAS">Finanzas</option>
					<option value="DIRECTOR">Dirección</option>
					<option value="APODERADO">Apoderado</option>
					<option value="PRECEPTOR">Preceptor</option>
				</select>
			</div>

			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-slate-300">{emailLabel}</label>
				<input
					id="email"
					name="email"
					type="email"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="firstName" class="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
				<input
					id="firstName"
					name="firstName"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="lastName" class="mb-2 block text-sm font-medium text-slate-300">Apellido</label>
				<input
					id="lastName"
					name="lastName"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="dni" class="mb-2 block text-sm font-medium text-slate-300">DNI</label>
				<input
					id="dni"
					name="dni"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			{#if userType === 'ALUMNO'}
			<!-- Localidad -->
			<div>
				<label for="locality" class="mb-2 block text-sm font-medium text-slate-300">Localidad</label>
				<select
					id="locality"
					name="locality"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				>
					<option value="">Seleccionar localidad</option>
					<option value="ALEM">Leandro N. Alem</option>
					<option value="CAPIOVI">Capiovi</option>
				</select>
				<p class="mt-1 text-xs text-slate-500">El ID del alumno se generará con el prefijo según la localidad (A para Alem, C para Capiovi)</p>
			</div>

			<!-- Datos Personales -->
			<div class="space-y-6">
				<div class="grid gap-6 md:grid-cols-2">
					<div>
						<label for="birthDate" class="mb-2 block text-sm font-medium text-slate-300">Fecha de Nacimiento</label>
						<input
							id="birthDate"
							name="birthDate"
							type="date"
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
							<option value="O+">O+</option>
							<option value="O-">O-</option>
							<option value="A+">A+</option>
							<option value="A-">A-</option>
							<option value="B+">B+</option>
							<option value="B-">B-</option>
							<option value="AB+">AB+</option>
							<option value="AB-">AB-</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Contactos -->
			<div class="space-y-6">
				<h3 class="text-lg font-semibold text-white mb-4">Contactos</h3>
				<div class="grid gap-6 md:grid-cols-2">
					<div>
						<label for="phone" class="mb-2 block text-sm font-medium text-slate-300">Teléfono/Celular</label>
						<input
							id="phone"
							name="phone"
							type="tel"
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
							<option value="">Seleccionar carrera</option>
							{#each data.careers as career}
								<option value={career.id}>{career.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Contacto Familiar -->
				<div class="space-y-4">
					<h4 class="text-md font-medium text-slate-300 mb-2">Contacto Familiar</h4>
					<div class="grid gap-6 md:grid-cols-3">
						<div>
							<label for="familyContactName" class="mb-2 block text-sm font-medium text-slate-300">Nombre del Familiar</label>
							<input
								id="familyContactName"
								name="familyContactName"
								type="text"
								class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
							/>
						</div>
						<div>
							<label for="familyContactPhone" class="mb-2 block text-sm font-medium text-slate-300">Teléfono del Familiar</label>
							<input
								id="familyContactPhone"
								name="familyContactPhone"
								type="tel"
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
								<option value="PADRE">Padre</option>
								<option value="MADRE">Madre</option>
								<option value="TUTOR">Tutor</option>
								<option value="HERMANO">Hermano/a</option>
								<option value="ABUELO">Abuelo/a</option>
								<option value="OTRO">Otro</option>
							</select>
						</div>
					</div>
				</div>
			</div>

			<!-- Domicilio -->
			<div class="space-y-6">
				<h3 class="text-lg font-semibold text-white mb-4">Domicilio</h3>
				<div class="grid gap-6 md:grid-cols-2">
					<div>
						<label for="address" class="mb-2 block text-sm font-medium text-slate-300">Dirección</label>
						<input
							id="address"
							name="address"
							type="text"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
					</div>
					<div>
						<label for="locality" class="mb-2 block text-sm font-medium text-slate-300">Localidad</label>
						<input
							id="locality"
							name="locality"
							type="text"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
					</div>
				</div>
			</div>

			<!-- Datos Educativos -->
			<div class="space-y-6">
				<h3 class="text-lg font-semibold text-white mb-4">Datos Educativos</h3>
				<div class="grid gap-6 md:grid-cols-2">
					<div>
						<label for="highSchool" class="mb-2 block text-sm font-medium text-slate-300">Escuela Secundaria</label>
						<input
							id="highSchool"
							name="highSchool"
							type="text"
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
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
					</div>
				</div>

				<div>
					<label for="instituteYear" class="mb-2 block text-sm font-medium text-slate-300">Año de Ingreso al Instituto</label>
					<input
						id="instituteYear"
						name="instituteYear"
						type="number"
						min="1950"
						max={new Date().getFullYear() + 1}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
				</div>
			</div>

			<!-- Tipo de Alumno -->
			<div class="space-y-3">
				<div class="text-sm font-medium text-slate-300 mb-2">Tipo de Alumno</div>
				<div class="flex items-center space-x-6">
					<div class="flex items-center space-x-3">
						<input
								id="alumnoNormal"
								name="alumnoType"
								type="radio"
								value="normal"
								checked
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
								class="h-4 w-4 border-slate-600 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-2"
							/>
						<label for="alumnoRecursante" class="text-sm text-slate-300">
							Recursante
						</label>
					</div>
				</div>
			</div>
		{/if}
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
			El sistema asignará automáticamente el rol según el tipo seleccionado y generará una
			contraseña temporal con cambio obligatorio en el primer acceso.
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={loading}
				class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:opacity-50"
			>
				{loading ? 'Creando...' : 'Crear usuario'}
			</button>
		</div>
	</form>
</div>
