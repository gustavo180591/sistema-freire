<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const MONTHS = data.months;
</script>

<svelte:head>
	<title>Configuración de Cuotas | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Configuración</p>
			<h1 class="text-3xl font-bold">Cuotas y Beneficios</h1>
		</div>
		<a
			href="/configuracion"
			class="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
		>
			Volver
		</a>
	</div>

	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 dark:border-slate-700">
		<h2 class="mb-6 text-2xl font-bold text-white">Configuración de Cuotas y Beneficios</h2>
		<p class="mb-8 text-slate-400">
			Configura los montos de cuotas por tipo de alumno, inscripción y los meses donde aplican los beneficios.
		</p>

		<form method="POST" class="space-y-8">
			<!-- Montos por Tipo de Alumno -->
			<div class="space-y-6">
				<h3 class="text-lg font-semibold text-white">Montos de Cuotas</h3>
				
				<div class="grid gap-6 md:grid-cols-3">
					<!-- Cuota Normal -->
					<div>
						<label for="normalFeeAmount" class="mb-2 block text-sm font-medium text-slate-300">
							Cuota Normal
						</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
							<input
								id="normalFeeAmount"
								name="normalFeeAmount"
								type="number"
								min="0"
								value={data.config.normalFeeAmount}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pl-8 text-white outline-none focus:border-indigo-500 dark:border-slate-600"
								required
							/>
						</div>
						<p class="mt-2 text-xs text-slate-500">Monto para alumnos sin beneficios</p>
					</div>

					<!-- Cuota Becado -->
					<div>
						<label for="becadoFeeAmount" class="mb-2 block text-sm font-medium text-slate-300">
							Cuota Becado
						</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
							<input
								id="becadoFeeAmount"
								name="becadoFeeAmount"
								type="number"
								min="0"
								value={data.config.becadoFeeAmount}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pl-8 text-white outline-none focus:border-indigo-500 dark:border-slate-600"
								required
							/>
						</div>
						<p class="mt-2 text-xs text-slate-500">Monto para alumnos con beca</p>
					</div>

					<!-- Cuota Recursante -->
					<div>
						<label for="recursantFeeAmount" class="mb-2 block text-sm font-medium text-slate-300">
							Cuota Recursante
						</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
							<input
								id="recursantFeeAmount"
								name="recursantFeeAmount"
								type="number"
								min="0"
								value={data.config.recursantFeeAmount}
								class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pl-8 text-white outline-none focus:border-indigo-500 dark:border-slate-600"
								required
							/>
						</div>
						<p class="mt-2 text-xs text-slate-500">Monto para alumnos recursantes</p>
					</div>
				</div>

				<!-- Inscripción -->
				<div>
					<label for="enrollmentAmount" class="mb-2 block text-sm font-medium text-slate-300">
						Monto de Inscripción
					</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
						<input
							id="enrollmentAmount"
							name="enrollmentAmount"
							type="number"
							min="0"
							value={data.config.enrollmentAmount}
							class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pl-8 text-white outline-none focus:border-indigo-500 dark:border-slate-600"
							required
						/>
					</div>
					<p class="mt-2 text-xs text-slate-500">Monto de la inscripción anual</p>
				</div>
			</div>

			<!-- Configuración de Beneficios -->
			<div class="space-y-6">
				<h3 class="text-lg font-semibold text-white">Configuración de Beneficios</h3>

				<!-- Meses con Beneficios -->
				<div>
					<label class="mb-3 block text-sm font-medium text-slate-300">
						Meses donde aplican beneficios
					</label>
					<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
						{#each MONTHS as month}
							<label class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 p-3 transition hover:border-indigo-500 dark:border-slate-600">
								<input
									type="checkbox"
									name="month_{month.value}"
									checked={data.config.benefitsMonths.includes(month.value)}
									class="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
								/>
								<span class="text-sm text-slate-300">{month.name}</span>
							</label>
						{/each}
					</div>
					<p class="mt-2 text-xs text-slate-500">
						Selecciona los meses del año donde se aplican los beneficios de beca y recursante
					</p>
				</div>
			</div>

			<!-- Mensajes de error/éxito -->
			{#if form?.error}
				<div class="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
					{form.error}
				</div>
			{/if}

			{#if form?.success}
				<div class="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-emerald-400">
					Configuración guardada exitosamente.
				</div>
			{/if}

			<!-- Botón Guardar -->
			<div class="flex justify-end">
				<button
					type="submit"
					class="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
				>
					Guardar Configuración
				</button>
			</div>
		</form>
	</div>
</div>
