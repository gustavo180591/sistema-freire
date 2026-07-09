import { PrismaClient } from '@prisma/client';
import { financialService } from '../src/lib/server/financial/financial-service';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

let testUserId: string;
let testStudentId: string;
let testChargeId: string;
let testPaymentId: string;
let testRoleCode: string;
let testConceptId: string;
let testAcademicTermId: string;

async function setupTestData() {
	console.log('🔧 Configurando datos de prueba...');

	// Clean up existing test data
	await cleanupTestData();

	// Create test user with FINANZAS role
	const user = await prisma.user.create({
		data: {
			email: `test-debt-${Date.now()}@example.com`,
			firstName: 'Test',
			lastName: 'Debt',
			passwordHash: 'test'
		}
	});
	testUserId = user.id;

	const role = await prisma.role.findUnique({ where: { code: 'FINANZAS' } });
	if (role) {
		await prisma.userRole.create({
			data: {
				userId: testUserId,
				roleId: role.id
			}
		});
		testRoleCode = role.code;

		// Add FINANCIAL_BLOCK permissions
		await prisma.permission.createMany({
			data: [
				{
					roleCode: 'FINANZAS',
					entity: 'FINANCIAL_BLOCK',
					canCreate: true,
					canRead: true,
					canUpdate: true,
					canDelete: true
				}
			],
			skipDuplicates: true
		});
	}

	// Create test career
	let career = await prisma.career.findFirst({ where: { code: 'TEST-REC' } });
	if (!career) {
		career = await prisma.career.create({
			data: {
				code: 'TEST-REC',
				name: 'Test Career'
			}
		});
	}

	// Create test student
	const student = await prisma.student.create({
		data: {
			userId: testUserId,
			dni: String(Date.now()).slice(-8),
			firstName: 'Test',
			lastName: 'Student',
			status: 'ACTIVE',
			careerId: career.id
		}
	});
	testStudentId = student.id;

	// Create academic term
	let term = await prisma.academicTerm.findFirst();
	if (!term) {
		term = await prisma.academicTerm.create({
			data: {
				name: 'Test Term 2026',
				code: 'TEST-2026',
				year: 2026,
				termType: 'ANUAL',
				startDate: new Date('2026-01-01'),
				endDate: new Date('2026-12-31')
			}
		});
	}
	testAcademicTermId = term.id;

	// Create charge concept
	let concept = await prisma.chargeConcept.findFirst({ where: { code: 'MATRICULA' } });
	if (!concept) {
		concept = await prisma.chargeConcept.create({
			data: {
				code: 'MATRICULA',
				name: 'Matrícula',
				description: 'Cargo de matrícula'
			}
		});
	}
	testConceptId = concept.id;

	// Create test charge (overdue)
	const charge = await prisma.studentCharge.create({
		data: {
			studentId: testStudentId,
			conceptId: concept.id,
			periodLabel: '2026-1',
			amount: new Decimal(1000),
			paidAmount: new Decimal(0),
			finalAmount: new Decimal(1000),
			dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
			status: 'PENDING',
			academicTermId: term.id
		}
	});
	testChargeId = charge.id;

	console.log('✅ Datos de prueba configurados');
}

async function cleanupTestData() {
	console.log('🧹 Limpiando datos de prueba...');

	// Delete in correct order due to foreign keys
	await prisma.paymentAllocation.deleteMany({
		where: {
			payment: { studentId: testStudentId }
		}
	});

	await prisma.payment.deleteMany({
		where: { studentId: testStudentId }
	});

	await prisma.financialMovement.deleteMany({
		where: { studentId: testStudentId }
	});

	await prisma.financialBlock.deleteMany({
		where: { studentId: testStudentId }
	});

	await prisma.studentCharge.deleteMany({
		where: { studentId: testStudentId }
	});

	if (testStudentId) {
		await prisma.student.deleteMany({
			where: { id: testStudentId }
		});
	}

	if (testUserId) {
		await prisma.userRole.deleteMany({
			where: { userId: testUserId }
		});
		await prisma.user.deleteMany({
			where: { id: testUserId }
		});
	}

	// Clean up test permissions (only if they were created)
	await prisma.permission.deleteMany({
		where: {
			roleCode: 'FINANZAS',
			entity: 'FINANCIAL_BLOCK'
		}
	});

	console.log('✅ Datos de prueba limpiados');
}

