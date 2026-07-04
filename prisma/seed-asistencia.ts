import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de asistencia...\n');

	// Obtener comisiones
	const commissions = await prisma.subjectCommission.findMany({ take: 10 });
	if (commissions.length === 0) {
		throw new Error('No hay comisiones. Ejecuta primero: npx tsx prisma/seed-comisiones.ts');
	}

	// Obtener inscripciones
	const enrollments = await prisma.subjectEnrollment.findMany({ take: 50 });
	if (enrollments.length === 0) {
		throw new Error('No hay inscripciones. Ejecuta primero: npx tsx prisma/seed-comisiones.ts');
	}

	// Obtener un usuario para createdBy
	const user = await prisma.user.findFirst();
	if (!user) {
		throw new Error('No hay usuarios. Ejecuta primero: npx prisma db seed');
	}

	console.log(`🏫 Comisiones: ${commissions.length}`);
	console.log(`📝 Inscripciones: ${enrollments.length}`);

	// Crear registros de asistencia
	console.log('\n📊 Creando registros de asistencia...');
	let recordsCount = 0;
	let entriesCount = 0;

	for (const commission of commissions) {
		// Crear 4 registros de asistencia por comisión (4 clases)
		for (let classNum = 0; classNum < 4; classNum++) {
			const classDate = new Date(2026, 2 + classNum, 1 + classNum * 7); // Marzo-Junio

			const record = await prisma.attendanceRecord.create({
				data: {
					subjectId: commission.subjectId,
					commissionId: commission.id,
					classDate: classDate,
					createdByUserId: user.id
				}
			});

			recordsCount++;

			// Crear entradas de asistencia para alumnos de esta comisión
			const commissionEnrollments = enrollments.filter(
				(e) => e.commissionId === commission.id
			);

			for (const enrollment of commissionEnrollments.slice(0, 20)) {
				const present = Math.random() > 0.2;

				await prisma.attendanceEntry.create({
					data: {
						attendanceId: record.id,
						studentId: enrollment.studentId,
						present: present,
						notes: present ? null : 'Falta justificada'
					}
				});

				entriesCount++;
			}
		}

		console.log(`✅ Asistencia creada para comisión: ${commission.code}`);
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Registros de asistencia: ${recordsCount}`);
	console.log(`   • Entradas de asistencia: ${entriesCount}`);

	console.log('\n✅ Seed de asistencia completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
