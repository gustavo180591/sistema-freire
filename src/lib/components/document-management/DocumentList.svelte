<script lang="ts">
	interface Document {
		id: string;
		originalName: string;
		mimeType: string;
		sizeBytes: number;
		category: string;
		subType: string;
		visibility: string;
		status: string;
		createdAt: string;
		deletedAt: string | null;
		ownerType: string;
		ownerId: string;
		metadata: Record<string, unknown> | null;
	}

	interface Props {
		documents: Document[];
		loading: boolean;
		onView: (document: Document) => void;
		onDownload: (document: Document) => Promise<void>;
		onDelete: (document: Document) => Promise<void>;
		onRestore: (document: Document) => Promise<void>;
	}

	let { documents, loading, onView, onDownload, onDelete, onRestore }: Props = $props();

	let deletingDocument = $state<Document | null>(null);
	let restoringDocument = $state<Document | null>(null);

	const categoryLabels: Record<string, string> = {
		ACADEMIC: 'Académico',
		ADMINISTRATIVE: 'Administrativo',
		FINANCIAL: 'Financiero',
		LEGAL: 'Legal',
		OTHER: 'Otro'
	};

	const statusLabels: Record<string, string> = {
		ACTIVE: 'Activo',
		DELETED: 'Eliminado',
		EXPIRED: 'Expirado'
	};

	const statusColors: Record<string, string> = {
		ACTIVE: 'text-green-400',
		DELETED: 'text-red-400',
		EXPIRED: 'text-amber-400'
	};

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	async function handleDownload(document: Document) {
		try {
			await onDownload(document);
		} catch (error) {
			console.error('Error downloading document:', error);
		}
	}

	async function handleDelete() {
		if (!deletingDocument) return;
		try {
			await onDelete(deletingDocument);
			deletingDocument = null;
		} catch (error) {
			console.error('Error deleting document:', error);
		}
	}

	async function handleRestore() {
		if (!restoringDocument) return;
		try {
			await onRestore(restoringDocument);
			restoringDocument = null;
		} catch (error) {
			console.error('Error restoring document:', error);
		}
	}
</script>

