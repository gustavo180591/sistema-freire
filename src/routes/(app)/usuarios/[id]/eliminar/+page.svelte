<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Eliminar Usuario | Sistema Freire</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-8">
	<div>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Usuarios</p>
		<h1 class="text-3xl font-bold tracking-tight">Eliminar Usuario</h1>
	</div>

	{#if form?.error}
		<div class="rounded-2xl border border-red-800 bg-red-950/50 p-4 text-red-200">
			{form.error}
		</div>
	{/if}

	<div class="rounded-3xl border border-red-800 bg-red-950/30 p-8">
		<div class="flex items-start space-x-4">
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/20">
				<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>
			<div class="flex-1">
				<h2 class="text-xl font-bold text-white">¿Estás seguro?</h2>
				<p class="mt-2 text-slate-300">
					Estás a punto de eliminar al usuario <strong class="text-white"
						>{data.user.firstName} {data.user.lastName}</strong
					>
					({data.user.email}).
				</p>
				<p class="mt-2 text-sm text-slate-400">Esta acción eliminará permanentemente:</p>
				<ul class="mt-2 list-inside list-disc space-y-1 text-sm text-slate-400">
					<li>El usuario y sus roles</li>
					<li>Permisos de localidad asignados</li>
					{#if data.user.student}
						<li>Registro de estudiante asociado</li>
					{/if}
					{#if data.user.teacher}
						<li>Registro de docente asociado</li>
					{/if}
				</ul>
				<p class="mt-4 text-sm font-medium text-red-400">Esta acción no se puede deshacer.</p>
			</div>
		</div>

		<form
			method="POST"
			class="mt-8 flex justify-end space-x-4"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<a
				href="/usuarios/{data.user.id}"
				class="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
			>
				Cancelar
			</a>
			<button
				type="submit"
				disabled={loading}
				class="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
			>
				{loading ? 'Eliminando...' : 'Eliminar Usuario'}
			</button>
		</form>
	</div>
</div>
