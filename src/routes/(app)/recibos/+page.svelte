<script lang="ts">
	let { data } = $props();

	const payslips = $derived(data?.payslips ?? []);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});
</script>

<svelte:head>
	<title>Recibos docentes | Instituto Paulo Freire</title>
	<meta name="description" content="Consulta y descarga de recibos de sueldo docentes" />
</svelte:head>

<div class="space-y-8">
	<section
		class="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 lg:flex-row lg:items-center lg:justify-between"
	>
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Docentes · Haberes</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Recibos de sueldo</h1>
			<p class="mt-3 max-w-3xl text-sm text-slate-400">
				Consulta histórica de haberes por período, estado y descarga segura en PDF con trazabilidad.
			</p>
		</div>

		<a
			href="/reportes/recibos"
			class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Reporte consolidado
		</a>
	</section>

	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Recibos disponibles</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.total ?? 0}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Pagados</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.paid ?? 0}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Pendientes</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.pending ?? 0}</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Importe total</p>
			<h2 class="mt-3 text-4xl font-bold">{currency.format(data?.metrics?.totalAmount ?? 0)}</h2>
		</div>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Período</th>
					<th class="px-6 py-4 text-sm font-semibold">Docente</th>
					<th class="px-6 py-4 text-sm font-semibold">Importe</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
					<th class="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each payslips as slip}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{slip.period}</td>
						<td class="px-6 py-4">{slip.teacher}</td>
						<td class="px-6 py-4">{currency.format(slip.amount)}</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{slip.status}
							</span>
						</td>
						<td class="px-6 py-4 text-right">
							<a
								href={`/recibos/${slip.id}/download`}
								class="rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:border-slate-500"
							>
								Descargar PDF
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
