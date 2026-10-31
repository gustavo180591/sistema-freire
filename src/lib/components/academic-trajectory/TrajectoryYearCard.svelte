<script lang="ts">
	import { enhance } from '$app/forms';

	interface YearSummary {
		yearLevel: number;
		total: number;
		approved: number;
		regular: number;
		taking: number;
		pending: number;
		approvable: number;
	}

	let {
		year,
		selected,
		canManage,
		onSelect
	}: {
		year: YearSummary;
		selected: boolean;
		canManage: boolean;
		onSelect: () => void;
	} = $props();

	let approving = $state(false);
	let feedback = $state<string | null>(null);
</script>

<div
	class={`overflow-hidden rounded-2xl border transition ${
		selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/70'
	}`}
>
	<button
		type="button"
		onclick={onSelect}
		class="w-full p-5 text-left transition hover:bg-slate-800/30"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<p class="text-xl font-bold text-white">
					{year.yearLevel}° año
				</p>

				<p class="mt-1 text-sm text-slate-500">
					{year.total} materias
				</p>
			</div>

			{#if selected}
				<span class="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-slate-950">
					Activo
				</span>
			{/if}
		</div>

		<div class="mt-4 grid grid-cols-2 gap-2 text-xs">
			<div class="rounded-lg bg-slate-950/70 px-2.5 py-2 text-slate-400">
				<span class="font-semibold text-emerald-300">
					{year.approved}
				</span>
				aprobadas
			</div>

			<div class="rounded-lg bg-slate-950/70 px-2.5 py-2 text-slate-400">
				<span class="font-semibold text-amber-300">
					{year.regular}
				</span>
				regulares
			</div>

			<div class="rounded-lg bg-slate-950/70 px-2.5 py-2 text-slate-400">
				<span class="font-semibold text-blue-300">
					{year.taking}
				</span>
				cursando
			</div>

			<div class="rounded-lg bg-slate-950/70 px-2.5 py-2 text-slate-400">
				<span class="font-semibold text-slate-300">
					{year.pending}
				</span>
				sin cargar
			</div>
		</div>
	</button>

	{#if canManage}
		<div class="border-t border-slate-800 p-3">
			<form
				method="POST"
				action="?/approveYear"
				use:enhance={({ cancel }) => {
					if (
						!window.confirm(
							`¿Aprobar las ${year.approvable} materias que todavía no están aprobadas de ${year.yearLevel}° año? Las cursadas y antecedentes existentes se conservarán.`
						)
					) {
						cancel();
						return;
					}

					approving = true;
					feedback = null;

					return async ({ result, update }) => {
						approving = false;

						if (result.type === 'success') {
							const resultData = result.data as {
								message?: string;
							};

							feedback = resultData.message ?? 'Año actualizado correctamente';

							await update({
								reset: false,
								invalidateAll: true
							});

							return;
						}

						if (result.type === 'failure') {
							const resultData = result.data as {
								approveYearError?: string;
							};

							feedback = resultData.approveYearError ?? 'No se pudo aprobar el año';
						}
					};
				}}
			>
				<input type="hidden" name="yearLevel" value={year.yearLevel} />

				<button
					type="submit"
					disabled={year.approvable === 0 || approving}
					class="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{#if approving}
						Aprobando…
					{:else if year.approvable === 0}
						✓ Año completo aprobado
					{:else}
						✓ Aprobar año entero · {year.approvable}
					{/if}
				</button>
			</form>

			{#if feedback}
				<p class="mt-2 text-xs leading-5 text-emerald-300">
					{feedback}
				</p>
			{/if}
		</div>
	{/if}
</div>
