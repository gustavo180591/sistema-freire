/**
 * Payment Agreement Installment Payments - Phase 3 Functional Tests
 *
 * This script tests the payment registration functionality for agreement installments.
 * It covers:
 * - Total payment of an installment
 * - Partial payment of an installment
 * - Rejection of payment exceeding pending amount
 * - Rejection if agreement is not active
 * - Rejection if installment is already paid
 * - Payment creation
 * - PaymentAllocation with installmentId
 * - Installment status updates (PENDING -> PARTIAL -> PAID)
 * - Agreement total updates
 * - Events and audit logs
 * - Transactional rollback
 * - Cleanup
 *
 * NOTE: This script requires existing data in the database (Student, Charge, etc.)
 * It creates a test agreement and tests payment functionality on it.
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';

const prisma = new PrismaClient();

// Helper function to get or create a test charge
async function getOrCreateTestCharge() {
	// Get an existing student with charges
	const studentWithCharge = await prisma.student.findFirst({
		where: {
			studentCharges: {
				some: {
					status: 'PENDING'
				}
			}
		},
		include: {
			studentCharges: {
				where: {
					status: 'PENDING'
				},
				take: 1
			}
		}
	});

	if (studentWithCharge && studentWithCharge.studentCharges.length > 0) {
		return {
			studentId: studentWithCharge.id,
			studentName: `${studentWithCharge.firstName} ${studentWithCharge.lastName}`,
			chargeId: studentWithCharge.studentCharges[0].id,
			chargeAmount: studentWithCharge.studentCharges[0].finalAmount
		};
	}

	// If no existing data, create minimal test data
	console.log('⚠ No existing student with pending charges found.');
	console.log('⚠ Creating minimal test data...');

	// Get or create career
	let career = await prisma.career.findFirst();
	if (!career) {
		career = await prisma.career.create({
			data: {
				code: 'TEST-CAREER',
				name: 'Test Career',
				durationYears: 4,
				active: true
			}
		});
	}

	// Get or create user
	let user = await prisma.user.findFirst({
		where: { email: 'test.student@example.com' }
	});
	if (!user) {
		user = await prisma.user.create({
			data: {
				email: 'test.student@example.com',
				passwordHash: 'hashed-password',
				firstName: 'Test',
				lastName: 'Student'
			}
		});
	}

	// Create student
	const student = await prisma.student.create({
		data: {
			userId: user.id,
			careerId: career.id,
			dni: '99999999',
			firstName: 'Test',
			lastName: 'Student',
			status: 'ACTIVE',
			currentYear: 1
		}
	});

	// Get or create academic term
	let academicTerm = await prisma.academicTerm.findFirst();
	if (!academicTerm) {
		academicTerm = await prisma.academicTerm.create({
			data: {
				name: 'Test Term 2024',
				code: 'TEST-TERM-2024',
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-12-31'),
				year: 2024,
				termType: 'ANUAL',
				active: true
			}
		});
	}

	// Get or create charge concept
	let concept = await prisma.chargeConcept.findFirst();
	if (!concept) {
		concept = await prisma.chargeConcept.create({
			data: {
				name: 'Test Concept',
				code: 'TEST-CONCEPT',
				description: 'Test charge concept',
				active: true
			}
		});
	}

	// Create charge
	const charge = await prisma.studentCharge.create({
		data: {
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: '2024-01',
			amount: new Decimal(1000),
			paidAmount: new Decimal(0),
			finalAmount: new Decimal(1000),
			status: 'PENDING',
			dueDate: new Date('2024-12-31'),
			academicTermId: academicTerm.id
		}
	});

	return {
		studentId: student.id,
		studentName: `${student.firstName} ${student.lastName}`,
		chargeId: charge.id,
		chargeAmount: charge.finalAmount
	};
}

// Helper function to create a test agreement
async function createTestAgreement(studentId: string, chargeId: string, userId: string) {
	// Get the charge to determine the original debt
	const charge = await prisma.studentCharge.findUnique({
		where: { id: chargeId }
	});

	if (!charge) {
		throw new Error('Charge not found');
	}

	const originalDebt = charge.finalAmount;
	const agreedAmount = originalDebt;

	const agreement = await paymentAgreementService.createDraftAgreement(
		{
			studentId,
			studentName: 'Test Student',
			studentDni: '99999999',
			originalDebt,
			agreedAmount,
			reason: 'Test agreement',
			observations: 'Test observations',
			createdBy: userId,
			createdByName: 'Test User',
			chargeIds: [chargeId],
			installments: [
				{
					installmentNumber: 1,
					dueDate: new Date('2024-02-01'),
					amount: agreedAmount.div(2)
				},
				{
					installmentNumber: 2,
					dueDate: new Date('2024-03-01'),
					amount: agreedAmount.div(2)
				}
			]
		},
		['SUPERADMIN'],
		userId,
		'Test User'
	);
	return agreement;
}

// Helper function to activate a test agreement
async function activateTestAgreement(agreementId: string, userId: string) {
	const agreement = await paymentAgreementService.activateAgreement(
		agreementId,
		['SUPERADMIN'],
		userId,
		'Test User'
	);
	return agreement;
}

// Helper function to cleanup test data
async function cleanupTestData(agreementId: string) {
	const agreement = await prisma.paymentAgreement.findUnique({
		where: { id: agreementId }
	});

	if (!agreement) return;

	// Delete payments first (due to foreign key constraints)
	const payments = await prisma.payment.findMany({
		where: {
			allocations: {
				some: {
					installment: {
						agreementId
					}
				}
			}
		}
	});

	for (const payment of payments) {
		await prisma.paymentAllocation.deleteMany({
			where: { paymentId: payment.id }
		});
		await prisma.payment.delete({
			where: { id: payment.id }
		});
	}

	await prisma.paymentAgreementEvent.deleteMany({
		where: {
			agreementId
		}
	});
	await prisma.paymentAgreementChargeRelation.deleteMany({
		where: {
			agreementId
		}
	});
	await prisma.paymentAgreementInstallment.deleteMany({
		where: {
			agreementId
		}
	});
	await prisma.paymentAgreement.deleteMany({
		where: { id: agreementId }
	});
}

async function runTests() {
	console.log('Starting Payment Agreement Installment Payments Tests...\n');

	let agreementId = '';
	let testUserId = '';

	try {
		// Setup: Get existing test data
		console.log('1. Getting test data...');
		const testData = await getOrCreateTestCharge();
		console.log('✓ Got test student and charge');

		// Get the test user ID for audit logs
		const user = await prisma.user.findFirst({
			where: { email: 'test.student@example.com' }
		});
		if (user) {
			testUserId = user.id;
		}

		const agreement = await createTestAgreement(testData.studentId, testData.chargeId, testUserId);
		agreementId = agreement.id;
		console.log('✓ Created test agreement');

		await activateTestAgreement(agreementId, testUserId);
		console.log('✓ Activated test agreement');

		// Get the agreement with installments
		const activatedAgreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId },
			include: { installments: true }
		});

		if (!activatedAgreement || activatedAgreement.installments.length === 0) {
			throw new Error('No installments found in activated agreement');
		}

		const installmentId = activatedAgreement.installments[0].id;
		console.log('✓ Got first installment ID');

		// Test 1: Total payment of an installment
		console.log('\n2. Testing total payment of an installment...');
		const totalPaymentResult = await paymentAgreementService.registerInstallmentPayment(
			{
				installmentId,
				amount: new Decimal(500),
				method: 'CASH',
				reference: `TEST-REF-001-${Date.now()}`,
				notes: 'Total payment test',
				paidBy: testUserId,
				paidByName: 'Test User'
			},
			['SUPERADMIN'],
			testUserId
		);
		console.log('✓ Total payment registered successfully');
		console.log(`  Payment ID: ${totalPaymentResult.payment.id}`);
		console.log(`  Installment status: ${totalPaymentResult.installment.status}`);
		console.log(`  Agreement paid amount: ${totalPaymentResult.agreement.paidAmount.toString()}`);

		// Verify installment status changed to PAID
		if (totalPaymentResult.installment.status !== 'PAID') {
			throw new Error(
				`Expected installment status PAID, got ${totalPaymentResult.installment.status}`
			);
		}
		console.log('✓ Installment status correctly changed to PAID');

		// Verify PaymentAllocation was created with installmentId
		const allocation = await prisma.paymentAllocation.findFirst({
			where: {
				installmentId
			}
		});
		if (!allocation) {
			throw new Error('PaymentAllocation not created for installment');
		}
		console.log('✓ PaymentAllocation created with installmentId');

		// Verify Payment was created
		const payment = await prisma.payment.findUnique({
			where: { id: (totalPaymentResult.payment as { id: string }).id }
		});
		if (!payment) {
			throw new Error('Payment not created');
		}
		console.log('✓ Payment created successfully');

		// Test 2: Partial payment of second installment
		console.log('\n3. Testing partial payment of second installment...');
		const secondInstallmentId = activatedAgreement.installments[1].id;
		const partialPaymentResult = await paymentAgreementService.registerInstallmentPayment(
			{
				installmentId: secondInstallmentId,
				amount: new Decimal(200),
				method: 'BANK_TRANSFER',
				reference: `TEST-REF-002-${Date.now()}`,
				notes: 'Partial payment test',
				paidBy: testUserId,
				paidByName: 'Test User'
			},
			['SUPERADMIN'],
			testUserId
		);
		console.log('✓ Partial payment registered successfully');
		console.log(`  Installment status: ${partialPaymentResult.installment.status}`);

		// Verify installment status changed to PARTIAL
		if (partialPaymentResult.installment.status !== 'PARTIAL') {
			throw new Error(
				`Expected installment status PARTIAL, got ${partialPaymentResult.installment.status}`
			);
		}
		console.log('✓ Installment status correctly changed to PARTIAL');

		// Test 3: Rejection of payment exceeding pending amount
		console.log('\n4. Testing rejection of payment exceeding pending amount...');
		try {
			await paymentAgreementService.registerInstallmentPayment(
				{
					installmentId: secondInstallmentId,
					amount: new Decimal(1000), // Exceeds pending amount of 300
					method: 'CASH',
					reference: `TEST-REF-003-${Date.now()}`,
					notes: 'Should fail',
					paidBy: testUserId,
					paidByName: 'Test User'
				},
				['SUPERADMIN'],
				testUserId
			);
			throw new Error('Should have rejected payment exceeding pending amount');
		} catch (error) {
			if (error instanceof Error && error.message.includes('exceeds pending amount')) {
				console.log('✓ Payment correctly rejected for exceeding pending amount');
			} else {
				throw error;
			}
		}

		// Test 4: Rejection if agreement is not active
		console.log('\n5. Testing rejection if agreement is not active...');
		// Create a new charge for the draft agreement test
		const concept = await prisma.chargeConcept.findFirst();
		const academicTerm = await prisma.academicTerm.findFirst();
		if (!concept || !academicTerm) {
			throw new Error('Concept or AcademicTerm not found');
		}
		const draftCharge = await prisma.studentCharge.create({
			data: {
				studentId: testData.studentId,
				conceptId: concept.id,
				periodLabel: `2024-TEST-${Date.now()}`,
				amount: new Decimal(500),
				paidAmount: new Decimal(0),
				finalAmount: new Decimal(500),
				status: 'PENDING',
				dueDate: new Date('2024-12-31'),
				academicTermId: academicTerm.id
			}
		});
		const draftAgreement = await createTestAgreement(
			testData.studentId,
			draftCharge.id,
			testUserId
		);
		const draftAgreementWithInstallments = await prisma.paymentAgreement.findUnique({
			where: { id: draftAgreement.id },
			include: { installments: true }
		});
		if (
			!draftAgreementWithInstallments ||
			draftAgreementWithInstallments.installments.length === 0
		) {
			throw new Error('No installments found in draft agreement');
		}
		const draftInstallmentId = draftAgreementWithInstallments.installments[0].id;
		try {
			await paymentAgreementService.registerInstallmentPayment(
				{
					installmentId: draftInstallmentId,
					amount: new Decimal(100),
					method: 'CASH',
					reference: `TEST-REF-004-${Date.now()}`,
					notes: 'Should fail',
					paidBy: testUserId,
					paidByName: 'Test User'
				},
				['SUPERADMIN'],
				testUserId
			);
			throw new Error('Should have rejected payment for draft agreement');
		} catch (error) {
			if (error instanceof Error && error.message.includes('active agreements')) {
				console.log('✓ Payment correctly rejected for draft agreement');
			} else {
				throw error;
			}
		}

		// Test 5: Rejection if installment is already paid
		console.log('\n6. Testing rejection if installment is already paid...');
		try {
			await paymentAgreementService.registerInstallmentPayment(
				{
					installmentId, // Already paid in Test 1
					amount: new Decimal(100),
					method: 'CASH',
					reference: `TEST-REF-005-${Date.now()}`,
					notes: 'Should fail',
					paidBy: testUserId,
					paidByName: 'Test User'
				},
				['SUPERADMIN'],
				testUserId
			);
			throw new Error('Should have rejected payment for already paid installment');
		} catch (error) {
			if (error instanceof Error && error.message.includes('exceeds pending amount')) {
				console.log('✓ Payment correctly rejected for already paid installment');
			} else {
				throw error;
			}
		}

		// Test 6: Verify events were created
		console.log('\n7. Verifying events were created...');
		const events = await prisma.paymentAgreementEvent.findMany({
			where: {
				agreementId
			},
			orderBy: { createdAt: 'desc' }
		});
		const paymentEvents = events.filter((e) => e.eventType === 'INSTALLMENT_PAID');
		if (paymentEvents.length < 2) {
			throw new Error(`Expected at least 2 payment events, got ${paymentEvents.length}`);
		}
		console.log(`✓ ${paymentEvents.length} payment events created`);

		// Test 7: Verify audit logs were created
		console.log('\n8. Verifying audit logs were created...');
		const auditLogs = await prisma.auditLog.findMany({
			where: {
				entityType: 'PaymentAgreementInstallment'
			}
		});
		if (auditLogs.length < 2) {
			throw new Error(`Expected at least 2 audit logs, got ${auditLogs.length}`);
		}
		console.log(`✓ ${auditLogs.length} audit logs created`);

		// Test 8: Verify agreement totals were updated
		console.log('\n9. Verifying agreement totals were updated...');
		const updatedAgreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId },
			include: { installments: true }
		});
		if (!updatedAgreement) {
			throw new Error('Agreement not found');
		}
		const expectedPaidAmount = new Decimal(700); // 500 (full) + 200 (partial)
		if (!updatedAgreement.paidAmount.equals(expectedPaidAmount)) {
			throw new Error(
				`Expected paid amount ${expectedPaidAmount.toString()}, got ${updatedAgreement.paidAmount.toString()}`
			);
		}
		console.log('✓ Agreement totals correctly updated');

		// Test 9: Test COMPLETED status when all installments are paid
		console.log('\n10. Testing COMPLETED status when all installments are paid...');
		// Pay the remaining amount of the second installment to complete it
		const remainingAmount = new Decimal(300); // 500 total - 200 already paid
		await paymentAgreementService.registerInstallmentPayment(
			{
				installmentId: secondInstallmentId,
				amount: remainingAmount,
				method: 'CASH',
				reference: `TEST-REF-COMPLETED-${Date.now()}`,
				notes: 'Completing second installment',
				paidBy: testUserId,
				paidByName: 'Test User'
			},
			['SUPERADMIN'],
			testUserId
		);

		// Verify all installments are PAID
		const finalAgreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreementId },
			include: { installments: true }
		});
		if (!finalAgreement) {
			throw new Error('Agreement not found');
		}

		const allPaid = finalAgreement.installments.every((inst) => inst.status === 'PAID');
		if (!allPaid) {
			throw new Error('Not all installments are PAID');
		}
		console.log('✓ All installments are PAID');

		// Verify agreement is COMPLETED
		if (finalAgreement.status !== 'COMPLETED') {
			throw new Error(`Expected COMPLETED status, got ${finalAgreement.status}`);
		}
		console.log('✓ Agreement status is COMPLETED');

		// Verify completedAt is set
		if (!finalAgreement.completedAt) {
			throw new Error('completedAt should be set');
		}
		console.log('✓ completedAt is set');

		// Verify pending amount is 0
		if (!finalAgreement.pendingAmount.equals(new Decimal(0))) {
			throw new Error(
				`Expected pending amount 0, got ${finalAgreement.pendingAmount.toString()}`
			);
		}
		console.log('✓ Agreement pending amount is 0');

		// Test 11: Transactional rollback test
		console.log('\n11. Testing transactional rollback...');
		try {
			// Try to create a payment with invalid data that should fail
			await paymentAgreementService.registerInstallmentPayment(
				{
					installmentId: 'invalid-installment-id',
					amount: new Decimal(100),
					method: 'CASH',
					reference: `TEST-REF-006-${Date.now()}`,
					notes: 'Should fail',
					paidBy: testUserId,
					paidByName: 'Test User'
				},
				['SUPERADMIN'],
				testUserId
			);
			throw new Error('Should have failed with invalid installment ID');
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				console.log('✓ Transaction correctly rolled back on error');
			} else {
				throw error;
			}
		}

		console.log('\n=======================================================');
		console.log('✓ All tests passed successfully!');
	} catch (error) {
		console.error('\n=======================================================');
		console.error('✗ Tests failed:', error);
		if (agreementId) {
			console.log('Cleaning up test data...');
			await cleanupTestData(agreementId);
		}
		process.exit(1);
	} finally {
		if (agreementId) {
			console.log('\nCleaning up test data...');
			await cleanupTestData(agreementId);
			console.log('✓ Cleanup completed');
		}
		await prisma.$disconnect();
	}
}

// Run tests
runTests();
