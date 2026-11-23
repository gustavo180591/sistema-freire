<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDni } from '$lib/utils/dni';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	function plansForCareer(careerId: string) {
		return data.studyPlans.filter((plan) => plan.careerId === careerId);
	}
</script>

<svelte:head>
	<title>Libro Matriz | Sistema Freire</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-8">
			<p class="text-sm font-semibold tracking-[0.2em] text-indigo-300 uppercase">Preceptoría</p>

			<h1 class="mt-2 text-3xl font-bold">Libro Matriz</h1>

			<p class="mt-2 max-w-3xl text-slate-400">
				Consultá y administrá el registro académico oficial de cada alumno.
			</p>
		</div>

		{#if form && 'planError' in form && form.planError}
			<div class="mb-6 rounded-2xl border border-red-700 bg-white p-4 text-red-700">
				{form.planError}
			</div>
		{/if}

		{#if form && 'planSuccess' in form && form.planSuccess}
			<div class="mb-6 rounded-2xl border border-emerald-700 bg-white p-4 text-emerald-700">
				{form.message}
			</div>
		{/if}

		<section class="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
			<form method="GET" class="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
				<div>
					<label for="q" class="mb-2 block text-sm font-medium text-slate-300">
						Buscar alumno
					</label>

					<input
						id="q"
						name="q"
						type="search"
						value={data.filters.search}
						placeholder="Apellido, nombre o DNI"
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
					/>
				</div>

				<div>
					<label for="careerId" class="mb-2 block text-sm font-medium text-slate-300">
						Carrera
					</label>

					<select
						id="careerId"
						name="careerId"
						value={data.filters.careerId}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-400"
					>
						<option value="">Todas las carreras</option>

						{#each data.careers as career (career.id)}
							<option value={career.id}>{career.name}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-end">
					<button
						type="submit"
						class="w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
					>
						Buscar
					</button>
				</div>
			</form>
		</section>

		<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
			<div class="border-b border-slate-800 px-6 py-5">
				<h2 class="text-lg font-semibold">Alumnos</h2>
				<p class="mt-1 text-sm text-slate-400">{data.students.length} registros encontrados</p>
			</div>

			{#if data.students.length === 0}
				<div class="px-6 py-14 text-center text-slate-400">
					No se encontraron alumnos para los filtros seleccionados.
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[1050px]">
						<thead class="bg-slate-950/70">
							<tr class="text-left text-xs tracking-wider text-slate-400 uppercase">
								<th class="px-6 py-4">Alumno</th>
								<th class="px-6 py-4">DNI</th>
								<th class="px-6 py-4">Carrera</th>
								<th class="px-6 py-4">Plan</th>
								<th class="px-6 py-4 text-right">Acciones</th>
							</tr>
						</thead>

						<tbody class="divide-y divide-slate-800">
							{#each data.students as student (student.id)}
								<tr class="transition hover:bg-slate-800/40">
									<td class="px-6 py-4">
										<p class="font-semibold">
											{student.lastName.toUpperCase()}, {student.firstName.toUpperCase()}
										</p>
									</td>

									<td class="px-6 py-4 text-slate-300">
										{formatDni(student.dni)}
									</td>

									<td class="px-6 py-4 text-slate-300">
										{student.career.name}
									</td>

									<td class="px-6 py-4">
										{#if student.studyPlan}
											<span
												class="inline-flex rounded-full border border-emerald-700 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
											>
												{student.studyPlan.code ?? 'Sin código'}
											</span>
										{:else}
											<span
												class="inline-flex rounded-full border border-amber-700 bg-white px-3 py-1 text-xs font-medium text-amber-700"
											>
												Sin plan asignado
											</span>
										{/if}
									</td>

									<td class="px-6 py-4">
										<div class="flex flex-col items-end gap-2">
											<a
												href={resolve(`/preceptor/libro-matriz/${student.id}`)}
												class="inline-flex rounded-xl border border-indigo-500/40 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/10"
											>
												Abrir Libro Matriz
											</a>

											<details class="w-full max-w-xs">
												<summary
													class="cursor-pointer list-none text-right text-sm font-semibold text-sky-300 hover:text-sky-200"
												>
													{student.studyPlan ? 'Cambiar plan' : 'Asignar plan'}
												</summary>

												<div
													class="mt-3 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-left"
												>
													<form method="POST" action="?/assignPlan" class="space-y-3">
														<input type="hidden" name="studentId" value={student.id} />

														<div>
															<label
																for={`plan-${student.id}`}
																class="mb-2 block text-xs font-medium tracking-wide text-slate-400 uppercase"
															>
																Plan de estudio
															</label>

															<input
																id={`plan-${student.id}`}
																name="planText"
																type="text"
																list={`plans-${student.id}`}
																value={student.studyPlan?.code ?? ''}
																placeholder="Ej: 661/13"
																maxlength="50"
																required
																class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
															/>

															<datalist id={`plans-${student.id}`}>
																{#each plansForCareer(student.career.id) as plan (plan.id)}
																	<option value={plan.code ?? ''}></option>
																{/each}
															</datalist>

															<p class="mt-2 text-xs text-slate-500">
																Podés escribir un plan nuevo o elegir uno ya existente.
															</p>
														</div>

														<button
															type="submit"
															class="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
														>
															Guardar plan
														</button>
													</form>
												</div>
											</details>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	</div>
</div>
