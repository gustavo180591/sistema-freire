<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-white">Horarios</h1>
			<p class="text-slate-400">Consulta tus horarios de clases</p>
		</div>

		<!-- Horarios por Materia -->
		<div class="space-y-6">
			{#each data.subjects as subject}
				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
					<div class="mb-4 flex items-start justify-between">
						<div>
							<h3 class="text-lg font-semibold text-white">{subject.name}</h3>
							<p class="text-sm text-slate-400">{subject.code} - {subject.yearLevel}° Año</p>
							<p class="mt-1 text-xs text-slate-500">Carreras: {subject.careers.join(', ')}</p>
						</div>
						<div class="text-right">
							<span
								class="rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-400"
							>
								Activa
							</span>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-3">
						<div class="rounded-xl bg-slate-800 p-4">
							<p class="text-xs text-slate-400">Alumnos</p>
							<p class="text-2xl font-bold text-white">{subject.totalStudents}</p>
						</div>
						<div class="rounded-xl bg-slate-800 p-4">
							<p class="text-xs text-slate-400">Año</p>
							<p class="text-2xl font-bold text-white">{subject.yearLevel}°</p>
						</div>
						<div class="rounded-xl bg-slate-800 p-4">
							<p class="text-xs text-slate-400">Estado</p>
							<p class="text-2xl font-bold text-white">Activa</p>
						</div>
					</div>

					<!-- Nota sobre horarios -->
					<div class="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
						<p class="text-sm text-slate-400">
							<span class="font-semibold text-slate-300">Nota:</span> Los horarios específicos de clases
							se configuran a nivel institucional. Esta vista muestra las materias asignadas como docente.
						</p>
					</div>
				</div>
			{/each}

			{#if data.subjects.length === 0}
				<div
					class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400"
				>
					No tenés materias asignadas
				</div>
			{/if}
		</div>
	</div>
</div>
