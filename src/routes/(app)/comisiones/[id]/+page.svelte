<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const getStatusLabel = (status: string) => {
		const labels: Record<string, { label: string; color: string }> = {
			PENDING: { label: 'Pendiente', color: 'bg-amber-950/50 text-amber-400' },
			ACTIVE: { label: 'Activa', color: 'bg-green-950/50 text-green-400' },
			REJECTED: { label: 'Rechazada', color: 'bg-red-950/50 text-red-400' },
			CANCELLED: { label: 'Cancelada', color: 'bg-slate-950/50 text-slate-400' }
		};
		return labels[status] || { label: status, color: 'bg-slate-950/50 text-slate-400' };
	};

	const getCapacityStatus = () => {
		const percentage = (data.commission.currentEnrolled / data.commission.maxCapacity) * 100;
		if (percentage >= 100) return { label: 'Completo', color: 'bg-red-950/50 text-red-400' };
		if (percentage >= 80) return { label: 'Casi completo', color: 'bg-amber-950/50 text-amber-400' };
		return { label: 'Disponible', color: 'bg-green-950/50 text-green-400' };
	};
</script>

<svelte:head>
	<title>Detalle de Comisión | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-4">
				<a
					href="/comisiones"
					class="rounded-xl border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 transition"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</a>
				<div>
					<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Administración</p>
					<h1 class="mt-2 text-3xl font-bold">Comisión {data.commission.code}</h1>
					<p class="mt-2 text-slate-400">{data.commission.subject.name}</p>
				</div>
			</div>
			<div class="flex gap-2">
				{#if data.canUpdate}
					<a
						href="/comisiones/{data.commission.id}/editar"
						class="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
						Editar
					</a>
				{/if}
			</div>
		</div>
	</div>

	<!-- Commission Details -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Info Card -->
		<div class="lg:col-span-2 space-y-6">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<h2 class="text-xl font-bold mb-4">Información de la Comisión</h2>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<p class="text-sm text-slate-400">Código</p>
						<p class="font-medium">{data.commission.code}</p>
					</div>
					<div>
						<p class="text-sm text-slate-400">Estado</p>
						<span class="inline-flex rounded-full {data.commission.active ? 'bg-green-950/50 text-green-400' : 'bg-slate-950/50 text-slate-400'} px-3 py-1 text-xs">
							{data.commission.active ? 'Activa' : 'Inactiva'}
						</span>
					</div>
					<div>
						<p class="text-sm text-slate-400">Materia</p>
						<p class="font-medium">{data.commission.subject.name}</p>
						<p class="text-sm text-slate-400">{data.commission.subject.code} · Año {data.commission.subject.yearLevel}</p>
					</div>
					<div>
						<p class="text-sm text-slate-400">Carrera</p>
						<p class="font-medium">{data.commission.career?.name || 'General'}</p>
					</div>
					<div>
						<p class="text-sm text-slate-400">Plan de Estudio</p>
						<p class="font-medium">{data.commission.studyPlan?.name || 'No asignado'}</p>
						{#if data.commission.studyPlan}
							<p class="text-sm text-slate-400">Versión {data.commission.studyPlan.version}</p>
						{/if}
					</div>
					<div>
						<p class="text-sm text-slate-400">Período Lectivo</p>
						<p class="font-medium">{data.commission.academicTerm?.name || 'No asignado'}</p>
						{#if data.commission.academicTerm}
							<p class="text-sm text-slate-400">{data.commission.academicTerm.year}</p>
						{/if}
					</div>
					<div>
						<p class="text-sm text-slate-400">Docente</p>
						<p class="font-medium">{data.commission.teacher?.name || 'Sin asignar'}</p>
					</div>
					<div>
						<p class="text-sm text-slate-400">Localidad</p>
						<p class="font-medium">{data.commission.location?.name || 'Sin asignar'}</p>
					</div>
				</div>
				{#if data.commission.schedule}
					<div class="mt-4">
						<p class="text-sm text-slate-400">Horario</p>
						<p class="font-medium">{data.commission.schedule}</p>
					</div>
				{/if}
				{#if data.commission.observations}
					<div class="mt-4">
						<p class="text-sm text-slate-400">Observaciones</p>
						<p class="font-medium">{data.commission.observations}</p>
					</div>
				{/if}
			</div>

			<!-- Enrollments -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<h2 class="text-xl font-bold mb-4">Alumnos Inscriptos ({data.enrollments.length})</h2>
				{#if data.enrollments.length === 0}
					<p class="text-slate-400">No hay alumnos inscriptos en esta comisión</p>
				{:else}
					<div class="overflow-hidden rounded-xl border border-slate-800">
						<table class="w-full text-left">
							<thead class="border-b border-slate-800 bg-slate-950">
								<tr>
									<th class="px-4 py-3 text-sm font-semibold">Alumno</th>
									<th class="px-4 py-3 text-sm font-semibold">DNI</th>
									<th class="px-4 py-3 text-sm font-semibold">Estado</th>
									<th class="px-4 py-3 text-sm font-semibold">Fecha</th>
								</tr>
							</thead>
							<tbody>
								{#each data.enrollments as enrollment}
									{@const status = getStatusLabel(enrollment.status)}
									<tr class="border-b border-slate-800 last:border-none">
										<td class="px-4 py-3">
											<p class="font-medium">{enrollment.student.fullName}</p>
											<p class="text-sm text-slate-400">{enrollment.student.email}</p>
										</td>
										<td class="px-4 py-3 text-slate-400">{enrollment.student.dni}</td>
										<td class="px-4 py-3">
											<span class="rounded-full {status.color} px-2 py-1 text-xs">
												{status.label}
											</span>
										</td>
										<td class="px-4 py-3 text-sm text-slate-400">
											{new Date(enrollment.enrolledAt).toLocaleDateString('es-AR')}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>

		<!-- Capacity Card -->
		<div class="space-y-6">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<h2 class="text-xl font-bold mb-4">Capacidad</h2>
				{#if true}
					{@const capacityStatus = getCapacityStatus()}
					<div class="mb-4">
						<p class="text-sm text-slate-400">Estado del cupo</p>
						<span class="inline-flex rounded-full {capacityStatus.color} px-3 py-1 text-sm">
							{capacityStatus.label}
						</span>
					</div>
				{/if}
				<div class="mb-4">
					<p class="text-sm text-slate-400">Ocupación</p>
					<p class="text-3xl font-bold">{data.commission.currentEnrolled} / {data.commission.maxCapacity}</p>
				</div>
				<div class="h-4 rounded-full bg-slate-800 overflow-hidden">
					<div
						class="h-full bg-indigo-500 transition-all"
						style="width: {(data.commission.currentEnrolled / data.commission.maxCapacity) * 100}%"
					></div>
				</div>
				<p class="mt-2 text-sm text-slate-400">
					{Math.round((data.commission.currentEnrolled / data.commission.maxCapacity) * 100)}% ocupado
				</p>
			</div>

			<!-- Metadata -->
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
				<h2 class="text-xl font-bold mb-4">Metadatos</h2>
				<div class="space-y-3">
					<div>
						<p class="text-sm text-slate-400">Creado</p>
						<p class="font-medium">{new Date(data.commission.createdAt).toLocaleString('es-AR')}</p>
					</div>
					<div>
						<p class="text-sm text-slate-400">Última modificación</p>
						<p class="font-medium">{new Date(data.commission.updatedAt).toLocaleString('es-AR')}</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
