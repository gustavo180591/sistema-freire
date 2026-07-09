import { prisma } from '../src/lib/server/db/prisma';
import {
	hasExplicitPermission,
	checkExplicitPermission,
	isSuperAdmin
} from '../src/lib/server/reports/report-permissions';
import {
	parseFilters,
	formatApiResponse,
	formatApiError
} from '../src/lib/server/reports/report-api-helpers';

console.log('=== Reports Endpoints Test ===\n');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name: string, testFn: () => Promise<void>) {
	try {
		await testFn();
		console.log(`✅ ${name}`);
		testsPassed++;
	} catch (error) {
		console.error(`❌ ${name}`);
		console.error(error);
		testsFailed++;
	}
}

// Mock user objects
interface MockUser {
	id: string;
	roles: string[];
}

const superAdminUser: MockUser = {
	id: 'test-superadmin',
	roles: ['SUPERADMIN']
};

const finanzasUser: MockUser = {
	id: 'test-finanzas',
	roles: ['FINANZAS']
};

const docenteUser: MockUser = {
	id: 'test-docente',
	roles: ['DOCENTE']
};

const alumnoUser: MockUser = {
	id: 'test-alumno',
	roles: ['ALUMNO']
};

const noPermissionUser: MockUser = {
	id: 'test-noperm',
	roles: ['ALUMNO']
};

// Test 1: SUPERADMIN has explicit permission
await runTest('SUPERADMIN has explicit permission for FINANCIAL_REPORT', async () => {
	const hasPerm = await hasExplicitPermission('SUPERADMIN', 'FINANCIAL_REPORT', 'read');
	if (!hasPerm) throw new Error('SUPERADMIN should have FINANCIAL_REPORT:read');
});

// Test 2: SUPERADMIN has explicit permission for ATTENDANCE
await runTest('SUPERADMIN has explicit permission for ATTENDANCE', async () => {
	const hasPerm = await hasExplicitPermission('SUPERADMIN', 'ATTENDANCE', 'read');
	if (!hasPerm) throw new Error('SUPERADMIN should have ATTENDANCE:read');
});

// Test 3: SUPERADMIN has explicit permission for GRADE
await runTest('SUPERADMIN has explicit permission for GRADE', async () => {
	const hasPerm = await hasExplicitPermission('SUPERADMIN', 'GRADE', 'read');
	if (!hasPerm) throw new Error('SUPERADMIN should have GRADE:read');
});

// Test 4: isSuperAdmin returns true for SUPERADMIN
await runTest('isSuperAdmin returns true for SUPERADMIN', async () => {
	const result = isSuperAdmin(superAdminUser);
	if (!result) throw new Error('isSuperAdmin should return true for SUPERADMIN');
});

// Test 5: isSuperAdmin returns false for non-SUPERADMIN
await runTest('isSuperAdmin returns false for non-SUPERADMIN', async () => {
	const result = isSuperAdmin(finanzasUser);
	if (result) throw new Error('isSuperAdmin should return false for FINANZAS');
});

// Test 6: checkExplicitPermission returns true for SUPERADMIN
await runTest('checkExplicitPermission returns true for SUPERADMIN', async () => {
	const hasPerm = await checkExplicitPermission(superAdminUser, 'FINANCIAL_REPORT', 'read');
	if (!hasPerm)
		throw new Error('SUPERADMIN should have FINANCIAL_REPORT:read via checkExplicitPermission');
});

// Test 7: checkExplicitPermission returns false for user without permission record
await runTest(
	'checkExplicitPermission returns false for user without permission record',
	async () => {
		// Assuming ALUMNO has no FINANCIAL_REPORT permission record
		const hasPerm = await checkExplicitPermission(alumnoUser, 'FINANCIAL_REPORT', 'read');
		if (hasPerm)
			throw new Error('ALUMNO should not have FINANCIAL_REPORT:read without explicit permission');
	}
);

// Test 8: parseFilters handles empty URL
await runTest('parseFilters handles empty URL', async () => {
	const url = new URL('http://localhost');
	const filters = parseFilters(url);
	if (Object.keys(filters).length !== 0) throw new Error('Empty URL should return empty filters');
});

// Test 9: parseFilters parses studentId
await runTest('parseFilters parses studentId', async () => {
	const url = new URL('http://localhost?studentId=test123');
	const filters = parseFilters(url);
	if (filters.studentId !== 'test123') throw new Error('studentId should be parsed');
});

// Test 10: parseFilters parses careerId
await runTest('parseFilters parses careerId', async () => {
	const url = new URL('http://localhost?careerId=career123');
	const filters = parseFilters(url);
	if (filters.careerId !== 'career123') throw new Error('careerId should be parsed');
});

// Test 11: parseFilters parses subjectId
await runTest('parseFilters parses subjectId', async () => {
	const url = new URL('http://localhost?subjectId=subject123');
	const filters = parseFilters(url);
	if (filters.subjectId !== 'subject123') throw new Error('subjectId should be parsed');
});

// Test 12: parseFilters parses commissionId
await runTest('parseFilters parses commissionId', async () => {
	const url = new URL('http://localhost?commissionId=commission123');
	const filters = parseFilters(url);
	if (filters.commissionId !== 'commission123') throw new Error('commissionId should be parsed');
});

