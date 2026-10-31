<script lang="ts">
	import { enhance } from '$app/forms';
	import type { AcademicTrajectorySubject } from '$lib/types/academic-trajectory';
	import TrajectoryStatusBadge from './TrajectoryStatusBadge.svelte';

	let {
		subject,
		canManage,
		onEdit
	}: {
		subject: AcademicTrajectorySubject;
		canManage: boolean;
		onEdit: () => void;
	} = $props();

	let showView = $state(false);
	let showDeleteRequest = $state(false);
	let deleteReason = $state('');
	let sendingTicket = $state(false);
	let ticketFeedback = $state<{
		type: 'success' | 'error';
		message: string;
	} | null>(null);

	const hasPersistedEvidence = $derived(
		Boolean(
			subject.approval ||
			subject.currentEnrollment ||
			subject.regularity ||
			subject.courseAttempts.length > 0 ||
			subject.finalExamAttempts.length > 0
		)
	);

	function formatDate(value: Date | string | null): string {
		if (!value) return 'Sin informar';

		return new Intl.DateTimeFormat('es-AR', {
			dateStyle: 'medium'
		}).format(new Date(value));
	}

	function closeDeleteRequest() {
		if (sendingTicket) return;

		showDeleteRequest = false;
		deleteReason = '';
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<button
		type="button"
		onclick={() => (showView = true)}
		class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-500/50 hover:text-blue-300"
	>
		Ver
	</button>

	{#if canManage}
		<button
			type="button"
			onclick={onEdit}
			class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300"
		>
			Editar
		</button>

		<button
			type="button"
			disabled={!hasPersistedEvidence}
			onclick={() => {
				ticketFeedback = null;
				showDeleteRequest = true;
			}}
			title={hasPersistedEvidence
				? 'Solicitar eliminación mediante ticket'
				: 'No existe un registro académico persistido para eliminar'}
			class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-35"
		>
			Solicitar eliminar
		</button>
	{/if}
</div>

{#if ticketFeedback}
	<p
		class={`mt-2 text-xs ${
			ticketFeedback.type === 'success' ? 'text-emerald-300' : 'text-red-300'
		}`}
	>
		{ticketFeedback.message}
	</p>
{/if}

{#if showView}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="presentation"
	>
		<div
			class="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby={`subject-view-${subject.id}`}
		>
			<header class="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
				<div>
					<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">
						Detalle académico
					</p>

					<h3 id={`subject-view-${subject.id}`} class="mt-1 text-lg font-bold text-white">
						{subject.name}
					</h3>

					<p class="mt-1 text-sm text-slate-500">
						{subject.code} · {subject.yearLevel}° año
					</p>
				</div>

				<button
					type="button"
					onclick={() => (showView = false)}
					class="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
					aria-label="Cerrar"
				>
					✕
				</button>
			</header>

			<div class="space-y-5 p-5">
				<div>
					<p class="mb-2 text-xs text-slate-500">Situación actual</p>
					<TrajectoryStatusBadge state={subject.state} />
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-xs text-slate-500">Acreditación</p>
						<p class="mt-1 text-sm font-semibold text-white">
							{subject.approval?.method ?? 'Sin acreditar'}
						</p>
					</div>

					<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-xs text-slate-500">Fecha de aprobación</p>
						<p class="mt-1 text-sm font-semibold text-white">
							{formatDate(subject.approval?.accreditedAt ?? null)}
						</p>
					</div>

					<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-xs text-slate-500">Nota</p>
						<p class="mt-1 text-sm font-semibold text-white">
							{subject.approval?.grade ?? 'Sin informar'}
						</p>
					</div>

					<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-xs text-slate-500">Año académico</p>
						<p class="mt-1 text-sm font-semibold text-white">
							{subject.approval?.academicYear ?? 'Sin informar'}
						</p>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-xs text-slate-500">Cursadas registradas</p>
						<p class="mt-1 text-xl font-bold text-white">
							{subject.courseAttempts.length}
						</p>
					</div>

					<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
						<p class="text-xs text-slate-500">Intentos de final</p>
						<p class="mt-1 text-xl font-bold text-white">
							{subject.finalExamAttempts.length}
						</p>
					</div>
				</div>
			</div>

			<footer class="flex justify-end border-t border-slate-800 px-5 py-4">
				<button
					type="button"
					onclick={() => (showView = false)}
					class="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
				>
					Cerrar
				</button>
			</footer>
		</div>
	</div>
{/if}

{#if showDeleteRequest}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="presentation"
	>
		<form
			method="POST"
			action="?/requestDeletion"
			use:enhance={() => {
				sendingTicket = true;
				ticketFeedback = null;

				return async ({ result, update }) => {
					sendingTicket = false;

					if (result.type === 'success') {
						const resultData = result.data as {
							message?: string;
							ticketNumber?: number;
						};

						ticketFeedback = {
							type: 'success',
							message: resultData.message ?? 'Ticket enviado correctamente'
						};

						showDeleteRequest = false;
						deleteReason = '';

						await update({
							reset: false,
							invalidateAll: false
						});

						return;
					}

					if (result.type === 'failure') {
						const resultData = result.data as {
							deleteRequestError?: string;
						};

						ticketFeedback = {
							type: 'error',
							message: resultData.deleteRequestError ?? 'No se pudo enviar el ticket'
						};
					}
				};
			}}
			class="w-full max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 shadow-2xl"
		>
			<header class="border-b border-slate-800 px-5 py-4">
				<p class="text-xs font-semibold tracking-wide text-red-300 uppercase">
					Solicitud mediante ticket
				</p>

				<h3 class="mt-1 text-lg font-bold text-white">Solicitar eliminación</h3>

				<p class="mt-2 text-sm leading-6 text-slate-400">
					Esta acción no elimina el registro. El pedido será revisado por el
					administrador/programador.
				</p>
			</header>

			<div class="space-y-4 p-5">
				<input type="hidden" name="subjectId" value={subject.id} />

				<div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
					<p class="font-semibold text-white">{subject.name}</p>
					<p class="mt-1 text-sm text-slate-500">
						{subject.code} · {subject.yearLevel}° año · {subject.state}
					</p>
				</div>

				<div>
					<label
						for={`delete-reason-${subject.id}`}
						class="mb-2 block text-sm font-medium text-slate-300"
					>
						Motivo del pedido
					</label>

					<textarea
						id={`delete-reason-${subject.id}`}
						name="reason"
						bind:value={deleteReason}
						required
						minlength="10"
						rows="5"
						placeholder="Explicá por qué este registro académico debe eliminarse o corregirse..."
						class="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white transition outline-none focus:border-red-500"
					></textarea>

					<p class="mt-2 text-xs text-slate-500">
						Mínimo 10 caracteres. El motivo quedará registrado en el ticket.
					</p>
				</div>
			</div>

			<footer
				class="flex flex-col-reverse gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end"
			>
				<button
					type="button"
					disabled={sendingTicket}
					onclick={closeDeleteRequest}
					class="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
				>
					Cancelar
				</button>

				<button
					type="submit"
					disabled={sendingTicket || deleteReason.trim().length < 10}
					class="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{sendingTicket ? 'Enviando…' : 'Enviar ticket'}
				</button>
			</footer>
		</form>
	</div>
{/if}
