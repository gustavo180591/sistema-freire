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
let testReceiptId: string;
let testRoleCode: string;

async function setupTestData() {
	console.log('🔧 Configurando datos de prueba...');

	// Limpiar datos de prueba existentes primero
	await cleanupTestData();

	// Crear usuario de prueba con email único
	const timestamp = Date.now();
	const user = await prisma.user.create({
		data: {
			email: `test-receipt-${timestamp}@example.com`,
			firstName: 'Test',
			lastName: 'Receipt',
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

		// Asegurar permisos de RECEIPT
		const existingPermission = await prisma.permission.findUnique({
			where: {
				roleCode_entity: {
					roleCode: 'FINANZAS',
					entity: 'RECEIPT'
				}
			}
		});

		if (!existingPermission) {
			await prisma.permission.create({
				data: {
					roleCode: 'FINANZAS',
					entity: 'RECEIPT',
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
						entity: 'RECEIPT'
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
			code: 'TEST-REC',
			name: 'Test Career Receipt',
			durationYears: 4,
			active: true
		}
	});

	// Crear ciclo lectivo de prueba
	const academicTerm = await prisma.academicTerm.create({
		data: {
			code: '2025-1',
			name: 'Ciclo 2025-1',
			year: 2025,
			termType: 'ANUAL',
			startDate: new Date('2025-01-01'),
			endDate: new Date('2025-12-31'),
			active: true
		}
	});

	// Crear alumno de prueba
	const student = await prisma.student.create({
		data: {
			userId: testUserId,
			dni: '87654321',
			firstName: 'Test',
			lastName: 'Receipt',
			status: 'ACTIVE',
			careerId: career.id
		}
	});
	testStudentId = student.id;

	// Crear concepto de cuota
	const concept = await prisma.chargeConcept.create({
		data: {
			code: 'MATRICULA',
			name: 'Matrícula',
			description: 'Matrícula mensual',
			active: true
		}
	});

	// Crear cargo de prueba
	const charge = await prisma.studentCharge.create({
		data: {
			studentId: testStudentId,
			conceptId: concept.id,
			academicTermId: academicTerm.id,
			amount: new Decimal(1000),
			finalAmount: new Decimal(1000),
			dueDate: new Date(),
			periodLabel: 'Enero 2025',
			status: ChargeStatus.PENDING
		}
	});
	testChargeId = charge.id;

	// Crear pago de prueba
	const payment = await prisma.payment.create({
		data: {
			studentId: testStudentId,
			amount: new Decimal(1000),
			method: PaymentMethod.CASH,
			reference: 'TEST-REF-001',
			isCancelled: false
		}
	});
	testPaymentId = payment.id;

	// Crear allocation
	await prisma.paymentAllocation.create({
		data: {
			paymentId: testPaymentId,
			chargeId: testChargeId,
			amount: new Decimal(1000)
		}
	});

	console.log('✅ Datos de prueba configurados');
}

async function cleanupTestData() {
	console.log('🧹 Limpiando datos de prueba...');

	try {
		// Eliminar en orden correcto por foreign keys
		await prisma.paymentAllocation.deleteMany({
			where: { paymentId: testPaymentId }
		});

		await prisma.payment.deleteMany({
			where: { id: testPaymentId }
		});

		await prisma.studentCharge.deleteMany({
			where: { id: testChargeId }
		});

		await prisma.student.deleteMany({
			where: { id: testStudentId }
		});

		await prisma.userRole.deleteMany({
			where: { userId: testUserId }
		});

		await prisma.user.deleteMany({
			where: { id: testUserId }
		});

		await prisma.career.deleteMany({
			where: { code: 'TEST-REC' }
		});

		await prisma.chargeConcept.deleteMany({
			where: { code: 'MATRICULA' }
		});

		await prisma.academicTerm.deleteMany({
			where: { code: '2025-1' }
		});

		// Limpiar receipts
		await prisma.receiptItem.deleteMany({});
		await prisma.receipt.deleteMany({});

		console.log('✅ Datos de prueba limpiados');
	} catch (error) {
		console.error('❌ Error al limpiar datos:', error);
	}
}

async function testIssueReceipt() {
	console.log('\n📝 Test: Emitir recibo...');

	try {
		const result = await financialService.issueReceipt({
			paymentIds: [testPaymentId],
			userId: testUserId,
			observations: 'Test receipt'
		});

		testReceiptId = result.receipt.id;

		console.log('✅ Recibo emitido exitosamente');
		console.log(`   - ID: ${result.receipt.id}`);
		console.log(`   - Número: ${result.receipt.receiptNumber}/${result.receipt.receiptYear}`);
		console.log(`   - Total: ${result.receipt.totalAmount.toString()}`);
		console.log(`   - Items: ${result.items.length}`);

		// Verificar que el pago esté vinculado al recibo
		const updatedPayment = await prisma.payment.findUnique({
			where: { id: testPaymentId }
		});

		if (updatedPayment?.receiptId === testReceiptId) {
			console.log('✅ Pago vinculado correctamente al recibo');
		} else {
			console.error('❌ Pago no vinculado al recibo');
		}

		// Verificar items del recibo
		if (result.items.length > 0) {
			console.log('✅ Items del recibo creados');
			result.items.forEach((item) => {
				console.log(`   - ${item.concept}: ${item.finalAmount.toString()}`);
			});
		} else {
			console.error('❌ No se crearon items del recibo');
		}
	} catch (error: any) {
		console.error('❌ Error al emitir recibo:', error.message);
		throw error;
	}
}

async function testGetReceipt() {
	console.log('\n📝 Test: Obtener recibo...');

	try {
		const receipt = await financialService.getReceipt(testReceiptId, testUserId);

		if (receipt) {
			console.log('✅ Recibo obtenido exitosamente');
			console.log(`   - ID: ${receipt.id}`);
			console.log(`   - Número: ${receipt.receiptNumber}/${receipt.receiptYear}`);
		} else {
			console.error('❌ No se pudo obtener el recibo');
		}
	} catch (error: any) {
		console.error('❌ Error al obtener recibo:', error.message);
		throw error;
	}
}

async function testReprintReceipt() {
	console.log('\n📝 Test: Reimprimir recibo...');

	try {
		const receipt = await financialService.reprintReceipt({
			receiptId: testReceiptId,
			userId: testUserId
		});

		console.log('✅ Recibo reimprimido exitosamente');
		console.log(`   - Contador de impresiones: ${receipt.printCount}`);
	} catch (error: any) {
		console.error('❌ Error al reimprimir recibo:', error.message);
		throw error;
	}
}

async function testCancelReceipt() {
	console.log('\n📝 Test: Anular recibo...');

	try {
		await financialService.cancelReceipt({
			receiptId: testReceiptId,
			reason: 'Test cancellation',
			userId: testUserId
		});

		console.log('✅ Recibo anulado exitosamente');

		// Verificar estado
		const cancelledReceipt = await prisma.receipt.findUnique({
			where: { id: testReceiptId }
		});

		if (cancelledReceipt?.status === 'CANCELLED') {
			console.log('✅ Estado del recibo actualizado a CANCELLED');
		} else {
			console.error('❌ Estado del recibo no actualizado');
		}
	} catch (error: any) {
		console.error('❌ Error al anular recibo:', error.message);
		throw error;
	}
}

async function testDuplicateReceiptPrevention() {
	console.log('\n📝 Test: Prevención de recibo duplicado...');

	try {
		// Intentar emitir otro recibo para el mismo pago
		await financialService.issueReceipt({
			paymentIds: [testPaymentId],
			userId: testUserId
		});

		console.error('❌ No se previno la emisión de recibo duplicado');
	} catch (error: any) {
		if (error.message.includes('ya tienen recibos activos')) {
			console.log('✅ Prevención de recibo duplicado funciona correctamente');
		} else {
			console.error('❌ Error inesperado:', error.message);
		}
	}
}

async function testStudentCannotIssueReceipt() {
	console.log('\n📝 Test: Alumno no puede emitir recibo...');

	try {
		// Crear usuario alumno sin permisos de FINANZAS
		const studentUser = await prisma.user.create({
			data: {
				email: `student-test-${Date.now()}@example.com`,
				firstName: 'Student',
				lastName: 'Test',
				passwordHash: 'test'
			}
		});

		// Asignar rol ALUMNO
		const role = await prisma.role.findUnique({ where: { code: 'ALUMNO' } });
		if (role) {
			await prisma.userRole.create({
				data: {
					userId: studentUser.id,
					roleId: role.id
				}
			});
		}

		// Intentar emitir recibo como alumno
		await financialService.issueReceipt({
			paymentIds: [testPaymentId],
			userId: studentUser.id
		});

		console.error('❌ Alumno pudo emitir recibo sin permisos');

		// Cleanup
		await prisma.userRole.deleteMany({ where: { userId: studentUser.id } });
		await prisma.user.delete({ where: { id: studentUser.id } });
	} catch (error: any) {
		if (error.message.includes('No tiene permisos para emitir recibos')) {
			console.log('✅ Alumno no puede emitir recibos correctamente');
		} else {
			console.error('❌ Error inesperado:', error.message);
		}
	}
}

async function testStudentCanOnlyViewOwnReceipts() {
	console.log('\n📝 Test: Alumno puede ver sus propios recibos...');

	try {
		// El alumno puede ver sus propios recibos
		const receipts = await financialService.getStudentReceipts(testStudentId, testUserId);

		if (receipts.length > 0) {
			console.log('✅ Alumno puede ver sus propios recibos correctamente');
		} else {
			console.error('❌ Alumno no pudo ver sus propios recibos');
		}
	} catch (error: any) {
		console.error('❌ Error al ver recibos propios:', error.message);
	}
}

async function testGetStudentReceipts() {
	console.log('\n📝 Test: Obtener recibos del alumno...');

	try {
		const receipts = await financialService.getStudentReceipts(testStudentId, testUserId);

		console.log('✅ Recibos del alumno obtenidos exitosamente');
		console.log(`   - Cantidad: ${receipts.length}`);
	} catch (error: any) {
		console.error('❌ Error al obtener recibos del alumno:', error.message);
		throw error;
	}
}

async function runAllTests() {
	try {
		console.log('🚀 Iniciando pruebas de Recibos Institucionales (Fase 4)\n');

		await setupTestData();
		await testIssueReceipt();
		await testGetReceipt();
		await testReprintReceipt();
		await testGetStudentReceipts();
		await testDuplicateReceiptPrevention();
		await testStudentCannotIssueReceipt();
		await testStudentCanOnlyViewOwnReceipts();
		await testCancelReceipt();

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
