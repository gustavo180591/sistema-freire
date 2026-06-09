<script lang="ts">
	import { page } from '$app/stores';

	let { data } = $props();

	const payslips = $derived(data?.payslips ?? []);
	const teachers = $derived(data?.teachers ?? []);
	const years = $derived(data?.years ?? []);
	const isTeacher = $derived(data?.payslips.length > 0 && teachers.length === 0);
	const isAdmin = $derived(!isTeacher);

	// Estado de filtros
	let selectedTeacher = $state('');
	let selectedYear = $state('');
	let selectedMonth = $state('');
	let selectedStatus = $state('');

	// Inicializar filtros desde URL
	$effect(() => {
		const filters = data?.filters || {};
		selectedTeacher = filters.teacherId || '';
		selectedYear = filters.year || '';
		selectedMonth = filters.month || '';
		selectedStatus = filters.status || '';
	});

	const months = [
		{ value: '', label: 'Todos' },
		{ value: '1', label: 'Enero' },
		{ value: '2', label: 'Febrero' },
		{ value: '3', label: 'Marzo' },
		{ value: '4', label: 'Abril' },
		{ value: '5', label: 'Mayo' },
		{ value: '6', label: 'Junio' },
		{ value: '7', label: 'Julio' },
		{ value: '8', label: 'Agosto' },
		{ value: '9', label: 'Septiembre' },
		{ value: '10', label: 'Octubre' },
		{ value: '11', label: 'Noviembre' },
		{ value: '12', label: 'Diciembre' }
	];

	const statuses = [
		{ value: '', label: 'Todos' },
		{ value: 'PENDING', label: 'Pendiente' },
		{ value: 'PAID', label: 'Pagado' },
		{ value: 'CANCELLED', label: 'Cancelado' }
	];

	// Aplicar filtros
	const filteredPayslips = $derived(() => {
		return payslips.filter((slip) => {
			if (selectedTeacher && !slip.teacher.includes(selectedTeacher)) return false;
			if (selectedYear && !slip.period.includes(selectedYear)) return false;
			if (selectedMonth && !slip.period.startsWith(selectedMonth)) return false;
			if (selectedStatus && slip.status !== selectedStatus) return false;
			return true;
		});
	});

	// Actualizar URL cuando cambian los filtros
	$effect(() => {
		const params = new URLSearchParams();
		if (selectedTeacher) params.set('teacherId', selectedTeacher);
		if (selectedYear) params.set('year', selectedYear);
		if (selectedMonth) params.set('month', selectedMonth);
		if (selectedStatus) params.set('status', selectedStatus);
		const queryString = params.toString();
		$page.url.search = queryString;
	});

	function clearFilters() {
		selectedTeacher = '';
		selectedYear = '';
		selectedMonth = '';
		selectedStatus = '';
	}

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

		<div class="flex gap-3">
			<a
				href="/recibos/nuevo"
				class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
			>
				Cargar recibo
			</a>
			<a
				href="/reportes/recibos"
				class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Reporte consolidado
			</a>
		</div>
	</section>

	{#if !isTeacher}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Filtros</h3>
				<button onclick={clearFilters} class="text-sm text-indigo-400 hover:text-indigo-300">
					Limpiar filtros
				</button>
			</div>
			<div class="grid gap-4 md:grid-cols-4">
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Docente</label>
					<select
						bind:value={selectedTeacher}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition outline-none focus:border-indigo-500"
					>
						<option value="">Todos</option>
						{#each teachers as teacher}
							<option value={teacher.id}>
								{teacher.user.lastName}, {teacher.user.firstName}
							</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Año</label>
					<select
						bind:value={selectedYear}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition outline-none focus:border-indigo-500"
					>
						<option value="">Todos</option>
						{#each years as year}
							<option value={year}>{year}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Mes</label>
					<select
						bind:value={selectedMonth}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition outline-none focus:border-indigo-500"
					>
						{#each months as month}
							<option value={month.value}>{month.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-300">Estado</label>
					<select
						bind:value={selectedStatus}
						class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 transition outline-none focus:border-indigo-500"
					>
						{#each statuses as status}
							<option value={status.value}>{status.label}</option>
						{/each}
					</select>
				</div>
			</div>
		</section>
	{/if}

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
				{#each filteredPayslips() as slip}
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
							<div class="flex items-center justify-end gap-2">
								<a
									href={`/recibos/${slip.id}/download`}
									class="rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:border-slate-500"
								>
									Descargar PDF
								</a>
								{#if isAdmin}
									<a
										href={`/recibos/${slip.id}/editar`}
										class="rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:border-slate-500"
									>
										Editar
									</a>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
				{#if filteredPayslips().length === 0}
					<tr>
						<td colspan="5" class="px-6 py-8 text-center text-slate-400">
							No se encontraron recibos con los filtros seleccionados
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</section>
</div>
