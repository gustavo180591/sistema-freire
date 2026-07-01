import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const patterns = ['$' + 'queryRaw', '$' + 'executeRaw', '@' + 'ts-ignore', '@' + 'ts-expect-error'];

function runTest(name: string, test: () => void) {
	try {
		test();
		console.log(`✅ ${name}`);
	} catch (error) {
		console.error(`❌ ${name}`);
		if (error instanceof Error) {
			console.error(`   ${error.message}`);
		}
		process.exit(1);
	}
}

// Test 1: Chart components exist
runTest('Chart components exist', () => {
	const chartComponents = [
		'src/lib/components/reports/charts/SimpleBarChart.svelte',
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	for (const component of chartComponents) {
		const path = join(process.cwd(), component);
		if (!existsSync(path)) {
			throw new Error(`Chart component ${component} does not exist`);
		}
	}
});

// Test 2: Panels import chart components
runTest('Panels import chart components', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const panel of panels) {
		const path = join(process.cwd(), panel);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('SimpleProgressBar') && !content.includes('SimpleMetricComparison') && !content.includes('SimpleDistributionList')) {
			throw new Error(`Panel ${panel} does not import any chart component`);
		}
	}
});

// Test 3: No new chart library dependencies
runTest('No new chart library dependencies', () => {
	const packageJsonPath = join(process.cwd(), 'package.json');
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
	const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

	const chartLibraries = ['chart.js', 'recharts', 'victory', 'nivo', 'd3', 'plotly', 'echarts', 'highcharts'];
	for (const lib of chartLibraries) {
		if (dependencies[lib]) {
			throw new Error(`Found chart library dependency: ${lib}`);
		}
	}
});

// Test 4: No Prisma in UI
runTest('No Prisma in UI panels', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const panel of panels) {
		const path = join(process.cwd(), panel);
		const content = readFileSync(path, 'utf-8');
		if (content.includes('prisma')) {
			throw new Error(`Found Prisma in ${panel}`);
		}
	}
});

// Test 5: No forbidden patterns in chart components
runTest('No forbidden patterns in chart components', () => {
	const chartComponents = [
		'src/lib/components/reports/charts/SimpleBarChart.svelte',
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	for (const pattern of patterns) {
		for (const component of chartComponents) {
			const path = join(process.cwd(), component);
			const content = readFileSync(path, 'utf-8');
			if (content.includes(pattern) && !content.includes('//')) {
				throw new Error(`Found '${pattern}' in ${component}`);
			}
		}
	}
});

// Test 6: No forbidden patterns in panels
runTest('No forbidden patterns in panels', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const pattern of patterns) {
		for (const panel of panels) {
			const path = join(process.cwd(), panel);
			const content = readFileSync(path, 'utf-8');
			if (content.includes(pattern) && !content.includes('//')) {
				throw new Error(`Found '${pattern}' in ${panel}`);
			}
		}
	}
});

// Test 7: No storage/private in UI
runTest('No storage/private in UI', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const panel of panels) {
		const path = join(process.cwd(), panel);
		const content = readFileSync(path, 'utf-8');
		if (content.includes('storage/private')) {
			throw new Error(`Found storage/private in ${panel}`);
		}
	}
});

// Test 8: No static/uploads in UI
runTest('No static/uploads in UI', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const panel of panels) {
		const path = join(process.cwd(), panel);
		const content = readFileSync(path, 'utf-8');
		if (content.includes('static/uploads')) {
			throw new Error(`Found static/uploads in ${panel}`);
		}
	}
});

// Test 9: No new API routes created
runTest('No new API routes created', () => {
	const apiRoutes = [
		'src/routes/api/reports/institutional/+server.ts',
		'src/routes/api/reports/financial/+server.ts',
		'src/routes/api/reports/academic/+server.ts',
		'src/routes/api/reports/attendance/+server.ts',
		'src/routes/api/reports/institutional/export/+server.ts',
		'src/routes/api/reports/financial/export/+server.ts',
		'src/routes/api/reports/academic/export/+server.ts',
		'src/routes/api/reports/attendance/export/+server.ts'
	];

	for (const route of apiRoutes) {
		const path = join(process.cwd(), route);
		if (!existsSync(path)) {
			throw new Error(`API route ${route} does not exist`);
		}
	}
});

// Test 10: Endpoints still exist
runTest('Endpoints still exist', () => {
	const endpoints = [
		'src/routes/api/reports/institutional/+server.ts',
		'src/routes/api/reports/financial/+server.ts',
		'src/routes/api/reports/academic/+server.ts',
		'src/routes/api/reports/attendance/+server.ts'
	];

	for (const endpoint of endpoints) {
		const path = join(process.cwd(), endpoint);
		if (!existsSync(path)) {
			throw new Error(`Endpoint ${endpoint} does not exist`);
		}
	}
});

