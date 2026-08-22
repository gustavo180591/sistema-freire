<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedSubjects = $state<Set<string>>(new Set());
	let selectedCommissions = $state<Map<string, string>>(new Map());
	let showConfirmation = $state(false);
	let showSuccess = $state(false);

	const toggleSubject = (subjectId: string) => {
		const newSet = new Set(selectedSubjects);
		const newCommissions = new Map(selectedCommissions);

		if (newSet.has(subjectId)) {
			newSet.delete(subjectId);
			newCommissions.delete(subjectId);
		} else {
			newSet.add(subjectId);
		}

		selectedSubjects = newSet;
		selectedCommissions = newCommissions;
	};

	const selectCommission = (subjectId: string, commissionId: string) => {
		const newCommissions = new Map(selectedCommissions);
		newCommissions.set(subjectId, commissionId);
		selectedCommissions = newCommissions;
	};

	const allSelectedSubjectsHaveCommission = () => {
		return (
			selectedSubjects.size > 0 &&
			[...selectedSubjects].every((subjectId) => selectedCommissions.has(subjectId))
		);
	};

	const canEnroll = (subject: any) => {
		return !subject.isEnrolled && !subject.isApproved && subject.hasCommissions;
	};

	const getEnrollmentStatus = (subject: any) => {
		if (subject.isApproved)
			return { label: 'Aprobada', color: 'bg-emerald-950/50 text-emerald-400' };
		if (subject.isEnrolled) return { label: 'Inscripto', color: 'bg-blue-950/50 text-blue-400' };
		if (!subject.hasCommissions)
			return { label: 'Sin comisiones', color: 'bg-slate-950/50 text-slate-400' };
		return { label: 'Disponible', color: 'bg-green-950/50 text-green-400' };
	};

	const handleEnroll = () => {
		if (!allSelectedSubjectsHaveCommission()) return;
		showConfirmation = true;
	};

	const handleConfirm = () => {
		showConfirmation = false;
	};

	// Watch for form submission result
	$effect(() => {
		if (form?.success) {
			showSuccess = true;
			selectedSubjects.clear();
			selectedCommissions.clear();
			invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>Inscripciones a Materias | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Inscripciones</p>
				<h1 class="mt-2 text-3xl font-bold">Inscripción a Materias</h1>
				<p class="mt-2 text-slate-400">
					{data.student.fullName} · {data.student.career} · Año {data.student.currentYear}
				</p>
				{#if data.activeTerm}
					<div
						class="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-950/50 px-4 py-1.5 text-sm text-indigo-400"
					>
						<span class="h-2 w-2 rounded-full bg-indigo-400"></span>
						{data.activeTerm.name}
					</div>
				{:else}
					<div
						class="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-950/50 px-4 py-1.5 text-sm text-amber-400"
					>
						<span class="h-2 w-2 rounded-full bg-amber-400"></span>
						Sin período lectivo activo
					</div>
				{/if}
			</div>
			<div class="text-right">
				<p class="text-sm text-slate-400">Inscriptas</p>
				<p class="text-2xl font-semibold">{data.enrolledCount}</p>
			</div>
		</div>
	</div>

	<!-- Success Message -->
	{#if showSuccess && form}
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
				<div>
					<p class="font-semibold text-emerald-400">Inscripción completada</p>
					<p class="text-sm text-slate-400">
						{form.enrolled} materia{form.enrolled !== 1 ? 's' : ''} inscripta{form.enrolled !== 1
							? 's'
							: ''}
						{form.errors && form.errors > 0 ? `, ${form.errors} con errores` : ''}
					</p>
				</div>
				<button
					onclick={() => (showSuccess = false)}
					class="ml-auto rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-400 hover:bg-slate-800"
				>
					Cerrar
				</button>
			</div>
			{#if form.errorDetails && form.errorDetails.length > 0}
				<div class="mt-4 space-y-2">
					{#each form.errorDetails as error}
						<div class="rounded-lg bg-red-950/30 p-3 text-sm text-red-400">
							{error.reason}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Subjects List -->
	{#if !data.activeTerm}
		<div class="rounded-2xl border border-amber-800 bg-amber-950/30 p-8 text-center">
			<p class="text-lg text-amber-400">No hay período lectivo activo</p>
			<p class="mt-2 text-slate-400">
				Contactá a secretaría para habilitar el período de inscripciones.
			</p>
		</div>
	{:else if data.subjects.length === 0}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
			<p class="text-lg text-slate-400">No hay materias disponibles para inscripción</p>
			<p class="mt-2 text-slate-500">Consultá con secretaría para más información.</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each data.subjects as subject}
				{@const status = getEnrollmentStatus(subject)}
				{@const canSelect = canEnroll(subject)}
				<div
					class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition {selectedSubjects.has(
						subject.subject.id
					)
						? 'border-indigo-500 bg-indigo-950/20'
						: 'hover:border-slate-700'}"
				>
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									disabled={!canSelect}
									checked={selectedSubjects.has(subject.subject.id)}
									onchange={() => toggleSubject(subject.subject.id)}
									class="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50"
								/>
								<div>
									<h3 class="font-semibold">{subject.subject.name}</h3>
									<p class="text-sm text-slate-400">
										{subject.subject.code} · Año {subject.yearLevel}
									</p>
								</div>
							</div>

							<!-- Status Badge -->
							<div class="mt-3">
								<span class="rounded-full {status.color} px-3 py-1 text-xs">
									{status.label}
								</span>
							</div>

							<!-- Commissions Selection -->
							{#if selectedSubjects.has(subject.subject.id) && subject.commissions.length > 0}
								<div class="mt-4 space-y-2">
									<p class="text-sm font-medium text-slate-300">Seleccioná una comisión:</p>
									<div class="grid gap-2 md:grid-cols-2">
										{#each subject.commissions as commission}
											{@const isSelected =
												selectedCommissions.get(subject.subject.id) === commission.id}
											<button
												type="button"
												onclick={() => selectCommission(subject.subject.id, commission.id)}
												disabled={commission.currentEnrolled >= commission.maxCapacity}
												class="rounded-xl border p-3 text-left transition {isSelected
													? 'border-indigo-500 bg-indigo-950/30'
													: 'border-slate-700 bg-slate-950 hover:border-slate-600'} disabled:opacity-50"
											>
												<div class="flex items-center justify-between">
													<div>
														<p class="font-medium">Comisión {commission.code}</p>
														{#if commission.teacher}
															<p class="text-sm text-slate-400">
																{commission.teacher.firstName}
																{commission.teacher.lastName}
															</p>
														{/if}
														{#if commission.schedule}
															<p class="text-sm text-slate-500">{commission.schedule}</p>
														{/if}
													</div>
													<div class="text-right">
														<p class="text-sm font-medium">
															{commission.currentEnrolled}/{commission.maxCapacity}
														</p>
														<p class="text-xs text-slate-500">cupos</p>
													</div>
												</div>
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Action Bar -->
		{#if selectedSubjects.size > 0}
			<div
				class="fixed right-0 bottom-0 left-0 border-t border-slate-800 bg-slate-900/95 p-4 backdrop-blur"
			>
				<div class="mx-auto flex max-w-7xl items-center justify-between">
					<p class="text-slate-400">
						{selectedSubjects.size} materia{selectedSubjects.size !== 1 ? 's' : ''} seleccionada{selectedSubjects.size !==
						1
							? 's'
							: ''}
					</p>
					<form method="POST" action="?/enroll" use:enhance>
						{#each selectedSubjects as subjectId}
							<input type="hidden" name="subjectIds" value={subjectId} />
							<input
								type="hidden"
								name="commissionIds"
								value={selectedCommissions.get(subjectId) || ''}
							/>
						{/each}
						<button
							type="button"
							onclick={handleEnroll}
							disabled={!allSelectedSubjectsHaveCommission()}
							class="rounded-xl bg-indigo-500 px-6 py-3 font-medium text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-500"
						>
							Confirmar Inscripción
						</button>
					</form>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Confirmation Modal -->
	{#if showConfirmation}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
			<div class="mx-4 max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="text-xl font-bold">Confirmar Inscripción</h2>
				<p class="mt-2 text-slate-400">
					Estás por inscribirte a {selectedSubjects.size} materia{selectedSubjects.size !== 1
						? 's'
						: ''}.
				</p>
				<div class="mt-4 space-y-2">
					{#each data.subjects.filter((s) => selectedSubjects.has(s.subject.id)) as subject}
						<div class="flex items-center justify-between rounded-lg bg-slate-950 p-3">
							<p class="font-medium">{subject.subject.name}</p>
							{#if selectedCommissions.get(subject.subject.id)}
								<p class="text-sm text-slate-400">
									Comisión {subject.commissions.find(
										(c) => c.id === selectedCommissions.get(subject.subject.id)
									)?.code}
								</p>
							{/if}
						</div>
					{/each}
				</div>
				<div class="mt-6 flex gap-3">
					<button
						onclick={() => (showConfirmation = false)}
						class="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						onclick={handleConfirm}
						class="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-medium text-white transition hover:bg-indigo-600"
					>
						Confirmar
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
