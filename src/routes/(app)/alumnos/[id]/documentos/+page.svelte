<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form?: any } = $props();
	
	let showUploadModal = $state(false);
	let deletingDoc = $state<string | null>(null);
	let selectedType = $state('DNI');
	let selectedFile: File | null = $state(null);
	let documentName = $state('');
	let documentNotes = $state('');

	const typeIcons: Record<string, string> = {
		DNI: '🆔',
		CERTIFICATE: '📜',
		CONSTANCY: '📄',
		SECONDARY_TITLE: '🎓',
		PHOTO_ID: '📷',
		MEDICAL_CERTIFICATE: '🏥',
		OTHER: '📎'
	};

	const typeColors: Record<string, string> = {
		DNI: 'bg-blue-950/50 text-blue-400 border-blue-800',
		CERTIFICATE: 'bg-emerald-950/50 text-emerald-400 border-emerald-800',
		CONSTANCY: 'bg-purple-950/50 text-purple-400 border-purple-800',
		SECONDARY_TITLE: 'bg-amber-950/50 text-amber-400 border-amber-800',
		PHOTO_ID: 'bg-pink-950/50 text-pink-400 border-pink-800',
		MEDICAL_CERTIFICATE: 'bg-red-950/50 text-red-400 border-red-800',
		OTHER: 'bg-slate-800 text-slate-400 border-slate-700'
	};

	function formatFileSize(bytes: number | null | undefined): string {
		if (!bytes) return '-';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			selectedFile = input.files[0];
			if (!documentName) {
				documentName = selectedFile.name;
			}
		}
	}

	function handleUpload() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
				showUploadModal = false;
				selectedFile = null;
				documentName = '';
				documentNotes = '';
				selectedType = 'DNI';
			}
		};
	}

	function handleVerify(documentId: string, verified: boolean) {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
			}
		};
	}

	function handleDelete() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success') {
				await invalidateAll();
				deletingDoc = null;
			}
		};
	}
</script>

