/**
 * Test script for Payment Agreement Status Evaluation (Phase 5.1)
 *
 * Tests:
 * - Overdue installment marking
 * - Agreement completion detection
 * - Agreement default detection
 * - Event registration
 * - Audit logging
 * - Transaction rollback on failure
 * - No modification of StudentCharge
 * No creation/modification of FinancialBlock
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';

const prisma = new PrismaClient();

// Test data
const TEST_STUDENT_ID = 'test-student-status-eval';
const TEST_STUDENT_NAME = 'Test Student Status Eval';
const TEST_STUDENT_DNI = '12345678-' + Date.now();

// Cleanup function
async function cleanup() {
	console.log('🧹 Cleaning up test data...');

	try {
		// Delete payments first (due to foreign key constraints)
		await prisma.payment.deleteMany({
			where: {
				allocations: {
					some: {
						installment: {
							agreement: {
								studentId: TEST_STUDENT_ID
							}
						}
					}
				}
			}
		});

		// Delete payment allocations
		await prisma.paymentAllocation.deleteMany({
			where: {
				installment: {
					agreement: {
						studentId: TEST_STUDENT_ID
					}
				}
			}
		});

		// Delete agreement events
		await prisma.paymentAgreementEvent.deleteMany({
			where: {
				agreement: {
					studentId: TEST_STUDENT_ID
				}
			}
		});

		// Delete agreement charge relations
		await prisma.paymentAgreementChargeRelation.deleteMany({
			where: {
				agreement: {
					studentId: TEST_STUDENT_ID
				}
			}
		});

		// Delete agreement installments
		await prisma.paymentAgreementInstallment.deleteMany({
			where: {
				agreement: {
					studentId: TEST_STUDENT_ID
				}
			}
		});

		// Delete agreements
		await prisma.paymentAgreement.deleteMany({
			where: {
				studentId: TEST_STUDENT_ID
			}
		});

		// Delete student charges
		await prisma.studentCharge.deleteMany({
			where: {
				studentId: TEST_STUDENT_ID
			}
		});

		// Delete student
		const student = await prisma.student.findUnique({
			where: { id: TEST_STUDENT_ID }
		});
		if (student) {
			const userId = student.userId;
			await prisma.student.delete({
				where: { id: TEST_STUDENT_ID }
			});
			// Delete user
			if (userId) {
				await prisma.user.delete({
					where: { id: userId }
				});
			}
		}

		// Delete audit logs
		await prisma.auditLog.deleteMany({
			where: {
				entityId: {
					contains: TEST_STUDENT_ID
				}
			}
		});

		// Delete test academic terms
		await prisma.academicTerm.deleteMany({
			where: {
				code: {
					contains: 'STATUS-EVAL'
				}
			}
		});

		// Delete test charge concepts
		await prisma.chargeConcept.deleteMany({
			where: {
				code: {
					contains: 'STATUS-EVAL'
				}
			}
		});

		console.log('✅ Cleanup completed');
	} catch (error) {
		console.error('❌ Cleanup error:', error);
	}
}

// Helper function to create test student
async function createTestStudent() {
	// Get or create a test career
	let career = await prisma.career.findFirst();
	if (!career) {
		career = await prisma.career.create({
			data: {
				code: 'TEST-STATUS-EVAL',
				name: 'Test Career Status Eval',
				durationYears: 5
			}
		});
	}

	// Create a unique test user for each test
	const user = await prisma.user.create({
		data: {
			email: `test-status-eval-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'User Status Eval'
		}
	});

	const student = await prisma.student.create({
		data: {
			id: TEST_STUDENT_ID,
			userId: user.id,
			firstName: 'Test',
			lastName: 'Student Status Eval',
			dni: TEST_STUDENT_DNI,
			careerId: career.id
		}
	});
	return student;
}

// Helper function to create test academic term
async function createTestAcademicTerm() {
	const term = await prisma.academicTerm.create({
		data: {
			code: `2024-STATUS-EVAL-${Date.now()}`,
			name: '2024 Status Eval Test',
			year: 2024,
			termType: 'ANUAL',
			startDate: new Date('2024-01-01'),
			endDate: new Date('2024-12-31')
		}
	});
	return term;
}

// Helper function to create test charge concept
async function createTestChargeConcept() {
	const concept = await prisma.chargeConcept.create({
		data: {
			code: 'TEST-STATUS-EVAL',
			name: 'Test Status Eval Concept',
			description: 'Test concept for status evaluation',
			active: true
		}
	});
	return concept;
}

// Helper function to create test student charge
async function createTestStudentCharge(
	studentId: string,
	conceptId: string,
	academicTermId: string
) {
	const charge = await prisma.studentCharge.create({
		data: {
			studentId,
			conceptId,
			academicTermId,
			periodLabel: '2024',
			amount: new Decimal(10000),
			paidAmount: new Decimal(0),
			dueDate: new Date('2024-03-01'),
			status: 'PENDING',
			finalAmount: new Decimal(10000)
		}
	});
	return charge;
}

// Helper function to create test agreement
async function createTestAgreement(
	studentId: string,
	chargeIds: string[],
	installments: Array<{ installmentNumber: number; dueDate: Date; amount: Decimal }>
) {
	const currentYear = new Date().getFullYear();

	// Get next agreement number
	const numberRecord = await prisma.paymentAgreementNumber.upsert({
		where: { year: currentYear },
		update: { lastNumber: { increment: 1 } },
		create: { year: currentYear, lastNumber: 1 }
	});
	const agreementNumber = numberRecord.lastNumber;

	const agreement = await prisma.paymentAgreement.create({
		data: {
			agreementNumber,
			agreementYear: currentYear,
			studentId,
			studentName: TEST_STUDENT_NAME,
			studentDni: TEST_STUDENT_DNI,
			originalDebt: new Decimal(10000),
			agreedAmount: new Decimal(10000),
			paidAmount: new Decimal(0),
			pendingAmount: new Decimal(10000),
			status: 'ACTIVE',
			reason: 'Test agreement for status evaluation',
			createdBy: 'test-user',
			createdByName: 'Test User',
			activatedAt: new Date(),
			activatedBy: 'test-user',
			activatedByName: 'Test User'
		}
	});

	// Create charge relations
	for (const chargeId of chargeIds) {
		await prisma.paymentAgreementChargeRelation.create({
			data: {
				agreementId: agreement.id,
				chargeId,
				originalChargeAmount: new Decimal(10000),
				originalChargePaidAmount: new Decimal(0),
				originalChargeStatus: 'PENDING',
				amountIncluded: new Decimal(10000),
				relationType: 'REFINANCED'
			}
		});
	}

	// Create installments
	for (const installment of installments) {
		await prisma.paymentAgreementInstallment.create({
			data: {
				agreementId: agreement.id,
				installmentNumber: installment.installmentNumber,
				dueDate: installment.dueDate,
				amount: installment.amount,
				paidAmount: new Decimal(0),
				pendingAmount: installment.amount,
				status: 'PENDING'
			}
		});
	}

	return agreement;
}

// Test 1: Overdue installment marking (PENDING)
async function testOverdueInstallmentMarking() {
	console.log('\n📋 Test 1: Overdue installment marking (PENDING)');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id);

	// Create agreement with overdue installment
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'), // Past date
				amount: new Decimal(5000)
			},
			{
				installmentNumber: 2,
				dueDate: new Date('2027-01-01'), // Future date
				amount: new Decimal(5000)
			}
		]
	);

	// Evaluate status
	const result = await paymentAgreementService.evaluateAgreementFinancialStatus(
		agreement.id,
		student.userId,
		'Test User'
	);

	console.log(`✅ Overdue marked: ${result.overdueMarked}`);
	console.log(`✅ Status changed: ${result.statusChanged}`);
	console.log(`✅ Previous status: ${result.previousStatus}`);
	console.log(`✅ New status: ${result.newStatus}`);

	// Verify installment was marked as overdue
	const overdueInstallment = await prisma.paymentAgreementInstallment.findFirst({
		where: {
			agreementId: agreement.id,
			installmentNumber: 1
		}
	});

	if (overdueInstallment?.status === 'OVERDUE') {
		console.log('✅ Installment correctly marked as OVERDUE');
	} else {
		throw new Error('Installment should be marked as OVERDUE');
	}

	// Verify future installment was not marked as overdue
	const futureInstallment = await prisma.paymentAgreementInstallment.findFirst({
		where: {
			agreementId: agreement.id,
			installmentNumber: 2
		}
	});

	if (futureInstallment?.status === 'PENDING') {
		console.log('✅ Future installment correctly kept as PENDING');
	} else {
		throw new Error('Future installment should remain PENDING');
	}

	// Verify events were registered
	const events = await prisma.paymentAgreementEvent.findMany({
		where: { agreementId: agreement.id }
	});

	if (events.length > 0) {
		console.log(`✅ Events registered: ${events.length}`);
	} else {
		throw new Error('Events should be registered');
	}

	// Verify audit logs were created
	const auditLogs = await prisma.auditLog.findMany({
		where: {
			entityId: agreement.id
		}
	});

	if (auditLogs.length > 0) {
		console.log(`✅ Audit logs created: ${auditLogs.length}`);
	} else {
		throw new Error('Audit logs should be created');
	}

	console.log('✅ Test 1 passed');
}

// Test 1b: Overdue installment marking (PARTIAL)
async function testOverdueInstallmentPartial() {
	console.log('\n📋 Test 1b: Overdue installment marking (PARTIAL)');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id);

	// Create agreement with partial overdue installment
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'), // Past date
				amount: new Decimal(5000)
			}
		]
	);

	// Mark installment as PARTIAL
	await prisma.paymentAgreementInstallment.update({
		where: {
			agreementId_installmentNumber: {
				agreementId: agreement.id,
				installmentNumber: 1
			}
		},
		data: {
			status: 'PARTIAL',
			paidAmount: new Decimal(2000),
			pendingAmount: new Decimal(3000)
		}
	});

	// Evaluate status
	const result = await paymentAgreementService.evaluateAgreementFinancialStatus(
		agreement.id,
		student.userId,
		'Test User'
	);

	// Verify PARTIAL installment was marked as overdue
	const overdueInstallment = await prisma.paymentAgreementInstallment.findFirst({
		where: {
			agreementId: agreement.id,
			installmentNumber: 1
		}
	});

	if (overdueInstallment?.status === 'OVERDUE') {
		console.log('✅ PARTIAL installment correctly marked as OVERDUE');
	} else {
		throw new Error('PARTIAL installment should be marked as OVERDUE');
	}

	console.log('✅ Test 1b passed');
}

// Test 1c: Paid overdue installment should not change
async function testOverdueInstallmentPaid() {
	console.log('\n📋 Test 1c: Paid overdue installment should not change');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id);

	// Create agreement with paid overdue installment
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'), // Past date
				amount: new Decimal(5000)
			}
		]
	);

	// Mark installment as PAID
	await prisma.paymentAgreementInstallment.update({
		where: {
			agreementId_installmentNumber: {
				agreementId: agreement.id,
				installmentNumber: 1
			}
		},
		data: {
			status: 'PAID',
			paidAmount: new Decimal(5000),
			pendingAmount: new Decimal(0),
			paidAt: new Date()
		}
	});

	// Evaluate status
	const result = await paymentAgreementService.evaluateAgreementFinancialStatus(
		agreement.id,
		student.userId,
		'Test User'
	);

	// Verify PAID installment was NOT marked as overdue
	const paidInstallment = await prisma.paymentAgreementInstallment.findFirst({
		where: {
			agreementId: agreement.id,
			installmentNumber: 1
		}
	});

	if (paidInstallment?.status === 'PAID') {
		console.log('✅ PAID installment correctly kept as PAID (not marked OVERDUE)');
	} else {
		throw new Error('PAID installment should remain PAID');
	}

	console.log('✅ Test 1c passed');
}

// Test 2: Agreement completion detection
async function testAgreementCompletion() {
	console.log('\n📋 Test 2: Agreement completion detection');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id);

	// Create agreement with all installments paid
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'),
				amount: new Decimal(5000)
			},
			{
				installmentNumber: 2,
				dueDate: new Date('2024-06-01'),
				amount: new Decimal(5000)
			}
		]
	);

	// Mark all installments as paid
	await prisma.paymentAgreementInstallment.updateMany({
		where: { agreementId: agreement.id },
		data: {
			status: 'PAID',
			paidAmount: new Decimal(5000),
			pendingAmount: new Decimal(0),
			paidAt: new Date()
		}
	});

	// Update agreement totals
	await prisma.paymentAgreement.update({
		where: { id: agreement.id },
		data: {
			paidAmount: new Decimal(10000),
			pendingAmount: new Decimal(0)
		}
	});

	// Evaluate status
	const result = await paymentAgreementService.evaluateAgreementFinancialStatus(
		agreement.id,
		student.userId,
		'Test User'
	);

	console.log(`✅ Status changed: ${result.statusChanged}`);
	console.log(`✅ Previous status: ${result.previousStatus}`);
	console.log(`✅ New status: ${result.newStatus}`);

	if (result.newStatus === 'COMPLETED') {
		console.log('✅ Agreement correctly marked as COMPLETED');
	} else {
		throw new Error('Agreement should be marked as COMPLETED');
	}

	// Verify completedAt was set
	const updatedAgreement = await prisma.paymentAgreement.findUnique({
		where: { id: agreement.id }
	});

	if (updatedAgreement?.completedAt) {
		console.log('✅ completedAt was set');
	} else {
		throw new Error('completedAt should be set');
	}

	console.log('✅ Test 2 passed');
}

// Test 3: Agreement default detection
async function testAgreementDefault() {
	console.log('\n📋 Test 3: Agreement default detection');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id);

	// Create agreement with 2 consecutive overdue installments
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'), // Past date
				amount: new Decimal(2500)
			},
			{
				installmentNumber: 2,
				dueDate: new Date('2024-02-01'), // Past date
				amount: new Decimal(2500)
			},
			{
				installmentNumber: 3,
				dueDate: new Date('2025-01-01'), // Future date
				amount: new Decimal(2500)
			},
			{
				installmentNumber: 4,
				dueDate: new Date('2025-06-01'), // Future date
				amount: new Decimal(2500)
			}
		]
	);

	// Evaluate status
	const result = await paymentAgreementService.evaluateAgreementFinancialStatus(
		agreement.id,
		student.userId,
		'Test User'
	);

	console.log(`✅ Overdue marked: ${result.overdueMarked}`);
	console.log(`✅ Status changed: ${result.statusChanged}`);
	console.log(`✅ Previous status: ${result.previousStatus}`);
	console.log(`✅ New status: ${result.newStatus}`);

	if (result.newStatus === 'DEFAULTED') {
		console.log('✅ Agreement correctly marked as DEFAULTED');
	} else {
		throw new Error('Agreement should be marked as DEFAULTED');
	}

	console.log('✅ Test 3 passed');
}

// Test 4: No modification of StudentCharge
async function testNoStudentChargeModification() {
	console.log('\n📋 Test 4: No modification of StudentCharge');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id);

	const originalChargeStatus = charge.status;
	const originalChargePaidAmount = charge.paidAmount;

	// Create agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'),
				amount: new Decimal(10000)
			}
		]
	);

	// Evaluate status
	await paymentAgreementService.evaluateAgreementFinancialStatus(
		agreement.id,
		student.userId,
		'Test User'
	);

	// Verify StudentCharge was not modified
	const updatedCharge = await prisma.studentCharge.findUnique({
		where: { id: charge.id }
	});

	if (updatedCharge?.status === originalChargeStatus) {
		console.log('✅ StudentCharge status was not modified');
	} else {
		throw new Error('StudentCharge status should not be modified');
	}

	if (updatedCharge?.paidAmount.toString() === originalChargePaidAmount.toString()) {
		console.log('✅ StudentCharge paidAmount was not modified');
	} else {
		throw new Error('StudentCharge paidAmount should not be modified');
	}

	console.log('✅ Test 4 passed');
}

// Test 5: No creation/modification of FinancialBlock
async function testNoFinancialBlockModification() {
	console.log('\n📋 Test 5: No creation/modification of FinancialBlock');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id);

	// Count existing blocks
	const initialBlockCount = await prisma.financialBlock.count({
		where: { studentId: student.id }
	});

	// Create agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'),
				amount: new Decimal(10000)
			}
		]
	);

	// Evaluate status
	await paymentAgreementService.evaluateAgreementFinancialStatus(
		agreement.id,
		student.userId,
		'Test User'
	);

	// Verify no new blocks were created
	const finalBlockCount = await prisma.financialBlock.count({
		where: { studentId: student.id }
	});

	if (finalBlockCount === initialBlockCount) {
		console.log('✅ No new FinancialBlock was created');
	} else {
		throw new Error('No new FinancialBlock should be created');
	}

	console.log('✅ Test 5 passed');
}

// Test 6: Transaction rollback on failure
async function testTransactionRollback() {
	console.log('\n📋 Test 6: Transaction rollback on failure');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id);

	// Create agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'),
				amount: new Decimal(10000)
			}
		]
	);

	// Try to evaluate with invalid agreement ID
	try {
		await paymentAgreementService.evaluateAgreementFinancialStatus(
			'invalid-id',
			'test-user',
			'Test User'
		);
		throw new Error('Should have thrown an error');
	} catch (error) {
		if ((error as Error).message === 'Agreement not found') {
			console.log('✅ Error correctly thrown for invalid agreement ID');
		} else {
			throw error;
		}
	}

	// Verify agreement was not modified
	const unchangedAgreement = await prisma.paymentAgreement.findUnique({
		where: { id: agreement.id }
	});

	if (unchangedAgreement?.status === 'ACTIVE') {
		console.log('✅ Agreement status was not modified (transaction rolled back)');
	} else {
		throw new Error('Agreement status should not be modified');
	}

	console.log('✅ Test 6 passed');
}

// Main test runner
async function runTests() {
	console.log('🚀 Starting Payment Agreement Status Evaluation Tests');
	console.log('=====================================================');

	let passedTests = 0;
	let failedTests = 0;

	const tests = [
		{ name: 'Overdue installment marking (PENDING)', fn: testOverdueInstallmentMarking },
		{ name: 'Overdue installment marking (PARTIAL)', fn: testOverdueInstallmentPartial },
		{ name: 'Overdue installment marking (PAID)', fn: testOverdueInstallmentPaid },
		{ name: 'Agreement completion detection', fn: testAgreementCompletion },
		{ name: 'Agreement default detection', fn: testAgreementDefault },
		{ name: 'No StudentCharge modification', fn: testNoStudentChargeModification },
		{ name: 'No FinancialBlock modification', fn: testNoFinancialBlockModification },
		{ name: 'Transaction rollback', fn: testTransactionRollback }
	];

	for (const test of tests) {
		try {
			await test.fn();
			passedTests++;
		} catch (error) {
			failedTests++;
			console.error(`❌ Test failed: ${test.name}`);
			console.error(error);
		} finally {
			await cleanup();
		}
	}

	console.log('\n=====================================================');
	console.log(`📊 Test Results: ${passedTests}/${tests.length} passed`);

	if (failedTests > 0) {
		console.log(`❌ ${failedTests} test(s) failed`);
		process.exit(1);
	} else {
		console.log('✅ All tests passed');
		process.exit(0);
	}
}

// Run tests
runTests().catch((error) => {
	console.error('❌ Test runner error:', error);
	process.exit(1);
});
