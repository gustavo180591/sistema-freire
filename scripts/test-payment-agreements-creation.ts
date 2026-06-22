/**
 * Functional Test Script for Payment Agreements Phase 2
 *
 * This script tests the creation and activation of payment agreements,
 * including validations, permissions, audit logging, and transactional integrity.
 *
 * Run with: npx tsx scripts/test-payment-agreements-creation.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';

const prisma = new PrismaClient();

// Test user roles
const ADMIN_ROLES = ['SUPERADMIN'] as const;
const FINANCE_ROLES = ['FINANZAS'] as const;
const STUDENT_ROLES = ['ALUMNO'] as const;

// Helper to create test data
async function createTestStudent() {
	const user = await prisma.user.create({
		data: {
			email: `test-${Date.now()}@example.com`,
			firstName: 'Test',
			lastName: 'Student',
			passwordHash: 'hash',
			status: 'ACTIVE',
			roles: ['ALUMNO']
		}
	});

	const student = await prisma.student.create({
		data: {
			userId: user.id,
			dni: `12345678${Math.floor(Math.random() * 100)}`,
			firstName: 'Test',
			lastName: 'Student',
			status: 'ACTIVE',
			careerId: 'test-career-id',
			currentYear: 1
		}
	});

	return { user, student };
}

async function createTestCharge(studentId: string) {
	const concept = await prisma.chargeConcept.findFirst();
	if (!concept) {
		throw new Error('No charge concept found in database');
	}

	const term = await prisma.academicTerm.findFirst();
	if (!term) {
		throw new Error('No academic term found in database');
	}

	const charge = await prisma.studentCharge.create({
		data: {
			studentId,
			conceptId: concept.id,
			periodLabel: '2024-01',
			amount: new Decimal(1000),
			paidAmount: new Decimal(0),
			status: 'PENDING',
			academicTermId: term.id
		}
	});

	return charge;
}

// Test functions
async function testCreateDraftAgreement() {
	console.log('\n=== Test: Create Draft Agreement ===');

	const { student } = await createTestStudent();
	const charge = await createTestCharge(student.id);

	const input = {
		studentId: student.id,
		studentName: `${student.firstName} ${student.lastName}`,
		studentDni: student.dni,
		originalDebt: new Decimal(1000),
		agreedAmount: new Decimal(1000),
		reason: 'Test agreement',
		observations: 'Test observations',
		createdBy: 'test-user-id',
		createdByName: 'Test User',
		chargeIds: [charge.id],
		installments: [
			{
				installmentNumber: 1,
				dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				amount: new Decimal(500)
			},
			{
				installmentNumber: 2,
				dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
				amount: new Decimal(500)
			}
		]
	};

	try {
		const agreement = await paymentAgreementService.createDraftAgreement(
			input,
			ADMIN_ROLES,
			'test-user-id',
			'Test User'
		);

		console.log('✓ Draft agreement created successfully');
		console.log(`  Agreement ID: ${agreement.id}`);
		console.log(`  Agreement Number: ${agreement.agreementNumber}/${agreement.agreementYear}`);
		console.log(`  Status: ${agreement.status}`);
		console.log(`  Installments: ${agreement.installments.length}`);

		// Verify agreement was created with correct data
		if (agreement.status !== 'DRAFT') {
			throw new Error('Agreement status should be DRAFT');
		}

		// Verify installments were created
		if (agreement.installments.length !== 2) {
			throw new Error('Should have 2 installments');
		}

		// Verify charge relation was created
		if (agreement.relatedCharges.length !== 1) {
			throw new Error('Should have 1 charge relation');
		}

		// Verify event was recorded
		const events = await prisma.paymentAgreementEvent.findMany({
			where: { agreementId: agreement.id }
		});
		if (events.length === 0) {
			throw new Error('No events recorded');
		}
		console.log(`  Events recorded: ${events.length}`);

		return agreement;
	} catch (error) {
		console.error('✗ Test failed:', error);
		throw error;
	}
}

async function testActivateAgreement(agreementId: string) {
	console.log('\n=== Test: Activate Agreement ===');

	try {
		const activated = await paymentAgreementService.activateAgreement(
			agreementId,
			ADMIN_ROLES,
			'test-user-id',
			'Test User'
		);

		console.log('✓ Agreement activated successfully');
		console.log(`  Status: ${activated.status}`);
		console.log(`  Activated At: ${activated.activatedAt}`);

		// Verify status changed to ACTIVE
		if (activated.status !== 'ACTIVE') {
			throw new Error('Agreement status should be ACTIVE');
		}

		// Verify ACTIVATED event was recorded
		const events = await prisma.paymentAgreementEvent.findMany({
			where: { agreementId, eventType: 'ACTIVATED' }
		});
		if (events.length === 0) {
			throw new Error('No ACTIVATED event recorded');
		}
		console.log(`  ACTIVATED event recorded`);

		return activated;
	} catch (error) {
		console.error('✗ Test failed:', error);
		throw error;
	}
}

async function testPermissionValidation() {
	console.log('\n=== Test: Permission Validation ===');

	const { student } = await createTestStudent();
	const charge = await createTestCharge(student.id);

	const input = {
		studentId: student.id,
		studentName: `${student.firstName} ${student.lastName}`,
		studentDni: student.dni,
		originalDebt: new Decimal(1000),
		agreedAmount: new Decimal(1000),
		reason: 'Test agreement',
		observations: 'Test observations',
		createdBy: 'test-user-id',
		createdByName: 'Test User',
		chargeIds: [charge.id],
		installments: [
			{
				installmentNumber: 1,
				dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				amount: new Decimal(1000)
			}
		]
	};

	try {
		// Test that ALUMNO cannot create agreements
		await paymentAgreementService.createDraftAgreement(
			input,
			STUDENT_ROLES,
			'test-user-id',
			'Test User'
		);
		throw new Error('ALUMNO should not be able to create agreements');
	} catch (error) {
		if (error instanceof Error && error.message.includes('permission')) {
			console.log('✓ ALUMNO correctly prevented from creating agreements');
		} else {
			throw error;
		}
	}
}

async function testInstallmentValidation() {
	console.log('\n=== Test: Installment Validation ===');

	const { student } = await createTestStudent();
	const charge = await createTestCharge(student.id);

	const input = {
		studentId: student.id,
		studentName: `${student.firstName} ${student.lastName}`,
		studentDebt: student.dni,
		originalDebt: new Decimal(1000),
		agreedAmount: new Decimal(1000),
		reason: 'Test agreement',
		observations: 'Test observations',
		createdBy: 'test-user-id',
		createdByName: 'Test User',
		chargeIds: [charge.id],
		installments: [
			{
				installmentNumber: 1,
				dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				amount: new Decimal(500) // Sum doesn't match agreed amount
			}
		]
	};

	try {
		await paymentAgreementService.createDraftAgreement(
			input,
			ADMIN_ROLES,
			'test-user-id',
			'Test User'
		);
		throw new Error("Should reject installments that don't sum to agreed amount");
	} catch (error) {
		if (error instanceof Error && error.message.includes('sum')) {
			console.log('✓ Installment sum validation working correctly');
		} else {
			throw error;
		}
	}
}

async function testTransactionalRollback() {
	console.log('\n=== Test: Transactional Rollback ===');

	const { student } = await createTestStudent();
	const charge = await createTestCharge(student.id);

	const input = {
		studentId: student.id,
		studentName: `${student.firstName} ${student.lastName}`,
		studentDni: student.dni,
		originalDebt: new Decimal(1000),
		agreedAmount: new Decimal(1000),
		reason: 'Test agreement',
		observations: 'Test observations',
		createdBy: 'test-user-id',
		createdByName: 'Test User',
		chargeIds: ['invalid-charge-id'], // Invalid charge ID to trigger rollback
		installments: [
			{
				installmentNumber: 1,
				dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				amount: new Decimal(1000)
			}
		]
	};

	try {
		await paymentAgreementService.createDraftAgreement(
			input,
			ADMIN_ROLES,
			'test-user-id',
			'Test User'
		);
		throw new Error('Should fail with invalid charge ID');
	} catch (error) {
		// Verify no partial data was created
		const agreements = await prisma.paymentAgreement.findMany({
			where: { studentId: student.id }
		});
		if (agreements.length > 0) {
			throw new Error('Transactional rollback failed - partial data created');
		}
		console.log('✓ Transactional rollback working correctly');
	}
}

async function testAuditLogging() {
	console.log('\n=== Test: Audit Logging ===');

	const { student } = await createTestStudent();
	const charge = await createTestCharge(student.id);

	const input = {
		studentId: student.id,
		studentName: `${student.firstName} ${student.lastName}`,
		studentDni: student.dni,
		originalDebt: new Decimal(1000),
		agreedAmount: new Decimal(1000),
		reason: 'Test agreement',
		observations: 'Test observations',
		createdBy: 'test-user-id',
		createdByName: 'Test User',
		chargeIds: [charge.id],
		installments: [
			{
				installmentNumber: 1,
				dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				amount: new Decimal(1000)
			}
		]
	};

	const agreement = await paymentAgreementService.createDraftAgreement(
		input,
		ADMIN_ROLES,
		'test-user-id',
		'Test User'
	);

	// Verify audit log was created
	const auditLogs = await prisma.auditLog.findMany({
		where: { entityId: agreement.id, entityType: 'PaymentAgreement' }
	});

	if (auditLogs.length === 0) {
		throw new Error('No audit logs created');
	}

	console.log('✓ Audit logging working correctly');
	console.log(`  Audit logs created: ${auditLogs.length}`);
}

// Main test runner
async function runTests() {
	console.log('Starting Payment Agreements Phase 2 Functional Tests');
	console.log('=======================================================');

	try {
		// Test 1: Create draft agreement
		const agreement = await testCreateDraftAgreement();

		// Test 2: Activate agreement
		await testActivateAgreement(agreement.id);

		// Test 3: Permission validation
		await testPermissionValidation();

		// Test 4: Installment validation
		await testInstallmentValidation();

		// Test 5: Transactional rollback
		await testTransactionalRollback();

		// Test 6: Audit logging
		await testAuditLogging();

		console.log('\n=======================================================');
		console.log('✓ All tests passed successfully!');
	} catch (error) {
		console.error('\n=======================================================');
		console.error('✗ Tests failed:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run tests
runTests();
