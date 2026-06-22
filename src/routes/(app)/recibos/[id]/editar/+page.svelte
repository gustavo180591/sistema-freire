<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const payslip = $derived(data.payslip);

	let amount = $state(String(payslip.amount));
	let status = $state(payslip.status);
	let notes = $state(payslip.notes || '');
	let selectedFile = $state<File | null>(null);
	let isDragging = $state(false);

	const statuses = [
		{ value: 'PENDING', label: 'Pendiente' },
		{ value: 'PAID', label: 'Pagado' },
		{ value: 'CANCELLED', label: 'Cancelado' }
	];

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			if (file.type !== 'application/pdf') {
				alert('Solo se permiten archivos PDF');
				return;
			}
			if (file.size > 10 * 1024 * 1024) {
				alert('El archivo no puede superar los 10MB');
				return;
			}
			selectedFile = file;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
			const file = event.dataTransfer.files[0];
			if (file.type !== 'application/pdf') {
				alert('Solo se permiten archivos PDF');
				return;
			}
			if (file.size > 10 * 1024 * 1024) {
				alert('El archivo no puede superar los 10MB');
				return;
			}
			selectedFile = file;
		}
	}

	function removeFile() {
		selectedFile = null;
	}
</script>

<svelte:head>
	<title>Editar recibo de sueldo | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Edición de recibo de sueldo docente" />
</svelte:head>

<div class="max-w-4xl space-y-8">
	<section>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Docentes · Haberes</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Editar recibo de sueldo</h1>
		<p class="mt-3 text-sm text-slate-400">
			Período: {String(data.payslip.periodMonth).padStart(2, '0')}/{data.payslip.periodYear} · Docente:
			{data.payslip.teacher.user.firstName}
			{data.payslip.teacher.user.lastName}
		</p>
	</section>

	{#if form?.success}
		<div class="rounded-2xl border border-green-900/50 bg-green-950/30 p-4 text-green-400">
			<p class="font-semibold">{form.message}</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
			<p class="font-semibold">{form.error}</p>
		</div>
	{/if}

	<!-- Formulario de actualización de datos -->
	<form
		method="POST"
		action="?/update"
		use:enhance
		class="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
	>
		<h2 class="text-xl font-semibold">Actualizar datos</h2>

		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">
					Importe (ARS) <span class="text-red-400">*</span>
				</label>
				<input
					type="number"
					name="amount"
					bind:value={amount}
					required
					min="0"
					step="0.01"
					placeholder="0.00"
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition outline-none focus:border-indigo-500"
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">
					Estado <span class="text-red-400">*</span>
				</label>
				<select
					name="status"
					bind:value={status}
					required
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition outline-none focus:border-indigo-500"
				>
					{#each statuses as s}
						<option value={s.value}>{s.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<div>
			<label class="mb-2 block text-sm font-medium text-slate-300">Notas (opcional)</label>
			<textarea
				name="notes"
				bind:value={notes}
				rows="3"
				placeholder="Observaciones adicionales sobre el recibo..."
				class="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition outline-none focus:border-indigo-500"
			></textarea>
		</div>

		<div class="flex items-center justify-end gap-4">
			<a
				href="/recibos"
				class="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
			>
				Cancelar
			</a>
			<button
				type="submit"
				class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
			>
				Guardar cambios
			</button>
		</div>
	</form>

	<!-- Formulario de reemplazo de archivo -->
	<form
		method="POST"
		action="?/replaceFile"
		enctype="multipart/form-data"
		use:enhance
		class="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
	>
		<h2 class="text-xl font-semibold">Reemplazar archivo PDF</h2>
		<p class="text-sm text-slate-400">
			Esta acción reemplazará el archivo PDF actual. El archivo anterior será eliminado
			permanentemente.
		</p>

		<div>
			<label class="mb-2 block text-sm font-medium text-slate-300">
				Nuevo archivo PDF <span class="text-red-400">*</span>
			</label>
			<div
				class="relative rounded-2xl border-2 border-dashed transition {isDragging
					? 'border-indigo-500 bg-indigo-950/20'
					: 'border-slate-700 bg-slate-950/50 hover:border-slate-600'}"
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
			>
				{#if selectedFile}
					<div class="flex items-center justify-between p-6">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-950/50 text-indigo-400"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
									<polyline points="14 2 14 8 20 8" />
								</svg>
							</div>
							<div>
								<p class="text-sm font-medium text-slate-200">{selectedFile.name}</p>
								<p class="text-xs text-slate-400">
									{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
								</p>
							</div>
						</div>
						<button
							type="button"
							onclick={removeFile}
							class="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-red-900/50 hover:bg-red-950/30 hover:text-red-400"
						>
							Remover
						</button>
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center p-8">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="17 8 12 3 7 8" />
								<line x1="12" y1="3" x2="12" y2="15" />
							</svg>
						</div>
						<p class="text-sm text-slate-400">
							Arrastra un archivo PDF aquí o
							<label class="cursor-pointer text-indigo-400 hover:text-indigo-300">
								haz clic para seleccionar
								<input
									type="file"
									accept=".pdf,application/pdf"
									oninput={handleFileSelect}
									class="hidden"
								/>
							</label>
						</p>
						<p class="mt-2 text-xs text-slate-500">Máximo 10MB</p>
					</div>
				{/if}
				<input type="file" name="file" accept=".pdf,application/pdf" class="hidden" />
			</div>
		</div>

		<div class="flex items-center justify-end gap-4">
			<button
				type="submit"
				disabled={!selectedFile}
				class="rounded-2xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Reemplazar archivo
			</button>
		</div>
	</form>

	<!-- Formulario de eliminación -->
	<form
		method="POST"
		action="?/delete"
		use:enhance
		class="space-y-6 rounded-3xl border border-red-900/50 bg-red-950/30 p-8"
	>
		<h2 class="text-xl font-semibold text-red-400">Eliminar recibo</h2>
		<p class="text-sm text-slate-400">
			Esta acción eliminará el recibo de forma lógica. El archivo PDF será eliminado permanentemente
			y no se podrá recuperar.
		</p>

		<div class="flex items-center justify-end gap-4">
			<button
				type="submit"
				class="rounded-2xl border border-red-900/50 bg-red-950/50 px-6 py-3 text-sm font-semibold text-red-400 transition hover:border-red-900 hover:bg-red-950"
			>
				Eliminar recibo
			</button>
		</div>
	</form>
</div>
