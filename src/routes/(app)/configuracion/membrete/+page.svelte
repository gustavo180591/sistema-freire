<script lang="ts">
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';

	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let previewUrl = $state<string | null>(null);
	let selectedFileName = $state('');

	const currentLetterheadUrl = resolve('/api/institution/letterhead');

	const dateFormatter = new Intl.DateTimeFormat('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	function formatBytes(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		}

		const kilobytes = bytes / 1024;

		if (kilobytes < 1024) {
			return `${kilobytes.toFixed(1)} KB`;
		}

		return `${(kilobytes / 1024).toFixed(2)} MB`;
	}

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}

		if (!file) {
			selectedFileName = '';
			return;
		}

		selectedFileName = file.name;
		previewUrl = URL.createObjectURL(file);
	}

	onDestroy(() => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
	});
</script>

<svelte:head>
	<title>Membrete institucional | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-500 uppercase">Configuración</p>

			<h1 class="mt-1 text-3xl font-bold text-white">Membrete institucional</h1>

			<p class="mt-2 max-w-3xl text-sm text-slate-400">
				Administrá la imagen institucional utilizada en recibos, certificados, libre deuda y
				documentos PDF del sistema.
			</p>
		</div>

		<a
			href={resolve('/configuracion')}
			class="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
		>
			Volver a Configuración
		</a>
	</div>

	{#if form?.success}
		<div
			class="rounded-2xl border border-emerald-700/60 bg-emerald-950/30 p-4 text-sm text-emerald-200"
			role="status"
		>
			{form.message}
		</div>
	{/if}

	{#if form?.error}
		<div
			class="rounded-2xl border border-red-700/60 bg-red-950/30 p-4 text-sm text-red-200"
			role="alert"
		>
			{form.error}
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
		<section class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
			<div>
				<p class="text-sm font-semibold text-white">
					{previewUrl ? 'Vista previa de la nueva imagen' : 'Membrete actualmente activo'}
				</p>

				<p class="mt-1 text-sm text-slate-400">
					La proporción recomendada es aproximadamente 4:1 para conservar una correcta presentación
					en documentos A4.
				</p>
			</div>

			<div
				class="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-white p-4 shadow-inner"
			>
				<img
					src={previewUrl ?? currentLetterheadUrl}
					alt={previewUrl ? 'Vista previa del nuevo membrete' : 'Membrete institucional actual'}
					class="mx-auto block h-auto max-h-64 w-full object-contain"
				/>
			</div>

			{#if previewUrl && selectedFileName}
				<div class="mt-4 rounded-xl border border-indigo-800/60 bg-indigo-950/30 p-4">
					<p class="text-sm font-semibold text-indigo-200">Nueva imagen seleccionada</p>
					<p class="mt-1 text-sm break-all text-indigo-300/80">{selectedFileName}</p>
					<p class="mt-2 text-xs text-slate-400">
						La imagen actual no será reemplazada hasta presionar “Guardar membrete”.
					</p>
				</div>
			{/if}
		</section>

		<section class="space-y-6">
			<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
				<h2 class="text-lg font-bold text-white">Imagen activa</h2>

				{#if data.current}
					<div class="mt-4 space-y-3 text-sm">
						<div>
							<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Archivo</p>
							<p class="mt-1 break-all text-slate-200">{data.current.fileName}</p>
						</div>

						<div>
							<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Tipo</p>
							<p class="mt-1 text-slate-300">{data.current.mimeType}</p>
						</div>

						<div>
							<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Tamaño</p>
							<p class="mt-1 text-slate-300">{formatBytes(data.current.sizeBytes)}</p>
						</div>

						<div>
							<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">
								Actualizado
							</p>
							<p class="mt-1 text-slate-300">
								{dateFormatter.format(new Date(data.current.updatedAt))}
							</p>
						</div>

						<div>
							<p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">
								Responsable
							</p>
							<p class="mt-1 text-slate-300">
								{[data.current.uploadedBy.lastName, data.current.uploadedBy.firstName]
									.filter(Boolean)
									.join(', ') || data.current.uploadedBy.email}
							</p>
						</div>
					</div>
				{:else}
					<div class="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
						<p class="text-sm font-semibold text-slate-200">Membrete predeterminado</p>
						<p class="mt-1 text-xs leading-relaxed text-slate-400">
							Todavía no se cargó un membrete desde Configuración. El sistema está utilizando el
							archivo institucional incluido con Freire como respaldo.
						</p>
					</div>
				{/if}
			</div>

			<form
				method="POST"
				action="?/save"
				enctype="multipart/form-data"
				class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"
			>
				<h2 class="text-lg font-bold text-white">Cambiar membrete</h2>

				<p class="mt-2 text-sm leading-relaxed text-slate-400">
					Seleccioná la nueva imagen institucional. Se conservará el registro del membrete anterior
					y el nuevo archivo será utilizado automáticamente por los documentos del sistema.
				</p>

				<label class="mt-6 block">
					<span class="mb-2 block text-sm font-semibold text-slate-200">Nueva imagen</span>

					<input
						type="file"
						name="letterhead"
						accept="image/jpeg,image/png,.jpg,.jpeg,.png"
						required
						onchange={handleFileChange}
						class="block w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-500 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-400"
					/>
				</label>

				<div class="mt-4 space-y-1 text-xs text-slate-500">
					<p>Formatos permitidos: JPG, JPEG y PNG.</p>
					<p>Tamaño máximo: 5 MB.</p>
					<p>Proporción recomendada: 4:1.</p>
				</div>

				<button
					type="submit"
					class="mt-6 w-full cursor-pointer rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
				>
					Guardar membrete
				</button>
			</form>
		</section>
	</div>

	<section class="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
		<h2 class="text-lg font-bold text-white">Documentos afectados</h2>

		<p class="mt-2 text-sm text-slate-400">
			El membrete configurado se utilizará automáticamente en los documentos institucionales que
			comparten el generador centralizado.
		</p>

		<div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
				Recibos
			</div>

			<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
				PDF de recibos
			</div>

			<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
				Certificados
			</div>

			<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
				Libre deuda
			</div>
		</div>
	</section>
</div>
