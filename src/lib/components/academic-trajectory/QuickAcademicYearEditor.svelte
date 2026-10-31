<script lang="ts">
	import { enhance } from '$app/forms';
	import type { AcademicTrajectorySubject } from '$lib/types/academic-trajectory';
	import TrajectoryStatusBadge from './TrajectoryStatusBadge.svelte';
	import TrajectorySubjectActions from './TrajectorySubjectActions.svelte';

	type QuickStatus = 'TAKING' | 'RETAKING' | 'REGULAR' | 'FREE' | 'APPROVED';

	let {
		yearLevel,
		subjects,
		canManage
	}: {
		yearLevel: number;
		subjects: AcademicTrajectorySubject[];
		canManage: boolean;
	} = $props();

	let changes = $state<Record<string, QuickStatus | ''>>({});
	let saving = $state(false);

	let feedback = $state<{
		type: 'success' | 'error';
		message: string;
	} | null>(null);

	const pendingSubjects = $derived(subjects.filter((subject) => subject.state === 'NOT_STARTED'));

	const selectedCount = $derived(Object.values(changes).filter((value) => value !== '').length);

	const changesJson = $derived(
		JSON.stringify(
			Object.entries(changes)
				.filter((entry): entry is [string, QuickStatus] => entry[1] !== '')
				.map(([subjectId, status]) => ({
					subjectId,
					status
				}))
		)
	);

	function currentStateLabel(subject: AcademicTrajectorySubject): string {
		switch (subject.state) {
			case 'APPROVED':
				return 'Aprobada';
			case 'TAKING':
				return 'Cursando';
			case 'RETAKING':
				return 'Recursando';
			case 'REGULAR':
				return 'Regular';
			case 'REGULAR_EXPIRED':
				return 'Regularidad vencida';
			case 'FREE':
				return 'Libre';
			case 'NOT_STARTED':
			default:
				return 'Sin información';
		}
	}

	function markPendingAsApproved() {
		const next = { ...changes };

		for (const subject of pendingSubjects) {
			next[subject.id] = 'APPROVED';
		}

		changes = next;
	}

	function updateSubjectStatus(subjectId: string, event: Event) {
		const target = event.currentTarget;

		if (!(target instanceof HTMLSelectElement)) {
			return;
		}

		changes = {
			...changes,
			[subjectId]: target.value as QuickStatus | ''
		};
	}

	function editSubject(subject: AcademicTrajectorySubject) {
		feedback = null;

		const select = document.getElementById(`quick-status-${subject.id}`);

		if (!(select instanceof HTMLSelectElement)) {
			return;
		}

		select.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});

		select.focus();
	}
</script>

<section class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
	<header
		class="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
	>
		<div>
			<h2 class="text-lg font-bold text-white">
				{yearLevel}° año
			</h2>

			<p class="mt-1 text-sm text-slate-500">Carga rápida de la trayectoria académica</p>
		</div>

		{#if canManage && pendingSubjects.length > 0}
			<button
				type="button"
				onclick={markPendingAsApproved}
				class="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
			>
				Marcar pendientes como aprobadas
			</button>
		{/if}
	</header>

	{#if feedback}
		<div
			class={`mx-5 mt-5 rounded-xl border px-4 py-3 text-sm ${
				feedback.type === 'success'
					? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
					: 'border-red-500/30 bg-red-500/10 text-red-300'
			}`}
		>
			{feedback.message}
		</div>
	{/if}

	<div
		class="hidden border-b border-slate-800 px-5 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase md:grid md:grid-cols-[minmax(0,2fr)_minmax(170px,0.8fr)_minmax(220px,1fr)_minmax(260px,1.1fr)] md:gap-4"
	>
		<div>Materia</div>
		<div>Situación actual</div>
		<div>Carga rápida</div>
		<div>Acción</div>
	</div>

	<div>
		{#each subjects as subject (subject.id)}
			<div
				class="border-b border-slate-800 px-5 py-4 last:border-b-0 md:grid md:grid-cols-[minmax(0,2fr)_minmax(170px,0.8fr)_minmax(220px,1fr)_minmax(260px,1.1fr)] md:items-center md:gap-4"
			>
				<div class="mb-4 min-w-0 md:mb-0">
					<p class="truncate font-semibold text-white">
						{subject.name}
					</p>

					<p class="mt-1 text-xs text-slate-500">
						{subject.code}
					</p>
				</div>

				<div class="mb-4 md:mb-0">
					<p class="mb-2 text-xs font-semibold text-slate-500 uppercase md:hidden">
						Situación actual
					</p>

					<TrajectoryStatusBadge state={subject.state} />
				</div>

				<div class="mb-4 md:mb-0">
					<p class="mb-2 text-xs font-semibold text-slate-500 uppercase md:hidden">Carga rápida</p>

					{#if canManage}
						<select
							id={`quick-status-${subject.id}`}
							value={changes[subject.id] ?? ''}
							onchange={(event) => updateSubjectStatus(subject.id, event)}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white transition outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
						>
							<option value="">
								Sin cambios · actual: {currentStateLabel(subject)}
							</option>

							<option value="TAKING"> Cursando </option>

							<option value="RETAKING"> Recursando </option>

							<option value="REGULAR"> Regular </option>

							<option value="FREE"> Libre </option>

							<option value="APPROVED"> Aprobada </option>
						</select>
					{:else}
						<div
							class="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-400"
						>
							{currentStateLabel(subject)}
						</div>
					{/if}
				</div>

				<div>
					<p class="mb-2 text-xs font-semibold text-slate-500 uppercase md:hidden">Acción</p>

					<TrajectorySubjectActions {subject} {canManage} onEdit={() => editSubject(subject)} />
				</div>
			</div>
		{/each}
	</div>

	{#if canManage}
		<form
			method="POST"
			action="?/saveYearStatuses"
			use:enhance={() => {
				saving = true;
				feedback = null;

				return async ({ result, update }) => {
					saving = false;

					if (result.type === 'success') {
						const resultData = result.data as {
							message?: string;
						};

						feedback = {
							type: 'success',
							message: resultData.message ?? 'Trayectoria actualizada correctamente'
						};

						changes = {};

						await update({
							reset: false,
							invalidateAll: true
						});

						return;
					}

					if (result.type === 'failure') {
						const resultData = result.data as {
							quickLoadError?: string;
						};

						feedback = {
							type: 'error',
							message: resultData.quickLoadError ?? 'No se pudieron guardar los cambios'
						};
					}
				};
			}}
		>
			<input type="hidden" name="yearLevel" value={yearLevel} />

			<input type="hidden" name="changesJson" value={changesJson} />

			<footer
				class="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<p class="text-sm text-slate-400">
					{#if selectedCount === 0}
						No hay cambios pendientes.
					{:else}
						<span class="font-semibold text-white">
							{selectedCount}
						</span>

						materia{selectedCount === 1 ? '' : 's'} para actualizar.
					{/if}
				</p>

				<button
					type="submit"
					disabled={selectedCount === 0 || saving}
					class="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{saving ? 'Guardando…' : 'Guardar cambios'}
				</button>
			</footer>
		</form>
	{/if}
</section>
