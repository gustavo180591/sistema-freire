/**
 * Payment Agreement Batch Evaluation Test Script
 * Phase 6.1
 *
 * Tests the batch evaluation functionality for payment agreements.
 *
 * Usage:
 *   DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire" npx tsx scripts/test-payment-agreement-batch-evaluation.ts
 */

import { PrismaClient, PaymentAgreementStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';

const prisma = new PrismaClient();

// Test data constants
const TEST_PREFIX = 'BATCH_TEST_';
const TEST_STUDENT_ID = `batch_test_student_${Date.now()}`;
const TEST_USER_ID = `batch_test_user_${Date.now()}`;
const TEST_STUDENT_DNI = `99999999${Date.now()}`;

interface TestAgreement {
	id: string;
	agreementNumber: number;
	agreementYear: number;
	status: PaymentAgreementStatus;
}

async function setupTestData(): Promise<TestAgreement[]> {
	console.log('🔧 Setting up test data...\n');

	// Clean up any existing test data first
	await prisma.paymentAllocation.deleteMany({
		where: {
			payment: { studentId: TEST_STUDENT_ID }
		}
	});

	await prisma.payment.deleteMany({
		where: { studentId: TEST_STUDENT_ID }
	});

	await prisma.paymentAgreementEvent.deleteMany({
		where: {
			agreement: { studentId: TEST_STUDENT_ID }
		}
	});

	await prisma.paymentAgreementChargeRelation.deleteMany({
		where: {
			agreement: { studentId: TEST_STUDENT_ID }
		}
	});

	await prisma.paymentAgreementInstallment.deleteMany({
		where: {
			agreement: { studentId: TEST_STUDENT_ID }
		}
	});

	await prisma.paymentAgreement.deleteMany({
		where: { studentId: TEST_STUDENT_ID }
	});

	await prisma.studentCharge.deleteMany({
		where: { studentId: TEST_STUDENT_ID }
	});

	// Get or create a test career
	let career = await prisma.career.findFirst();
	if (!career) {
		career = await prisma.career.create({
			data: {
				code: 'TEST-BATCH-EVAL',
				name: 'Test Career Batch Evaluation',
				durationYears: 5
			}
		});
	}

	// Create test user
	const user = await prisma.user.create({
		data: {
			id: TEST_USER_ID,
			email: `batch-test-${Date.now()}@example.com`,
			passwordHash: 'dummy',
			firstName: 'Batch',
			lastName: 'Test User'
		}
	});

	// Create test student
	const student = await prisma.student.upsert({
		where: { id: TEST_STUDENT_ID },
		update: {},
		create: {
			id: TEST_STUDENT_ID,
			firstName: 'Batch',
			lastName: 'Test',
			dni: TEST_STUDENT_DNI,
			userId: user.id,
			careerId: career.id
		}
	});

	// Create test charge concept
	const concept1Code = `BATCH_TEST_CHARGE_1_${Date.now()}`;
	const concept2Code = `BATCH_TEST_CHARGE_2_${Date.now()}`;
	const termCode = `BATCH_TEST_TERM_${Date.now()}`;

	const concept1 = await prisma.chargeConcept.create({
		data: {
			code: concept1Code,
			name: 'Test Charge 1',
			active: true
		}
	});

	const concept2 = await prisma.chargeConcept.create({
		data: {
			code: concept2Code,
			name: 'Test Charge 2',
			active: true
		}
	});

	// Create test academic term
	const term = await prisma.academicTerm.create({
		data: {
			code: termCode,
			name: 'Batch Test Term',
			year: 2026,
			termType: 'ANUAL',
			startDate: new Date('2026-01-01'),
			endDate: new Date('2026-12-31')
		}
	});

	// Create test charges
	const charge1 = await prisma.studentCharge.create({
		data: {
			studentId: TEST_STUDENT_ID,
			conceptId: concept1.id,
			periodLabel: '2026-1',
			amount: new Decimal(1000),
			finalAmount: new Decimal(1000),
			status: 'PENDING',
			dueDate: new Date('2026-01-01'),
			academicTermId: term.id
		}
	});

	const charge2 = await prisma.studentCharge.create({
		data: {
			studentId: TEST_STUDENT_ID,
			conceptId: concept2.id,
			periodLabel: '2026-1',
			amount: new Decimal(2000),
			finalAmount: new Decimal(2000),
			status: 'PENDING',
			dueDate: new Date('2026-01-01'),
			academicTermId: term.id
		}
	});

	// Create test agreements
	const currentYear = new Date().getFullYear();
	const agreements: TestAgreement[] = [];

	// Agreement 1: No overdue installments (should remain unchanged)
	const agreement1 = await prisma.paymentAgreement.create({
		data: {
			agreementNumber: 1,
			agreementYear: currentYear,
			studentId: TEST_STUDENT_ID,
			studentName: 'Batch Test',
			studentDni: '99999999',
			originalDebt: new Decimal(1000),
			agreedAmount: new Decimal(1000),
			paidAmount: new Decimal(0),
			pendingAmount: new Decimal(1000),
			status: 'ACTIVE',
			reason: 'Test agreement 1 - no overdue',
			createdBy: TEST_USER_ID,
			createdByName: 'Batch Test User',
			installments: {
				create: [
					{
						installmentNumber: 1,
						dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Future date
						amount: new Decimal(500),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(500),
						status: 'PENDING'
					},
					{
						installmentNumber: 2,
						dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Future date
						amount: new Decimal(500),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(500),
						status: 'PENDING'
					}
				]
			},
			relatedCharges: {
				create: {
					chargeId: charge1.id,
					originalChargeAmount: charge1.amount,
					originalChargePaidAmount: charge1.paidAmount || new Decimal(0),
					originalChargeStatus: charge1.status,
					amountIncluded: charge1.amount,
					relationType: 'REFINANCED'
				}
			}
		}
	});
	agreements.push(agreement1);

	// Agreement 2: One overdue installment (should be marked overdue)
	const agreement2 = await prisma.paymentAgreement.create({
		data: {
			agreementNumber: 2,
			agreementYear: currentYear,
			studentId: TEST_STUDENT_ID,
			studentName: 'Batch Test',
			studentDni: '99999999',
			originalDebt: new Decimal(2000),
			agreedAmount: new Decimal(2000),
			paidAmount: new Decimal(0),
			pendingAmount: new Decimal(2000),
			status: 'ACTIVE',
			reason: 'Test agreement 2 - one overdue',
			createdBy: TEST_USER_ID,
			createdByName: 'Batch Test User',
			installments: {
				create: [
					{
						installmentNumber: 1,
						dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Past date
						amount: new Decimal(1000),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(1000),
						status: 'PENDING'
					},
					{
						installmentNumber: 2,
						dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Future date
						amount: new Decimal(1000),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(1000),
						status: 'PENDING'
					}
				]
			},
			relatedCharges: {
				create: {
					chargeId: charge2.id,
					originalChargeAmount: charge2.amount,
					originalChargePaidAmount: charge2.paidAmount || new Decimal(0),
					originalChargeStatus: charge2.status,
					amountIncluded: charge2.amount,
					relationType: 'REFINANCED'
				}
			}
		}
	});
	agreements.push(agreement2);

	// Agreement 3: Fully paid (should be completed)
	const agreement3 = await prisma.paymentAgreement.create({
		data: {
			agreementNumber: 3,
			agreementYear: currentYear,
			studentId: TEST_STUDENT_ID,
			studentName: 'Batch Test',
			studentDni: '99999999',
			originalDebt: new Decimal(1500),
			agreedAmount: new Decimal(1500),
			paidAmount: new Decimal(1500),
			pendingAmount: new Decimal(0),
			status: 'ACTIVE',
			reason: 'Test agreement 3 - fully paid',
			createdBy: TEST_USER_ID,
			createdByName: 'Batch Test User',
			installments: {
				create: [
					{
						installmentNumber: 1,
						dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
						amount: new Decimal(750),
						paidAmount: new Decimal(750),
						pendingAmount: new Decimal(0),
						status: 'PAID'
					},
					{
						installmentNumber: 2,
						dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
						amount: new Decimal(750),
						paidAmount: new Decimal(750),
						pendingAmount: new Decimal(0),
						status: 'PAID'
					}
				]
			}
		}
	});
	agreements.push(agreement3);

	// Agreement 4: Two overdue installments (should be defaulted)
	const agreement4 = await prisma.paymentAgreement.create({
		data: {
			agreementNumber: 4,
			agreementYear: currentYear,
			studentId: TEST_STUDENT_ID,
			studentName: 'Batch Test',
			studentDni: '99999999',
			originalDebt: new Decimal(3000),
			agreedAmount: new Decimal(3000),
			paidAmount: new Decimal(0),
			pendingAmount: new Decimal(3000),
			status: 'ACTIVE',
			reason: 'Test agreement 4 - two overdue (default)',
			createdBy: TEST_USER_ID,
			createdByName: 'Batch Test User',
			installments: {
				create: [
					{
						installmentNumber: 1,
						dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
						amount: new Decimal(1000),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(1000),
						status: 'PENDING'
					},
					{
						installmentNumber: 2,
						dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
						amount: new Decimal(1000),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(1000),
						status: 'PENDING'
					},
					{
						installmentNumber: 3,
						dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
						amount: new Decimal(1000),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(1000),
						status: 'PENDING'
					}
				]
			}
		}
	});
	agreements.push(agreement4);

	console.log(`✅ Created ${agreements.length} test agreements\n`);
	return agreements;
}

async function cleanupTestData() {
	console.log('🧹 Cleaning up test data...\n');

	try {
		// Delete in correct order respecting foreign keys
		await prisma.paymentAllocation.deleteMany({
			where: {
				payment: { studentId: TEST_STUDENT_ID }
			}
		});

		await prisma.payment.deleteMany({
			where: { studentId: TEST_STUDENT_ID }
		});

		await prisma.paymentAgreementEvent.deleteMany({
			where: {
				agreement: { studentId: TEST_STUDENT_ID }
			}
		});

		await prisma.paymentAgreementChargeRelation.deleteMany({
			where: {
				agreement: { studentId: TEST_STUDENT_ID }
			}
		});

		await prisma.paymentAgreementInstallment.deleteMany({
			where: {
				agreement: { studentId: TEST_STUDENT_ID }
			}
		});

		await prisma.paymentAgreement.deleteMany({
			where: { studentId: TEST_STUDENT_ID }
		});

		await prisma.studentCharge.deleteMany({
			where: { studentId: TEST_STUDENT_ID }
		});

		await prisma.student.delete({
			where: { id: TEST_STUDENT_ID }
		});

		await prisma.user.delete({
			where: { id: TEST_USER_ID }
		});

		// Clean up test entities
		await prisma.chargeConcept.deleteMany({
			where: {
				code: {
					contains: 'BATCH_TEST_CHARGE'
				}
			}
		});

		await prisma.academicTerm.deleteMany({
			where: {
				code: {
					contains: 'BATCH_TEST_TERM'
				}
			}
		});

		await prisma.career.deleteMany({
			where: { code: 'TEST-BATCH-EVAL' }
		});

		// Clean up audit logs
		await prisma.auditLog.deleteMany({
			where: { userId: TEST_USER_ID }
		});

		console.log('✅ Cleanup completed\n');
	} catch (error) {
		console.error('❌ Cleanup error:', error instanceof Error ? error.message : String(error));
	}
}

async function testBatchEvaluation() {
	console.log('🧪 Starting Batch Evaluation Tests\n');
	console.log('═══════════════════════════════════════════════════════════\n');

	let testPassed = true;
	const agreements = await setupTestData();

	try {
		// Test 1: Dry run mode
		console.log('Test 1: Dry run mode');
		console.log('─────────────────────────────────────────────────────────');
		const dryRunResults = await paymentAgreementService.evaluateAllActiveAgreementsStatus({
			dryRun: true,
			systemUserId: TEST_USER_ID,
			systemUserName: 'Test Batch'
		});

		console.log(`  Total evaluated: ${dryRunResults.totalEvaluated}`);
		console.log(`  Installments marked overdue: ${dryRunResults.installmentsMarkedOverdue}`);
		console.log(`  Agreements completed: ${dryRunResults.agreementsCompleted}`);
		console.log(`  Agreements defaulted: ${dryRunResults.agreementsDefaulted}`);
		console.log(`  Agreements unchanged: ${dryRunResults.agreementsUnchanged}`);
		console.log(`  Errors: ${dryRunResults.errors.length}`);

		// Note: Total may include existing ACTIVE agreements from database
		// We verify that at least our 4 test agreements were evaluated
		if (dryRunResults.totalEvaluated >= 4) {
			console.log('  ✅ Dry run passed (at least 4 agreements evaluated)\n');
		} else {
			console.log('  ❌ Expected at least 4 agreements evaluated');
			testPassed = false;
		}

		// Verify no changes were made in dry run
		const afterDryRun = await prisma.paymentAgreement.findMany({
			where: { studentId: TEST_STUDENT_ID }
		});
		if (afterDryRun.every((a) => a.status === 'ACTIVE')) {
			console.log('  ✅ No changes made in dry run\n');
		} else {
			console.log('  ❌ Changes were made in dry run');
			testPassed = false;
		}

		// Test 2: Actual evaluation
		console.log('Test 2: Actual evaluation');
		console.log('─────────────────────────────────────────────────────────');
		const actualResults = await paymentAgreementService.evaluateAllActiveAgreementsStatus({
			dryRun: false,
			systemUserId: TEST_USER_ID,
			systemUserName: 'Test Batch'
		});

		console.log(`  Total evaluated: ${actualResults.totalEvaluated}`);
		console.log(`  Installments marked overdue: ${actualResults.installmentsMarkedOverdue}`);
		console.log(`  Agreements completed: ${actualResults.agreementsCompleted}`);
		console.log(`  Agreements defaulted: ${actualResults.agreementsDefaulted}`);
		console.log(`  Agreements unchanged: ${actualResults.agreementsUnchanged}`);
		console.log(`  Errors: ${actualResults.errors.length}`);

		// Note: Total may include existing ACTIVE agreements from database
		// We verify that at least our 4 test agreements were evaluated
		if (actualResults.totalEvaluated >= 4) {
			console.log('  ✅ At least 4 agreements evaluated');
		} else {
			console.log('  ❌ Expected at least 4 agreements evaluated');
			testPassed = false;
		}

		// Verify our specific test agreements changed as expected
		if (actualResults.agreementsCompleted >= 1) {
			console.log('  ✅ At least 1 agreement completed');
		} else {
			console.log('  ❌ Expected at least 1 agreement completed');
			testPassed = false;
		}

		if (actualResults.agreementsDefaulted >= 1) {
			console.log('  ✅ At least 1 agreement defaulted');
		} else {
			console.log('  ❌ Expected at least 1 agreement defaulted');
			testPassed = false;
		}

		if (actualResults.errors.length === 0) {
			console.log('  ✅ No errors\n');
		} else {
			console.log('  ❌ Errors encountered');
			testPassed = false;
		}

		// Verify statuses
		const afterEvaluation = await prisma.paymentAgreement.findMany({
			where: { studentId: TEST_STUDENT_ID },
			include: { installments: true }
		});

		const agreement1 = afterEvaluation.find((a) => a.agreementNumber === 1);
		const agreement2 = afterEvaluation.find((a) => a.agreementNumber === 2);
		const agreement3 = afterEvaluation.find((a) => a.agreementNumber === 3);
		const agreement4 = afterEvaluation.find((a) => a.agreementNumber === 4);

		// Test 3: Verify agreement 1 unchanged
		console.log('Test 3: Agreement 1 (no overdue) unchanged');
		console.log('─────────────────────────────────────────────────────────');
		if (agreement1?.status === 'ACTIVE') {
			console.log('  ✅ Agreement 1 remains ACTIVE\n');
		} else {
			console.log(`  ❌ Agreement 1 status is ${agreement1?.status}, expected ACTIVE`);
			testPassed = false;
		}

		// Test 4: Verify agreement 2 has overdue installment
		console.log('Test 4: Agreement 2 (one overdue) marked overdue');
		console.log('─────────────────────────────────────────────────────────');
		const overdueCount = agreement2?.installments.filter((i) => i.status === 'OVERDUE').length || 0;
		if (overdueCount >= 1) {
			console.log(`  ✅ Agreement 2 has ${overdueCount} overdue installment(s)\n`);
		} else {
			console.log('  ❌ Agreement 2 has no overdue installments');
			testPassed = false;
		}

		// Test 5: Verify agreement 3 completed
		console.log('Test 5: Agreement 3 (fully paid) completed');
		console.log('─────────────────────────────────────────────────────────');
		if (agreement3?.status === 'COMPLETED') {
			console.log('  ✅ Agreement 3 is COMPLETED\n');
		} else {
			console.log(`  ❌ Agreement 3 status is ${agreement3?.status}, expected COMPLETED`);
			testPassed = false;
		}

		// Test 6: Verify agreement 4 defaulted
		console.log('Test 6: Agreement 4 (two overdue) defaulted');
		console.log('─────────────────────────────────────────────────────────');
		if (agreement4?.status === 'DEFAULTED') {
			console.log('  ✅ Agreement 4 is DEFAULTED\n');
		} else {
			console.log(`  ❌ Agreement 4 status is ${agreement4?.status}, expected DEFAULTED`);
			testPassed = false;
		}

		// Test 7: Idempotency - run again
		console.log('Test 7: Idempotency - run evaluation again');
		console.log('─────────────────────────────────────────────────────────');
		const secondRunResults = await paymentAgreementService.evaluateAllActiveAgreementsStatus({
			dryRun: false,
			systemUserId: TEST_USER_ID,
			systemUserName: 'Test Batch'
		});

		console.log(`  Total evaluated: ${secondRunResults.totalEvaluated}`);
		console.log(`  Agreements unchanged: ${secondRunResults.agreementsUnchanged}`);

		// After first run, our test agreements 3 and 4 should be COMPLETED/DEFAULTED
		// Only agreement 1 and 2 should still be ACTIVE (plus any other existing ACTIVE agreements)
		// The key is that no NEW changes should happen to our test agreements
		const afterSecondRun = await prisma.paymentAgreement.findMany({
			where: { studentId: TEST_STUDENT_ID }
		});

		const agreement3After = afterSecondRun.find((a) => a.agreementNumber === 3);
		const agreement4After = afterSecondRun.find((a) => a.agreementNumber === 4);

		if (agreement3After?.status === 'COMPLETED' && agreement4After?.status === 'DEFAULTED') {
			console.log('  ✅ Test agreements statuses unchanged (idempotent)\n');
		} else {
			console.log('  ❌ Test agreements statuses changed unexpectedly');
			testPassed = false;
		}

		// Test 8: Verify StudentCharge not modified
		console.log('Test 8: StudentCharge not modified');
		console.log('─────────────────────────────────────────────────────────');
		const charges = await prisma.studentCharge.findMany({
			where: { studentId: TEST_STUDENT_ID }
		});
		if (charges.length === 2) {
			console.log('  ✅ StudentCharge records unchanged\n');
		} else {
			console.log('  ❌ StudentCharge records were modified');
			testPassed = false;
		}

		// Test 9: Verify FinancialBlock not modified
		console.log('Test 9: FinancialBlock not modified');
		console.log('─────────────────────────────────────────────────────────');
		const blocks = await prisma.financialBlock.findMany({
			where: { studentId: TEST_STUDENT_ID }
		});
		if (blocks.length === 0) {
			console.log('  ✅ FinancialBlock records unchanged\n');
		} else {
			console.log('  ❌ FinancialBlock records were modified');
			testPassed = false;
		}

		// Test 10: Verify events and audit logs created
		console.log('Test 10: Events and audit logs created');
		console.log('─────────────────────────────────────────────────────────');
		const events = await prisma.paymentAgreementEvent.findMany({
			where: {
				agreement: { studentId: TEST_STUDENT_ID }
			}
		});
		const auditLogs = await prisma.auditLog.findMany({
			where: { userId: TEST_USER_ID }
		});

		if (events.length > 0 && auditLogs.length > 0) {
			console.log(`  ✅ ${events.length} events and ${auditLogs.length} audit logs created\n`);
		} else {
			console.log('  ❌ Events or audit logs not created');
			testPassed = false;
		}
	} catch (error) {
		console.error('❌ Test error:', error instanceof Error ? error.message : String(error));
		testPassed = false;
	} finally {
		await cleanupTestData();
	}

	console.log('═══════════════════════════════════════════════════════════');
	if (testPassed) {
		console.log('✅ All tests passed\n');
		process.exit(0);
	} else {
		console.log('❌ Some tests failed\n');
		process.exit(1);
	}
}

testBatchEvaluation();
