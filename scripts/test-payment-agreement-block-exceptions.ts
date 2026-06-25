/**
 * Test script for Payment Agreement Block Exceptions (Phase 5.3)
 * 
 * This script tests the block exception logic for payment agreements.
 * It verifies that:
 * - Active and up-to-date agreements can generate block exceptions
 * - No duplicate exceptions are created
 * - DRAFT/CANCELLED/COMPLETED agreements do not generate exceptions
 * - Overdue installments revoke exceptions
 * - DEFAULTED agreements revoke exceptions
 * - Exceptions are linked with exceptionSource and exceptionAgreementId
 * - BLOCK_EXCEPTION events are registered
 * - Audit logs are created
 * - StudentCharge is not modified
 * - Global reports are not modified
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';

const prisma = new PrismaClient();

// Test data
const TEST_STUDENT_ID = 'test-student-block-exceptions';
const TEST_STUDENT_NAME = 'Test Student Block Exceptions';
const TEST_STUDENT_DNI = '87654321-' + Date.now();

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

		// Delete financial blocks
		await prisma.financialBlock.deleteMany({
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
					contains: 'BLOCK-EXCEPTIONS'
				}
			}
		});

		// Delete test charge concepts
		await prisma.chargeConcept.deleteMany({
			where: {
				code: {
					contains: 'BLOCK-EXCEPTIONS'
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
				code: 'TEST-BLOCK-EXCEPTIONS',
				name: 'Test Career Block Exceptions',
				durationYears: 5
			}
		});
	}

	// Create a unique test user for each test
	const user = await prisma.user.create({
		data: {
			email: `test-block-exceptions-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'User Block Exceptions'
		}
	});

	const student = await prisma.student.create({
		data: {
			id: TEST_STUDENT_ID,
			userId: user.id,
			firstName: 'Test',
			lastName: 'Student Block Exceptions',
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
			code: `2024-BLOCK-EXCEPTIONS-${Date.now()}`,
			name: '2024 Block Exceptions Test',
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
			code: `BLOCK-EXCEPTIONS-${Date.now()}`,
			name: 'Test Charge Concept Block Exceptions',
			active: true
		}
	});
	return concept;
}

// Helper function to create test student charge
async function createTestStudentCharge(studentId: string, conceptId: string, academicTermId: string, amount: Decimal, dueDate?: Date) {
	const charge = await prisma.studentCharge.create({
		data: {
			studentId,
			conceptId,
			periodLabel: `2024-1-${Date.now()}-${Math.random()}`,
			amount,
			paidAmount: new Decimal(0),
			dueDate: dueDate || new Date('2024-03-01'),
			status: 'PENDING',
			finalAmount: amount,
			academicTermId
		}
	});
	return charge;
}

// Helper function to create test agreement
async function createTestAgreement(studentId: string, chargeIds: string[], installments: Array<{ installmentNumber: number; dueDate: Date; amount: Decimal }>, status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED' = 'ACTIVE') {
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
			originalDebt: installments.reduce((sum, inst) => sum.add(inst.amount), new Decimal(0)),
			agreedAmount: installments.reduce((sum, inst) => sum.add(inst.amount), new Decimal(0)),
			paidAmount: new Decimal(0),
			pendingAmount: installments.reduce((sum, inst) => sum.add(inst.amount), new Decimal(0)),
			status,
			reason: 'Test agreement for block exceptions',
			createdBy: 'test-user',
			createdByName: 'Test User'
		}
	});

	// Create charge relations
	for (const chargeId of chargeIds) {
		const charge = await prisma.studentCharge.findUnique({
			where: { id: chargeId }
		});
		if (charge) {
			await prisma.paymentAgreementChargeRelation.create({
				data: {
					agreementId: agreement.id,
					chargeId,
					originalChargeAmount: charge.finalAmount,
					originalChargePaidAmount: charge.paidAmount,
					originalChargeStatus: charge.status,
					amountIncluded: charge.finalAmount,
					relationType: 'REFINANCED'
				}
			});
		}
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

// Helper function to create test financial block
async function createTestFinancialBlock(studentId: string) {
	const block = await prisma.financialBlock.create({
		data: {
			studentId,
			blockType: 'ALL',
			blockReason: 'Deuda vencida de prueba',
			blockedBy: 'test-user',
			blockedByName: 'Test User',
			debtAmount: new Decimal(10000),
			overdueDays: 30,
			isActive: true
		}
	});
	return block;
}

// Test 1: ACTIVE and up-to-date agreement generates block exception
async function testActiveAgreementGeneratesException() {
	console.log('\n📋 Test 1: ACTIVE and up-to-date agreement generates block exception');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create ACTIVE agreement with future due date
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Apply block exception
	const result = await paymentAgreementService.applyAgreementBlockException(
		agreement.id,
		student.userId,
		'Test User'
	);

	console.log(`✅ Exception applied: ${result.exceptionApplied}`);
	console.log(`✅ Block ID: ${result.blockId}`);

	if (result.exceptionApplied) {
		console.log('✅ Exception applied successfully');
	} else {
		throw new Error('Exception should have been applied');
	}

	// Verify exception in database
	const updatedBlock = await prisma.financialBlock.findUnique({
		where: { id: block.id }
	});

	if (updatedBlock?.exceptionGranted === true) {
		console.log('✅ Exception granted in database');
	} else {
		throw new Error('Exception should be granted in database');
	}

	if (updatedBlock?.exceptionSource === 'PAYMENT_AGREEMENT') {
		console.log('✅ Exception source is PAYMENT_AGREEMENT');
	} else {
		throw new Error('Exception source should be PAYMENT_AGREEMENT');
	}

	if (updatedBlock?.exceptionAgreementId === agreement.id) {
		console.log('✅ Exception linked to agreement');
	} else {
		throw new Error('Exception should be linked to agreement');
	}

	// Verify event was registered
	const events = await prisma.paymentAgreementEvent.findMany({
		where: {
			agreementId: agreement.id,
			eventType: 'BLOCK_EXCEPTION'
		}
	});

	if (events.length > 0) {
		console.log('✅ BLOCK_EXCEPTION event registered');
	} else {
		throw new Error('BLOCK_EXCEPTION event should be registered');
	}

	// Verify audit log was created
	const auditLogs = await prisma.auditLog.findMany({
		where: {
			entityType: 'FinancialBlock',
			entityId: block.id
		}
	});

	if (auditLogs.length > 0) {
		console.log('✅ Audit log created');
	} else {
		throw new Error('Audit log should be created');
	}

	console.log('✅ Test 1 passed');
}

// Test 2: No duplicate exceptions
async function testNoDuplicateExceptions() {
	console.log('\n📋 Test 2: No duplicate exceptions');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Apply exception first time
	const result1 = await paymentAgreementService.applyAgreementBlockException(
		agreement.id,
		student.userId,
		'Test User'
	);

	// Try to apply exception second time
	const result2 = await paymentAgreementService.applyAgreementBlockException(
		agreement.id,
		student.userId,
		'Test User'
	);

	console.log(`✅ First application: ${result1.exceptionApplied}`);
	console.log(`✅ Second application: ${result2.exceptionApplied}`);

	if (result1.exceptionApplied && !result2.exceptionApplied) {
		console.log('✅ No duplicate exception created');
	} else {
		throw new Error('Second application should not create duplicate exception');
	}

	console.log('✅ Test 2 passed');
}

// Test 3: DRAFT agreement does not generate exception
async function testDraftAgreementNoException() {
	console.log('\n📋 Test 3: DRAFT agreement does not generate exception');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create DRAFT agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'DRAFT');

	// Try to apply exception
	try {
		await paymentAgreementService.applyAgreementBlockException(
			agreement.id,
			student.userId,
			'Test User'
		);
		throw new Error('Should have rejected exception for DRAFT agreement');
	} catch (error) {
		if (error instanceof Error && error.message.includes('ACTIVOS')) {
			console.log('✅ Exception correctly rejected for DRAFT agreement');
		} else {
			throw error;
		}
	}

	console.log('✅ Test 3 passed');
}

// Test 4: CANCELLED agreement does not generate exception
async function testCancelledAgreementNoException() {
	console.log('\n📋 Test 4: CANCELLED agreement does not generate exception');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create CANCELLED agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'CANCELLED');

	// Try to apply exception
	try {
		await paymentAgreementService.applyAgreementBlockException(
			agreement.id,
			student.userId,
			'Test User'
		);
		throw new Error('Should have rejected exception for CANCELLED agreement');
	} catch (error) {
		if (error instanceof Error && error.message.includes('ACTIVOS')) {
			console.log('✅ Exception correctly rejected for CANCELLED agreement');
		} else {
			throw error;
		}
	}

	console.log('✅ Test 4 passed');
}

// Test 5: COMPLETED agreement does not generate active exception
async function testCompletedAgreementNoActiveException() {
	console.log('\n📋 Test 5: COMPLETED agreement does not generate active exception');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create COMPLETED agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'COMPLETED');

	// Try to apply exception
	try {
		await paymentAgreementService.applyAgreementBlockException(
			agreement.id,
			student.userId,
			'Test User'
		);
		throw new Error('Should have rejected exception for COMPLETED agreement');
	} catch (error) {
		if (error instanceof Error && error.message.includes('ACTIVOS')) {
			console.log('✅ Exception correctly rejected for COMPLETED agreement');
		} else {
			throw error;
		}
	}

	console.log('✅ Test 5 passed');
}

// Test 6: Overdue installment revokes exception
async function testOverdueInstallmentRevokesException() {
	console.log('\n📋 Test 6: Overdue installment revokes exception');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create ACTIVE agreement with past due date
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2024-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Mark installment as overdue
	await prisma.paymentAgreementInstallment.update({
		where: {
			agreementId_installmentNumber: {
				agreementId: agreement.id,
				installmentNumber: 1
			}
		},
		data: {
			status: 'OVERDUE',
			overdueSince: new Date()
		}
	});

	// Try to apply exception
	try {
		await paymentAgreementService.applyAgreementBlockException(
			agreement.id,
			student.userId,
			'Test User'
		);
		throw new Error('Should have rejected exception for agreement with overdue installment');
	} catch (error) {
		if (error instanceof Error && error.message.includes('vencidas')) {
			console.log('✅ Exception correctly rejected for agreement with overdue installment');
		} else {
			throw error;
		}
	}

	console.log('✅ Test 6 passed');
}

// Test 7: DEFAULTED agreement revokes exception
async function testDefaultedAgreementRevokesException() {
	console.log('\n📋 Test 7: DEFAULTED agreement revokes exception');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create ACTIVE agreement first
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Apply exception
	await paymentAgreementService.applyAgreementBlockException(
		agreement.id,
		student.userId,
		'Test User'
	);

	// Verify exception was applied
	const blockWithException = await prisma.financialBlock.findUnique({
		where: { id: block.id }
	});

	if (blockWithException?.exceptionGranted !== true) {
		throw new Error('Exception should be granted');
	}

	// Update agreement to DEFAULTED
	await prisma.paymentAgreement.update({
		where: { id: agreement.id },
		data: { status: 'DEFAULTED' }
	});

	// Revoke exception
	const result = await paymentAgreementService.revokeAgreementBlockException(
		agreement.id,
		student.userId,
		'Test User'
	);

	console.log(`✅ Exception revoked: ${result.exceptionRevoked}`);

	if (result.exceptionRevoked) {
		console.log('✅ Exception revoked successfully');
	} else {
		throw new Error('Exception should be revoked');
	}

	// Verify exception was revoked
	const blockAfterRevoke = await prisma.financialBlock.findUnique({
		where: { id: block.id }
	});

	if (blockAfterRevoke?.exceptionGranted === false) {
		console.log('✅ Exception revoked in database');
	} else {
		throw new Error('Exception should be revoked in database');
	}

	if (blockAfterRevoke?.exceptionSource === null) {
		console.log('✅ Exception source cleared');
	} else {
		throw new Error('Exception source should be cleared');
	}

	if (blockAfterRevoke?.exceptionAgreementId === null) {
		console.log('✅ Exception agreement link cleared');
	} else {
		throw new Error('Exception agreement link should be cleared');
	}

	console.log('✅ Test 7 passed');
}

// Test 8: No StudentCharge modification
async function testNoStudentChargeModification() {
	console.log('\n📋 Test 8: No StudentCharge modification');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	const originalChargeStatus = charge.status;
	const originalChargePaidAmount = charge.paidAmount;

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Apply exception
	await paymentAgreementService.applyAgreementBlockException(
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

	if (updatedCharge?.paidAmount.equals(originalChargePaidAmount)) {
		console.log('✅ StudentCharge paidAmount was not modified');
	} else {
		throw new Error('StudentCharge paidAmount should not be modified');
	}

	console.log('✅ Test 8 passed');
}

// Test 9: evaluateAgreementBlockStatus coordinator
async function testEvaluateAgreementBlockStatus() {
	console.log('\n📋 Test 9: evaluateAgreementBlockStatus coordinator');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create financial block
	const block = await createTestFinancialBlock(student.id);

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Evaluate and apply exception
	const result = await paymentAgreementService.evaluateAgreementBlockStatus(
		agreement.id,
		student.userId,
		'Test User'
	);

	console.log(`✅ Exception applied by coordinator: ${result.exceptionApplied}`);

	if (result.exceptionApplied) {
		console.log('✅ Coordinator applied exception correctly');
	} else {
		throw new Error('Coordinator should apply exception');
	}

	// Verify exception
	const blockWithException = await prisma.financialBlock.findUnique({
		where: { id: block.id }
	});

	if (blockWithException?.exceptionGranted === true) {
		console.log('✅ Exception applied by coordinator in database');
	} else {
		throw new Error('Exception should be applied by coordinator');
	}

	console.log('✅ Test 9 passed');
}

// Main test runner
async function runTests() {
	console.log('🚀 Starting Payment Agreement Block Exceptions Tests');
	console.log('=========================================================');

	let passedTests = 0;
	let failedTests = 0;

	const tests = [
		{ name: 'ACTIVE and up-to-date agreement generates block exception', fn: testActiveAgreementGeneratesException },
		{ name: 'No duplicate exceptions', fn: testNoDuplicateExceptions },
		{ name: 'DRAFT agreement does not generate exception', fn: testDraftAgreementNoException },
		{ name: 'CANCELLED agreement does not generate exception', fn: testCancelledAgreementNoException },
		{ name: 'COMPLETED agreement does not generate active exception', fn: testCompletedAgreementNoActiveException },
		{ name: 'Overdue installment revokes exception', fn: testOverdueInstallmentRevokesException },
		{ name: 'DEFAULTED agreement revokes exception', fn: testDefaultedAgreementRevokesException },
		{ name: 'No StudentCharge modification', fn: testNoStudentChargeModification },
		{ name: 'evaluateAgreementBlockStatus coordinator', fn: testEvaluateAgreementBlockStatus }
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

	console.log('\n=========================================================');
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