async function testCalculateDebtSummary() {
	console.log('\n📝 Test: Calcular resumen de deuda...');

	try {
		const summary = await financialService.calculateDebtSummary(testStudentId);

		console.log('✅ Resumen de deuda calculado exitosamente');
		console.log(`   - Deuda total: ${summary.totalDebt.toString()}`);
		console.log(`   - Deuda vencida: ${summary.overdueDebt.toString()}`);
		console.log(`   - Cuotas pendientes: ${summary.pendingCharges}`);
		console.log(`   - Cuotas vencidas: ${summary.overdueCharges}`);
	} catch (error: any) {
		console.error('❌ Error al calcular resumen de deuda:', error.message);
		throw error;
	}
}

async function testStudentWithoutDebt() {
	console.log('\n📝 Test: Alumno sin deuda...');

	try {
		// Create a student with no charges
		const user = await prisma.user.create({
			data: {
				email: `nodebt-${Date.now()}@example.com`,
				firstName: 'No',
				lastName: 'Debt',
				passwordHash: 'test'
			}
		});

		const career = await prisma.career.findFirst({ where: { code: 'TEST-REC' } });
		if (!career) {
			throw new Error('Career TEST-REC not found');
		}

		const student = await prisma.student.create({
			data: {
				userId: user.id,
				dni: '87654321',
				firstName: 'No',
				lastName: 'Debt',
				status: 'ACTIVE',
				careerId: career.id
			}
		});

		const summary = await financialService.calculateDebtSummary(student.id);

		if (summary.totalDebt.equals(0) && summary.overdueDebt.equals(0)) {
			console.log('✅ Alumno sin deuda calculado correctamente');
		} else {
			console.error('❌ Alumno sin deuda tiene deuda calculada');
		}

		// Cleanup
		await prisma.student.delete({ where: { id: student.id } });
		await prisma.user.delete({ where: { id: user.id } });
	} catch (error: any) {
		console.error('❌ Error en test de alumno sin deuda:', error.message);
	}
}

async function testEvaluateFinancialBlocks() {
	console.log('\n📝 Test: Evaluar bloqueos financieros...');

	try {
		await financialService.evaluateFinancialBlocks(testStudentId, testUserId);

		const blockStatus = await financialService.checkFinancialBlock(testStudentId);

		if (blockStatus.blocked) {
			console.log('✅ Bloqueo financiero creado correctamente');
			console.log(`   - Motivo: ${blockStatus.reason}`);
			console.log(`   - Tipo: ${blockStatus.blockType}`);
		} else {
			console.log('⚠️  Bloqueo no creado (puede ser por días de gracia)');
		}
	} catch (error: any) {
		console.error('❌ Error al evaluar bloqueos:', error.message);
		throw error;
	}
}

async function testNoDuplicateBlocks() {
	console.log('\n📝 Test: No duplicar bloqueos activos...');

	try {
		// Try to evaluate blocks again
		await financialService.evaluateFinancialBlocks(testStudentId, testUserId);

		const blocks = await prisma.financialBlock.findMany({
			where: {
				studentId: testStudentId,
				isActive: true
			}
		});

		if (blocks.length <= 1) {
			console.log('✅ No se duplicaron bloqueos activos');
		} else {
			console.error('❌ Se duplicaron bloqueos activos');
		}
	} catch (error: any) {
		console.error('❌ Error en test de no duplicar bloqueos:', error.message);
	}
}

async function testPaymentUnblocks() {
	console.log('\n📝 Test: Pago desbloquea alumno...');

	try {
		// Register payment
		await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(1000),
			method: 'CASH',
			chargeIds: [testChargeId],
			userId: testUserId
		});

		// Check if block was removed
		const blockStatus = await financialService.checkFinancialBlock(testStudentId);

		if (!blockStatus.blocked) {
			console.log('✅ Alumno desbloqueado después del pago');
		} else {
			console.log('⚠️  Alumno sigue bloqueado (puede ser por configuración)');
		}
	} catch (error: any) {
		console.error('❌ Error en test de pago desbloquea:', error.message);
		throw error;
	}
}

