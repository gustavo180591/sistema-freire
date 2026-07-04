import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de calificaciones...\n');

	// Obtener evaluaciones
	const evaluations = await prisma.evaluation.findMany({ take: 20 });
	if (evaluations.length === 0) {
		throw new Error('No hay evaluaciones. Ejecuta primero: npx tsx prisma/seed-evaluaciones.ts');
	}

	// Obtener inscripciones
	const enrollments = await prisma.subjectEnrollment.findMany({ take: 30 });
	if (enrollments.length === 0) {
		throw new Error('No hay inscripciones. Ejecuta primero: npx tsx prisma/seed-comisiones.ts');
	}

	// Obtener usuarios para created/updated
	const users = await prisma.user.findMany({ take: 5 });
	if (users.length === 0) {
		throw new Error('No hay usuarios. Ejecuta primero: npx prisma db seed');
	}

	console.log(`📝 Evaluaciones: ${evaluations.length}`);
	console.log(`📝 Inscripciones: ${enrollments.length}`);
	console.log(`👤 Usuarios: ${users.length}`);

	// Crear calificaciones
	console.log('\n📊 Creando calificaciones...');
	let gradesCount = 0;

	for (const evaluation of evaluations) {
		// Obtener inscripciones de la materia de la evaluación
		const evaluationEnrollments = enrollments.filter(
			(e) => e.subjectId === evaluation.subjectId
		);

		for (const enrollment of evaluationEnrollments.slice(0, 15)) {
			const gradeValue = 6 + Math.random() * 4; // 6-10
			const user = users[Math.floor(Math.random() * users.length)];

			const existingGrade = await prisma.grade.findUnique({
				where: {
					evaluationId_studentId: {
						evaluationId: evaluation.id,
						studentId: enrollment.studentId
					}
				}
			});

			if (!existingGrade) {
				await prisma.grade.create({
					data: {
						studentId: enrollment.studentId,
						evaluationId: evaluation.id,
						value: Math.round(gradeValue * 10) / 10,
						createdByUserId: user.id,
						updatedByUserId: user.id,
						observations: gradeValue >= 8 ? 'Excelente desempeño' : gradeValue >= 6 ? 'Aprobado' : 'Necesita mejorar'
					}
				});

				gradesCount++;
			}
		}
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Calificaciones creadas: ${gradesCount}`);

	console.log('\n✅ Seed de calificaciones completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
