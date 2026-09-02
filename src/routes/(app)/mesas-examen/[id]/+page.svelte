<script lang="ts">
	let { data, form } = $props();

	function formatDate(value: Date | string | null) {
		if (!value) return '—';

		return new Intl.DateTimeFormat('es-AR', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function statusLabel(status: string) {
		const labels: Record<string, string> = {
			PENDING: 'Pendiente',
			PRESENT: 'Presente',
			ABSENT: 'Ausente',
			EXCUSED: 'Justificado'
		};

		return labels[status] ?? status;
	}

	function resultLabel(status: string, value: number | null) {
		if (status === 'PENDING') {
			return 'Pendiente';
		}

		if (status === 'ABSENT') {
			return 'Ausente';
		}

		if (status === 'EXCUSED') {
			return 'Ausencia justificada';
		}

		if (value === null) {
			return 'Sin nota';
		}

		return value >= data.mesa.minPassingScore ? 'Aprobado' : 'Desaprobado';
	}

	function resultClass(status: string, value: number | null) {
		if (status === 'PRESENT' && value !== null) {
			return value >= data.mesa.minPassingScore ? 'text-emerald-700' : 'text-red-700';
		}

		if (status === 'PENDING') {
			return 'text-amber-700';
		}

		return 'text-slate-600';
	}
</script>

<svelte:head>
	<title>{data.mesa.title} | Mesa de examen</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-6">
		<a href="/mesas-examen" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
			← Volver a Mesas de examen
		</a>
	</div>

	{#if form?.error}
		<div class="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 font-medium text-red-800">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div
			class="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 font-medium text-emerald-800"
		>
			{form.success}
		</div>
	{/if}

	<section class="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
		<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-[0.18em] text-indigo-600 uppercase">
					Mesa de examen
				</p>

				<h1 class="mt-2 text-3xl font-bold text-slate-950">
					{data.mesa.title}
				</h1>

				<p class="mt-3 text-slate-700">
					{data.mesa.subject.code} · {data.mesa.subject.name}
				</p>

				<p class="mt-1 text-sm text-slate-500">
					{data.mesa.career?.name ?? 'Sin carrera'} ·
					{data.mesa.location?.name ?? 'Sin sede'}
				</p>

				{#if data.mesa.description}
					<p class="mt-4 max-w-3xl text-sm text-slate-600">
						{data.mesa.description}
					</p>
				{/if}
			</div>

			<div class="grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:min-w-[470px]">
				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs text-slate-500">Fecha del examen</p>
					<p class="mt-1 font-semibold text-slate-900">
						{formatDate(data.mesa.evaluationDate)}
					</p>
				</div>

				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs text-slate-500">Estado</p>
					<p class="mt-1 font-semibold text-slate-900">
						{data.mesa.isClosed ? 'Cerrada' : 'Abierta'}
					</p>
				</div>

				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs text-slate-500">Docente responsable</p>
					<p class="mt-1 font-semibold text-slate-900">
						{data.mesa.responsibleTeacher
							? `${data.mesa.responsibleTeacher.lastName}, ${data.mesa.responsibleTeacher.firstName}`
							: 'Sin docente responsable'}
					</p>
				</div>

				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs text-slate-500">Creada por</p>
					<p class="mt-1 font-semibold text-slate-900">
						{data.mesa.createdByUser.firstName}
						{data.mesa.createdByUser.lastName}
					</p>
				</div>
			</div>
		</div>

		<div class="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-sm md:grid-cols-3">
			<div>
				<p class="text-xs text-slate-500">Inscripción</p>
				<p class="mt-1 text-slate-700">
					{formatDate(data.mesa.registrationOpensAt)}
					→
					{formatDate(data.mesa.registrationClosesAt)}
				</p>
			</div>

			<div>
				<p class="text-xs text-slate-500">Escala</p>
				<p class="mt-1 text-slate-700">
					Aprobación: {data.mesa.minPassingScore}
					/ Máxima: {data.mesa.maxScore}
				</p>
			</div>

			<div>
				<p class="text-xs text-slate-500">Inscripciones</p>
				<p class="mt-1 text-slate-700">
					{data.registrations.length} activas · {data.cancelledCount} canceladas
				</p>
			</div>
		</div>
	</section>

	<section class="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
		<div
			class="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<h2 class="text-xl font-semibold text-slate-950">Alumnos inscriptos</h2>

				<p class="mt-1 text-sm text-slate-500">
					{data.registrations.length} inscriptos activos ·
					{data.pendingCount} resultados pendientes
				</p>
			</div>

			{#if data.canManageGrades}
				<span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
					Edición habilitada
				</span>
			{:else if data.canManageMesa}
				<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
					Disponible desde la fecha del examen
				</span>
			{:else}
				<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
					Solo lectura
				</span>
			{/if}
		</div>

		{#if data.registrations.length === 0}
			<div class="p-10 text-center">
				<p class="font-medium text-slate-700">No hay alumnos inscriptos actualmente.</p>

				<p class="mt-2 text-sm text-slate-500">
					Los alumnos con inscripción REGISTERED aparecerán aquí.
				</p>
			</div>
		{:else if data.canManageGrades}
			<form method="POST" action="?/saveGrades">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-200">
						<thead class="bg-slate-50">
							<tr>
								<th
									class="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase"
								>
									Alumno
								</th>

								<th
									class="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase"
								>
									Estado
								</th>

								<th
									class="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase"
								>
									Nota
								</th>

								<th
									class="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase"
								>
									Resultado
								</th>

								<th
									class="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase"
								>
									Observaciones
								</th>
							</tr>
						</thead>

						<tbody class="divide-y divide-slate-100">
							{#each data.registrations as registration (registration.id)}
								<tr class="align-top">
									<td class="px-5 py-4">
										<input type="hidden" name="studentId" value={registration.student.id} />

										<p class="font-medium text-slate-900">
											{registration.student.lastName},
											{registration.student.firstName}
										</p>

										<p class="mt-1 text-xs text-slate-500">
											DNI {registration.student.dni}
										</p>
									</td>

									<td class="px-5 py-4">
										<select
											name={`status:${registration.student.id}`}
											aria-label={`Estado de ${registration.student.lastName}, ${registration.student.firstName}`}
											class="min-w-[145px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
										>
											<option
												value="PENDING"
												selected={!registration.grade || registration.grade.status === 'PENDING'}
											>
												Pendiente
											</option>

											<option value="PRESENT" selected={registration.grade?.status === 'PRESENT'}>
												Presente
											</option>

											<option value="ABSENT" selected={registration.grade?.status === 'ABSENT'}>
												Ausente
											</option>

											<option value="EXCUSED" selected={registration.grade?.status === 'EXCUSED'}>
												Justificado
											</option>
										</select>
									</td>

									<td class="px-5 py-4">
										<input
											type="number"
											name={`value:${registration.student.id}`}
											aria-label={`Nota de ${registration.student.lastName}, ${registration.student.firstName}`}
											min="0"
											max={data.mesa.maxScore}
											step="0.01"
											value={registration.grade?.value ?? ''}
											class="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
										/>
									</td>

									<td class="px-5 py-4">
										<p
											class={`font-medium ${resultClass(
												registration.grade?.status ?? 'PENDING',
												registration.grade?.value ?? null
											)}`}
										>
											{resultLabel(
												registration.grade?.status ?? 'PENDING',
												registration.grade?.value ?? null
											)}
										</p>
									</td>

									<td class="px-5 py-4">
										<input
											type="text"
											name={`observations:${registration.student.id}`}
											aria-label={`Observaciones de ${registration.student.lastName}, ${registration.student.firstName}`}
											value={registration.grade?.observations ?? ''}
											placeholder="Opcional"
											class="min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="flex justify-end border-t border-slate-200 bg-slate-50 p-5">
					<button
						type="submit"
						class="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500"
					>
						Guardar resultados
					</button>
				</div>
			</form>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200">
					<thead class="bg-slate-50">
						<tr>
							<th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
								Alumno
							</th>
							<th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
								Estado
							</th>
							<th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
								Nota
							</th>
							<th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
								Resultado
							</th>
						</tr>
					</thead>

					<tbody class="divide-y divide-slate-100">
						{#each data.registrations as registration (registration.id)}
							<tr>
								<td class="px-5 py-4">
									<p class="font-medium text-slate-900">
										{registration.student.lastName},
										{registration.student.firstName}
									</p>
									<p class="text-xs text-slate-500">
										DNI {registration.student.dni}
									</p>
								</td>

								<td class="px-5 py-4 text-sm text-slate-700">
									{statusLabel(registration.grade?.status ?? 'PENDING')}
								</td>

								<td class="px-5 py-4 text-sm text-slate-700">
									{registration.grade?.value ?? '—'}
								</td>

								<td
									class={`px-5 py-4 text-sm font-medium ${resultClass(
										registration.grade?.status ?? 'PENDING',
										registration.grade?.value ?? null
									)}`}
								>
									{resultLabel(
										registration.grade?.status ?? 'PENDING',
										registration.grade?.value ?? null
									)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	{#if data.mesa.isClosed}
		<section class="rounded-2xl border border-slate-300 bg-slate-50 p-6">
			<h2 class="text-lg font-semibold text-slate-900">Mesa cerrada</h2>

			<p class="mt-2 text-sm text-slate-600">
				Cerrada el {formatDate(data.mesa.closedAt)}
				{#if data.mesa.closedByUser}
					por {data.mesa.closedByUser.firstName}
					{data.mesa.closedByUser.lastName}
				{/if}.
			</p>

			{#if data.mesa.closedReason}
				<p class="mt-2 text-sm text-slate-600">
					Motivo: {data.mesa.closedReason}
				</p>
			{/if}
		</section>
	{:else if data.canManageMesa}
		<section class="rounded-2xl border border-violet-200 bg-violet-50 p-6">
			<h2 class="text-lg font-semibold text-violet-950">Cierre académico de la mesa</h2>

			<p class="mt-2 text-sm text-violet-800">
				Para cerrar la mesa, la fecha del examen debe haber llegado y todos los alumnos inscriptos
				deben tener un resultado distinto de Pendiente.
			</p>

			{#if data.pendingCount > 0}
				<p class="mt-3 font-medium text-amber-800">
					Faltan {data.pendingCount} resultados.
				</p>
			{/if}

			<form method="POST" action="?/close" class="mt-5 space-y-4">
				<div>
					<label for="reason" class="mb-2 block text-sm font-medium text-violet-950">
						Observación de cierre
					</label>

					<textarea
						id="reason"
						name="reason"
						rows="2"
						placeholder="Opcional"
						class="w-full rounded-xl border border-violet-300 bg-white px-4 py-3 text-slate-900"
					></textarea>
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						disabled={!data.canClose}
						class="rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Cerrar mesa de examen
					</button>
				</div>
			</form>
		</section>
	{/if}
</div>