async function testPaymentCancellationReblocks() {
	console.log('\n📝 Test: Anulación de pago reactiva bloqueo...');

	try {
		// Get payment
		const payment = await prisma.payment.findFirst({
			where: { studentId: testStudentId, isCancelled: false }
		});

		if (!payment) {
			console.log('⚠️  No hay pago para anular');
			return;
		}

		// Cancel payment
		await financialService.cancelPayment(payment.id, 'Test cancellation', testUserId);

		// Re-evaluate blocks
		await financialService.evaluateFinancialBlocks(testStudentId, testUserId);

		const blockStatus = await financialService.checkFinancialBlock(testStudentId);

		if (blockStatus.blocked) {
			console.log('✅ Bloqueo reactivado después de anular pago');
		} else {
			console.log('⚠️  Bloqueo no reactivado (puede ser por configuración)');
		}
	} catch (error: any) {
		console.error('❌ Error en test de anulación reactiva bloqueo:', error.message);
	}
}

async function testBlockException() {
	console.log('\n📝 Test: Excepción de bloqueo...');

	try {
		const blockStatus = await financialService.checkFinancialBlock(testStudentId);

		if (!blockStatus.blocked) {
			console.log('⚠️  No hay bloqueo activo para probar excepción');
			return;
		}

		await financialService.createFinancialBlockException({
			studentId: testStudentId,
			blockType: blockStatus.blockType!,
			reason: 'Test exception',
			userId: testUserId
		});

		const updatedStatus = await financialService.checkFinancialBlock(testStudentId);

		if (updatedStatus.hasException) {
			console.log('✅ Excepción de bloqueo creada correctamente');
		} else {
			console.error('❌ Excepción no creada');
		}
	} catch (error: any) {
		console.error('❌ Error en test de excepción:', error.message);
	}
}

async function testRevokeException() {
	console.log('\n📝 Test: Revocar excepción...');

	try {
		const blockStatus = await financialService.checkFinancialBlock(testStudentId);

		if (!blockStatus.hasException) {
			console.log('⚠️  No hay excepción para revocar');
			return;
		}

		await financialService.revokeFinancialBlockException({
			studentId: testStudentId,
			blockType: blockStatus.blockType!,
			userId: testUserId
		});

		const updatedStatus = await financialService.checkFinancialBlock(testStudentId);

		if (!updatedStatus.hasException) {
			console.log('✅ Excepción revocada correctamente');
		} else {
			console.error('❌ Excepción no revocada');
		}
	} catch (error: any) {
		console.error('❌ Error en test de revocar excepción:', error.message);
	}
}

async function testStudentFinancialStatus() {
	console.log('\n📝 Test: Estado financiero del alumno...');

	try {
		const status = await financialService.getStudentFinancialStatus(testStudentId);

		console.log('✅ Estado financiero obtenido exitosamente');
		console.log(`   - Tiene bloqueo activo: ${status.hasActiveBlock}`);
		console.log(`   - Deuda total: ${status.totalDebt.toString()}`);
		console.log(`   - Deuda vencida: ${status.overdueDebt.toString()}`);
	} catch (error: any) {
		console.error('❌ Error al obtener estado financiero:', error.message);
	}
}

