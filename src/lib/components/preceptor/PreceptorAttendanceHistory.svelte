<script lang="ts">
	import { resolve } from '$app/paths';

	const NO_COMMISSION = '__NO_COMMISSION__';

	type SubjectOption = {
		id: string;
		code: string;
		name: string;
	};

	type CommissionOption = {
		id: string;
		code: string;
		subjectId: string;
		subjectName: string;
	};

	type LocationOption = {
		id: string;
		name: string;
	};

	type HistoryRecord = {
		id: string;
		date: Date;
		createdAt: Date;
		subjectId: string;
		subjectCode: string;
		subjectName: string;
		commissionId: string | null;
		commissionCode: string | null;
		locationId: string | null;
		locationName: string;
		totalStudents: number;
		presentStudents: number;
	};

	type HistoryData = {
		records: HistoryRecord[];
		pagination: {
			page: number;
			pageSize: number;
			totalCount: number;
			totalPages: number;
			hasPrev: boolean;
			hasNext: boolean;
		};
		filters: {
			q: string;
			subjectId: string | null;
			commissionId: string | null;
			locationId: string | null;
			dateFrom: string | null;
			dateTo: string | null;
			page: number;
			pageSize: number;
		};
		filterError: string | null;
	};

	let {
		history,
		subjects,
		commissions,
		locations
	}: {
		history: HistoryData;
		subjects: SubjectOption[];
		commissions: CommissionOption[];
		locations: LocationOption[];
	} = $props();

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString('es-AR', {
			timeZone: 'UTC',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function attendancePercent(record: HistoryRecord): number {
		if (record.totalStudents === 0) {
			return 0;
		}

		return Math.round((record.presentStudents / record.totalStudents) * 100);
	}
</script>

<section id="historial" class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
	<div class="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
		<div>
			<p class="text-xs tracking-[0.2em] text-slate-500 uppercase">Historial</p>

			<h2 class="mt-1 text-xl font-semibold">Registros de asistencia</h2>

			<p class="mt-1 text-sm text-slate-400">Consultá asistencias dentro de tus sedes asignadas.</p>
		</div>

		<div class="text-left md:text-right">
			<p class="text-xs text-slate-500">Resultados</p>
			<p class="text-2xl font-bold">
				{history.pagination.totalCount}
			</p>
		</div>
	</div>

	<form
		method="GET"
		action={resolve('/preceptor/asistencia') + '#historial'}
		class="mb-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
	>
		<div class="mb-4 flex items-center justify-between gap-3">
			<div>
				<h3 class="font-semibold">Filtros</h3>
				<p class="text-xs text-slate-500">Los filtros quedan guardados en la URL.</p>
			</div>

			<a
				href={resolve('/preceptor/asistencia')}
				class="text-sm text-slate-400 underline transition hover:text-white"
			>
				Limpiar
			</a>
		</div>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div>
				<label for="history-q" class="mb-2 block text-sm font-medium text-slate-300">
					Buscar
				</label>

				<input
					id="history-q"
					name="q"
					type="search"
					value={history.filters.q}
					maxlength="100"
					placeholder="Materia o comisión..."
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="history-subject" class="mb-2 block text-sm font-medium text-slate-300">
					Materia
				</label>

				<select
					id="history-subject"
					name="subjectId"
					value={history.filters.subjectId ?? ''}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm transition outline-none focus:border-slate-500"
				>
					<option value="">Todas</option>

					{#each subjects as subject (subject.id)}
						<option value={subject.id}>
							{subject.code} - {subject.name}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="history-commission" class="mb-2 block text-sm font-medium text-slate-300">
					Comisión
				</label>

				<select
					id="history-commission"
					name="commissionId"
					value={history.filters.commissionId ?? ''}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm transition outline-none focus:border-slate-500"
				>
					<option value="">Todas</option>
					<option value={NO_COMMISSION}>Sin comisión</option>

					{#each commissions as commission (commission.id)}
						<option value={commission.id}>
							{commission.code} · {commission.subjectName}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="history-location" class="mb-2 block text-sm font-medium text-slate-300">
					Sede
				</label>

				<select
					id="history-location"
					name="locationId"
					value={history.filters.locationId ?? ''}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm transition outline-none focus:border-slate-500"
				>
					<option value="">Todas mis sedes</option>

					{#each locations as location (location.id)}
						<option value={location.id}>{location.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="history-date-from" class="mb-2 block text-sm font-medium text-slate-300">
					Desde
				</label>

				<input
					id="history-date-from"
					name="dateFrom"
					type="date"
					value={history.filters.dateFrom ?? ''}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="history-date-to" class="mb-2 block text-sm font-medium text-slate-300">
					Hasta
				</label>

				<input
					id="history-date-to"
					name="dateTo"
					type="date"
					value={history.filters.dateTo ?? ''}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="history-page-size" class="mb-2 block text-sm font-medium text-slate-300">
					Por página
				</label>

				<select
					id="history-page-size"
					name="pageSize"
					value={history.pagination.pageSize.toString()}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm transition outline-none focus:border-slate-500"
				>
					<option value="10">10</option>
					<option value="20">20</option>
					<option value="50">50</option>
				</select>
			</div>

			<div class="flex items-end">
				<button
					type="submit"
					class="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
				>
					Aplicar filtros
				</button>
			</div>
		</div>
	</form>

	{#if history.filterError}
		<div class="mb-6 rounded-xl border border-amber-700 p-4 text-sm text-amber-600">
			{history.filterError}
		</div>
	{/if}

	{#if history.records.length > 0}
		<div class="hidden overflow-hidden rounded-2xl border border-slate-800 md:block">
			<table class="w-full text-left">
				<thead class="border-b border-slate-800 bg-slate-950">
					<tr>
						<th class="px-4 py-3 text-sm font-semibold">Fecha</th>
						<th class="px-4 py-3 text-sm font-semibold">Materia</th>
						<th class="px-4 py-3 text-sm font-semibold">Comisión</th>
						<th class="px-4 py-3 text-sm font-semibold">Sede</th>
						<th class="px-4 py-3 text-right text-sm font-semibold"> Presentes </th>
						<th class="px-4 py-3 text-right text-sm font-semibold"> Asistencia </th>
					</tr>
				</thead>

				<tbody>
					{#each history.records as record (record.id)}
						<tr class="border-b border-slate-800 last:border-none hover:bg-slate-800/40">
							<td class="px-4 py-4 text-sm whitespace-nowrap text-slate-300">
								{formatDate(record.date)}
							</td>

							<td class="px-4 py-4">
								<p class="font-medium text-white">
									{record.subjectName}
								</p>
								<p class="text-xs text-slate-500">
									{record.subjectCode}
								</p>
							</td>

							<td class="px-4 py-4 text-sm text-slate-300">
								{record.commissionCode ?? 'Sin comisión'}
							</td>

							<td class="px-4 py-4 text-sm text-slate-300">
								{record.locationName}
							</td>

							<td class="px-4 py-4 text-right text-sm text-slate-300">
								{record.presentStudents}/{record.totalStudents}
							</td>

							<td class="px-4 py-4 text-right">
								<span
									class="rounded-full border border-emerald-800/60 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-300"
								>
									{attendancePercent(record)}%
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="space-y-3 md:hidden">
			{#each history.records as record (record.id)}
				<article class="rounded-2xl border border-slate-800 bg-slate-950 p-4">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-xs text-slate-500">
								{formatDate(record.date)}
							</p>

							<h3 class="mt-1 font-semibold text-white">
								{record.subjectName}
							</h3>

							<p class="text-xs text-slate-500">
								{record.subjectCode}
							</p>
						</div>

						<span
							class="rounded-full border border-emerald-800/60 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-300"
						>
							{attendancePercent(record)}%
						</span>
					</div>

					<div class="mt-4 grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-xs text-slate-500">Comisión</p>
							<p class="mt-1 text-slate-300">
								{record.commissionCode ?? 'Sin comisión'}
							</p>
						</div>

						<div>
							<p class="text-xs text-slate-500">Sede</p>
							<p class="mt-1 text-slate-300">
								{record.locationName}
							</p>
						</div>

						<div>
							<p class="text-xs text-slate-500">Presentes</p>
							<p class="mt-1 text-slate-300">
								{record.presentStudents}/{record.totalStudents}
							</p>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center">
			<p class="font-medium text-slate-300">No se encontraron registros de asistencia.</p>

			<p class="mt-2 text-sm text-slate-500">Probá modificando o limpiando los filtros.</p>
		</div>
	{/if}

	{#if history.pagination.totalPages > 1}
		<form
			method="GET"
			action={resolve('/preceptor/asistencia') + '#historial'}
			class="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"
		>
			{#if history.filters.q}
				<input type="hidden" name="q" value={history.filters.q} />
			{/if}

			{#if history.filters.subjectId}
				<input type="hidden" name="subjectId" value={history.filters.subjectId} />
			{/if}

			{#if history.filters.commissionId}
				<input type="hidden" name="commissionId" value={history.filters.commissionId} />
			{/if}

			{#if history.filters.locationId}
				<input type="hidden" name="locationId" value={history.filters.locationId} />
			{/if}

			{#if history.filters.dateFrom}
				<input type="hidden" name="dateFrom" value={history.filters.dateFrom} />
			{/if}

			{#if history.filters.dateTo}
				<input type="hidden" name="dateTo" value={history.filters.dateTo} />
			{/if}

			<input type="hidden" name="pageSize" value={history.pagination.pageSize} />

			<button
				type="submit"
				name="page"
				value={(history.pagination.page - 1).toString()}
				disabled={!history.pagination.hasPrev}
				class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent"
			>
				← Anterior
			</button>

			<p class="text-center text-sm text-slate-400">
				Página {history.pagination.page} de
				{history.pagination.totalPages}
			</p>

			<button
				type="submit"
				name="page"
				value={(history.pagination.page + 1).toString()}
				disabled={!history.pagination.hasNext}
				class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent"
			>
				Siguiente →
			</button>
		</form>
	{/if}
</section>
