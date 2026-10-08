<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Elegir rol | Sistema Freire</title>
</svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
	<div class="mb-8">
		<p class="text-sm font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
			Contexto de trabajo
		</p>

		<h1 class="mt-2 text-3xl font-bold text-slate-900 dark:text-white">¿Cómo querés trabajar?</h1>

		<p class="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
			{data.userName}, tenés {data.roles.length} roles asignados. Elegí la interfaz que necesitás utilizar.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		{#each data.roles as role (role.code)}
			<form method="POST" action="/api/session/active-role">
				<input type="hidden" name="role" value={role.code} />

				<button
					type="submit"
					class="h-full w-full rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:border-indigo-400 hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900"
				>
					<div class="flex items-start justify-between gap-4">
						<div>
							<div class="flex items-center gap-2">
								<h2 class="text-lg font-semibold text-slate-900 dark:text-white">
									{role.label}
								</h2>

								{#if role.code === data.activeRole}
									<span
										class="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
									>
										Actual
									</span>
								{/if}
							</div>

							<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
								{role.description}
							</p>
						</div>
					</div>

					<p
						class="mt-5 border-t border-slate-200 pt-4 text-sm font-semibold text-indigo-600 dark:border-slate-800 dark:text-indigo-400"
					>
						Trabajar como {role.label}
					</p>
				</button>
			</form>
		{/each}
	</div>
</div>
