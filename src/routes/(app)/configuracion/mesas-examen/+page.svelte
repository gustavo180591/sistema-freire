<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let showCreate = $state(false);
	let newYear = $state(new Date().getFullYear() + 1);
</script>

<svelte:head>
	<title>Mesas de examen | Configuración</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8">
	<header>
		<p class="text-sm tracking-[0.2em] text-slate-400 uppercase">Configuración institucional</p>

		<div class="mt-2 flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="text-3xl font-bold">Mesas de examen</h1>

				<p class="mt-2 max-w-3xl text-sm text-slate-400">
					Definí qué años y turnos estarán disponibles al organizar las mesas de examen.
				</p>
			</div>

			<button
				type="button"
				onclick={() => (showCreate = true)}
				class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
			>
				Agregar año
			</button>
		</div>
	</header>

	{#if form?.error}
		<div class="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-red-200">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-emerald-200">
			{form.success}
		</div>
	{/if}

	{#if showCreate}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();

					if (result.type === 'success') {
						showCreate = false;
					}
				};
			}}
			class="rounded-2xl border border-slate-800 bg-slate-900 p-5"
		>
			<label for="year" class="mb-2 block text-sm font-semibold text-slate-300"> Año </label>

			<div class="flex flex-wrap gap-3">
				<input
					id="year"
					name="year"
					type="number"
					min="2000"
					max="2100"
					bind:value={newYear}
					required
					class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 outline-none focus:border-indigo-500"
				/>

				<button
					type="submit"
					class="rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white"
				>
					Guardar
				</button>

				<button
					type="button"
					onclick={() => (showCreate = false)}
					class="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-300"
				>
					Cancelar
				</button>
			</div>
		</form>
	{/if}

	<div class="space-y-4">
		{#each data.configs as config (config.id)}
			<section
				class={[
					'rounded-2xl border p-5',
					config.active
						? 'border-slate-700 bg-slate-900'
						: 'border-slate-800 bg-slate-950 opacity-60'
				]}
			>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div>
						<div class="flex items-center gap-3">
							<h2 class="text-2xl font-bold text-white">{config.year}</h2>

							<span
								class={[
									'rounded-full border px-2.5 py-1 text-xs font-semibold',
									config.active
										? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
										: 'border-slate-700 bg-slate-800 text-slate-400'
								]}
							>
								{config.active ? 'Habilitado' : 'Deshabilitado'}
							</span>
						</div>

						<p class="mt-1 text-sm text-slate-500">
							Controla los botones disponibles en Mesas de examen.
						</p>
					</div>

					<form method="POST" action="?/toggleActive">
						<input type="hidden" name="id" value={config.id} />

						<button
							type="submit"
							class="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 hover:border-indigo-500"
						>
							{config.active ? 'Deshabilitar año' : 'Habilitar año'}
						</button>
					</form>
				</div>

				<div class="mt-5 grid gap-3 sm:grid-cols-2">
					<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="font-semibold text-white">Julio</p>
								<p class="mt-1 text-xs text-slate-500">1 llamado</p>
							</div>

							<form method="POST" action="?/togglePeriod">
								<input type="hidden" name="id" value={config.id} />
								<input type="hidden" name="period" value="JULY" />

								<button
									type="submit"
									disabled={!config.active}
									class={[
										'rounded-lg border px-3 py-2 text-xs font-semibold',
										config.julyEnabled
											? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
											: 'border-slate-700 text-slate-500'
									]}
								>
									{config.julyEnabled ? 'Habilitado' : 'Deshabilitado'}
								</button>
							</form>
						</div>
					</div>

					<div class="rounded-xl border border-slate-800 bg-slate-950 p-4">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="font-semibold text-white">Noviembre – Diciembre</p>
								<p class="mt-1 text-xs text-slate-500">2 llamados</p>
							</div>

							<form method="POST" action="?/togglePeriod">
								<input type="hidden" name="id" value={config.id} />
								<input type="hidden" name="period" value="NOVEMBER_DECEMBER" />

								<button
									type="submit"
									disabled={!config.active}
									class={[
										'rounded-lg border px-3 py-2 text-xs font-semibold',
										config.novemberDecemberEnabled
											? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
											: 'border-slate-700 text-slate-500'
									]}
								>
									{config.novemberDecemberEnabled ? 'Habilitado' : 'Deshabilitado'}
								</button>
							</form>
						</div>
					</div>
				</div>
			</section>
		{/each}
	</div>
</div>
