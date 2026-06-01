<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedCommission = $state<string>('');
	let title = $state<string>('');
	let description = $state<string>('');
	let file = $state<File | null>(null);
	let formError = $state<string>('');
	let formSuccess = $state<string>('');

	function resetForm() {
		selectedCommission = '';
		title = '';
		description = '';
		file = null;
		formError = '';
		formSuccess = '';
	}

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			file = target.files[0];
		}
	}

	function formatFileSize(bytes: number | null | undefined): string {
		if (!bytes) return '-';
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;
		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}
		return `${size.toFixed(2)} ${units[unitIndex]}`;
	}
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">Materiales de Clase</h1>
			<p class="text-slate-400">Subir y gestionar recursos para tus materias</p>
		</div>

		<!-- Formulario de Subida -->
		<div class="mb-8">
			<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
				<h2 class="text-xl font-semibold text-white mb-6">Subir Nuevo Material</h2>

				{#if formError}
					<div class="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
						{formError}
					</div>
				{/if}

				{#if formSuccess}
					<div class="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400">
						{formSuccess}
					</div>
				{/if}

				<form method="POST" class="space-y-6" enctype="multipart/form-data">
					<div>
						<label for="commission" class="mb-2 block text-sm font-medium text-slate-300">Comisión</label>
						<select
							id="commission"
							name="commissionId"
							bind:value={selectedCommission}
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						>
							<option value="">Seleccionar comisión...</option>
							{#each data.commissions as commission}
								<option value={commission.id}>
									{commission.subject} - {commission.name}
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="title" class="mb-2 block text-sm font-medium text-slate-300">Título</label>
						<input
							id="title"
							name="title"
							type="text"
							bind:value={title}
							placeholder="Ej: Guía de estudio unidad 1"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
					</div>

					<div>
						<label for="description" class="mb-2 block text-sm font-medium text-slate-300">Descripción (opcional)</label>
						<textarea
							id="description"
							name="description"
							bind:value={description}
							rows="3"
							placeholder="Descripción del material..."
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						></textarea>
					</div>

					<div>
						<label for="file" class="mb-2 block text-sm font-medium text-slate-300">Archivo</label>
						<input
							id="file"
							name="file"
							type="file"
							onchange={handleFileChange}
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
						/>
						{#if file}
							<p class="mt-2 text-sm text-slate-400">
								Archivo seleccionado: {file.name} ({formatFileSize(file.size)})
							</p>
						{/if}
					</div>

					<div class="flex justify-end space-x-4">
						<button
							type="button"
							onclick={resetForm}
							class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
						>
							Limpiar
						</button>
						<button
							type="submit"
							class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
						>
							Subir Material
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Materiales Existentes -->
		<div>
			<h2 class="text-xl font-semibold text-white mb-4">Materiales Subidos</h2>
			<div class="space-y-4">
				{#each data.materials as material}
					<div class="bg-slate-900 rounded-2xl border border-slate-800 p-6">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex-1">
								<h3 class="font-semibold text-white">{material.title}</h3>
								<p class="text-sm text-slate-400">{material.subject} - {material.commission}</p>
								{#if material.description}
									<p class="mt-2 text-slate-300">{material.description}</p>
								{/if}
							</div>
							<div class="text-right">
								<p class="text-sm text-slate-400">{formatFileSize(material.fileSize)}</p>
								<p class="text-xs text-slate-500">{new Date(material.createdAt).toLocaleDateString()}</p>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<p class="text-xs text-slate-500">Subido por {material.uploaderName}</p>
							<a
								href={material.fileUrl}
								download
								class="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
							>
								Descargar
							</a>
						</div>
					</div>
				{/each}
				{#if data.materials.length === 0}
					<div class="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
						No hay materiales subidos aún
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
