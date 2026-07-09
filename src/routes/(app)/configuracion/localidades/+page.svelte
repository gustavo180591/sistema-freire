<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Modal states
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showCareersModal = $state(false);
	let selectedLocation = $state<(typeof data.locations)[0] | null>(null);

	// Form state
	let formData = $state({
		name: '',
		code: '',
		address: '',
		city: '',
		province: '',
		phone: '',
		email: '',
		displayOrder: 0,
		active: true
	});

	// Career association state
	let selectedCareers = $state<Set<string>>(new Set());

	function openCreateModal() {
		formData = {
			name: '',
			code: '',
			address: '',
			city: '',
			province: '',
			phone: '',
			email: '',
			displayOrder: data.locations.length,
			active: true
		};
		showCreateModal = true;
	}

	function openEditModal(location: (typeof data.locations)[0]) {
		selectedLocation = location;
		formData = {
			name: location.name,
			code: location.code,
			address: location.address || '',
			city: location.city || '',
			province: location.province || '',
			phone: location.phone || '',
			email: location.email || '',
			displayOrder: location.displayOrder,
			active: location.active
		};
		showEditModal = true;
	}

	function openCareersModal(location: (typeof data.locations)[0]) {
		selectedLocation = location;
		selectedCareers = new Set(
			location.careers.map((c: (typeof location.careers)[0]) => c.careerId)
		);
		showCareersModal = true;
	}

	function toggleCareer(careerId: string) {
		if (selectedCareers.has(careerId)) {
			selectedCareers.delete(careerId);
		} else {
			selectedCareers.add(careerId);
		}
	}

	function getStatusBadge(active: boolean) {
		return active
			? '<span class="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">Activa</span>'
			: '<span class="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400">Inactiva</span>';
	}

	function formatLocation(location: (typeof data.locations)[0]) {
		const parts = [];
		if (location.address) parts.push(location.address);
		if (location.city) parts.push(location.city);
		if (location.province) parts.push(location.province);
		return parts.join(', ') || '-';
	}

	let loading = $state(false);

	function handleFormSuccess() {
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			if (!form?.error) {
				showCreateModal = false;
				showEditModal = false;
				showCareersModal = false;
				loading = false;
			} else {
				loading = false;
			}
		};
	}
</script>

