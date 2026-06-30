<script lang="ts">
	interface Props {
		onUpload: (formData: FormData) => Promise<void>;
		uploading: boolean;
		error: string | null;
	}

	let { onUpload, uploading, error }: Props = $props();

	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

	let selectedFile: File | null = $state(null);
	let ownerType = $state('USER');
	let ownerId = $state('');
	let category = $state('ACADEMIC');
	let subType = $state('ENROLLMENT_CERTIFICATE');
	let visibility = $state('PRIVATE');
	let metadata = $state('');

	const categories = [
		{ value: 'ACADEMIC', label: 'Académico' },
		{ value: 'ADMINISTRATIVE', label: 'Administrativo' },
		{ value: 'FINANCIAL', label: 'Financiero' },
		{ value: 'LEGAL', label: 'Legal' },
		{ value: 'OTHER', label: 'Otro' }
	];

	const subTypes = [
		{ value: 'ENROLLMENT_CERTIFICATE', label: 'Certificado de Inscripción' },
		{ value: 'REGULARITY_CERTIFICATE', label: 'Certificado de Regularidad' },
		{ value: 'GRADE_CERTIFICATE', label: 'Certificado de Calificación' },
		{ value: 'DIPLOMA', label: 'Diploma' },
		{ value: 'IDENTITY_DOCUMENT', label: 'Documento de Identidad' },
		{ value: 'PAYMENT_RECEIPT', label: 'Recibo de Pago' },
		{ value: 'CONTRACT', label: 'Contrato' },
		{ value: 'OTHER', label: 'Otro' }
	];

	const visibilities = [
		{ value: 'PRIVATE', label: 'Privado' },
		{ value: 'INTERNAL', label: 'Interno' },
		{ value: 'PUBLIC', label: 'Público' }
	];

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			
			// Validar tamaño
			if (file.size > MAX_FILE_SIZE) {
				error = `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`;
				selectedFile = null;
				return;
			}
			
			selectedFile = file;
			error = null;
		}
	}

	async function handleSubmit() {
		if (!selectedFile) {
			error = 'Debe seleccionar un archivo';
			return;
		}

		if (!ownerId) {
			error = 'Debe especificar el ID del propietario';
			return;
		}

		const formData = new FormData();
		formData.append('file', selectedFile);
		formData.append('ownerType', ownerType);
		formData.append('ownerId', ownerId);
		formData.append('category', category);
		formData.append('subType', subType);
		formData.append('visibility', visibility);
		
		if (metadata) {
			formData.append('metadata', metadata);
		}

		await onUpload(formData);
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
	}
</script>

<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
	<h3 class="mb-4 text-lg font-semibold text-white">Subir Documento</h3>
	
	<form onsubmit={handleSubmit} class="space-y-4">
		<!-- Selección de archivo -->
		<div>
			<label for="file-input" class="mb-2 block text-sm font-medium text-slate-300">Archivo</label>
			<div class="relative">
				<input
					id="file-input"
					type="file"
					accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
					oninput={handleFileSelect}
					disabled={uploading}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500 disabled:opacity-50"
				/>
				{#if selectedFile}
					<div class="mt-2 flex items-center gap-2 text-sm text-slate-400">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<span>{selectedFile.name}</span>
						<span class="text-slate-500">({formatFileSize(selectedFile.size)})</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Tipo de propietario -->
		<div>
			<label for="owner-type" class="mb-2 block text-sm font-medium text-slate-300">Tipo de Propietario</label>
			<select
				id="owner-type"
				bind:value={ownerType}
				disabled={uploading}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500 disabled:opacity-50"
			>
				<option value="USER">Usuario</option>
				<option value="STUDENT">Alumno</option>
				<option value="TEACHER">Docente</option>
				<option value="CAREER">Carrera</option>
				<option value="SUBJECT">Materia</option>
			</select>
		</div>

		<!-- ID del propietario -->
		<div>
			<label for="owner-id" class="mb-2 block text-sm font-medium text-slate-300">ID del Propietario</label>
			<input
				id="owner-id"
				type="text"
				bind:value={ownerId}
				placeholder="ID del propietario del documento"
				disabled={uploading}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500 disabled:opacity-50"
			/>
		</div>

		<!-- Categoría -->
		<div>
			<label for="category" class="mb-2 block text-sm font-medium text-slate-300">Categoría</label>
			<select
				id="category"
				bind:value={category}
				disabled={uploading}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500 disabled:opacity-50"
			>
				{#each categories as cat}
					<option value={cat.value}>{cat.label}</option>
				{/each}
			</select>
		</div>

		<!-- Subtipo -->
		<div>
			<label for="subtype" class="mb-2 block text-sm font-medium text-slate-300">Subtipo</label>
			<select
				id="subtype"
				bind:value={subType}
				disabled={uploading}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500 disabled:opacity-50"
			>
				{#each subTypes as sub}
					<option value={sub.value}>{sub.label}</option>
				{/each}
			</select>
		</div>

		<!-- Visibilidad -->
		<div>
			<label for="visibility" class="mb-2 block text-sm font-medium text-slate-300">Visibilidad</label>
			<select
				id="visibility"
				bind:value={visibility}
				disabled={uploading}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500 disabled:opacity-50"
			>
				{#each visibilities as vis}
					<option value={vis.value}>{vis.label}</option>
				{/each}
			</select>
		</div>

		<!-- Metadata (opcional) -->
		<div>
			<label for="metadata" class="mb-2 block text-sm font-medium text-slate-300">Metadata (JSON opcional)</label>
			<textarea
				id="metadata"
				bind:value={metadata}
				placeholder="Ejemplo de formato JSON"
				disabled={uploading}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500 disabled:opacity-50"
				rows="3"
			></textarea>
		</div>

		<!-- Error -->
		{#if error}
			<div class="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
				{error}
			</div>
		{/if}

		<!-- Botón de envío -->
		<button
			type="submit"
			disabled={uploading || !selectedFile}
			class="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
		>
			{#if uploading}
				Subiendo...
			{:else}
				Subir Documento
			{/if}
		</button>
	</form>
</div>
