<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedTeacher = $state('');
	let selectedMonth = $state('');
	let selectedYear = $state('');
	let amount = $state('');
	let status = $state('PENDING');
	let notes = $state('');
	let selectedFile = $state<File | null>(null);
	let isDragging = $state(false);

	const months = [
		{ value: '1', label: 'Enero' },
		{ value: '2', label: 'Febrero' },
		{ value: '3', label: 'Marzo' },
		{ value: '4', label: 'Abril' },
		{ value: '5', label: 'Mayo' },
		{ value: '6', label: 'Junio' },
		{ value: '7', label: 'Julio' },
		{ value: '8', label: 'Agosto' },
		{ value: '9', label: 'Septiembre' },
		{ value: '10', label: 'Octubre' },
		{ value: '11', label: 'Noviembre' },
		{ value: '12', label: 'Diciembre' }
	];

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
	<title>Cargar recibo de sueldo | Instituto ISFD "PAULO FREIRE" 1117</title>
	<meta name="description" content="Carga de recibos de sueldo docentes" />
</svelte:head>

<div class="max-w-4xl space-y-8">
	<section>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Docentes · Haberes</p>
		<h1 class="mt-2 text-4xl font-bold tracking-tight">Cargar recibo de sueldo</h1>
		<p class="mt-3 text-sm text-slate-400">
			Complete el formulario para cargar un nuevo recibo de sueldo. El archivo PDF se almacenará de
			forma segura y solo podrá ser accedido por el docente correspondiente.
		</p>
	</section>

	{#if form?.error}
		<div class="rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-red-400">
			<p class="font-semibold">{form.error}</p>
		</div>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance
		class="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
	>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">
					Docente <span class="text-red-400">*</span>
				</label>
				<select
					name="teacherId"
					bind:value={selectedTeacher}
					required
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition outline-none focus:border-indigo-500"
				>
					<option value="">Seleccionar docente...</option>
					{#each data.teachers as teacher}
						<option value={teacher.id}>
							{teacher.user.lastName}, {teacher.user.firstName} ({teacher.user.email})
						</option>
					{/each}
				</select>
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

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">
					Mes <span class="text-red-400">*</span>
				</label>
				<select
					name="periodMonth"
					bind:value={selectedMonth}
					required
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition outline-none focus:border-indigo-500"
				>
					<option value="">Seleccionar mes...</option>
					{#each months as month}
						<option value={month.value}>{month.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="mb-2 block text-sm font-medium text-slate-300">
					Año <span class="text-red-400">*</span>
				</label>
				<select
					name="periodYear"
					bind:value={selectedYear}
					required
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 transition outline-none focus:border-indigo-500"
				>
					<option value="">Seleccionar año...</option>
					{#each data.years as year}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</div>

			<div class="md:col-span-2">
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
		</div>

		<div>
			<label class="mb-2 block text-sm font-medium text-slate-300">
				Archivo PDF <span class="text-red-400">*</span>
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
				disabled={!selectedTeacher || !selectedMonth || !selectedYear || !amount || !selectedFile}
				class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Cargar recibo
			</button>
		</div>
	</form>
</div>
