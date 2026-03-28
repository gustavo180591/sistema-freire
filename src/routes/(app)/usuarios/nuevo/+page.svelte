<script lang="ts">
	let userType = $state('ALUMNO');
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

	<form method="POST" class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Tipo de usuario</label>
				<select
					bind:value={userType}
					name="type"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				>
					<option value="ALUMNO">Alumno</option>
					<option value="DOCENTE">Docente</option>
					<option value="SECRETARIA">Secretaría</option>
					<option value="FINANZAS">Finanzas</option>
					<option value="DIRECTOR">Dirección</option>
				</select>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Correo institucional</label>
				<input
					name="email"
					type="email"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
				<input
					name="firstName"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Apellido</label>
				<input
					name="lastName"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">DNI</label>
				<input
					name="dni"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Carrera</label>
				<select
					name="careerId"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				>
					<option value="">Seleccionar carrera</option>
				</select>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
			El sistema asignará automáticamente el rol según el tipo seleccionado y generará una
			contraseña temporal con cambio obligatorio en el primer acceso.
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Crear usuario
			</button>
		</div>
	</form>
</div>
