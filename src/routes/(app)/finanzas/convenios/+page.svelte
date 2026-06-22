<script lang="ts">
	interface PaymentAgreement {
		id: string;
		agreementNumber: number;
		agreementYear: number;
		studentName: string;
		agreedAmount: { toString: () => string };
		status: string;
		createdAt: Date;
	}

	interface PageData {
		agreements: PaymentAgreement[];
		isStudent: boolean;
	}

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Convenios de Pago | ISFD "PAULO FREIRE" 1117</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-white">Convenios de Pago</h1>
			<p class="text-slate-400">Gestión de convenios de pago con alumnos</p>
		</div>
		{#if !data.isStudent}
			<a
				href="/finanzas/convenios/nuevo"
				class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
			>
				Nuevo Convenio
			</a>
		{/if}
	</div>

	{#if data.agreements.length === 0}
		<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
			<p class="text-slate-400">No hay convenios de pago registrados</p>
		</div>
	{:else}
		<div class="rounded-lg border border-slate-700 bg-slate-800/50">
			<table class="w-full">
				<thead>
					<tr class="border-b border-slate-700">
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-300">Número</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-300">Alumno</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-300">Monto Acordado</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-300">Estado</th>
						<th class="px-4 py-3 text-left text-sm font-medium text-slate-300">Fecha</th>
						<th class="px-4 py-3 text-right text-sm font-medium text-slate-300">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each data.agreements as agreement}
						<tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
							<td class="px-4 py-3 text-sm text-white">
								{agreement.agreementNumber}/{agreement.agreementYear}
							</td>
							<td class="px-4 py-3 text-sm text-white">{agreement.studentName}</td>
							<td class="px-4 py-3 text-sm text-white">${agreement.agreedAmount.toString()}</td>
							<td class="px-4 py-3 text-sm">
								{#if agreement.status === 'ACTIVE'}
									<span
										class="rounded-full bg-green-900/30 px-2 py-1 text-xs font-medium text-green-400"
									>
										{agreement.status}
									</span>
								{:else if agreement.status === 'DRAFT'}
									<span
										class="rounded-full bg-yellow-900/30 px-2 py-1 text-xs font-medium text-yellow-400"
									>
										{agreement.status}
									</span>
								{:else if agreement.status === 'CANCELLED'}
									<span
										class="rounded-full bg-red-900/30 px-2 py-1 text-xs font-medium text-red-400"
									>
										{agreement.status}
									</span>
								{:else}
									<span
										class="rounded-full bg-slate-700 px-2 py-1 text-xs font-medium text-slate-300"
									>
										{agreement.status}
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-sm text-slate-300">
								{new Date(agreement.createdAt).toLocaleDateString('es-AR')}
							</td>
							<td class="px-4 py-3 text-right">
								<a
									href="/finanzas/convenios/{agreement.id}"
									class="text-indigo-400 hover:text-indigo-300"
								>
									Ver
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
