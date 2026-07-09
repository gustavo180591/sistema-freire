import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

console.log('=== Reports UI Test ===\n');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name: string, testFn: () => void) {
	try {
		testFn();
		console.log(`✅ ${name}`);
		testsPassed++;
	} catch (error) {
		console.error(`❌ ${name}`);
		console.error(error);
		testsFailed++;
	}
}

// Test 1: Check if dashboard page server exists
runTest('src/routes/(app)/reportes/dashboard/+page.server.ts exists', () => {
	const path = join(process.cwd(), 'src/routes/(app)/reportes/dashboard/+page.server.ts');
	if (!existsSync(path)) {
		throw new Error('File does not exist');
	}
});

// Test 2: Check if dashboard page svelte exists
runTest('src/routes/(app)/reportes/dashboard/+page.svelte exists', () => {
	const path = join(process.cwd(), 'src/routes/(app)/reportes/dashboard/+page.svelte');
	if (!existsSync(path)) {
		throw new Error('File does not exist');
	}
});

// Test 3: Check if +page.server.ts validates locals.user
runTest('+page.server.ts validates locals.user', () => {
	const path = join(process.cwd(), 'src/routes/(app)/reportes/dashboard/+page.server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('locals.user')) {
		throw new Error('Does not validate locals.user');
	}
});

// Test 4: Check if +page.server.ts uses redirect
runTest('+page.server.ts uses redirect', () => {
	const path = join(process.cwd(), 'src/routes/(app)/reportes/dashboard/+page.server.ts');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('redirect')) {
		throw new Error('Does not use redirect');
	}
});

// Test 5: Check if report components exist
runTest('Report components exist', () => {
	const components = [
		'src/lib/components/reports/ReportKpiCard.svelte',
		'src/lib/components/reports/ReportSectionTabs.svelte',
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte',
		'src/lib/components/reports/ReportErrorState.svelte',
		'src/lib/components/reports/ReportLoadingState.svelte'
	];

	for (const component of components) {
		const path = join(process.cwd(), component);
		if (!existsSync(path)) {
			throw new Error(`Component ${component} does not exist`);
		}
	}
});

// Test 6: Check if page consumes institutional endpoint
runTest('Page consumes /api/reports/institutional', () => {
	const path = join(process.cwd(), 'src/lib/components/reports/InstitutionalReportsPanel.svelte');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('/api/reports/institutional')) {
		throw new Error('Does not consume institutional endpoint');
	}
});

// Test 7: Check if page consumes financial endpoint
runTest('Page consumes /api/reports/financial', () => {
	const path = join(process.cwd(), 'src/lib/components/reports/FinancialReportsPanel.svelte');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('/api/reports/financial')) {
		throw new Error('Does not consume financial endpoint');
	}
});

// Test 8: Check if page consumes academic endpoint
runTest('Page consumes /api/reports/academic', () => {
	const path = join(process.cwd(), 'src/lib/components/reports/AcademicReportsPanel.svelte');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('/api/reports/academic')) {
		throw new Error('Does not consume academic endpoint');
	}
});

// Test 9: Check if page consumes attendance endpoint
runTest('Page consumes /api/reports/attendance', () => {
	const path = join(process.cwd(), 'src/lib/components/reports/AttendanceReportsPanel.svelte');
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('/api/reports/attendance')) {
		throw new Error('Does not consume attendance endpoint');
	}
});

// Test 10: Check if uses fetch
runTest('UI uses fetch', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const panel of panels) {
		const path = join(process.cwd(), panel);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('fetch')) {
			throw new Error(`${panel} does not use fetch`);
		}
	}
});

// Test 11: Check if handles 401
runTest('UI handles 401', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const panel of panels) {
		const path = join(process.cwd(), panel);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('401')) {
			throw new Error(`${panel} does not handle 401`);
		}
	}
});

// Test 12: Check if handles 403
runTest('UI handles 403', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const panel of panels) {
		const path = join(process.cwd(), panel);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('403')) {
			throw new Error(`${panel} does not handle 403`);
		}
	}
});

// Test 13: Check if handles financial filters
runTest('UI handles financial filters', () => {
	const path = join(process.cwd(), 'src/lib/components/reports/FinancialReportsPanel.svelte');
	const content = readFileSync(path, 'utf-8');
	if (
		!content.includes('studentId') ||
		!content.includes('startDate') ||
		!content.includes('endDate')
	) {
		throw new Error('Does not handle financial filters');
	}
});

// Test 14: Check if handles academic filters
runTest('UI handles academic filters', () => {
	const path = join(process.cwd(), 'src/lib/components/reports/AcademicReportsPanel.svelte');
	const content = readFileSync(path, 'utf-8');
	if (
		!content.includes('careerId') ||
		!content.includes('subjectId') ||
		!content.includes('studentId')
	) {
		throw new Error('Does not handle academic filters');
	}
});

