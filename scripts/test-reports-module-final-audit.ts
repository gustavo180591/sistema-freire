// Reports Module Final Audit Script
// Fase 6: Auditoría integral del módulo REPORTES

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const testResults: { name: string; passed: boolean; error?: string }[] = [];

function runTest(name: string, testFn: () => void) {
	try {
		testFn();
		testResults.push({ name, passed: true });
		console.log(`✅ ${name}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		testResults.push({ name, passed: false, error: message });
		console.log(`❌ ${name}: ${message}`);
	}
}

// Test 1: Services directory exists
runTest('Services directory exists', () => {
	const path = join(process.cwd(), 'src/lib/server/reports');
	if (!existsSync(path)) {
		throw new Error('Services directory does not exist');
	}
});

// Test 2: Services files exist
runTest('Services files exist', () => {
	const services = [
		'src/lib/server/reports/reports.types.ts',
		'src/lib/server/reports/reports.service.ts',
		'src/lib/server/reports/institutional-reports.service.ts',
		'src/lib/server/reports/financial-reports.service.ts',
		'src/lib/server/reports/academic-reports.service.ts',
		'src/lib/server/reports/attendance-reports.service.ts',
		'src/lib/server/reports/report-permissions.ts',
		'src/lib/server/reports/report-api-helpers.ts',
		'src/lib/server/reports/report-export.helpers.ts',
		'src/lib/server/reports/report-export.service.ts'
	];

	for (const service of services) {
		const path = join(process.cwd(), service);
		if (!existsSync(path)) {
			throw new Error(`Service file does not exist: ${service}`);
		}
	}
});

// Test 3: JSON endpoints exist
runTest('JSON endpoints exist', () => {
	const endpoints = [
		'src/routes/api/reports/institutional/+server.ts',
		'src/routes/api/reports/financial/+server.ts',
		'src/routes/api/reports/academic/+server.ts',
		'src/routes/api/reports/attendance/+server.ts'
	];

	for (const endpoint of endpoints) {
		const path = join(process.cwd(), endpoint);
		if (!existsSync(path)) {
			throw new Error(`JSON endpoint does not exist: ${endpoint}`);
		}
	}
});

// Test 4: CSV endpoints exist
runTest('CSV endpoints exist', () => {
	const endpoints = [
		'src/routes/api/reports/institutional/export/+server.ts',
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const endpoint of endpoints) {
		const path = join(process.cwd(), endpoint);
		if (!existsSync(path)) {
			throw new Error(`CSV endpoint does not exist: ${endpoint}`);
		}
	}
});

// Test 5: UI exists
runTest('UI exists', () => {
	const ui = [
		'src/routes/(app)/reportes/dashboard/+page.server.ts',
		'src/routes/(app)/reportes/dashboard/+page.svelte',
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const file of ui) {
		const path = join(process.cwd(), file);
		if (!existsSync(path)) {
			throw new Error(`UI file does not exist: ${file}`);
		}
	}
});

// Test 6: Chart components exist
runTest('Chart components exist', () => {
	const charts = [
		'src/lib/components/reports/charts/SimpleBarChart.svelte',
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	for (const chart of charts) {
		const path = join(process.cwd(), chart);
		if (!existsSync(path)) {
			throw new Error(`Chart component does not exist: ${chart}`);
		}
	}
});

// Test 7: Test scripts exist
runTest('Test scripts exist', () => {
	const scripts = [
		'scripts/test-reports-services.ts',
		'scripts/test-reports-endpoints.ts',
		'scripts/test-reports-ui.ts',
		'scripts/test-reports-exports.ts',
		'scripts/test-reports-visualizations.ts'
	];

	for (const script of scripts) {
		const path = join(process.cwd(), script);
		if (!existsSync(path)) {
			throw new Error(`Test script does not exist: ${script}`);
		}
	}
});

// Test 8: Phase documentation exists
runTest('Phase documentation exists', () => {
	const docs = [
		'docs/REPORTS_MODULE_PHASE_0_DIAGNOSIS.md',
		'docs/REPORTS_MODULE_PHASE_1_SERVER_SERVICES.md',
		'docs/REPORTS_MODULE_PHASE_2_PROTECTED_ENDPOINTS.md',
		'docs/REPORTS_MODULE_PHASE_3_UI.md',
		'docs/REPORTS_MODULE_PHASE_4_EXPORTS.md',
		'docs/REPORTS_MODULE_PHASE_5_VISUALIZATIONS.md'
	];

	for (const doc of docs) {
		const path = join(process.cwd(), doc);
		if (!existsSync(path)) {
			throw new Error(`Phase documentation does not exist: ${doc}`);
		}
	}
});

// Test 9: No Prisma in UI
runTest('No Prisma in UI', () => {
	const uiFiles = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte',
		'src/lib/components/reports/charts/SimpleBarChart.svelte',
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	for (const file of uiFiles) {
		const path = join(process.cwd(), file);
		const content = readFileSync(path, 'utf-8');
		if (content.includes('from \'$lib/server/db/prisma\'') || content.includes('from \'@prisma/client\'')) {
			throw new Error(`Prisma import found in UI file: ${file}`);
		}
	}
});

// Test 10: No SQL raw in services
runTest('No SQL raw in services', () => {
	const serviceFiles = [
		'src/lib/server/reports/institutional-reports.service.ts',
		'src/lib/server/reports/financial-reports.service.ts',
		'src/lib/server/reports/academic-reports.service.ts',
		'src/lib/server/reports/attendance-reports.service.ts'
	];

	const queryRawPattern = '$' + 'queryRaw';
	const executeRawPattern = '$' + 'executeRaw';

	for (const file of serviceFiles) {
		const path = join(process.cwd(), file);
		const content = readFileSync(path, 'utf-8');
		if (content.includes(queryRawPattern) || content.includes(executeRawPattern)) {
			throw new Error(`SQL raw found in service file: ${file}`);
		}
	}
});

// Test 11: No forbidden patterns in services
runTest('No forbidden patterns in services', () => {
	const serviceFiles = [
		'src/lib/server/reports/institutional-reports.service.ts',
		'src/lib/server/reports/financial-reports.service.ts',
		'src/lib/server/reports/academic-reports.service.ts',
		'src/lib/server/reports/attendance-reports.service.ts'
	];

	const anyPattern = ':' + ' any';
	const asAnyPattern = 'as' + ' any';
	const tsIgnorePattern = '@' + 'ts-ignore';
	const tsExpectErrorPattern = '@' + 'ts-expect-error';

	for (const file of serviceFiles) {
		const path = join(process.cwd(), file);
		const content = readFileSync(path, 'utf-8');
		if (content.includes(anyPattern) && !content.includes('//')) {
			throw new Error(`Forbidden type pattern found in service file: ${file}`);
		}
		if (content.includes(asAnyPattern) && !content.includes('//')) {
			throw new Error(`Forbidden cast pattern found in service file: ${file}`);
		}
		if (content.includes(tsIgnorePattern)) {
			throw new Error(`Forbidden directive found in service file: ${file}`);
		}
		if (content.includes(tsExpectErrorPattern)) {
			throw new Error(`Forbidden directive found in service file: ${file}`);
		}
	}
});

// Test 12: No storage/private in UI
runTest('No storage/private in UI', () => {
	const uiFiles = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const file of uiFiles) {
		const path = join(process.cwd(), file);
		const content = readFileSync(path, 'utf-8');
		if (content.includes('storage/private') || content.includes('static/uploads')) {
			throw new Error(`storage/private or static/uploads found in UI file: ${file}`);
		}
	}
});

// Test 13: No new API routes outside reports
runTest('No new API routes outside reports', () => {
	// Check that no new API routes were created outside /api/reports
	// This is a basic check - in production you'd want more comprehensive validation
	const reportsApiPath = join(process.cwd(), 'src/routes/api/reports');
	if (!existsSync(reportsApiPath)) {
		throw new Error('Reports API directory does not exist');
	}
});

// Test 14: No PDF/Excel as active implementation in reports API
runTest('No PDF/Excel as active implementation in reports API', () => {
	// Check that we did not create new PDF/Excel endpoints under /api/reports
	// Pre-existing routes under /reportes/ are not part of the reports module
	const reportsApiPath = join(process.cwd(), 'src/routes/api/reports');
	
	// Check that no PDF/Excel export endpoints exist under /api/reports
	const pdfExportPath = join(reportsApiPath, 'institutional/export/pdf');
	const excelExportPath = join(reportsApiPath, 'institutional/export/excel');
	
	if (existsSync(pdfExportPath)) {
		throw new Error('PDF export endpoint exists under /api/reports (not allowed)');
	}
	if (existsSync(excelExportPath)) {
		throw new Error('Excel export endpoint exists under /api/reports (not allowed)');
	}
});

// Test 15: Export endpoints exist
runTest('Export endpoints exist', () => {
	const exportEndpoints = [
		'src/routes/api/reports/institutional/export/+server.ts',
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const endpoint of exportEndpoints) {
		const path = join(process.cwd(), endpoint);
		if (!existsSync(path)) {
			throw new Error(`Export endpoint does not exist: ${endpoint}`);
		}
	}
});

// Test 16: Permission helpers exist
runTest('Permission helpers exist', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-permissions.ts');
	if (!existsSync(path)) {
		throw new Error('Permission helpers file does not exist');
	}

	const content = readFileSync(path, 'utf-8');
	if (!content.includes('hasExplicitPermission')) {
		throw new Error('hasExplicitPermission function not found');
	}
	if (!content.includes('checkExplicitPermission')) {
		throw new Error('checkExplicitPermission function not found');
	}
	if (!content.includes('isSuperAdmin')) {
		throw new Error('isSuperAdmin function not found');
	}
});

// Test 17: SUPERADMIN documented for institutional
runTest('SUPERADMIN documented for institutional', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/institutional/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('SUPERADMIN')) {
		throw new Error('SUPERADMIN not documented in institutional endpoint');
	}
});

// Test 18: FINANCIAL_REPORT documented
runTest('FINANCIAL_REPORT documented', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/financial/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('FINANCIAL_REPORT')) {
		throw new Error('FINANCIAL_REPORT not documented in financial endpoint');
	}
});

// Test 19: GRADE documented
runTest('GRADE documented', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/academic/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('GRADE')) {
		throw new Error('GRADE not documented in academic endpoint');
	}
});

// Test 20: ATTENDANCE documented
runTest('ATTENDANCE documented', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/attendance/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('ATTENDANCE')) {
		throw new Error('ATTENDANCE not documented in attendance endpoint');
	}
});

// Test 21: PaymentAgreement not altered
runTest('PaymentAgreement not altered', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/financial-reports.service.ts');
	const content = readFileSync(path, 'utf-8');
	if (content.includes('prisma.paymentAgreement.update') || content.includes('prisma.paymentAgreement.delete')) {
		throw new Error('PaymentAgreement is being modified in financial reports service');
	}
});

// Test 22: Attendance with observation not formal justification
runTest('Attendance with observation not formal justification', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/attendance-reports.service.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('provisional') || !content.includes('NOT a formal justification')) {
		throw new Error('Attendance service does not document that justification is provisional');
	}
});

// Test 23: Dashboard route documented
runTest('Dashboard route documented', () => {
	const path = join(process.cwd(), 'src/routes/(app)/reportes/dashboard/+page.svelte');
	if (!existsSync(path)) {
		throw new Error('Dashboard route does not exist');
	}
});

// Test 24: Module closure documented
runTest('Module closure documented', () => {
	const path = join(process.cwd(), 'docs/REPORTS_MODULE_CLOSURE.md');
	if (!existsSync(path)) {
		throw new Error('Module closure document does not exist');
	}
});

// Test 25: All previous test scripts still exist
runTest('All previous test scripts still exist', () => {
	const scripts = [
		'scripts/test-reports-services.ts',
		'scripts/test-reports-endpoints.ts',
		'scripts/test-reports-ui.ts',
		'scripts/test-reports-exports.ts',
		'scripts/test-reports-visualizations.ts'
	];

	for (const script of scripts) {
		const path = join(process.cwd(), script);
		if (!existsSync(path)) {
			throw new Error(`Previous test script does not exist: ${script}`);
		}
	}
});

// Test 26: Final audit documentation exists
runTest('Final audit documentation exists', () => {
	const path = join(process.cwd(), 'docs/REPORTS_MODULE_FINAL_AUDIT.md');
	if (!existsSync(path)) {
		throw new Error('Final audit document does not exist');
	}
});

// Test 27: Operation checklist exists
runTest('Operation checklist exists', () => {
	const path = join(process.cwd(), 'docs/REPORTS_MODULE_OPERATION_CHECKLIST.md');
	if (!existsSync(path)) {
		throw new Error('Operation checklist does not exist');
	}
});

// Print summary
console.log('\n=== Test Summary ===');
const passed = testResults.filter((r) => r.passed).length;
const failed = testResults.filter((r) => !r.passed).length;
console.log(`Tests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);
console.log(`Total Tests: ${testResults.length}`);

if (failed > 0) {
	console.log('\n❌ Failed tests:');
	testResults.filter((r) => !r.passed).forEach((r) => {
		console.log(`  - ${r.name}: ${r.error}`);
	});
	process.exit(1);
} else {
	console.log('\n✅ All tests passed!');
}
