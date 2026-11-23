<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDni } from '$lib/utils/dni';
	import { formatGradeInWords } from '$lib/utils/grade-in-words';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	function formatDate(value: string | Date | null | undefined): string {
		if (!value) return '';

		return new Intl.DateTimeFormat('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			timeZone: 'UTC'
		}).format(new Date(value));
	}

	function formatGrade(value: number | null | undefined): string {
		if (value === null || value === undefined) return '';

		return value.toFixed(2).replace('.', ',');
	}

	function birthDateParts(value: string | Date | null | undefined) {
		if (!value) {
			return {
				day: '',
				month: '',
				year: ''
			};
		}

		const date = new Date(value);

		return {
			day: String(date.getUTCDate()).padStart(2, '0'),
			month: new Intl.DateTimeFormat('es-AR', {
				month: 'long',
				timeZone: 'UTC'
			})
				.format(date)
				.toUpperCase(),
			year: String(date.getUTCFullYear())
		};
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

	function academicYearLabel(
		rows: Array<{
			accreditation: {
				academicYear: number | null;
			} | null;
		}>
	): string {
		const years = Array.from(
			new Set(
				rows
					.map((row) => row.accreditation?.academicYear)
					.filter((year): year is number => year !== null && year !== undefined)
			)
		).sort((a, b) => a - b);

		return years.join(' / ');
	}

	function createGradeDrafts(): Record<string, string> {
		return Object.fromEntries(
			data.matrix.years.flatMap((year) =>
				year.rows.map((row) => [
					row.subjectId,
					row.accreditation?.grade !== null && row.accreditation?.grade !== undefined
						? formatGrade(row.accreditation.grade)
						: ''
				])
			)
		);
	}

	function isEquivalenceFolio(value: string): boolean {
		return (
			value
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.trim()
				.toLowerCase() === 'equivalencia'
		);
	}

	function handleFolioInput(subjectId: string): void {
		const value = folioDrafts[subjectId] ?? '';

		if (value.trim().toLowerCase() === 'e') {
			folioDrafts[subjectId] = 'Equivalencia';
		}
	}

	function gradeInWords(value: string): string {
		const normalizedValue = value.trim().replace(',', '.');

		if (!normalizedValue) return '';

		if (!/^(?:10|[0-9])(?:\.\d{0,2})?$/.test(normalizedValue)) {
			return '';
		}

		const grade = Number(normalizedValue);

		if (!Number.isFinite(grade) || grade < 0 || grade > 10) {
			return '';
		}

		return formatGradeInWords(grade) ?? '';
	}

	let gradeDrafts = $state<Record<string, string>>(createGradeDrafts());

	function dateInputValue(value: string | Date | null | undefined): string {
		if (!value) return '';

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return '';
		}

		return date.toISOString().slice(0, 10);
	}

	function createFolioDrafts(): Record<string, string> {
		return Object.fromEntries(
			data.matrix.years.flatMap((year) =>
				year.rows.map((row) => [row.subjectId, row.accreditation?.folio ?? ''])
			)
		);
	}

	function createDateDrafts(): Record<string, string> {
		return Object.fromEntries(
			data.matrix.years.flatMap((year) =>
				year.rows.map((row) => [row.subjectId, dateInputValue(row.accreditation?.accreditedAt)])
			)
		);
	}

	function createOtherEstablishmentDrafts(): Record<string, string> {
		return Object.fromEntries(
			data.matrix.years.flatMap((year) =>
				year.rows.map((row) => {
					const establishment = row.accreditation?.establishment?.trim();

					return [
						row.subjectId,
						establishment && establishment !== 'ISFD "Paulo Freire" 1117' ? establishment : ''
					];
				})
			)
		);
	}

	let folioDrafts = $state<Record<string, string>>(createFolioDrafts());
	let dateDrafts = $state<Record<string, string>>(createDateDrafts());

	let otherEstablishmentDrafts = $state<Record<string, string>>(createOtherEstablishmentDrafts());

	const birthDate = $derived(birthDateParts(data.matrix.student.birthDate));
