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
	<h1 class="mb-6 text-2xl font-bold">Reportes Financieros</h1>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<div class="rounded-lg bg-white p-6 shadow">
			<h2 class="mb-4 text-lg font-semibold">Reporte por Período</h2>
			<form method="POST" action="?/getPeriodReport" use:enhance bind:this={periodForm}>
				<div class="mb-4">
					<label class="mb-2 block text-sm font-medium">Fecha Desde</label>
					<input type="date" name="startDate" class="w-full rounded border p-2" />
				</div>
				<div class="mb-4">
					<label class="mb-2 block text-sm font-medium">Fecha Hasta</label>
					<input type="date" name="endDate" class="w-full rounded border p-2" />
				</div>
				<div class="flex gap-2">
					<button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
						Generar Reporte
					</button>
					<button
						type="button"
						onclick={exportPeriodCSV}
						class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
					>
						Exportar CSV
					</button>
				</div>
			</form>
			{#if form?.csv && form?.filename}
				<button
					onclick={() => downloadCSV(form.csv, form.filename)}
					class="mt-4 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
				>
					Descargar {form.filename} ({form.recordCount} registros)
				</button>
			{/if}
		</div>

		<div class="rounded-lg bg-white p-6 shadow">
			<h2 class="mb-4 text-lg font-semibold">Historial de Movimientos</h2>
			<form method="POST" action="?/getMovementsHistory" use:enhance bind:this={movementsForm}>
				<div class="mb-4">
					<label class="mb-2 block text-sm font-medium">ID Alumno (opcional)</label>
					<input type="text" name="studentId" class="w-full rounded border p-2" />
				</div>
				<div class="mb-4">
					<label class="mb-2 block text-sm font-medium">Tipo de Movimiento (opcional)</label>
					<select name="movementType" class="w-full rounded border p-2">
						<option value="">Todos</option>
						<option value="CHARGE">Cargo</option>
						<option value="PAYMENT">Pago</option>
						<option value="ALLOCATION">Asignación</option>
						<option value="RECEIPT">Recibo</option>
						<option value="CANCELLATION">Cancelación</option>
					</select>
				</div>
				<div class="mb-4">
					<label class="mb-2 block text-sm font-medium">Fecha Desde</label>
					<input type="date" name="startDate" class="w-full rounded border p-2" />
				</div>
				<div class="mb-4">
					<label class="mb-2 block text-sm font-medium">Fecha Hasta</label>
					<input type="date" name="endDate" class="w-full rounded border p-2" />
				</div>
				<div class="flex gap-2">
					<button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
						Consultar Historial
					</button>
					<button
						type="button"
						onclick={exportMovementsCSV}
						class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
					>
						Exportar CSV
					</button>
				</div>
			</form>
			{#if form?.csv && form?.filename}
				<button
					onclick={() => downloadCSV(form.csv, form.filename)}
					class="mt-4 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
				>
					Descargar {form.filename} ({form.recordCount} registros)
				</button>
			{/if}
		</div>
	</div>
</div>