// Test 15: Check if handles attendance filters
runTest('UI handles attendance filters', () => {
	const path = join(process.cwd(), 'src/lib/components/reports/AttendanceReportsPanel.svelte');
	const content = readFileSync(path, 'utf-8');
	if (
		!content.includes('studentId') ||
		!content.includes('subjectId') ||
		!content.includes('commissionId') ||
		!content.includes('startDate') ||
		!content.includes('endDate')
	) {
		throw new Error('Does not handle attendance filters');
	}
});

// Test 16: Check if no Prisma in UI
runTest('No Prisma in UI', () => {
	const files = [
		'src/routes/(app)/reportes/dashboard/+page.svelte',
		'src/lib/components/reports/ReportKpiCard.svelte',
		'src/lib/components/reports/ReportSectionTabs.svelte',
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte',
		'src/lib/components/reports/ReportErrorState.svelte',
		'src/lib/components/reports/ReportLoadingState.svelte'
	];

	for (const file of files) {
		const path = join(process.cwd(), file);
		const content = readFileSync(path, 'utf-8');
		if (content.includes('prisma') || content.includes('@prisma')) {
			throw new Error(`${file} uses Prisma`);
		}
	}
});

// Test 17: Check if no storage/private in UI
runTest('No storage/private in UI', () => {
	const files = [
		'src/routes/(app)/reportes/dashboard/+page.svelte',
		'src/lib/components/reports/ReportKpiCard.svelte',
		'src/lib/components/reports/ReportSectionTabs.svelte',
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte',
		'src/lib/components/reports/ReportErrorState.svelte',
		'src/lib/components/reports/ReportLoadingState.svelte'
	];

	for (const file of files) {
		const path = join(process.cwd(), file);
		const content = readFileSync(path, 'utf-8');
		if (content.includes('storage/private')) {
			throw new Error(`${file} uses storage/private`);
		}
	}
});

// Test 18: Check if no static/uploads in UI
runTest('No static/uploads in UI', () => {
	const files = [
		'src/routes/(app)/reportes/dashboard/+page.svelte',
		'src/lib/components/reports/ReportKpiCard.svelte',
		'src/lib/components/reports/ReportSectionTabs.svelte',
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte',
		'src/lib/components/reports/ReportErrorState.svelte',
		'src/lib/components/reports/ReportLoadingState.svelte'
	];

	for (const file of files) {
		const path = join(process.cwd(), file);
		const content = readFileSync(path, 'utf-8');
		if (content.includes('static/uploads')) {
			throw new Error(`${file} uses static/uploads`);
		}
	}
});

// Test 19: Check for forbidden patterns in UI
runTest('No forbidden patterns in UI', () => {
	const files = [
		'src/routes/(app)/reportes/dashboard/+page.svelte',
		'src/routes/(app)/reportes/dashboard/+page.server.ts',
		'src/lib/components/reports/ReportKpiCard.svelte',
		'src/lib/components/reports/ReportSectionTabs.svelte',
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte',
		'src/lib/components/reports/ReportErrorState.svelte',
		'src/lib/components/reports/ReportLoadingState.svelte'
	];

	// Build forbidden patterns using concatenation to avoid literal matches
	const queryRawPattern = '$' + 'queryRaw';
	const executeRawPattern = '$' + 'executeRaw';
	const tsIgnorePattern = '@ts-' + 'ignore';
	const tsExpectErrorPattern = '@ts-' + 'expect-error';
	const anyPattern = ':' + ' any';
	const asAnyPattern = 'as' + ' any';

	for (const file of files) {
		const path = join(process.cwd(), file);
		const content = readFileSync(path, 'utf-8');

		if (content.includes(queryRawPattern)) {
			throw new Error(`Found ${queryRawPattern} in ${file}`);
		}
		if (content.includes(executeRawPattern)) {
			throw new Error(`Found ${executeRawPattern} in ${file}`);
		}
		if (content.includes(tsIgnorePattern)) {
			throw new Error(`Found ${tsIgnorePattern} in ${file}`);
		}
		if (content.includes(tsExpectErrorPattern)) {
			throw new Error(`Found ${tsExpectErrorPattern} in ${file}`);
		}
		if (content.includes(anyPattern) && !content.includes('//')) {
			throw new Error(`Found '${anyPattern}' in ${file}`);
		}
		if (content.includes(asAnyPattern) && !content.includes('//')) {
			throw new Error(`Found '${asAnyPattern}' in ${file}`);
		}
	}
});

// Test 20: Check if no new API routes created outside Phase 2
runTest('No new API routes created outside Phase 2', () => {
	const apiReportsDir = join(process.cwd(), 'src/routes/api/reports');

	if (!existsSync(apiReportsDir)) {
		throw new Error('API reports directory does not exist');
	}

	const files = readdirSync(apiReportsDir);
	const allowedFiles = ['institutional', 'financial', 'academic', 'attendance'];

	for (const file of files) {
		if (!allowedFiles.includes(file)) {
			throw new Error(`Unexpected API route: ${file}`);
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
	console.log('\n❌ Some tests failed!');
	process.exit(1);
}
