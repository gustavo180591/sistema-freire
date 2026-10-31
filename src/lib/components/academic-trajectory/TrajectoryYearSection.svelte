<script lang="ts">
	import TrajectorySubjectRow from './TrajectorySubjectRow.svelte';
	import type { AcademicTrajectorySubject } from '$lib/types/academic-trajectory';

	let {
		yearLevel,
		subjects
	}: {
		yearLevel: number;
		subjects: AcademicTrajectorySubject[];
	} = $props();

	const completedCount = $derived(
		subjects.filter((subject) => subject.state === 'APPROVED').length
	);
</script>

<section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
	<header
		class="flex flex-col gap-2 border-b border-slate-800 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<h2 class="text-lg font-semibold text-white">{yearLevel}° año</h2>
			<p class="mt-1 text-sm text-slate-500">
				{subjects.length} materias del trayecto curricular
			</p>
		</div>

		<p class="text-sm text-slate-400">
			<span class="font-semibold text-white">{completedCount}</span>
			aprobada{completedCount === 1 ? '' : 's'}
		</p>
	</header>

	<div>
		{#each subjects as subject (subject.id)}
			<TrajectorySubjectRow {subject} />
		{/each}
	</div>
</section>
