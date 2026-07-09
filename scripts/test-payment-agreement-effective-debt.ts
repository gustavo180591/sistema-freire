/**
 * Test script for Payment Agreement Effective Debt Calculation (Phase 5.2)
 *
 * This script tests the effective debt calculation methods that consider payment agreements.
 * It verifies that:
 * - Debt is not duplicated when charges are covered by active agreements
 * - Different agreement statuses are handled correctly
 * - Installment debt is calculated properly
 * - StudentCharge and FinancialBlock are not modified
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';

const prisma = new PrismaClient();

// Test data
const TEST_STUDENT_ID = 'test-student-effective-debt';
const TEST_STUDENT_NAME = 'Test Student Effective Debt';
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
					contains: 'EFFECTIVE-DEBT'
				}
			}
		});

		// Delete test charge concepts
		await prisma.chargeConcept.deleteMany({
			where: {
				code: {
					contains: 'EFFECTIVE-DEBT'
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
				code: 'TEST-EFFECTIVE-DEBT',
				name: 'Test Career Effective Debt',
				durationYears: 5
			}
		});
	}

	// Create a unique test user for each test
	const user = await prisma.user.create({
		data: {
			email: `test-effective-debt-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'User Effective Debt'
		}
	});

	const student = await prisma.student.create({
		data: {
			id: TEST_STUDENT_ID,
			userId: user.id,
			firstName: 'Test',
			lastName: 'Student Effective Debt',
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
			code: `2024-EFFECTIVE-DEBT-${Date.now()}`,
			name: '2024 Effective Debt Test',
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
			code: `EFFECTIVE-DEBT-${Date.now()}`,
			name: 'Test Charge Concept Effective Debt',
			active: true
		}
	});
	return concept;
}

// Helper function to create test student charge
async function createTestStudentCharge(
	studentId: string,
	conceptId: string,
	academicTermId: string,
	amount: Decimal,
	dueDate?: Date
) {
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
async function createTestAgreement(
	studentId: string,
	chargeIds: string[],
	installments: Array<{ installmentNumber: number; dueDate: Date; amount: Decimal }>,
	status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED' = 'ACTIVE'
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
			originalDebt: installments.reduce((sum, inst) => sum.add(inst.amount), new Decimal(0)),
			agreedAmount: installments.reduce((sum, inst) => sum.add(inst.amount), new Decimal(0)),
			paidAmount: new Decimal(0),
			pendingAmount: installments.reduce((sum, inst) => sum.add(inst.amount), new Decimal(0)),
			status,
			reason: 'Test agreement for effective debt calculation',
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

// Test 1: Student without agreements maintains original debt
async function testStudentWithoutAgreements() {
	console.log('\n📋 Test 1: Student without agreements maintains original debt');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charges
	const charge1 = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);
	const charge2 = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(5000),
		new Date('2027-01-01')
	);

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(`✅ Original total debt: ${effectiveDebt.originalTotalDebt.toString()}`);
	console.log(`✅ Effective total debt: ${effectiveDebt.effectiveTotalDebt.toString()}`);
	console.log(`✅ Original overdue debt: ${effectiveDebt.originalOverdueDebt.toString()}`);
	console.log(`✅ Effective overdue debt: ${effectiveDebt.effectiveOverdueDebt.toString()}`);

	if (effectiveDebt.originalTotalDebt.equals(effectiveDebt.effectiveTotalDebt)) {
		console.log('✅ Original debt equals effective debt (no agreements)');
	} else {
		throw new Error('Original debt should equal effective debt when no agreements exist');
	}

	if (effectiveDebt.agreementCoveredDebt.equals(new Decimal(0))) {
		console.log('✅ Agreement covered debt is 0 (no agreements)');
	} else {
		throw new Error('Agreement covered debt should be 0 when no agreements exist');
	}

	if (effectiveDebt.activeAgreements === 0) {
		console.log('✅ Active agreements count is 0');
	} else {
		throw new Error('Active agreements count should be 0');
	}

	console.log('✅ Test 1 passed');
}

// Test 2: Student with DRAFT agreement does not exclude original debt
async function testDraftAgreementDoesNotExcludeDebt() {
	console.log('\n📋 Test 2: Student with DRAFT agreement does not exclude original debt');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);

	// Create DRAFT agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(10000)
			}
		],
		'DRAFT'
	);

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(`✅ Original total debt: ${effectiveDebt.originalTotalDebt.toString()}`);
	console.log(`✅ Effective total debt: ${effectiveDebt.effectiveTotalDebt.toString()}`);
	console.log(`✅ Agreement covered debt: ${effectiveDebt.agreementCoveredDebt.toString()}`);

	if (effectiveDebt.agreementCoveredDebt.equals(new Decimal(0))) {
		console.log('✅ DRAFT agreement does not cover debt');
	} else {
		throw new Error('DRAFT agreement should not cover debt');
	}

	if (effectiveDebt.originalTotalDebt.equals(effectiveDebt.effectiveTotalDebt)) {
		console.log('✅ Original debt equals effective debt (DRAFT agreement does not exclude)');
	} else {
		throw new Error('Original debt should equal effective debt with DRAFT agreement');
	}

	if (effectiveDebt.draftAgreements === 1) {
		console.log('✅ Draft agreements count is 1');
	} else {
		throw new Error('Draft agreements count should be 1');
	}

	console.log('✅ Test 2 passed');
}

// Test 3: Student with ACTIVE agreement excludes covered debt
async function testActiveAgreementExcludesCoveredDebt() {
	console.log('\n📋 Test 3: Student with ACTIVE agreement excludes covered debt');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(10000)
			}
		],
		'ACTIVE'
	);

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(`✅ Original total debt: ${effectiveDebt.originalTotalDebt.toString()}`);
	console.log(`✅ Agreement covered debt: ${effectiveDebt.agreementCoveredDebt.toString()}`);
	console.log(`✅ Uncovered debt: ${effectiveDebt.uncoveredDebt.toString()}`);
	console.log(
		`✅ Agreement installment total: ${effectiveDebt.agreementInstallmentTotal.toString()}`
	);
	console.log(`✅ Effective total debt: ${effectiveDebt.effectiveTotalDebt.toString()}`);

	if (effectiveDebt.agreementCoveredDebt.equals(new Decimal(10000))) {
		console.log('✅ Agreement covers 10000 of original debt');
	} else {
		throw new Error('Agreement should cover 10000 of original debt');
	}

	if (effectiveDebt.uncoveredDebt.equals(new Decimal(0))) {
		console.log('✅ Uncovered debt is 0 (all debt covered by agreement)');
	} else {
		throw new Error('Uncovered debt should be 0 when all debt is covered');
	}

	if (effectiveDebt.agreementInstallmentTotal.equals(new Decimal(10000))) {
		console.log('✅ Agreement installment debt is 10000');
	} else {
		throw new Error('Agreement installment debt should be 10000');
	}

	if (effectiveDebt.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt equals agreement installment debt (no duplication)');
	} else {
		throw new Error('Effective debt should equal agreement installment debt (no duplication)');
	}

	if (effectiveDebt.activeAgreements === 1) {
		console.log('✅ Active agreements count is 1');
	} else {
		throw new Error('Active agreements count should be 1');
	}

	console.log('✅ Test 3 passed');
}

// Test 4: Agreement installments sum as agreement debt
async function testAgreementInstallmentsSumAsDebt() {
	console.log('\n📋 Test 4: Agreement installments sum as agreement debt');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(15000),
		new Date('2024-01-01')
	);

	// Create ACTIVE agreement with multiple installments
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(5000)
			},
			{
				installmentNumber: 2,
				dueDate: new Date('2027-06-01'),
				amount: new Decimal(5000)
			},
			{
				installmentNumber: 3,
				dueDate: new Date('2027-12-01'),
				amount: new Decimal(5000)
			}
		],
		'ACTIVE'
	);

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(
		`✅ Agreement installment total: ${effectiveDebt.agreementInstallmentTotal.toString()}`
	);
	console.log(
		`✅ Agreement installment pending: ${effectiveDebt.agreementInstallmentPending.toString()}`
	);

	if (effectiveDebt.agreementInstallmentTotal.equals(new Decimal(15000))) {
		console.log('✅ Agreement installment total is 15000 (sum of all installments)');
	} else {
		throw new Error('Agreement installment total should be 15000');
	}

	if (effectiveDebt.agreementInstallmentPending.equals(new Decimal(15000))) {
		console.log('✅ Agreement installment pending is 15000 (all installments pending)');
	} else {
		throw new Error('Agreement installment pending should be 15000');
	}

	console.log('✅ Test 4 passed');
}

// Test 5: Paid installments do not sum as pending debt
async function testPaidInstallmentsDoNotSumAsPending() {
	console.log('\n📋 Test 5: Paid installments do not sum as pending debt');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(15000),
		new Date('2024-01-01')
	);

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(5000)
			},
			{
				installmentNumber: 2,
				dueDate: new Date('2027-06-01'),
				amount: new Decimal(5000)
			},
			{
				installmentNumber: 3,
				dueDate: new Date('2027-12-01'),
				amount: new Decimal(5000)
			}
		],
		'ACTIVE'
	);

	// Mark first installment as paid
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

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(
		`✅ Agreement installment total: ${effectiveDebt.agreementInstallmentTotal.toString()}`
	);
	console.log(
		`✅ Agreement installment pending: ${effectiveDebt.agreementInstallmentPending.toString()}`
	);

	if (effectiveDebt.agreementInstallmentTotal.equals(new Decimal(10000))) {
		console.log('✅ Agreement installment total is 10000 (excludes paid installment)');
	} else {
		throw new Error('Agreement installment total should be 10000 (excludes paid installment)');
	}

	if (effectiveDebt.agreementInstallmentPending.equals(new Decimal(10000))) {
		console.log('✅ Agreement installment pending is 10000 (only pending installments)');
	} else {
		throw new Error('Agreement installment pending should be 10000');
	}

	console.log('✅ Test 5 passed');
}

// Test 6: COMPLETED agreement has 0 debt
async function testCompletedAgreementHasZeroDebt() {
	console.log('\n📋 Test 6: COMPLETED agreement has 0 debt');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);

	// Create COMPLETED agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(10000)
			}
		],
		'COMPLETED'
	);

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(
		`✅ Agreement installment total: ${effectiveDebt.agreementInstallmentTotal.toString()}`
	);
	console.log(
		`✅ Agreement installment pending: ${effectiveDebt.agreementInstallmentPending.toString()}`
	);

	if (effectiveDebt.agreementInstallmentTotal.equals(new Decimal(0))) {
		console.log('✅ COMPLETED agreement has 0 installment debt');
	} else {
		throw new Error('COMPLETED agreement should have 0 installment debt');
	}

	if (effectiveDebt.completedAgreements === 1) {
		console.log('✅ Completed agreements count is 1');
	} else {
		throw new Error('Completed agreements count should be 1');
	}

	console.log('✅ Test 6 passed');
}

// Test 7: DEFAULTED agreement appears as defaulted debt
async function testDefaultedAgreementAppearsAsDefaulted() {
	console.log('\n📋 Test 7: DEFAULTED agreement appears as defaulted debt');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);

	// Create DEFAULTED agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2024-01-01'),
				amount: new Decimal(10000)
			}
		],
		'DEFAULTED'
	);

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(`✅ Defaulted agreement debt: ${effectiveDebt.defaultedAgreementDebt.toString()}`);
	console.log(
		`✅ Agreement installment total: ${effectiveDebt.agreementInstallmentTotal.toString()}`
	);

	if (effectiveDebt.defaultedAgreementDebt.equals(new Decimal(10000))) {
		console.log('✅ DEFAULTED agreement appears as 10000 defaulted debt');
	} else {
		throw new Error('DEFAULTED agreement should appear as 10000 defaulted debt');
	}

	if (effectiveDebt.defaultedAgreements === 1) {
		console.log('✅ Defaulted agreements count is 1');
	} else {
		throw new Error('Defaulted agreements count should be 1');
	}

	console.log('✅ Test 7 passed');
}

// Test 8: Uncovered charges remain as payable debt
async function testUncoveredChargesRemainAsPayable() {
	console.log('\n📋 Test 8: Uncovered charges remain as payable debt');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create two charges
	const charge1 = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);
	const charge2 = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(5000),
		new Date('2027-01-01')
	);

	// Create ACTIVE agreement covering only charge1
	const agreement = await createTestAgreement(
		student.id,
		[charge1.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(10000)
			}
		],
		'ACTIVE'
	);

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(`✅ Original total debt: ${effectiveDebt.originalTotalDebt.toString()}`);
	console.log(`✅ Agreement covered debt: ${effectiveDebt.agreementCoveredDebt.toString()}`);
	console.log(`✅ Uncovered debt: ${effectiveDebt.uncoveredDebt.toString()}`);
	console.log(
		`✅ Agreement installment total: ${effectiveDebt.agreementInstallmentTotal.toString()}`
	);
	console.log(`✅ Effective total debt: ${effectiveDebt.effectiveTotalDebt.toString()}`);

	if (effectiveDebt.agreementCoveredDebt.equals(new Decimal(10000))) {
		console.log('✅ Agreement covers 10000 (charge1 only)');
	} else {
		throw new Error('Agreement should cover 10000 (charge1 only)');
	}

	if (effectiveDebt.uncoveredDebt.equals(new Decimal(5000))) {
		console.log('✅ Uncovered debt is 5000 (charge2 not covered)');
	} else {
		throw new Error('Uncovered debt should be 5000 (charge2 not covered)');
	}

	if (effectiveDebt.effectiveTotalDebt.equals(new Decimal(15000))) {
		console.log('✅ Effective debt is 15000 (uncovered + agreement installments)');
	} else {
		throw new Error('Effective debt should be 15000 (uncovered + agreement installments)');
	}

	console.log('✅ Test 8 passed');
}

// Test 9: No modification of StudentCharge
async function testNoStudentChargeModification() {
	console.log('\n📋 Test 9: No modification of StudentCharge');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);

	const originalChargeStatus = charge.status;
	const originalChargePaidAmount = charge.paidAmount;

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(10000)
			}
		],
		'ACTIVE'
	);

	// Calculate effective debt
	await paymentAgreementService.getStudentEffectiveDebt(student.id);

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

	console.log('✅ Test 9 passed');
}

// Test 10: No modification of FinancialBlock
async function testNoFinancialBlockModification() {
	console.log('\n📋 Test 10: No modification of FinancialBlock');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);

	// Count existing blocks
	const initialBlockCount = await prisma.financialBlock.count({
		where: { studentId: student.id }
	});

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(10000)
			}
		],
		'ACTIVE'
	);

	// Calculate effective debt
	await paymentAgreementService.getStudentEffectiveDebt(student.id);

	// Verify no new blocks were created
	const finalBlockCount = await prisma.financialBlock.count({
		where: { studentId: student.id }
	});

	if (finalBlockCount === initialBlockCount) {
		console.log('✅ No new FinancialBlock was created');
	} else {
		throw new Error('No new FinancialBlock should be created');
	}

	console.log('✅ Test 10 passed');
}

// Test 11: No debt duplication
async function testNoDebtDuplication() {
	console.log('\n📋 Test 11: No debt duplication');

	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(
		student.id,
		concept.id,
		academicTerm.id,
		new Decimal(10000),
		new Date('2024-01-01')
	);

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(
		student.id,
		[charge.id],
		[
			{
				installmentNumber: 1,
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(10000)
			}
		],
		'ACTIVE'
	);

	// Calculate effective debt
	const effectiveDebt = await paymentAgreementService.getStudentEffectiveDebt(student.id);

	console.log(`✅ Original total debt: ${effectiveDebt.originalTotalDebt.toString()}`);
	console.log(`✅ Agreement covered debt: ${effectiveDebt.agreementCoveredDebt.toString()}`);
	console.log(`✅ Uncovered debt: ${effectiveDebt.uncoveredDebt.toString()}`);
	console.log(
		`✅ Agreement installment total: ${effectiveDebt.agreementInstallmentTotal.toString()}`
	);
	console.log(`✅ Effective total debt: ${effectiveDebt.effectiveTotalDebt.toString()}`);

	// Verify no duplication: effective debt should equal uncovered + agreement installments
	const expectedEffectiveDebt = effectiveDebt.uncoveredDebt.add(
		effectiveDebt.agreementInstallmentTotal
	);

	if (effectiveDebt.effectiveTotalDebt.equals(expectedEffectiveDebt)) {
		console.log('✅ No debt duplication (effective = uncovered + agreement installments)');
	} else {
		throw new Error(
			'Debt duplication detected: effective debt should equal uncovered + agreement installments'
		);
	}

	// Verify original debt is greater than or equal to effective debt (when agreements cover debt)
	if (effectiveDebt.originalTotalDebt.gte(effectiveDebt.effectiveTotalDebt)) {
		console.log('✅ Original debt >= effective debt (agreements reduce duplication)');
	} else {
		throw new Error('Original debt should be >= effective debt when agreements cover debt');
	}

	console.log('✅ Test 11 passed');
}

// Main test runner
async function runTests() {
	console.log('🚀 Starting Payment Agreement Effective Debt Tests');
	console.log('=====================================================');

	let passedTests = 0;
	let failedTests = 0;

	const tests = [
		{
			name: 'Student without agreements maintains original debt',
			fn: testStudentWithoutAgreements
		},
		{
			name: 'Student with DRAFT agreement does not exclude original debt',
			fn: testDraftAgreementDoesNotExcludeDebt
		},
		{
			name: 'Student with ACTIVE agreement excludes covered debt',
			fn: testActiveAgreementExcludesCoveredDebt
		},
		{
			name: 'Agreement installments sum as agreement debt',
			fn: testAgreementInstallmentsSumAsDebt
		},
		{
			name: 'Paid installments do not sum as pending debt',
			fn: testPaidInstallmentsDoNotSumAsPending
		},
		{ name: 'COMPLETED agreement has 0 debt', fn: testCompletedAgreementHasZeroDebt },
		{
			name: 'DEFAULTED agreement appears as defaulted debt',
			fn: testDefaultedAgreementAppearsAsDefaulted
		},
		{ name: 'Uncovered charges remain as payable debt', fn: testUncoveredChargesRemainAsPayable },
		{ name: 'No StudentCharge modification', fn: testNoStudentChargeModification },
		{ name: 'No FinancialBlock modification', fn: testNoFinancialBlockModification },
		{ name: 'No debt duplication', fn: testNoDebtDuplication }
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
