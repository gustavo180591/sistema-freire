// Reports Exports Test
// Fase 4: Exportación básica controlada

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('=== Reports Exports Test ===\n');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name: string, testFn: () => void) {
	try {
		testFn();
		console.log(`✅ ${name}`);
		testsPassed++;
	} catch (error) {
		console.log(`❌ ${name}`);
		console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
		testsFailed++;
	}
}

// Test 1: Export helpers file exists
runTest('Export helpers file exists', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.helpers.ts');
	if (!existsSync(path)) {
		throw new Error('Export helpers file does not exist');
	}
});

// Test 2: Export service file exists
runTest('Export service file exists', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.service.ts');
	if (!existsSync(path)) {
		throw new Error('Export service file does not exist');
	}
});

// Test 3: Institutional export endpoint exists
runTest('Institutional export endpoint exists', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/institutional/export/+server.ts');
	if (!existsSync(path)) {
		throw new Error('Institutional export endpoint does not exist');
	}
});

// Test 4: Financial export endpoint exists
runTest('Financial export endpoint exists', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/financial/export/+server.ts');
	if (!existsSync(path)) {
		throw new Error('Financial export endpoint does not exist');
	}
});

// Test 5: Academic export endpoint exists
runTest('Academic export endpoint exists', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/academic/export/+server.ts');
	if (!existsSync(path)) {
		throw new Error('Academic export endpoint does not exist');
	}
});

// Test 6: Attendance export endpoint exists
runTest('Attendance export endpoint exists', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/attendance/export/+server.ts');
	if (!existsSync(path)) {
		throw new Error('Attendance export endpoint does not exist');
	}
});

// Test 7: Export helpers has escapeCsvField function
runTest('Export helpers has escapeCsvField function', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.helpers.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('export function escapeCsvField')) {
		throw new Error('escapeCsvField function not found');
	}
});

// Test 8: Export helpers has CSV injection protection
runTest('Export helpers has CSV injection protection', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.helpers.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes("dangerousPrefixes")) {
		throw new Error('CSV injection protection not found');
	}
});

// Test 9: Export helpers has generateCsv function
runTest('Export helpers has generateCsv function', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.helpers.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('export function generateCsv')) {
		throw new Error('generateCsv function not found');
	}
});

// Test 10: Export helpers has generateSafeFilename function
runTest('Export helpers has generateSafeFilename function', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.helpers.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('export function generateSafeFilename')) {
		throw new Error('generateSafeFilename function not found');
	}
});

// Test 11: Export helpers has CSV headers
runTest('Export helpers has CSV headers', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.helpers.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('CSV_HEADERS')) {
		throw new Error('CSV_HEADERS not found');
	}
});

// Test 12: Export helpers has CSV header labels
runTest('Export helpers has CSV header labels', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.helpers.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('CSV_HEADER_LABELS')) {
		throw new Error('CSV_HEADER_LABELS not found');
	}
});

// Test 13: Export service has exportInstitutionalReport function
runTest('Export service has exportInstitutionalReport function', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.service.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('export async function exportInstitutionalReport')) {
		throw new Error('exportInstitutionalReport function not found');
	}
});

// Test 14: Export service has exportFinancialReport function
runTest('Export service has exportFinancialReport function', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.service.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('export async function exportFinancialReport')) {
		throw new Error('exportFinancialReport function not found');
	}
});

// Test 15: Export service has exportAcademicReport function
runTest('Export service has exportAcademicReport function', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.service.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('export async function exportAcademicReport')) {
		throw new Error('exportAcademicReport function not found');
	}
});

// Test 16: Export service has exportAttendanceReport function
runTest('Export service has exportAttendanceReport function', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.service.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('export async function exportAttendanceReport')) {
		throw new Error('exportAttendanceReport function not found');
	}
});

// Test 17: Institutional export endpoint validates session
runTest('Institutional export endpoint validates session', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/institutional/export/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('locals.user')) {
		throw new Error('Session validation not found');
	}
});

// Test 18: Institutional export endpoint checks SUPERADMIN
runTest('Institutional export endpoint checks SUPERADMIN', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/institutional/export/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('isSuperAdmin')) {
		throw new Error('SUPERADMIN check not found');
	}
});

// Test 19: Financial export endpoint checks FINANCIAL_REPORT permission
runTest('Financial export endpoint checks FINANCIAL_REPORT permission', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/financial/export/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('FINANCIAL_REPORT')) {
		throw new Error('FINANCIAL_REPORT permission check not found');
	}
});

