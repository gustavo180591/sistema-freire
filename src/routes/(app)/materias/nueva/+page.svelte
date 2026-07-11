<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const errors = $derived(
		(form?.errors as {
			code?: string;
			name?: string;
			subjectType?: string;
			trainingField?: string;
			yearLevel?: string;
			accreditationMode?: string;
			hoursPerWeek?: string;
			approvalThreshold?: string;
			promotionThreshold?: string;
			general?: string;
		}) ?? {}
	);
	const success = $derived(form?.success ?? true);

	const subjectTypeOptions = [
		{ value: 'COMMON', label: 'Común' },
		{ value: 'CAREER_SPECIFIC', label: 'Específica de la carrera' },
		{ value: 'EDI', label: 'EDI' }
	];

	const trainingFieldOptions = [
		{ value: 'GENERAL', label: 'General' },
		{ value: 'ESPECIFICA', label: 'Específica' },
		{ value: 'PRACTICA', label: 'Práctica' },
		{ value: 'EDI', label: 'EDI' }
	];

	const accreditationModeOptions = [
		{ value: 'PROMOCIONAL', label: 'Promocional' },
		{ value: 'EXAMEN_FINAL', label: 'Examen Final' },
		{ value: 'PROMOCIONAL_SIN_FINAL', label: 'Promocional sin Final' }
	];
</script>

<svelte:head>
	<title>Nueva materia | Sistema Freire</title>
	<meta name="description" content="Crear nueva materia" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="mb-6">
			<a href="/materias" class="text-sm text-slate-400 transition hover:text-slate-300">
				← Volver a materias
			</a>
		</div>

		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Gestión académica</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Nueva materia</h1>
			<p class="mt-4 max-w-3xl text-sm text-slate-400">
				Crear una nueva materia en el sistema educativo.
			</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<form method="POST" use:enhance class="space-y-6">
			{#if !success && errors.general}
				<div class="rounded-2xl border border-red-900 bg-red-900/10 p-4 text-sm text-red-400">
					{errors.general}
				</div>
			{/if}

			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">
						Código <span class="text-red-400">*</span>
					</label>
					<input
						name="code"
						type="text"
						required
						placeholder="MAT101"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.code}
						<p class="mt-1 text-sm text-red-400">{errors.code}</p>
					{/if}
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">
						Nombre <span class="text-red-400">*</span>
					</label>
					<input
						name="name"
						type="text"
						required
						placeholder="Matemáticas I"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.name}
						<p class="mt-1 text-sm text-red-400">{errors.name}</p>
					{/if}
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">
						Tipo de materia <span class="text-red-400">*</span>
					</label>
					<select
						name="subjectType"
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					>
						{#each subjectTypeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.subjectType}
						<p class="mt-1 text-sm text-red-400">{errors.subjectType}</p>
					{/if}
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">
						Campo de formación <span class="text-red-400">*</span>
					</label>
					<select
						name="trainingField"
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					>
						{#each trainingFieldOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.trainingField}
						<p class="mt-1 text-sm text-red-400">{errors.trainingField}</p>
					{/if}
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">
						Año académico <span class="text-red-400">*</span>
					</label>
					<input
						name="yearLevel"
						type="number"
						min="1"
						max="10"
						required
						placeholder="1"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.yearLevel}
						<p class="mt-1 text-sm text-red-400">{errors.yearLevel}</p>
					{/if}
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">
						Modalidad de acreditación <span class="text-red-400">*</span>
					</label>
					<select
						name="accreditationMode"
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					>
						{#each accreditationModeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.accreditationMode}
						<p class="mt-1 text-sm text-red-400">{errors.accreditationMode}</p>
					{/if}
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300"> Horas semanales </label>
					<input
						name="hoursPerWeek"
						type="number"
						min="0"
						placeholder="4"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.hoursPerWeek}
						<p class="mt-1 text-sm text-red-400">{errors.hoursPerWeek}</p>
					{/if}
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">
						Umbral de aprobación
					</label>
					<input
						name="approvalThreshold"
						type="number"
						min="1"
						max="10"
						step="0.1"
						placeholder="6"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.approvalThreshold}
						<p class="mt-1 text-sm text-red-400">{errors.approvalThreshold}</p>
					{/if}
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300"> Umbral de promoción </label>
					<input
						name="promotionThreshold"
						type="number"
						min="1"
						max="10"
						step="0.1"
						placeholder="7"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.promotionThreshold}
						<p class="mt-1 text-sm text-red-400">{errors.promotionThreshold}</p>
					{/if}
				</div>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300"> Descripción </label>
				<textarea
					name="description"
					rows="3"
					placeholder="Descripción opcional de la materia..."
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				></textarea>
			</div>

			<div class="grid gap-4 md:grid-cols-3">
				<label class="flex items-center gap-3">
					<input
						name="isAnnual"
						type="checkbox"
						value="true"
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Materia anual</span>
				</label>

				<label class="flex items-center gap-3">
					<input
						name="isElective"
						type="checkbox"
						value="true"
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Materia optativa</span>
				</label>

				<label class="flex items-center gap-3">
					<input
						name="isRemedial"
						type="checkbox"
						value="true"
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Materia de recuperación</span>
				</label>
			</div>

			<div>
				<label class="flex items-center gap-3">
					<input
						name="active"
						type="checkbox"
						checked
						value="true"
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Materia activa</span>
				</label>
				<p class="mt-2 text-sm text-slate-500">
					Las materias activas estarán disponibles para asignar a planes de estudio.
				</p>
			</div>

			<div class="flex gap-4 pt-4">
				<a
					href="/materias"
					class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold transition hover:border-slate-500"
				>
					Cancelar
				</a>
				<button
					type="submit"
					class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
				>
					Crear materia
				</button>
			</div>
		</form>
	</section>
</div>
