<script lang="ts">
	import type { AcademicTrajectorySubjectState } from '$lib/types/academic-trajectory';

	let { state }: { state: AcademicTrajectorySubjectState } = $props();

	const labels: Record<AcademicTrajectorySubjectState, string> = {
		APPROVED: 'Aprobada',
		TAKING: 'Cursando',
		RETAKING: 'Recursando',
		REGULAR: 'Regular · final pendiente',
		REGULAR_EXPIRED: 'Regularidad vencida',
		FREE: 'Libre',
		NOT_STARTED: 'Sin cursar'
	};

	const classes: Record<AcademicTrajectorySubjectState, string> = {
		APPROVED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
		TAKING: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
		RETAKING: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
		REGULAR: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
		REGULAR_EXPIRED: 'border-red-500/30 bg-red-500/10 text-red-300',
		FREE: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
		NOT_STARTED: 'border-slate-700 bg-slate-800/60 text-slate-400'
	};
</script>

<span class={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes[state]}`}>
	{labels[state]}
</span>