</script>

<svelte:head>
	<title>
		Libro Matriz · {data.matrix.student.lastName}, {data.matrix.student.firstName} | Sistema Freire
	</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
			<div>
				<a
					href={resolve('/preceptor/libro-matriz')}
					class="text-sm font-semibold text-indigo-300 transition hover:text-indigo-200"
				>
					← Volver al Libro Matriz
				</a>

				<h1 class="mt-4 text-2xl font-bold sm:text-3xl">Libro Matriz</h1>

				<p class="mt-1 text-sm text-slate-400">
					{data.matrix.student.lastName.toUpperCase()},
					{data.matrix.student.firstName.toUpperCase()}
				</p>
			</div>

			<details class="w-full sm:w-auto">
				<summary
					class="cursor-pointer list-none rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-400"
				>
					Editar datos de cabecera
				</summary>

				<div class="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:w-[520px]">
					<form method="POST" action="?/saveHeader" class="space-y-4">
						<input type="hidden" name="studyPlanId" value={data.matrix.student.studyPlanId ?? ''} />

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
								value={data.matrix.student.entryCertificateIssuer ?? ''}
								placeholder="Institución que expidió el certificado"
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
							/>
						</div>

						<button
							type="submit"
							class="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
						>
							Guardar datos
						</button>
					</form>
				</div>
			</details>
		</div>

		{#if data.matrix.curriculumSource === 'CAREER_REFERENCE'}
			<div class="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
				<p class="font-semibold">Este alumno todavía no tiene un plan de estudios asignado.</p>
				<p class="mt-1 text-sm text-amber-100/80">
					Asigná el plan correspondiente desde el listado de Libro Matriz antes de considerar este
					registro como oficial.
				</p>
			</div>
		{/if}

		{#if form && 'headerError' in form && form.headerError}
			<div class="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
				{form.headerError}
			</div>
		{/if}

		{#if form && 'headerSuccess' in form && form.headerSuccess}
			<div
				class="mb-6 rounded-2xl border border-emerald-800 bg-white p-4 font-medium text-emerald-800 shadow-sm"
			>
				{form.message}
			</div>
		{/if}

		{#if form && 'gradeError' in form && form.gradeError}
			<div class="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
				{form.gradeError}
			</div>
		{/if}

		{#if form && 'gradeSuccess' in form && form.gradeSuccess}
			<div
				class="mb-6 rounded-2xl border border-emerald-800 bg-white p-4 font-medium text-emerald-800 shadow-sm"
			>
				{form.message}
			</div>
		{/if}

		<div class="overflow-x-auto rounded-2xl shadow-2xl">
			<div class="min-w-[1120px] bg-white p-8 text-slate-950 lg:p-12">
				<div class="mx-auto max-w-[1380px] font-serif">
					<!-- CABECERA DEL LIBRO MATRIZ -->
					<section class="space-y-5 text-[15px] leading-relaxed">
						<div class="grid grid-cols-[1.45fr_1fr] gap-x-10">
							<div class="flex items-end gap-2">
								<span class="shrink-0 text-slate-700">Señor</span>

								<span
									class="min-h-7 flex-1 border-b border-slate-700 px-2 text-lg font-semibold tracking-wide"
								>
									{data.matrix.student.lastName.toUpperCase()},
									{data.matrix.student.firstName.toUpperCase()}
								</span>
							</div>

							<div class="flex items-end gap-2">
								<span class="shrink-0 text-slate-700">nacido en</span>

								<span class="min-h-7 flex-1 border-b border-slate-700 px-2 font-semibold uppercase">
									{data.matrix.student.birthPlace ?? ''}
								</span>
							</div>
						</div>

						<div class="grid grid-cols-[1.3fr_1fr] gap-x-10">
							<div class="flex items-end gap-2">
								<span class="shrink-0 text-slate-700">el</span>

								<span class="min-w-12 border-b border-slate-700 px-2 text-center font-semibold">
									{birthDate.day}
								</span>

								<span class="text-slate-700">de</span>

								<span class="min-w-40 border-b border-slate-700 px-2 text-center font-semibold">
									{birthDate.month}
								</span>

								<span class="text-slate-700">del</span>

								<span class="min-w-20 border-b border-slate-700 px-2 text-center font-semibold">
									{birthDate.year}
								</span>
							</div>

							<div class="flex items-end gap-2">
								<span class="shrink-0 font-semibold text-slate-700">L.E./L.C./DNI</span>

								<span
									class="min-h-7 flex-1 border-b border-slate-700 px-2 text-lg font-semibold tracking-wide"
								>
									{formatDni(data.matrix.student.dni)}
								</span>
							</div>
						</div>

						<div class="grid grid-cols-[1.45fr_1fr] gap-x-10">
							<div class="flex items-end gap-2">
								<span class="shrink-0 font-semibold text-slate-700 uppercase">
									Ingresó con certificado de:
								</span>

								<span class="min-h-7 flex-1 border-b border-slate-700 px-2 font-semibold uppercase">
									{data.matrix.student.entryCertificateTitle ?? ''}
								</span>
							</div>

							<div class="flex items-end gap-2">
								<span class="shrink-0 font-semibold text-slate-700 uppercase"> Expedido por: </span>

								<span class="min-h-7 flex-1 border-b border-slate-700 px-2 font-semibold uppercase">
									{data.matrix.student.entryCertificateIssuer ?? ''}
								</span>
							</div>
						</div>

						<div class="grid grid-cols-[1fr_260px] gap-x-10">
							<div class="flex items-end gap-2">
								<span class="shrink-0 font-bold text-slate-800 uppercase"> Carrera: </span>

								<span
									class="min-h-7 flex-1 border-b border-slate-700 px-2 text-base font-semibold uppercase"
								>
									{data.matrix.student.career.name}
								</span>
							</div>

							<div class="flex items-end gap-2">
								<span class="shrink-0 font-bold text-slate-800 uppercase"> Plan: </span>

								<span
									class="min-h-7 flex-1 border-b border-slate-700 px-2 text-center text-xl font-bold"
								>
									{data.matrix.student.studyPlan?.code ?? ''}
								</span>
							</div>
						</div>
					</section>

					<!-- AÑOS DEL PLAN -->
					{#if data.matrix.years.length === 0}
						<div class="mt-12 border border-slate-400 p-8 text-center text-slate-500">
							No hay asignaturas configuradas para este plan.
						</div>
					{:else}
						{#each data.matrix.years as year (year.yearLevel)}
							<section class="mt-12">
								<div class="mb-4 grid grid-cols-[1fr_auto] items-end">
									<h2 class="text-center text-xl font-bold tracking-[0.18em]">
										{yearLabel(year.yearLevel)}
									</h2>

									<div class="flex items-end gap-2 text-lg">
										<span class="font-semibold">AÑO</span>

										<span
											class="min-w-28 border-b border-slate-700 px-3 text-center text-xl font-semibold"
										>
											{academicYearLabel(year.rows)}
										</span>
									</div>
								</div>

								<form method="POST" action="?/saveGrades">
									<div class="mb-3 flex justify-end font-sans">
										<button
											type="submit"
											class="rounded-lg border border-slate-400 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
										>
											Guardar notas
										</button>
									</div>
									<table class="w-full table-fixed border-collapse text-[14px]">
										<thead>
											<tr>
												<th
													rowspan="2"
													class="w-[39%] border border-slate-800 px-3 py-3 text-center font-bold tracking-wide uppercase"
												>
													Asignaturas
												</th>

												<th
													colspan="4"
													class="border border-slate-800 px-3 py-2 text-center font-bold tracking-wide uppercase"
												>
													Calificaciones
												</th>

												<th
													rowspan="2"
													class="w-[25%] border border-slate-800 px-3 py-3 text-center font-bold tracking-wide uppercase"
												>
													Establecimiento
												</th>
											</tr>

											<tr>
												<th
													class="w-[9%] border border-slate-800 px-2 py-2 text-center font-semibold"
												>
													En Núm.
												</th>

												<th
													class="w-[12%] border border-slate-800 px-2 py-2 text-center font-semibold"
												>
													En Letras
												</th>

												<th
													class="w-[7%] border border-slate-800 px-2 py-2 text-center font-semibold"
												>
													Folio
												</th>

												<th
													class="w-[8%] border border-slate-800 px-2 py-2 text-center font-semibold"
												>
													Fecha
												</th>
											</tr>
										</thead>

										<tbody>
											{#each year.rows as row (row.subjectId)}
												<tr class="h-12">
													<td class="border border-slate-800 px-3 py-2 font-semibold uppercase">
														{row.name}
													</td>

													<td
														class="border border-slate-800 px-2 py-1 text-center text-base font-semibold"
													>
														<input
															name={`grade:${row.subjectId}`}
															type="text"
															inputmode="decimal"
															autocomplete="off"
															maxlength="5"
															placeholder="0,00"
															aria-label={`Nota de ${row.name}`}
															bind:value={gradeDrafts[row.subjectId]}
															class="w-full bg-transparent px-1 py-2 text-center font-semibold transition outline-none focus:bg-amber-50"
														/>
													</td>

													<td class="border border-slate-800 px-2 py-2 text-center font-medium">
														{gradeInWords(gradeDrafts[row.subjectId] ?? '')}
													</td>

													<td class="border border-slate-800 px-1 py-1 text-center">
														<input
															name={`folio:${row.subjectId}`}
															type="text"
															autocomplete="off"
															maxlength="100"
															placeholder="Folio / Equivalencia"
															aria-label={`Folio de ${row.name}`}
															bind:value={folioDrafts[row.subjectId]}
															oninput={() => handleFolioInput(row.subjectId)}
															class="w-full bg-transparent px-1 py-2 text-center transition outline-none focus:bg-amber-50"
														/>
													</td>

													<td class="border border-slate-800 px-1 py-1 text-center">
														<input
															name={`accreditedAt:${row.subjectId}`}
															type="date"
															aria-label={`Fecha de ${row.name}`}
															title={formatDate(row.accreditation?.accreditedAt)}
															bind:value={dateDrafts[row.subjectId]}
															class="w-full bg-transparent px-1 py-2 text-center text-[12px] transition outline-none focus:bg-amber-50"
														/>
													</td>

													<td class="border border-slate-800 px-2 py-2">
														{#if isEquivalenceFolio(folioDrafts[row.subjectId] ?? '')}
															<input
																name={`establishmentOther:${row.subjectId}`}
																type="text"
																autocomplete="off"
																maxlength="200"
																placeholder="Nombre del establecimiento"
																aria-label={`Establecimiento de equivalencia de ${row.name}`}
																bind:value={otherEstablishmentDrafts[row.subjectId]}
																class="w-full bg-transparent px-1 py-2 text-sm transition outline-none focus:bg-amber-50"
															/>
														{:else}
															<div class="px-1 py-2 text-sm font-medium">
																ISFD "Paulo Freire" 1117
															</div>
														{/if}

														{#if row.accreditation?.officialReference}
															<div class="mt-1 text-xs text-slate-600 italic">
																{row.accreditation.officialReference}
															</div>
														{/if}
													</td>
												</tr>
											{/each}

											{#each Array.from({ length: Math.max(0, 12 - year.rows.length) }, (_, index) => index) as index (`empty-${year.yearLevel}-${index}`)}
												<tr class="h-12">
													<td class="border border-slate-800"></td>
													<td class="border border-slate-800"></td>
													<td class="border border-slate-800"></td>
													<td class="border border-slate-800"></td>
													<td class="border border-slate-800"></td>
													<td class="border border-slate-800"></td>
												</tr>
											{/each}
										</tbody>
									</table>
								</form>
							</section>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
