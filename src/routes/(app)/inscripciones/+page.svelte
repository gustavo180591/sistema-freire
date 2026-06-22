<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showRejectModal = $state(false);
	let showCancelModal = $state(false);
	let selectedEnrollment = $state<string | null>(null);
	let rejectReason = $state('');

	const getStatusLabel = (status: string) => {
		const labels: Record<string, { label: string; color: string }> = {
			PENDING: { label: 'Pendiente', color: 'bg-amber-950/50 text-amber-400' },
			ACTIVE: { label: 'Activa', color: 'bg-green-950/50 text-green-400' },
			REJECTED: { label: 'Rechazada', color: 'bg-red-950/50 text-red-400' },
			CANCELLED: { label: 'Cancelada', color: 'bg-slate-950/50 text-slate-400' }
		};
		return labels[status] || { label: status, color: 'bg-slate-950/50 text-slate-400' };
	};

	const initiateReject = (enrollmentId: string) => {
		selectedEnrollment = enrollmentId;
		rejectReason = '';
		showRejectModal = true;
	};

	const initiateCancel = (enrollmentId: string) => {
		selectedEnrollment = enrollmentId;
		showCancelModal = true;
	};

	const handleReject = () => {
		showRejectModal = false;
		selectedEnrollment = null;
		rejectReason = '';
	};

	const handleCancel = () => {
		showCancelModal = false;
		selectedEnrollment = null;
	};

	// Watch for form submission result
	$effect(() => {
		if (form?.success) {
			invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>Gestión de Inscripciones | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Administración</p>
				<h1 class="mt-2 text-3xl font-bold">Gestión de Inscripciones</h1>
				<p class="mt-2 text-slate-400">
					{data.enrollments.length} inscripción{data.enrollments.length !== 1 ? 'es' : ''}
				</p>
			</div>
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
				<label class="mb-2 block text-sm font-medium text-slate-300">Estado</label>
				<select
					name="status"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-indigo-500 focus:outline-none"
				>
					<option value="">Todos</option>
					<option value="PENDING" selected={data.filters.status === 'PENDING'}>Pendiente</option>
					<option value="ACTIVE" selected={data.filters.status === 'ACTIVE'}>Activa</option>
					<option value="REJECTED" selected={data.filters.status === 'REJECTED'}>Rechazada</option>
					<option value="CANCELLED" selected={data.filters.status === 'CANCELLED'}>Cancelada</option
					>
				</select>
			</div>
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
				<label class="mb-2 block text-sm font-medium text-slate-300">Alumno</label>
				<input
					type="text"
					name="student"
					value={data.filters.student || ''}
					placeholder="Nombre, DNI..."
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
				/>
			</div>
			<div class="flex items-end gap-2 md:col-span-4">
				<button
					type="submit"
					class="rounded-xl bg-indigo-500 px-6 py-2.5 font-medium text-white transition hover:bg-indigo-600"
				>
					Filtrar
				</button>
				<a
					href="/inscripciones"
					class="rounded-xl border border-slate-700 px-6 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800"
				>
					Limpiar
				</a>
			</div>
		</form>
	</div>

	<!-- Enrollments Table -->
	{#if data.enrollments.length === 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
			<p class="text-lg text-slate-400">No hay inscripciones con los filtros seleccionados</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
			<table class="w-full text-left">
				<thead class="border-b border-slate-800 bg-slate-950">
					<tr>
						<th class="px-6 py-4 text-sm font-semibold">Alumno</th>
						<th class="px-6 py-4 text-sm font-semibold">Materia</th>
						<th class="px-6 py-4 text-sm font-semibold">Comisión</th>
						<th class="px-6 py-4 text-sm font-semibold">Estado</th>
						<th class="px-6 py-4 text-sm font-semibold">Fecha</th>
						<th class="px-6 py-4 text-sm font-semibold">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each data.enrollments as enrollment}
						{@const status = getStatusLabel(enrollment.status)}
						<tr class="border-b border-slate-800 last:border-none">
							<td class="px-6 py-4">
								<p class="font-medium">{enrollment.student.fullName}</p>
								<p class="text-sm text-slate-400">{enrollment.student.dni}</p>
							</td>
							<td class="px-6 py-4">
								<p class="font-medium">{enrollment.subject.name}</p>
								<p class="text-sm text-slate-400">
									{enrollment.subject.code} · Año {enrollment.subject.yearLevel}
								</p>
							</td>
							<td class="px-6 py-4">
								{#if enrollment.commission}
									<p class="font-medium">Comisión {enrollment.commission.code}</p>
									{#if enrollment.commission.teacher}
										<p class="text-sm text-slate-400">{enrollment.commission.teacher.name}</p>
									{/if}
								{:else}
									<p class="text-slate-500">Sin comisión</p>
								{/if}
							</td>
							<td class="px-6 py-4">
								<span class="rounded-full {status.color} px-3 py-1 text-xs">
									{status.label}
								</span>
							</td>
							<td class="px-6 py-4 text-sm text-slate-400">
								{new Date(enrollment.enrolledAt).toLocaleDateString('es-AR')}
							</td>
							<td class="px-6 py-4">
								<div class="flex gap-2">
									{#if enrollment.status === 'PENDING' && data.canUpdate}
										<form method="POST" action="?/confirm" use:enhance>
											<input type="hidden" name="enrollmentId" value={enrollment.id} />
											<button
												type="submit"
												class="rounded-lg border border-emerald-900/50 px-3 py-1.5 text-sm text-emerald-400 transition hover:bg-emerald-950/30"
											>
												Confirmar
											</button>
										</form>
									{/if}
									{#if enrollment.status === 'PENDING' && data.canUpdate}
										<button
											onclick={() => initiateReject(enrollment.id)}
											class="rounded-lg border border-red-900/50 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-950/30"
										>
											Rechazar
										</button>
									{/if}
									{#if enrollment.status === 'ACTIVE' && data.canUpdate}
										<button
											onclick={() => initiateCancel(enrollment.id)}
											class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800"
										>
											Cancelar
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

	<!-- Reject Modal -->
	{#if showRejectModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
			<div class="mx-4 max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="text-xl font-bold">Rechazar Inscripción</h2>
				<p class="mt-2 text-slate-400">Indicá el motivo del rechazo:</p>
				<textarea
					bind:value={rejectReason}
					placeholder="Motivo del rechazo..."
					class="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
					rows="3"
				></textarea>
				<div class="mt-6 flex gap-3">
					<button
						onclick={handleReject}
						class="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					{#if selectedEnrollment}
						<form method="POST" action="?/reject" use:enhance onsubmit={handleReject}>
							<input type="hidden" name="enrollmentId" value={selectedEnrollment} />
							<input type="hidden" name="reason" value={rejectReason} />
							<button
								type="submit"
								class="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition hover:bg-red-600"
							>
								Rechazar
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Cancel Modal -->
	{#if showCancelModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
			<div class="mx-4 max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="text-xl font-bold">Cancelar Inscripción</h2>
				<p class="mt-2 text-slate-400">Indicá el motivo de la cancelación:</p>
				<textarea
					bind:value={rejectReason}
					placeholder="Motivo de la cancelación..."
					class="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
					rows="3"
				></textarea>
				<div class="mt-6 flex gap-3">
					<button
						onclick={handleCancel}
						class="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					{#if selectedEnrollment}
						<form method="POST" action="?/cancel" use:enhance onsubmit={handleCancel}>
							<input type="hidden" name="enrollmentId" value={selectedEnrollment} />
							<input type="hidden" name="reason" value={rejectReason} />
							<button
								type="submit"
								class="flex-1 rounded-xl bg-slate-700 px-4 py-3 font-medium text-white transition hover:bg-slate-600"
							>
								Cancelar Inscripción
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
