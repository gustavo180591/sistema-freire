<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const subject = $derived(data.subject);
	const subjectTypes = $derived(data.subjectTypes);
	const trainingFields = $derived(data.trainingFields);
	const accreditationModes = $derived(data.accreditationModes);

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
	<title>Editar materia | Sistema Freire</title>
	<meta name="description" content="Editar materia" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="mb-6">
			<a href="/materias" class="text-sm text-slate-400 transition hover:text-slate-300">
				← Volver a materias
			</a>
		</div>
		<div class="mb-6">
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Editar Materia</p>
			<h1 class="mt-2 text-3xl font-bold">{subject.name}</h1>
			<p class="mt-1 font-mono text-sm text-slate-400">{subject.code}</p>
		</div>

		{#if errors.general}
			<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
				{errors.general}
			</div>
		{/if}

		<form method="POST" class="space-y-6">
			<div class="grid gap-6 md:grid-cols-2">
				<!-- Código -->
				<div>
					<label for="code" class="mb-2 block text-sm font-medium text-slate-300">
						Código <span class="text-red-400">*</span>
					</label>
					<input
						id="code"
						name="code"
						type="text"
						value={subject.code}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
					/>
					{#if errors.code}
						<p class="mt-1 text-sm text-red-400">{errors.code}</p>
					{/if}
				</div>

				<!-- Nombre -->
				<div>
					<label for="name" class="mb-2 block text-sm font-medium text-slate-300">
						Nombre <span class="text-red-400">*</span>
					</label>
					<input
						id="name"
						name="name"
						type="text"
						value={subject.name}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
					/>
					{#if errors.name}
						<p class="mt-1 text-sm text-red-400">{errors.name}</p>
					{/if}
				</div>

				<!-- Tipo de materia -->
				<div>
					<label for="subjectType" class="mb-2 block text-sm font-medium text-slate-300">
						Tipo de materia <span class="text-red-400">*</span>
					</label>
					<select
						id="subjectType"
						name="subjectType"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
					>
						{#each subjectTypeOptions as opt}
							<option value={opt.value} selected={subject.subjectType === opt.value}>
								{opt.label}
							</option>
						{/each}
					</select>
					{#if errors.subjectType}
						<p class="mt-1 text-sm text-red-400">{errors.subjectType}</p>
					{/if}
				</div>

				<!-- Campo de formación -->
				<div>
					<label for="trainingField" class="mb-2 block text-sm font-medium text-slate-300">
						Campo de formación <span class="text-red-400">*</span>
					</label>
					<select
						id="trainingField"
						name="trainingField"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
					>
						{#each trainingFieldOptions as opt}
							<option value={opt.value} selected={subject.trainingField === opt.value}>
								{opt.label}
							</option>
						{/each}
					</select>
					{#if errors.trainingField}
						<p class="mt-1 text-sm text-red-400">{errors.trainingField}</p>
					{/if}
				</div>

				<!-- Año académico -->
				<div>
					<label for="yearLevel" class="mb-2 block text-sm font-medium text-slate-300">
						Año académico <span class="text-red-400">*</span>
					</label>
					<select
						id="yearLevel"
						name="yearLevel"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
					>
						{#each [1, 2, 3, 4, 5, 6, 7] as year}
							<option value={year} selected={subject.yearLevel === year}>
								Año {year}
							</option>
						{/each}
					</select>
					{#if errors.yearLevel}
						<p class="mt-1 text-sm text-red-400">{errors.yearLevel}</p>
					{/if}
				</div>

				<!-- Modalidad de acreditación -->
				<div>
					<label for="accreditationMode" class="mb-2 block text-sm font-medium text-slate-300">
						Modalidad de acreditación <span class="text-red-400">*</span>
					</label>
					<select
						id="accreditationMode"
						name="accreditationMode"
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						required
					>
						{#each accreditationModeOptions as opt}
							<option value={opt.value} selected={subject.accreditationMode === opt.value}>
								{opt.label}
							</option>
						{/each}
					</select>
					{#if errors.accreditationMode}
						<p class="mt-1 text-sm text-red-400">{errors.accreditationMode}</p>
					{/if}
				</div>

				<!-- Horas semanales -->
				<div>
					<label for="hoursPerWeek" class="mb-2 block text-sm font-medium text-slate-300">
						Horas semanales
					</label>
					<input
						id="hoursPerWeek"
						name="hoursPerWeek"
						type="number"
						min="0"
						value={subject.hoursPerWeek || ''}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.hoursPerWeek}
						<p class="mt-1 text-sm text-red-400">{errors.hoursPerWeek}</p>
					{/if}
				</div>

				<!-- Umbral de aprobación -->
				<div>
					<label for="approvalThreshold" class="mb-2 block text-sm font-medium text-slate-300">
						Umbral de aprobación
					</label>
					<input
						id="approvalThreshold"
						name="approvalThreshold"
						type="number"
						min="1"
						max="10"
						step="0.1"
						value={subject.approvalThreshold}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.approvalThreshold}
						<p class="mt-1 text-sm text-red-400">{errors.approvalThreshold}</p>
					{/if}
				</div>

				<!-- Umbral de promoción -->
				<div>
					<label for="promotionThreshold" class="mb-2 block text-sm font-medium text-slate-300">
						Umbral de promoción
					</label>
					<input
						id="promotionThreshold"
						name="promotionThreshold"
						type="number"
						min="1"
						max="10"
						step="0.1"
						value={subject.promotionThreshold}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.promotionThreshold}
						<p class="mt-1 text-sm text-red-400">{errors.promotionThreshold}</p>
					{/if}
				</div>
			</div>

			<!-- Descripción -->
			<div>
				<label for="description" class="mb-2 block text-sm font-medium text-slate-300">
					Descripción
				</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					placeholder="Descripción opcional de la materia..."
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				>
					{subject.description || ''}
				</textarea>
			</div>

			<div class="grid gap-4 md:grid-cols-4">
				<label class="flex items-center gap-3">
					<input
						name="isAnnual"
						type="checkbox"
						value="true"
						checked={subject.isAnnual}
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Materia anual</span>
				</label>

				<label class="flex items-center gap-3">
					<input
						name="isElective"
						type="checkbox"
						value="true"
						checked={subject.isElective}
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Materia optativa</span>
				</label>

				<label class="flex items-center gap-3">
					<input
						name="isRemedial"
						type="checkbox"
						value="true"
						checked={subject.isRemedial}
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Materia de recuperación</span>
				</label>

				<label class="flex items-center gap-3">
					<input
						name="active"
						type="checkbox"
						value="true"
						checked={subject.active}
						class="h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
					/>
					<span class="text-sm text-slate-300">Materia activa</span>
				</label>
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
					Guardar cambios
				</button>
			</div>
		</form>
	</section>
</div>
