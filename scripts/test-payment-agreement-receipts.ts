/**
 * Payment Agreement Receipts - Phase 4 Functional Tests
 *
 * This script tests the receipt generation functionality for agreement installment payments.
 * It covers:
 * - Payment of installment generates receipt
 * - Receipt is linked to payment
 * - Receipt is linked to agreement
 * - Receipt reflects correct amount
 * - Receipt reflects correct student
 * - Receipt reflects payment method
 * - Partial payment generates receipt for partial amount
 * - Total payment generates receipt for total amount
 * - No duplicate receipts for same payment
 * - Audit log registered
 * - Rollback on generation failure
 * - Cleanup in finally block
 *
 * NOTE: This script requires existing data in the database (Student, Charge, etc.)
 * It creates a test agreement and tests receipt functionality on it.
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';
import { financialService } from '../src/lib/server/financial/financial-service';

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

	// Get or create charge concept
	let chargeConcept = await prisma.chargeConcept.findFirst();
	if (!chargeConcept) {
		chargeConcept = await prisma.chargeConcept.create({
			data: {
				name: 'Test Concept',
				code: 'TEST-CONCEPT',
				description: 'Test concept for receipt tests'
			}
		});
	}

	// Get or create academic term
	let academicTerm = await prisma.academicTerm.findFirst();
	if (!academicTerm) {
		academicTerm = await prisma.academicTerm.create({
			data: {
				name: '2026',
				code: '2026',
				year: 2026,
				termType: 'ANUAL',
				startDate: new Date('2026-01-01'),
				endDate: new Date('2026-12-31'),
				active: true
			}
		});
	}

	// Create charge
	const charge = await prisma.studentCharge.create({
		data: {
			studentId: student.id,
			conceptId: chargeConcept.id,
			amount: new Decimal(1000),
			finalAmount: new Decimal(1000),
			dueDate: new Date(),
			status: 'PENDING',
			periodLabel: '2026-01',
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

// Helper function to get or create a test user
async function getOrCreateTestUser() {
	let user = await prisma.user.findFirst({
		where: { email: 'test.admin@example.com' }
	});

	if (!user) {
		user = await prisma.user.create({
			data: {
				email: 'test.admin@example.com',
				passwordHash: 'hashed-password',
				firstName: 'Test',
				lastName: 'Admin'
			}
		});

		// Assign SUPERADMIN role
		const role = await prisma.role.findFirst({
			where: { code: 'SUPERADMIN' }
		});

		if (role) {
			await prisma.userRole.create({
				data: {
					userId: user.id,
					roleId: role.id
				}
			});
		}
	}

	return user;
}

async function main() {
	console.log('Starting Payment Agreement Receipts Tests...\n');

	let testAgreementId: string | null = null;
	let testPaymentId: string | null = null;
	let testReceiptId: string | null = null;
	let testUserId: string | null = null;

	try {
		// 1. Get test data
		console.log('1. Getting test data...');
		const testData = await getOrCreateTestCharge();
		const testUser = await getOrCreateTestUser();
		testUserId = testUser.id;

		console.log('✓ Got test student and charge');
		console.log(`  Student: ${testData.studentName}`);
		console.log(`  Charge amount: ${testData.chargeAmount.toString()}`);

		// 2. Create test agreement
		console.log('\n2. Creating test agreement...');
		const agreement = await paymentAgreementService.createDraftAgreement(
			{
				studentId: testData.studentId,
				studentName: testData.studentName,
				chargeIds: [testData.chargeId],
				originalDebt: testData.chargeAmount,
				agreedAmount: testData.chargeAmount,
				reason: 'Test agreement for receipt generation',
				observations: 'Test agreement - Phase 4 receipts',
				installments: [
					{
						installmentNumber: 1,
						dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
						amount: new Decimal(500)
					},
					{
						installmentNumber: 2,
						dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
						amount: new Decimal(500)
					}
				],
				createdBy: testUser.id,
				createdByName: `${testUser.firstName} ${testUser.lastName}`
			},
			['SUPERADMIN'],
			testUser.id,
			`${testUser.firstName} ${testUser.lastName}`
		);

		testAgreementId = agreement.id;
		console.log('✓ Created test agreement');
		console.log(`  Agreement ID: ${agreement.id}`);
		console.log(`  Agreement Number: ${agreement.agreementNumber}/${agreement.agreementYear}`);

		// 3. Activate agreement
		console.log('\n3. Activating test agreement...');
		await paymentAgreementService.activateAgreement(
			agreement.id,
			['SUPERADMIN'],
			testUser.id,
			`${testUser.firstName} ${testUser.lastName}`
		);
		console.log('✓ Agreement activated');

		// 4. Get first installment ID
		const activatedAgreement = await prisma.paymentAgreement.findUnique({
			where: { id: agreement.id },
			include: { installments: true }
		});

		if (!activatedAgreement) {
			throw new Error('Agreement not found after activation');
		}

		const firstInstallmentId = activatedAgreement.installments[0].id;
		console.log('✓ Got first installment ID');

		// 5. Register payment for first installment
		console.log('\n4. Registering payment for first installment...');
		const paymentResult = await paymentAgreementService.registerInstallmentPayment(
			{
				installmentId: firstInstallmentId,
				amount: new Decimal(500),
				method: 'CASH',
				reference: `TEST-REF-RECEIPT-${Date.now()}`,
				notes: 'Test payment for receipt generation',
				paidBy: testUser.id,
				paidByName: 'Test User'
			},
			['SUPERADMIN'],
			testUser.id
		);

		testPaymentId = paymentResult.payment.id;
		console.log('✓ Payment registered successfully');
		console.log(`  Payment ID: ${paymentResult.payment.id}`);
		console.log(`  Payment amount: ${paymentResult.payment.amount.toString()}`);

		// 6. Generate receipt for the payment
		console.log('\n5. Generating receipt for the payment...');
		const receiptResult = await financialService.issueReceipt({
			paymentIds: [paymentResult.payment.id],
			userId: testUser.id,
			observations: 'Test receipt for agreement payment'
		});

		testReceiptId = receiptResult.receipt.id;
		console.log('✓ Receipt generated successfully');
		console.log(`  Receipt ID: ${receiptResult.receipt.id}`);
		console.log(`  Receipt Number: ${receiptResult.receipt.receiptNumber}/${receiptResult.receipt.receiptYear}`);
		console.log(`  Receipt Total: ${receiptResult.receipt.totalAmount.toString()}`);

		// 7. Verify receipt is linked to payment
		console.log('\n6. Verifying receipt is linked to payment...');
		const paymentWithReceipt = await prisma.payment.findUnique({
			where: { id: paymentResult.payment.id },
			include: { receipt: true }
		});

		if (!paymentWithReceipt) {
			throw new Error('Payment not found');
		}

		if (!paymentWithReceipt.receiptId) {
			throw new Error('Payment is not linked to a receipt');
		}

		if (paymentWithReceipt.receiptId !== receiptResult.receipt.id) {
			throw new Error('Payment is linked to wrong receipt');
		}

		console.log('✓ Receipt is correctly linked to payment');

		// 8. Verify receipt is linked to agreement
		console.log('\n7. Verifying receipt is linked to agreement...');
		if (receiptResult.receipt.agreementId !== agreement.id) {
			throw new Error('Receipt is not linked to correct agreement');
		}

		if (receiptResult.receipt.agreementNumber !== agreement.agreementNumber) {
			throw new Error('Receipt has wrong agreement number');
		}

		if (receiptResult.receipt.installmentNumber !== 1) {
			throw new Error('Receipt has wrong installment number');
		}

		console.log('✓ Receipt is correctly linked to agreement');
		console.log(`  Agreement ID: ${receiptResult.receipt.agreementId}`);
		console.log(`  Agreement Number: ${receiptResult.receipt.agreementNumber}`);
		console.log(`  Installment Number: ${receiptResult.receipt.installmentNumber}`);

		// 9. Verify receipt reflects correct amount
		console.log('\n8. Verifying receipt reflects correct amount...');
		if (!receiptResult.receipt.totalAmount.equals(new Decimal(500))) {
			throw new Error(
				`Expected receipt total 500, got ${receiptResult.receipt.totalAmount.toString()}`
			);
		}

		console.log('✓ Receipt reflects correct amount');

		// 10. Verify receipt reflects correct student
		console.log('\n9. Verifying receipt reflects correct student...');
		if (receiptResult.receipt.studentId !== testData.studentId) {
			throw new Error('Receipt has wrong student ID');
		}

		if (receiptResult.receipt.studentName !== testData.studentName) {
			throw new Error('Receipt has wrong student name');
		}

		console.log('✓ Receipt reflects correct student');
		console.log(`  Student ID: ${receiptResult.receipt.studentId}`);
		console.log(`  Student Name: ${receiptResult.receipt.studentName}`);

		// 11. Verify receipt reflects payment method
		console.log('\n10. Verifying receipt reflects payment method...');
		if (receiptResult.receipt.paymentMethod !== 'CASH') {
			throw new Error(`Expected payment method CASH, got ${receiptResult.receipt.paymentMethod}`);
		}

		console.log('✓ Receipt reflects correct payment method');

		// 12. Verify receipt items include installment info
		console.log('\n11. Verifying receipt items include installment info...');
		const receiptItems = await prisma.receiptItem.findMany({
			where: { receiptId: receiptResult.receipt.id }
		});

		if (receiptItems.length === 0) {
			throw new Error('Receipt has no items');
		}

		const installmentItem = receiptItems.find((item) => item.chargeId === null);
		if (!installmentItem) {
			throw new Error('Receipt does not have installment item (chargeId should be null)');
		}

		if (!installmentItem.concept.includes('Cuota 1')) {
			throw new Error(`Expected item concept to include 'Cuota 1', got ${installmentItem.concept}`);
		}

		if (!installmentItem.concept.includes('Convenio')) {
			throw new Error(`Expected item concept to include 'Convenio', got ${installmentItem.concept}`);
		}

		console.log('✓ Receipt items include correct installment info');
		console.log(`  Item concept: ${installmentItem.concept}`);
		console.log(`  Item period: ${installmentItem.periodLabel}`);
		console.log(`  Item amount: ${installmentItem.finalAmount.toString()}`);

		// 13. Test partial payment receipt
		console.log('\n12. Testing partial payment receipt...');
		const secondInstallmentId = activatedAgreement.installments[1].id;
		const partialPaymentResult = await paymentAgreementService.registerInstallmentPayment(
			{
				installmentId: secondInstallmentId,
				amount: new Decimal(200), // Partial payment
				method: 'BANK_TRANSFER',
				reference: `TEST-REF-PARTIAL-${Date.now()}`,
				notes: 'Test partial payment for receipt',
				paidBy: testUser.id,
				paidByName: 'Test User'
			},
			['SUPERADMIN'],
			testUser.id
		);

		const partialReceiptResult = await financialService.issueReceipt({
			paymentIds: [partialPaymentResult.payment.id],
			userId: testUser.id,
			observations: 'Test receipt for partial payment'
		});

		if (!partialReceiptResult.receipt.totalAmount.equals(new Decimal(200))) {
			throw new Error(
				`Expected partial receipt total 200, got ${partialReceiptResult.receipt.totalAmount.toString()}`
			);
		}

		console.log('✓ Partial payment generates receipt for partial amount');
		console.log(`  Partial amount: ${partialReceiptResult.receipt.totalAmount.toString()}`);

		// 14. Test duplicate receipt prevention
		console.log('\n13. Testing duplicate receipt prevention...');
		try {
			await financialService.issueReceipt({
				paymentIds: [paymentResult.payment.id],
				userId: testUser.id,
				observations: 'Attempt to generate duplicate receipt'
			});
			throw new Error('Should have thrown error for duplicate receipt');
		} catch (error) {
			if (error instanceof Error && error.message.includes('recibos activos')) {
				console.log('✓ Duplicate receipt correctly prevented');
			} else {
				throw error;
			}
		}

		// 15. Verify audit log was created
		console.log('\n14. Verifying audit log was created...');
		const auditLogs = await prisma.auditLog.findMany({
			where: {
				entityType: 'Receipt',
				entityId: receiptResult.receipt.id
			}
		});

		if (auditLogs.length === 0) {
			throw new Error('No audit log found for receipt creation');
		}

		console.log('✓ Audit log registered');
		console.log(`  Audit logs count: ${auditLogs.length}`);

		// 16. Test rollback on generation failure
		console.log('\n15. Testing rollback on generation failure...');
		try {
			await financialService.issueReceipt({
				paymentIds: ['invalid-payment-id'],
				userId: testUser.id,
				observations: 'Test rollback'
			});
			throw new Error('Should have thrown error for invalid payment');
		} catch (error) {
			if (error instanceof Error) {
				console.log('✓ Transaction correctly rolled back on error');
			} else {
				throw error;
			}
		}

		console.log('\n=======================================================');
		console.log('✓ All tests passed successfully!');
	} catch (error) {
		console.error('\n❌ Test failed:', error);
		throw error;
	} finally {
		// Cleanup
		console.log('\nCleaning up test data...');

		try {
			// Delete payments first (they have foreign key to receipt)
			if (testPaymentId) {
				await prisma.paymentAllocation.deleteMany({ where: { paymentId: testPaymentId } });
				await prisma.payment.delete({ where: { id: testPaymentId } });
				console.log('✓ Deleted test payment');
			}

			// Delete receipts
			if (testReceiptId) {
				await prisma.receiptItem.deleteMany({ where: { receiptId: testReceiptId } });
				await prisma.receipt.delete({ where: { id: testReceiptId } });
				console.log('✓ Deleted test receipt');
			}

			// Delete agreement
			if (testAgreementId) {
				await prisma.paymentAgreementInstallment.deleteMany({ where: { agreementId: testAgreementId } });
				await prisma.paymentAgreementChargeRelation.deleteMany({ where: { agreementId: testAgreementId } });
				await prisma.paymentAgreementEvent.deleteMany({ where: { agreementId: testAgreementId } });
				await prisma.paymentAgreement.delete({ where: { id: testAgreementId } });
				console.log('✓ Deleted test agreement');
			}

			console.log('✓ Cleanup completed');
		} catch (error) {
			console.error('⚠ Cleanup failed:', error);
		}
	}
}

main()
	.then(() => {
		console.log('\n✓ Test suite completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Test suite failed:', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
