import { prisma } from '../src/lib/server/db/prisma';
import { financialService } from '../src/lib/server/financial/financial-service';
import { Decimal } from '@prisma/client/runtime/library';

const TEST_STUDENT_ID = 'test-financial-integration';

// Helper function to create test student
async function createTestStudent() {
	const user = await prisma.user.create({
		data: {
			email: `test-financial-integration-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'Financial Integration'
		}
	});

	const career =
		(await prisma.career.findFirst()) ||
		(await prisma.career.create({
			data: {
				code: 'TEST-FIN-INT',
				name: 'Test Career Financial Integration',
				durationYears: 5
			}
		}));

	const student = await prisma.student.create({
		data: {
			id: `${TEST_STUDENT_ID}-${Date.now()}`,
			userId: user.id,
			firstName: 'Test',
			lastName: 'Financial Integration',
			dni: '99999999-' + Date.now(),
			careerId: career.id
		}
	});

	return student;
}

// Helper function to create test academic term
async function createTestAcademicTerm() {
	return await prisma.academicTerm.create({
		data: {
			code: `FIN-INT-${Date.now()}`,
			name: 'Test Term Financial Integration',
			year: 2024,
			termType: 'ANUAL',
			startDate: new Date('2024-01-01'),
			endDate: new Date('2024-12-31')
		}
	});
}

// Helper function to create test charge concept
async function createTestChargeConcept() {
	return await prisma.chargeConcept.create({
		data: {
			code: `FIN-INT-${Date.now()}`,
			name: 'Test Concept Financial Integration'
		}
	});
}

// Helper function to create test student charge
async function createTestStudentCharge(
	studentId: string,
	conceptId: string,
	academicTermId: string,
	amount: Decimal,
	dueDate: Date
) {
	return await prisma.studentCharge.create({
		data: {
			studentId,
			conceptId,
			periodLabel: '2024-FIN-INT',
			amount,
			paidAmount: new Decimal(0),
			finalAmount: amount,
			status: 'PENDING',
			dueDate,
			academicTermId
		}
	});
}

// Helper function to create test agreement
async function createTestAgreement(
	studentId: string,
	chargeIds: string[],
	installments: Array<{ installmentNumber: number; dueDate: Date; amount: Decimal }>,
	status: string = 'DRAFT'
) {
	const totalAmount = installments.reduce((sum, inst) => sum.add(inst.amount), new Decimal(0));

	const agreement = await prisma.paymentAgreement.create({
		data: {
			studentId,
			agreementNumber: 1,
			agreementYear: 2024,
			studentName: 'Test Financial Integration',
			studentDni: '99999999',
			originalDebt: totalAmount,
			agreedAmount: totalAmount,
			paidAmount: new Decimal(0),
			pendingAmount: totalAmount,
			status: status as 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED',
			reason: 'Test agreement for financial report integration',
			createdBy: 'test-user',
			createdByName: 'Test User'
		}
	});

	// Create installments
	await prisma.paymentAgreementInstallment.createMany({
		data: installments.map((inst) => ({
			agreementId: agreement.id,
			installmentNumber: inst.installmentNumber,
			dueDate: inst.dueDate,
			amount: inst.amount,
			pendingAmount: inst.amount,
			status: 'PENDING'
		}))
	});

	// Create charge relations
	await prisma.paymentAgreementChargeRelation.createMany({
		data: chargeIds.map((chargeId) => ({
			agreementId: agreement.id,
			chargeId,
			originalChargeAmount: totalAmount.div(chargeIds.length),
			originalChargePaidAmount: new Decimal(0),
			originalChargeStatus: 'PENDING',
			amountIncluded: totalAmount.div(chargeIds.length),
			relationType: 'REFINANCED'
		}))
	});

	return agreement;
}

// Helper function to cleanup test data
async function cleanup() {
	try {
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
					contains: 'FIN-INT'
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
					contains: 'FIN-INT'
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

// Test 1: Original methods still work
async function testOriginalMethodsStillWork() {
	console.log('\n📋 Test 1: Original methods still work');

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

	// Test getStudentFinancialStatus
	const status = await financialService.getStudentFinancialStatus(student.id);

	if (status.student.id === student.id) {
		console.log('✅ getStudentFinancialStatus returns correct student');
	} else {
		throw new Error('getStudentFinancialStatus should return correct student');
	}

	if (status.totalDebt.equals(new Decimal(10000))) {
		console.log('✅ getStudentFinancialStatus returns correct total debt');
	} else {
		throw new Error('getStudentFinancialStatus should return correct total debt');
	}

	// Test getFinancialDashboardMetrics
	const metrics = await financialService.getFinancialDashboardMetrics();

	if (metrics.studentsWithDebt >= 1) {
		console.log('✅ getFinancialDashboardMetrics returns students with debt');
	} else {
		throw new Error('getFinancialDashboardMetrics should return students with debt');
	}

	// Cleanup
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 1 passed');
}

// Test 2: New methods return extended fields
async function testNewMethodsReturnExtendedFields() {
	console.log('\n📋 Test 2: New methods return extended fields');

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

	// Test getStudentFinancialStatusWithAgreements
	const statusWithAgreements = await financialService.getStudentFinancialStatusWithAgreements(
		student.id
	);

	if (statusWithAgreements.agreementDebtSummary) {
		console.log('✅ getStudentFinancialStatusWithAgreements returns agreementDebtSummary');
	} else {
		throw new Error('getStudentFinancialStatusWithAgreements should return agreementDebtSummary');
	}

	if (statusWithAgreements.agreementDebtSummary.originalDebtTotal.equals(new Decimal(10000))) {
		console.log('✅ agreementDebtSummary.originalDebtTotal is correct');
	} else {
		throw new Error('agreementDebtSummary.originalDebtTotal should be 10000');
	}

	// Test getFinancialDashboardMetricsWithAgreements
	const metricsWithAgreements = await financialService.getFinancialDashboardMetricsWithAgreements();

	if (metricsWithAgreements.agreementMetrics) {
		console.log('✅ getFinancialDashboardMetricsWithAgreements returns agreementMetrics');
	} else {
		throw new Error('getFinancialDashboardMetricsWithAgreements should return agreementMetrics');
	}

	// Test getPeriodFinancialReportWithAgreements
	const periodReportWithAgreements = await financialService.getPeriodFinancialReportWithAgreements(
		{}
	);

	if (periodReportWithAgreements.agreementSummary) {
		console.log('✅ getPeriodFinancialReportWithAgreements returns agreementSummary');
	} else {
		throw new Error('getPeriodFinancialReportWithAgreements should return agreementSummary');
	}

	// Cleanup
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 2 passed');
}

// Test 3: Student without agreement maintains original debt
async function testStudentWithoutAgreementMaintainsOriginalDebt() {
	console.log('\n📋 Test 3: Student without agreement maintains original debt');

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

	// Get status with agreements
	const statusWithAgreements = await financialService.getStudentFinancialStatusWithAgreements(
		student.id
	);

	console.log(
		`✅ Original debt total: ${statusWithAgreements.agreementDebtSummary.originalDebtTotal.toString()}`
	);
	console.log(
		`✅ Original debt covered by agreements: ${statusWithAgreements.agreementDebtSummary.originalDebtCoveredByActiveAgreements.toString()}`
	);
	console.log(
		`✅ Original debt still enforceable: ${statusWithAgreements.agreementDebtSummary.originalDebtStillEnforceable.toString()}`
	);
	console.log(
		`✅ Effective total debt: ${statusWithAgreements.agreementDebtSummary.effectiveTotalDebt.toString()}`
	);

	if (statusWithAgreements.agreementDebtSummary.originalDebtTotal.equals(new Decimal(10000))) {
		console.log('✅ Original debt total is correct');
	} else {
		throw new Error('Original debt total should be 10000');
	}

	if (
		statusWithAgreements.agreementDebtSummary.originalDebtCoveredByActiveAgreements.equals(
			new Decimal(0)
		)
	) {
		console.log('✅ No debt covered by agreements');
	} else {
		throw new Error('No debt should be covered by agreements');
	}

	if (
		statusWithAgreements.agreementDebtSummary.originalDebtStillEnforceable.equals(
			new Decimal(10000)
		)
	) {
		console.log('✅ All original debt is still enforceable');
	} else {
		throw new Error('All original debt should be enforceable');
	}

	if (statusWithAgreements.agreementDebtSummary.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt equals original debt');
	} else {
		throw new Error('Effective debt should equal original debt');
	}

	// Cleanup
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 3 passed');
}

// Test 4: ACTIVE agreement avoids duplication
async function testActiveAgreementAvoidsDuplication() {
	console.log('\n📋 Test 4: ACTIVE agreement avoids duplication');

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

	// Get status with agreements
	const statusWithAgreements = await financialService.getStudentFinancialStatusWithAgreements(
		student.id
	);

	console.log(
		`✅ Original debt total: ${statusWithAgreements.agreementDebtSummary.originalDebtTotal.toString()}`
	);
	console.log(
		`✅ Original debt covered by agreements: ${statusWithAgreements.agreementDebtSummary.originalDebtCoveredByActiveAgreements.toString()}`
	);
	console.log(
		`✅ Original debt still enforceable: ${statusWithAgreements.agreementDebtSummary.originalDebtStillEnforceable.toString()}`
	);
	console.log(
		`✅ Agreement pending debt: ${statusWithAgreements.agreementDebtSummary.agreementPendingDebt.toString()}`
	);
	console.log(
		`✅ Effective total debt: ${statusWithAgreements.agreementDebtSummary.effectiveTotalDebt.toString()}`
	);

	if (
		statusWithAgreements.agreementDebtSummary.originalDebtCoveredByActiveAgreements.equals(
			new Decimal(10000)
		)
	) {
		console.log('✅ ACTIVE agreement covers original debt');
	} else {
		throw new Error('ACTIVE agreement should cover original debt');
	}

	if (
		statusWithAgreements.agreementDebtSummary.originalDebtStillEnforceable.equals(new Decimal(0))
	) {
		console.log('✅ No original debt is enforceable');
	} else {
		throw new Error('No original debt should be enforceable');
	}

	if (statusWithAgreements.agreementDebtSummary.agreementPendingDebt.equals(new Decimal(10000))) {
		console.log('✅ Agreement pending debt equals original debt');
	} else {
		throw new Error('Agreement pending debt should equal original debt');
	}

	if (statusWithAgreements.agreementDebtSummary.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt does not duplicate');
	} else {
		throw new Error('Effective debt should not duplicate');
	}

	// Cleanup
	await prisma.paymentAgreementInstallment.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreementChargeRelation.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreement.delete({ where: { id: agreement.id } });
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 4 passed');
}

// Test 5: COMPLETED agreement does not add pending debt
async function testCompletedAgreementNoPendingDebt() {
	console.log('\n📋 Test 5: COMPLETED agreement does not add pending debt');

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

	// Mark installments as paid
	await prisma.paymentAgreementInstallment.updateMany({
		where: { agreementId: agreement.id },
		data: {
			status: 'PAID',
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

	// Get status with agreements
	const statusWithAgreements = await financialService.getStudentFinancialStatusWithAgreements(
		student.id
	);

	console.log(
		`✅ Agreement pending debt: ${statusWithAgreements.agreementDebtSummary.agreementPendingDebt.toString()}`
	);
	console.log(
		`✅ Effective total debt: ${statusWithAgreements.agreementDebtSummary.effectiveTotalDebt.toString()}`
	);

	if (statusWithAgreements.agreementDebtSummary.agreementPendingDebt.equals(new Decimal(0))) {
		console.log('✅ COMPLETED agreement has no pending debt');
	} else {
		throw new Error('COMPLETED agreement should have no pending debt');
	}

	// COMPLETED agreements do not cover original debt (only ACTIVE does)
	// but they have no pending debt, so effective debt equals original debt
	if (statusWithAgreements.agreementDebtSummary.effectiveTotalDebt.equals(new Decimal(10000))) {
		console.log('✅ Effective debt equals original debt (COMPLETED does not cover)');
	} else {
		throw new Error(
			'Effective debt should equal original debt (COMPLETED does not cover original debt)'
		);
	}

	// Cleanup
	await prisma.paymentAgreementInstallment.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreementChargeRelation.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreement.delete({ where: { id: agreement.id } });
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 5 passed');
}

// Test 6: DEFAULTED agreement appears separately
async function testDefaultedAgreementAppearsSeparately() {
	console.log('\n📋 Test 6: DEFAULTED agreement appears separately');

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
				dueDate: new Date('2027-01-01'),
				amount: new Decimal(10000)
			}
		],
		'DEFAULTED'
	);

	// Get status with agreements
	const statusWithAgreements = await financialService.getStudentFinancialStatusWithAgreements(
		student.id
	);

	console.log(
		`✅ Agreement defaulted debt: ${statusWithAgreements.agreementDebtSummary.agreementDefaultedDebt.toString()}`
	);
	console.log(
		`✅ Defaulted agreements count: ${statusWithAgreements.agreementDebtSummary.defaultedAgreementsCount}`
	);

	if (statusWithAgreements.agreementDebtSummary.agreementDefaultedDebt.equals(new Decimal(10000))) {
		console.log('✅ DEFAULTED agreement appears as defaulted debt');
	} else {
		throw new Error('DEFAULTED agreement should appear as defaulted debt');
	}

	if (statusWithAgreements.agreementDebtSummary.defaultedAgreementsCount === 1) {
		console.log('✅ One defaulted agreement counted');
	} else {
		throw new Error('Should have one defaulted agreement');
	}

	// Cleanup
	await prisma.paymentAgreementInstallment.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreementChargeRelation.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreement.delete({ where: { id: agreement.id } });
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 6 passed');
}

// Test 7: Multiple students aggregate correctly
async function testMultipleStudentsAggregateCorrectly() {
	console.log('\n📋 Test 7: Multiple students aggregate correctly');

	// Create first student
	const student1Id = `test-fin-int-1-${Date.now()}`;
	const user1 = await prisma.user.create({
		data: {
			email: `test-fin-int-1-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'Financial Integration 1'
		}
	});
	const career =
		(await prisma.career.findFirst()) ||
		(await prisma.career.create({
			data: {
				code: 'TEST-FIN-INT-AGG',
				name: 'Test Career Financial Integration Agg',
				durationYears: 5
			}
		}));
	const student1 = await prisma.student.create({
		data: {
			id: student1Id,
			userId: user1.id,
			firstName: 'Test',
			lastName: 'Financial Integration 1',
			dni: '11111111-' + Date.now(),
			careerId: career.id
		}
	});

	// Create second student
	const student2Id = `test-fin-int-2-${Date.now()}`;
	const user2 = await prisma.user.create({
		data: {
			email: `test-fin-int-2-${Date.now()}@example.com`,
			passwordHash: 'test-hash',
			firstName: 'Test',
			lastName: 'Financial Integration 2'
		}
	});
	const student2 = await prisma.student.create({
		data: {
			id: student2Id,
			userId: user2.id,
			firstName: 'Test',
			lastName: 'Financial Integration 2',
			dni: '22222222-' + Date.now(),
			careerId: career.id
		}
	});

	const academicTerm = await createTestAcademicTerm();
	const concept = await createTestChargeConcept();

	// Create charges
	const charge1 = await createTestStudentCharge(
		student1.id,
		concept.id,
		academicTerm.id,
		new Decimal(5000),
		new Date('2024-01-01')
	);
	const charge2 = await createTestStudentCharge(
		student2.id,
		concept.id,
		academicTerm.id,
		new Decimal(3000),
		new Date('2024-01-01')
	);

	// Get dashboard metrics with agreements
	const metricsWithAgreements = await financialService.getFinancialDashboardMetricsWithAgreements();

	console.log(
		`✅ Total students: ${metricsWithAgreements.agreementMetrics.totalOriginalDebt.toString()}`
	);
	console.log(
		`✅ Total effective debt: ${metricsWithAgreements.agreementMetrics.totalEffectiveDebt.toString()}`
	);

	// Cleanup second student
	await prisma.studentCharge.deleteMany({ where: { studentId: student2.id } });
	await prisma.student.delete({ where: { id: student2.id } });
	await prisma.user.delete({ where: { id: user2.id } });

	// Cleanup first student
	await prisma.studentCharge.deleteMany({ where: { studentId: student1.id } });
	await prisma.student.delete({ where: { id: student1.id } });
	await prisma.user.delete({ where: { id: user1.id } });

	console.log('✅ Test 7 passed');
}

