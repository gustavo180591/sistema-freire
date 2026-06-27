/**
 * Test script for Payment Agreement Integrated Reports (Phase 5.4)
 * 
 * This script tests the integrated financial reports that consider payment agreements.
 * It verifies that:
 * - Students without agreements appear with normal original debt
 * - DRAFT agreements do not exclude original debt
 * - ACTIVE agreements exclude original debt covered
 * - ACTIVE agreements add installment pending debt
 * - COMPLETED agreements do not add pending debt
 * - DEFAULTED agreements appear as defaulted debt
 * - Uncovered charges remain as enforceable debt
 * - Total effective debt does not duplicate
 * - Aggregated reports sum correctly
 * - StudentCharge is not modified
 * - FinancialBlock is not modified
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';

const prisma = new PrismaClient();

// Test data
const TEST_STUDENT_ID = 'test-student-integrated-reports';
const TEST_STUDENT_NAME = 'Test Student Integrated Reports';
const TEST_STUDENT_DNI = '98765432-' + Date.now();

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

		// Delete test academic terms (only if not referenced by other charges)
		const testTerms = await prisma.academicTerm.findMany({
			where: {
				code: {
					contains: 'INTEGRATED-REPORTS'
				}
			}
		});
		for (const term of testTerms) {
			const chargesCount = await prisma.studentCharge.count({
				where: { academicTermId: term.id }
			});
			if (chargesCount === 0) {
				await prisma.academicTerm.delete({
					where: { id: term.id }
				});
			}
		}

		// Delete test charge concepts (only if not referenced by other charges)
		const testConcepts = await prisma.chargeConcept.findMany({
			where: {
				code: {
					contains: 'INTEGRATED-REPORTS'
				}
			}
		});
		for (const concept of testConcepts) {
			const chargesCount = await prisma.studentCharge.count({
				where: { conceptId: concept.id }
			});
			if (chargesCount === 0) {
				await prisma.chargeConcept.delete({
					where: { id: concept.id }
				});
			}
		}

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
				code: 'TEST-INTEGRATED-REPORTS',
				name: 'Test Career Integrated Reports',
				durationYears: 5
			}
		});
	}

	// Create a unique test user for each test
	const user = await prisma.user.create({
		data: {
			email: `test-integrated-reports-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'User Integrated Reports'
		}
	});

	const student = await prisma.student.create({
		data: {
			id: TEST_STUDENT_ID,
			userId: user.id,
			firstName: 'Test',
			lastName: 'Student Integrated Reports',
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
			code: `2024-INTEGRATED-REPORTS-${Date.now()}`,
			name: '2024 Integrated Reports Test',
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
			code: `INTEGRATED-REPORTS-${Date.now()}`,
			name: 'Test Charge Concept Integrated Reports',
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
			reason: 'Test agreement for integrated reports',
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

// Test 1: Student without agreement appears with normal original debt
async function testStudentWithoutAgreement() {
	console.log('\n📋 Test 1: Student without agreement appears with normal original debt');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Original debt total: ${report.originalDebtTotal.toString()}`);
	console.log(`✅ Original debt covered by agreements: ${report.originalDebtCoveredByActiveAgreements.toString()}`);
	console.log(`✅ Original debt still enforceable: ${report.originalDebtStillEnforceable.toString()}`);
	console.log(`✅ Effective total debt: ${report.effectiveTotalDebt.toString()}`);

	if (report.originalDebtTotal.equals(new Decimal(10000))) {
		console.log('✅ Original debt total is correct');
	} else {
		throw new Error('Original debt total should be 10000');
	}

	if (report.originalDebtCoveredByActiveAgreements.equals(new Decimal(0))) {
		console.log('✅ No debt covered by agreements');
	} else {
		throw new Error('No debt should be covered by agreements');
	}

	if (report.originalDebtStillEnforceable.equals(new Decimal(10000))) {
		console.log('✅ All original debt is still enforceable');
	} else {
		throw new Error('All original debt should be enforceable');
	}

	if (report.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt equals original debt');
	} else {
		throw new Error('Effective debt should equal original debt');
	}

	if (report.activeAgreementsCount === 0) {
		console.log('✅ No active agreements');
	} else {
		throw new Error('Should have no active agreements');
	}

	console.log('✅ Test 1 passed');
}

// Test 2: DRAFT agreement does not exclude original debt
async function testDraftAgreementNoExclusion() {
	console.log('\n📋 Test 2: DRAFT agreement does not exclude original debt');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create DRAFT agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'DRAFT');

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Original debt total: ${report.originalDebtTotal.toString()}`);
	console.log(`✅ Original debt covered by agreements: ${report.originalDebtCoveredByActiveAgreements.toString()}`);
	console.log(`✅ Original debt still enforceable: ${report.originalDebtStillEnforceable.toString()}`);

	if (report.originalDebtCoveredByActiveAgreements.equals(new Decimal(0))) {
		console.log('✅ DRAFT agreement does not cover debt');
	} else {
		throw new Error('DRAFT agreement should not cover debt');
	}

	if (report.originalDebtStillEnforceable.equals(new Decimal(10000))) {
		console.log('✅ All original debt is still enforceable');
	} else {
		throw new Error('All original debt should be enforceable');
	}

	console.log('✅ Test 2 passed');
}

// Test 2.5: CANCELLED agreement does not exclude original debt
async function testCancelledAgreementNoExclusion() {
	console.log('\n📋 Test 2.5: CANCELLED agreement does not exclude original debt');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create CANCELLED agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'CANCELLED');

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Original debt total: ${report.originalDebtTotal.toString()}`);
	console.log(`✅ Original debt covered by agreements: ${report.originalDebtCoveredByActiveAgreements.toString()}`);
	console.log(`✅ Original debt still enforceable: ${report.originalDebtStillEnforceable.toString()}`);

	if (report.originalDebtCoveredByActiveAgreements.equals(new Decimal(0))) {
		console.log('✅ CANCELLED agreement does not cover debt');
	} else {
		throw new Error('CANCELLED agreement should not cover debt');
	}

	if (report.originalDebtStillEnforceable.equals(new Decimal(10000))) {
		console.log('✅ All original debt is still enforceable');
	} else {
		throw new Error('All original debt should be enforceable');
	}

	console.log('✅ Test 2.5 passed');
}

// Test 3: ACTIVE agreement excludes original debt covered
async function testActiveAgreementExcludesCoveredDebt() {
	console.log('\n📋 Test 3: ACTIVE agreement excludes original debt covered');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Original debt total: ${report.originalDebtTotal.toString()}`);
	console.log(`✅ Original debt covered by agreements: ${report.originalDebtCoveredByActiveAgreements.toString()}`);
	console.log(`✅ Original debt still enforceable: ${report.originalDebtStillEnforceable.toString()}`);

	if (report.originalDebtCoveredByActiveAgreements.equals(new Decimal(10000))) {
		console.log('✅ ACTIVE agreement covers original debt');
	} else {
		throw new Error('ACTIVE agreement should cover original debt');
	}

	if (report.originalDebtStillEnforceable.equals(new Decimal(0))) {
		console.log('✅ No original debt is enforceable');
	} else {
		throw new Error('No original debt should be enforceable');
	}

	if (report.agreementPendingDebt.equals(new Decimal(10000))) {
		console.log('✅ Agreement pending debt equals original debt');
	} else {
		throw new Error('Agreement pending debt should equal original debt');
	}

	console.log('✅ Test 3 passed');
}

// Test 4: ACTIVE agreement adds installment pending debt
async function testActiveAgreementAddsInstallmentDebt() {
	console.log('\n📋 Test 4: ACTIVE agreement adds installment pending debt');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(5000)
		},
		{
			installmentNumber: 2,
			dueDate: new Date('2027-06-01'),
			amount: new Decimal(5000)
		}
	], 'ACTIVE');

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Agreement pending debt: ${report.agreementPendingDebt.toString()}`);
	console.log(`✅ Effective total debt: ${report.effectiveTotalDebt.toString()}`);

	if (report.agreementPendingDebt.equals(new Decimal(10000))) {
		console.log('✅ Agreement pending debt equals total installments');
	} else {
		throw new Error('Agreement pending debt should equal total installments');
	}

	if (report.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt equals agreement pending debt');
	} else {
		throw new Error('Effective debt should equal agreement pending debt');
	}

	console.log('✅ Test 4 passed');
}

// Test 5: COMPLETED agreement does not add pending debt
async function testCompletedAgreementNoPendingDebt() {
	console.log('\n📋 Test 5: COMPLETED agreement does not add pending debt');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create COMPLETED agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'COMPLETED');

	// Mark all installments as paid
	await prisma.paymentAgreementInstallment.updateMany({
		where: { agreementId: agreement.id },
		data: {
			status: 'PAID',
			paidAmount: new Decimal(10000),
			pendingAmount: new Decimal(0)
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

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Agreement pending debt: ${report.agreementPendingDebt.toString()}`);
	console.log(`✅ Effective total debt: ${report.effectiveTotalDebt.toString()}`);

	if (report.agreementPendingDebt.equals(new Decimal(0))) {
		console.log('✅ COMPLETED agreement has no pending debt');
	} else {
		throw new Error('COMPLETED agreement should have no pending debt');
	}

	// COMPLETED agreements do not cover original debt (only ACTIVE does)
	// but they have no pending debt, so effective debt equals original debt
	if (report.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt equals original debt (COMPLETED does not cover)');
	} else {
		throw new Error('Effective debt should equal original debt (COMPLETED does not cover original debt)');
	}

	console.log('✅ Test 5 passed');
}

// Test 6: DEFAULTED agreement appears as defaulted debt
async function testDefaultedAgreementAppearsAsDefaulted() {
	console.log('\n📋 Test 6: DEFAULTED agreement appears as defaulted debt');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create DEFAULTED agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'DEFAULTED');

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Agreement defaulted debt: ${report.agreementDefaultedDebt.toString()}`);
	console.log(`✅ Defaulted agreements count: ${report.defaultedAgreementsCount}`);

	if (report.agreementDefaultedDebt.equals(new Decimal(10000))) {
		console.log('✅ DEFAULTED agreement appears as defaulted debt');
	} else {
		throw new Error('DEFAULTED agreement should appear as defaulted debt');
	}

	if (report.defaultedAgreementsCount === 1) {
		console.log('✅ One defaulted agreement counted');
	} else {
		throw new Error('Should have one defaulted agreement');
	}

	console.log('✅ Test 6 passed');
}

// Test 7: Uncovered charges remain as enforceable debt
async function testUncoveredChargesRemainEnforceable() {
	console.log('\n📋 Test 7: Uncovered charges remain as enforceable debt');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create two charges
	const charge1 = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(5000), new Date('2024-01-01'));
	const charge2 = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(5000), new Date('2024-01-01'));

	// Create ACTIVE agreement covering only one charge
	const agreement = await createTestAgreement(student.id, [charge1.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(5000)
		}
	], 'ACTIVE');

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Original debt total: ${report.originalDebtTotal.toString()}`);
	console.log(`✅ Original debt covered by agreements: ${report.originalDebtCoveredByActiveAgreements.toString()}`);
	console.log(`✅ Original debt still enforceable: ${report.originalDebtStillEnforceable.toString()}`);

	if (report.originalDebtTotal.equals(new Decimal(10000))) {
		console.log('✅ Original debt total is correct');
	} else {
		throw new Error('Original debt total should be 10000');
	}

	if (report.originalDebtCoveredByActiveAgreements.equals(new Decimal(5000))) {
		console.log('✅ Half of debt is covered by agreement');
	} else {
		throw new Error('Half of debt should be covered by agreement');
	}

	if (report.originalDebtStillEnforceable.equals(new Decimal(5000))) {
		console.log('✅ Uncovered charge remains enforceable');
	} else {
		throw new Error('Uncovered charge should remain enforceable');
	}

	if (report.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt equals original debt (no duplication)');
	} else {
		throw new Error('Effective debt should equal original debt');
	}

	console.log('✅ Test 7 passed');
}

// Test 8: Total effective debt does not duplicate
async function testNoDebtDuplication() {
	console.log('\n📋 Test 8: Total effective debt does not duplicate');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Get integrated report
	const report = await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	console.log(`✅ Original debt total: ${report.originalDebtTotal.toString()}`);
	console.log(`✅ Original debt covered: ${report.originalDebtCoveredByActiveAgreements.toString()}`);
	console.log(`✅ Original debt enforceable: ${report.originalDebtStillEnforceable.toString()}`);
	console.log(`✅ Agreement pending debt: ${report.agreementPendingDebt.toString()}`);
	console.log(`✅ Effective total debt: ${report.effectiveTotalDebt.toString()}`);

	// Effective debt = uncovered debt + agreement pending debt
	const expectedEffective = report.originalDebtStillEnforceable.add(report.agreementPendingDebt);

	if (report.effectiveTotalDebt.equals(expectedEffective)) {
		console.log('✅ Effective debt does not duplicate');
	} else {
		throw new Error('Effective debt should not duplicate');
	}

	if (report.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt equals original debt');
	} else {
		throw new Error('Effective debt should equal original debt');
	}

	console.log('✅ Test 8 passed');
}

// Test 9: Aggregated reports sum correctly
async function testAggregatedReportsSumCorrectly() {
	console.log('\n📋 Test 9: Aggregated reports sum correctly');
	
	// Create first student
	const student1Id = `test-student-aggregated-1-${Date.now()}`;
	const user1 = await prisma.user.create({
		data: {
			email: `test-aggregated-1-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'User Aggregated 1'
		}
	});
	const career = await prisma.career.findFirst() || await prisma.career.create({
		data: {
			code: 'TEST-AGGREGATED',
			name: 'Test Career Aggregated',
			durationYears: 5
		}
	});
	const student1 = await prisma.student.create({
		data: {
			id: student1Id,
			userId: user1.id,
			firstName: 'Test',
			lastName: 'Student Aggregated 1',
			dni: '11111111-' + Date.now(),
			careerId: career.id
		}
	});

	// Create second student
	const student2Id = `test-student-aggregated-2-${Date.now()}`;
	const user2 = await prisma.user.create({
		data: {
			email: `test-aggregated-2-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'User Aggregated 2'
		}
	});
	const student2 = await prisma.student.create({
		data: {
			id: student2Id,
			userId: user2.id,
			firstName: 'Test',
			lastName: 'Student Aggregated 2',
			dni: '22222222-' + Date.now(),
			careerId: career.id
		}
	});

	// Create academic term and concept
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charges for both students
	const charge1 = await createTestStudentCharge(student1.id, concept.id, academicTerm.id, new Decimal(5000), new Date('2024-01-01'));
	const charge2 = await createTestStudentCharge(student2.id, concept.id, academicTerm.id, new Decimal(3000), new Date('2024-01-01'));

	// Create agreement for first student
	const agreement1 = await createTestAgreement(student1.id, [charge1.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(5000)
		}
	], 'ACTIVE');

	// Get aggregated report
	const report = await paymentAgreementService.getAggregatedFinancialReport([student1.id, student2.id]);

	console.log(`✅ Total students: ${report.totalStudents}`);
	console.log(`✅ Total original debt: ${report.totalOriginalDebt.toString()}`);
	console.log(`✅ Total effective debt: ${report.totalEffectiveDebt.toString()}`);

	if (report.totalStudents === 2) {
		console.log('✅ Two students in report');
	} else {
		throw new Error('Should have two students');
	}

	if (report.totalOriginalDebt.equals(new Decimal(8000))) {
		console.log('✅ Total original debt is correct');
	} else {
		throw new Error('Total original debt should be 8000');
	}

	if (report.totalEffectiveDebt.equals(new Decimal(8000))) {
		console.log('✅ Total effective debt is correct');
	} else {
		throw new Error('Total effective debt should be 8000');
	}

	// Cleanup second student
	await prisma.studentCharge.deleteMany({ where: { studentId: student2.id } });
	await prisma.student.delete({ where: { id: student2.id } });
	await prisma.user.delete({ where: { id: user2.id } });

	// Cleanup first student (delete installments first due to foreign key)
	await prisma.paymentAgreementInstallment.deleteMany({
		where: {
			agreement: {
				studentId: student1.id
			}
		}
	});
	await prisma.paymentAgreementChargeRelation.deleteMany({
		where: {
			agreement: {
				studentId: student1.id
			}
		}
	});
	await prisma.paymentAgreement.deleteMany({ where: { studentId: student1.id } });
	await prisma.studentCharge.deleteMany({ where: { studentId: student1.id } });
	await prisma.student.delete({ where: { id: student1.id } });
	await prisma.user.delete({ where: { id: user1.id } });

	console.log('✅ Test 9 passed');
}

// Test 10: No StudentCharge modification
async function testNoStudentChargeModification() {
	console.log('\n📋 Test 10: No StudentCharge modification');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	const originalChargeStatus = charge.status;
	const originalChargePaidAmount = charge.paidAmount;

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Get integrated report
	await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

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

	console.log('✅ Test 10 passed');
}

// Test 11: No FinancialBlock modification
async function testNoFinancialBlockModification() {
	console.log('\n📋 Test 11: No FinancialBlock modification');
	
	const student = await createTestStudent();
	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charge
	const charge = await createTestStudentCharge(student.id, concept.id, academicTerm.id, new Decimal(10000), new Date('2024-01-01'));

	// Create a financial block
	const block = await prisma.financialBlock.create({
		data: {
			studentId: student.id,
			blockType: 'ALL',
			blockReason: 'Test block',
			isActive: true,
			blockedBy: 'test-user',
			blockedByName: 'Test User',
			debtAmount: new Decimal(10000)
		}
	});

	const originalBlockIsActive = block.isActive;
	const originalBlockReason = block.blockReason;

	// Create ACTIVE agreement
	const agreement = await createTestAgreement(student.id, [charge.id], [
		{
			installmentNumber: 1,
			dueDate: new Date('2027-01-01'),
			amount: new Decimal(10000)
		}
	], 'ACTIVE');

	// Get integrated report
	await paymentAgreementService.getStudentIntegratedDebtReport(student.id);

	// Verify FinancialBlock was not modified
	const updatedBlock = await prisma.financialBlock.findUnique({
		where: { id: block.id }
	});

	if (updatedBlock?.isActive === originalBlockIsActive) {
		console.log('✅ FinancialBlock isActive was not modified');
	} else {
		throw new Error('FinancialBlock isActive should not be modified');
	}

	if (updatedBlock?.blockReason === originalBlockReason) {
		console.log('✅ FinancialBlock blockReason was not modified');
	} else {
		throw new Error('FinancialBlock blockReason should not be modified');
	}

	console.log('✅ Test 11 passed');
}

// Main test runner
async function runTests() {
	console.log('🚀 Starting Payment Agreement Integrated Reports Tests');
	console.log('=========================================================');

	let passedTests = 0;
	let failedTests = 0;

	const tests = [
		{ name: 'Student without agreement appears with normal original debt', fn: testStudentWithoutAgreement },
		{ name: 'DRAFT agreement does not exclude original debt', fn: testDraftAgreementNoExclusion },
		{ name: 'CANCELLED agreement does not exclude original debt', fn: testCancelledAgreementNoExclusion },
		{ name: 'ACTIVE agreement excludes original debt covered', fn: testActiveAgreementExcludesCoveredDebt },
		{ name: 'ACTIVE agreement adds installment pending debt', fn: testActiveAgreementAddsInstallmentDebt },
		{ name: 'COMPLETED agreement does not add pending debt', fn: testCompletedAgreementNoPendingDebt },
		{ name: 'DEFAULTED agreement appears as defaulted debt', fn: testDefaultedAgreementAppearsAsDefaulted },
		{ name: 'Uncovered charges remain as enforceable debt', fn: testUncoveredChargesRemainEnforceable },
		{ name: 'Total effective debt does not duplicate', fn: testNoDebtDuplication },
		{ name: 'Aggregated reports sum correctly', fn: testAggregatedReportsSumCorrectly },
		{ name: 'No StudentCharge modification', fn: testNoStudentChargeModification },
		{ name: 'No FinancialBlock modification', fn: testNoFinancialBlockModification }
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
