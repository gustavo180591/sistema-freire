<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showDeleteModal = $state(false);
	let selectedCommission = $state<string | null>(null);

	const getStatusLabel = (active: boolean) => {
		return active
			? { label: 'Activa', color: 'bg-green-950/50 text-green-400' }
			: { label: 'Inactiva', color: 'bg-slate-950/50 text-slate-400' };
	};

	const initiateDelete = (commissionId: string) => {
		selectedCommission = commissionId;
		showDeleteModal = true;
	};

	const handleDelete = () => {
		showDeleteModal = false;
		selectedCommission = null;
	};

	// Watch for form submission result
	$effect(() => {
		if (form?.success) {
			invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>Gestión de Comisiones | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Administración</p>
				<h1 class="mt-2 text-3xl font-bold">Gestión de Comisiones</h1>
				<p class="mt-2 text-slate-400">
					{data.commissions.length} comisión{data.commissions.length !== 1 ? 'es' : ''}
				</p>
			</div>
			{#if data.canCreate}
				<a
					href="/comisiones/nueva"
					class="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Nueva Comisión
				</a>
			{/if}
		</div>
	</div>

	<!-- Success Message -->
	{#if form?.success}
		<div class="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-6">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-emerald-500/20 p-2">
					<svg
						class="h-6 w-6 text-emerald-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<p class="font-semibold text-emerald-400">{form.message}</p>
			</div>
		</div>
	{/if}

	<!-- Filters -->
	<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
		<form method="GET" class="grid gap-4 md:grid-cols-4">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Carrera</label>
				<select
					name="career"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todas</option>
					{#each data.careers as career}
						<option value={career.id} selected={data.filters.career === career.id}>
							{career.name}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Materia</label>
				<select
					name="subject"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todas</option>
					{#each data.subjects as subject}
						<option value={subject.id} selected={data.filters.subject === subject.id}>
							{subject.name}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Período</label>
				<select
					name="term"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todos</option>
					{#each data.terms as term}
						<option value={term.id} selected={data.filters.term === term.id}>
							{term.name}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Estado</label>
				<select
					name="active"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todos</option>
					<option value="true" selected={data.filters.active === 'true'}>Activas</option>
					<option value="false" selected={data.filters.active === 'false'}>Inactivas</option>
				</select>
			</div>
			<div class="flex items-end gap-2 md:col-span-4">
				<button
					type="submit"
					class="rounded-xl bg-indigo-500 px-6 py-2.5 font-medium text-white transition hover:bg-indigo-600"
				>
					Filtrar
				</button>
				<a
					href="/comisiones"
					class="rounded-xl border border-slate-700 px-6 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800"
				>
					Limpiar
				</a>
			</div>
		</form>
	</div>

	<!-- Commissions Table -->
	{#if data.commissions.length === 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
			<p class="text-lg text-slate-400">No hay comisiones con los filtros seleccionados</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
			<table class="w-full text-left">
				<thead class="border-b border-slate-800 bg-slate-950">
					<tr>
						<th class="px-6 py-4 text-sm font-semibold">Código</th>
						<th class="px-6 py-4 text-sm font-semibold">Materia</th>
						<th class="px-6 py-4 text-sm font-semibold">Carrera</th>
						<th class="px-6 py-4 text-sm font-semibold">Docente</th>
						<th class="px-6 py-4 text-sm font-semibold">Cupo</th>
						<th class="px-6 py-4 text-sm font-semibold">Estado</th>
						<th class="px-6 py-4 text-sm font-semibold">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each data.commissions as commission}
						{@const status = getStatusLabel(commission.active)}
						<tr class="border-b border-slate-800 last:border-none">
							<td class="px-6 py-4">
								<p class="font-medium">Comisión {commission.code}</p>
							</td>
							<td class="px-6 py-4">
								<p class="font-medium">{commission.subject.name}</p>
								<p class="text-sm text-slate-400">
									{commission.subject.code} · Año {commission.subject.yearLevel}
								</p>
							</td>
							<td class="px-6 py-4">
								{#if commission.career}
									<p class="font-medium">{commission.career.name}</p>
								{:else}
									<p class="text-slate-500">General</p>
								{/if}
							</td>
							<td class="px-6 py-4">
								{#if commission.teacher}
									<p class="font-medium">{commission.teacher.name}</p>
								{:else}
									<p class="text-slate-500">Sin asignar</p>
								{/if}
							</td>
							<td class="px-6 py-4">
								<p class="font-medium">{commission.currentEnrolled}/{commission.maxCapacity}</p>
								<p class="text-sm text-slate-400">{commission.enrollmentsCount} inscriptos</p>
							</td>
							<td class="px-6 py-4">
								<span class="rounded-full {status.color} px-3 py-1 text-xs">
									{status.label}
								</span>
							</td>
							<td class="px-6 py-4">
								<div class="flex gap-2">
									<a
										href="/comisiones/{commission.id}"
										class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800"
									>
										Ver
									</a>
									{#if data.canUpdate}
										<a
											href="/comisiones/{commission.id}/editar"
											class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800"
										>
											Editar
										</a>
									{/if}
									{#if data.canUpdate}
										<form method="POST" action="?/toggleActive" use:enhance>
											<input type="hidden" name="commissionId" value={commission.id} />
											<button
												type="submit"
												class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800"
											>
												{commission.active ? 'Desactivar' : 'Activar'}
											</button>
										</form>
									{/if}
									{#if data.canDelete && commission.enrollmentsCount === 0}
										<button
											onclick={() => initiateDelete(commission.id)}
											class="rounded-lg border border-red-900/50 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-950/30"
										>
											Eliminar
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Delete Modal -->
	{#if showDeleteModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
			<div class="mx-4 max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="text-xl font-bold">Eliminar Comisión</h2>
				<p class="mt-2 text-slate-400">
					¿Estás seguro de que querés eliminar esta comisión? Esta acción no se puede deshacer.
				</p>
				<div class="mt-6 flex gap-3">
					<button
						onclick={handleDelete}
						class="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					{#if selectedCommission}
						<form method="POST" action="?/delete" use:enhance onsubmit={handleDelete}>
							<input type="hidden" name="commissionId" value={selectedCommission} />
							<button
								type="submit"
								class="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition hover:bg-red-600"
							>
								Eliminar
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
