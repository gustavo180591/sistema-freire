<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
	const { history, filters } = data;
</script>

<div class="p-6">
	<h1 class="text-2xl font-bold mb-6">Historial de Movimientos Financieros</h1>

	<div class="bg-white p-6 rounded-lg shadow mb-6">
		<h2 class="text-lg font-semibold mb-4">Filtros</h2>
		<form method="POST" action="?/filterMovements" use:enhance>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div>
					<label class="block text-sm font-medium mb-2">ID Alumno</label>
					<input
						type="text"
						name="studentId"
						value={filters.studentId || ''}
						class="w-full p-2 border rounded"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2">Tipo de Movimiento</label>
					<select name="movementType" class="w-full p-2 border rounded">
						<option value="">Todos</option>
						<option value="CHARGE" selected={filters.movementType === 'CHARGE'}>Cargo</option>
						<option value="PAYMENT" selected={filters.movementType === 'PAYMENT'}>Pago</option>
						<option value="ALLOCATION" selected={filters.movementType === 'ALLOCATION'}
							>Asignación</option
						>
						<option value="RECEIPT" selected={filters.movementType === 'RECEIPT'}>Recibo</option>
						<option value="CANCELLATION" selected={filters.movementType === 'CANCELLATION'}
							>Cancelación</option
						>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2">Fecha Desde</label>
					<input
						type="date"
						name="startDate"
						value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
						class="w-full p-2 border rounded"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2">Fecha Hasta</label>
					<input
						type="date"
						name="endDate"
						value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
						class="w-full p-2 border rounded"
					/>
				</div>
			</div>
			<div class="mt-4">
				<button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
					Filtrar
				</button>
			</div>
		</form>
	</div>

	<div class="bg-white p-6 rounded-lg shadow">
		<h2 class="text-lg font-semibold mb-4">
			Movimientos ({history.total})
		</h2>
		<div class="overflow-x-auto">
			<table class="min-w-full">
				<thead>
					<tr class="border-b">
						<th class="text-left py-2">Fecha</th>
						<th class="text-left py-2">Alumno</th>
						<th class="text-left py-2">Tipo</th>
						<th class="text-left py-2">Descripción</th>
						<th class="text-right py-2">Monto</th>
						<th class="text-right py-2">Balance Anterior</th>
						<th class="text-right py-2">Balance Posterior</th>
					</tr>
				</thead>
				<tbody>
					{#each history.movements as movement}
						<tr class="border-b">
							<td class="py-2">{new Date(movement.createdAt).toLocaleString()}</td>
							<td class="py-2">
								{#if movement.student}
									{movement.student.user.firstName} {movement.student.user.lastName}
								{:else}
									-
								{/if}
							</td>
							<td class="py-2">
								<span
									class="px-2 py-1 rounded text-xs {movement.movementType === 'PAYMENT' ||
									movement.movementType === 'ALLOCATION'
										? 'bg-green-100 text-green-800'
										: movement.movementType === 'CHARGE' ||
												movement.movementType === 'LATE_FEE'
											? 'bg-red-100 text-red-800'
											: 'bg-gray-100 text-gray-800'}"
								>
									{movement.movementType}
								</span>
							</td>
							<td class="py-2">{movement.description}</td>
							<td class="text-right py-2">${movement.amount.toString()}</td>
							<td class="text-right py-2">${movement.balanceBefore.toString()}</td>
							<td class="text-right py-2">${movement.balanceAfter.toString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