{#if loading}
	<div
		class="flex items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12"
	>
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"
			></div>
			<p class="text-slate-400">Cargando documentos...</p>
		</div>
	</div>
{:else if documents.length === 0}
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-12 text-center">
		<svg
			class="mx-auto mb-4 h-16 w-16 text-slate-600"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
			/>
		</svg>
		<p class="text-slate-400">No se encontraron documentos</p>
	</div>
{:else}
	<!-- Vista Desktop: Tabla -->
	<div class="hidden overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 md:block">
		<table class="w-full table-fixed text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="w-1/4 px-4 py-3 text-sm font-semibold">Nombre</th>
					<th class="w-1/6 px-4 py-3 text-sm font-semibold">Categoría</th>
					<th class="w-1/6 px-4 py-3 text-sm font-semibold">Estado</th>
					<th class="w-1/6 px-4 py-3 text-sm font-semibold">Tamaño</th>
					<th class="w-1/6 px-4 py-3 text-sm font-semibold">Fecha</th>
					<th class="w-24 px-4 py-3 text-right text-sm font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each documents as document}
					<tr
						class="border-b border-slate-800 transition-colors last:border-none hover:bg-slate-800/50"
					>
						<td class="truncate px-4 py-3" title={document.originalName}>
							<span class="font-medium">{document.originalName}</span>
						</td>
						<td class="px-4 py-3">
							<span class="inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-xs">
								{categoryLabels[document.category] || document.category}
							</span>
						</td>
						<td class="px-4 py-3">
							<span class={statusColors[document.status] || 'text-slate-400'}>
								{statusLabels[document.status] || document.status}
							</span>
						</td>
						<td class="px-4 py-3 text-slate-300">{formatFileSize(document.sizeBytes)}</td>
						<td class="px-4 py-3 text-slate-300">{formatDate(document.createdAt)}</td>
						<td class="px-4 py-3 text-right">
							<div class="flex items-center justify-end space-x-2">
								<button
									onclick={() => onView(document)}
									class="text-emerald-400 transition-colors hover:text-emerald-300"
									aria-label="Ver documento"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
										/>
									</svg>
								</button>
								<button
									onclick={() => handleDownload(document)}
									class="text-blue-400 transition-colors hover:text-blue-300"
									aria-label="Descargar documento"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
										/>
									</svg>
								</button>
								{#if document.status === 'ACTIVE'}
									<button
										onclick={() => (deletingDocument = document)}
										class="text-red-400 transition-colors hover:text-red-300"
										aria-label="Eliminar documento"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								{:else if document.status === 'DELETED'}
									<button
										onclick={() => (restoringDocument = document)}
										class="text-amber-400 transition-colors hover:text-amber-300"
										aria-label="Restaurar documento"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
											/>
										</svg>
									</button>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Vista Mobile: Cards -->
	<div class="space-y-3 md:hidden">
		{#each documents as document}
			<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<p class="truncate font-semibold text-white">{document.originalName}</p>
						<p class="mt-1 text-sm text-slate-400">{formatFileSize(document.sizeBytes)}</p>
					</div>
					<span class={statusColors[document.status] || 'text-slate-400'}>
						{statusLabels[document.status] || document.status}
					</span>
				</div>
				<div class="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
					<span
						class="inline-flex rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-xs"
					>
						{categoryLabels[document.category] || document.category}
					</span>
					<div class="flex items-center space-x-3">
						<button
							onclick={() => onView(document)}
							class="text-emerald-400 transition-colors hover:text-emerald-300"
							aria-label="Ver documento"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
						</button>
						<button
							onclick={() => handleDownload(document)}
							class="text-blue-400 transition-colors hover:text-blue-300"
							aria-label="Descargar documento"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
								/>
							</svg>
						</button>
						{#if document.status === 'ACTIVE'}
							<button
								onclick={() => (deletingDocument = document)}
								class="text-red-400 transition-colors hover:text-red-300"
								aria-label="Eliminar documento"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						{:else if document.status === 'DELETED'}
							<button
								onclick={() => (restoringDocument = document)}
								class="text-amber-400 transition-colors hover:text-amber-300"
								aria-label="Restaurar documento"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Modal de Confirmación de Eliminación -->
{#if deletingDocument}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		role="button"
		tabindex="0"
		onclick={() => (deletingDocument = null)}
		onkeydown={(e) => e.key === 'Escape' && (deletingDocument = null)}
	>
		<div
			class="relative mx-4 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6"
			role="dialog"
			aria-modal="true"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-white">Eliminar Documento</h3>
				<button
					type="button"
					aria-label="Cerrar modal"
					onclick={() => (deletingDocument = null)}
					class="text-slate-400 transition-colors hover:text-slate-300"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<div class="space-y-4">
				<p class="text-slate-300">
					¿Estás seguro de que deseas eliminar el documento <span class="font-semibold text-white"
						>{deletingDocument.originalName}</span
					>?
				</p>
				<p class="text-sm text-slate-400">
					Esta acción realizará un soft delete. El documento podrá ser restaurado posteriormente.
				</p>
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={() => (deletingDocument = null)}
						class="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="button"
						onclick={handleDelete}
						class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
					>
						Eliminar Documento
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Modal de Confirmación de Restauración -->
{#if restoringDocument}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		role="button"
		tabindex="0"
		onclick={() => (restoringDocument = null)}
		onkeydown={(e) => e.key === 'Escape' && (restoringDocument = null)}
	>
		<div
			class="relative mx-4 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6"
			role="dialog"
			aria-modal="true"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-white">Restaurar Documento</h3>
				<button
					type="button"
					aria-label="Cerrar modal"
					onclick={() => (restoringDocument = null)}
					class="text-slate-400 transition-colors hover:text-slate-300"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<div class="space-y-4">
				<p class="text-slate-300">
					¿Estás seguro de que deseas restaurar el documento <span class="font-semibold text-white"
						>{restoringDocument.originalName}</span
					>?
				</p>
				<p class="text-sm text-slate-400">El documento volverá a estar activo y visible.</p>
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={() => (restoringDocument = null)}
						class="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="button"
						onclick={handleRestore}
						class="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
					>
						Restaurar Documento
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
