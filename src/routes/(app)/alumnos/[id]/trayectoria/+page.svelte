<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import QuickAcademicYearEditor from '$lib/components/academic-trajectory/QuickAcademicYearEditor.svelte';
	import TrajectoryYearSection from '$lib/components/academic-trajectory/TrajectoryYearSection.svelte';
	import TrajectoryYearCard from '$lib/components/academic-trajectory/TrajectoryYearCard.svelte';

	let { data }: { data: PageData } = $props();

	const trajectory = $derived(data.trajectory);
	const student = $derived(trajectory.student);
	const metrics = $derived(trajectory.metrics);

	const visibleSubjectsByYear = $derived(
		trajectory.subjectsByYear.filter(
			(group) =>
				group.yearLevel <= student.currentYear ||
				group.subjects.some((subject) => subject.state !== 'NOT_STARTED')
		)
	);

	let selectedYearLevel = $state<number | null>(null);

	const effectiveSelectedYearLevel = $derived(
		selectedYearLevel ?? visibleSubjectsByYear[0]?.yearLevel ?? student.currentYear
	);

	const selectedYear = $derived(
		visibleSubjectsByYear.find((group) => group.yearLevel === effectiveSelectedYearLevel) ??
			visibleSubjectsByYear[0]
	);

	const yearCards = $derived(
		visibleSubjectsByYear.map((group) => ({
			yearLevel: group.yearLevel,
			total: group.subjects.length,
			approved: group.subjects.filter((subject) => subject.state === 'APPROVED').length,
			regular: group.subjects.filter((subject) => subject.state === 'REGULAR').length,
			taking: group.subjects.filter(
				(subject) => subject.state === 'TAKING' || subject.state === 'RETAKING'
			).length,
			pending: group.subjects.filter((subject) => subject.state === 'NOT_STARTED').length,
			approvable: group.subjects.filter((subject) => subject.state !== 'APPROVED').length
		}))
	);

	const summaryCards = $derived([
		{
			label: 'Aprobadas',
			value: metrics.approved
		},
		{
			label: 'Cursando',
			value: metrics.taking
		},
		{
			label: 'Recursando',
			value: metrics.retaking
		},
		{
			label: 'Adeuda final',
			value: metrics.pendingFinals
		},
		{
			label: 'Regularidad vencida',
			value: metrics.expiredRegularities
		},
		{
			label: 'Libre',
			value: metrics.free
		}
	]);
</script>

<svelte:head>
	<title>Trayectoria académica | {student.fullName}</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-8">
		<div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Trayectoria académica</p>

				<h1 class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
					{student.fullName}
				</h1>

				<div class="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-400">
					<span>DNI: {student.dni}</span>
					<span aria-hidden="true">·</span>
					<span>{student.career.name}</span>

					{#if student.location}
						<span aria-hidden="true">·</span>
						<span>Sede: {student.location.name}</span>
					{/if}
				</div>

				<div class="mt-4 flex flex-wrap gap-2">
					<span class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
						Año administrativo: {student.currentYear}°
					</span>

					{#if trajectory.studyPlan}
						<span class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
							{trajectory.studyPlan.name}
						</span>
					{/if}
				</div>
			</div>

			<div class="flex flex-wrap gap-2">
				<a
					href={resolve(`/alumnos/${student.id}/historial`)}
					class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
				>
					← Volver al legajo
				</a>

				<a
					href={resolve('/alumnos')}
					class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
				>
					Alumnos
				</a>
			</div>
		</div>
	</section>

	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
		{#each summaryCards as card (card.label)}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
				<p class="text-xs text-slate-500">{card.label}</p>
				<p class="mt-1 text-2xl font-bold text-white">{card.value}</p>
			</div>
		{/each}
	</section>

	<section>
		<div class="mb-4">
			<h2 class="text-lg font-semibold text-white">Años de la trayectoria</h2>
			<p class="mt-1 text-sm text-slate-400">
				Seleccioná un año para consultar o cargar rápidamente su situación académica.
			</p>
		</div>

		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{#each yearCards as year (year.yearLevel)}
				<TrajectoryYearCard
					{year}
					selected={effectiveSelectedYearLevel === year.yearLevel}
					canManage={data.canManageTrajectory}
					onSelect={() => {
						selectedYearLevel = year.yearLevel;
					}}
				/>
			{/each}
		</div>
	</section>

	{#if selectedYear}
		{#key selectedYear.yearLevel}
			<QuickAcademicYearEditor
				yearLevel={selectedYear.yearLevel}
				subjects={selectedYear.subjects}
				canManage={data.canManageTrajectory}
			/>
		{/key}

		<details class="rounded-2xl border border-slate-800 bg-slate-950/40">
			<summary class="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-300">
				Ver historial y detalles de {selectedYear.yearLevel}° año
			</summary>

			<div class="border-t border-slate-800 p-4">
				<TrajectoryYearSection
					yearLevel={selectedYear.yearLevel}
					subjects={selectedYear.subjects}
				/>
			</div>
		</details>
	{/if}

	<section
		class="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-xs leading-5 text-slate-500"
	>
		<p>
			La carga rápida no modifica materias que ya tengan cursadas, regularidades, finales o
			acreditaciones. Esos antecedentes deben gestionarse desde su detalle para preservar la
			historia académica.
		</p>
	</section>
</div>
