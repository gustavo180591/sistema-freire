<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
	
	// Estado para las pestañas de sedes
	let activeSede = $state<'alem' | 'capiovi'>('alem');
	
	// Configuración por defecto
	const defaultConfig = {
		alem: {
			lengua: { normal: 25000, becado: 0, recursante: 15000 },
			matematicas: { normal: 28000, becado: 0, recursante: 17000 }
		},
		capiovi: {
			lengua: { normal: 23000, becado: 0, recursante: 14000 }
		}
	};
	
	// Fechas y recargos
	let dueDay = $state(10);
	let lateFeePercent = $state(10); // Recargo después del 10
	let overdueFeePercent = $state(20); // Recargo mes vencido
</script>

<svelte:head>
	<title>Configuración de Cuotas | Instituto Paulo Freire</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Área financiera</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Configuración de Cuotas</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Configure los montos de cuotas por sede, carrera y tipo de alumno. Defina fechas de vencimiento y recargos.
		</p>
	</section>

	<!-- Tabs de Sedes -->
	<div class="flex gap-4 border-b border-slate-800">
		<button
			onclick={() => activeSede = 'alem'}
			class="px-6 py-4 text-sm font-medium transition-colors {activeSede === 'alem' ? 'border-b-2 border-white text-white' : 'text-slate-400 hover:text-slate-300'}"
		>
			Sede Alem
			<span class="ml-2 text-xs text-slate-500">(Lengua + Matemáticas)</span>
		</button>
		<button
			onclick={() => activeSede = 'capiovi'}
			class="px-6 py-4 text-sm font-medium transition-colors {activeSede === 'capiovi' ? 'border-b-2 border-white text-white' : 'text-slate-400 hover:text-slate-300'}"
		>
			Sede Capioví
			<span class="ml-2 text-xs text-slate-500">(Lengua)</span>
		</button>
	</div>

	<form method="POST" action="?/save" use:enhance class="space-y-8">
		<input type="hidden" name="sede" value={activeSede} />

		<!-- Configuración por Carrera -->
		<section class="grid gap-6 md:grid-cols-2">
			{#if activeSede === 'alem'}
				<!-- Carrera: Lengua -->
				<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
					<h3 class="mb-6 text-lg font-semibold">Profesorado de Lengua</h3>
					<div class="space-y-4">
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Normal</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="alem_lengua_normal"
									value={defaultConfig.alem.lengua.normal}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
						</div>
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Becado</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="alem_lengua_becado"
									value={defaultConfig.alem.lengua.becado}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
							<p class="mt-1 text-xs text-slate-500">Exento de pago (beca completa)</p>
						</div>
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Recursante</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="alem_lengua_recursante"
									value={defaultConfig.alem.lengua.recursante}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- Carrera: Matemáticas -->
				<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
					<h3 class="mb-6 text-lg font-semibold">Profesorado de Matemáticas</h3>
					<div class="space-y-4">
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Normal</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="alem_matematicas_normal"
									value={defaultConfig.alem.matematicas.normal}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
						</div>
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Becado</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="alem_matematicas_becado"
									value={defaultConfig.alem.matematicas.becado}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
							<p class="mt-1 text-xs text-slate-500">Exento de pago (beca completa)</p>
						</div>
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Recursante</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="alem_matematicas_recursante"
									value={defaultConfig.alem.matematicas.recursante}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- Sede Capioví: Solo Lengua -->
				<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:col-span-2">
					<h3 class="mb-6 text-lg font-semibold">Profesorado de Lengua</h3>
					<div class="grid gap-4 md:grid-cols-3">
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Normal</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="capiovi_lengua_normal"
									value={defaultConfig.capiovi.lengua.normal}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
						</div>
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Becado</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="capiovi_lengua_becado"
									value={defaultConfig.capiovi.lengua.becado}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
							<p class="mt-1 text-xs text-slate-500">Exento de pago</p>
						</div>
						<div>
							<label class="mb-2 block text-sm text-slate-400">Alumno Recursante</label>
							<div class="relative">
								<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
								<input
									type="number"
									name="capiovi_lengua_recursante"
									value={defaultConfig.capiovi.lengua.recursante}
									class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-8 pr-4 text-white outline-none focus:border-slate-500"
								/>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</section>

		<!-- Configuración de Fechas y Recargos -->
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<h3 class="mb-6 text-lg font-semibold">Fechas de Vencimiento y Recargos</h3>
			<div class="grid gap-6 md:grid-cols-3">
				<div>
					<label class="mb-2 block text-sm text-slate-400">Día de Vencimiento</label>
					<div class="relative">
						<input
							type="number"
							name="dueDay"
							value={dueDay}
							min="1"
							max="31"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 px-4 text-white outline-none focus:border-slate-500"
						/>
						<span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">de cada mes</span>
					</div>
					<p class="mt-1 text-xs text-slate-500">Fecha límite de pago sin recargo</p>
				</div>
				<div>
					<label class="mb-2 block text-sm text-slate-400">Recargo por Pago Tardío</label>
					<div class="relative">
						<input
							type="number"
							name="lateFeePercent"
							value={lateFeePercent}
							min="0"
							max="100"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 px-4 text-white outline-none focus:border-slate-500"
						/>
						<span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
					</div>
					<p class="mt-1 text-xs text-slate-500">Después del día de vencimiento</p>
				</div>
				<div>
					<label class="mb-2 block text-sm text-slate-400">Recargo por Mes Vencido</label>
					<div class="relative">
						<input
							type="number"
							name="overdueFeePercent"
							value={overdueFeePercent}
							min="0"
							max="100"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 px-4 text-white outline-none focus:border-slate-500"
						/>
						<span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
					</div>
					<p class="mt-1 text-xs text-slate-500">Cuota de mes(es) anterior(es)</p>
				</div>
			</div>
		</section>

		<!-- Acciones -->
		<div class="flex gap-4">
			<button
				type="submit"
				class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Guardar Configuración
			</button>
			<a
				href="/finanzas/configuracion/generar"
				class="rounded-2xl border border-emerald-500 px-6 py-3 font-semibold text-emerald-400 transition hover:bg-emerald-500/10"
			>
				Generar Cuotas Mensuales
			</a>
		</div>
	</form>
</div>
