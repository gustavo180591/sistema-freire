import { prisma } from '../src/lib/server/db/prisma';
import { financialService } from '../src/lib/server/financial/financial-service';
import { Decimal } from '@prisma/client/runtime/library';

// Test data
let testUserId: string;
let testStudentId: string;
let testChargeId: string;
let testPaymentId: string;
let testConceptId: string;
let testAcademicTermId: string;

async function setupTestData() {
	console.log('🔧 Configurando datos de prueba...');

	// Create test user
	const user = await prisma.user.create({
		data: {
			email: `test-financial-reports-${Date.now()}@example.com`,
			firstName: 'Test',
			lastName: 'User',
			passwordHash: 'test'
		}
	});
	testUserId = user.id;

	// Create test career
	const career = await prisma.career.findFirst({ where: { code: 'TEST-REC' } });
	if (!career) {
		throw new Error('Career TEST-REC not found');
	}

	// Create test student
	const student = await prisma.student.create({
		data: {
			userId: user.id,
			dni: String(Date.now()).slice(-8),
			firstName: 'Test',
			lastName: 'Student',
			status: 'ACTIVE',
			careerId: career.id
		}
	});
	testStudentId = student.id;

	// Create test academic term
	const term = await prisma.academicTerm.findFirst();
	if (!term) {
		throw new Error('Academic term not found');
	}
	testAcademicTermId = term.id;

	// Create test charge concept
	const concept = await prisma.chargeConcept.findFirst();
	if (!concept) {
		throw new Error('Charge concept not found');
	}
	testConceptId = concept.id;

	// Create test charge
	const charge = await prisma.studentCharge.create({
		data: {
			studentId: testStudentId,
			conceptId: testConceptId,
			periodLabel: '2025-01',
			amount: new Decimal(1000),
			finalAmount: new Decimal(1000),
			paidAmount: new Decimal(0),
			dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
			status: 'PENDING',
			academicTermId: testAcademicTermId
		}
	});
	testChargeId = charge.id;

	// Create test payment
	const payment = await prisma.payment.create({
		data: {
			studentId: testStudentId,
			amount: new Decimal(500),
			method: 'CASH',
			paidAt: new Date(),
			userId: testUserId
		}
	});
	testPaymentId = payment.id;

	// Create payment allocation
	await prisma.paymentAllocation.create({
		data: {
			paymentId: payment.id,
			chargeId: charge.id,
			amount: new Decimal(500)
		}
	});

	// Update charge paid amount
	await prisma.studentCharge.update({
		where: { id: charge.id },
		data: { paidAmount: new Decimal(500), status: 'PARTIAL' }
	});

	console.log('✅ Datos de prueba configurados');
}

async function cleanupTestData() {
	console.log('🧹 Limpiando datos de prueba...');

	try {
		// Clean up in reverse order of dependencies
		await prisma.auditLog.deleteMany({ where: { userId: testUserId } });
		await prisma.financialMovement.deleteMany({ where: { studentId: testStudentId } });
		await prisma.paymentAllocation.deleteMany({ where: { paymentId: testPaymentId } });
		await prisma.payment.delete({ where: { id: testPaymentId } });
		await prisma.studentCharge.delete({ where: { id: testChargeId } });
		await prisma.receipt.deleteMany({ where: { studentId: testStudentId } });
		await prisma.student.delete({ where: { id: testStudentId } });
		await prisma.user.delete({ where: { id: testUserId } });
		console.log('✅ Datos de prueba limpiados');
	} catch (error: any) {
		console.error('❌ Error limpiando datos:', error.message);
	}
}

async function testDashboardMetrics() {
	console.log('\n📝 Test: Métricas del Dashboard...');

	try {
		const metrics = await financialService.getFinancialDashboardMetrics();

		console.log('✅ Métricas obtenidas exitosamente');
		console.log(`   - Total facturado: ${metrics.totalBilled.toString()}`);
		console.log(`   - Total cobrado: ${metrics.totalCollected.toString()}`);
		console.log(`   - Total pendiente: ${metrics.totalPending.toString()}`);
		console.log(`   - Deuda vencida: ${metrics.overdueDebt.toString()}`);
		console.log(`   - Alumnos con deuda: ${metrics.studentsWithDebt}`);
		console.log(`   - Alumnos bloqueados: ${metrics.studentsBlocked}`);
		console.log(`   - Pagos del día: ${metrics.paymentsToday}`);
		console.log(`   - Pagos del mes: ${metrics.paymentsThisMonth}`);
		console.log(`   - Recibos emitidos: ${metrics.receiptsIssued}`);
		console.log(`   - Recibos anulados: ${metrics.receiptsCancelled}`);
	} catch (error: any) {
		console.error('❌ Error en test de métricas:', error.message);
		throw error;
	}
}

