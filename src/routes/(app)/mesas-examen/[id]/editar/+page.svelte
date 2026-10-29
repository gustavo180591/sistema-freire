<script lang="ts">
	let { data, form } = $props();

	const firstCall = $derived(
		data.series.evaluations.find((evaluation) => evaluation.examCallNumber === 1) ??
			data.series.evaluations[0]
	);

	const secondCall = $derived(
		data.series.evaluations.find((evaluation) => evaluation.examCallNumber === 2)
	);

	function inputDate(value: Date | string) {
		const date = new Date(value);
		const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

		return local.toISOString().slice(0, 16);
	}
</script>

<svelte:head>
	<title>Editar mesa de examen</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
	<a href="/mesas-examen" class="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
		← Volver a mesas de examen
	</a>

	<div class="mt-6">
		<p class="text-xs font-semibold tracking-[0.15em] text-indigo-600 uppercase">Editar mesa</p>

		<h1 class="mt-2 text-3xl font-bold">
			{firstCall.subject.name}
		</h1>

		<p class="mt-2 text-sm text-slate-500">
			{firstCall.career?.name ?? 'Sin carrera'} ·
			{firstCall.location?.name ?? 'Sin sede'}
		</p>
	</div>

	{#if form?.error}
		<div class="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
			{form.success}
		</div>
	{/if}

	<form method="POST" class="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
		<div class="grid gap-5 md:grid-cols-2">
			<div class="md:col-span-2">
				<label for="presidentTeacherId" class="mb-2 block text-sm font-semibold text-slate-700">
					Presidente
				</label>

				<select
					id="presidentTeacherId"
					name="presidentTeacherId"
					required
					class="w-full rounded-xl border border-slate-300 px-4 py-3"
				>
					{#each data.teachers as teacher (teacher.id)}
						<option value={teacher.id} selected={teacher.id === data.series.presidentTeacherId}>
							{teacher.lastName}, {teacher.firstName} · DNI {teacher.dni}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="firstVocalTeacherId" class="mb-2 block text-sm font-semibold text-slate-700">
					1.er vocal
				</label>

				<select
					id="firstVocalTeacherId"
					name="firstVocalTeacherId"
					required
					class="w-full rounded-xl border border-slate-300 px-4 py-3"
				>
					<option value="">Seleccionar...</option>

					{#each data.teachers as teacher (teacher.id)}
						<option value={teacher.id} selected={teacher.id === data.series.firstVocalTeacherId}>
							{teacher.lastName}, {teacher.firstName} · DNI {teacher.dni}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="secondVocalTeacherId" class="mb-2 block text-sm font-semibold text-slate-700">
					2.º vocal
				</label>

				<select
					id="secondVocalTeacherId"
					name="secondVocalTeacherId"
					required
					class="w-full rounded-xl border border-slate-300 px-4 py-3"
				>
					<option value="">Seleccionar...</option>

					{#each data.teachers as teacher (teacher.id)}
						<option value={teacher.id} selected={teacher.id === data.series.secondVocalTeacherId}>
							{teacher.lastName}, {teacher.firstName} · DNI {teacher.dni}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="firstCallDate" class="mb-2 block text-sm font-semibold text-slate-700">
					1.º llamado
				</label>

				<input
					id="firstCallDate"
					name="firstCallDate"
					type="datetime-local"
					value={inputDate(firstCall.evaluationDate)}
					required
					class="w-full rounded-xl border border-slate-300 px-4 py-3"
				/>
			</div>

			{#if secondCall}
				<div>
					<label for="secondCallDate" class="mb-2 block text-sm font-semibold text-slate-700">
						2.º llamado
					</label>

					<input
						id="secondCallDate"
						name="secondCallDate"
						type="datetime-local"
						value={inputDate(secondCall.evaluationDate)}
						required
						class="w-full rounded-xl border border-slate-300 px-4 py-3"
					/>
				</div>
			{/if}
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				class="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
			>
				Guardar cambios
			</button>
		</div>
	</form>
</div>
