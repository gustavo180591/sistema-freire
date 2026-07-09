<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let showAgreementDebt = $state(false);
	let agreementDebtData = $state<any>(null);
	let loadingAgreementDebt = $state(false);
	let agreementDebtError = $state<string | null>(null);

	async function loadAgreementDebt(studentId: string) {
		loadingAgreementDebt = true;
		agreementDebtError = null;
		try {
			const formData = new FormData();
			formData.append('studentId', studentId);
			const response = await fetch('/finanzas/deuda', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			if (result.success) {
				agreementDebtData = result.status;
				showAgreementDebt = true;
			} else {
				agreementDebtError = result.error || 'Error al cargar deuda con convenios';
			}
		} catch (e) {
			agreementDebtError = 'Error al cargar deuda con convenios';
		} finally {
			loadingAgreementDebt = false;
		}
	}
</script>

<div class="container mx-auto p-6">
	<h1 class="mb-6 text-2xl font-bold">Control de Deuda y Bloqueos</h1>

	{#if data.studentStatus}
		<div class="mb-6 rounded-lg bg-white p-6 shadow">
			<h2 class="mb-4 text-xl font-semibold">Estado Financiero del Alumno</h2>
			<p class="text-gray-600">Vista de deuda y bloqueos en desarrollo.</p>
		</div>

		<!-- Phase 5.5: Agreement Debt Summary -->
		<div class="rounded-lg bg-white p-6 shadow">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold">Deuda con Convenios de Pago</h2>
				<button
					type="button"
					onclick={() => loadAgreementDebt(data.studentStatus.student.id)}
					disabled={loadingAgreementDebt}
					class="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{loadingAgreementDebt ? 'Cargando...' : 'Ver Deuda Efectiva'}
				</button>
			</div>

			{#if agreementDebtError}
				<div class="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
					{agreementDebtError}
				</div>
			{/if}

			{#if showAgreementDebt && agreementDebtData?.agreementDebtSummary}
				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<div class="rounded-lg bg-gray-50 p-4">
						<p class="mb-1 text-sm text-gray-600">Deuda Original Total</p>
						<p class="text-2xl font-bold text-gray-900">
							${agreementDebtData.agreementDebtSummary.originalDebtTotal.toString()}
						</p>
					</div>
					<div class="rounded-lg bg-blue-50 p-4">
						<p class="mb-1 text-sm text-gray-600">Cubierta por Convenios Activos</p>
						<p class="text-2xl font-bold text-blue-600">
							${agreementDebtData.agreementDebtSummary.originalDebtCoveredByActiveAgreements.toString()}
						</p>
					</div>
					<div class="rounded-lg bg-green-50 p-4">
						<p class="mb-1 text-sm text-gray-600">Deuda Exigible Efectiva</p>
						<p class="text-2xl font-bold text-green-600">
							${agreementDebtData.agreementDebtSummary.effectiveTotalDebt.toString()}
						</p>
					</div>
					<div class="rounded-lg bg-purple-50 p-4">
						<p class="mb-1 text-sm text-gray-600">Pendiente de Convenios</p>
						<p class="text-2xl font-bold text-purple-600">
							${agreementDebtData.agreementDebtSummary.agreementPendingDebt.toString()}
						</p>
					</div>
					<div class="rounded-lg bg-orange-50 p-4">
						<p class="mb-1 text-sm text-gray-600">Vencida de Convenios</p>
						<p class="text-2xl font-bold text-orange-600">
							${agreementDebtData.agreementDebtSummary.agreementOverdueDebt.toString()}
						</p>
					</div>
					<div class="rounded-lg bg-red-50 p-4">
						<p class="mb-1 text-sm text-gray-600">Incumplida de Convenios</p>
						<p class="text-2xl font-bold text-red-600">
							${agreementDebtData.agreementDebtSummary.agreementDefaultedDebt.toString()}
						</p>
					</div>
				</div>

				<div class="mt-4 rounded-lg bg-gray-50 p-4">
					<p class="text-sm text-gray-600">
						<strong>Convenios Activos:</strong>
						{agreementDebtData.agreementDebtSummary.activeAgreementsCount} |
						<strong>Convenios Completados:</strong>
						{agreementDebtData.agreementDebtSummary.completedAgreementsCount} |
						<strong>Convenios Incumplidos:</strong>
						{agreementDebtData.agreementDebtSummary.defaultedAgreementsCount}
					</p>
				</div>
			{/if}
		</div>
	{:else}
		<div class="rounded-lg bg-white p-6 shadow">
			<p class="text-gray-600">Seleccione un alumno para ver su estado financiero.</p>
		</div>
	{/if}
</div>
