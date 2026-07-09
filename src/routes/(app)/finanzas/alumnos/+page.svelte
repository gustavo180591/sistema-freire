<script lang="ts">
	let { data } = $props();

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});
</script>

<svelte:head>
	<title>Alumnos con Deuda | Finanzas | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Lista de alumnos con deuda pendiente" />
</svelte:head>

<div class="space-y-8">
	<section
		class="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Finanzas</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Alumnos con deuda</h1>
			<p class="mt-3 max-w-3xl text-sm text-slate-400">
				Listado de alumnos con cargos pendientes de pago y posible bloqueo académico.
			</p>
		</div>

		<div class="flex flex-wrap gap-3">
			<a
				href="/finanzas"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Volver a finanzas
			</a>
		</div>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		{#if data.students.length === 0}
			<div class="p-12 text-center">
				<p class="text-slate-400">No hay alumnos con deuda pendiente.</p>
			</div>
		{:else}
			<table class="w-full text-left">
				<thead class="border-b border-slate-800 bg-slate-900">
					<tr>
						<th class="px-6 py-4 text-sm font-semibold">Alumno</th>
						<th class="px-6 py-4 text-sm font-semibold">DNI</th>
						<th class="px-6 py-4 text-sm font-semibold">Carrera</th>
						<th class="px-6 py-4 text-sm font-semibold">Sede</th>
						<th class="px-6 py-4 text-sm font-semibold">Deuda total</th>
						<th class="px-6 py-4 text-sm font-semibold">Cargos pendientes</th>
						<th class="px-6 py-4 text-sm font-semibold">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each data.students as student}
						<tr class="border-b border-slate-800 last:border-none">
							<td class="px-6 py-4 font-medium">{student.fullName}</td>
							<td class="px-6 py-4">{student.dni}</td>
							<td class="px-6 py-4">{student.career}</td>
							<td class="px-6 py-4">
								{#if student.location}
									<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
										{student.location}
									</span>
								{:else}
									<span class="text-slate-500">-</span>
								{/if}
							</td>
							<td class="px-6 py-4 font-semibold text-red-400">
								{currency.format(student.totalDebt)}
							</td>
							<td class="px-6 py-4">{student.pendingCharges}</td>
							<td class="px-6 py-4">
								<a
									href={`/alumnos/${student.id}/finanzas`}
									class="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold transition hover:border-slate-500"
								>
									Ver detalle
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
</div>