<svelte:head>
	<title>Documentos | {data.student.fullName}</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
	<!-- Header -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				<div class="flex items-center gap-2 mb-2">
					<a href="/alumnos/{data.student.id}/historial" class="text-sm text-slate-400 hover:text-white transition">
						← Volver al historial
					</a>
				</div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Gestión Documental</p>
				<h1 class="mt-2 text-2xl md:text-3xl font-bold">{data.student.fullName}</h1>
				<p class="mt-1 text-sm text-slate-400">
					DNI: {data.student.dni} · {data.student.career}
				</p>
			</div>
			{#if data.canUpload}
				<button
					onclick={() => showUploadModal = true}
					class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 flex items-center gap-2"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Subir Documento
				</button>
			{/if}
		</div>
	</div>

	<!-- Mensajes -->
	{#if form?.error}
		<div class="rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p>{form.error}</p>
			</div>
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-400">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				<p>{form.message}</p>
			</div>
		</div>
	{/if}

	<!-- Documentos -->
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
		<h2 class="text-lg font-semibold mb-4">Documentos del Alumno ({data.documents.length})</h2>
		
		{#if data.documents.length === 0}
			<div class="text-center py-12">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
					<svg class="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<p class="text-slate-400">No hay documentos cargados</p>
				{#if data.canUpload}
					<p class="text-sm text-slate-500 mt-1">Hacé click en "Subir Documento" para agregar el primero</p>
				{/if}
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.documents as doc}
					<div class="rounded-2xl border border-slate-800 bg-slate-800/50 p-4 group hover:border-slate-700 transition">
						<div class="flex items-start gap-3">
							<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border {typeColors[doc.type]}">
								<span class="text-xl">{typeIcons[doc.type]}</span>
							</div>
							<div class="min-w-0 flex-1">
								<p class="font-medium truncate">{doc.name}</p>
								<p class="text-xs text-slate-400 mt-1">{doc.typeLabel}</p>
								<p class="text-xs text-slate-500 mt-1">{formatFileSize(doc.fileSize)}</p>
							</div>
						</div>

						<div class="mt-4 flex items-center justify-between">
							<div class="flex items-center gap-2">
								{#if doc.verified}
									<span class="inline-flex items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-1 text-xs text-emerald-400">
										<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
										</svg>
										Verificado
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
										<span class="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
										Pendiente
									</span>
								{/if}
							</div>

							<div class="flex items-center gap-2">
								{#if data.canVerify}
									<form method="POST" action="?/verify" use:enhance={() => handleVerify(doc.id, !doc.verified)}>
										<input type="hidden" name="documentId" value={doc.id} />
										<input type="hidden" name="verified" value={(!doc.verified).toString()} />
										<button
											type="submit"
											class="rounded-lg p-1.5 transition {doc.verified ? 'text-emerald-400 hover:bg-emerald-950/30' : 'text-slate-400 hover:bg-slate-700'}"
											title={doc.verified ? 'Desverificar' : 'Verificar'}
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</button>
									</form>
								{/if}

								<a
									href={doc.fileUrl}
									target="_blank"
									class="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 transition"
									title="Ver documento"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								</a>

								{#if data.canUpload}
									<button
										onclick={() => deletingDoc = doc.id}
										class="rounded-lg p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition"
										title="Eliminar"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								{/if}
							</div>
						</div>

						{#if doc.notes}
							<p class="mt-3 text-xs text-slate-500 line-clamp-2">{doc.notes}</p>
						{/if}

						<div class="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
							<span>Subido: {formatDate(doc.createdAt)}</span>
							<span>por {doc.uploadedBy}</span>
						</div>

						{#if doc.verified && doc.verifiedBy && doc.verifiedAt}
							<div class="mt-2 text-xs text-emerald-500">
								Verificado por {doc.verifiedBy} · {formatDate(doc.verifiedAt)}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modal Subir Documento -->
{#if showUploadModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
		<div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
			<h3 class="text-lg font-semibold mb-4">Subir Documento</h3>
			
			<form method="POST" action="?/upload" use:enhance={handleUpload} enctype="multipart/form-data" class="space-y-4">
				<div>
					<label for="doc-type" class="mb-2 block text-sm font-medium text-slate-300">Tipo de documento</label>
					<select
						id="doc-type"
						name="type"
						bind:value={selectedType}
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					>
						{#each Object.entries(data.documentTypeLabels) as [value, label]}
							<option value={value}>{label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="doc-name" class="mb-2 block text-sm font-medium text-slate-300">Nombre del documento</label>
					<input
						id="doc-name"
						type="text"
						name="name"
						bind:value={documentName}
						placeholder="Ej: DNI Frente, Certificado médico 2024"
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					/>
				</div>

				<div>
					<label for="doc-file" class="mb-2 block text-sm font-medium text-slate-300">Archivo</label>
					<input
						id="doc-file"
						type="file"
						name="file"
						onchange={handleFileChange}
						accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-sm file:text-white hover:file:bg-indigo-500"
					/>
					<p class="mt-1 text-xs text-slate-500">Máximo 10MB. Formatos: PDF, JPG, PNG, DOC, DOCX</p>
				</div>

				<div>
					<label for="doc-notes" class="mb-2 block text-sm font-medium text-slate-300">Notas (opcional)</label>
					<textarea
						id="doc-notes"
						name="notes"
						bind:value={documentNotes}
						rows="2"
						placeholder="Observaciones sobre el documento..."
						class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-indigo-500"
					></textarea>
				</div>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						onclick={() => showUploadModal = false}
						class="flex-1 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={!selectedFile || !documentName}
						class="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Subir Documento
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Eliminar -->
{#if deletingDoc}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
		<div class="w-full max-w-md rounded-2xl border border-red-900/50 bg-slate-900 p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-950/50">
					<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold">¿Eliminar documento?</h3>
			</div>
			<p class="text-sm text-slate-400 mb-6">
				Esta acción no se puede deshacer. El documento se eliminará permanentemente.
			</p>
			<div class="flex gap-3">
				<button
					onclick={() => deletingDoc = null}
					class="flex-1 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
				>
					Cancelar
				</button>
				<form method="POST" action="?/delete" use:enhance={handleDelete} class="flex-1">
					<input type="hidden" name="documentId" value={deletingDoc} />
					<button
						type="submit"
						class="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
					>
						Eliminar
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