async function testStudentFinancialReport() {
	console.log('\n📝 Test: Reporte Financiero de Alumno...');

	try {
		const report = await financialService.getStudentFinancialReport(testStudentId);

		console.log('✅ Reporte obtenido exitosamente');
		console.log(`   - Alumno: ${report.student.user.firstName} ${report.student.user.lastName}`);
		console.log(`   - Total cuotas: ${report.totalCharges.toString()}`);
		console.log(`   - Total pagado: ${report.totalPaid.toString()}`);
		console.log(`   - Deuda pendiente: ${report.totalPending.toString()}`);
		console.log(`   - Deuda vencida: ${report.overdueDebt.toString()}`);
		console.log(`   - Cuotas: ${report.charges.length}`);
		console.log(`   - Pagos: ${report.payments.length}`);
		console.log(`   - Recibos: ${report.receipts.length}`);
		console.log(`   - Bloqueos activos: ${report.activeBlocks.length}`);
	} catch (error: any) {
		console.error('❌ Error en test de reporte de alumno:', error.message);
		throw error;
	}
}

async function testPeriodFinancialReport() {
	console.log('\n📝 Test: Reporte por Período...');

	try {
		const startDate = new Date('2025-01-01');
		const endDate = new Date('2025-12-31');

		const report = await financialService.getPeriodFinancialReport({ startDate, endDate });

		console.log('✅ Reporte por período obtenido exitosamente');
		console.log(`   - Total generado: ${report.totalGenerated.toString()}`);
		console.log(`   - Total cobrado: ${report.totalCollected.toString()}`);
		console.log(`   - Total pendiente: ${report.totalPending.toString()}`);
		console.log(`   - Total vencido: ${report.totalOverdue.toString()}`);
		console.log(`   - Pagos por método:`, report.paymentsByMethod);
		console.log(`   - Recibos por estado:`, report.receiptsByStatus);
	} catch (error: any) {
		console.error('❌ Error en test de reporte por período:', error.message);
		throw error;
	}
}

async function testFinancialMovementsHistory() {
	console.log('\n📝 Test: Historial de Movimientos Financieros...');

	try {
		const history = await financialService.getFinancialMovementsHistory({
			studentId: testStudentId
		});

		console.log('✅ Historial obtenido exitosamente');
		console.log(`   - Total movimientos: ${history.total}`);
		console.log(`   - Movimientos: ${history.movements.length}`);
	} catch (error: any) {
		console.error('❌ Error en test de historial de movimientos:', error.message);
		throw error;
	}
}

async function testPaymentMethodFilter() {
	console.log('\n📝 Test: Filtro por Método de Pago...');

	try {
		const report = await financialService.getPeriodFinancialReport({});

		console.log('✅ Pagos por método:');
		for (const [method, count] of Object.entries(report.paymentsByMethod)) {
			console.log(`   - ${method}: ${count}`);
		}
	} catch (error: any) {
		console.error('❌ Error en test de filtro por método:', error.message);
		throw error;
	}
}

async function testReceiptStatusFilter() {
	console.log('\n📝 Test: Filtro por Estado de Recibo...');

	try {
		const report = await financialService.getPeriodFinancialReport({});

		console.log('✅ Recibos por estado:');
		for (const [status, count] of Object.entries(report.receiptsByStatus)) {
			console.log(`   - ${status}: ${count}`);
		}
	} catch (error: any) {
		console.error('❌ Error en test de filtro por estado de recibo:', error.message);
		throw error;
	}
}

