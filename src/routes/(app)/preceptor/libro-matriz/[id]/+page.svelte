<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDni } from '$lib/utils/dni';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	function formatDate(value: string | Date | null | undefined): string {
		if (!value) return '—';

		return new Intl.DateTimeFormat('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(value));
	}

	function accreditationLabel(type: string | null | undefined): string {
		const labels: Record<string, string> = {
			FINAL_EXAM: 'Examen final',
			PROMOTION: 'Promoción',
			EQUIVALENCE: 'Equivalencia',
			UNSPECIFIED: 'Aprobación'
		};

		return type ? (labels[type] ?? type) : 'Sin acreditar';
	}

	function yearLabel(yearLevel: number): string {
		const labels: Record<number, string> = {
			1: 'PRIMER AÑO',
			2: 'SEGUNDO AÑO',
			3: 'TERCER AÑO',
			4: 'CUARTO AÑO',
			5: 'QUINTO AÑO',
			6: 'SEXTO AÑO'
		};

		return labels[yearLevel] ?? `${yearLevel}° AÑO`;
	}
</script>

<svelte:head>
	<title>Libro Matriz | Sistema Freire</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-6">
			<a
				href={resolve('/preceptor/libro-matriz')}
				class="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
			>
				← Volver al Libro Matriz
			</a>

			<p class="mt-6 text-sm font-semibold tracking-[0.2em] text-indigo-300 uppercase">
				Libro Matriz
			</p>

			<h1 class="mt-2 text-3xl font-bold">
				{data.matrix.student.lastName.toUpperCase()}, {data.matrix.student.firstName.toUpperCase()}
			</h1>

			<p class="mt-2 text-slate-400">
				DNI {formatDni(data.matrix.student.dni)} · {data.matrix.student.career.name}
			</p>
		</div>

		{#if data.matrix.curriculumSource === 'CAREER_REFERENCE'}
			<div class="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
				<p class="font-semibold">El alumno todavía no tiene un plan de estudios asignado.</p>
				<p class="mt-1 text-sm text-amber-100/80">
					Las materias se muestran como referencia de la carrera. Seleccioná el plan correcto antes
					de considerar este Libro Matriz como registro oficial.
				</p>
			</div>
		{/if}

		{#if form && 'headerError' in form && form.headerError}
			<div class="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
				{form.headerError}
			</div>
		{/if}

		{#if form && 'headerSuccess' in form && form.headerSuccess}
			<div
				class="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200"
			>
				{form.message}
			</div>
		{/if}

		<section class="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
			<div class="mb-6">
				<h2 class="text-xl font-semibold">Datos del alumno</h2>
				<p class="mt-1 text-sm text-slate-400">Cabecera institucional del Libro Matriz.</p>
			</div>

			<form method="POST" action="?/saveHeader" class="space-y-6">
				<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					<div>
						<p class="text-xs tracking-wider text-slate-500 uppercase">Apellido y nombres</p>
						<p class="mt-2 font-semibold">
							{data.matrix.student.lastName.toUpperCase()}, {data.matrix.student.firstName.toUpperCase()}
						</p>
					</div>

					<div>
						<p class="text-xs tracking-wider text-slate-500 uppercase">DNI</p>
						<p class="mt-2 font-semibold">{formatDni(data.matrix.student.dni)}</p>
					</div>

					<div>
						<p class="text-xs tracking-wider text-slate-500 uppercase">Fecha de nacimiento</p>
						<p class="mt-2 font-semibold">{formatDate(data.matrix.student.birthDate)}</p>
					</div>
				</div>

				<div class="grid gap-5 md:grid-cols-2">
					<div>
						<label for="birthPlace" class="mb-2 block text-sm font-medium text-slate-300">
							Lugar de nacimiento
						</label>

						<input
							id="birthPlace"
							name="birthPlace"
							value={data.matrix.student.birthPlace ?? ''}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
						/>
					</div>

					<div>
						<label for="studyPlanId" class="mb-2 block text-sm font-medium text-slate-300">
							Plan de estudios
						</label>

						<select
							id="studyPlanId"
							name="studyPlanId"
							value={data.matrix.student.studyPlanId ?? data.matrix.suggestedStudyPlanId ?? ''}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
						>
							<option value="">Seleccionar plan...</option>

							{#each data.matrix.plans as plan (plan.id)}
								<option value={plan.id}>
									{plan.name} · {plan.version}{plan.resolution ? ` · Res. ${plan.resolution}` : ''}
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label
							for="entryCertificateTitle"
							class="mb-2 block text-sm font-medium text-slate-300"
						>
							Ingresó con certificado de
						</label>

						<input
							id="entryCertificateTitle"
							name="entryCertificateTitle"
							value={data.matrix.student.entryCertificateTitle ?? ''}
							placeholder="Ej: Bachiller en Humanidades y Ciencias Sociales"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
						/>
					</div>

					<div>
						<label
							for="entryCertificateIssuer"
							class="mb-2 block text-sm font-medium text-slate-300"
						>
							Expedido por
						</label>

						<input
							id="entryCertificateIssuer"
							name="entryCertificateIssuer"
							value={data.matrix.student.entryCertificateIssuer ??
								data.matrix.student.highSchool ??
								''}
							placeholder="Institución que expidió el certificado"
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
						/>
					</div>
				</div>

				<div class="grid gap-4 rounded-2xl bg-slate-950 p-5 sm:grid-cols-2">
					<div>
						<p class="text-xs tracking-wider text-slate-500 uppercase">Carrera</p>
						<p class="mt-1 font-semibold">{data.matrix.student.career.name}</p>
					</div>

					<div>
						<p class="text-xs tracking-wider text-slate-500 uppercase">Resolución del plan</p>
						<p class="mt-1 font-semibold">
							{data.matrix.student.studyPlan?.resolution ?? 'Sin resolución cargada'}
						</p>
					</div>
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						class="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
					>
						Guardar cabecera
					</button>
				</div>
			</form>
		</section>

		{#each data.matrix.years as year (year.yearLevel)}
			<section class="mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
				<div class="border-b border-slate-800 bg-slate-950/60 px-6 py-5">
					<h2 class="text-xl font-bold">{yearLabel(year.yearLevel)}</h2>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full min-w-[1100px]">
						<thead>
							<tr class="text-left text-xs tracking-wider text-slate-400 uppercase">
								<th class="px-5 py-4">Asignatura</th>
								<th class="px-5 py-4">Número</th>
								<th class="px-5 py-4">En letras</th>
								<th class="px-5 py-4">Tipo</th>
								<th class="px-5 py-4">Folio</th>
								<th class="px-5 py-4">Fecha</th>
								<th class="px-5 py-4">Establecimiento</th>
							</tr>
						</thead>

						<tbody class="divide-y divide-slate-800">
							{#each year.rows as row (row.subjectId)}
								<tr class="align-top">
									<td class="px-5 py-4">
										<p class="font-semibold">{row.name}</p>
										<p class="mt-1 text-xs text-slate-500">{row.code}</p>
									</td>

									<td class="px-5 py-4 font-semibold">
										{row.accreditation?.grade?.toFixed(2).replace('.', ',') ?? '—'}
									</td>

									<td class="px-5 py-4">
										{row.accreditation?.gradeInWords ?? '—'}
									</td>

									<td class="px-5 py-4">
										{accreditationLabel(row.accreditation?.type)}
									</td>

									<td class="px-5 py-4">
										{row.accreditation?.folio ?? '—'}
									</td>

									<td class="px-5 py-4">
										{formatDate(row.accreditation?.accreditedAt)}
									</td>

									<td class="px-5 py-4">
										{row.accreditation?.establishment ?? '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	</div>
</div>
