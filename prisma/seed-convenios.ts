import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de convenios de pago...\n');

	// Obtener alumnos
	const students = await prisma.student.findMany({ take: 10 });
	if (students.length === 0) {
		throw new Error('No hay alumnos. Ejecuta primero seed-alumnos-tipos.ts');
	}

	// Obtener cargos financieros
	const charges = await prisma.studentCharge.findMany({ take: 30 });
	if (charges.length === 0) {
		throw new Error('No hay cargos financieros. Ejecuta primero seed-financiero-completo.ts');
	}

	// Obtener usuarios
	const users = await prisma.user.findMany({ take: 5 });
	if (users.length === 0) {
		throw new Error('No hay usuarios. Ejecuta primero npx prisma db seed');
	}

	console.log(`👨‍🎓 Alumnos: ${students.length}`);
	console.log(`💳 Cargos financieros: ${charges.length}`);
	console.log(`👤 Usuarios: ${users.length}`);

	// Crear convenios de pago
	console.log('\n📋 Creando convenios de pago...');
	let agreementsCount = 0;
	let installmentsCount = 0;

	for (const student of students.slice(0, 5)) {
		const user = users[Math.floor(Math.random() * users.length)];

		// Crear convenio de pago
		const agreement = await prisma.paymentAgreement.create({
			data: {
				agreementNumber: 100 + agreementsCount,
				agreementYear: 2026,
				studentId: student.id,
				studentName: `${student.firstName} ${student.lastName}`,
				studentDni: student.dni,
				originalDebt: 300000,
				agreedAmount: 300000,
				paidAmount: 0,
				pendingAmount: 300000,
				status: 'ACTIVE',
				reason: 'Convenio de pago en cuotas mensuales',
				observations: 'Convenio de pago en cuotas mensuales',
				createdBy: user.id,
				createdByName: `${user.firstName} ${user.lastName}`,
				activatedAt: new Date(),
				activatedBy: user.id,
				activatedByName: `${user.firstName} ${user.lastName}`
			}
		});

		agreementsCount++;

		// Crear cuotas del convenio (10 cuotas)
		for (let i = 0; i < 10; i++) {
			const dueDate = new Date(2026, 2 + i, 10);

			await prisma.paymentAgreementInstallment.create({
				data: {
					agreementId: agreement.id,
					installmentNumber: i + 1,
					dueDate: dueDate,
					amount: 30000,
					paidAmount: 0,
					pendingAmount: 30000,
					status: 'PENDING'
				}
			});

			installmentsCount++;

			// Relacionar con cargos financieros
			const relatedCharge = charges.find(
				(c) =>
					c.studentId === student.id &&
					c.periodLabel ===
						`2026-${['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][i]}`
			);

			if (relatedCharge) {
				await prisma.paymentAgreementChargeRelation.create({
					data: {
						agreementId: agreement.id,
						chargeId: relatedCharge.id,
						originalChargeAmount: relatedCharge.amount,
						originalChargePaidAmount: relatedCharge.paidAmount,
						originalChargeStatus: relatedCharge.status,
						amountIncluded: 30000,
						newStatus: 'PENDING'
					}
				});
			}
		}

		// Crear evento de aprobación
		await prisma.paymentAgreementEvent.create({
			data: {
				agreementId: agreement.id,
				eventType: 'ACTIVATED',
				description: 'Convenio aprobado por administración',
				previousStatus: 'DRAFT',
				newStatus: 'ACTIVE',
				userId: user.id,
				userName: `${user.firstName} ${user.lastName}`
			}
		});

		console.log(`✅ Convenio creado para alumno: ${student.firstName} ${student.lastName}`);
	}

	// Crear secuencia de números de convenio
	console.log('\n🔢 Creando secuencia de números de convenio...');
	await prisma.paymentAgreementNumber.upsert({
		where: { year: 2026 },
		update: {},
		create: {
			year: 2026,
			lastNumber: 100
		}
	});
	console.log('✅ Secuencia de números de convenio creada');

	console.log('\n📊 RESUMEN:');
	console.log(`   • Convenios creados: ${agreementsCount}`);
	console.log(`   • Cuotas creadas: ${installmentsCount}`);

	console.log('\n✅ Seed de convenios completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
