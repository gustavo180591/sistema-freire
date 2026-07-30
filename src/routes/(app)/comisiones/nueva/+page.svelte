<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const years = [1, 2, 3, 4];
	const commissionLetters = ['A', 'B', 'C', 'D', 'E'] as const;
</script>

<svelte:head>
	<title>Nueva Comisión | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-center gap-4">
			<a
				href="/comisiones"
				aria-label="Volver a comisiones"
				class="rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</a>

			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Académico</p>
				<h1 class="mt-2 text-3xl font-bold text-white">Crear comisiones</h1>
				<p class="mt-2 text-sm text-slate-400">
					Creá grupos simples de cursado: Comisión A, B, C, D o E.
				</p>
			</div>
		</div>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-800 bg-red-950/30 p-6">
			<p class="font-semibold text-red-400">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-2xl border border-green-800 bg-green-950/30 p-6">
			<p class="font-semibold text-green-400">{form.message}</p>

			<div class="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<p class="text-slate-500">Creadas</p>
					<p class="mt-1 text-2xl font-bold text-white">{form.createdCount}</p>
				</div>

				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<p class="text-slate-500">Ya existentes</p>
					<p class="mt-1 text-2xl font-bold text-white">{form.existingCount}</p>
				</div>

				<div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
					<p class="text-slate-500">Materias procesadas</p>
					<p class="mt-1 text-2xl font-bold text-white">{form.subjectCount}</p>
				</div>
			</div>
		</div>
	{/if}

	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="mb-8">
			<h2 class="text-xl font-bold text-white">Datos generales</h2>
			<p class="mt-1 text-sm text-slate-400">
				Elegí carrera, año y las letras de comisión que querés crear.
			</p>
		</div>

		<form action="?/create" method="POST" class="space-y-8">
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300">
						Carrera
					</label>
					<select
						id="careerId"
						name="careerId"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Seleccionar carrera</option>
						{#each data.careers as career}
							<option value={career.id}>{career.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="yearLevel" class="mb-2 block text-sm font-medium text-slate-300">
						Año
					</label>
					<select
						id="yearLevel"
						name="yearLevel"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Seleccionar año</option>
						{#each years as year}
							<option value={year}>{year}° año</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="locationId" class="mb-2 block text-sm font-medium text-slate-300">
						Localidad / sede
					</label>
					<select
						id="locationId"
						name="locationId"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Sin localidad específica</option>
						{#each data.locations as location}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="academicTermId" class="mb-2 block text-sm font-medium text-slate-300">
						Período lectivo
					</label>
					<select
						id="academicTermId"
						name="academicTermId"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Seleccionar período</option>
						{#each data.terms as term}
							<option value={term.id}>{term.name} ({term.year})</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="maxCapacity" class="mb-2 block text-sm font-medium text-slate-300">
						Cupo por comisión
					</label>
					<input
						id="maxCapacity"
						type="number"
						name="maxCapacity"
						min="1"
						placeholder="Ej: 40"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
					/>
				</div>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
				<h3 class="text-lg font-semibold text-white">Comisiones a crear</h3>
				<p class="mt-1 text-sm text-slate-400">
					Marcá una o varias letras. El sistema generará las comisiones para las materias del
					año elegido.
				</p>

				<div class="mt-5 grid gap-3 sm:grid-cols-5">
					{#each commissionLetters as letter}
						<label
							for="commission-{letter}"
							class="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-lg font-bold text-white transition hover:border-indigo-500 hover:bg-indigo-500/10"
						>
							<input
								id="commission-{letter}"
								type="checkbox"
								name="letters"
								value={letter}
								checked={letter === 'A'}
								class="h-5 w-5 rounded border-slate-600 bg-slate-950 text-indigo-500"
							/>
							<span>{letter}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="rounded-2xl border border-blue-900/50 bg-blue-950/20 p-5 text-sm text-blue-100">
				<p class="font-semibold">Cómo funciona</p>
				<p class="mt-1 text-blue-100/80">
					Esta pantalla no asigna docentes ni horarios. Eso se gestiona después desde docentes,
					materias y configuración de horarios.
				</p>
			</div>

			<div class="flex gap-3">
				<a
					href="/comisiones"
					class="flex-1 rounded-xl border border-slate-700 px-6 py-3 text-center font-medium text-slate-300 transition hover:bg-slate-800"
				>
					Cancelar
				</a>

				<button
					type="submit"
					class="flex-1 rounded-xl bg-indigo-500 px-6 py-3 font-medium text-white transition hover:bg-indigo-600"
				>
					Crear comisiones
				</button>
			</div>
		</form>
	</div>
</div>
