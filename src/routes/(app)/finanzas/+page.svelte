<script lang="ts">
	let { data } = $props();

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	function formatDecimal(value: any): number {
		if (typeof value === 'number') return value;
		if (value && typeof value.toNumber === 'function') return value.toNumber();
		return 0;
	}
</script>

<svelte:head>
	<title>Finanzas | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Gestión financiera institucional, morosidad y pagos" />
</svelte:head>

<div class="space-y-8">
	<section
		class="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Área financiera</p>
			<h1 class="mt-2 text-4xl font-bold tracking-tight">Gestión financiera</h1>
			<p class="mt-3 max-w-3xl text-sm text-slate-400">
				Control de deuda, pagos, becas, descuentos, bloqueo académico y morosidad institucional.
			</p>
		</div>

		<div class="flex flex-wrap gap-3">
			<a
				href="/finanzas/pagos/nuevo"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				+ Registrar pago
			</a>
			<a
				href="/finanzas/reportes"
				class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Ver reportes
			</a>
		</div>
	</section>

	<section class="grid gap-4 md:grid-cols-4">
		<a
			href="/finanzas/alumnos"
			class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-slate-500 hover:bg-slate-800/70"
		>
			<p class="text-sm text-slate-400">Alumnos con deuda</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.studentsWithDebt ?? 0}</h2>
			<p class="mt-2 text-sm text-slate-500">Con posible bloqueo académico</p>
		</a>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda total</p>
			<h2 class="mt-3 text-4xl font-bold">
				{currency.format(formatDecimal(data?.metrics?.totalDebt ?? 0))}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Saldo pendiente consolidado</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Pagos registrados</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.paymentsCount ?? 0}</h2>
			<p class="mt-2 text-sm text-slate-500">Movimientos cargados en el sistema</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Importe cobrado</p>
			<h2 class="mt-3 text-4xl font-bold">
				{currency.format(formatDecimal(data?.metrics?.totalCollected ?? 0))}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Ingresos registrados</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<p class="text-sm text-slate-400">
			Para ver reportes detallados por alumno, período o movimientos, utiliza las opciones de
			navegación.
		</p>
	</section>
</div>
