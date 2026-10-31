<script lang="ts">
	import { untrack } from 'svelte';

	let { data } = $props();
	const initialFilters = untrack(() => data.filters);

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	function formatConceptLabel(value: string | null | undefined): string {
		if (!value) return '—';

		const labels: Record<string, string> = {
			CUOTA_MENSUAL: 'Cuota mensual',
			INSCRIPCION: 'Inscripción'
		};

		const normalized = value.trim().toUpperCase();

		if (labels[normalized]) {
			return labels[normalized];
		}

		const readable = value.replaceAll('_', ' ').toLowerCase();

		return readable.charAt(0).toUpperCase() + readable.slice(1);
	}

	const formatDate = (date: Date | undefined) => {
		if (!date) return '-';
		return new Date(date).toLocaleDateString('es-AR');
	};

	// Filter state - initialize from server data
	let search = $state(initialFilters.search || '');
	let careerId = $state(initialFilters.careerId || '');
	let locationId = $state(initialFilters.locationId || '');
	let studentType = $state(initialFilters.studentType || '');
	let financialStatus = $state(initialFilters.financialStatus || '');
	let academicStatus = $state(initialFilters.academicStatus || '');
	let conceptCode = $state(initialFilters.conceptCode || '');
	let periodFrom = $state(initialFilters.periodFrom || '');
	let periodTo = $state(initialFilters.periodTo || '');
	let minDebt = $state(initialFilters.minDebt?.toString() || '');
	let maxDebt = $state(initialFilters.maxDebt?.toString() || '');
	let overdueCharges = $state(initialFilters.overdueCharges || '');
	let pageSize = $state(initialFilters.pageSize || 25);
	let sortBy = $state(initialFilters.sortBy || '');

	function buildUrl() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (careerId) params.set('careerId', careerId);
		if (locationId) params.set('locationId', locationId);
		if (studentType) params.set('studentType', studentType);
		if (financialStatus) params.set('financialStatus', financialStatus);
		if (academicStatus) params.set('academicStatus', academicStatus);
		if (conceptCode) params.set('conceptCode', conceptCode);
		if (periodFrom) params.set('periodFrom', periodFrom);
		if (periodTo) params.set('periodTo', periodTo);
		if (minDebt) params.set('minDebt', minDebt);
		if (maxDebt) params.set('maxDebt', maxDebt);
		if (overdueCharges) params.set('overdueCharges', overdueCharges);
		if (pageSize) params.set('pageSize', pageSize.toString());
		if (sortBy) params.set('sortBy', sortBy);
		params.set('page', '1');
		return `?${params.toString()}`;
	}

	function applyFilters() {
		window.location.href = buildUrl();
	}

	function clearFilters() {
		window.location.href = '/finanzas/alumnos';
	}

	function goToPage(page: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', page.toString());
		window.location.href = `?${params.toString()}`;
	}

	function changeSort(newSortBy: string) {
		sortBy = newSortBy === sortBy ? '' : newSortBy;
		const params = new URLSearchParams(window.location.search);
		if (sortBy) params.set('sortBy', sortBy);
		else params.delete('sortBy');
		params.set('page', '1');
		window.location.href = `?${params.toString()}`;
	}
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

	<!-- Summary -->
	<section class="grid gap-4 md:grid-cols-3">
		<div
			class="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-6 transition hover:border-sky-500/40"
		>
			<p class="text-sm font-medium text-sky-300">Total alumnos</p>
			<h2 class="mt-3 text-4xl font-bold text-white">{data.total}</h2>
			<p class="mt-2 text-sm text-slate-500">Resultados encontrados</p>
		</div>

		<div
			class="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 transition hover:border-amber-500/40"
		>
			<p class="text-sm font-medium text-amber-300">Deuda total</p>
			<h2 class="mt-3 text-4xl font-bold text-white">
				{currency.format(data.summary.totalDebt)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Saldo pendiente consolidado</p>
		</div>

		<div
			class="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 transition hover:border-red-500/40"
		>
			<p class="text-sm font-medium text-red-300">Deuda vencida</p>
			<h2 class="mt-3 text-4xl font-bold text-red-400">
				{currency.format(data.summary.totalOverdueDebt)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Pagos fuera de término</p>
		</div>
	</section>

	<!-- Filters -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
		<div class="mb-5">
			<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
				Búsqueda avanzada
			</p>
			<h3 class="mt-1 text-xl font-bold text-white">Filtros</h3>
			<p class="mt-1 text-sm text-slate-500">
				Filtrá alumnos por carrera, sede, tipo y situación financiera.
			</p>
		</div>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div>
				<label for="search" class="mb-2 block text-sm font-medium text-slate-300">Buscar</label>
				<input
					id="search"
					type="text"
					bind:value={search}
					placeholder="Nombre, DNI, email..."
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				/>
			</div>

			<div>
				<label for="career" class="mb-2 block text-sm font-medium text-slate-300">Carrera</label>
				<select
					id="career"
					bind:value={careerId}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="">Todas</option>
					{#each data.filterOptions.careers as career}
						<option value={career.id}>{career.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="location" class="mb-2 block text-sm font-medium text-slate-300">Sede</label>
				<select
					id="location"
					bind:value={locationId}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="">Todas</option>
					{#each data.filterOptions.locations as location}
						<option value={location.id}>{location.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="studentType" class="mb-2 block text-sm font-medium text-slate-300"
					>Tipo de alumno</label
				>
				<select
					id="studentType"
					bind:value={studentType}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="">Todos</option>
					<option value="NORMAL">Normal</option>
					<option value="BECADO">Becado</option>
					<option value="RECURSANT">Recursante</option>
				</select>
			</div>

			<div>
				<label for="financialStatus" class="mb-2 block text-sm font-medium text-slate-300"
					>Estado financiero</label
				>
				<select
					id="financialStatus"
					bind:value={financialStatus}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="">Todos</option>
					<option value="with_debt">Con deuda</option>
					<option value="overdue">Deuda vencida</option>
					<option value="not_overdue">Deuda no vencida</option>
					<option value="blocked">Bloqueado</option>
					<option value="not_blocked">No bloqueado</option>
				</select>
			</div>

			<div>
				<label for="academicStatus" class="mb-2 block text-sm font-medium text-slate-300"
					>Estado académico</label
				>
				<select
					id="academicStatus"
					bind:value={academicStatus}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="">Todos</option>
					<option value="ACTIVE">Activo</option>
					<option value="INACTIVE">Inactivo</option>
					<option value="SUSPENDED">Suspendido</option>
					<option value="GRADUATED">Graduado</option>
				</select>
			</div>

			<div>
				<label for="concept" class="mb-2 block text-sm font-medium text-slate-300">Concepto</label>
				<select
					id="concept"
					bind:value={conceptCode}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="">Todos</option>
					{#each data.filterOptions.concepts as concept}
						<option value={concept.code}>
							{formatConceptLabel(concept.name || concept.code)}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="overdueCharges" class="mb-2 block text-sm font-medium text-slate-300"
					>Cuotas vencidas</label
				>
				<select
					id="overdueCharges"
					bind:value={overdueCharges}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="">Todas</option>
					<option value="1_or_more">1 o más</option>
					<option value="2_or_more">2 o más</option>
					<option value="3_or_more">3 o más</option>
				</select>
			</div>

			<div>
				<label for="periodFrom" class="mb-2 block text-sm font-medium text-slate-300"
					>Período desde</label
				>
				<input
					id="periodFrom"
					type="text"
					bind:value={periodFrom}
					placeholder="Ej: 2026-01"
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				/>
			</div>

			<div>
				<label for="periodTo" class="mb-2 block text-sm font-medium text-slate-300"
					>Período hasta</label
				>
				<input
					id="periodTo"
					type="text"
					bind:value={periodTo}
					placeholder="Ej: 2026-12"
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				/>
			</div>

			<div>
				<label for="minDebt" class="mb-2 block text-sm font-medium text-slate-300"
					>Deuda mínima</label
				>
				<input
					id="minDebt"
					type="number"
					bind:value={minDebt}
					placeholder="0"
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				/>
			</div>

			<div>
				<label for="maxDebt" class="mb-2 block text-sm font-medium text-slate-300"
					>Deuda máxima</label
				>
				<input
					id="maxDebt"
					type="number"
					bind:value={maxDebt}
					placeholder="Sin límite"
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				/>
			</div>

			<div>
				<label for="pageSize" class="mb-2 block text-sm font-medium text-slate-300"
					>Resultados por página</label
				>
				<select
					id="pageSize"
					bind:value={pageSize}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="10">10</option>
					<option value="25">25</option>
					<option value="50">50</option>
					<option value="100">100</option>
				</select>
			</div>

			<div>
				<label for="sortBy" class="mb-2 block text-sm font-medium text-slate-300">Ordenar por</label
				>
				<select
					id="sortBy"
					bind:value={sortBy}
					class="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white transition outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30"
				>
					<option value="">Nombre (A-Z)</option>
					<option value="debt_desc">Mayor deuda</option>
					<option value="debt_asc">Menor deuda</option>
					<option value="overdue_desc">Mayor deuda vencida</option>
					<option value="career_asc">Carrera (A-Z)</option>
					<option value="location_asc">Sede (A-Z)</option>
					<option value="oldest_due_date">Vencimiento más antiguo</option>
				</select>
			</div>
		</div>

		<div class="mt-6 flex gap-3">
			<button
				onclick={applyFilters}
				class="cursor-pointer rounded-2xl border border-indigo-500 bg-indigo-500/10 px-6 py-3 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
			>
				Aplicar filtros
			</button>
			<button
				onclick={clearFilters}
				class="cursor-pointer rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800/50 hover:text-white"
			>
				Limpiar filtros
			</button>
		</div>
	</section>

	<!-- Table -->
	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-sm">
		{#if data.students.length === 0}
			<div class="p-12 text-center">
				<p class="text-slate-400">No hay alumnos con deuda pendiente con los filtros actuales.</p>
			</div>
		{:else}
			<div
				class="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div>
					<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Resultados</p>
					<h3 class="mt-1 text-lg font-bold text-white">Alumnos encontrados</h3>
				</div>

				<span
					class="w-fit rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-400"
				>
					{data.students.length}
					{data.students.length === 1 ? 'alumno' : 'alumnos'}
				</span>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[1400px] text-left text-sm whitespace-nowrap">
					<thead class="border-b border-slate-800 bg-slate-950/60">
						<tr>
							<th class="px-3 py-3 text-sm font-semibold">Alumno</th>
							<th class="px-3 py-3 text-sm font-semibold">DNI</th>
							<th class="px-3 py-3 text-sm font-semibold">Carrera</th>
							<th class="px-3 py-3 text-sm font-semibold">Sede</th>
							<th class="px-3 py-3 text-sm font-semibold">Año</th>
							<th class="px-3 py-3 text-sm font-semibold">Tipo</th>
							<th class="px-3 py-3 text-sm font-semibold">Deuda total</th>
							<th class="px-3 py-3 text-sm font-semibold">Deuda vencida</th>
							<th class="px-3 py-3 text-sm font-semibold">Cargos</th>
							<th class="px-3 py-3 text-sm font-semibold">Vencidas</th>
							<th class="px-3 py-3 text-sm font-semibold">Vencimiento</th>
							<th class="px-3 py-3 text-sm font-semibold">Estado</th>
							<th class="px-3 py-3 text-sm font-semibold">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each data.students as student}
							<tr
								class="border-b border-slate-800 transition last:border-none hover:bg-slate-800/35"
							>
								<td class="px-3 py-3 font-semibold text-slate-100">
									{student.firstName}
									{student.lastName}
								</td>
								<td class="px-3 py-3">{student.dni}</td>
								<td
									class="max-w-[260px] truncate px-3 py-3 text-slate-300"
									title={student.careerName || '-'}
								>
									{student.careerName || '-'}
								</td>
								<td class="px-3 py-3">{student.locationName || '-'}</td>
								<td class="px-3 py-3">{student.currentYear || '-'}</td>
								<td class="px-3 py-3">
									{#if student.isBecado}
										<span
											class="rounded-full border border-emerald-600 bg-emerald-950/20 px-2 py-1 text-xs text-emerald-400"
										>
											Becado
										</span>
									{:else if student.isRecursante}
										<span
											class="rounded-full border border-orange-600 bg-orange-950/20 px-2 py-1 text-xs text-orange-400"
										>
											Recursante
										</span>
									{:else}
										<span
											class="rounded-full border border-slate-600 bg-slate-950/20 px-2 py-1 text-xs text-slate-400"
										>
											Normal
										</span>
									{/if}
								</td>
								<td class="px-3 py-3 text-right font-bold text-amber-300">
									{currency.format(student.totalDebt)}
								</td>
								<td class="px-3 py-3 text-right">
									{#if student.overdueDebt > 0}
										<span class="font-semibold text-red-400">
											{currency.format(student.overdueDebt)}
										</span>
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								</td>
								<td class="px-3 py-3 text-center font-semibold">{student.pendingCharges}</td>
								<td class="px-3 py-3 text-center">
									{#if student.overdueCharges > 0}
										<span class="font-semibold text-red-400">{student.overdueCharges}</span>
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								</td>
								<td class="px-3 py-3">{formatDate(student.oldestDueDate)}</td>
								<td class="px-3 py-3">
									{#if student.isBlocked}
										<span
											class="rounded-full border border-red-600 bg-red-950/20 px-2 py-1 text-xs text-red-400"
										>
											Bloqueado
										</span>
									{:else}
										<span
											class="rounded-full border border-emerald-600 bg-emerald-950/20 px-2 py-1 text-xs text-emerald-400"
										>
											Al día
										</span>
									{/if}
								</td>
								<td class="px-3 py-3">
									<div class="flex flex-nowrap items-center gap-2">
										<a
											href={`/alumnos/${student.id}/finanzas`}
											class="rounded-xl border border-sky-500/50 bg-sky-500/5 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/10"
										>
											Ver finanzas
										</a>
										<a
											href={`/finanzas/pagos/nuevo?studentId=${student.id}`}
											class="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20"
										>
											Pagar
										</a>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<section
			class="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/70 p-6"
		>
			<p class="text-sm text-slate-400">
				Página {data.page} de {data.totalPages} ({data.total} resultados)
			</p>
			<div class="flex gap-2">
				<button
					disabled={data.page === 1}
					onclick={() => goToPage(data.page - 1)}
					class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-slate-500 disabled:opacity-50 disabled:hover:border-slate-700"
				>
					Anterior
				</button>
				<button
					disabled={data.page === data.totalPages}
					onclick={() => goToPage(data.page + 1)}
					class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-slate-500 disabled:opacity-50 disabled:hover:border-slate-700"
				>
					Siguiente
				</button>
			</div>
		</section>
	{/if}
</div>
