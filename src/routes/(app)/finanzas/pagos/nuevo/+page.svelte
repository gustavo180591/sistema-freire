<script lang="ts">
	let { data } = $props();

	const students = $derived(data?.students ?? []);
	const pendingCharges = $derived(data?.pendingCharges ?? []);

	let studentId = $state('');
	let amount = $state<number | ''>('');
	let method = $state('CASH');
	let reference = $state('');
	let notes = $state('');
</script>

<svelte:head>
	<title>Nuevo pago | Instituto Paulo Freire</title>
	<meta name="description" content="Registro manual de pagos institucionales" />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8">
	<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Área financiera</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Registrar pago</h1>
		<p class="mt-3 max-w-3xl text-sm text-slate-400">
			Registrá un pago manual y asociá el importe a cargos pendientes del alumno. El sistema podrá
			imputarlo total o parcialmente y actualizar su estado financiero.
		</p>
	</section>

	<form method="POST" class="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Alumno</label>
				<select
					bind:value={studentId}
					name="studentId"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value="">Seleccionar alumno</option>
					{#each students as student}
						<option value={student.id}>{student.fullName}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Importe</label>
				<input
					bind:value={amount}
					name="amount"
					type="number"
					min="1"
					step="0.01"
					placeholder="15000"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Método</label>
				<select
					bind:value={method}
					name="method"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
				>
					<option value="CASH">Efectivo</option>
					<option value="BANK_TRANSFER">Transferencia</option>
					<option value="DEBIT_CARD">Tarjeta débito</option>
					<option value="CREDIT_CARD">Tarjeta crédito</option>
					<option value="QR">QR</option>
				</select>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">Referencia</label>
				<input
					bind:value={reference}
					name="reference"
					placeholder="Comprobante / operación"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
				/>
			</div>
		</div>

		<div>
			<label class="mb-2 block text-sm font-medium text-slate-300">Observaciones</label>
			<textarea
				bind:value={notes}
				name="notes"
				rows="4"
				class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-500"
			></textarea>
		</div>

		<div class="rounded-2xl border border-slate-800 bg-slate-950 p-5">
			<h2 class="text-lg font-semibold">Cargos pendientes detectados</h2>
			<div class="mt-4 space-y-3 text-sm text-slate-400">
				{#if pendingCharges.length === 0}
					<p>No hay cargos cargados o se mostrarán al seleccionar alumno.</p>
				{:else}
					{#each pendingCharges as charge}
						<div
							class="flex items-center justify-between rounded-xl border border-slate-800 px-4 py-3"
						>
							<span>{charge.periodLabel} · {charge.concept}</span>
							<span>${charge.pending}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<div class="flex items-center justify-end gap-3">
			<a
				href="/finanzas"
				class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
			>
				Cancelar
			</a>
			<button
				type="submit"
				class="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
			>
				Registrar pago
			</button>
		</div>
	</form>
</div>
