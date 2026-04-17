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

<!-- Definir tipo ActionData local para incluir success -->
<script module lang="ts">
	declare module './$types' {
		interface ActionData {
			success?: string;
		}
	}
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
