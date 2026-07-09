import { PrismaClient, PaymentAgreementStatus, FinancialBlockType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';
import {
	canEvaluateAgreementStatus,
	canEvaluateAgreementBlockException
} from '../src/lib/server/payment-agreements/payment-agreement-permissions';

const prisma = new PrismaClient();

// Test constants
const TEST_STUDENT_ID = `manual_ops_test_${Date.now()}`;
const TEST_USER_ID = `manual_ops_user_${Date.now()}`;
const TEST_STUDENT_DNI = `77777777${Date.now()}`;
const TEST_USER_NAME = 'Test Manual Operations';

interface TestResult {
	testName: string;
	passed: boolean;
	message: string;
}

const results: TestResult[] = [];

async function cleanupTestData() {
	console.log('🧹 Cleaning up test data...');
	try {
		// Delete test allocations
		await prisma.paymentAllocation.deleteMany({
			where: {
				payment: { studentId: TEST_STUDENT_ID }
			}
		});

		// Delete test payments
		await prisma.payment.deleteMany({
			where: { studentId: TEST_STUDENT_ID }
		});

		// Delete test events
		await prisma.paymentAgreementEvent.deleteMany({
			where: {
				agreement: { studentId: TEST_STUDENT_ID }
			}
		});

		// Delete test charge relations
		await prisma.paymentAgreementChargeRelation.deleteMany({
			where: {
				agreement: { studentId: TEST_STUDENT_ID }
			}
		});

		// Delete test installments
		await prisma.paymentAgreementInstallment.deleteMany({
			where: {
				agreement: { studentId: TEST_STUDENT_ID }
			}
		});

		// Delete test agreements
		await prisma.paymentAgreement.deleteMany({
			where: { studentId: TEST_STUDENT_ID }
		});

		// Delete test charges
		await prisma.studentCharge.deleteMany({
			where: { studentId: TEST_STUDENT_ID }
		});

		// Delete test financial blocks
		await prisma.financialBlock.deleteMany({
			where: { studentId: TEST_STUDENT_ID }
		});

		// Delete test student
		await prisma.student.deleteMany({
			where: { id: TEST_STUDENT_ID }
		});

		// Delete test user
		await prisma.user.deleteMany({
			where: { id: TEST_USER_ID }
		});

		console.log('✅ Cleanup completed\n');
	} catch (error) {
		console.error('❌ Cleanup error:', error);
	}
}

async function setupTestData() {
	console.log('🔧 Setting up test data...\n');

	// Get or create a test career
	let career = await prisma.career.findFirst();
	if (!career) {
		career = await prisma.career.create({
			data: {
				code: 'TEST-MANUAL-OPS',
				name: 'Test Career Manual Ops',
				durationYears: 5
			}
		});
	}

	// Create test user
	const user = await prisma.user.create({
		data: {
			id: TEST_USER_ID,
			email: `manual-ops-test-${Date.now()}@example.com`,
			passwordHash: 'dummy',
			firstName: 'Manual',
			lastName: 'Ops Test'
		}
	});

	// Create test student
	const student = await prisma.student.create({
		data: {
			id: TEST_STUDENT_ID,
			firstName: 'Manual',
			lastName: 'Ops Test',
			dni: TEST_STUDENT_DNI,
			userId: user.id,
			careerId: career.id
		}
	});

	// Create test charge concept
	const concept1Code = `MANUAL_TEST_CHARGE_1_${Date.now()}`;
	const concept2Code = `MANUAL_TEST_CHARGE_2_${Date.now()}`;
	const termCode = `MANUAL_TEST_TERM_${Date.now()}`;

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
			name: 'Manual Test Term',
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
			periodLabel: '2026',
			amount: new Decimal(5000),
			finalAmount: new Decimal(5000),
			dueDate: new Date('2026-03-01'),
			academicTermId: term.id
		}
	});

	const charge2 = await prisma.studentCharge.create({
		data: {
			studentId: TEST_STUDENT_ID,
			conceptId: concept2.id,
			periodLabel: '2026',
			amount: new Decimal(3000),
			finalAmount: new Decimal(3000),
			dueDate: new Date('2026-06-01'),
			academicTermId: term.id
		}
	});

	// Create financial block for student
	const financialBlock = await prisma.financialBlock.create({
		data: {
			studentId: TEST_STUDENT_ID,
			blockType: FinancialBlockType.ALL,
			blockReason: 'Test manual operations',
			blockedBy: TEST_USER_ID,
			blockedByName: TEST_USER_NAME,
			debtAmount: new Decimal(8000),
			exceptionGranted: false,
			exceptionSource: null,
			exceptionAgreementId: null,
			exceptionReason: null,
			exceptionAt: null,
			exceptionBy: null
		}
	});

	// Create ACTIVE agreement (up-to-date)
	const activeAgreement = await prisma.paymentAgreement.create({
		data: {
			studentId: TEST_STUDENT_ID,
			studentName: `${student.firstName} ${student.lastName}`,
			agreementNumber: 1,
			agreementYear: new Date().getFullYear(),
			originalDebt: new Decimal(5000),
			agreedAmount: new Decimal(5000),
			paidAmount: new Decimal(0),
			pendingAmount: new Decimal(5000),
			status: PaymentAgreementStatus.ACTIVE,
			reason: 'Test manual operations',
			createdBy: TEST_USER_ID,
			createdByName: TEST_USER_NAME,
			installments: {
				create: [
					{
						installmentNumber: 1,
						dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Future date
						amount: new Decimal(2500),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(2500),
						status: 'PENDING'
					},
					{
						installmentNumber: 2,
						dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Future date
						amount: new Decimal(2500),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(2500),
						status: 'PENDING'
					}
				]
			}
		}
	});

	// Create ACTIVE agreement with OVERDUE
	const overdueAgreement = await prisma.paymentAgreement.create({
		data: {
			studentId: TEST_STUDENT_ID,
			studentName: `${student.firstName} ${student.lastName}`,
			agreementNumber: 2,
			agreementYear: new Date().getFullYear(),
			originalDebt: new Decimal(3000),
			agreedAmount: new Decimal(3000),
			paidAmount: new Decimal(0),
			pendingAmount: new Decimal(3000),
			status: PaymentAgreementStatus.ACTIVE,
			reason: 'Test manual operations - overdue',
			createdBy: TEST_USER_ID,
			createdByName: TEST_USER_NAME,
			installments: {
				create: [
					{
						installmentNumber: 1,
						dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Past date
						amount: new Decimal(1500),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(1500),
						status: 'OVERDUE'
					},
					{
						installmentNumber: 2,
						dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Future date
						amount: new Decimal(1500),
						paidAmount: new Decimal(0),
						pendingAmount: new Decimal(1500),
						status: 'PENDING'
					}
				]
			}
		}
	});

	// Create COMPLETED agreement
	const completedAgreement = await prisma.paymentAgreement.create({
		data: {
			studentId: TEST_STUDENT_ID,
			studentName: `${student.firstName} ${student.lastName}`,
			agreementNumber: 3,
			agreementYear: new Date().getFullYear(),
			originalDebt: new Decimal(2000),
			agreedAmount: new Decimal(2000),
			paidAmount: new Decimal(2000),
			pendingAmount: new Decimal(0),
			status: PaymentAgreementStatus.COMPLETED,
			reason: 'Test manual operations - completed',
			createdBy: TEST_USER_ID,
			createdByName: TEST_USER_NAME,
			installments: {
				create: [
					{
						installmentNumber: 1,
						dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
						amount: new Decimal(1000),
						paidAmount: new Decimal(1000),
						pendingAmount: new Decimal(0),
						status: 'PAID'
					},
					{
						installmentNumber: 2,
						dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
						amount: new Decimal(1000),
						paidAmount: new Decimal(1000),
						pendingAmount: new Decimal(0),
						status: 'PAID'
					}
				]
			}
		}
	});

	console.log('✅ Created test agreements\n');
	return { activeAgreement, overdueAgreement, completedAgreement, financialBlock };
}

