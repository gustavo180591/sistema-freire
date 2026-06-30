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
		document: Document | null;
		onClose: () => void;
		onDownload: (document: Document) => Promise<void>;
		onDelete: (document: Document) => Promise<void>;
		onRestore: (document: Document) => Promise<void>;
	}

	let { document, onClose, onDownload, onDelete, onRestore }: Props = $props();

	const categoryLabels: Record<string, string> = {
		ACADEMIC: 'Académico',
		ADMINISTRATIVE: 'Administrativo',
		FINANCIAL: 'Financiero',
		LEGAL: 'Legal',
		OTHER: 'Otro'
	};

	const subTypeLabels: Record<string, string> = {
		ENROLLMENT_CERTIFICATE: 'Certificado de Inscripción',
		REGULARITY_CERTIFICATE: 'Certificado de Regularidad',
		GRADE_CERTIFICATE: 'Certificado de Calificación',
		DIPLOMA: 'Diploma',
		IDENTITY_DOCUMENT: 'Documento de Identidad',
		PAYMENT_RECEIPT: 'Recibo de Pago',
		CONTRACT: 'Contrato',
		OTHER: 'Otro'
	};

	const visibilityLabels: Record<string, string> = {
		PRIVATE: 'Privado',
		INTERNAL: 'Interno',
		PUBLIC: 'Público'
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
		return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function handleDownload() {
		if (!document) return;
		try {
			await onDownload(document);
		} catch (error) {
			console.error('Error downloading document:', error);
		}
	}

	async function handleDelete() {
		if (!document) return;
		try {
			await onDelete(document);
			onClose();
		} catch (error) {
			console.error('Error deleting document:', error);
		}
	}

	async function handleRestore() {
		if (!document) return;
		try {
			await onRestore(document);
			onClose();
		} catch (error) {
			console.error('Error restoring document:', error);
		}
	}
</script>

{#if document}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		role="button"
		tabindex="0"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	>
		<div
			class="relative mx-4 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6"
			role="dialog"
			aria-modal="true"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-white">Detalle del Documento</h3>
				<button
					type="button"
					aria-label="Cerrar modal"
					onclick={onClose}
					class="text-slate-400 transition-colors hover:text-slate-300"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-4">
				<!-- Nombre del archivo -->
				<div>
					<p class="mb-1 text-sm font-medium text-slate-400">Nombre del archivo</p>
					<p class="text-white">{document.originalName}</p>
				</div>

				<!-- Información básica -->
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<p class="mb-1 text-sm font-medium text-slate-400">Tipo MIME</p>
						<p class="text-white">{document.mimeType}</p>
					</div>
					<div>
						<p class="mb-1 text-sm font-medium text-slate-400">Tamaño</p>
						<p class="text-white">{formatFileSize(document.sizeBytes)}</p>
					</div>
					<div>
						<p class="mb-1 text-sm font-medium text-slate-400">Categoría</p>
						<p class="text-white">{categoryLabels[document.category] || document.category}</p>
					</div>
					<div>
						<p class="mb-1 text-sm font-medium text-slate-400">Subtipo</p>
						<p class="text-white">{subTypeLabels[document.subType] || document.subType}</p>
					</div>
					<div>
						<p class="mb-1 text-sm font-medium text-slate-400">Visibilidad</p>
						<p class="text-white">{visibilityLabels[document.visibility] || document.visibility}</p>
					</div>
					<div>
						<p class="mb-1 text-sm font-medium text-slate-400">Estado</p>
						<p class={statusColors[document.status] || 'text-slate-400'}>
							{statusLabels[document.status] || document.status}
						</p>
					</div>
				</div>

				<!-- Propietario -->
				<div>
					<p class="mb-1 text-sm font-medium text-slate-400">Propietario</p>
					<p class="text-white">{document.ownerType} - {document.ownerId}</p>
				</div>

				<!-- Fechas -->
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<p class="mb-1 text-sm font-medium text-slate-400">Fecha de creación</p>
						<p class="text-white">{formatDate(document.createdAt)}</p>
					</div>
					{#if document.deletedAt}
						<div>
							<p class="mb-1 text-sm font-medium text-slate-400">Fecha de eliminación</p>
							<p class="text-white">{formatDate(document.deletedAt)}</p>
						</div>
					{/if}
				</div>

				<!-- Metadata -->
				{#if document.metadata}
					<div>
						<p class="mb-1 text-sm font-medium text-slate-400">Metadata</p>
						<pre class="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 overflow-x-auto">{JSON.stringify(document.metadata, null, 2)}</pre>
					</div>
				{/if}

				<!-- Acciones -->
				<div class="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
					<button
						onclick={handleDownload}
						class="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
						Descargar
					</button>

					{#if document.status === 'ACTIVE'}
						<button
							onclick={handleDelete}
							class="flex items-center gap-2 rounded-xl border border-red-600 bg-red-600/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-600/20"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							Eliminar
						</button>
					{:else if document.status === 'DELETED'}
						<button
							onclick={handleRestore}
							class="flex items-center gap-2 rounded-xl border border-amber-600 bg-amber-600/10 px-5 py-2.5 text-sm font-semibold text-amber-400 transition hover:bg-amber-600/20"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							Restaurar
						</button>
					{/if}

					<button
						onclick={onClose}
						class="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
