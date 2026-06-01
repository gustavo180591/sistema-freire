<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">Horarios</h1>
			<p class="text-slate-400">Consulta tus horarios de clases</p>
		</div>

		<!-- Horarios por Comisión -->
		<div class="space-y-6">
			{#each data.commissions as commission}
				<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
					<div class="mb-4 flex items-start justify-between">
						<div>
							<h3 class="font-semibold text-white text-lg">{commission.subject}</h3>
							<p class="text-sm text-slate-400">{commission.name} - {commission.term}</p>
							<p class="text-xs text-slate-500 mt-1">Código: {commission.subjectCode}</p>
						</div>
						<div class="text-right">
							{#if commission.active}
								<span class="px-3 py-1 text-sm font-semibold rounded-full bg-green-500/20 text-green-400">
									Activa
								</span>
							{:else}
								<span class="px-3 py-1 text-sm font-semibold rounded-full bg-slate-500/20 text-slate-400">
									Inactiva
								</span>
							{/if}
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-3">
						<div class="bg-slate-800 rounded-xl p-4">
							<p class="text-slate-400 text-xs">Alumnos</p>
							<p class="text-2xl font-bold text-white">{commission.totalStudents}</p>
						</div>
						<div class="bg-slate-800 rounded-xl p-4">
							<p class="text-slate-400 text-xs">Ciclo</p>
							<p class="text-2xl font-bold text-white">{commission.term}</p>
						</div>
						<div class="bg-slate-800 rounded-xl p-4">
							<p class="text-slate-400 text-xs">Estado</p>
							<p class="text-2xl font-bold text-white">
								{commission.active ? 'Activa' : 'Inactiva'}
							</p>
						</div>
					</div>

					<!-- Nota sobre horarios -->
					<div class="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
						<p class="text-sm text-slate-400">
							<span class="font-semibold text-slate-300">Nota:</span> Los horarios específicos de clases se configuran a nivel institucional.
							Esta vista muestra las comisiones asignadas como docente.
						</p>
					</div>
				</div>
			{/each}

			{#if data.commissions.length === 0}
				<div class="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
					No tenés comisiones asignadas
				</div>
			{/if}
		</div>
	</div>
</div>