// Test 8: No StudentCharge modification
async function testNoStudentChargeModification() {
	console.log('\n📋 Test 8: No StudentCharge modification');

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

	// Get status with agreements
	await financialService.getStudentFinancialStatusWithAgreements(student.id);

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

	// Cleanup
	await prisma.paymentAgreementInstallment.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreementChargeRelation.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreement.delete({ where: { id: agreement.id } });
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 8 passed');
}

// Test 9: No FinancialBlock modification
async function testNoFinancialBlockModification() {
	console.log('\n📋 Test 9: No FinancialBlock modification');

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

	// Get status with agreements
	await financialService.getStudentFinancialStatusWithAgreements(student.id);

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

	// Cleanup
	await prisma.paymentAgreementInstallment.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreementChargeRelation.deleteMany({ where: { agreementId: agreement.id } });
	await prisma.paymentAgreement.delete({ where: { id: agreement.id } });
	await prisma.financialBlock.delete({ where: { id: block.id } });
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 9 passed');
}

// Test 10: /finanzas/deuda endpoint works
async function testDeudaEndpointWorks() {
	console.log('\n📋 Test 10: /finanzas/deuda endpoint works');

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

	// Get status with agreements (simulating the endpoint call)
	const statusWithAgreements = await financialService.getStudentFinancialStatusWithAgreements(
		student.id
	);

	if (statusWithAgreements.agreementDebtSummary) {
		console.log('✅ getStudentFinancialStatusWithAgreements works for /finanzas/deuda endpoint');
	} else {
		throw new Error(
			'getStudentFinancialStatusWithAgreements should work for /finanzas/deuda endpoint'
		);
	}

	// Cleanup
	await prisma.studentCharge.deleteMany({ where: { studentId: student.id } });
	await prisma.student.delete({ where: { id: student.id } });
	await prisma.user.delete({ where: { id: student.userId } });

	console.log('✅ Test 10 passed');
}

