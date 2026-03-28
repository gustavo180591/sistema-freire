<script lang="ts">
	let { data } = $props();

	const financeRows = $derived(
		data?.financeRows ?? [
			{
				id: '1',
				student: 'Ana Rodríguez',
				career: 'Profesorado de Educación Inicial',
				period: 'Marzo 2026',
				debt: 18500,
				status: 'Con deuda'
			},
			{
				id: '2',
				student: 'Lucas Benítez',
				career: 'Profesorado de Matemática',
				period: 'Marzo 2026',
				debt: 0,
				status: 'Al día'
			}
		]
	);

	let search = $state('');

	const filtered = $derived(
		financeRows.filter((row) => {
			const q = search.toLowerCase();
			return (
				row.student.toLowerCase().includes(q) ||
				row.career.toLowerCase().includes(q) ||
				row.period.toLowerCase().includes(q) ||
				row.status.toLowerCase().includes(q)
			);
		})
	);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});
</script>

<svelte:head>
	<title>Finanzas | Instituto Paulo Freire</title>
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
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Alumnos con deuda</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.studentsWithDebt ?? 0}</h2>
			<p class="mt-2 text-sm text-slate-500">Con posible bloqueo académico</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda total</p>
			<h2 class="mt-3 text-4xl font-bold">{currency.format(data?.metrics?.totalDebt ?? 0)}</h2>
			<p class="mt-2 text-sm text-slate-500">Saldo pendiente consolidado</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Pagos registrados</p>
			<h2 class="mt-3 text-4xl font-bold">{data?.metrics?.paymentsCount ?? 0}</h2>
			<p class="mt-2 text-sm text-slate-500">Movimientos cargados en el sistema</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Importe cobrado</p>
			<h2 class="mt-3 text-4xl font-bold">{currency.format(data?.metrics?.totalCollected ?? 0)}</h2>
			<p class="mt-2 text-sm text-slate-500">Ingresos registrados</p>
		</div>
	</section>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<input
			bind:value={search}
			type="text"
			placeholder="Buscar por alumno, carrera, período o estado"
			class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
		/>
	</section>

	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Alumno</th>
					<th class="px-6 py-4 text-sm font-semibold">Carrera</th>
					<th class="px-6 py-4 text-sm font-semibold">Período</th>
					<th class="px-6 py-4 text-sm font-semibold">Deuda</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
					<th class="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as row}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{row.student}</td>
						<td class="px-6 py-4">{row.career}</td>
						<td class="px-6 py-4 text-slate-300">{row.period}</td>
						<td class="px-6 py-4 font-medium">{currency.format(row.debt)}</td>
						<td class="px-6 py-4">
							<span class="rounded-full border border-slate-700 px-3 py-1 text-xs">
								{row.status}
							</span>
						</td>
						<td class="px-6 py-4 text-right">
							<a
								href={`/finanzas/${row.id}`}
								class="rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:border-slate-500"
							>
								Ver detalle
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
