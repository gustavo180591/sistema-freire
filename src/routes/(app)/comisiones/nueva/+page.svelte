<script lang="ts">
	let name = $state('');
	let subjectId = $state('');
	let termId = $state('');
	let capacity = $state<number | ''>('');
	let active = $state('true');

	let { data } = $props();
	const subjects = $derived(data?.subjects ?? []);
	const terms = $derived(data?.terms ?? []);
</script>

<svelte:head>
	<title>Nueva comisión | Instituto Paulo Freire</title>
	<meta name="description" content="Alta institucional de comisiones académicas" />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Nueva comisión</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Creá una nueva comisión vinculando materia, período académico, cupo y estado operativo. Luego
			podrás asignar docentes e inscribir alumnos.
		</p>
	</section>

	<form method="POST" class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Nombre de comisión</label>
				<input
					bind:value={name}
					name="name"
					placeholder="1° A - Inicial"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Cupo máximo</label>
				<input
					bind:value={capacity}
					name="capacity"
					type="number"
					min="1"
					placeholder="40"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Materia</label>
				<select
					bind:value={subjectId}
					name="subjectId"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value="">Seleccionar materia</option>
					{#each subjects as subject}
						<option value={subject.id}>{subject.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Período académico</label>
				<select
					bind:value={termId}
					name="termId"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value="">Seleccionar período</option>
					{#each terms as term}
						<option value={term.id}>{term.name} {term.year}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Estado inicial</label>
				<select
					bind:value={active}
					name="active"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value="true">Activa</option>
					<option value="false">Inactiva</option>
				</select>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
			Después del alta podrás asignar docentes, configurar horarios, cargar asistencia, registrar
			calificaciones y monitorear regularidad.
		</div>

		<div class="flex items-center justify-end gap-3">
			<a
				href="/comisiones"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Cancelar
			</a>
			<button
				type="submit"
				class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Crear comisión
			</button>
		</div>
	</form>
</div>
