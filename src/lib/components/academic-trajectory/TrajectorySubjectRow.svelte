<script lang="ts">
	import TrajectoryStatusBadge from './TrajectoryStatusBadge.svelte';
	import type { AcademicTrajectorySubject } from '$lib/types/academic-trajectory';

	let { subject }: { subject: AcademicTrajectorySubject } = $props();

	const dateFormatter = new Intl.DateTimeFormat('es-AR');

	function formatDate(value: Date | null) {
		return value ? dateFormatter.format(value) : 'Sin fecha';
	}

	function approvalMethodLabel(method: string) {
		const labels: Record<string, string> = {
			FINAL_EXAM: 'Examen final',
			PROMOTION: 'Promoción',
			EQUIVALENCE: 'Equivalencia',
			LEGACY: 'Registro histórico'
		};

		return labels[method] ?? method;
	}

	function sourceLabel(source: string) {
		const labels: Record<string, string> = {
			SYSTEM: 'Sistema',
			MANUAL: 'Carga manual',
			IMPORT: 'Importación',
			LEGACY: 'Registro anterior'
		};

		return labels[source] ?? source;
	}

	function courseStatusLabel(status: string) {
		const labels: Record<string, string> = {
			IN_PROGRESS: 'En curso',
			PASSED_COURSE: 'Regularizó',
			FAILED_COURSE: 'No regularizó',
			PROMOTED: 'Promocionó'
		};

		return labels[status] ?? status;
	}

	function enrollmentAttemptLabel(attempt: 'FIRST_TIME' | 'REPEAT' | null) {
		if (attempt === 'FIRST_TIME') return 'Primera cursada';
		if (attempt === 'REPEAT') return 'Recursada';

		return 'Tipo histórico no registrado';
	}

	function finalResultLabel(passed: boolean | null, status: string) {
		if (passed === true) return 'Aprobado';
		if (passed === false) return 'Desaprobado';

		const labels: Record<string, string> = {
			ABSENT: 'Ausente',
			EXCUSED: 'Justificado',
			PENDING: 'Pendiente',
			PRESENT: 'Sin resultado definitivo'
		};

		return labels[status] ?? status;
	}
</script>