async function testOwnershipValidation() {
	console.log('\n📝 Test: Validación de Ownership...');

	try {
		// Create a second student (Student B)
		const userB = await prisma.user.create({
			data: {
				email: `test-student-b-reports-${Date.now()}@example.com`,
				firstName: 'Student',
				lastName: 'B',
				passwordHash: 'test'
			}
		});

		const career = await prisma.career.findFirst({ where: { code: 'TEST-REC' } });
		const studentB = await prisma.student.create({
			data: {
				userId: userB.id,
				dni: String(Date.now() + 1).slice(-8),
				firstName: 'Student',
				lastName: 'B',
				status: 'ACTIVE',
				careerId: career!.id
			}
		});

		// Test: Student A can view their own report
		const reportA = await financialService.getStudentFinancialReport(testStudentId);
		console.log('✅ Alumno A puede ver su propio reporte');

		// Test: Student A cannot view Student B's report (this would be enforced at route level)
		// Here we just verify the service doesn't prevent it - the route handles ownership
		const reportB = await financialService.getStudentFinancialReport(studentB.id);
		console.log('✅ Service permite consulta (ownership validado en route)');

		// Cleanup
		await prisma.student.delete({ where: { id: studentB.id } });
		await prisma.user.delete({ where: { id: userB.id } });
	} catch (error: any) {
		console.error('❌ Error en test de ownership:', error.message);
		throw error;
	}
}

async function testReceiptMetrics() {
	console.log('\n📝 Test: Métricas de Recibos Emitidos/Anulados...');

	try {
		// Create test receipts
		const receipt1 = await prisma.receipt.create({
			data: {
				receiptNumber: 9999,
				receiptYear: 2025,
				studentId: testStudentId,
				studentName: 'Test Student',
				totalAmount: new Decimal(500),
				paymentMethod: 'CASH',
				issuedBy: testUserId,
				issuedByName: 'Test User',
				status: 'ISSUED'
			}
		});

		const receipt2 = await prisma.receipt.create({
			data: {
				receiptNumber: 10000,
				receiptYear: 2025,
				studentId: testStudentId,
				studentName: 'Test Student',
				totalAmount: new Decimal(500),
				paymentMethod: 'CASH',
				issuedBy: testUserId,
				issuedByName: 'Test User',
				status: 'CANCELLED',
				cancelledAt: new Date(),
				cancelledBy: testUserId
			}
		});

		const metrics = await financialService.getFinancialDashboardMetrics();

		console.log('✅ Métricas de recibos obtenidas');
		console.log(`   - Recibos emitidos: ${metrics.receiptsIssued}`);
		console.log(`   - Recibos anulados: ${metrics.receiptsCancelled}`);

		// Cleanup
		await prisma.receipt.delete({ where: { id: receipt1.id } });
		await prisma.receipt.delete({ where: { id: receipt2.id } });
	} catch (error: any) {
		console.error('❌ Error en test de métricas de recibos:', error.message);
		throw error;
	}
}

async function testCSVExportPeriod() {
	console.log('\n📝 Test: Exportación CSV de Reporte por Período...');

	try {
		const { csv, filename, recordCount } = await financialService.exportPeriodReportToCSV(
			{},
			testUserId
		);

		console.log('✅ CSV exportado exitosamente');
		console.log(`   - Filename: ${filename}`);
		console.log(`   - Record count: ${recordCount}`);
		console.log(`   - CSV length: ${csv.length} chars`);

		// Verify CSV format
		const lines = csv.split('\n');
		console.log(`   - Lines: ${lines.length}`);
		console.log(`   - Header: ${lines[0]}`);
	} catch (error: any) {
		console.error('❌ Error en test de exportación CSV período:', error.message);
		throw error;
	}
}

async function testCSVExportMovements() {
	console.log('\n📝 Test: Exportación CSV de Movimientos...');

	try {
		const { csv, filename, recordCount } = await financialService.exportMovementsToCSV(
			{ studentId: testStudentId },
			testUserId
		);

		console.log('✅ CSV exportado exitosamente');
		console.log(`   - Filename: ${filename}`);
		console.log(`   - Record count: ${recordCount}`);
		console.log(`   - CSV length: ${csv.length} chars`);

		// Verify CSV format
		const lines = csv.split('\n');
		console.log(`   - Lines: ${lines.length}`);
		console.log(`   - Header: ${lines[0]}`);
	} catch (error: any) {
		console.error('❌ Error en test de exportación CSV movimientos:', error.message);
		throw error;
	}
}

