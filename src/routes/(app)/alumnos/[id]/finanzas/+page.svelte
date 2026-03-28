<script lang="ts">
	let { data } = $props();

	const student = $derived(data.student);
	const metrics = $derived(data.metrics);
	const charges = $derived(data.charges);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});
</script>

<svelte:head>
	<title>Estado financiero | {student.fullName}</title>
	<meta name="description" content="Estado financiero consolidado del alumno" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Estado financiero</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">
			{student.fullName}
		</h1>
		<p class="mt-3 text-sm text-slate-400">
			DNI: {student.dni} · {student.career}
		</p>

		{#if metrics.blocked}
			<div
				class="mt-5 rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200"
			>
				⚠️ El alumno posee deuda pendiente. Las acciones académicas pueden estar bloqueadas.
			</div>
		{/if}
	</section>

	<!-- KPIs -->
	<section class="grid gap-4 md:grid-cols-4">
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda total</p>
			<h2 class="mt-3 text-4xl font-bold">
				{currency.format(metrics.totalDebt)}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Pagos realizados</p>
			<h2 class="mt-3 text-4xl font-bold">
				{currency.format(metrics.totalPaid)}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Cargos pendientes</p>
			<h2 class="mt-3 text-4xl font-bold">
				{metrics.pendingCharges}
			</h2>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Becas activas</p>
			<h2 class="mt-3 text-4xl font-bold">
				{metrics.activeScholarships}
			</h2>
		</div>
	</section>

	<!-- CTA -->
	<section class="flex flex-wrap gap-3">
		<a
			href={`/alumnos/${student.id}/historial`}
			class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
		>
			Ver historial académico
		</a>

		<a
			href={`/alumnos/${student.id}/certificados`}
			class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			Generar certificado
		</a>
	</section>

	<!-- Tabla financiera -->
	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Concepto</th>
					<th class="px-6 py-4 text-sm font-semibold">Período</th>
					<th class="px-6 py-4 text-sm font-semibold">Importe</th>
					<th class="px-6 py-4 text-sm font-semibold">Pagado</th>
					<th class="px-6 py-4 text-sm font-semibold">Pendiente</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
				</tr>
			</thead>
			<tbody>
				{#each charges as charge}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{charge.concept}</td>
						<td class="px-6 py-4">{charge.period}</td>
						<td class="px-6 py-4">
							{currency.format(charge.amount)}
						</td>
						<td class="px-6 py-4">
							{currency.format(charge.paid)}
						</td>
						<td class="px-6 py-4">
							{currency.format(charge.pending)}
						</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{charge.status}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