async function testManualStatusEvaluation() {
	console.log('Test 1: Manual status evaluation');
	console.log('─────────────────────────────────────────────────────────');

	const { activeAgreement } = await setupTestData();

	try {
		const result = await paymentAgreementService.evaluateAgreementFinancialStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		if (result && result.agreement && result.statusChanged !== undefined) {
			console.log('  ✅ Manual status evaluation works\n');
			results.push({ testName: 'Manual status evaluation', passed: true, message: 'Success' });
		} else {
			console.log('  ❌ Manual status evaluation failed\n');
			results.push({
				testName: 'Manual status evaluation',
				passed: false,
				message: 'Invalid result'
			});
		}
	} catch (error) {
		console.log('  ❌ Manual status evaluation error:', error);
		results.push({ testName: 'Manual status evaluation', passed: false, message: String(error) });
	} finally {
		await cleanupTestData();
	}
}

async function testManualBlockExceptionEvaluation() {
	console.log('Test 2: Manual block exception evaluation');
	console.log('─────────────────────────────────────────────────────────');

	const { activeAgreement, financialBlock } = await setupTestData();

	try {
		// Apply exception first
		await paymentAgreementService.applyAgreementBlockException(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		// Evaluate block exception
		const result = await paymentAgreementService.evaluateAgreementBlockStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		if (result && result.exceptionApplied !== undefined && result.exceptionRevoked !== undefined) {
			console.log('  ✅ Manual block exception evaluation works\n');
			results.push({
				testName: 'Manual block exception evaluation',
				passed: true,
				message: 'Success'
			});
		} else {
			console.log('  ❌ Manual block exception evaluation failed\n');
			results.push({
				testName: 'Manual block exception evaluation',
				passed: false,
				message: 'Invalid result'
			});
		}
	} catch (error) {
		console.log('  ❌ Manual block exception evaluation error:', error);
		results.push({
			testName: 'Manual block exception evaluation',
			passed: false,
			message: String(error)
		});
	} finally {
		await cleanupTestData();
	}
}

async function testActiveUpToDateAppliesException() {
	console.log('Test 3: ACTIVE up-to-date applies exception');
	console.log('─────────────────────────────────────────────────────────');

	const { activeAgreement } = await setupTestData();

	try {
		const result = await paymentAgreementService.evaluateAgreementBlockStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		if (result.exceptionApplied) {
			const block = await prisma.financialBlock.findFirst({
				where: { studentId: TEST_STUDENT_ID }
			});

			if (block && block.exceptionGranted && block.exceptionAgreementId === activeAgreement.id) {
				console.log('  ✅ ACTIVE up-to-date applies exception\n');
				results.push({
					testName: 'ACTIVE up-to-date applies exception',
					passed: true,
					message: 'Success'
				});
			} else {
				console.log('  ❌ Exception not applied correctly\n');
				results.push({
					testName: 'ACTIVE up-to-date applies exception',
					passed: false,
					message: 'Exception not applied'
				});
			}
		} else {
			console.log('  ❌ Exception not applied\n');
			results.push({
				testName: 'ACTIVE up-to-date applies exception',
				passed: false,
				message: 'Exception not applied'
			});
		}
	} catch (error) {
		console.log('  ❌ Error:', error);
		results.push({
			testName: 'ACTIVE up-to-date applies exception',
			passed: false,
			message: String(error)
		});
	} finally {
		await cleanupTestData();
	}
}

async function testActiveOverdueRevokesException() {
	console.log('Test 4: ACTIVE + OVERDUE revokes exception');
	console.log('─────────────────────────────────────────────────────────');

	const { activeAgreement, financialBlock } = await setupTestData();

	try {
		// Apply exception to ACTIVE up-to-date agreement
		await paymentAgreementService.applyAgreementBlockException(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		// Mark first installment as overdue
		await prisma.paymentAgreementInstallment.updateMany({
			where: {
				agreementId: activeAgreement.id,
				installmentNumber: 1
			},
			data: {
				status: 'OVERDUE',
				dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // Past date
			}
		});

		// Evaluate block exception (should revoke)
		const result = await paymentAgreementService.evaluateAgreementBlockStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		if (result.exceptionRevoked) {
			const block = await prisma.financialBlock.findFirst({
				where: { studentId: TEST_STUDENT_ID }
			});

			if (block && !block.exceptionGranted && block.exceptionAgreementId === null) {
				console.log('  ✅ ACTIVE + OVERDUE revokes exception\n');
				results.push({
					testName: 'ACTIVE + OVERDUE revokes exception',
					passed: true,
					message: 'Success'
				});
			} else {
				console.log('  ❌ Exception not revoked correctly\n');
				results.push({
					testName: 'ACTIVE + OVERDUE revokes exception',
					passed: false,
					message: 'Exception not revoked'
				});
			}
		} else {
			console.log('  ❌ Exception not revoked\n');
			results.push({
				testName: 'ACTIVE + OVERDUE revokes exception',
				passed: false,
				message: 'Exception not revoked'
			});
		}
	} catch (error) {
		console.log('  ❌ Error:', error);
		results.push({
			testName: 'ACTIVE + OVERDUE revokes exception',
			passed: false,
			message: String(error)
		});
	} finally {
		await cleanupTestData();
	}
}

async function testCompletedRevokesException() {
	console.log('Test 5: COMPLETED revokes unnecessary exception');
	console.log('─────────────────────────────────────────────────────────');

	const { activeAgreement } = await setupTestData();

	try {
		// Apply exception to ACTIVE agreement
		await paymentAgreementService.applyAgreementBlockException(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		// Mark all installments as paid (simulating completion)
		await prisma.paymentAgreementInstallment.updateMany({
			where: {
				agreementId: activeAgreement.id
			},
			data: {
				status: 'PAID',
				paidAmount: new Decimal(2500),
				pendingAmount: new Decimal(0)
			}
		});

		// Update agreement to COMPLETED
		await prisma.paymentAgreement.update({
			where: { id: activeAgreement.id },
			data: {
				status: PaymentAgreementStatus.COMPLETED,
				paidAmount: new Decimal(5000),
				pendingAmount: new Decimal(0)
			}
		});

		// Evaluate block exception (should revoke)
		const result = await paymentAgreementService.evaluateAgreementBlockStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		if (result.exceptionRevoked) {
			const block = await prisma.financialBlock.findFirst({
				where: { studentId: TEST_STUDENT_ID }
			});

			if (block && !block.exceptionGranted && block.exceptionAgreementId === null) {
				console.log('  ✅ COMPLETED revokes unnecessary exception\n');
				results.push({ testName: 'COMPLETED revokes exception', passed: true, message: 'Success' });
			} else {
				console.log('  ❌ Exception not revoked correctly\n');
				results.push({
					testName: 'COMPLETED revokes exception',
					passed: false,
					message: 'Exception not revoked'
				});
			}
		} else {
			console.log('  ❌ Exception not revoked\n');
			results.push({
				testName: 'COMPLETED revokes exception',
				passed: false,
				message: 'Exception not revoked'
			});
		}
	} catch (error) {
		console.log('  ❌ Error:', error);
		results.push({
			testName: 'COMPLETED revokes exception',
			passed: false,
			message: String(error)
		});
	} finally {
		await cleanupTestData();
	}
}

async function testNoStudentChargeModification() {
	console.log('Test 6: No StudentCharge modification');
	console.log('─────────────────────────────────────────────────────────');

	const { activeAgreement } = await setupTestData();

	try {
		const chargesBefore = await prisma.studentCharge.count({
			where: { studentId: TEST_STUDENT_ID }
		});

		await paymentAgreementService.evaluateAgreementBlockStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		const chargesAfter = await prisma.studentCharge.count({
			where: { studentId: TEST_STUDENT_ID }
		});

		if (chargesBefore === chargesAfter) {
			console.log('  ✅ No StudentCharge modification\n');
			results.push({ testName: 'No StudentCharge modification', passed: true, message: 'Success' });
		} else {
			console.log('  ❌ StudentCharge was modified\n');
			results.push({
				testName: 'No StudentCharge modification',
				passed: false,
				message: 'StudentCharge modified'
			});
		}
	} catch (error) {
		console.log('  ❌ Error:', error);
		results.push({
			testName: 'No StudentCharge modification',
			passed: false,
			message: String(error)
		});
	} finally {
		await cleanupTestData();
	}
}

async function testNoNewFinancialBlock() {
	console.log('Test 7: No new FinancialBlock created');
	console.log('─────────────────────────────────────────────────────────');

	const { activeAgreement, financialBlock } = await setupTestData();

	try {
		const blocksBefore = await prisma.financialBlock.count({
			where: { studentId: TEST_STUDENT_ID }
		});

		await paymentAgreementService.evaluateAgreementBlockStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		const blocksAfter = await prisma.financialBlock.count({
			where: { studentId: TEST_STUDENT_ID }
		});

		if (blocksBefore === blocksAfter) {
			console.log('  ✅ No new FinancialBlock created\n');
			results.push({ testName: 'No new FinancialBlock', passed: true, message: 'Success' });
		} else {
			console.log('  ❌ New FinancialBlock was created\n');
			results.push({
				testName: 'No new FinancialBlock',
				passed: false,
				message: 'New block created'
			});
		}
	} catch (error) {
		console.log('  ❌ Error:', error);
		results.push({ testName: 'No new FinancialBlock', passed: false, message: String(error) });
	} finally {
		await cleanupTestData();
	}
}

async function testNoDuplicateEvents() {
	console.log('Test 8: No duplicate events on repeated execution');
	console.log('─────────────────────────────────────────────────────────');

	const { activeAgreement } = await setupTestData();

	try {
		// First evaluation
		await paymentAgreementService.evaluateAgreementBlockStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		const eventsBefore = await prisma.paymentAgreementEvent.count({
			where: { agreementId: activeAgreement.id }
		});

		// Second evaluation (should not create duplicate events)
		await paymentAgreementService.evaluateAgreementBlockStatus(
			activeAgreement.id,
			TEST_USER_ID,
			TEST_USER_NAME
		);

		const eventsAfter = await prisma.paymentAgreementEvent.count({
			where: { agreementId: activeAgreement.id }
		});

		if (eventsBefore === eventsAfter) {
			console.log('  ✅ No duplicate events on repeated execution\n');
			results.push({ testName: 'No duplicate events', passed: true, message: 'Success' });
		} else {
			console.log('  ❌ Duplicate events were created\n');
			results.push({ testName: 'No duplicate events', passed: false, message: 'Duplicate events' });
		}
	} catch (error) {
		console.log('  ❌ Error:', error);
		results.push({ testName: 'No duplicate events', passed: false, message: String(error) });
	} finally {
		await cleanupTestData();
	}
}

async function testPermissionsValidation() {
	console.log('Test 9: Permissions validation');
	console.log('─────────────────────────────────────────────────────────');

	try {
		// Test 9a: User without roles cannot evaluate status
		const userWithoutRoles = { roles: null };
		const canEvaluateWithoutRoles = canEvaluateAgreementStatus(userWithoutRoles);
		if (!canEvaluateWithoutRoles) {
			console.log('  ✅ User without roles cannot evaluate status');
		} else {
			console.log('  ❌ User without roles should not be able to evaluate status');
			results.push({
				testName: 'Permissions validation',
				passed: false,
				message: 'User without roles can evaluate status'
			});
			return;
		}

		// Test 9b: User without roles cannot evaluate block exception
		const canEvaluateBlockWithoutRoles = canEvaluateAgreementBlockException(userWithoutRoles);
		if (!canEvaluateBlockWithoutRoles) {
			console.log('  ✅ User without roles cannot evaluate block exception');
		} else {
			console.log('  ❌ User without roles should not be able to evaluate block exception');
			results.push({
				testName: 'Permissions validation',
				passed: false,
				message: 'User without roles can evaluate block exception'
			});
			return;
		}

		// Test 9c: User with SUPERADMIN role can evaluate
		const superadminUser = { roles: ['SUPERADMIN'] };
		const canEvaluateSuperadmin = canEvaluateAgreementStatus(superadminUser);
		if (canEvaluateSuperadmin) {
			console.log('  ✅ SUPERADMIN can evaluate status');
		} else {
			console.log('  ❌ SUPERADMIN should be able to evaluate status');
			results.push({
				testName: 'Permissions validation',
				passed: false,
				message: 'SUPERADMIN cannot evaluate status'
			});
			return;
		}

		// Test 9d: User with FINANZAS role can evaluate
		const finanzasUser = { roles: ['FINANZAS'] };
		const canEvaluateFinanzas = canEvaluateAgreementStatus(finanzasUser);
		if (canEvaluateFinanzas) {
			console.log('  ✅ FINANZAS can evaluate status');
		} else {
			console.log('  ❌ FINANZAS should be able to evaluate status');
			results.push({
				testName: 'Permissions validation',
				passed: false,
				message: 'FINANZAS cannot evaluate status'
			});
			return;
		}

		// Test 9e: User with ALUMNO role cannot evaluate
		const alumnoUser = { roles: ['ALUMNO'] };
		const canEvaluateAlumno = canEvaluateAgreementStatus(alumnoUser);
		if (!canEvaluateAlumno) {
			console.log('  ✅ ALUMNO cannot evaluate status');
		} else {
			console.log('  ❌ ALUMNO should not be able to evaluate status');
			results.push({
				testName: 'Permissions validation',
				passed: false,
				message: 'ALUMNO can evaluate status'
			});
			return;
		}

		// Test 9f: Null user cannot evaluate
		const canEvaluateNull = canEvaluateAgreementStatus(null);
		if (!canEvaluateNull) {
			console.log('  ✅ Null user cannot evaluate status');
		} else {
			console.log('  ❌ Null user should not be able to evaluate status');
			results.push({
				testName: 'Permissions validation',
				passed: false,
				message: 'Null user can evaluate status'
			});
			return;
		}

		console.log('  ✅ All permission checks passed\n');
		results.push({
			testName: 'Permissions validation',
			passed: true,
			message: 'All permission checks passed'
		});
	} catch (error) {
		console.log('  ❌ Error:', error);
		results.push({ testName: 'Permissions validation', passed: false, message: String(error) });
	}
}

async function runTests() {
	console.log('🧪 Starting Manual Operations Tests');
	console.log('═════════════════════════════════');
	console.log('══════════════════════════\n');

	try {
		await testManualStatusEvaluation();
		await testManualBlockExceptionEvaluation();
		await testActiveUpToDateAppliesException();
		await testActiveOverdueRevokesException();
		await testCompletedRevokesException();
		await testNoStudentChargeModification();
		await testNoNewFinancialBlock();
		await testNoDuplicateEvents();
		await testPermissionsValidation();
	} catch (error) {
		console.error('❌ Test error:', error);
	} finally {
		await cleanupTestData();
	}

	console.log('═════════════════════════════════');
	console.log('══════════════════════════');
	console.log(`Test Summary: ${results.length} tests executed`);

	const passed = results.filter((r) => r.passed).length;
	const failed = results.filter((r) => !r.passed).length;

	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);

	if (failed > 0) {
		console.log('\n❌ Failed tests:');
		results
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`  - ${r.testName}: ${r.message}`);
			});
		process.exit(1);
	} else {
		console.log('\n✅ All tests passed');
		process.exit(0);
	}
}

runTests();
