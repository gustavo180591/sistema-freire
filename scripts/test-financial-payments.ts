import { PrismaClient, PaymentMethod, ChargeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { financialService } from '../src/lib/server/financial/financial-service';
import * as DecimalHelpers from '../src/lib/server/financial/decimal-helpers';

const prisma = new PrismaClient();

// Datos de prueba
let testUserId: string;
let testStudentId: string;
let testChargeId: string;
let testPaymentId: string;

async function setupTestData() {
	console.log('🔧 Configurando datos de prueba...');

	// Crear usuario de prueba
	const user = await prisma.user.create({
		data: {
			email: 'test-payment@example.com',
			firstName: 'Test',
			lastName: 'Payment',
			passwordHash: 'test'
		}
	});
	testUserId = user.id;

	// Asignar rol FINANZAS
	const role = await prisma.role.findUnique({ where: { code: 'FINANZAS' } });
	if (role) {
		await prisma.userRole.create({
			data: {
				userId: testUserId,
				roleId: role.id
			}
		});

		// Asegurar permisos de PAYMENT
		const existingPermission = await prisma.permission.findUnique({
			where: {
				roleCode_entity: {
					roleCode: 'FINANZAS',
					entity: 'PAYMENT'
				}
			}
		});

		if (!existingPermission) {
			await prisma.permission.create({
				data: {
					roleCode: 'FINANZAS',
					entity: 'PAYMENT',
					canCreate: true,
					canRead: true,
					canUpdate: true,
					canDelete: true
				}
			});
		} else {
			await prisma.permission.update({
				where: {
					roleCode_entity: {
						roleCode: 'FINANZAS',
						entity: 'PAYMENT'
					}
				},
				data: {
					canCreate: true,
					canRead: true,
					canUpdate: true,
					canDelete: true
				}
			});
		}
	}

	// Crear carrera de prueba
	const career = await prisma.career.create({
		data: {
			code: 'TEST',
			name: 'Test Career',
			durationYears: 4,
			active: true
		}
	});

	// Crear alumno de prueba
	const student = await prisma.student.create({
		data: {
			userId: testUserId,
			dni: '12345678',
			firstName: 'Test',
			lastName: 'Payment',
			status: 'ACTIVE',
			careerId: career.id
		}
	});
	testStudentId = student.id;

	// Crear concepto de cuota
	const concept = await prisma.chargeConcept.create({
		data: {
			code: 'MATRICULA',
			name: 'Matrícula Mensual',
			description: 'Matrícula mensual',
			active: true
		}
	});

	// Crear ciclo lectivo
	const academicTerm = await prisma.academicTerm.create({
		data: {
			code: '2026',
			name: '2026',
			year: 2026,
			termType: 'ANUAL',
			startDate: new Date('2026-01-01'),
			endDate: new Date('2026-12-31'),
			active: true
		}
	});

	// Crear cuota de prueba
	const charge = await prisma.studentCharge.create({
		data: {
			studentId: testStudentId,
			conceptId: concept.id,
			periodLabel: 'Septiembre 2026',
			amount: new Decimal(10000),
			finalAmount: new Decimal(10000),
			dueDate: new Date('2026-09-15'),
			status: ChargeStatus.PENDING,
			academicTermId: academicTerm.id,
			userId: testUserId
		}
	});
	testChargeId = charge.id;

	console.log('✅ Datos de prueba configurados');
	return { user, student, concept, academicTerm, charge };
}

async function cleanupTestData() {
	console.log('🧹 Limpiando datos de prueba...');

	await prisma.paymentAllocation.deleteMany({});
	await prisma.payment.deleteMany({});
	await prisma.studentCharge.deleteMany({});
	await prisma.chargeConcept.deleteMany({});
	await prisma.academicTerm.deleteMany({});
	await prisma.attendanceEntry.deleteMany({});
	await prisma.studentSubjectStatus.deleteMany({});
	await prisma.studyPlan.deleteMany({});
	await prisma.userRole.deleteMany({});
	await prisma.student.deleteMany({});
	await prisma.career.deleteMany({});
	await prisma.user.deleteMany({});

	console.log('✅ Datos de prueba eliminados');
}

async function testTotalPayment() {
	console.log('\n📝 Test: Pago total de una cuota');

	await cleanupTestData();
	const { charge } = await setupTestData();

	try {
		const result = await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(10000),
			method: PaymentMethod.CASH,
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		// Verificar que se creó el pago
		if (!result.payment) {
			throw new Error('No se creó el pago');
		}

		// Verificar que se creó la allocation
		if (result.allocations.length !== 1) {
			throw new Error(`Debería haber 1 allocation, hay ${result.allocations.length}`);
		}

		// Verificar que la cuota está pagada
		const updatedCharge = await prisma.studentCharge.findUnique({
			where: { id: testChargeId }
		});
		if (!updatedCharge) {
			throw new Error('Cuota no encontrada');
		}
		if (!updatedCharge.paidAmount.equals(new Decimal(10000))) {
			throw new Error(`Monto pagado debería ser 10000, es ${updatedCharge.paidAmount.toString()}`);
		}
		if (updatedCharge.status !== ChargeStatus.PAID) {
			throw new Error(`Estado debería ser PAID, es ${updatedCharge.status}`);
		}

		console.log('✅ Pago total exitoso');
		console.log(`   Pago ID: ${result.payment.id}`);
		console.log(`   Monto: ${result.payment.amount.toString()}`);
		console.log(`   Allocations: ${result.allocations.length}`);
		console.log(`   Estado cuota: ${updatedCharge.status}`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testPartialPayment() {
	console.log('\n📝 Test: Pago parcial');

	await cleanupTestData();
	const { charge } = await setupTestData();

	try {
		const result = await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(5000),
			method: PaymentMethod.CASH,
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		// Verificar que la cuota está parcialmente pagada
		const updatedCharge = await prisma.studentCharge.findUnique({
			where: { id: testChargeId }
		});
		if (!updatedCharge) {
			throw new Error('Cuota no encontrada');
		}
		if (!updatedCharge.paidAmount.equals(new Decimal(5000))) {
			throw new Error(`Monto pagado debería ser 5000, es ${updatedCharge.paidAmount.toString()}`);
		}
		if (updatedCharge.status !== ChargeStatus.PARTIAL) {
			throw new Error(`Estado debería ser PARTIAL, es ${updatedCharge.status}`);
		}

		console.log('✅ Pago parcial exitoso');
		console.log(`   Monto pagado: ${updatedCharge.paidAmount.toString()}`);
		console.log(`   Estado cuota: ${updatedCharge.status}`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testDistributedPayment() {
	console.log('\n📝 Test: Pago distribuido en varias cuotas');

	await cleanupTestData();
	const { concept, academicTerm } = await setupTestData();

	// Eliminar la cuota creada por setupTestData
	await prisma.studentCharge.deleteMany({});

	// Crear 3 conceptos diferentes para evitar colisiones
	const concept2 = await prisma.chargeConcept.create({
		data: {
			code: 'MATRICULA2',
			name: 'Matrícula Mensual 2',
			description: 'Matrícula mensual 2',
			active: true
		}
	});

	const concept3 = await prisma.chargeConcept.create({
		data: {
			code: 'MATRICULA3',
			name: 'Matrícula Mensual 3',
			description: 'Matrícula mensual 3',
			active: true
		}
	});

	// Crear 3 cuotas pendientes
	const charge1 = await prisma.studentCharge.create({
		data: {
			studentId: testStudentId,
			conceptId: concept.id,
			periodLabel: 'Septiembre 2026',
			amount: new Decimal(5000),
			finalAmount: new Decimal(5000),
			dueDate: new Date('2026-09-15'),
			status: ChargeStatus.PENDING,
			academicTermId: academicTerm.id,
			userId: testUserId
		}
	});

	const charge2 = await prisma.studentCharge.create({
		data: {
			studentId: testStudentId,
			conceptId: concept2.id,
			periodLabel: 'Octubre 2026',
			amount: new Decimal(5000),
			finalAmount: new Decimal(5000),
			dueDate: new Date('2026-10-15'),
			status: ChargeStatus.PENDING,
			academicTermId: academicTerm.id,
			userId: testUserId
		}
	});

	const charge3 = await prisma.studentCharge.create({
		data: {
			studentId: testStudentId,
			conceptId: concept3.id,
			periodLabel: 'Noviembre 2026',
			amount: new Decimal(5000),
			finalAmount: new Decimal(5000),
			dueDate: new Date('2026-11-15'),
			status: ChargeStatus.PENDING,
			academicTermId: academicTerm.id,
			userId: testUserId
		}
	});

	try {
		const result = await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(12000),
			method: PaymentMethod.CASH,
			userId: testUserId
		});

		// Verificar que se crearon 3 allocations (FIFO)
		if (result.allocations.length !== 3) {
			throw new Error(`Debería haber 3 allocations, hay ${result.allocations.length}`);
		}

		// Verificar estados de cuotas
		const updatedCharge1 = await prisma.studentCharge.findUnique({ where: { id: charge1.id } });
		const updatedCharge2 = await prisma.studentCharge.findUnique({ where: { id: charge2.id } });
		const updatedCharge3 = await prisma.studentCharge.findUnique({ where: { id: charge3.id } });

		if (!updatedCharge1 || !updatedCharge2 || !updatedCharge3) {
			throw new Error('Alguna cuota no encontrada');
		}

		if (updatedCharge1.status !== ChargeStatus.PAID) {
			throw new Error(`Cuota 1 debería estar PAID, es ${updatedCharge1.status}`);
		}
		if (updatedCharge2.status !== ChargeStatus.PAID) {
			throw new Error(`Cuota 2 debería estar PAID, es ${updatedCharge2.status}`);
		}
		if (updatedCharge3.status !== ChargeStatus.PARTIAL) {
			throw new Error(`Cuota 3 debería estar PARTIAL, es ${updatedCharge3.status}`);
		}

		console.log('✅ Pago distribuido exitoso');
		console.log(`   Allocations: ${result.allocations.length}`);
		console.log(`   Cuota 1: ${updatedCharge1.status} ($${updatedCharge1.paidAmount.toString()})`);
		console.log(`   Cuota 2: ${updatedCharge2.status} ($${updatedCharge2.paidAmount.toString()})`);
		console.log(`   Cuota 3: ${updatedCharge3.status} ($${updatedCharge3.paidAmount.toString()})`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testPaymentExceedsDebt() {
	console.log('\n📝 Test: Pago mayor a la deuda rechazado');

	await cleanupTestData();
	const { charge } = await setupTestData();

	try {
		await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(15000),
			method: PaymentMethod.CASH,
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		throw new Error('Debería haber fallado por monto excedente');
	} catch (error) {
		if (error instanceof Error && error.message.includes('no puede superar la deuda')) {
			console.log('✅ Pago excedente rechazado correctamente');
		} else {
			throw error;
		}
	}
}

async function testNegativeAmount() {
	console.log('\n📝 Test: Pago con monto negativo rechazado');

	await cleanupTestData();
	const { charge } = await setupTestData();

	try {
		await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(-1000),
			method: PaymentMethod.CASH,
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		throw new Error('Debería haber fallado por monto negativo');
	} catch (error) {
		if (error instanceof Error && error.message.includes('no puede ser negativo')) {
			console.log('✅ Monto negativo rechazado correctamente');
		} else {
			throw error;
		}
	}
}

async function testPaymentOnPaidCharge() {
	console.log('\n📝 Test: Pago sobre cuota ya pagada rechazado');

	await cleanupTestData();
	const { charge } = await setupTestData();

	// Pagar la cuota completamente
	await financialService.registerPayment({
		studentId: testStudentId,
		amount: new Decimal(10000),
		method: PaymentMethod.CASH,
		userId: testUserId,
		chargeIds: [testChargeId]
	});

	try {
		await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(1000),
			method: PaymentMethod.CASH,
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		throw new Error('Debería haber fallado por cuota ya pagada');
	} catch (error) {
		if (error instanceof Error && error.message.includes('no están pendientes')) {
			console.log('✅ Pago sobre cuota pagada rechazado correctamente');
		} else {
			throw error;
		}
	}
}

async function testDuplicateReference() {
	console.log('\n📝 Test: Referencia duplicada controlada');

	await cleanupTestData();
	const { charge } = await setupTestData();

	// Registrar primer pago con referencia
	await financialService.registerPayment({
		studentId: testStudentId,
		amount: new Decimal(5000),
		method: PaymentMethod.BANK_TRANSFER,
		reference: 'REF-123',
		userId: testUserId,
		chargeIds: [testChargeId]
	});

	try {
		// Intentar registrar segundo pago con misma referencia
		await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(5000),
			method: PaymentMethod.BANK_TRANSFER,
			reference: 'REF-123',
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		throw new Error('Debería haber fallado por referencia duplicada');
	} catch (error) {
		if (error instanceof Error && error.message.includes('Ya existe un pago con esta referencia')) {
			console.log('✅ Referencia duplicada controlada correctamente');
		} else {
			throw error;
		}
	}
}

async function testCancelPayment() {
	console.log('\n📝 Test: Anulación de pago');

	await cleanupTestData();
	const { charge } = await setupTestData();

	// Registrar pago
	const result = await financialService.registerPayment({
		studentId: testStudentId,
		amount: new Decimal(10000),
		method: PaymentMethod.CASH,
		userId: testUserId,
		chargeIds: [testChargeId]
	});

	testPaymentId = result.payment.id;

	try {
		await financialService.cancelPayment(testPaymentId, 'Error en el registro', testUserId);

		// Verificar que el pago está anulado
		const cancelledPayment = await prisma.payment.findUnique({
			where: { id: testPaymentId }
		});
		if (!cancelledPayment) {
			throw new Error('Pago no encontrado');
		}
		if (!cancelledPayment.isCancelled) {
			throw new Error('El pago debería estar anulado');
		}

		// Verificar que la cuota volvió a pendiente
		const updatedCharge = await prisma.studentCharge.findUnique({
			where: { id: testChargeId }
		});
		if (!updatedCharge) {
			throw new Error('Cuota no encontrada');
		}
		if (!updatedCharge.paidAmount.equals(DecimalHelpers.zero())) {
			throw new Error(`Monto pagado debería ser 0, es ${updatedCharge.paidAmount.toString()}`);
		}
		if (updatedCharge.status !== ChargeStatus.PENDING) {
			throw new Error(`Estado debería ser PENDING, es ${updatedCharge.status}`);
		}

		// Verificar que se eliminaron las allocations
		const allocations = await prisma.paymentAllocation.findMany({
			where: { paymentId: testPaymentId }
		});
		if (allocations.length !== 0) {
			throw new Error(`Debería haber 0 allocations, hay ${allocations.length}`);
		}

		console.log('✅ Anulación de pago exitosa');
		console.log(`   Pago anulado: ${cancelledPayment.isCancelled}`);
		console.log(`   Estado cuota: ${updatedCharge.status}`);
		console.log(`   Allocations eliminadas: ${allocations.length}`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testFinancialMovements() {
	console.log('\n📝 Test: Movimientos financieros creados');

	await cleanupTestData();
	const { charge } = await setupTestData();

	try {
		const result = await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(10000),
			method: PaymentMethod.CASH,
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		// Verificar que se creó el movimiento financiero
		const movements = await prisma.financialMovement.findMany({
			where: { entityId: result.payment.id }
		});
		if (movements.length !== 1) {
			throw new Error(`Debería haber 1 movimiento, hay ${movements.length}`);
		}

		const movement = movements[0];
		if (movement.movementType !== 'PAYMENT') {
			throw new Error(`Tipo debería ser PAYMENT, es ${movement.movementType}`);
		}

		console.log('✅ Movimientos financieros creados correctamente');
		console.log(`   Movimientos: ${movements.length}`);
		console.log(`   Tipo: ${movement.movementType}`);
		console.log(`   Monto: ${movement.amount.toString()}`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testAuditLog() {
	console.log('\n📝 Test: Auditoría real creada');

	await cleanupTestData();
	const { charge } = await setupTestData();

	try {
		const result = await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(10000),
			method: PaymentMethod.CASH,
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		// Verificar que se creó la auditoría
		const auditLogs = await prisma.auditLog.findMany({
			where: { entityType: 'Payment' }
		});
		if (auditLogs.length === 0) {
			throw new Error('No se creó auditoría');
		}

		const auditLog = auditLogs[0];
		if (auditLog.action !== 'CREATE') {
			throw new Error(`Acción debería ser CREATE, es ${auditLog.action}`);
		}

		console.log('✅ Auditoría creada correctamente');
		console.log(`   Acción: ${auditLog.action}`);
		console.log(`   Descripción: ${auditLog.description}`);
		console.log(`   Metadata: ${JSON.stringify(auditLog.metadata)}`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testRollbackOnFailure() {
	console.log('\n📝 Test: Rollback si falla una operación');

	await cleanupTestData();
	const { charge } = await setupTestData();

	try {
		// Intentar registrar pago con monto inválido
		await financialService.registerPayment({
			studentId: testStudentId,
			amount: new Decimal(-1000),
			method: PaymentMethod.CASH,
			userId: testUserId,
			chargeIds: [testChargeId]
		});

		throw new Error('Debería haber fallado');
	} catch (error) {
		// Verificar que no se creó nada para este alumno
		const payments = await prisma.payment.findMany({ where: { studentId: testStudentId } });
		const allocations = await prisma.paymentAllocation.findMany({});
		const movements = await prisma.financialMovement.findMany({
			where: { studentId: testStudentId, entityType: 'Payment' }
		});

		if (payments.length !== 0) {
			throw new Error(`Debería haber 0 pagos, hay ${payments.length}`);
		}
		if (allocations.length !== 0) {
			throw new Error(`Debería haber 0 allocations, hay ${allocations.length}`);
		}
		if (movements.length !== 0) {
			throw new Error(`Debería haber 0 movimientos, hay ${movements.length}`);
		}

		console.log('✅ Rollback funcionó correctamente');
		console.log(`   Pagos: ${payments.length}`);
		console.log(`   Allocations: ${allocations.length}`);
		console.log(`   Movimientos: ${movements.length}`);
	}
}

async function runAllTests() {
	console.log('🚀 Iniciando pruebas funcionales de Fase 3 - Registro de Pagos');
	console.log('===========================================================\n');

	try {
		await testTotalPayment();
		await testPartialPayment();
		await testDistributedPayment();
		await testPaymentExceedsDebt();
		await testNegativeAmount();
		await testPaymentOnPaidCharge();
		await testDuplicateReference();
		await testCancelPayment();
		await testFinancialMovements();
		await testAuditLog();
		await testRollbackOnFailure();

		console.log('\n===========================================================');
		console.log('✅ Todas las pruebas pasaron exitosamente');
	} catch (error) {
		console.error('\n===========================================================');
		console.error('❌ Pruebas fallaron');
		console.error(error);
		process.exit(1);
	} finally {
		console.log('\n🧹 Limpiando datos de prueba...');
		await cleanupTestData();
		await prisma.$disconnect();
	}
}

runAllTests()
	.then(() => {
		console.log('\n🎉 Pruebas completadas');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Error:', error);
		process.exit(1);
	});
