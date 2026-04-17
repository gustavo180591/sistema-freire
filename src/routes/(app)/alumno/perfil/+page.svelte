<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Mi Perfil | Paulo Freire</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8 p-6">
	<div class="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
		<div class="flex items-start justify-between">
			<div>
				<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Perfil institucional</p>
				<h1 class="mt-2 text-3xl font-bold">Editar mis datos</h1>
			</div>
			<a href="/alumno" class="rounded-2xl border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800">
				← Volver al panel
			</a>
		</div>
	</div>

	{#if form?.success}
		<div class="rounded-2xl border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-200">
			✅ Perfil actualizado correctamente
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-2xl border border-red-800 bg-red-950/50 p-4 text-red-200">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		class="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<label for="firstName" class="mb-2 block text-sm font-medium text-slate-300">Nombre</label>
				<input
					id="firstName"
					name="firstName"
					type="text"
					value={data.student.firstName}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="lastName" class="mb-2 block text-sm font-medium text-slate-300">Apellido</label>
				<input
					id="lastName"
					name="lastName"
					type="text"
					value={data.student.lastName}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="email" class="mb-2 block text-sm font-medium text-slate-300">Correo electrónico</label>
				<input
					id="email"
					name="email"
					type="email"
					value={data.student.email}
					class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition outline-none focus:border-slate-500"
				/>
			</div>

			<div>
				<label for="dni" class="mb-2 block text-sm font-medium text-slate-300">DNI</label>
				<input
					id="dni"
					type="text"
					value={data.student.dni}
					disabled
					class="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500"
				/>
				<p class="mt-1 text-xs text-slate-500">El DNI no puede modificarse</p>
			</div>

			<div>
				<label for="career" class="mb-2 block text-sm font-medium text-slate-300">Carrera</label>
				<input
					id="career"
					type="text"
					value={data.student.career}
					disabled
					class="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500"
				/>
				<p class="mt-1 text-xs text-slate-500">Para cambiar de carrera contacte Secretaría</p>
			</div>

			<div>
				<span class="mb-2 block text-sm font-medium text-slate-300">Estado</span>
				<div class="inline-flex items-center gap-2 rounded-full bg-emerald-950/50 px-4 py-2 text-emerald-400">
					<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
					{data.student.status}
				</div>
			</div>
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={loading}
				class="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02] disabled:opacity-50"
			>
				{loading ? 'Guardando...' : 'Guardar cambios'}
			</button>
		</div>
	</form>
</div>
