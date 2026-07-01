<script lang="ts">
	interface Props {
		message?: string;
	}

	let { message = 'Cargando reporte...' }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70 p-12">
	<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
	<p class="mt-4 text-lg font-medium text-slate-300">{message}</p>
</div>