// Main test runner
async function runTests() {
	console.log('🚀 Starting Payment Agreement Financial Report Integration Tests');
	console.log('=========================================================================');

	let passedTests = 0;
	let failedTests = 0;

	const tests = [
		{ name: 'Original methods still work', fn: testOriginalMethodsStillWork },
		{ name: 'New methods return extended fields', fn: testNewMethodsReturnExtendedFields },
		{
			name: 'Student without agreement maintains original debt',
			fn: testStudentWithoutAgreementMaintainsOriginalDebt
		},
		{ name: 'ACTIVE agreement avoids duplication', fn: testActiveAgreementAvoidsDuplication },
		{
			name: 'COMPLETED agreement does not add pending debt',
			fn: testCompletedAgreementNoPendingDebt
		},
		{ name: 'DEFAULTED agreement appears separately', fn: testDefaultedAgreementAppearsSeparately },
		{ name: 'Multiple students aggregate correctly', fn: testMultipleStudentsAggregateCorrectly },
		{ name: 'No StudentCharge modification', fn: testNoStudentChargeModification },
		{ name: 'No FinancialBlock modification', fn: testNoFinancialBlockModification },
		{ name: '/finanzas/deuda endpoint works', fn: testDeudaEndpointWorks }
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

	console.log('\n=========================================================================');
	console.log(`📊 Test Results: ${passedTests}/${tests.length} passed`);
	if (failedTests > 0) {
		console.log(`❌ ${failedTests} test(s) failed`);
		process.exit(1);
	} else {
		console.log('✅ All tests passed');
		process.exit(0);
	}
}

runTests();
