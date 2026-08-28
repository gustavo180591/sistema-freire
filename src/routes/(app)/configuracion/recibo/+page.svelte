<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

	let {
		data,
		form
	}: {
		data: PageData;
		form?: {
			success?: boolean;
			error?: string;
			message?: string;
		};
	} = $props();

	let selectedLocationId = $state<string | null>(
		untrack(() => (data.locations.length > 0 ? data.locations[0].id : null))
	);

	let currentConfig = $derived(selectedLocationId ? data.configs[selectedLocationId] : null);

	let selectedLocation = $derived(
		data.locations.find((location) => location.id === selectedLocationId)
	);

	function formatReceiptNumber(value: number) {
		return Math.max(1, Number(value) || 1)
			.toString()
			.padStart(8, '0');
	}
</script>

<svelte:head>
	<title>Configurar Recibos | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Configuración</p>
		<h1 class="text-3xl font-bold text-white">Recibos por localidad</h1>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
			Configurá los datos institucionales, fiscales y la numeración independiente de los
			comprobantes emitidos en cada sede.
		</p>
	</div>

	{#if form?.error}
		<div
			role="alert"
			class="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300"
		>
			<p class="font-semibold">No se pudo guardar la configuración</p>
			<p class="mt-1">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div
			class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300"
		>
			{form.message ?? 'Configuración guardada correctamente.'}
		</div>
	{/if}

	{#if data.locations.length > 0}
		<div class="grid gap-6 lg:grid-cols-4">
			<aside class="space-y-3">
				<div>
					<p class="text-sm font-semibold text-slate-300">Localidades</p>
					<p class="mt-1 text-xs text-slate-500">
						Cada sede mantiene sus propios datos y numeración.
					</p>
				</div>

				<div class="space-y-2">
					{#each data.locations as location}
						<button
							type="button"
							onclick={() => (selectedLocationId = location.id)}
							class="w-full rounded-xl border px-4 py-3 text-left transition {selectedLocationId ===
							location.id
								? 'border-indigo-500 bg-indigo-500/10 text-white'
								: 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600'}"
						>
							<p class="font-semibold">{location.name}</p>
							<p class="mt-0.5 text-xs text-slate-500">{location.code}</p>
						</button>
					{/each}
				</div>
			</aside>

			{#if currentConfig && selectedLocation}
				{#key selectedLocationId}
					<div class="space-y-6 lg:col-span-3">
						<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
							<div class="mb-6">
								<p class="text-xs font-semibold tracking-[0.18em] text-indigo-400 uppercase">
									Configuración activa
								</p>
								<h2 class="mt-1 text-2xl font-bold text-white">
									Recibo · {selectedLocation.name}
								</h2>
							</div>

							<form method="POST" action="?/save" use:enhance class="space-y-8">
								<input type="hidden" name="locationId" value={selectedLocationId} />

								<section class="space-y-5">
									<div class="border-b border-slate-800 pb-3">
										<h3 class="font-semibold text-white">Datos institucionales</h3>
										<p class="mt-1 text-sm text-slate-500">
											Información que aparecerá en la cabecera del comprobante.
										</p>
									</div>

									<div class="grid gap-5 md:grid-cols-2">
										<div class="md:col-span-2">
											<label
												for="institutionName"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Nombre de la institución
											</label>
											<input
												id="institutionName"
												name="institutionName"
												type="text"
												required
												value={currentConfig.institutionName}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="institutionCode"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Nombre / código institucional
											</label>
											<input
												id="institutionCode"
												name="institutionCode"
												type="text"
												value={currentConfig.institutionCode}
												placeholder="PAULO FREIRE"
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="institutionCodeNumber"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Código numérico
											</label>
											<input
												id="institutionCodeNumber"
												name="institutionCodeNumber"
												type="text"
												value={currentConfig.institutionCodeNumber}
												placeholder="1117"
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="institutionOwner"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Entidad propietaria
											</label>
											<input
												id="institutionOwner"
												name="institutionOwner"
												type="text"
												value={currentConfig.institutionOwner}
												placeholder="SIDEPP"
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="institutionAddress"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Dirección de la sede
											</label>
											<input
												id="institutionAddress"
												name="institutionAddress"
												type="text"
												value={currentConfig.institutionAddress}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="institutionPhone"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Teléfono
											</label>
											<input
												id="institutionPhone"
												name="institutionPhone"
												type="text"
												value={currentConfig.institutionPhone}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="institutionEmail"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Correo electrónico
											</label>
											<input
												id="institutionEmail"
												name="institutionEmail"
												type="email"
												value={currentConfig.institutionEmail}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div class="md:col-span-2">
											<label
												for="institutionWebsite"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Sitio web
											</label>
											<input
												id="institutionWebsite"
												name="institutionWebsite"
												type="text"
												value={currentConfig.institutionWebsite}
												placeholder="isfdpaulofreire-mis.infd.edu.ar"
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>
									</div>
								</section>

								<section class="space-y-5">
									<div class="border-b border-slate-800 pb-3">
										<h3 class="font-semibold text-white">Datos fiscales</h3>
										<p class="mt-1 text-sm text-slate-500">
											Datos impositivos impresos en el recibo.
										</p>
									</div>

									<div class="grid gap-5 md:grid-cols-2">
										<div>
											<label
												for="institutionCuit"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												CUIT
											</label>
											<input
												id="institutionCuit"
												name="institutionCuit"
												type="text"
												value={currentConfig.institutionCuit}
												placeholder="30-71005164-6"
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label for="taxStatus" class="mb-2 block text-sm font-medium text-slate-300">
												Condición frente al IVA
											</label>
											<input
												id="taxStatus"
												name="taxStatus"
												type="text"
												value={currentConfig.taxStatus}
												placeholder="IVA EXENTO"
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="grossIncome"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Ingresos Brutos
											</label>
											<input
												id="grossIncome"
												name="grossIncome"
												type="text"
												value={currentConfig.grossIncome}
												placeholder="Número de Ingresos Brutos"
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="activityStartDate"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Inicio de actividades
											</label>
											<input
												id="activityStartDate"
												name="activityStartDate"
												type="date"
												value={currentConfig.activityStartDate}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>
									</div>
								</section>

								<section class="space-y-5">
									<div class="border-b border-slate-800 pb-3">
										<h3 class="font-semibold text-white">Numeración del comprobante</h3>
										<p class="mt-1 text-sm text-slate-500">
											La numeración se administra de forma independiente para cada localidad.
										</p>
									</div>

									<div class="grid gap-5 md:grid-cols-3">
										<div>
											<label
												for="receiptLetter"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Letra
											</label>
											<select
												id="receiptLetter"
												name="receiptLetter"
												value={currentConfig.receiptLetter}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											>
												<option value="A">A</option>
												<option value="B">B</option>
												<option value="C">C</option>
												<option value="X">X</option>
											</select>
										</div>

										<div>
											<label
												for="pointOfSale"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Punto de venta
											</label>
											<input
												id="pointOfSale"
												name="pointOfSale"
												type="text"
												inputmode="numeric"
												pattern="[0-9][0-9][0-9][0-9]"
												maxlength="4"
												required
												value={currentConfig.pointOfSale}
												placeholder="0002"
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="nextReceiptNumber"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Próximo número
											</label>
											<input
												id="nextReceiptNumber"
												readonly
												type="number"
												min="1"
												max="99999999"
												step="1"
												value={currentConfig.nextReceiptNumber}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>
									</div>

									<div class="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
										<p class="text-xs font-semibold tracking-[0.16em] text-indigo-300 uppercase">
											Vista previa
										</p>

										<div class="mt-3 flex flex-wrap items-center gap-3">
											<div
												class="flex h-12 w-12 items-center justify-center border-2 border-slate-400 text-xl font-bold text-white"
											>
												{currentConfig.receiptLetter || 'C'}
											</div>

											<div>
												<p class="text-sm font-bold text-white">RECIBO</p>
												<p class="font-mono text-lg font-semibold text-slate-200">
													Nº {currentConfig.pointOfSale || '0001'} -
													{formatReceiptNumber(currentConfig.nextReceiptNumber)}
												</p>
											</div>
										</div>

										<p class="mt-3 text-xs leading-5 text-slate-500">
											Una vez emitidos comprobantes, el sistema no permitirá retroceder la
											numeración de ese punto de venta.
										</p>
									</div>
								</section>

								<section class="space-y-5">
									<div class="border-b border-slate-800 pb-3">
										<h3 class="font-semibold text-white">Textos adicionales</h3>
									</div>

									<div>
										<label
											for="receiptHeader"
											class="mb-2 block text-sm font-medium text-slate-300"
										>
											Encabezado adicional
										</label>
										<textarea
											id="receiptHeader"
											name="receiptHeader"
											rows="3"
											value={currentConfig.receiptHeader}
											placeholder="Texto opcional para mostrar debajo de la cabecera institucional."
											class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
										></textarea>
									</div>

									<div>
										<label
											for="receiptFooter"
											class="mb-2 block text-sm font-medium text-slate-300"
										>
											Pie del recibo
										</label>
										<textarea
											id="receiptFooter"
											name="receiptFooter"
											rows="3"
											value={currentConfig.receiptFooter}
											placeholder="Texto opcional para imprimir al final del comprobante."
											class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
										></textarea>
									</div>
								</section>

								<section class="space-y-5">
									<div class="border-b border-slate-800 pb-3">
										<h3 class="font-semibold text-white">Firmas</h3>
										<p class="mt-1 text-sm text-slate-500">
											Textos que aparecerán debajo de las líneas de firma.
										</p>
									</div>

									<div class="grid gap-5 md:grid-cols-2">
										<div>
											<label
												for="signatureLeftLabel"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Firma izquierda
											</label>
											<input
												id="signatureLeftLabel"
												name="signatureLeftLabel"
												type="text"
												value={currentConfig.signatureLeftLabel}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>

										<div>
											<label
												for="signatureRightLabel"
												class="mb-2 block text-sm font-medium text-slate-300"
											>
												Firma derecha
											</label>
											<input
												id="signatureRightLabel"
												name="signatureRightLabel"
												type="text"
												value={currentConfig.signatureRightLabel}
												class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 outline-none focus:border-indigo-500"
											/>
										</div>
									</div>
								</section>

								<div class="flex justify-end border-t border-slate-800 pt-6">
									<button
										type="submit"
										class="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
									>
										Guardar configuración
									</button>
								</div>
							</form>
						</div>
					</div>
				{/key}
			{/if}
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-400">
			No hay localidades activas cargadas.
		</div>
	{/if}
</div>