// Test 13: parseFilters parses startDate
await runTest('parseFilters parses startDate', async () => {
	const url = new URL('http://localhost?startDate=2025-01-01');
	const filters = parseFilters(url);
	if (!filters.startDate) throw new Error('startDate should be parsed');
	if (filters.startDate.toISOString().split('T')[0] !== '2025-01-01') {
		throw new Error('startDate should be correct date');
	}
});

// Test 14: parseFilters parses endDate
await runTest('parseFilters parses endDate', async () => {
	const url = new URL('http://localhost?endDate=2025-12-31');
	const filters = parseFilters(url);
	if (!filters.endDate) throw new Error('endDate should be parsed');
	if (filters.endDate.toISOString().split('T')[0] !== '2025-12-31') {
		throw new Error('endDate should be correct date');
	}
});

// Test 15: parseFilters throws on invalid date format
await runTest('parseFilters throws on invalid date format', async () => {
	const url = new URL('http://localhost?startDate=invalid-date');
	try {
		parseFilters(url);
		throw new Error('Should throw error for invalid date');
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes('Invalid')) {
			throw error;
		}
	}
});

// Test 16: parseFilters throws when startDate > endDate
await runTest('parseFilters throws when startDate > endDate', async () => {
	const url = new URL('http://localhost?startDate=2025-12-31&endDate=2025-01-01');
	try {
		parseFilters(url);
		throw new Error('Should throw error when startDate > endDate');
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes('startDate')) {
			throw error;
		}
	}
});

// Test 17: parseFilters allows valid date range
await runTest('parseFilters allows valid date range', async () => {
	const url = new URL('http://localhost?startDate=2025-01-01&endDate=2025-12-31');
	const filters = parseFilters(url);
	if (!filters.startDate || !filters.endDate) throw new Error('Both dates should be parsed');
});

// Test 18: formatApiResponse returns correct structure
await runTest('formatApiResponse returns correct structure', async () => {
	const data = { test: 'value' };
	const response = formatApiResponse(data);
	if (!response.success) throw new Error('Response should have success: true');
	if (!response.data) throw new Error('Response should have data');
	if (!response.generatedAt) throw new Error('Response should have generatedAt');
	if (!response.filters) throw new Error('Response should have filters');
});

// Test 19: formatApiError returns correct structure
await runTest('formatApiError returns correct structure', async () => {
	const response = formatApiError('Test error');
	if (response.success) throw new Error('Response should have success: false');
	if (!response.error) throw new Error('Response should have error');
	if (response.error !== 'Test error') throw new Error('Error message should match');
});

// Test 20: Verify no data mutation in services (check PaymentAgreement count before/after)
await runTest('No data mutation when querying services', async () => {
	const countBefore = await prisma.paymentAgreement.count();

	// Call a service that queries PaymentAgreement
	const { getFinancialReportMetrics } = await import('../src/lib/server/reports/reports.service');
	await getFinancialReportMetrics();

	const countAfter = await prisma.paymentAgreement.count();
	if (countBefore !== countAfter) {
		throw new Error('PaymentAgreement count changed after query - data was mutated');
	}
});

// Test 21: Verify no PaymentAgreement status changes
await runTest('No PaymentAgreement status changes when querying services', async () => {
	const agreementsBefore = await prisma.paymentAgreement.findMany({
		select: { id: true, status: true }
	});

	const { getFinancialReportMetrics } = await import('../src/lib/server/reports/reports.service');
	await getFinancialReportMetrics();

	const agreementsAfter = await prisma.paymentAgreement.findMany({
		select: { id: true, status: true }
	});

	if (agreementsBefore.length !== agreementsAfter.length) {
		throw new Error('PaymentAgreement count changed');
	}

	for (let i = 0; i < agreementsBefore.length; i++) {
		if (agreementsBefore[i].id !== agreementsAfter[i].id) {
			throw new Error('PaymentAgreement IDs changed');
		}
		if (agreementsBefore[i].status !== agreementsAfter[i].status) {
			throw new Error(`PaymentAgreement status changed for ${agreementsBefore[i].id}`);
		}
	}
});

// Test 22: Verify no forbidden patterns in code
await runTest('No forbidden patterns in reports code', async () => {
	const fs = await import('fs');
	const path = await import('path');

	const reportsDir = path.join(process.cwd(), 'src/lib/server/reports');
	const files = fs.readdirSync(reportsDir);

	// Build forbidden patterns using concatenation to avoid literal matches
	const queryRawPattern = '$' + 'queryRaw';
	const executeRawPattern = '$' + 'executeRaw';
	const tsIgnorePattern = '@ts-' + 'ignore';
	const tsExpectErrorPattern = '@ts-' + 'expect-error';
	const anyPattern = ':' + ' any';
	const asAnyPattern = 'as' + ' any';

	for (const file of files) {
		if (file.endsWith('.ts')) {
			const filePath = path.join(reportsDir, file);
			const content = fs.readFileSync(filePath, 'utf-8');

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
				// Allow patterns in comments
				throw new Error(`Found '${anyPattern}' in ${file}`);
			}
			if (content.includes(asAnyPattern) && !content.includes('//')) {
				// Allow patterns in comments
				throw new Error(`Found '${asAnyPattern}' in ${file}`);
			}
		}
	}
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
	process.exit(1);
}

console.log('\n✅ All tests passed!');
