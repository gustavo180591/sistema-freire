<script lang="ts">
	interface Props {
		onFilterChange: (filters: DocumentFilters) => void;
	}

	interface DocumentFilters {
		ownerType?: string;
		ownerId?: string;
		category?: string;
		subType?: string;
		visibility?: string;
		status?: string;
	}

	let { onFilterChange }: Props = $props();

	let filters = $state<DocumentFilters>({});

	const categories = [
		{ value: '', label: 'Todas' },
		{ value: 'ACADEMIC', label: 'Académico' },
		{ value: 'ADMINISTRATIVE', label: 'Administrativo' },
		{ value: 'FINANCIAL', label: 'Financiero' },
		{ value: 'LEGAL', label: 'Legal' },
		{ value: 'OTHER', label: 'Otro' }
	];

	const subTypes = [
		{ value: '', label: 'Todos' },
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
		{ value: '', label: 'Todas' },
		{ value: 'PRIVATE', label: 'Privado' },
		{ value: 'INTERNAL', label: 'Interno' },
		{ value: 'PUBLIC', label: 'Público' }
	];

	const statuses = [
		{ value: '', label: 'Todos' },
		{ value: 'ACTIVE', label: 'Activo' },
		{ value: 'DELETED', label: 'Eliminado' },
		{ value: 'EXPIRED', label: 'Expirado' }
	];

	function clearFilters() {
		filters = {};
		onFilterChange(filters);
	}
</script>

<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-white">Filtros</h3>
		<button
			onclick={clearFilters}
			class="text-sm text-slate-400 transition-colors hover:text-slate-300"
		>
			Limpiar
		</button>
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		<!-- Categoría -->
		<div>
			<label for="filter-category" class="mb-2 block text-sm font-medium text-slate-300"
				>Categoría</label
			>
			<select
				id="filter-category"
				bind:value={filters.category}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
			>
				{#each categories as cat}
					<option value={cat.value}>{cat.label}</option>
				{/each}
			</select>
		</div>

		<!-- Subtipo -->
		<div>
			<label for="filter-subtype" class="mb-2 block text-sm font-medium text-slate-300"
				>Subtipo</label
			>
			<select
				id="filter-subtype"
				bind:value={filters.subType}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
			>
				{#each subTypes as sub}
					<option value={sub.value}>{sub.label}</option>
				{/each}
			</select>
		</div>

		<!-- Visibilidad -->
		<div>
			<label for="filter-visibility" class="mb-2 block text-sm font-medium text-slate-300"
				>Visibilidad</label
			>
			<select
				id="filter-visibility"
				bind:value={filters.visibility}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
			>
				{#each visibilities as vis}
					<option value={vis.value}>{vis.label}</option>
				{/each}
			</select>
		</div>

		<!-- Estado -->
		<div>
			<label for="filter-status" class="mb-2 block text-sm font-medium text-slate-300">Estado</label
			>
			<select
				id="filter-status"
				bind:value={filters.status}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
			>
				{#each statuses as stat}
					<option value={stat.value}>{stat.label}</option>
				{/each}
			</select>
		</div>

		<!-- Tipo de propietario -->
		<div>
			<label for="filter-owner-type" class="mb-2 block text-sm font-medium text-slate-300"
				>Tipo de Propietario</label
			>
			<select
				id="filter-owner-type"
				bind:value={filters.ownerType}
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
			>
				<option value="">Todos</option>
				<option value="USER">Usuario</option>
				<option value="STUDENT">Alumno</option>
				<option value="TEACHER">Docente</option>
				<option value="CAREER">Carrera</option>
				<option value="SUBJECT">Materia</option>
			</select>
		</div>

		<!-- ID del propietario -->
		<div>
			<label for="filter-owner-id" class="mb-2 block text-sm font-medium text-slate-300"
				>ID del Propietario</label
			>
			<input
				id="filter-owner-id"
				type="text"
				bind:value={filters.ownerId}
				placeholder="ID del propietario"
				class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white transition outline-none focus:border-slate-500"
			/>
		</div>
	</div>
</div>
