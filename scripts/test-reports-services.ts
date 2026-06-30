import { prisma } from '../src/lib/server/db/prisma';
import {
	getInstitutionalMetrics,
	getFinancialReportMetrics,
	getAcademicReportMetrics,
	getAttendanceReportMetrics
} from '../src/lib/server/reports/reports.service';

console.log('=== Reports Services Test ===\n');

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

// Test 1: Institutional Metrics
await runTest('Institutional Metrics - Get Metrics', async () => {
	const result = await getInstitutionalMetrics();
	console.log(`  - Total Students: ${result.data.totalStudents}`);
	console.log(`  - Active Students: ${result.data.activeStudents}`);
	console.log(`  - Total Teachers: ${result.data.totalTeachers}`);
	console.log(`  - Total Documents: ${result.data.totalDocuments}`);
	console.log(`  - Total Careers: ${result.data.totalCareers}`);
	console.log(`  - Total Subjects: ${result.data.totalSubjects}`);
	console.log(`  - Total Debt: ${result.data.totalDebt}`);
	console.log(`  - Total Collected: ${result.data.totalCollected}`);
	console.log(`  - Average Attendance: ${result.data.averageAttendance.toFixed(2)}%`);
});

// Test 2: Financial Reports - No Filters
await runTest('Financial Reports - Get Metrics (No Filters)', async () => {
	const result = await getFinancialReportMetrics();
	console.log(`  - Total Charges: ${result.data.totalCharges}`);
	console.log(`  - Total Paid: ${result.data.totalPaid}`);
	console.log(`  - Total Pending: ${result.data.totalPending}`);
	console.log(`  - Overdue Debt: ${result.data.overdueDebt}`);
	console.log(`  - Students with Debt: ${result.data.studentsWithDebt}`);
	console.log(`  - Payments Count: ${result.data.paymentsCount}`);
	console.log(`  - Receipts Issued: ${result.data.receiptsIssued}`);
	console.log(`  - Active Agreements: ${result.data.activeAgreements}`);
});

// Test 3: Financial Reports - With Date Filter
await runTest('Financial Reports - Get Metrics (Date Filter)', async () => {
	const startDate = new Date('2025-01-01');
	const endDate = new Date('2025-12-31');
	const result = await getFinancialReportMetrics({ startDate, endDate });
	console.log(`  - Total Charges (filtered): ${result.data.totalCharges}`);
	console.log(`  - Total Paid (filtered): ${result.data.totalPaid}`);
});

// Test 4: Academic Reports - No Filters
await runTest('Academic Reports - Get Metrics (No Filters)', async () => {
	const result = await getAcademicReportMetrics();
	console.log(`  - Total Students: ${result.data.totalStudents}`);
	console.log(`  - Active Students: ${result.data.activeStudents}`);
	console.log(`  - Students by Career: ${JSON.stringify(result.data.studentsByCareer)}`);
	console.log(`  - Students by Status: ${JSON.stringify(result.data.studentsByStatus)}`);
	console.log(`  - Total Subjects: ${result.data.totalSubjects}`);
	console.log(`  - Total Teachers: ${result.data.totalTeachers}`);
	console.log(`  - Total Commissions: ${result.data.totalCommissions}`);
	console.log(`  - Total Evaluations: ${result.data.totalEvaluations}`);
	console.log(`  - Total Grades: ${result.data.totalGrades}`);
	console.log(`  - Average Grade: ${result.data.averageGrade.toFixed(2)}`);
	console.log(`  - Regular Count: ${result.data.regularCount}`);
	console.log(`  - Libre Count: ${result.data.libreCount}`);
	console.log(`  - Risk Students: ${result.data.riskStudents}`);
});

// Test 5: Academic Reports - With Career Filter
await runTest('Academic Reports - Get Metrics (Career Filter)', async () => {
	const careers = await prisma.career.findMany({ take: 1, select: { id: true } });
	if (careers.length > 0) {
		const result = await getAcademicReportMetrics({ careerId: careers[0].id });
		console.log(`  - Total Students (filtered): ${result.data.totalStudents}`);
		console.log(`  - Active Students (filtered): ${result.data.activeStudents}`);
	} else {
		console.log('  - No careers found, skipping filter test');
	}
});

// Test 6: Attendance Reports - No Filters
await runTest('Attendance Reports - Get Metrics (No Filters)', async () => {
	const result = await getAttendanceReportMetrics();
	console.log(`  - Total Attendance Records: ${result.data.totalAttendanceRecords}`);
	console.log(`  - Total Attendance Entries: ${result.data.totalAttendanceEntries}`);
	console.log(`  - Present Count: ${result.data.presentCount}`);
	console.log(`  - Absent Count: ${result.data.absentCount}`);
	console.log(`  - Justified Count: ${result.data.justifiedCount}`);
	console.log(`  - Unjustified Count: ${result.data.unjustifiedCount}`);
	console.log(`  - Average Attendance: ${result.data.averageAttendance.toFixed(2)}%`);
	console.log(`  - Average by Subject: ${JSON.stringify(result.data.averageBySubject)}`);
	console.log(`  - Average by Commission: ${JSON.stringify(result.data.averageByCommission)}`);
});

// Test 7: Attendance Reports - With Date Filter
await runTest('Attendance Reports - Get Metrics (Date Filter)', async () => {
	const startDate = new Date('2025-01-01');
	const endDate = new Date('2025-12-31');
	const result = await getAttendanceReportMetrics({ startDate, endDate });
	console.log(`  - Total Attendance Records (filtered): ${result.data.totalAttendanceRecords}`);
	console.log(`  - Total Attendance Entries (filtered): ${result.data.totalAttendanceEntries}`);
});

// Test 8: Verify ReportResult Structure
await runTest('ReportResult - Verify Structure', async () => {
	const result = await getInstitutionalMetrics();
	if (!result.data) throw new Error('Missing data field');
	if (!result.generatedAt) throw new Error('Missing generatedAt field');
	if (typeof result.recordCount !== 'number') throw new Error('Missing recordCount field');
	if (!(result.generatedAt instanceof Date)) throw new Error('generatedAt is not a Date');
});

// Test 9: Verify Financial Agreements Integration
await runTest('Financial Reports - Payment Agreements Integration', async () => {
	const result = await getFinancialReportMetrics();
	if (typeof result.data.activeAgreements !== 'number') {
		throw new Error('activeAgreements should be a number');
	}
	if (typeof result.data.overdueAgreements !== 'number') {
		throw new Error('overdueAgreements should be a number');
	}
	if (typeof result.data.defaultedAgreements !== 'number') {
		throw new Error('defaultedAgreements should be a number');
	}
});

// Test 10: Verify Academic Regularity
await runTest('Academic Reports - Regularity Metrics', async () => {
	const result = await getAcademicReportMetrics();
	if (typeof result.data.regularCount !== 'number') {
		throw new Error('regularCount should be a number');
	}
	if (typeof result.data.libreCount !== 'number') {
		throw new Error('libreCount should be a number');
	}
	if (typeof result.data.riskStudents !== 'number') {
		throw new Error('riskStudents should be a number');
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