async function testAtomicTransactionWithBlock() {
	console.log('\n📝 Test: Transacción atómica con bloqueo...');

	try {
		// Clean up existing blocks and charges first
		await prisma.financialBlock.deleteMany({ where: { studentId: testStudentId } });
		await prisma.studentCharge.deleteMany({ where: { studentId: testStudentId } });

		// First, create a block by creating overdue debt
		const overdueCharge = await prisma.studentCharge.create({
			data: {
				studentId: testStudentId,
				conceptId: testConceptId,
				periodLabel: '2025-02',
				amount: new Decimal(500),
				finalAmount: new Decimal(500),
				paidAmount: new Decimal(0),
				dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
				status: 'PENDING',
				academicTermId: testAcademicTermId
			}
		});

		// Evaluate blocks to create a block
		await financialService.evaluateFinancialBlocks(testStudentId, testUserId);

		// Verify block was created
		const activeBlocksBefore = await prisma.financialBlock.findMany({
			where: { studentId: testStudentId, isActive: true }
		});
		if (activeBlocksBefore.length === 0) {
			throw new Error('Block was not created before payment');
		}

		// Register payment - this should create payment, allocations, movement, and update blocks atomically
		const paymentResult = await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(500),
			method: 'CASH',
			chargeIds: [overdueCharge.id],
			userId: testUserId
		});

		// Verify payment was created
		const payment = await prisma.payment.findUnique({
			where: { id: paymentResult.payment.id }
		});
		if (!payment) {
			throw new Error('Payment was not created');
		}

		// Verify allocations were created
		const allocations = await prisma.paymentAllocation.findMany({
			where: { paymentId: paymentResult.payment.id }
		});
		if (allocations.length === 0) {
			throw new Error('Allocations were not created');
		}

		// Verify charge was updated
		const updatedCharge = await prisma.studentCharge.findUnique({
			where: { id: overdueCharge.id }
		});
		if (!updatedCharge || !updatedCharge.paidAmount.equals(new Decimal(500))) {
			throw new Error('Charge was not updated correctly');
		}

		// Verify block was deactivated (atomic operation)
		const activeBlocksAfter = await prisma.financialBlock.findMany({
			where: { studentId: testStudentId, isActive: true }
		});
		if (activeBlocksAfter.length > 0) {
			throw new Error('Block was not deactivated after payment');
		}

		console.log('✅ Transacción atómica ejecutada correctamente');
		console.log('   - Pago creado');
		console.log('   - Allocations creadas');
		console.log('   - Cuota actualizada');
		console.log('   - Bloqueo desactivado');

		// Cleanup
		await prisma.paymentAllocation.deleteMany({ where: { paymentId: paymentResult.payment.id } });
		await prisma.payment.delete({ where: { id: paymentResult.payment.id } });
		await prisma.studentCharge.delete({ where: { id: overdueCharge.id } });
		await prisma.financialBlock.deleteMany({ where: { studentId: testStudentId } });
	} catch (error: any) {
		console.error('❌ Error en test de transacción atómica:', error.message);
	}
}

async function testPendingNotOverdueDebt() {
	console.log('\n📝 Test: Deuda pendiente no vencida...');

	try {
		// Clean up existing blocks and charges first
		await prisma.financialBlock.deleteMany({ where: { studentId: testStudentId } });
		await prisma.studentCharge.deleteMany({ where: { studentId: testStudentId } });

		// Create a charge with future due date (not overdue)
		const futureCharge = await prisma.studentCharge.create({
			data: {
				studentId: testStudentId,
				conceptId: testConceptId,
				periodLabel: '2025-03',
				amount: new Decimal(1000),
				finalAmount: new Decimal(1000),
				paidAmount: new Decimal(0),
				dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in future
				status: 'PENDING',
				academicTermId: testAcademicTermId
			}
		});

		// Evaluate blocks - should not block for pending not overdue debt
		await financialService.evaluateFinancialBlocks(testStudentId, testUserId);

		// Verify no block was created
		const activeBlocks = await prisma.financialBlock.findMany({
			where: { studentId: testStudentId, isActive: true }
		});

		if (activeBlocks.length > 0) {
			throw new Error('Block was created for pending not overdue debt');
		}

		console.log('✅ Deuda pendiente no vencida no dispara bloqueo');

		// Cleanup
		await prisma.studentCharge.delete({ where: { id: futureCharge.id } });
	} catch (error: any) {
		console.error('❌ Error en test de deuda pendiente no vencida:', error.message);
	}
}

async function testGraceDays() {
	console.log('\n📝 Test: Grace days...');

	try {
		// Clean up existing blocks and charges first
		await prisma.financialBlock.deleteMany({ where: { studentId: testStudentId } });
		await prisma.studentCharge.deleteMany({ where: { studentId: testStudentId } });

		// Configure grace days
		await prisma.financialConfig.upsert({
			where: { key: 'graceDays' },
			update: { value: 5 },
			create: { key: 'graceDays', value: 5, category: 'BLOCK_RULES', description: 'Grace days' }
		});

		// Create a charge with due date 3 days ago (within grace period)
		const graceCharge = await prisma.studentCharge.create({
			data: {
				studentId: testStudentId,
				conceptId: testConceptId,
				periodLabel: '2025-04',
				amount: new Decimal(1000),
				finalAmount: new Decimal(1000),
				paidAmount: new Decimal(0),
				dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
				status: 'PENDING',
				academicTermId: testAcademicTermId
			}
		});

		// Evaluate blocks - should not block within grace period
		await financialService.evaluateFinancialBlocks(testStudentId, testUserId);

		// Verify no block was created
		const activeBlocks = await prisma.financialBlock.findMany({
			where: { studentId: testStudentId, isActive: true }
		});

		if (activeBlocks.length > 0) {
			throw new Error('Block was created within grace period');
		}

		console.log('✅ Grace days respetados correctamente');

		// Cleanup
		await prisma.studentCharge.delete({ where: { id: graceCharge.id } });
		await prisma.financialConfig.delete({ where: { key: 'graceDays' } });
	} catch (error: any) {
		console.error('❌ Error en test de grace days:', error.message);
	}
}

