<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const errors = $derived(form?.errors ?? {});
	const success = $derived(form?.success ?? true);

	const groupedSubjects = $derived(() => {
		const groups: Record<number, typeof data.subjects> = {};
		data.subjects.forEach((subject) => {
			if (!groups[subject.yearLevel]) {
				groups[subject.yearLevel] = [];
			}
			groups[subject.yearLevel].push(subject);
		});
		return groups;
	});
</script>

<svelte:head>
	<title>Agregar materia | {data.plan.name}</title>
	<meta name="description" content="Agregar materia al plan de estudio" />
</svelte:head>

<div class="space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="mb-6">
			<a
				href={`/carreras/${data.plan.career.id}/planes/${data.plan.id}`}
				class="text-sm text-slate-400 transition hover:text-slate-300"
			>
				← Volver a {data.plan.name}
			</a>
		</div>

		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Secretaría académica</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Agregar materia al plan</h1>
			<p class="mt-2 font-mono text-sm text-slate-400">{data.plan.career.code}</p>
			<p class="mt-4 max-w-3xl text-sm text-slate-400">
				Selecciona una materia para agregarla al plan {data.plan.name} de la carrera {data.plan.career.name}.
			</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<form
			method="POST"
			use:enhance
			class="space-y-6"
		>
			{#if !success && errors.general}
				<div class="rounded-2xl border border-red-900 bg-red-900/10 p-4 text-sm text-red-400">
					{errors.general}
				</div>
			{/if}

			<div>
				<label class="mb-4 block text-sm font-medium text-slate-300">
					Seleccionar materia <span class="text-red-400">*</span>
				</label>

				{#if Object.keys(groupedSubjects).length === 0}
					<div class="rounded-2xl border border-slate-700 bg-slate-950 p-6 text-center">
						<p class="text-slate-400">No hay materias disponibles para agregar.</p>
						<p class="mt-2 text-sm text-slate-500">
							Todas las materias activas ya están en este plan.
						</p>
					</div>
				{:else}
					<div class="space-y-6">
						{#each Object.entries(groupedSubjects).sort(([a], [b]) => Number(a) - Number(b)) as [year, subjects]}
							<div>
								<h3 class="mb-3 text-lg font-semibold">Año {year}</h3>
								<div class="grid gap-3">
									{#each subjects as subject}
										<label class="flex cursor-pointer rounded-2xl border border-slate-700 bg-slate-950 p-4 transition hover:border-slate-500">
											<input
												name="subjectId"
												type="radio"
												value={subject.id}
												required
												class="mr-4 h-5 w-5"
											/>
											<div class="flex-1">
												<p class="font-medium">{subject.name}</p>
												<p class="text-sm text-slate-400">{subject.code}</p>
											</div>
										</label>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if errors.subjectId}
					<p class="mt-1 text-sm text-red-400">{errors.subjectId}</p>
				{/if}
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">
					Orden en el plan <span class="text-red-400">*</span>
				</label>
				<input
					name="sortOrder"
					type="number"
					min="1"
					required
					placeholder="1"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
				{#if errors.sortOrder}
					<p class="mt-1 text-sm text-red-400">{errors.sortOrder}</p>
				{/if}
				<p class="mt-2 text-sm text-slate-500">
					Define el orden de aparición de la materia en el plan curricular.
				</p>
			</div>

			<div class="flex gap-4 pt-4">
				<a
					href={`/carreras/${data.plan.career.id}/planes/${data.plan.id}`}
					class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold transition hover:border-slate-500"
				>
					Cancelar
				</a>
				<button
					type="submit"
					disabled={Object.keys(groupedSubjects).length === 0}
					class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
				>
					Agregar materia
				</button>
			</div>
		</form>
	</section>
</div>
