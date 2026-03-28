<script lang="ts">
	let { data } = $props();

	const rows = $derived(data?.rows ?? []);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});
</script>

<svelte:head>
	<title>Reporte financiero | Instituto Paulo Freire</title>
	<meta name="description" content="Reporte institucional de deuda, cobranza y morosidad" />
</svelte:head>

<div class="space-y-8">
	<section
		class="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 lg:flex-row lg:items-center lg:justify-between"
	>
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Reportes · Financiero</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Reporte financiero de morosidad</h1>
			<p class="mt-3 max-w-3xl text-sm text-slate-400">
				Consolidado institucional de deuda pendiente, pagos registrados, becas y alumnos bloqueados.
			</p>
		</div>

		<div class="flex gap-3">
			<a
				href="/reportes/financiero/export.xlsx"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Exportar Excel
			</a>
			<a
				href="/reportes/financiero/export.pdf"
				class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Exportar PDF
			</a>
		</div>
	</section>

	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Alumnos con deuda</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.studentsWithDebt ?? 0}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda total</p>
			<h2 class="mt-3 text-4xl font-bold">{currency.format(data?.metrics?.totalDebt ?? 0)}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Pagos registrados</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.paymentsCount ?? 0}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Importe cobrado</p>
			<h2 class="mt-3 text-4xl font-bold">{currency.format(data?.metrics?.totalCollected ?? 0)}</h2>
		</div>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Alumno</th>
					<th class="px-6 py-4 text-sm font-semibold">Carrera</th>
					<th class="px-6 py-4 text-sm font-semibold">Período</th>
					<th class="px-6 py-4 text-sm font-semibold">Concepto</th>
					<th class="px-6 py-4 text-sm font-semibold">Pendiente</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{row.student}</td>
						<td class="px-6 py-4">{row.career}</td>
						<td class="px-6 py-4">{row.periodLabel}</td>
						<td class="px-6 py-4">{row.concept}</td>
						<td class="px-6 py-4 font-medium">{currency.format(row.pending)}</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{row.pending > 0 ? 'Bloqueado' : 'Al día'}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
