<script lang="ts">
	let { data, form } = $props();

	const student = $derived(data.student);
	const metrics = $derived(data.metrics);
	const charges = $derived(data.charges);

	let showSuccess = $state(false);
	let successOpacity = $state(1);

	// Mostrar mensaje de éxito cuando hay form.success
	$effect(() => {
		if (form?.success) {
			showSuccess = true;
			successOpacity = 1;

			// Desvanecer después de 5 segundos
			const fadeTimer = setTimeout(() => {
				successOpacity = 0;
			}, 5000);

			// Ocultar después de la animación de desvanecimiento
			const hideTimer = setTimeout(() => {
				showSuccess = false;
			}, 5500);

			return () => {
				clearTimeout(fadeTimer);
				clearTimeout(hideTimer);
			};
		}
	});

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	const statusTranslations: Record<string, string> = {
		PENDING: 'Pendiente',
		PAID: 'Pagado',
		OVERDUE: 'Vencido',
		CANCELLED: 'Cancelado',
		PARTIALLY_PAID: 'Parcialmente pagado'
	};

	const translateStatus = (status: string) => statusTranslations[status] || status;
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
			<div class="mt-5 rounded-2xl border border-red-600 bg-white px-4 py-3 text-sm text-red-600">
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
			<p class="text-sm text-slate-400">Estado de beca</p>
			<h2 class="mt-3 text-4xl font-bold">
				{student.isBecado ? 'Becado' : 'Sin beca'}
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

		<form method="POST" action="?/recalculateCharges">
			<button
				type="submit"
				class="cursor-pointer rounded-2xl border border-indigo-700 bg-indigo-950/50 px-5 py-3 text-sm font-semibold text-indigo-300 transition hover:border-indigo-500 hover:bg-indigo-950 hover:shadow-lg"
			>
				Recalcular cargos pendientes
			</button>
		</form>
	</section>

	{#if showSuccess}
		<div
			class="rounded-2xl border border-green-600 bg-green-950/30 px-4 py-3 text-sm text-black transition-opacity duration-500"
			style="opacity: {successOpacity}"
		>
			✓ Cargos recalculados: {form?.updatedCount} actualizados, {form?.skippedCount} omitidos
		</div>
	{/if}

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
					<th class="px-6 py-4 text-sm font-semibold">Tipo de cuota</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
					<th class="px-6 py-4 text-sm font-semibold">Vencimiento</th>
					<th class="px-6 py-4 text-sm font-semibold">Acción</th>
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
							{#if charge.scholarshipLost}
								<span
									class="rounded-full border border-red-600 bg-red-950/30 px-3 py-1 text-xs text-red-400"
								>
									Beca perdida
								</span>
								<div class="mt-1 text-xs text-slate-500">
									Beneficio perdido por pago fuera de término
								</div>
							{:else}
								<span class="text-slate-400">{charge.chargeType}</span>
							{/if}
						</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{translateStatus(charge.status)}
							</span>
						</td>
						<td class="px-6 py-4">
							{#if charge.conceptCode === 'CUOTA_MENSUAL' && charge.dueDate}
								{#if charge.isOverdue}
									<span
										class="rounded-full border border-red-600 bg-red-950/30 px-3 py-1 text-xs text-red-400"
									>
										Vencida
									</span>
								{:else}
									<span
										class="rounded-full border border-emerald-600 bg-white px-3 py-1 text-xs text-black"
									>
										Al día
									</span>
								{/if}
							{:else}
								<span class="text-xs text-slate-500">-</span>
							{/if}
						</td>
						<td class="px-6 py-4">
							<a
								href={`/finanzas/pagos/nuevo?studentId=${student.id}`}
								class="text-sm text-indigo-400 hover:text-indigo-300"
							>
								Registrar pago
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
