<script lang="ts">
	let { data } = $props();

	const currency = new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		maximumFractionDigits: 0
	});

	const formatDate = (date: Date | undefined) => {
		if (!date) return '-';
		return new Date(date).toLocaleDateString('es-AR');
	};

	// Filter state - initialize from server data
	let search = $state(data.filters.search || '');
	let careerId = $state(data.filters.careerId || '');
	let locationId = $state(data.filters.locationId || '');
	let studentType = $state(data.filters.studentType || '');
	let financialStatus = $state(data.filters.financialStatus || '');
	let academicStatus = $state(data.filters.academicStatus || '');
	let conceptCode = $state(data.filters.conceptCode || '');
	let periodFrom = $state(data.filters.periodFrom || '');
	let periodTo = $state(data.filters.periodTo || '');
	let minDebt = $state(data.filters.minDebt?.toString() || '');
	let maxDebt = $state(data.filters.maxDebt?.toString() || '');
	let overdueCharges = $state(data.filters.overdueCharges || '');
	let pageSize = $state(data.filters.pageSize || 25);
	let sortBy = $state(data.filters.sortBy || '');

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
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total alumnos</p>
			<h2 class="mt-3 text-4xl font-bold">{data.total}</h2>
			<p class="mt-2 text-sm text-slate-500">Resultados encontrados</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda total</p>
			<h2 class="mt-3 text-4xl font-bold">{currency.format(data.summary.totalDebt)}</h2>
			<p class="mt-2 text-sm text-slate-500">Saldo pendiente consolidado</p>
		</div>

		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Deuda vencida</p>
			<h2 class="mt-3 text-4xl font-bold text-red-400">
				{currency.format(data.summary.totalOverdueDebt)}
			</h2>
			<p class="mt-2 text-sm text-slate-500">Pagos fuera de término</p>
		</div>
	</section>

	<!-- Filters -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h3 class="mb-4 text-lg font-semibold">Filtros</h3>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div>
				<label for="search" class="mb-2 block text-sm font-medium text-slate-300">Buscar</label>
				<input
					id="search"
					type="text"
					bind:value={search}
					placeholder="Nombre, DNI, email..."
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
				/>
			</div>

			<div>
				<label for="career" class="mb-2 block text-sm font-medium text-slate-300">Carrera</label>
				<select
					id="career"
					bind:value={careerId}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
				>
					<option value="">Todos</option>
					{#each data.filterOptions.concepts as concept}
						<option value={concept.code}>{concept.name}</option>
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
				/>
			</div>

			<div>
				<label for="pageSize" class="mb-2 block text-sm font-medium text-slate-300"
					>Resultados por página</label
				>
				<select
					id="pageSize"
					bind:value={pageSize}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
				class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Aplicar filtros
			</button>
			<button
				onclick={clearFilters}
				class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Limpiar filtros
			</button>
		</div>
	</section>

	<!-- Table -->
	<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		{#if data.students.length === 0}
			<div class="p-12 text-center">
				<p class="text-slate-400">No hay alumnos con deuda pendiente con los filtros actuales.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left">
					<thead class="border-b border-slate-800 bg-slate-900">
						<tr>
							<th class="px-4 py-4 text-sm font-semibold">Alumno</th>
							<th class="px-4 py-4 text-sm font-semibold">DNI</th>
							<th class="px-4 py-4 text-sm font-semibold">Carrera</th>
							<th class="px-4 py-4 text-sm font-semibold">Sede</th>
							<th class="px-4 py-4 text-sm font-semibold">Año</th>
							<th class="px-4 py-4 text-sm font-semibold">Tipo</th>
							<th class="px-4 py-4 text-sm font-semibold">Deuda total</th>
							<th class="px-4 py-4 text-sm font-semibold">Deuda vencida</th>
							<th class="px-4 py-4 text-sm font-semibold">Cargos</th>
							<th class="px-4 py-4 text-sm font-semibold">Vencidas</th>
							<th class="px-4 py-4 text-sm font-semibold">Vencimiento</th>
							<th class="px-4 py-4 text-sm font-semibold">Estado</th>
							<th class="px-4 py-4 text-sm font-semibold">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each data.students as student}
							<tr class="border-b border-slate-800 last:border-none">
								<td class="px-4 py-4 font-medium">
									{student.firstName}
									{student.lastName}
								</td>
								<td class="px-4 py-4">{student.dni}</td>
								<td class="px-4 py-4">{student.careerName || '-'}</td>
								<td class="px-4 py-4">{student.locationName || '-'}</td>
								<td class="px-4 py-4">{student.currentYear || '-'}</td>
								<td class="px-4 py-4">
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
								<td class="px-4 py-4 font-semibold">
									{currency.format(student.totalDebt)}
								</td>
								<td class="px-4 py-4">
									{#if student.overdueDebt > 0}
										<span class="font-semibold text-red-400">
											{currency.format(student.overdueDebt)}
										</span>
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								</td>
								<td class="px-4 py-4">{student.pendingCharges}</td>
								<td class="px-4 py-4">
									{#if student.overdueCharges > 0}
										<span class="font-semibold text-red-400">{student.overdueCharges}</span>
									{:else}
										<span class="text-slate-500">-</span>
									{/if}
								</td>
								<td class="px-4 py-4">{formatDate(student.oldestDueDate)}</td>
								<td class="px-4 py-4">
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
								<td class="px-4 py-4">
									<div class="flex gap-2">
										<a
											href={`/alumnos/${student.id}/finanzas`}
											class="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold transition hover:border-slate-500"
										>
											Ver finanzas
										</a>
										<a
											href={`/finanzas/pagos/nuevo?studentId=${student.id}`}
											class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
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