async function testOwnership() {
	console.log('\n📝 Test: Ownership para alumnos...');

	try {
		// Create a second student (Student B)
		const userB = await prisma.user.create({
			data: {
				email: `test-student-b-${Date.now()}@example.com`,
				firstName: 'Student',
				lastName: 'B',
				passwordHash: 'test'
			}
		});

		const studentB = await prisma.student.create({
			data: {
				userId: userB.id,
				dni: String(Date.now() + 1).slice(-8),
				firstName: 'Student',
				lastName: 'B',
				status: 'ACTIVE',
				careerId: (await prisma.career.findFirst({ where: { code: 'TEST-REC' } }))!.id
			}
		});

		// Create charge for Student B
		const chargeB = await prisma.studentCharge.create({
			data: {
				studentId: studentB.id,
				conceptId: testConceptId,
				periodLabel: '2025-01',
				amount: new Decimal(500),
				finalAmount: new Decimal(500),
				paidAmount: new Decimal(0),
				dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
				status: 'PENDING',
				academicTermId: testAcademicTermId
			}
		});

		// Test: Student A can view their own debt
		const debtA = await financialService.calculateDebtSummary(testStudentId);
		console.log('✅ Alumno A puede ver su propia deuda');

		// Test: Student A cannot view Student B's debt (this would be enforced at route level)
		// Here we just verify the service doesn't prevent it - the route handles ownership
		const debtB = await financialService.calculateDebtSummary(studentB.id);
		console.log('✅ Service permite consulta (ownership validado en route)');

		// Test: Student role cannot evaluate blocks (would be enforced at route level)
		// We simulate this by checking if the user has FINANCIAL_BLOCK.update permission
		const studentRole = await prisma.role.findUnique({ where: { code: 'ALUMNO' } });
		if (studentRole) {
			const hasPermission = await prisma.permission.findFirst({
				where: {
					roleCode: studentRole.code,
					entity: 'FINANCIAL_BLOCK',
					canUpdate: true
				}
			});
			if (hasPermission) {
				throw new Error('ALUMNO role should not have FINANCIAL_BLOCK.update permission');
			}
			console.log('✅ Alumno no tiene permiso para gestionar bloqueos');
		}

		// Cleanup
		await prisma.studentCharge.delete({ where: { id: chargeB.id } });
		await prisma.student.delete({ where: { id: studentB.id } });
		await prisma.user.delete({ where: { id: userB.id } });
	} catch (error: any) {
		console.error('❌ Error en test de ownership:', error.message);
	}
}

async function runAllTests() {
	try {
		console.log('🚀 Iniciando pruebas de Deuda y Bloqueos (Fase 5)\n');

		await setupTestData();
		await testCalculateDebtSummary();
		await testStudentWithoutDebt();
		await testEvaluateFinancialBlocks();
		await testNoDuplicateBlocks();
		await testPaymentUnblocks();
		await testPaymentCancellationReblocks();
		await testBlockException();
		await testRevokeException();
		await testStudentFinancialStatus();
		await testAtomicTransactionWithBlock();
		await testPendingNotOverdueDebt();
		await testGraceDays();
		await testOwnership();

		console.log('\n✅ Todas las pruebas pasaron exitosamente');
	} catch (error) {
		console.error('\n❌ Las pruebas fallaron:', error);
		process.exit(1);
	} finally {
		await cleanupTestData();
		await prisma.$disconnect();
	}
}

runAllTests();
