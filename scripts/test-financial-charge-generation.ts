import { prisma } from '../src/lib/server/db/prisma';
import { financialService } from '../src/lib/server/financial/financial-service';
import { Decimal } from '@prisma/client/runtime/library';
import * as DecimalHelpers from '../src/lib/server/financial/decimal-helpers';

async function setupTestData() {
	console.log('🔧 Configurando datos de prueba...');

	// Crear usuario de prueba si no existe
	let user = await prisma.user.findFirst({
		where: { email: 'test-finanzas@freire.edu.ar' }
	});

	if (!user) {
		user = await prisma.user.create({
			data: {
				email: 'test-finanzas@freire.edu.ar',
				passwordHash: 'test',
				firstName: 'Test',
				lastName: 'Finanzas',
				status: 'ACTIVE'
			}
		});
		console.log('✅ Usuario de prueba creado');
	}

	// Asignar rol FINANZAS
	const role = await prisma.role.findFirst({
		where: { code: 'FINANZAS' }
	});

	if (role) {
		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: user.id,
					roleId: role.id
				}
			},
			update: {},
			create: {
				userId: user.id,
				roleId: role.id
			}
		});
		console.log('✅ Rol FINANZAS asignado');
	}

	// Crear alumno de prueba si no existe
	let student = await prisma.student.findFirst({
		where: { dni: '12345678' }
	});

	if (!student) {
		const career = await prisma.career.findFirst();
		if (!career) {
			throw new Error('No hay carreras en la base de datos');
		}

		student = await prisma.student.create({
			data: {
				dni: '12345678',
				firstName: 'Juan',
				lastName: 'Pérez',
				status: 'ACTIVE',
				careerId: career.id,
				userId: user.id
			}
		});
		console.log('✅ Alumno de prueba creado');
	}

	// Crear concepto de cuota si no existe
	let concept = await prisma.chargeConcept.findFirst({
		where: { code: 'MATRICULA' }
	});

	if (!concept) {
		concept = await prisma.chargeConcept.create({
			data: {
				code: 'MATRICULA',
				name: 'Matrícula Mensual',
				description: 'Cuota mensual de matrícula',
				active: true
			}
		});
		console.log('✅ Concepto de cuota creado');
	}

	// Crear ciclo lectivo si no existe
	let academicTerm = await prisma.academicTerm.findFirst({
		where: { active: true }
	});

	if (!academicTerm) {
		academicTerm = await prisma.academicTerm.create({
			data: {
				name: '2026 - 1er Cuatrimestre',
				code: '2026-1',
				year: 2026,
				termType: 'PRIMER_CUATRIMESTRE',
				startDate: new Date('2026-03-01'),
				endDate: new Date('2026-07-31'),
				active: true
			}
		});
		console.log('✅ Ciclo lectivo creado');
	}

	// Crear beca de prueba si no existe
	let scholarship = await prisma.scholarship.findFirst({
		where: { studentId: student.id }
	});

	if (!scholarship) {
		scholarship = await prisma.scholarship.create({
			data: {
				studentId: student.id,
				name: 'Beca Test 50%',
				percentage: new Decimal(50),
				active: true,
				startDate: new Date('2026-01-01'),
				applicableTo: ['MATRICULA', '*'],
				autoApply: true,
				maxMonthlyAmount: new Decimal(5000)
			}
		});
		console.log('✅ Beca de prueba creada');
	}

	// Crear descuento de prueba si no existe
	let discount = await prisma.discount.findFirst({
		where: { code: 'PRONTO_PAGO' }
	});

	if (!discount) {
		discount = await prisma.discount.create({
			data: {
				code: 'PRONTO_PAGO',
				name: 'Descuento Pronto Pago',
				description: '10% de descuento por pago puntual',
				discountType: 'PERCENTAGE',
				value: new Decimal(10),
				applicableTo: ['MATRICULA', '*'],
				minAmount: new Decimal(1000),
				validFrom: new Date('2026-01-01'),
				validUntil: new Date('2026-12-31'),
				active: true,
				priority: 1
			}
		});
		console.log('✅ Descuento de prueba creado');
	}

	return { user, student, concept, academicTerm, scholarship, discount };
}

