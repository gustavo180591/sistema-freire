<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();
</script>

<svelte:head>
	<title>Planes de estudio | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<header>
		<p class="text-sm font-semibold tracking-[0.2em] text-indigo-400 uppercase">
			Configuración académica
		</p>

		<h1 class="mt-2 text-3xl font-bold">Planes de estudio</h1>

		<p class="mt-2 text-slate-400">Administrá los planes disponibles para el Libro Matriz.</p>
	</header>

	{#if form && 'error' in form && form.error}
		<div class="rounded-2xl border border-red-700 bg-white p-4 text-red-700">
			{form.error}
		</div>
	{/if}

	{#if form && 'success' in form && form.success}
		<div class="rounded-2xl border border-emerald-700 bg-white p-4 text-emerald-700">
			{form.message}
		</div>
	{/if}

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="text-lg font-semibold">Crear plan</h2>

		<form method="POST" action="?/create" class="mt-5 grid gap-4 md:grid-cols-[1fr_2fr_auto]">
			<div>
				<label for="plan" class="mb-2 block text-sm text-slate-300"> Plan </label>

				<input
					id="plan"
					name="plan"
					type="text"
					placeholder="Ej: 661/13"
					maxlength="50"
					required
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
				/>
			</div>

			<div>
				<label for="careerId" class="mb-2 block text-sm text-slate-300"> Carrera </label>

				<select
					id="careerId"
					name="careerId"
					required
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
				>
					<option value="">Seleccionar carrera...</option>

					{#each data.careers as career (career.id)}
						<option value={career.id}>{career.name}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-end">
				<button
					type="submit"
					class="w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950"
				>
					Crear plan
				</button>
			</div>
		</form>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<div class="border-b border-slate-800 px-6 py-5">
			<h2 class="text-lg font-semibold">Planes registrados</h2>
			<p class="mt-1 text-sm text-slate-400">{data.plans.length} planes</p>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full min-w-[900px]">
				<thead class="bg-slate-950/60">
					<tr class="text-left text-xs tracking-wide text-slate-400 uppercase">
						<th class="px-6 py-4">Código plan</th>
						<th class="px-6 py-4">Plan</th>
						<th class="px-6 py-4">Carrera</th>
						<th class="px-6 py-4">Estado</th>
						<th class="px-6 py-4 text-right">Acciones</th>
					</tr>
				</thead>

				<tbody class="divide-y divide-slate-800">
					{#each data.plans as plan (plan.id)}
						<tr class="hover:bg-slate-800/30">
							<td class="px-6 py-4">
								{#if plan.code}
									<span
										class="inline-flex rounded-full border border-indigo-700 bg-white px-3 py-1 text-sm font-semibold text-indigo-700"
									>
										{plan.code}
									</span>
								{:else}
									<span class="text-sm text-slate-500">Sin código</span>
								{/if}
							</td>

							<td class="px-6 py-4 font-semibold">
								{plan.name}
							</td>

							<td class="px-6 py-4 text-slate-300">
								{plan.career.name}
							</td>

							<td class="px-6 py-4">
								{#if plan.active}
									<span
										class="rounded-full border border-emerald-700 bg-white px-3 py-1 text-xs font-medium text-emerald-700"
									>
										Activo
									</span>
								{:else}
									<span
										class="rounded-full border border-slate-600 bg-white px-3 py-1 text-xs font-medium text-slate-700"
									>
										Inactivo
									</span>
								{/if}
							</td>

							<td class="px-6 py-4">
								<div class="flex flex-wrap justify-end gap-2">
									<details>
										<summary
											class="cursor-pointer list-none rounded-lg border border-blue-700 bg-white px-3 py-2 text-sm font-medium text-blue-700"
										>
											Editar
										</summary>

										<form
											method="POST"
											action="?/update"
											class="mt-2 flex gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3"
										>
											<input type="hidden" name="id" value={plan.id} />

											<input
												name="plan"
												value={plan.name}
												maxlength="50"
												required
												class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
											/>

											<button
												type="submit"
												class="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950"
											>
												Guardar
											</button>
										</form>
									</details>

									<form method="POST" action="?/toggle">
										<input type="hidden" name="id" value={plan.id} />

										<button
											type="submit"
											class="rounded-lg border border-amber-700 bg-white px-3 py-2 text-sm font-medium text-amber-700"
										>
											{plan.active ? 'Desactivar' : 'Activar'}
										</button>
									</form>

									<form method="POST" action="?/delete">
										<input type="hidden" name="id" value={plan.id} />

										<button
											type="submit"
											class="rounded-lg border border-red-700 bg-white px-3 py-2 text-sm font-medium text-red-700"
										>
											Eliminar
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>