<details class="group border-b border-slate-800 last:border-b-0">
	<summary
		class="grid cursor-pointer list-none gap-3 px-5 py-4 transition hover:bg-slate-800/40 md:grid-cols-[minmax(0,2fr)_minmax(160px,1fr)_minmax(140px,0.8fr)_auto] md:items-center"
	>
		<div class="min-w-0">
			<div class="flex items-start gap-3">
				<div class="min-w-0">
					<p class="font-medium text-white">{subject.name}</p>
					<p class="mt-1 font-mono text-xs text-slate-500">{subject.code}</p>
				</div>
			</div>
		</div>

		<div>
			<TrajectoryStatusBadge state={subject.state} />
		</div>

		<div class="text-sm text-slate-400">
			{#if subject.currentEnrollment}
				<p>
					Cursada {subject.currentEnrollment.academicYear ?? 'sin año'}
				</p>
				{#if subject.currentEnrollment.commissionCode}
					<p class="mt-1 text-xs text-slate-500">
						Comisión {subject.currentEnrollment.commissionCode}
					</p>
				{/if}
			{:else if subject.regularity?.status === 'REGULAR'}
				<p>Regular</p>
				{#if subject.regularity.expiresAt}
					<p class="mt-1 text-xs text-slate-500">
						Vence {formatDate(subject.regularity.expiresAt)}
					</p>
				{:else}
					<p class="mt-1 text-xs text-slate-500">Sin vencimiento configurado</p>
				{/if}
			{:else if subject.approval}
				<p>{approvalMethodLabel(subject.approval.method)}</p>
			{:else}
				<p>—</p>
			{/if}
		</div>

		<div class="flex items-center justify-between gap-2 md:justify-end">
			<span class="text-xs text-slate-500">
				{subject.courseAttempts.length} cursada{subject.courseAttempts.length === 1 ? '' : 's'}
				· {subject.finalExamAttempts.length} final{subject.finalExamAttempts.length === 1
					? ''
					: 'es'}
			</span>
			<span class="text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true">
				⌄
			</span>
		</div>
	</summary>

	<div class="border-t border-slate-800 bg-slate-950/50 px-5 py-5">
		<div class="grid gap-6 xl:grid-cols-3">
			<section>
				<h4 class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Acreditación
				</h4>

				{#if subject.approval}
					<div class="mt-3 space-y-1 text-sm">
						<p class="font-medium text-white">
							{approvalMethodLabel(subject.approval.method)}
						</p>
						<p class="text-slate-400">
							Origen: {sourceLabel(subject.approval.source)}
						</p>
						<p class="text-slate-400">
							Fecha: {formatDate(subject.approval.accreditedAt)}
						</p>
						{#if subject.approval.academicYear}
							<p class="text-slate-400">Año: {subject.approval.academicYear}</p>
						{/if}
						{#if subject.approval.grade !== null}
							<p class="text-slate-400">Nota: {subject.approval.grade}</p>
						{/if}
						{#if subject.approval.observations}
							<p class="mt-2 text-slate-500">{subject.approval.observations}</p>
						{/if}
					</div>
				{:else}
					<p class="mt-3 text-sm text-slate-500">Sin acreditación definitiva.</p>
				{/if}
			</section>

			<section>
				<h4 class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Historial de cursadas
				</h4>

				{#if subject.courseAttempts.length > 0}
					<div class="mt-3 space-y-3">
						{#each subject.courseAttempts as attempt (attempt.id)}
							<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<p class="font-medium text-white">
										{attempt.academicYear ?? 'Año no registrado'}
									</p>
									<span class="text-xs text-slate-500">
										{enrollmentAttemptLabel(attempt.attemptType)}
									</span>
								</div>

								{#if attempt.commissionCode}
									<p class="mt-1 text-slate-400">
										Comisión {attempt.commissionCode}
									</p>
								{/if}

								{#if attempt.courseResult}
									<p class="mt-1 text-slate-400">
										{courseStatusLabel(attempt.courseResult.courseStatus)}
									</p>

									{#if attempt.courseResult.courseAverage !== null}
										<p class="mt-1 text-slate-500">
											Promedio: {attempt.courseResult.courseAverage}
										</p>
									{/if}

									{#if attempt.courseResult.regularizedAt}
										<p class="mt-1 text-slate-500">
											Regularizó: {formatDate(attempt.courseResult.regularizedAt)}
										</p>
									{/if}
								{:else}
									<p class="mt-1 text-slate-500">Sin resultado de cursada registrado.</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-3 text-sm text-slate-500">Sin cursadas registradas.</p>
				{/if}
			</section>

			<section>
				<h4 class="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
					Intentos de final
				</h4>

				{#if subject.finalExamAttempts.length > 0}
					<div class="mt-3 space-y-3">
						{#each subject.finalExamAttempts as attempt (attempt.gradeId)}
							<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
								<div class="flex items-center justify-between gap-2">
									<p class="font-medium text-white">
										{formatDate(attempt.evaluationDate)}
									</p>
									<span
										class:text-emerald-300={attempt.passed === true}
										class:text-red-300={attempt.passed === false}
										class:text-slate-400={attempt.passed === null}
									>
										{finalResultLabel(attempt.passed, attempt.status)}
									</span>
								</div>

								{#if attempt.callNumber}
									<p class="mt-1 text-slate-400">
										Llamado {attempt.callNumber}
									</p>
								{/if}

								{#if attempt.grade !== null}
									<p class="mt-1 text-slate-400">Nota: {attempt.grade}</p>
								{/if}

								{#if attempt.observations}
									<p class="mt-1 text-slate-500">{attempt.observations}</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="mt-3 text-sm text-slate-500">Sin intentos de examen final.</p>
				{/if}
			</section>
		</div>
	</div>
</details>
