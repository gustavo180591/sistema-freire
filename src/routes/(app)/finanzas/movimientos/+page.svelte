<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
	const { history, filters } = data;
</script>

<div class="p-6">
	<h1 class="mb-6 text-2xl font-bold">Historial de Movimientos Financieros</h1>

	<div class="mb-6 rounded-lg bg-white p-6 shadow">
		<h2 class="mb-4 text-lg font-semibold">Filtros</h2>
		<form method="POST" action="?/filterMovements" use:enhance>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<div>
					<label class="mb-2 block text-sm font-medium">ID Alumno</label>
					<input
						type="text"
						name="studentId"
						value={filters.studentId || ''}
						class="w-full rounded border p-2"
					/>
				</div>
				<div>
					<label class="mb-2 block text-sm font-medium">Tipo de Movimiento</label>
					<select name="movementType" class="w-full rounded border p-2">
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
					<label class="mb-2 block text-sm font-medium">Fecha Desde</label>
					<input
						type="date"
						name="startDate"
						value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
						class="w-full rounded border p-2"
					/>
				</div>
				<div>
					<label class="mb-2 block text-sm font-medium">Fecha Hasta</label>
					<input
						type="date"
						name="endDate"
						value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
						class="w-full rounded border p-2"
					/>
				</div>
			</div>
			<div class="mt-4">
				<button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
					Filtrar
				</button>
			</div>
		</form>
	</div>

	<div class="rounded-lg bg-white p-6 shadow">
		<h2 class="mb-4 text-lg font-semibold">
			Movimientos ({history.total})
		</h2>
		<div class="overflow-x-auto">
			<table class="min-w-full">
				<thead>
					<tr class="border-b">
						<th class="py-2 text-left">Fecha</th>
						<th class="py-2 text-left">Alumno</th>
						<th class="py-2 text-left">Tipo</th>
						<th class="py-2 text-left">Descripción</th>
						<th class="py-2 text-right">Monto</th>
						<th class="py-2 text-right">Balance Anterior</th>
						<th class="py-2 text-right">Balance Posterior</th>
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
									class="rounded px-2 py-1 text-xs {movement.movementType === 'PAYMENT' ||
									movement.movementType === 'ALLOCATION'
										? 'bg-green-100 text-green-800'
										: movement.movementType === 'CHARGE' || movement.movementType === 'LATE_FEE'
											? 'bg-red-100 text-red-800'
											: 'bg-gray-100 text-gray-800'}"
								>
									{movement.movementType}
								</span>
							</td>
							<td class="py-2">{movement.description}</td>
							<td class="py-2 text-right">${movement.amount.toString()}</td>
							<td class="py-2 text-right">${movement.balanceBefore.toString()}</td>
							<td class="py-2 text-right">${movement.balanceAfter.toString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
