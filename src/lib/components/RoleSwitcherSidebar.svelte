<script lang="ts">
	interface User {
		assignedRoles: string[];
		activeRole: string | null;
	}

	let { user }: { user: User | null } = $props();

	let isOpen = $state(false);

	const roleLabels: Record<string, string> = {
		SUPERADMIN: 'Superadministrador',
		DIRECTOR: 'Director',
		SECRETARIA: 'Secretaría',
		DOCENTE: 'Docente',
		ALUMNO: 'Alumno',
		FINANZAS: 'Finanzas',
		APODERADO: 'Apoderado',
		PRECEPTOR: 'Preceptor',
		LIQUIDADOR: 'Liquidador',
		SIN_TIPO: 'Sin tipo'
	};

	function getRoleLabel(role: string | null): string {
		if (!role) return 'Sin seleccionar';

		return roleLabels[role] ?? role;
	}
</script>

{#if user && user.assignedRoles.length > 1}
	<div class="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
		<button
			type="button"
			onclick={() => (isOpen = !isOpen)}
			class="light-hover-contrast flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
			aria-expanded={isOpen}
		>
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<svg
						class="h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7h8m0 0-3-3m3 3-3 3M16 17H8m0 0 3 3m-3-3 3-3"
						/>
					</svg>

					<span class="text-sm font-medium text-slate-700 dark:text-slate-200"> Cambiar rol </span>
				</div>

				<p class="mt-1 pl-7 text-xs text-slate-500 dark:text-slate-400">
					{user.assignedRoles.length} roles · {getRoleLabel(user.activeRole)}
				</p>
			</div>

			<svg
				class="h-4 w-4 shrink-0 text-slate-400 transition-transform"
				class:rotate-180={isOpen}
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if isOpen}
			<div class="mt-1 space-y-1 pl-3">
				{#each user.assignedRoles as role (role)}
					<form method="POST" action="/api/session/active-role">
						<input type="hidden" name="role" value={role} />

						<button
							type="submit"
							class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors
								{role === user.activeRole
								? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
								: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}"
						>
							<span>{getRoleLabel(role)}</span>

							{#if role === user.activeRole}
								<span
									class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-700 uppercase dark:bg-indigo-900/60 dark:text-indigo-300"
								>
									Actual
								</span>
							{/if}
						</button>
					</form>
				{/each}
			</div>
		{/if}
	</div>
{/if}