async function cleanupTestData() {
	console.log('🧹 Limpiando datos de prueba...');

	await prisma.financialMovement.deleteMany({});
	await prisma.studentCharge.deleteMany({});
	await prisma.discount.deleteMany({ where: { code: 'PRONTO_PAGO' } });
	await prisma.scholarship.deleteMany({ where: { name: 'Beca Test 50%' } });
	await prisma.student.deleteMany({ where: { dni: '12345678' } });
	await prisma.student.deleteMany({ where: { dni: '87654321' } });
	await prisma.student.deleteMany({ where: { dni: '11111111' } });
	await prisma.user.deleteMany({ where: { email: 'test-finanzas@freire.edu.ar' } });
	await prisma.user.deleteMany({ where: { email: 'test-finanzas2@freire.edu.ar' } });
	await prisma.user.deleteMany({ where: { email: 'test-finanzas3@freire.edu.ar' } });

	console.log('✅ Datos de prueba eliminados');
}

async function testCreateCharge() {
	console.log('\n📝 Test: Creación individual de cuota');

	const { user, student, concept, academicTerm } = await setupTestData();

	try {
		const result = await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Marzo 2026',
			amount: new Decimal(10000),
			dueDate: new Date('2026-03-15'),
			academicTermId: academicTerm.id,
			notes: 'Cuota de prueba',
			userId: user.id
		});

		console.log('✅ Cuota creada exitosamente');
		console.log(`   ID: ${result.charge.id}`);
		console.log(`   Monto base: ${result.charge.amount.toString()}`);
		console.log(`   Beca aplicada: ${result.charge.scholarshipApplied.toString()}`);
		console.log(`   Descuento aplicado: ${result.charge.discountApplied.toString()}`);
		console.log(`   Monto final: ${result.charge.finalAmount.toString()}`);
		console.log(`   Movimientos creados: ${result.movements.length}`);

		if (result.movements.length !== 1) {
			throw new Error('Se esperaba 1 movimiento financiero');
		}

		const movement = result.movements[0];
		console.log(`   Tipo de movimiento: ${movement.movementType}`);
		console.log(`   Balance antes: ${movement.balanceBefore.toString()}`);
		console.log(`   Balance después: ${movement.balanceAfter.toString()}`);

		return result.charge.id;
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testDuplicatePrevention() {
	console.log('\n📝 Test: Prevención de duplicados');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	try {
		// Primera cuota
		await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Abril 2026',
			amount: new Decimal(10000),
			dueDate: new Date('2026-04-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		// Intentar crear duplicado
		try {
			await financialService.createCharge({
				studentId: student.id,
				conceptId: concept.id,
				periodLabel: 'Abril 2026',
				amount: new Decimal(10000),
				dueDate: new Date('2026-04-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			});
			throw new Error('No se previno el duplicado');
		} catch (error) {
			if (error instanceof Error && error.message.includes('Ya existe una cuota')) {
				console.log('✅ Duplicado prevenido correctamente');
			} else {
				throw error;
			}
		}
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testBulkCharges() {
	console.log('\n📝 Test: Generación masiva de cuotas');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	// Crear segundo usuario y alumno
	const user2 = await prisma.user.create({
		data: {
			email: 'test-finanzas2@freire.edu.ar',
			passwordHash: 'test',
			firstName: 'María',
			lastName: 'García',
			status: 'ACTIVE'
		}
	});

	const student2 = await prisma.student.create({
		data: {
			dni: '87654321',
			firstName: 'María',
			lastName: 'García',
			status: 'ACTIVE',
			careerId: student.careerId,
			userId: user2.id
		}
	});

	try {
		const inputs = [
			{
				studentId: student.id,
				conceptId: concept.id,
				periodLabel: 'Mayo 2026',
				amount: new Decimal(10000),
				dueDate: new Date('2026-05-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			},
			{
				studentId: student2.id,
				conceptId: concept.id,
				periodLabel: 'Mayo 2026',
				amount: new Decimal(10000),
				dueDate: new Date('2026-05-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			}
		];

		const results = await financialService.createBulkCharges(inputs);

		console.log('✅ Cuotas masivas creadas exitosamente');
		console.log(`   Cantidad: ${results.length}`);
		console.log(`   IDs: ${results.map((r) => r.charge.id).join(', ')}`);

		if (results.length !== 2) {
			throw new Error('Se esperaban 2 cuotas');
		}

		// Verificar que ambas tengan movimientos
		for (const result of results) {
			if (result.movements.length !== 1) {
				throw new Error('Se esperaba 1 movimiento por cuota');
			}
		}

		console.log('✅ Todas las cuotas tienen movimientos financieros');
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	} finally {
		await prisma.studentCharge.deleteMany({ where: { studentId: student2.id } });
		await prisma.student.delete({ where: { id: student2.id } });
		await prisma.user.delete({ where: { id: user2.id } });
	}
}

async function testBulkChargesRollback() {
	console.log('\n📝 Test: Rollback en generación masiva');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	// Crear alumno inválido (sin careerId válida)
	try {
		const inputs = [
			{
				studentId: student.id,
				conceptId: concept.id,
				periodLabel: 'Junio 2026',
				amount: new Decimal(10000),
				dueDate: new Date('2026-06-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			},
			{
				studentId: 'invalid-student-id',
				conceptId: concept.id,
				periodLabel: 'Junio 2026',
				amount: new Decimal(10000),
				dueDate: new Date('2026-06-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			}
		];

		try {
			await financialService.createBulkCharges(inputs);
			throw new Error('No se lanzó error por alumno inválido');
		} catch (error) {
			if (error instanceof Error && error.message.includes('Validación falló')) {
				console.log('✅ Validación previa funcionó correctamente');
			} else {
				throw error;
			}
		}

		// Verificar que no se creó ninguna cuota
		const charges = await prisma.studentCharge.findMany({
			where: { periodLabel: 'Junio 2026' }
		});

		if (charges.length > 0) {
			throw new Error('Se crearon cuotas cuando no debían');
		}

		console.log('✅ Rollback funcionó correctamente (no se crearon cuotas)');
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testScholarshipApplication() {
	console.log('\n📝 Test: Aplicación de beca');

	await cleanupTestData();
	const { user, student, concept, academicTerm, scholarship } = await setupTestData();

	try {
		const charge = await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Julio 2026',
			amount: new Decimal(10000),
			dueDate: new Date('2026-07-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		console.log('✅ Cuota creada con beca aplicada');
		console.log(`   Monto base: ${charge.charge.amount.toString()}`);
		console.log(`   Beca aplicada: ${charge.charge.scholarshipApplied.toString()}`);
		console.log(`   Monto final: ${charge.charge.finalAmount.toString()}`);

		// Verificar que la beca sea del 50%
		const expectedScholarship = new Decimal(5000);
		if (!charge.charge.scholarshipApplied.equals(expectedScholarship)) {
			throw new Error(
				`Beca incorrecta: esperada ${expectedScholarship}, obtenida ${charge.charge.scholarshipApplied}`
			);
		}

		console.log('✅ Beca calculada correctamente (50%)');
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testDiscountApplication() {
	console.log('\n📝 Test: Aplicación de descuento');

	await cleanupTestData();
	const { user, student, concept, academicTerm, discount } = await setupTestData();

	try {
		// Desactivar beca para probar solo descuento
		await prisma.scholarship.updateMany({
			where: { studentId: student.id },
			data: { active: false }
		});

		const charge = await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Agosto 2026',
			amount: new Decimal(10000),
			dueDate: new Date('2026-08-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		console.log('✅ Cuota creada con descuento aplicado');
		console.log(`   Monto base: ${charge.charge.amount.toString()}`);
		console.log(`   Descuento aplicado: ${charge.charge.discountApplied.toString()}`);
		console.log(`   Monto final: ${charge.charge.finalAmount.toString()}`);

		// Verificar que el descuento sea del 10%
		const expectedDiscount = new Decimal(1000);
		if (!charge.charge.discountApplied.equals(expectedDiscount)) {
			throw new Error(
				`Descuento incorrecto: esperado ${expectedDiscount}, obtenido ${charge.charge.discountApplied}`
			);
		}

		console.log('✅ Descuento calculado correctamente (10%)');
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	} finally {
		// Reactivar beca
		await prisma.scholarship.updateMany({
			where: { studentId: student.id },
			data: { active: true }
		});
	}
}

async function testAuditLog() {
	console.log('\n📝 Test: Auditoría real');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	try {
		// Limpiar auditoría previa
		await prisma.auditLog.deleteMany({
			where: { userId: user.id }
		});

		await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Septiembre 2026',
			amount: new Decimal(10000),
			dueDate: new Date('2026-09-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		const auditLogs = await prisma.auditLog.findMany({
			where: {
				userId: user.id,
				entityType: 'StudentCharge'
			}
		});

		if (auditLogs.length === 0) {
			throw new Error('No se registró auditoría');
		}

		const auditLog = auditLogs[0];
		console.log('✅ Auditoría registrada correctamente');
		console.log(`   Acción: ${auditLog.action}`);
		console.log(`   Descripción: ${auditLog.description}`);
		console.log(`   Metadata: ${JSON.stringify(auditLog.metadata)}`);

		if (!auditLog.metadata) {
			throw new Error('No se guardó metadata en auditoría');
		}

		const metadata = auditLog.metadata as any;
		if (!metadata.studentId || !metadata.conceptId || !metadata.finalAmount) {
			throw new Error('Metadata incompleta en auditoría');
		}

		console.log('✅ Metadata de auditoría completa');
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testInvalidStudent() {
	console.log('\n📝 Test: Validación de alumno inválido');

	await cleanupTestData();
	const { user, concept, academicTerm } = await setupTestData();

	try {
		await financialService.createCharge({
			studentId: 'invalid-student-id',
			conceptId: concept.id,
			periodLabel: 'Octubre 2026',
			amount: new Decimal(10000),
			dueDate: new Date('2026-10-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});
		throw new Error('No se validó alumno inválido');
	} catch (error) {
		if (error instanceof Error && error.message.includes('Alumno no encontrado')) {
			console.log('✅ Alumno inválido validado correctamente');
		} else {
			throw error;
		}
	}
}

async function testNegativeAmount() {
	console.log('\n📝 Test: Validación de monto negativo');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	try {
		await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Noviembre 2026',
			amount: new Decimal(-1000),
			dueDate: new Date('2026-11-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});
		throw new Error('No se validó monto negativo');
	} catch (error) {
		if (error instanceof Error && error.message.includes('negativo')) {
			console.log('✅ Monto negativo validado correctamente');
		} else {
			throw error;
		}
	}
}

async function testDuplicateControlledError() {
	console.log('\n📝 Test: Duplicado capturado como error controlado');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	try {
		// Primera cuota
		await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Diciembre 2026',
			amount: new Decimal(10000),
			dueDate: new Date('2026-12-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		// Intentar crear duplicado
		try {
			await financialService.createCharge({
				studentId: student.id,
				conceptId: concept.id,
				periodLabel: 'Diciembre 2026',
				amount: new Decimal(10000),
				dueDate: new Date('2026-12-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			});
			throw new Error('No se previno el duplicado');
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes(
					'Ya existe una cuota para este alumno, concepto, período y ciclo lectivo'
				)
			) {
				console.log('✅ Duplicado capturado como error controlado (no 500)');
			} else {
				throw error;
			}
		}
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testDiscountExceedsBaseAmount() {
	console.log('\n📝 Test: Descuento que supera el monto base');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	// Desactivar beca para probar solo descuento
	await prisma.scholarship.updateMany({
		where: { studentId: student.id },
		data: { active: false }
	});

	// Crear descuento que supera el monto base
	const discount = await prisma.discount.create({
		data: {
			code: 'EXCESSIVE',
			name: 'Descuento Excesivo',
			description: 'Descuento que supera el monto base',
			discountType: 'FIXED',
			value: new Decimal(15000),
			applicableTo: [concept.code, '*'],
			validFrom: new Date('2026-01-01'),
			validUntil: new Date('2026-12-31'),
			active: true,
			priority: 1
		}
	});

	try {
		const charge = await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Enero 2027',
			amount: new Decimal(10000),
			dueDate: new Date('2027-01-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		// El descuento debe limitarse al saldo restante
		if (DecimalHelpers.isLessThan(charge.charge.finalAmount, DecimalHelpers.zero())) {
			throw new Error('El monto final es negativo');
		}

		console.log('✅ Descuento limitado al saldo restante');
		console.log(`   Monto base: ${charge.charge.amount.toString()}`);
		console.log(`   Descuento aplicado: ${charge.charge.discountApplied.toString()}`);
		console.log(`   Monto final: ${charge.charge.finalAmount.toString()}`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	} finally {
		await prisma.discount.delete({ where: { id: discount.id } });
		await prisma.scholarship.updateMany({
			where: { studentId: student.id },
			data: { active: true }
		});
	}
}

async function testScholarshipPlusDiscountExceedsBase() {
	console.log('\n📝 Test: Beca + descuento que supera el monto base');

	await cleanupTestData();
	const { user, student, concept, academicTerm, scholarship } = await setupTestData();

	// Actualizar beca a 80%
	await prisma.scholarship.update({
		where: { id: scholarship.id },
		data: { percentage: new Decimal(80) }
	});

	// Crear descuento del 30%
	const discount = await prisma.discount.create({
		data: {
			code: 'HIGH_DISCOUNT',
			name: 'Descuento Alto',
			description: 'Descuento del 30%',
			discountType: 'PERCENTAGE',
			value: new Decimal(30),
			applicableTo: [concept.code, '*'],
			validFrom: new Date('2026-01-01'),
			validUntil: new Date('2026-12-31'),
			active: true,
			priority: 1
		}
	});

	try {
		const charge = await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Febrero 2027',
			amount: new Decimal(10000),
			dueDate: new Date('2027-02-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		// El monto final no debe ser negativo
		if (DecimalHelpers.isLessThan(charge.charge.finalAmount, DecimalHelpers.zero())) {
			throw new Error('El monto final es negativo');
		}

		console.log('✅ Beca + descuento limitados correctamente');
		console.log(`   Monto base: ${charge.charge.amount.toString()}`);
		console.log(`   Beca aplicada: ${charge.charge.scholarshipApplied.toString()}`);
		console.log(`   Descuento aplicado: ${charge.charge.discountApplied.toString()}`);
		console.log(`   Monto final: ${charge.charge.finalAmount.toString()}`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	} finally {
		await prisma.discount.delete({ where: { id: discount.id } });
		await prisma.scholarship.update({
			where: { id: scholarship.id },
			data: { percentage: new Decimal(50) }
		});
	}
}

async function testScholarshipMonthlyLimit() {
	console.log('\n📝 Test: Beca con maxMonthlyAmount');

	await cleanupTestData();
	const { user, student, concept, academicTerm, scholarship } = await setupTestData();

	// Actualizar beca con límite mensual de $3000
	await prisma.scholarship.update({
		where: { id: scholarship.id },
		data: {
			percentage: new Decimal(50),
			maxMonthlyAmount: new Decimal(3000)
		}
	});

	try {
		// Primera cuota de $10000 (50% = $5000, pero limitado a $3000)
		const charge1 = await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Marzo 2027',
			amount: new Decimal(10000),
			dueDate: new Date('2027-03-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		if (!charge1.charge.scholarshipApplied.equals(new Decimal(3000))) {
			throw new Error(
				`Beca debería ser $3000, pero es ${charge1.charge.scholarshipApplied.toString()}`
			);
		}

		console.log('✅ Primera cuota: beca limitada a $3000');

		// Segunda cuota del mismo mes (debería fallar por límite mensual)
		try {
			await financialService.createCharge({
				studentId: student.id,
				conceptId: concept.id,
				periodLabel: 'Marzo 2027 - Segunda',
				amount: new Decimal(10000),
				dueDate: new Date('2027-03-20'),
				academicTermId: academicTerm.id,
				userId: user.id
			});
			throw new Error('La segunda cuota debería fallar por límite mensual');
		} catch (error) {
			if (error instanceof Error && error.message.includes('límite mensual')) {
				console.log('✅ Segunda cuota rechazada por límite mensual');
			} else {
				throw error;
			}
		}
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	} finally {
		await prisma.scholarship.update({
			where: { id: scholarship.id },
			data: {
				percentage: new Decimal(50),
				maxMonthlyAmount: new Decimal(5000)
			}
		});
	}
}

async function testMultipleDiscountsAccumulated() {
	console.log('\n📝 Test: Múltiples descuentos acumulados');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	// Desactivar beca
	await prisma.scholarship.updateMany({
		where: { studentId: student.id },
		data: { active: false }
	});

	// Desactivar descuento PRONTO_PAGO creado en setupTestData
	await prisma.discount.updateMany({
		where: { code: 'PRONTO_PAGO' },
		data: { active: false }
	});

	// Crear dos descuentos
	const discount1 = await prisma.discount.create({
		data: {
			code: 'DISCOUNT1',
			name: 'Descuento 1',
			description: '10% de descuento',
			discountType: 'PERCENTAGE',
			value: new Decimal(10),
			applicableTo: [concept.code, '*'],
			validFrom: new Date('2026-01-01'),
			validUntil: new Date('2026-12-31'),
			active: true,
			priority: 2
		}
	});

	const discount2 = await prisma.discount.create({
		data: {
			code: 'DISCOUNT2',
			name: 'Descuento 2',
			description: '5% de descuento',
			discountType: 'PERCENTAGE',
			value: new Decimal(5),
			applicableTo: [concept.code, '*'],
			validFrom: new Date('2026-01-01'),
			validUntil: new Date('2026-12-31'),
			active: true,
			priority: 1
		}
	});

	try {
		const charge = await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Abril 2027',
			amount: new Decimal(10000),
			dueDate: new Date('2027-04-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		// Descuento total debería ser 15% = $1500
		const expectedDiscount = new Decimal(1500);
		if (!charge.charge.discountApplied.equals(expectedDiscount)) {
			throw new Error(
				`Descuento debería ser $1500, pero es ${charge.charge.discountApplied.toString()}`
			);
		}

		console.log('✅ Múltiples descuentos acumulados correctamente');
		console.log(`   Monto base: ${charge.charge.amount.toString()}`);
		console.log(`   Descuento total: ${charge.charge.discountApplied.toString()}`);
		console.log(`   Monto final: ${charge.charge.finalAmount.toString()}`);
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	} finally {
		await prisma.discount.deleteMany({ where: { code: { in: ['DISCOUNT1', 'DISCOUNT2'] } } });
		await prisma.discount.updateMany({
			where: { code: 'PRONTO_PAGO' },
			data: { active: true }
		});
		await prisma.scholarship.updateMany({
			where: { studentId: student.id },
			data: { active: true }
		});
	}
}

async function testBulkWithDuplicateRollback() {
	console.log('\n📝 Test: Generación masiva con duplicado y rollback total');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	// Crear segundo usuario y alumno
	const user2 = await prisma.user.create({
		data: {
			email: 'test-finanzas3@freire.edu.ar',
			passwordHash: 'test',
			firstName: 'Carlos',
			lastName: 'López',
			status: 'ACTIVE'
		}
	});

	const student2 = await prisma.student.create({
		data: {
			dni: '11111111',
			firstName: 'Carlos',
			lastName: 'López',
			status: 'ACTIVE',
			careerId: student.careerId,
			userId: user2.id
		}
	});

	try {
		// Crear primera cuota
		await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Mayo 2027',
			amount: new Decimal(10000),
			dueDate: new Date('2027-05-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		// Intentar generación masiva con duplicado
		const inputs = [
			{
				studentId: student.id,
				conceptId: concept.id,
				periodLabel: 'Mayo 2027',
				amount: new Decimal(10000),
				dueDate: new Date('2027-05-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			},
			{
				studentId: student2.id,
				conceptId: concept.id,
				periodLabel: 'Mayo 2027',
				amount: new Decimal(10000),
				dueDate: new Date('2027-05-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			}
		];

		try {
			await financialService.createBulkCharges(inputs);
			throw new Error('Debería fallar por duplicado');
		} catch (error) {
			if (error instanceof Error && error.message.includes('Validación falló')) {
				console.log('✅ Generación masiva rechazada por duplicado en validación previa');
			} else {
				throw error;
			}
		}

		// Verificar que no se creó la segunda cuota
		const charges = await prisma.studentCharge.findMany({
			where: {
				studentId: student2.id,
				periodLabel: 'Mayo 2027'
			}
		});

		if (charges.length > 0) {
			throw new Error('Se creó la segunda cuota cuando no debía');
		}

		console.log('✅ Rollback total verificado (no se creó la segunda cuota)');
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	} finally {
		await prisma.studentCharge.deleteMany({ where: { studentId: student2.id } });
		await prisma.student.delete({ where: { id: student2.id } });
		await prisma.user.delete({ where: { id: user2.id } });
	}
}

async function testNoOrphanedMovements() {
	console.log('\n📝 Test: Verificación de movimientos financieros huérfanos');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	try {
		// Crear cuota exitosa
		const result = await financialService.createCharge({
			studentId: student.id,
			conceptId: concept.id,
			periodLabel: 'Junio 2027',
			amount: new Decimal(10000),
			dueDate: new Date('2027-06-15'),
			academicTermId: academicTerm.id,
			userId: user.id
		});

		// Verificar que el movimiento existe y está asociado
		const movement = await prisma.financialMovement.findFirst({
			where: {
				entityId: result.charge.id,
				entityType: 'StudentCharge'
			}
		});

		if (!movement) {
			throw new Error('No se creó el movimiento financiero');
		}

		console.log('✅ Movimiento financiero creado y asociado correctamente');

		// Intentar crear cuota inválida
		try {
			await financialService.createCharge({
				studentId: 'invalid-id',
				conceptId: concept.id,
				periodLabel: 'Junio 2027 - Invalid',
				amount: new Decimal(10000),
				dueDate: new Date('2027-06-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			});
			throw new Error('Debería fallar por alumno inválido');
		} catch (error) {
			if (error instanceof Error && error.message.includes('Alumno no encontrado')) {
				console.log('✅ Cuota inválida rechazada');
			} else {
				throw error;
			}
		}

		// Verificar que no se crearon movimientos huérfanos
		const allCharges = await prisma.studentCharge.findMany({
			select: { id: true }
		});
		const chargeIds = allCharges.map((c) => c.id);

		const allMovements = await prisma.financialMovement.findMany();
		const orphanedMovements = allMovements.filter(
			(m) => m.entityId && !chargeIds.includes(m.entityId)
		);

		if (orphanedMovements.length > 0) {
			throw new Error('Existen movimientos financieros huérfanos');
		}

		console.log('✅ No hay movimientos financieros huérfanos');
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function testNoAuditOnBulkFailure() {
	console.log('\n📝 Test: Verificación de auditoría en fallo de lote');

	await cleanupTestData();
	const { user, student, concept, academicTerm } = await setupTestData();

	try {
		// Limpiar auditoría previa
		await prisma.auditLog.deleteMany({
			where: { userId: user.id }
		});

		// Intentar generación masiva con alumno inválido
		const inputs = [
			{
				studentId: 'invalid-id',
				conceptId: concept.id,
				periodLabel: 'Julio 2027',
				amount: new Decimal(10000),
				dueDate: new Date('2027-07-15'),
				academicTermId: academicTerm.id,
				userId: user.id
			}
		];

		try {
			await financialService.createBulkCharges(inputs);
			throw new Error('Debería fallar por alumno inválido');
		} catch (error) {
			if (error instanceof Error && error.message.includes('Validación falló')) {
				console.log('✅ Generación masiva rechazada en validación previa');
			} else {
				throw error;
			}
		}

		// Verificar que no se registró auditoría de éxito
		const auditLogs = await prisma.auditLog.findMany({
			where: {
				userId: user.id,
				entityType: 'StudentCharge',
				action: 'CREATE'
			}
		});

		if (auditLogs.length > 0) {
			throw new Error('Se registró auditoría de éxito cuando el lote falló');
		}

		console.log('✅ No se registró auditoría de éxito en fallo de lote');
	} catch (error) {
		console.error('❌ Test falló:', error);
		throw error;
	}
}

async function runAllTests() {
	console.log('🚀 Iniciando pruebas funcionales de Fase 2 - Generación de Cuotas\n');
	console.log('='.repeat(60));

	try {
		await cleanupTestData();
		await testCreateCharge();
		await testDuplicatePrevention();
		await testBulkCharges();
		await testBulkChargesRollback();
		await testScholarshipApplication();
		await testDiscountApplication();
		await testAuditLog();
		await testInvalidStudent();
		await testNegativeAmount();
		await testDuplicateControlledError();
		await testDiscountExceedsBaseAmount();
		await testScholarshipPlusDiscountExceedsBase();
		await testScholarshipMonthlyLimit();
		await testMultipleDiscountsAccumulated();
		await testBulkWithDuplicateRollback();
		await testNoOrphanedMovements();
		await testNoAuditOnBulkFailure();

		console.log('\n' + '='.repeat(60));
		console.log('✅ Todas las pruebas pasaron exitosamente\n');
	} catch (error) {
		console.log('\n' + '='.repeat(60));
		console.error('❌ Pruebas fallaron');
		console.error(error);
		process.exit(1);
	} finally {
		await cleanupTestData();
	}
}

runAllTests();
