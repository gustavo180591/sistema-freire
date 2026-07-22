<script lang="ts">
	let { data }: { data: { locations: { id: string; name: string; code: string }[] } } = $props();
	let locations = $derived(data.locations);

	let selectedLocationId = $state<string | null>(
		locations.length > 0 ? locations[0].id : null
	);

	let configs = $state<Record<string, any>>(() => {
		const initial: Record<string, any> = {};
		for (const location of locations) {
			initial[location.id] = {
				institutionName: 'Instituto Freire',
				institutionAddress: '',
				institutionCuit: '',
				institutionPhone: '',
				receiptHeader: '',
				receiptFooter: 'Comprobante de pago emitido por el sistema.',
				receiptLetter: 'C'
			};
		}
		return initial;
	});

	let current = $derived(
		selectedLocationId ? configs[selectedLocationId] : null
	);

	let selectedLocation = $derived(
		locations.find((l) => l.id === selectedLocationId)
	);
</script>

<svelte:head>
	<title>Configurar Recibo | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8">
	<div>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Configuración</p>
		<h1 class="text-3xl font-bold">Recibo</h1>
		<p class="mt-2 text-sm text-slate-400">
			Seleccioná una localidad del menú para ver y editar su formato de recibo completo.
		</p>
	</div>

	{#if data.locations.length > 0}
		<div class="grid gap-6 lg:grid-cols-4">
			<aside class="space-y-3">
				<p class="text-sm font-medium text-slate-400">Localidades</p>
				<div class="space-y-2">
					{#each data.locations as location}
						<button
							type="button"
							onclick={() => (selectedLocationId = location.id)}
							class="w-full rounded-xl border px-4 py-2 text-left text-sm font-semibold transition {selectedLocationId === location.id ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-sky-500'}"
						>
							{location.name}
						</button>
					{/each}
				</div>
			</aside>

			{#if current}
				<div class="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 dark:border-slate-700 lg:col-span-3">
					<h2 class="text-xl font-bold text-white">
						{selectedLocation ? `Recibo - ${selectedLocation.name}` : 'Recibo'}
					</h2>
					<form class="space-y-6">
				<div class="grid gap-6 md:grid-cols-2">
					<div>
						<label for="institutionName" class="mb-2 block text-sm font-medium text-slate-300">
							Nombre de la institución
						</label>
						<input
							id="institutionName"
							type="text"
							bind:value={current.institutionName}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label for="institutionCuit" class="mb-2 block text-sm font-medium text-slate-300">
							CUIT / CUIL
						</label>
						<input
							id="institutionCuit"
							type="text"
							bind:value={current.institutionCuit}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label for="institutionAddress" class="mb-2 block text-sm font-medium text-slate-300">
							Dirección
						</label>
						<input
							id="institutionAddress"
							type="text"
							bind:value={current.institutionAddress}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label for="institutionPhone" class="mb-2 block text-sm font-medium text-slate-300">
							Teléfono
						</label>
						<input
							id="institutionPhone"
							type="text"
							bind:value={current.institutionPhone}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div>
						<label for="receiptLetter" class="mb-2 block text-sm font-medium text-slate-300">
							Letra del recibo
						</label>
						<select
							id="receiptLetter"
							bind:value={current.receiptLetter}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
						>
							<option value="A">A</option>
							<option value="B">B</option>
							<option value="C">C</option>
							<option value="X">X</option>
						</select>
					</div>
				</div>

				<div>
					<label for="receiptHeader" class="mb-2 block text-sm font-medium text-slate-300">
						Encabezado del recibo
					</label>
					<textarea
						id="receiptHeader"
						bind:value={current.receiptHeader}
						rows="3"
						class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					></textarea>
				</div>

				<div>
					<label for="receiptFooter" class="mb-2 block text-sm font-medium text-slate-300">
						Pie del recibo
					</label>
					<textarea
						id="receiptFooter"
						bind:value={current.receiptFooter}
						rows="3"
						class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
					></textarea>
				</div>

					<div class="flex justify-end">
						<button
							type="submit"
							class="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
						>
							Guardar configuración
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
{:else}
	<p class="text-slate-400">No hay localidades cargadas.</p>
{/if}
</div>
