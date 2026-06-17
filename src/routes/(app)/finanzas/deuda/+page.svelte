<script lang="ts">
	import { page } from '$app/stores';

	let { data } = $props();
</script>

<div class="container mx-auto p-6">
	<h1 class="text-2xl font-bold mb-6">Control de Deuda y Bloqueos</h1>

	{#if data.studentStatus}
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-xl font-semibold mb-4">Estado Financiero del Alumno</h2>
			<p class="text-gray-600">Vista de deuda y bloqueos en desarrollo.</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow p-6">
			<p class="text-gray-600">Seleccione un alumno para ver su estado financiero.</p>
		</div>
	{/if}
</div>