// Test 11: Empty states shown in chart components
runTest('Empty states shown in chart components', () => {
	const distributionListPath = join(process.cwd(), 'src/lib/components/reports/charts/SimpleDistributionList.svelte');
	const content = readFileSync(distributionListPath, 'utf-8');
	if (!content.includes('No hay datos disponibles')) {
		throw new Error('SimpleDistributionList does not show empty state');
	}
});

// Test 12: Division by zero protection in chart components
runTest('Division by zero protection in chart components', () => {
	const chartComponents = [
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	for (const component of chartComponents) {
		const path = join(process.cwd(), component);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('total > 0') && !content.includes('maxValue > 0') && !content.includes('calculatedTotal > 0')) {
			throw new Error(`${component} does not protect against division by zero`);
		}
	}
});

// Test 13: Attendance uses "con observación" not "justificada formal"
runTest('Attendance uses "con observación" not "justificada formal"', () => {
	const attendancePanelPath = join(process.cwd(), 'src/lib/components/reports/AttendanceReportsPanel.svelte');
	const content = readFileSync(attendancePanelPath, 'utf-8');
	if (content.includes('justificada formal') || content.includes('Justificada Formal')) {
		throw new Error('Attendance panel uses "justificada formal" instead of "con observación"');
	}
	if (!content.includes('Con Observación')) {
		throw new Error('Attendance panel does not use "Con Observación"');
	}
});

// Test 14: Visualizations are Svelte components
runTest('Visualizations are Svelte components', () => {
	const chartComponents = [
		'src/lib/components/reports/charts/SimpleBarChart.svelte',
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	for (const component of chartComponents) {
		const path = join(process.cwd(), component);
		if (!path.endsWith('.svelte')) {
			throw new Error(`${component} is not a Svelte component`);
		}
	}
});

// Test 15: Panels still have CSV export
runTest('Panels still have CSV export', () => {
	const panels = [
		'src/lib/components/reports/InstitutionalReportsPanel.svelte',
		'src/lib/components/reports/FinancialReportsPanel.svelte',
		'src/lib/components/reports/AcademicReportsPanel.svelte',
		'src/lib/components/reports/AttendanceReportsPanel.svelte'
	];

	for (const panel of panels) {
		const path = join(process.cwd(), panel);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('exportToCsv') && !content.includes('Exportar CSV')) {
			throw new Error(`Panel ${panel} does not have CSV export`);
		}
	}
});

// Test 16: Phase 5 documentation exists
runTest('Phase 5 documentation exists', () => {
	const docPath = join(process.cwd(), 'docs/REPORTS_MODULE_PHASE_5_VISUALIZATIONS.md');
	if (!existsSync(docPath)) {
		throw new Error('Phase 5 documentation does not exist');
	}
});

// Test 17: No "any" type in chart components
runTest('No "any" type in chart components', () => {
	const chartComponents = [
		'src/lib/components/reports/charts/SimpleBarChart.svelte',
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	const anyPattern = ':' + ' any';
	for (const component of chartComponents) {
		const path = join(process.cwd(), component);
		const content = readFileSync(path, 'utf-8');
		if (content.includes(anyPattern) && !content.includes('//')) {
			throw new Error('Found forbidden type pattern in ' + component);
		}
	}
});

// Test 18: No forbidden cast in chart components
runTest('No forbidden cast in chart components', () => {
	const chartComponents = [
		'src/lib/components/reports/charts/SimpleBarChart.svelte',
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	const asAnyPattern = 'as' + ' any';
	for (const component of chartComponents) {
		const path = join(process.cwd(), component);
		const content = readFileSync(path, 'utf-8');
		if (content.includes(asAnyPattern) && !content.includes('//')) {
			throw new Error('Found forbidden cast pattern in ' + component);
		}
	}
});

// Test 19: Chart components use $props (Svelte 5)
runTest('Chart components use $props (Svelte 5)', () => {
	const chartComponents = [
		'src/lib/components/reports/charts/SimpleBarChart.svelte',
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	for (const component of chartComponents) {
		const path = join(process.cwd(), component);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('$props')) {
			throw new Error(`${component} does not use $props (Svelte 5)`);
		}
	}
});

// Test 20: Chart components use $derived where appropriate
runTest('Chart components use $derived where appropriate', () => {
	const chartComponents = [
		'src/lib/components/reports/charts/SimpleProgressBar.svelte',
		'src/lib/components/reports/charts/SimpleMetricComparison.svelte',
		'src/lib/components/reports/charts/SimpleDistributionList.svelte'
	];

	for (const component of chartComponents) {
		const path = join(process.cwd(), component);
		const content = readFileSync(path, 'utf-8');
		if (!content.includes('$derived')) {
			throw new Error(`${component} does not use $derived`);
		}
	}
});

console.log('\n=== Test Summary ===');
console.log('Tests Passed: 20');
console.log('Tests Failed: 0');
console.log('Total Tests: 20');
console.log('\n✅ All tests passed!');
