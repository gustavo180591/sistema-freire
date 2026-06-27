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
	<h1 class="text-2xl font-bold mb-6">Control de Deuda y Bloqueos</h1>

	{#if data.studentStatus}
		<div class="bg-white rounded-lg shadow p-6 mb-6">
			<h2 class="text-xl font-semibold mb-4">Estado Financiero del Alumno</h2>
			<p class="text-gray-600">Vista de deuda y bloqueos en desarrollo.</p>
		</div>

		<!-- Phase 5.5: Agreement Debt Summary -->
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold">Deuda con Convenios de Pago</h2>
				<button
					type="button"
					onclick={() => loadAgreementDebt(data.studentStatus.student.id)}
					disabled={loadingAgreementDebt}
					class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loadingAgreementDebt ? 'Cargando...' : 'Ver Deuda Efectiva'}
				</button>
			</div>

			{#if agreementDebtError}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					{agreementDebtError}
				</div>
			{/if}

			{#if showAgreementDebt && agreementDebtData?.agreementDebtSummary}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
					<div class="bg-gray-50 p-4 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">Deuda Original Total</p>
						<p class="text-2xl font-bold text-gray-900">
							${agreementDebtData.agreementDebtSummary.originalDebtTotal.toString()}
						</p>
					</div>
					<div class="bg-blue-50 p-4 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">Cubierta por Convenios Activos</p>
						<p class="text-2xl font-bold text-blue-600">
							${agreementDebtData.agreementDebtSummary.originalDebtCoveredByActiveAgreements.toString()}
						</p>
					</div>
					<div class="bg-green-50 p-4 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">Deuda Exigible Efectiva</p>
						<p class="text-2xl font-bold text-green-600">
							${agreementDebtData.agreementDebtSummary.effectiveTotalDebt.toString()}
						</p>
					</div>
					<div class="bg-purple-50 p-4 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">Pendiente de Convenios</p>
						<p class="text-2xl font-bold text-purple-600">
							${agreementDebtData.agreementDebtSummary.agreementPendingDebt.toString()}
						</p>
					</div>
					<div class="bg-orange-50 p-4 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">Vencida de Convenios</p>
						<p class="text-2xl font-bold text-orange-600">
							${agreementDebtData.agreementDebtSummary.agreementOverdueDebt.toString()}
						</p>
					</div>
					<div class="bg-red-50 p-4 rounded-lg">
						<p class="text-sm text-gray-600 mb-1">Incumplida de Convenios</p>
						<p class="text-2xl font-bold text-red-600">
							${agreementDebtData.agreementDebtSummary.agreementDefaultedDebt.toString()}
						</p>
					</div>
				</div>

				<div class="mt-4 p-4 bg-gray-50 rounded-lg">
					<p class="text-sm text-gray-600">
						<strong>Convenios Activos:</strong> {agreementDebtData.agreementDebtSummary.activeAgreementsCount} |
						<strong>Convenios Completados:</strong> {agreementDebtData.agreementDebtSummary.completedAgreementsCount} |
						<strong>Convenios Incumplidos:</strong> {agreementDebtData.agreementDebtSummary.defaultedAgreementsCount}
					</p>
				</div>
			{/if}
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow p-6">
			<p class="text-gray-600">Seleccione un alumno para ver su estado financiero.</p>
		</div>
	{/if}
</div>
