<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import DocumentUploadForm from '$lib/components/document-management/DocumentUploadForm.svelte';
	import DocumentList from '$lib/components/document-management/DocumentList.svelte';
	import DocumentFilters from '$lib/components/document-management/DocumentFilters.svelte';
	import DocumentDetailModal from '$lib/components/document-management/DocumentDetailModal.svelte';

	let { data } = $props();

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

	interface DocumentFilters {
		ownerType?: string;
		ownerId?: string;
		category?: string;
		subType?: string;
		visibility?: string;
		status?: string;
	}

	let documents = $state<Document[]>([]);
	let loading = $state(false);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let selectedDocument = $state<Document | null>(null);
	let showUploadForm = $state(false);
	let filters = $state<DocumentFilters>({});

	async function fetchDocuments() {
		loading = true;
		try {
			const queryParams = new URLSearchParams();
			if (filters.ownerType) queryParams.append('ownerType', filters.ownerType);
			if (filters.ownerId) queryParams.append('ownerId', filters.ownerId);
			if (filters.category) queryParams.append('category', filters.category);
			if (filters.subType) queryParams.append('subType', filters.subType);
			if (filters.visibility) queryParams.append('visibility', filters.visibility);
			if (filters.status) queryParams.append('status', filters.status);

			const queryString = queryParams.toString();
			const url = `/api/documents${queryString ? `?${queryString}` : ''}`;

			const response = await fetch(url);
			
			if (response.status === 401) {
				// Unauthorized - redirect to login
				goto('/login');
				return;
			}

			if (response.status === 403) {
				// Forbidden - show error
				uploadError = 'No tienes permiso para acceder a los documentos';
				documents = [];
				return;
			}

			if (!response.ok) {
				throw new Error(`Error fetching documents: ${response.statusText}`);
			}

			const data = await response.json();
			documents = data;
		} catch (error) {
			console.error('Error fetching documents:', error);
			uploadError = 'Error al cargar documentos';
		} finally {
			loading = false;
		}
	}

	async function handleUpload(formData: FormData) {
		uploading = true;
		uploadError = null;
		try {
			const response = await fetch('/api/documents', {
				method: 'POST',
				body: formData
			});

			if (response.status === 401) {
				// Unauthorized - redirect to login
				goto('/login');
				return;
			}

			if (response.status === 403) {
				// Forbidden - show error
				uploadError = 'No tienes permiso para subir documentos';
				return;
			}

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error al subir documento');
			}

			// Upload successful
			showUploadForm = false;
			await fetchDocuments();
		} catch (error) {
			console.error('Error uploading document:', error);
			uploadError = error instanceof Error ? error.message : 'Error al subir documento';
		} finally {
			uploading = false;
		}
	}

	async function handleDownload(document: Document) {
		try {
			const response = await fetch(`/api/documents/${document.id}/download`);
			
			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				uploadError = 'No tienes permiso para descargar este documento';
				return;
			}

			if (!response.ok) {
				throw new Error('Error al descargar documento');
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = window.document.createElement('a');
			a.href = url;
			a.download = document.originalName;
			window.document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			window.document.body.removeChild(a);
		} catch (error) {
			console.error('Error downloading document:', error);
			uploadError = 'Error al descargar documento';
		}
	}

	async function handleDelete(document: Document) {
		try {
			const response = await fetch(`/api/documents/${document.id}`, {
				method: 'DELETE'
			});

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				uploadError = 'No tienes permiso para eliminar este documento';
				return;
			}

			if (!response.ok) {
				throw new Error('Error al eliminar documento');
			}

			await fetchDocuments();
		} catch (error) {
			console.error('Error deleting document:', error);
			uploadError = 'Error al eliminar documento';
		}
	}

	async function handleRestore(document: Document) {
		try {
			const response = await fetch(`/api/documents/${document.id}/restore`, {
				method: 'POST'
			});

			if (response.status === 401) {
				goto('/login');
				return;
			}

			if (response.status === 403) {
				uploadError = 'No tienes permiso para restaurar este documento';
				return;
			}

			if (!response.ok) {
				throw new Error('Error al restaurar documento');
			}

			await fetchDocuments();
		} catch (error) {
			console.error('Error restoring document:', error);
			uploadError = 'Error al restaurar documento';
		}
	}

	function handleFilterChange(newFilters: DocumentFilters) {
		filters = newFilters;
		fetchDocuments();
	}

	// Load documents on mount
	$effect(() => {
		fetchDocuments();
		return () => {
			// Cleanup if needed
		};
	});
</script>

<svelte:head>
	<title>Gestión Documental | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Administración</p>
			<h1 class="text-3xl font-bold tracking-tight">Gestión Documental</h1>
			<p class="mt-2 text-sm text-slate-400">
				Subida, consulta y descarga controlada de documentos institucionales.
			</p>
		</div>
		<button
			onclick={() => (showUploadForm = !showUploadForm)}
			class="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
		>
			{showUploadForm ? 'Cancelar' : '+ Subir Documento'}
		</button>
	</div>

	<!-- Error Banner -->
	{#if uploadError}
		<div class="rounded-2xl border border-red-900/50 bg-red-950/30 px-6 py-4">
			<div class="flex items-center gap-3">
				<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-red-400">{uploadError}</p>
				<button
					onclick={() => (uploadError = null)}
					class="ml-auto text-red-400 transition-colors hover:text-red-300"
					aria-label="Cerrar error"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- Upload Form -->
	{#if showUploadForm}
		<DocumentUploadForm onUpload={handleUpload} uploading={uploading} error={uploadError} />
	{/if}

	<!-- Filters -->
	<DocumentFilters onFilterChange={handleFilterChange} />

	<!-- Document List -->
	<DocumentList
		documents={documents}
		loading={loading}
		onView={(doc) => (selectedDocument = doc)}
		onDownload={handleDownload}
		onDelete={handleDelete}
		onRestore={handleRestore}
	/>

	<!-- Detail Modal -->
	{#if selectedDocument}
		<DocumentDetailModal
			document={selectedDocument}
			onClose={() => (selectedDocument = null)}
			onDownload={handleDownload}
			onDelete={handleDelete}
			onRestore={handleRestore}
		/>
	{/if}
</div>