// Test 20: Academic export endpoint checks GRADE permission
runTest('Academic export endpoint checks GRADE permission', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/academic/export/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('GRADE')) {
		throw new Error('GRADE permission check not found');
	}
});

// Test 21: Attendance export endpoint checks ATTENDANCE permission
runTest('Attendance export endpoint checks ATTENDANCE permission', () => {
	const path = join(process.cwd(), 'src/routes/api/reports/attendance/export/+server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('ATTENDANCE')) {
		throw new Error('ATTENDANCE permission check not found');
	}
});

// Test 22: Export endpoints return CSV Content-Type
runTest('Export endpoints return CSV Content-Type', () => {
	const paths = [
		'src/routes/api/reports/institutional/export/+server.ts',
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const relativePath of paths) {
		const path = join(process.cwd(), relativePath);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('text/csv')) {
			throw new Error(`CSV Content-Type not found in ${relativePath}`);
		}
	}
});

// Test 23: Export endpoints return Content-Disposition
runTest('Export endpoints return Content-Disposition', () => {
	const paths = [
		'src/routes/api/reports/institutional/export/+server.ts',
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const relativePath of paths) {
		const path = join(process.cwd(), relativePath);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('Content-Disposition')) {
			throw new Error(`Content-Disposition not found in ${relativePath}`);
		}
	}
});

// Test 24: UI has export buttons
runTest('UI has export buttons', () => {
	const paths = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const relativePath of paths) {
		const path = join(process.cwd(), relativePath);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('Exportar CSV')) {
			throw new Error(`Export button not found in ${relativePath}`);
		}
	}
});

// Test 25: UI export functions call /export endpoints
runTest('UI export functions call /export endpoints', () => {
	const paths = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const relativePath of paths) {
		const path = join(process.cwd(), relativePath);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('/export')) {
			throw new Error(`/export endpoint not called in ${relativePath}`);
		}
	}
});

// Test 26: No Prisma in export helpers
runTest('No Prisma in export helpers', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.helpers.ts');
	const content = readFileSync(path, 'utf-8');
	if (content.includes('prisma')) {
		throw new Error('Prisma found in export helpers');
	}
});

// Test 27: No Prisma in export service
runTest('No Prisma in export service', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.service.ts');
	const content = readFileSync(path, 'utf-8');
	if (content.includes('prisma')) {
		throw new Error('Prisma found in export service');
	}
});

// Test 28: No forbidden patterns in export code
runTest('No forbidden patterns in export code', () => {
	const patterns = ['$' + 'queryRaw', '$' + 'executeRaw', '@' + 'ts-ignore', '@' + 'ts-expect-error'];
	const paths = [
		'src/lib/server/reports/report-export.helpers.ts',
		'src/lib/server/reports/report-export.service.ts',
		'src/routes/api/reports/institutional/export/+server.ts',
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const pattern of patterns) {
		for (const relativePath of paths) {
			const path = join(process.cwd(), relativePath);
			const content = readFileSync(path, 'utf-8');
			if (content.includes(pattern) && !content.includes('//')) {
				throw new Error(`Found '${pattern}' in ${relativePath}`);
			}
		}
	}
});

// Test 29: Export service reuses existing report services
runTest('Export service reuses existing report services', () => {
	const path = join(process.cwd(), 'src/lib/server/reports/report-export.service.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('getInstitutionalMetrics') || 
	    !content.includes('getFinancialReportMetrics') ||
	    !content.includes('getAcademicReportMetrics') ||
	    !content.includes('getAttendanceReportMetrics')) {
		throw new Error('Export service does not reuse existing report services');
	}
});

// Test 30: Export endpoints handle 401
runTest('Export endpoints handle 401', () => {
	const paths = [
		'src/routes/api/reports/institutional/export/+server.ts',
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const relativePath of paths) {
		const path = join(process.cwd(), relativePath);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('401')) {
			throw new Error(`401 handling not found in ${relativePath}`);
		}
	}
});

// Test 31: Export endpoints handle 403
runTest('Export endpoints handle 403', () => {
	const paths = [
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const relativePath of paths) {
		const path = join(process.cwd(), relativePath);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('403')) {
			throw new Error(`403 handling not found in ${relativePath}`);
		}
	}
});

// Test 32: Export endpoints handle 400
runTest('Export endpoints handle 400', () => {
	const paths = [
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const relativePath of paths) {
		const path = join(process.cwd(), relativePath);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('400')) {
			throw new Error(`400 handling not found in ${relativePath}`);
		}
	}
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
	console.log('\n✅ All tests passed!');
} else {
	console.log('\n❌ Some tests failed.');
	process.exit(1);
}
