<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const subject = $derived(data.subject);

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
			careerIds?: string;
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

		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Gestión académica</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Editar materia</h1>
			<p class="mt-4 max-w-3xl text-sm text-slate-400">
				Actualizar los datos de la materia y sus carreras asociadas.
			</p>
			<p class="mt-2 font-mono text-sm text-slate-500">{subject.code}</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<form method="POST" use:enhance class="space-y-6">
			{#if errors.general}
				<div class="rounded-2xl border border-red-900 bg-red-900/10 p-4 text-sm text-red-400">
					{errors.general}
				</div>
			{/if}

			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label for="code" class="mb-2 block text-sm font-medium text-slate-300">
						Código <span class="text-red-400">*</span>
					</label>
					<input
						id="code"
						name="code"
						type="text"
						required
						value={subject.code}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.code}
						<p class="mt-1 text-sm text-red-400">{errors.code}</p>
					{/if}
				</div>

				<div>
					<label for="name" class="mb-2 block text-sm font-medium text-slate-300">
						Nombre <span class="text-red-400">*</span>
					</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						value={subject.name}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.name}
						<p class="mt-1 text-sm text-red-400">{errors.name}</p>
					{/if}
				</div>

				<div class="md:col-span-2">
					<label class="mb-2 block text-sm font-medium text-slate-300">
						Carreras <span class="text-red-400">*</span>
					</label>

					<div class="rounded-2xl border border-slate-700 bg-slate-950 p-4">
						{#if data.careers.length === 0}
							<p class="text-sm text-amber-300">
								No hay carreras activas disponibles. Primero cargá o activá una carrera.
							</p>
						{:else}
							<div class="grid gap-3 md:grid-cols-2">
								{#each data.careers as career}
									<label
										class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-slate-600 hover:bg-slate-900"
									>
										<input
											name="careerIds"
											type="checkbox"
											value={career.id}
											checked={subject.careerIds.includes(career.id)}
											class="mt-1 h-5 w-5 rounded border-slate-700 bg-slate-950 text-slate-400 focus:ring-slate-500"
										/>

										<span>
											<span class="block text-sm font-medium text-slate-200">{career.name}</span>
											<span class="mt-0.5 block text-xs text-slate-500">
												{career.code} · {career.durationYears} años
											</span>
										</span>
									</label>
								{/each}
							</div>
						{/if}
					</div>

					<p class="mt-2 text-sm text-slate-500">
						Podés seleccionar una o varias carreras para la misma materia.
					</p>

					{#if errors.careerIds}
						<p class="mt-1 text-sm text-red-400">{errors.careerIds}</p>
					{/if}
				</div>

				<div>
					<label for="subjectType" class="mb-2 block text-sm font-medium text-slate-300">
						Tipo de materia <span class="text-red-400">*</span>
					</label>
					<select
						id="subjectType"
						name="subjectType"
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					>
						{#each subjectTypeOptions as option}
							<option value={option.value} selected={subject.subjectType === option.value}>
								{option.label}
							</option>
						{/each}
					</select>
					{#if errors.subjectType}
						<p class="mt-1 text-sm text-red-400">{errors.subjectType}</p>
					{/if}
				</div>

				<div>
					<label for="trainingField" class="mb-2 block text-sm font-medium text-slate-300">
						Campo de formación <span class="text-red-400">*</span>
					</label>
					<select
						id="trainingField"
						name="trainingField"
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					>
						{#each trainingFieldOptions as option}
							<option value={option.value} selected={subject.trainingField === option.value}>
								{option.label}
							</option>
						{/each}
					</select>
					{#if errors.trainingField}
						<p class="mt-1 text-sm text-red-400">{errors.trainingField}</p>
					{/if}
				</div>

				<div>
					<label for="yearLevel" class="mb-2 block text-sm font-medium text-slate-300">
						Año académico <span class="text-red-400">*</span>
					</label>
					<input
						id="yearLevel"
						name="yearLevel"
						type="number"
						min="1"
						max="10"
						required
						value={subject.yearLevel}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.yearLevel}
						<p class="mt-1 text-sm text-red-400">{errors.yearLevel}</p>
					{/if}
				</div>

				<div>
					<label for="accreditationMode" class="mb-2 block text-sm font-medium text-slate-300">
						Modalidad de acreditación <span class="text-red-400">*</span>
					</label>
					<select
						id="accreditationMode"
						name="accreditationMode"
						required
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					>
						{#each accreditationModeOptions as option}
							<option value={option.value} selected={subject.accreditationMode === option.value}>
								{option.label}
							</option>
						{/each}
					</select>
					{#if errors.accreditationMode}
						<p class="mt-1 text-sm text-red-400">{errors.accreditationMode}</p>
					{/if}
				</div>

				<div>
					<label for="hoursPerWeek" class="mb-2 block text-sm font-medium text-slate-300">
						Horas semanales
					</label>
					<input
						id="hoursPerWeek"
						name="hoursPerWeek"
						type="number"
						min="0"
						value={subject.hoursPerWeek ?? ''}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
					/>
					{#if errors.hoursPerWeek}
						<p class="mt-1 text-sm text-red-400">{errors.hoursPerWeek}</p>
					{/if}
				</div>

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
				>{subject.description ?? ''}</textarea>
			</div>

			<div class="grid gap-4 md:grid-cols-3">
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
			</div>

			<div>
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
				<p class="mt-2 text-sm text-slate-500">
					Las materias activas estarán disponibles para asignar a planes de estudio y docentes.
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
					Guardar cambios
				</button>
			</div>
		</form>
	</section>
</div>
