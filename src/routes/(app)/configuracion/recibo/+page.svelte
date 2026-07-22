<script lang="ts">
	let institutionName = $state('Instituto Freire');
	let institutionAddress = $state('');
	let institutionCuit = $state('');
	let institutionPhone = $state('');
	let receiptHeader = $state('');
	let receiptFooter = $state('Comprobante de pago emitido por el sistema.');
	let receiptLetter = $state('C');
</script>

<svelte:head>
	<title>Configurar Recibo | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8">
	<div>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Configuración</p>
		<h1 class="text-3xl font-bold">Recibo</h1>
		<p class="mt-2 text-sm text-slate-400">
			Completa los campos para modificar la información que se muestra en el recibo de pago.
		</p>
	</div>

	<form class="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 dark:border-slate-700">
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="institutionName" class="mb-2 block text-sm font-medium text-slate-300">
					Nombre de la institución
				</label>
				<input
					id="institutionName"
					type="text"
					bind:value={institutionName}
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
					bind:value={institutionCuit}
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
					bind:value={institutionAddress}
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
					bind:value={institutionPhone}
					class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 focus:border-indigo-500 focus:outline-none"
				/>
			</div>

			<div>
				<label for="receiptLetter" class="mb-2 block text-sm font-medium text-slate-300">
					Letra del recibo
				</label>
				<select
					id="receiptLetter"
					bind:value={receiptLetter}
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
				bind:value={receiptHeader}
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
				bind:value={receiptFooter}
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
