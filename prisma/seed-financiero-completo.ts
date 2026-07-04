import { PrismaClient, ChargeStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed financiero completo...\n');

	// Obtener término académico
	const academicTerm = await prisma.academicTerm.findFirst({
		where: { year: 2026 }
	});

	if (!academicTerm) {
		throw new Error('No se encontró término académico 2026. Ejecuta primero seed-locations.ts');
	}

	// Obtener alumnos
	const students = await prisma.student.findMany({ take: 10 });
	if (students.length === 0) {
		throw new Error('No hay alumnos. Ejecuta primero seed-alumnos-tipos.ts');
	}

	// 1. Crear conceptos de cargo
	console.log('💰 Creando conceptos de cargo...');
	const conceptos = [
		{ code: 'MATRICULA', name: 'Matrícula Anual', amount: 50000 },
		{ code: 'CUOTA_MENSUAL', name: 'Cuota Mensual', amount: 30000 },
		{ code: 'EXAMEN', name: 'Derecho de Examen', amount: 5000 },
		{ code: 'CERTIFICADO', name: 'Certificado de Estudios', amount: 2000 },
		{ code: 'MATERIALES', name: 'Materiales de Estudio', amount: 10000 },
		{ code: 'ACTIVIDAD_EXTRA', name: 'Actividad Extracurricular', amount: 3000 },
		{ code: 'BIBLIOTECA', name: 'Cuota Biblioteca', amount: 1500 },
		{ code: 'LABORATORIO', name: 'Cuota Laboratorio', amount: 2000 }
	];

	for (const concepto of conceptos) {
		await prisma.chargeConcept.upsert({
			where: { code: concepto.code },
			update: {},
			create: {
				code: concepto.code,
				name: concepto.name,
				description: `Concepto de ${concepto.name}`,
				active: true
			}
		});
	}
	console.log(`✅ ${conceptos.length} conceptos de cargo creados`);

	// 2. Crear configuración financiera
	console.log('\n⚙️ Creando configuración financiera...');
	await prisma.financialConfig.upsert({
		where: { key: 'general' },
		update: {},
		create: {
			key: 'general',
			value: {
				currency: 'ARS',
				lateFeePercentage: 10,
				lateFeeGraceDays: 5,
				maxLateFeePercentage: 25,
				paymentMethods: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'],
				receiptPrefix: 'REC'
			},
			category: 'general',
			description: 'Configuración financiera general'
		}
	});
	console.log('✅ Configuración financiera creada');

	// 3. Crear secuencia de números de recibo
	console.log('\n🔢 Creando secuencia de números de recibo...');
	await prisma.receiptNumber.upsert({
		where: { year: 2026 },
		update: {},
		create: {
			year: 2026,
			lastNumber: 1000
		}
	});
	console.log('✅ Secuencia de números de recibo creada');

	// 4. Crear descuentos
	console.log('\n🏷️ Creando descuentos...');
	const descuentos = [
		{
			code: 'HERMANOS',
			name: 'Descuento por Hermanos',
			percentage: 10,
			description: '10% de descuento para familias con 2 o más hermanos'
		},
		{
			code: 'PAGO_ANTICIPADO',
			name: 'Pago Anticipado',
			percentage: 5,
			description: '5% de descuento por pago anticipado anual'
		},
		{
			code: 'EXCELENCIA',
			name: 'Descuento por Excelencia Académica',
			percentage: 15,
			description: '15% de descuento para alumnos con promedio superior a 9'
		},
		{
			code: 'BECA_SOCIAL',
			name: 'Beca Social',
			percentage: 50,
			description: '50% de descuento por situación social'
		}
	];

	for (const descuento of descuentos) {
		await prisma.discount.upsert({
			where: { code: descuento.code },
			update: {},
			create: {
				code: descuento.code,
				name: descuento.name,
				discountType: 'PERCENTAGE',
				value: descuento.percentage,
				applicableTo: ['MATRICULA', 'CUOTA_MENSUAL'],
				validFrom: new Date('2026-01-01'),
				description: descuento.description,
				active: true
			}
		});
	}
	console.log(`✅ ${descuentos.length} descuentos creados`);

	// 5. Crear becas para alumnos
	console.log('\n🎓 Creando becas para alumnos...');
	let becasCount = 0;
	for (const student of students.slice(0, 3)) {
		await prisma.scholarship.create({
			data: {
				studentId: student.id,
				name: 'Beca Social',
				percentage: 50,
				active: true,
				startDate: new Date('2026-01-01'),
				endDate: new Date('2026-12-31'),
				applicableTo: ['MATRICULA', 'CUOTA_MENSUAL'],
				autoApply: true
			}
		});
		becasCount++;
	}
	console.log(`✅ ${becasCount} becas creadas`);

	// 6. Crear cargos financieros para alumnos
	console.log('\n💳 Creando cargos financieros para alumnos...');
	const matriculaConcept = await prisma.chargeConcept.findUnique({
		where: { code: 'MATRICULA' }
	});
	const cuotaConcept = await prisma.chargeConcept.findUnique({
		where: { code: 'CUOTA_MENSUAL' }
	});

	let totalCharges = 0;

	for (const student of students) {
		// Matrícula
		const existingMatricula = await prisma.studentCharge.findFirst({
			where: {
				studentId: student.id,
				conceptId: matriculaConcept!.id,
				periodLabel: '2026'
			}
		});

		if (!existingMatricula) {
			await prisma.studentCharge.create({
				data: {
					studentId: student.id,
					conceptId: matriculaConcept!.id,
					periodLabel: '2026',
					amount: 50000,
					paidAmount: 0,
					finalAmount: 50000,
					academicTermId: academicTerm.id,
					status: 'PENDING',
					dueDate: new Date('2026-03-15')
				}
			});
			totalCharges++;
		}

		// Cuotas mensuales (Marzo a Diciembre)
		const meses = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
		for (const mes of meses) {
			const existingCuota = await prisma.studentCharge.findFirst({
				where: {
					studentId: student.id,
					conceptId: cuotaConcept!.id,
					periodLabel: `2026-${mes}`
				}
			});

			if (!existingCuota) {
				const monthNum = meses.indexOf(mes) + 3;
				const dueDate = new Date(2026, monthNum, 10);

				await prisma.studentCharge.create({
					data: {
						studentId: student.id,
						conceptId: cuotaConcept!.id,
						periodLabel: `2026-${mes}`,
						amount: 30000,
						paidAmount: 0,
						finalAmount: 30000,
						academicTermId: academicTerm.id,
						status: 'PENDING',
						dueDate
					}
				});
				totalCharges++;
			}
		}
	}
	console.log(`✅ ${totalCharges} cargos financieros creados`);

	// 7. Crear movimientos financieros para alumnos
	console.log('\n📊 Creando movimientos financieros para alumnos...');
	let movimientosCount = 0;
	for (const student of students.slice(0, 5)) {
		await prisma.financialMovement.create({
			data: {
				studentId: student.id,
				movementType: 'PAYMENT',
				entityType: 'STUDENT_CHARGE',
				entityId: 'DEMO-CHARGE-ID',
				description: 'Pago de matrícula',
				amount: 50000,
				balanceBefore: 0,
				balanceAfter: 50000
			}
		});
		movimientosCount++;
	}
	console.log(`✅ ${movimientosCount} movimientos financieros creados`);

	console.log('\n📊 RESUMEN:');
	console.log(`   • Conceptos de cargo: ${conceptos.length}`);
	console.log(`   • Descuentos: ${descuentos.length}`);
	console.log(`   • Becas: ${becasCount}`);
	console.log(`   • Cargos financieros: ${totalCharges}`);
	console.log(`   • Movimientos financieros: ${movimientosCount}`);

	console.log('\n✅ Seed financiero completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
