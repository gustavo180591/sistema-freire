<script lang="ts">
	interface Props {
		message?: string;
	}

	let { message = 'Error al cargar el reporte' }: Props = $props();
</script>

<div
	class="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12"
>
	<svg class="h-16 w-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
		/>
	</svg>
	<p class="mt-4 text-lg font-medium text-slate-300">{message}</p>
</div>
