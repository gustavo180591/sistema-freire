<script lang="ts">
	import { enhance } from '$app/forms';

	let { form, data } = $props();

	let name = $state('');
	let code = $state('');
	let trainingField = $state('GENERAL');
	let resolution = $state('');
	let durationYears = $state('4');
	let description = $state('');
	let isActive = $state(true);

	const trainingFieldOptions = [
		{ value: 'GENERAL', label: 'General' },
		{ value: 'ESPECIFICA', label: 'Específica' },
		{ value: 'PRACTICA', label: 'Práctica' },
		{ value: 'EDI', label: 'EDI' }
	];
</script>

<svelte:head>
	<title>Nueva carrera | Instituto Paulo Freire</title>
	<meta name="description" content="Alta institucional de carreras y estructura académica" />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Nueva carrera</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Creá una nueva oferta académica institucional. Luego podrás asociar planes de estudio,
			cohortes, materias y correlatividades.
		</p>
	</section>

	<form
		method="POST"
		use:enhance
		class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
	>
		{#if form?.error}
			<div class="rounded-2xl border border-red-900/50 bg-red-500/10 p-4 text-sm text-red-400">
				{form.error}
			</div>
		{/if}

		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="code" class="mb-2 block text-sm font-medium text-slate-300"
					>Código <span class="text-red-400">*</span></label
				>
				<input
					bind:value={code}
					name="code"
					id="code"
					required
					placeholder="PI-2025"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="trainingField" class="mb-2 block text-sm font-medium text-slate-300"
					>Campo de formación <span class="text-red-400">*</span></label
				>
				<select
					bind:value={trainingField}
					name="trainingField"
					id="trainingField"
					required
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				>
					{#each trainingFieldOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="durationYears" class="mb-2 block text-sm font-medium text-slate-300"
					>Duración (años) <span class="text-red-400">*</span></label
				>
				<input
					bind:value={durationYears}
					name="durationYears"
					id="durationYears"
					type="number"
					min="1"
					max="10"
					required
					placeholder="4"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="active" class="mb-2 block text-sm font-medium text-slate-300"
					>Estado inicial</label
				>
				<select
					bind:value={isActive}
					name="active"
					id="active"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value={true}>Activa</option>
					<option value={false}>Inactiva</option>
				</select>
			</div>
		</div>

		<div>
			<label for="name" class="mb-2 block text-sm font-medium text-slate-300"
				>Nombre de la carrera <span class="text-red-400">*</span></label
			>
			<input
				bind:value={name}
				name="name"
				id="name"
				required
				placeholder="PROFESORADO DE EDUCACIÓN SECUNDARIA EN MATEMÁTICA"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
			/>
		</div>

		<div>
			<label for="resolution" class="mb-2 block text-sm font-medium text-slate-300"
				>Resolución</label
			>
			<input
				bind:value={resolution}
				name="resolution"
				id="resolution"
				placeholder="Resolución Ministerial N° 1234/2025"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
			/>
		</div>

		<div>
			<label for="locationIds" class="mb-2 block text-sm font-medium text-slate-300"
				>Localidades</label
			>
			<div class="space-y-2">
				{#each data.locations as location}
					<label
						class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3 transition hover:bg-slate-800"
					>
						<input
							type="checkbox"
							name="locationIds"
							value={location.id}
							class="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
						/>
						<span class="text-sm text-slate-300">{location.name}</span>
					</label>
				{/each}
			</div>
			<p class="mt-1 text-xs text-slate-500">
				Seleccioná las localidades donde se dictará la carrera
			</p>
		</div>

		<div>
			<label for="description" class="mb-2 block text-sm font-medium text-slate-300"
				>Descripción</label
			>
			<textarea
				bind:value={description}
				name="description"
				id="description"
				rows="5"
				placeholder="Detalle institucional, alcance, resolución y observaciones"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
			></textarea>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
			Al guardar la carrera, quedará disponible para vincular alumnos, crear planes de estudio
			versionados y estructurar el recorrido académico.
		</div>

		<div class="flex items-center justify-end gap-3">
			<a
				href="/carreras"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Cancelar
			</a>
			<button
				type="submit"
				class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Crear carrera
			</button>
		</div>
	</form>
</div>