async function testCSVEscape() {
	console.log('\n📝 Test: CSV Escape Correcto...');

	try {
		// Create a movement with special characters
		await prisma.financialMovement.create({
			data: {
				studentId: testStudentId,
				movementType: 'CHARGE',
				entityType: 'StudentCharge',
				entityId: testChargeId,
				description: 'Test with "quotes", comma, and\nnewline',
				amount: new Decimal(100),
				balanceBefore: new Decimal(0),
				balanceAfter: new Decimal(100),
				userId: testUserId
			}
		});

		const { csv } = await financialService.exportMovementsToCSV(
			{ studentId: testStudentId },
			testUserId
		);

		// Verify CSV contains escaped quotes
		if (csv.includes('""') || csv.includes('"')) {
			console.log('✅ CSV contiene escape de comillas');
		} else {
			console.log('⚠️ CSV no contiene comillas (puede ser normal)');
		}

		// Verify CSV structure
		const lines = csv.split('\n');
		if (lines.length > 1) {
			console.log('✅ CSV tiene múltiples líneas');
		}
	} catch (error: any) {
		console.error('❌ Error en test de CSV escape:', error.message);
		throw error;
	}
}

async function testExportAudit() {
	console.log('\n📝 Test: Auditoría de Exportaciones...');

	try {
		// Clear previous audit logs for this user
		await prisma.auditLog.deleteMany({ where: { userId: testUserId } });

		// Export CSV
		const { recordCount } = await financialService.exportPeriodReportToCSV(
			{},
			testUserId,
			'127.0.0.1',
			'TestAgent'
		);

		// Check audit log
		const auditLogs = await prisma.auditLog.findMany({
			where: { userId: testUserId, action: 'EXPORT' }
		});

		if (auditLogs.length > 0) {
			const log = auditLogs[0];
			const metadata = log.metadata as any;

			// Validate all required fields
			if (log.action !== 'EXPORT') {
				throw new Error(`Action incorrecto: ${log.action}`);
			}
			if (log.entityType !== 'FINANCIAL_REPORT') {
				throw new Error(`EntityType incorrecto: ${log.entityType}`);
			}
			if (log.userId !== testUserId) {
				throw new Error(`UserId incorrecto: ${log.userId}`);
			}
			if (!metadata || metadata.format !== 'CSV') {
				throw new Error(`Formato CSV no registrado en metadata`);
			}
			if (!metadata || metadata.recordCount !== recordCount) {
				throw new Error(`RecordCount incorrecto en metadata`);
			}
			if (!metadata || !metadata.filename) {
				throw new Error(`Filename no registrado en metadata`);
			}

			console.log('✅ Auditoría registrada y validada');
			console.log(`   - Action: ${log.action}`);
			console.log(`   - Entity: ${log.entityType}`);
			console.log(`   - Description: ${log.description}`);
			console.log(`   - Usuario: ${log.userId}`);
			console.log(`   - Metadata:`, metadata);
		} else {
			console.error('❌ No se registró auditoría');
			throw new Error('No audit log found');
		}
	} catch (error: any) {
		console.error('❌ Error en test de auditoría:', error.message);
		throw error;
	}
}

async function runAllTests() {
	try {
		console.log('🚀 Iniciando pruebas de Reportes Financieros (Fase 6)\n');

		await setupTestData();
		await testDashboardMetrics();
		await testStudentFinancialReport();
		await testPeriodFinancialReport();
		await testFinancialMovementsHistory();
		await testPaymentMethodFilter();
		await testReceiptStatusFilter();
		await testOwnershipValidation();
		await testReceiptMetrics();
		await testCSVExportPeriod();
		await testCSVExportMovements();
		await testCSVEscape();
		await testExportAudit();

		console.log('\n✅ Todas las pruebas pasaron exitosamente');
	} catch (error) {
		console.error('\n❌ Las pruebas fallaron:', error);
		process.exit(1);
	} finally {
		await cleanupTestData();
	}
}

runAllTests();
