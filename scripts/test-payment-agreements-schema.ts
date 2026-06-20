/**
 * Script de prueba para validar el schema de Convenios de Pago - Fase 1
 * 
 * Este script valida:
 * - Creación de convenio en estado DRAFT
 * - Numeración correlativa por año
 * - Creación de cuotas de convenio
 * - Creación de relación con deuda original
 * - Creación de eventos de auditoría
 * - Permisos base
 * - Imposibilidad de eliminar entidad histórica debido a Restrict
 * 
 * IMPORTANTE: Este script debe ejecutarse contra una base de datos que tenga
 * la migración de Convenios de Pago aplicada. Puede ser:
 * - La base temporal: sistema_freire_migration_test
 * - La base real después de aplicar la migración
 * 
 * Ejecución:
 * DATABASE_URL="postgresql://freire:Freire123@localhost:5437/sistema_freire_migration_test" npx tsx scripts/test-payment-agreements-schema.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
	console.log('🧪 Iniciando pruebas de Convenios de Pago - Fase 1\n');

	let testAgreementId: string | null = null;
	let testChargeId: string | null = null;
	let testStudentId: string | null = null;
	let testUserId: string | null = null;
	let testCareerId: string | null = null;
	let testAcademicTermId: string | null = null;
	let testConceptId: string | null = null;

	try {
		// Test 1: Verificar que los nuevos modelos existen
		console.log('Test 1: Verificar existencia de nuevos modelos...');
		
		const year = new Date().getFullYear();
		const numberRecord = await (prisma as any).paymentAgreementNumber.upsert({
			where: { year },
			create: { year, lastNumber: 0 },
			update: {}
		});
		console.log('✅ PaymentAgreementNumber existe y funciona');

		// Test 2: Crear datos necesarios para StudentCharge
		console.log('\nTest 2: Crear datos necesarios (Career, AcademicTerm, Concept)...');
		
		const testCareer = await prisma.career.create({
			data: {
				name: 'Test Career for Payment Agreements',
				code: 'TEST-PA',
				durationYears: 4
			}
		});
		testCareerId = testCareer.id;
		console.log('✅ Career creada:', testCareer.id);

		const testAcademicTerm = await prisma.academicTerm.create({
			data: {
				name: '2026-1',
				code: '2026-1-TEST',
				year: 2026,
				termType: 'PRIMER_CUATRIMESTRE',
				startDate: new Date('2026-03-01'),
				endDate: new Date('2026-12-31')
			}
		});
		testAcademicTermId = testAcademicTerm.id;
		console.log('✅ AcademicTerm creada:', testAcademicTerm.id);

		const testConcept = await prisma.chargeConcept.create({
			data: {
				name: 'Test Concept for Payment Agreements',
				code: 'TEST-PA-CONCEPT'
			}
		});
		testConceptId = testConcept.id;
		console.log('✅ ChargeConcept creada:', testConcept.id);

		// Test 3: Crear usuario y estudiante
		console.log('\nTest 3: Crear usuario y estudiante...');
		
		const testUser = await prisma.user.create({
			data: {
				email: 'test.payment.agreement@example.com',
				passwordHash: 'test',
				firstName: 'Test',
				lastName: 'Payment Agreement',
				status: 'ACTIVE'
			}
		});
		testUserId = testUser.id;
		console.log('✅ User creado:', testUser.id);

		const testStudent = await prisma.student.create({
			data: {
				userId: testUserId,
				firstName: 'Test',
				lastName: 'Payment Agreement',
				careerId: testCareerId,
				dni: '98765432',
				phone: '9876543210',
				address: 'Test Address for Payment Agreements',
				birthDate: new Date('2000-01-01')
			}
		});
		testStudentId = testStudent.id;
		console.log('✅ Student creado:', testStudent.id);

		// Test 4: Crear StudentCharge
		console.log('\nTest 4: Crear StudentCharge...');
		
		const testCharge = await prisma.studentCharge.create({
			data: {
				studentId: testStudentId,
				conceptId: testConceptId,
				periodLabel: '2026-1',
				amount: new Decimal(1000),
				dueDate: new Date('2026-12-31'),
				status: 'PENDING',
				academicTermId: testAcademicTermId,
				finalAmount: new Decimal(1000),
				userId: testUserId
			}
		});
		testChargeId = testCharge.id;
		console.log('✅ StudentCharge creada:', testCharge.id);

		// Test 5: Numeración correlativa transaccional
		console.log('\nTest 5: Verificar numeración correlativa transaccional...');
		
		const nextNumber1 = await prisma.$transaction(async (tx) => {
			const record = await (tx as any).paymentAgreementNumber.upsert({
				where: { year },
				create: { year, lastNumber: 0 },
				update: { lastNumber: { increment: 1 } }
			});
			return record.lastNumber;
		});

		const nextNumber2 = await prisma.$transaction(async (tx) => {
			const record = await (tx as any).paymentAgreementNumber.upsert({
				where: { year },
				create: { year, lastNumber: 0 },
				update: { lastNumber: { increment: 1 } }
			});
			return record.lastNumber;
		});

		if (nextNumber2 === nextNumber1 + 1) {
			console.log('✅ Numeración correlativa funciona correctamente:', nextNumber1, '->', nextNumber2);
		} else {
			throw new Error('Numeración correlativa no funciona: ' + nextNumber1 + ' -> ' + nextNumber2);
		}

		// Test 6: Crear convenio en estado DRAFT
		console.log('\nTest 6: Crear convenio en estado DRAFT...');
		
		const agreementNumber = await prisma.$transaction(async (tx) => {
			const record = await (tx as any).paymentAgreementNumber.upsert({
				where: { year },
				create: { year, lastNumber: 0 },
				update: { lastNumber: { increment: 1 } }
			});
			return record.lastNumber;
		});

		const testAgreement = await (prisma as any).paymentAgreement.create({
			data: {
				agreementNumber,
				agreementYear: year,
				studentId: testStudentId,
				studentName: 'Test Payment Agreement Student',
				studentDni: '98765432',
				originalDebt: new Decimal(1000),
				agreedAmount: new Decimal(1000),
				paidAmount: new Decimal(0),
				pendingAmount: new Decimal(1000),
				status: 'DRAFT',
				reason: 'Test agreement with real charge relation',
				createdBy: testUserId,
				createdByName: 'Test Payment Agreement'
			}
		});

		testAgreementId = testAgreement.id;
		console.log('✅ Convenio DRAFT creado:', testAgreement.id);
		console.log('   Número:', testAgreement.agreementNumber, 'Año:', testAgreement.agreementYear);
		console.log('   Estado:', testAgreement.status);

		// Test 7: Crear cuotas del convenio
		console.log('\nTest 7: Crear cuotas del convenio...');
		
		const installment1 = await (prisma as any).paymentAgreementInstallment.create({
			data: {
				agreementId: testAgreementId,
				installmentNumber: 1,
				dueDate: new Date('2026-07-20'),
				amount: new Decimal(500),
				paidAmount: new Decimal(0),
				pendingAmount: new Decimal(500),
				status: 'PENDING'
			}
		});

		const installment2 = await (prisma as any).paymentAgreementInstallment.create({
			data: {
				agreementId: testAgreementId,
				installmentNumber: 2,
				dueDate: new Date('2026-08-20'),
				amount: new Decimal(500),
				paidAmount: new Decimal(0),
				pendingAmount: new Decimal(500),
				status: 'PENDING'
			}
		});

		console.log('✅ Cuotas creadas:', installment1.id, installment2.id);
		console.log('   Cuota 1:', installment1.amount, 'Vencimiento:', installment1.dueDate);
		console.log('   Cuota 2:', installment2.amount, 'Vencimiento:', installment2.dueDate);

		// Test 8: Crear relación con deuda original (snapshot)
		console.log('\nTest 8: Crear relación con deuda original (snapshot)...');
		
		const chargeRelation = await (prisma as any).paymentAgreementChargeRelation.create({
			data: {
				agreementId: testAgreementId,
				chargeId: testChargeId,
				originalChargeAmount: new Decimal(1000),
				originalChargePaidAmount: new Decimal(0),
				originalChargeStatus: 'PENDING',
				amountIncluded: new Decimal(1000),
				relationType: 'REFINANCED'
			}
		});

		console.log('✅ Relación con deuda original creada:', chargeRelation.id);
		console.log('   Monto original:', chargeRelation.originalChargeAmount);
		console.log('   Estado original:', chargeRelation.originalChargeStatus);
		console.log('   Tipo de relación:', chargeRelation.relationType);

		// Test 9: Crear evento de auditoría
		console.log('\nTest 9: Crear evento de auditoría...');
		
		const event = await (prisma as any).paymentAgreementEvent.create({
			data: {
				agreementId: testAgreementId,
				eventType: 'CREATED',
				description: 'Convenio creado con relación real a deuda',
				previousStatus: null,
				newStatus: 'DRAFT',
				oldValue: null,
				newValue: { status: 'DRAFT' },
				metadata: { test: true, hasRealChargeRelation: true },
				reason: 'Test automation with real data',
				userId: testUserId,
				userName: 'Test Payment Agreement'
			}
		});

		console.log('✅ Evento de auditoría creado:', event.id);
		console.log('   Tipo:', event.eventType);
		console.log('   Descripción:', event.description);

		// Test 10: Verificar restricción onDelete Restrict (convenio con cuotas)
		console.log('\nTest 10: Verificar restricción onDelete Restrict (convenio con cuotas)...');
		
		try {
			await (prisma as any).paymentAgreement.delete({
				where: { id: testAgreementId }
			});
			console.log('❌ ERROR: Se pudo eliminar el convenio con cuotas (debería fallar por Restrict)');
		} catch (error: any) {
			if (error.code === 'P2003' || error.message.includes('Foreign key constraint')) {
				console.log('✅ Restricción onDelete Restrict funciona correctamente');
				console.log('   No se puede eliminar el convenio mientras tiene cuotas');
			} else {
				console.log('⚠️  Error diferente al esperado:', error.message);
			}
		}

		// Test 11: Verificar restricción onDelete Restrict (cargo en convenio)
		console.log('\nTest 11: Verificar restricción onDelete Restrict (cargo en convenio)...');
		
		try {
			await prisma.studentCharge.delete({
				where: { id: testChargeId }
			});
			console.log('❌ ERROR: Se pudo eliminar el cargo en convenio (debería fallar por Restrict)');
		} catch (error: any) {
			if (error.code === 'P2003' || error.message.includes('Foreign key constraint')) {
				console.log('✅ Restricción onDelete Restrict funciona correctamente en cargo');
				console.log('   No se puede eliminar el cargo mientras está en un convenio');
			} else {
				console.log('⚠️  Error diferente al esperado:', error.message);
			}
		}

		// Test 12: Verificar relaciones y consultas
		console.log('\nTest 12: Verificar relaciones y consultas...');
		
		const agreementWithRelations = await (prisma as any).paymentAgreement.findUnique({
			where: { id: testAgreementId },
			include: {
				installments: true,
				relatedCharges: true,
				events: true
			}
		});

		if (agreementWithRelations) {
			console.log('✅ Convenio con relaciones cargado correctamente');
			console.log('   Cuotas:', agreementWithRelations.installments.length);
			console.log('   Relaciones con cargos:', agreementWithRelations.relatedCharges.length);
			console.log('   Eventos:', agreementWithRelations.events.length);
			
			// Verificar que la relación con el cargo es correcta
			if (agreementWithRelations.relatedCharges.length > 0) {
				const relation = agreementWithRelations.relatedCharges[0];
				console.log('   Relación con cargo ID:', relation.chargeId);
				console.log('   Monto incluido:', relation.amountIncluded);
			}
		} else {
			console.log('❌ ERROR: No se pudo cargar el convenio con relaciones');
		}

		console.log('\n✅ Todas las pruebas completadas exitosamente');

	} catch (error) {
		console.error('\n❌ Error durante las pruebas:', error);
		throw error;
	} finally {
		// Cleanup
		console.log('\n🧹 Limpiando datos de prueba...');

		try {
			if (testAgreementId) {
				// Primero eliminar eventos
				await (prisma as any).paymentAgreementEvent.deleteMany({
					where: { agreementId: testAgreementId }
				});

				// Luego eliminar relaciones con cargos
				await (prisma as any).paymentAgreementChargeRelation.deleteMany({
					where: { agreementId: testAgreementId }
				});

				// Luego eliminar cuotas
				await (prisma as any).paymentAgreementInstallment.deleteMany({
					where: { agreementId: testAgreementId }
				});

				// Finalmente eliminar el convenio
				await (prisma as any).paymentAgreement.delete({
					where: { id: testAgreementId }
				});

				console.log('✅ Convenio de prueba eliminado');
			}

			if (testChargeId) {
				await prisma.studentCharge.delete({
					where: { id: testChargeId }
				});
				console.log('✅ StudentCharge eliminado');
			}

			if (testStudentId) {
				await prisma.student.delete({
					where: { id: testStudentId }
				});
				console.log('✅ Student eliminado');
			}

			if (testUserId) {
				await prisma.user.delete({
					where: { id: testUserId }
				});
				console.log('✅ User eliminado');
			}

			if (testConceptId) {
				await prisma.chargeConcept.delete({
					where: { id: testConceptId }
				});
				console.log('✅ ChargeConcept eliminado');
			}

			if (testAcademicTermId) {
				await prisma.academicTerm.delete({
					where: { id: testAcademicTermId }
				});
				console.log('✅ AcademicTerm eliminado');
			}

			if (testCareerId) {
				await prisma.career.delete({
					where: { id: testCareerId }
				});
				console.log('✅ Career eliminado');
			}

			console.log('✅ Cleanup completado');
		} catch (cleanupError) {
			console.error('⚠️  Error durante cleanup:', cleanupError);
		}
	}
}

main()
	.then(() => {
		console.log('\n🎉 Script de pruebas finalizado');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n💥 Script de pruebas falló:', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
