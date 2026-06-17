<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let periodForm: HTMLFormElement;
	let movementsForm: HTMLFormElement;

	function downloadCSV(csv: string, filename: string) {
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function exportPeriodCSV() {
		if (periodForm) {
			periodForm.action = '?/exportPeriodReportCSV';
			periodForm.submit();
		}
	}

	function exportMovementsCSV() {
		if (movementsForm) {
			movementsForm.action = '?/exportMovementsCSV';
			movementsForm.submit();
		}
	}
</script>

<div class="p-6">
	<h1 class="text-2xl font-bold mb-6">Reportes Financieros</h1>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<div class="bg-white p-6 rounded-lg shadow">
			<h2 class="text-lg font-semibold mb-4">Reporte por Período</h2>
			<form method="POST" action="?/getPeriodReport" use:enhance bind:this={periodForm}>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-2">Fecha Desde</label>
					<input type="date" name="startDate" class="w-full p-2 border rounded" />
				</div>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-2">Fecha Hasta</label>
					<input type="date" name="endDate" class="w-full p-2 border rounded" />
				</div>
				<div class="flex gap-2">
					<button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
						Generar Reporte
					</button>
					<button
						type="button"
						onclick={exportPeriodCSV}
						class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
					>
						Exportar CSV
					</button>
				</div>
			</form>
			{#if form?.csv && form?.filename}
				<button
					onclick={() => downloadCSV(form.csv, form.filename)}
					class="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
				>
					Descargar {form.filename} ({form.recordCount} registros)
				</button>
			{/if}
		</div>

		<div class="bg-white p-6 rounded-lg shadow">
			<h2 class="text-lg font-semibold mb-4">Historial de Movimientos</h2>
			<form method="POST" action="?/getMovementsHistory" use:enhance bind:this={movementsForm}>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-2">ID Alumno (opcional)</label>
					<input type="text" name="studentId" class="w-full p-2 border rounded" />
				</div>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-2">Tipo de Movimiento (opcional)</label>
					<select name="movementType" class="w-full p-2 border rounded">
						<option value="">Todos</option>
						<option value="CHARGE">Cargo</option>
						<option value="PAYMENT">Pago</option>
						<option value="ALLOCATION">Asignación</option>
						<option value="RECEIPT">Recibo</option>
						<option value="CANCELLATION">Cancelación</option>
					</select>
				</div>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-2">Fecha Desde</label>
					<input type="date" name="startDate" class="w-full p-2 border rounded" />
				</div>
				<div class="mb-4">
					<label class="block text-sm font-medium mb-2">Fecha Hasta</label>
					<input type="date" name="endDate" class="w-full p-2 border rounded" />
				</div>
				<div class="flex gap-2">
					<button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
						Consultar Historial
					</button>
					<button
						type="button"
						onclick={exportMovementsCSV}
						class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
					>
						Exportar CSV
					</button>
				</div>
			</form>
			{#if form?.csv && form?.filename}
				<button
					onclick={() => downloadCSV(form.csv, form.filename)}
					class="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
				>
					Descargar {form.filename} ({form.recordCount} registros)
				</button>
			{/if}
		</div>
	</div>
</div>