<svelte:head>
	<title>Localidades / Sedes | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Configuración</p>
			<h1 class="text-3xl font-bold">Localidades / Sedes</h1>
		</div>
		<button
			type="button"
			onclick={openCreateModal}
			class="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Nueva Sede
		</button>
	</div>

	<!-- KPIs -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Total de Sedes</p>
			<p class="mt-2 text-3xl font-bold text-white">{data.kpis.totalLocations}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Sedes Activas</p>
			<p class="mt-2 text-3xl font-bold text-emerald-400">{data.kpis.activeLocations}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Sedes Inactivas</p>
			<p class="mt-2 text-3xl font-bold text-slate-400">{data.kpis.inactiveLocations}</p>
		</div>
		<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
			<p class="text-sm text-slate-400">Carreras Asociadas</p>
			<p class="mt-2 text-3xl font-bold text-indigo-400">{data.kpis.totalCareerAssociations}</p>
		</div>
	</div>

	<!-- Locations Table -->
	<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
		<table class="w-full">
			<thead>
				<tr class="border-b border-slate-800 bg-slate-800/50">
					<th class="px-6 py-4 text-left text-sm font-medium text-slate-300">Nombre</th>
					<th class="px-6 py-4 text-left text-sm font-medium text-slate-300">Código</th>
					<th class="px-6 py-4 text-left text-sm font-medium text-slate-300">Dirección/Ciudad</th>
					<th class="px-6 py-4 text-left text-sm font-medium text-slate-300">Carreras</th>
					<th class="px-6 py-4 text-left text-sm font-medium text-slate-300">Alumnos</th>
					<th class="px-6 py-4 text-left text-sm font-medium text-slate-300">Personal</th>
					<th class="px-6 py-4 text-left text-sm font-medium text-slate-300">Estado</th>
					<th class="px-6 py-4 text-left text-sm font-medium text-slate-300">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each data.locations as location}
					<tr class="border-b border-slate-800 transition hover:bg-slate-800/30">
						<td class="px-6 py-4">
							<div class="font-medium text-white">{location.name}</div>
						</td>
						<td class="px-6 py-4 text-slate-300">{location.code}</td>
						<td class="px-6 py-4 text-sm text-slate-400">{formatLocation(location)}</td>
						<td class="px-6 py-4 text-sm text-slate-300">{location._count.careers}</td>
						<td class="px-6 py-4 text-sm text-slate-300">{location._count.students}</td>
						<td class="px-6 py-4 text-sm text-slate-300">{location._count.userPermissions}</td>
						<td class="px-6 py-4">{@html getStatusBadge(location.active)}</td>
						<td class="px-6 py-4">
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => openEditModal(location)}
									class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
									aria-label="Editar sede"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									</svg>
								</button>
								<button
									type="button"
									onclick={() => openCareersModal(location)}
									class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
									aria-label="Configurar carreras"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
										/>
									</svg>
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold text-white">Nueva Sede</h2>
				<button
					type="button"
					onclick={() => (showCreateModal = false)}
					class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
					aria-label="Cerrar modal"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/createLocation"
				class="space-y-4"
				use:enhance={() => {
					loading = true;
					return handleFormSuccess();
				}}
			>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="create-name" class="mb-2 block text-sm font-medium text-slate-300"
							>Nombre</label
						>
						<input
							id="create-name"
							type="text"
							bind:value={formData.name}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
							required
						/>
					</div>
					<div>
						<label for="create-code" class="mb-2 block text-sm font-medium text-slate-300"
							>Código</label
						>
						<input
							id="create-code"
							type="text"
							bind:value={formData.code}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
							required
						/>
					</div>
				</div>
				<div>
					<label for="create-address" class="mb-2 block text-sm font-medium text-slate-300"
						>Dirección</label
					>
					<input
						id="create-address"
						type="text"
						bind:value={formData.address}
						class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
					/>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="create-city" class="mb-2 block text-sm font-medium text-slate-300"
							>Ciudad</label
						>
						<input
							id="create-city"
							type="text"
							bind:value={formData.city}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="create-province" class="mb-2 block text-sm font-medium text-slate-300"
							>Provincia</label
						>
						<input
							id="create-province"
							type="text"
							bind:value={formData.province}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="create-phone" class="mb-2 block text-sm font-medium text-slate-300"
							>Teléfono</label
						>
						<input
							id="create-phone"
							type="text"
							bind:value={formData.phone}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="create-email" class="mb-2 block text-sm font-medium text-slate-300"
							>Email</label
						>
						<input
							id="create-email"
							type="email"
							bind:value={formData.email}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="create-displayOrder" class="mb-2 block text-sm font-medium text-slate-300"
							>Orden de Visualización</label
						>
						<input
							id="create-displayOrder"
							type="number"
							bind:value={formData.displayOrder}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							bind:checked={formData.active}
							id="create-active"
							class="h-5 w-5 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
						/>
						<label for="create-active" class="text-sm font-medium text-slate-300">Activa</label>
					</div>
				</div>
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
					>
						Crear Sede
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && selectedLocation}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold text-white">Editar Sede</h2>
				<button
					type="button"
					onclick={() => (showEditModal = false)}
					class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
					aria-label="Cerrar modal"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/updateLocation"
				class="space-y-4"
				use:enhance={() => {
					loading = true;
					return handleFormSuccess();
				}}
			>
				<input type="hidden" name="id" value={selectedLocation?.id} />
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="edit-name" class="mb-2 block text-sm font-medium text-slate-300"
							>Nombre</label
						>
						<input
							id="edit-name"
							name="name"
							type="text"
							bind:value={formData.name}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
							required
						/>
					</div>
					<div>
						<label for="edit-code" class="mb-2 block text-sm font-medium text-slate-300"
							>Código</label
						>
						<input
							id="edit-code"
							name="code"
							type="text"
							bind:value={formData.code}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
							required
						/>
					</div>
				</div>
				<div>
					<label for="edit-address" class="mb-2 block text-sm font-medium text-slate-300"
						>Dirección</label
					>
					<input
						id="edit-address"
						name="address"
						type="text"
						bind:value={formData.address}
						class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
					/>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="edit-city" class="mb-2 block text-sm font-medium text-slate-300"
							>Ciudad</label
						>
						<input
							id="edit-city"
							name="city"
							type="text"
							bind:value={formData.city}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="edit-province" class="mb-2 block text-sm font-medium text-slate-300"
							>Provincia</label
						>
						<input
							id="edit-province"
							name="province"
							type="text"
							bind:value={formData.province}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="edit-phone" class="mb-2 block text-sm font-medium text-slate-300"
							>Teléfono</label
						>
						<input
							id="edit-phone"
							name="phone"
							type="text"
							bind:value={formData.phone}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="edit-email" class="mb-2 block text-sm font-medium text-slate-300"
							>Email</label
						>
						<input
							id="edit-email"
							name="email"
							type="email"
							bind:value={formData.email}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="edit-displayOrder" class="mb-2 block text-sm font-medium text-slate-300"
							>Orden de Visualización</label
						>
						<input
							id="edit-displayOrder"
							name="displayOrder"
							type="number"
							bind:value={formData.displayOrder}
							class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							name="active"
							bind:checked={formData.active}
							id="edit-active"
							class="h-5 w-5 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
						/>
						<label for="edit-active" class="text-sm font-medium text-slate-300">Activa</label>
					</div>
				</div>
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={() => (showEditModal = false)}
						class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
					>
						Guardar Cambios
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Careers Modal -->
{#if showCareersModal && selectedLocation}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold text-white">Carreras en {selectedLocation.name}</h2>
				<button
					type="button"
					onclick={() => (showCareersModal = false)}
					class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
					aria-label="Cerrar modal"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/updateCareerLocations"
				use:enhance={() => {
					loading = true;
					return handleFormSuccess();
				}}
			>
				<input type="hidden" name="locationId" value={selectedLocation?.id} />
				{#each Array.from(selectedCareers) as careerId}
					<input type="hidden" name="careerIds" value={careerId} />
				{/each}
				<div class="max-h-96 space-y-3 overflow-y-auto">
					{#each data.careers as career}
						<label
							class="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:bg-slate-800"
						>
							<input
								type="checkbox"
								checked={selectedCareers.has(career.id)}
								onchange={() => toggleCareer(career.id)}
								class="h-5 w-5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
							/>
							<span class="text-white">{career.name}</span>
						</label>
					{/each}
				</div>
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={() => (showCareersModal = false)}
						class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
					>
						Guardar Asociaciones
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
