<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedCareer = $state(untrack(() => data.commission.careerId || ''));
	let selectedStudyPlan = $state(untrack(() => data.commission.studyPlanId || ''));

	// Filtrar planes por carrera seleccionada
	const filteredStudyPlans = $derived(
		selectedCareer
			? data.studyPlans.filter((sp) => sp.careerId === selectedCareer)
			: data.studyPlans
	);

	// Actualizar plan si la carrera cambia
	$effect(() => {
		if (selectedCareer) {
			const planStillValid = filteredStudyPlans.some((sp) => sp.id === selectedStudyPlan);
			if (!planStillValid) {
				selectedStudyPlan = '';
			}
		}
	});
</script>

<svelte:head>
	<title>Editar Comisión | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-center gap-4">
			<a
				href="/comisiones/{data.commission.id}"
				class="rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800"
				aria-label="Volver al detalle de comisión"
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
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Administración</p>
				<h1 class="mt-2 text-3xl font-bold">Editar Comisión {data.commission.code}</h1>
			</div>
		</div>
	</div>

	<!-- Error Message -->
	{#if form?.error}
		<div class="rounded-2xl border border-red-800 bg-red-950/30 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-red-500/20 p-2">
					<svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
				<p class="font-semibold text-red-400">{form.error}</p>
			</div>
		</div>
	{/if}

	<!-- Form -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
		<form method="POST" use:enhance class="space-y-6">
			<div class="grid gap-6 md:grid-cols-2">
				<!-- Código -->
				<div>
					<label for="code" class="mb-2 block text-sm font-medium text-slate-300"
						>Código <span class="text-red-400">*</span></label
					>
					<input
						id="code"
						type="text"
						name="code"
						required
						value={data.commission.code}
						placeholder="Ej: A01, B02"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
					/>
				</div>

				<!-- Materia -->
				<div>
					<label for="subjectId" class="mb-2 block text-sm font-medium text-slate-300"
						>Materia <span class="text-red-400">*</span></label
					>
					<select
						id="subjectId"
						name="subjectId"
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Seleccionar materia</option>
						{#each data.subjects as subject}
							<option value={subject.id} selected={data.commission.subjectId === subject.id}>
								{subject.name} ({subject.code})
							</option>
						{/each}
					</select>
				</div>

				<!-- Carrera -->
				<div>
					<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300">Carrera</label
					>
					<select
						id="careerId"
						name="careerId"
						bind:value={selectedCareer}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">General (sin carrera específica)</option>
						{#each data.careers as career}
							<option value={career.id} selected={data.commission.careerId === career.id}>
								{career.name}
							</option>
						{/each}
					</select>
				</div>

				<!-- Plan de Estudio -->
				<div>
					<label for="studyPlanId" class="mb-2 block text-sm font-medium text-slate-300"
						>Plan de Estudio</label
					>
					<select
						id="studyPlanId"
						name="studyPlanId"
						bind:value={selectedStudyPlan}
						disabled={!selectedCareer}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
					>
						<option value="">Seleccionar plan</option>
						{#each filteredStudyPlans as plan}
							<option value={plan.id} selected={data.commission.studyPlanId === plan.id}>
								{plan.name} (v{plan.version})
							</option>
						{/each}
					</select>
				</div>

				<!-- Período Lectivo -->
				<div>
					<label for="academicTermId" class="mb-2 block text-sm font-medium text-slate-300"
						>Período Lectivo <span class="text-red-400">*</span></label
					>
					<select
						id="academicTermId"
						name="academicTermId"
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Seleccionar período</option>
						{#each data.terms as term}
							<option value={term.id} selected={data.commission.academicTermId === term.id}>
								{term.name} ({term.year})
							</option>
						{/each}
					</select>
				</div>

				<!-- Docente -->
				<div>
					<label for="teacherId" class="mb-2 block text-sm font-medium text-slate-300"
						>Docente</label
					>
					<select
						id="teacherId"
						name="teacherId"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Sin asignar</option>
						{#each data.teachers as teacher}
							<option value={teacher.id} selected={data.commission.teacherId === teacher.id}>
								{teacher.lastName}
								{teacher.firstName}
							</option>
						{/each}
					</select>
				</div>

				<!-- Localidad -->
				<div>
					<label for="locationId" class="mb-2 block text-sm font-medium text-slate-300"
						>Localidad</label
					>
					<select
						id="locationId"
						name="locationId"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Sin asignar</option>
						{#each data.locations as location}
							<option value={location.id} selected={data.commission.locationId === location.id}>
								{location.name}
							</option>
						{/each}
					</select>
				</div>

				<!-- Cupo Máximo -->
				<div>
					<label for="maxCapacity" class="mb-2 block text-sm font-medium text-slate-300"
						>Cupo Máximo <span class="text-red-400">*</span></label
					>
					<input
						id="maxCapacity"
						type="number"
						name="maxCapacity"
						required
						min="1"
						value={data.commission.maxCapacity}
						placeholder="Ej: 40"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
					/>
				</div>

				<!-- Estado -->
				<div>
					<label for="active" class="mb-2 block text-sm font-medium text-slate-300">Estado</label>
					<select
						id="active"
						name="active"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					>
						<option value="true" selected={data.commission.active}>Activa</option>
						<option value="false" selected={!data.commission.active}>Inactiva</option>
					</select>
				</div>
			</div>

			<!-- Horario -->
			<div>
				<label for="schedule" class="mb-2 block text-sm font-medium text-slate-300">Horario</label>
				<input
					id="schedule"
					type="text"
					name="schedule"
					value={data.commission.schedule || ''}
					placeholder="Ej: Lunes 14:00-18:00, Miércoles 14:00-18:00"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
				/>
			</div>

			<!-- Observaciones -->
			<div>
				<label for="observations" class="mb-2 block text-sm font-medium text-slate-300"
					>Observaciones</label
				>
				<textarea
					id="observations"
					name="observations"
					placeholder="Notas adicionales sobre la comisión..."
					rows="3"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
					>{data.commission.observations || ''}</textarea
				>
			</div>

			<!-- Actions -->
			<div class="flex gap-3">
				<a
					href="/comisiones/{data.commission.id}"
					class="flex-1 rounded-xl border border-slate-700 px-6 py-3 text-center font-medium text-slate-300 transition hover:bg-slate-800"
				>
					Cancelar
				</a>
				<button
					type="submit"
					class="flex-1 rounded-xl bg-indigo-500 px-6 py-3 font-medium text-white transition hover:bg-indigo-600"
				>
					Guardar Cambios
				</button>
			</div>
		</form>
	</div>
</div>
