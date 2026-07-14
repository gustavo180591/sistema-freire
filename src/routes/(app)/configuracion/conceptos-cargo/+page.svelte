<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreateForm = $state(false);
	let formData = $state({
		code: '',
		name: '',
		description: '',
		active: true
	});

	const handleCreate = () => {
		showCreateForm = true;
	};

	const handleCancel = () => {
		showCreateForm = false;
		formData = {
			code: '',
			name: '',
			description: '',
			active: true
		};
	};

	const handleToggleActive = (id: string) => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/toggleActive';

		const idInput = document.createElement('input');
		idInput.type = 'hidden';
		idInput.name = 'id';
		idInput.value = id;
		form.appendChild(idInput);

		document.body.appendChild(form);
		form.submit();
	};

	const handleDelete = (id: string) => {
		if (!confirm('¿Estás seguro de eliminar este concepto de cargo?')) return;

		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';

		const idInput = document.createElement('input');
		idInput.type = 'hidden';
		idInput.name = 'id';
		idInput.value = id;
		form.appendChild(idInput);

		document.body.appendChild(form);
		form.submit();
	};

	// Auto-invalidate on form success
	$effect(() => {
		if (form && !form.error) {
			invalidateAll();
			showCreateForm = false;
		}
	});
</script>

<svelte:head>
	<title>Conceptos de Cargo | Configuración</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Configuración</p>
			<h1 class="text-3xl font-bold">Conceptos de Cargo</h1>
		</div>
		<button
			onclick={handleCreate}
			class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
		>
			Nuevo Concepto
		</button>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-600 bg-white px-4 py-3 text-sm text-red-600">
			{form.error}
		</div>
	{/if}

	{#if showCreateForm}
		<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
			<h2 class="mb-6 text-xl font-bold">Crear Nuevo Concepto de Cargo</h2>
			<form method="POST" action="?/create" use:enhance>
				<div class="space-y-6">
					<div>
						<label for="code" class="mb-2 block text-sm font-medium text-slate-300">Código</label>
						<input
							id="code"
							type="text"
							name="code"
							bind:value={formData.code}
							required
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="name" class="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
						<input
							id="name"
							type="text"
							name="name"
							bind:value={formData.name}
							required
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-indigo-500"
						/>
					</div>

					<div>
						<label for="description" class="mb-2 block text-sm font-medium text-slate-300"
							>Descripción</label
						>
						<textarea
							id="description"
							name="description"
							bind:value={formData.description}
							rows="3"
							class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-indigo-500"
						></textarea>
					</div>

					<div class="flex items-center space-x-3">
						<input
							type="checkbox"
							name="active"
							id="active"
							checked={formData.active}
							onchange={(e) => (formData.active = e.currentTarget.checked)}
							class="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
						/>
						<label for="active" class="text-sm text-slate-300">Activo</label>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onclick={handleCancel}
						class="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-slate-500"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
					>
						Crear
					</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
		<table class="w-full text-left">
			<thead class="border-b border-slate-800 bg-slate-900">
				<tr>
					<th class="px-6 py-4 text-sm font-semibold">Código</th>
					<th class="px-6 py-4 text-sm font-semibold">Nombre</th>
					<th class="px-6 py-4 text-sm font-semibold">Descripción</th>
					<th class="px-6 py-4 text-sm font-semibold">Estado</th>
					<th class="px-6 py-4 text-sm font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each data.chargeConcepts as concept}
					<tr class="border-b border-slate-800 last:border-none">
						<td class="px-6 py-4 font-medium">{concept.code}</td>
						<td class="px-6 py-4">{concept.name}</td>
						<td class="px-6 py-4">{concept.description || '-'}</td>
						<td class="px-6 py-4">
							{#if concept.active}
								<span
									class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400"
								>
									Activo
								</span>
							{:else}
								<span
									class="rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-xs text-slate-400"
								>
									Inactivo
								</span>
							{/if}
						</td>
						<td class="px-6 py-4">
							<div class="flex gap-2">
								<button
									onclick={() => handleToggleActive(concept.id)}
									class="rounded-xl border border-slate-700 px-3 py-1 text-xs transition hover:border-indigo-500"
								>
									{concept.active ? 'Desactivar' : 'Activar'}
								</button>
								<button
									onclick={() => handleDelete(concept.id)}
									class="rounded-xl border border-red-900/30 bg-red-950/30 px-3 py-1 text-xs text-red-400 transition hover:border-red-500"
								>
									Eliminar
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
