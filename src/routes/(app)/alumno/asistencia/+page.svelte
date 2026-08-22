<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function statusLabel(status: string) {
		switch (status) {
			case 'PRESENT':
				return 'Presente';
			case 'ABSENT':
				return 'Ausente';
			case 'LATE':
				return 'Tarde';
			case 'JUSTIFIED':
				return 'Justificada';
			default:
				return status;
		}
	}

	function statusIcon(status: string) {
		switch (status) {
			case 'PRESENT':
				return '✓';
			case 'ABSENT':
				return '✕';
			case 'LATE':
				return 'T';
			case 'JUSTIFIED':
				return 'J';
			default:
				return '?';
		}
	}

	function statusClass(status: string) {
		switch (status) {
			case 'PRESENT':
				return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
			case 'ABSENT':
				return 'bg-red-500/10 text-red-300 border-red-500/20';
			case 'LATE':
				return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
			case 'JUSTIFIED':
				return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
			default:
				return 'bg-slate-800 text-slate-300 border-slate-700';
		}
	}
</script>

<svelte:head>
	<title>Mi Asistencia | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<header class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Asistencia</p>
				<h1 class="mt-2 text-3xl font-bold">Mi asistencia por materia</h1>
				<p class="mt-2 text-slate-400">
					{data.student.firstName}
					{data.student.lastName}
				</p>
			</div>

			<div class="text-left sm:text-right">
				<p class="text-sm text-slate-400">Asistencia general</p>
				<p class="text-4xl font-bold">
					{data.overallAttendance}%
				</p>
				<p class="mt-1 text-sm text-slate-500">
					{data.totalClasses} registros
				</p>
			</div>
		</div>
	</header>

	{#each data.subjects as subject}
		<section class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="text-xs tracking-wider text-slate-500 uppercase">
						{subject.subjectCode}
					</p>
					<h2 class="mt-1 text-xl font-semibold">
						{subject.subjectName}
					</h2>
					<p class="mt-1 text-sm text-slate-400">
						Regularidad:
						<span class="font-medium text-white">
							{subject.regularityStatus}
						</span>
					</p>
				</div>

				<div class="sm:text-right">
					<p class="text-3xl font-bold">
						{subject.percentage}%
					</p>
					<p class="text-xs text-slate-500">Asistencia computable</p>
				</div>
			</div>

			<div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<div class="rounded-xl bg-emerald-500/10 p-3">
					<p class="text-xs text-emerald-300">Presentes</p>
					<p class="mt-1 text-xl font-bold">
						{subject.present}
					</p>
				</div>

				<div class="rounded-xl bg-amber-500/10 p-3">
					<p class="text-xs text-amber-300">Tarde</p>
					<p class="mt-1 text-xl font-bold">
						{subject.late}
					</p>
				</div>

				<div class="rounded-xl bg-red-500/10 p-3">
					<p class="text-xs text-red-300">Ausentes</p>
					<p class="mt-1 text-xl font-bold">
						{subject.absent}
					</p>
				</div>

				<div class="rounded-xl bg-blue-500/10 p-3">
					<p class="text-xs text-blue-300">Justificadas</p>
					<p class="mt-1 text-xl font-bold">
						{subject.justified}
					</p>
				</div>
			</div>

			<div class="mt-6 space-y-2">
				{#each subject.entries as entry}
					<div
						class="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center"
					>
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border {statusClass(
								entry.status
							)}"
						>
							{statusIcon(entry.status)}
						</div>

						<div class="min-w-0 flex-1">
							<p class="font-medium">
								{new Date(entry.date).toLocaleDateString('es-AR', {
									weekday: 'long',
									day: '2-digit',
									month: '2-digit',
									year: 'numeric'
								})}
							</p>

							<p class="mt-1 text-sm text-slate-500">
								{entry.commission ? `Comisión ${entry.commission}` : ''}
								{entry.startTime ? ` · ${entry.startTime} - ${entry.endTime}` : ''}
							</p>

							{#if entry.notes}
								<p class="mt-1 text-sm text-slate-400">
									{entry.notes}
								</p>
							{/if}
						</div>

						<span class="w-fit rounded-lg border px-3 py-2 text-sm {statusClass(entry.status)}">
							{statusLabel(entry.status)}
						</span>
					</div>
				{/each}
			</div>
		</section>
	{/each}

	{#if data.subjects.length === 0}
		<div
			class="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400"
		>
			Todavía no tenés registros de asistencia.
		</div>
	{/if}

	<a
		href="/alumno"
		class="inline-flex rounded-xl border border-slate-700 px-5 py-3 transition hover:bg-slate-800"
	>
		← Volver al panel
	</a>
</div>
