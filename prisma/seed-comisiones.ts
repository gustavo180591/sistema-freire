import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de comisiones...\n');

	// Obtener materias
	const subjects = await prisma.subject.findMany({ take: 15 });
	if (subjects.length === 0) {
		throw new Error('No hay materias. Ejecuta primero: npx tsx prisma/seed-materias.ts');
	}

	// Obtener docentes
	const teachers = await prisma.teacher.findMany({ take: 10 });
	if (teachers.length === 0) {
		throw new Error('No hay docentes. Ejecuta primero: npx tsx prisma/seed-docentes.ts');
	}

	// Obtener ubicaciones
	const locations = await prisma.location.findMany();
	if (locations.length === 0) {
		throw new Error('No hay ubicaciones. Ejecuta primero: npx tsx prisma/seed-locations.ts');
	}

	// Obtener término académico
	const academicTerm = await prisma.academicTerm.findFirst({
		where: { year: 2026 }
	});

	if (!academicTerm) {
		throw new Error('No se encontró término académico 2026. Ejecuta primero seed-locations.ts');
	}

	// Obtener alumnos
	const students = await prisma.student.findMany({ take: 30 });
	if (students.length === 0) {
		throw new Error('No hay alumnos. Ejecuta primero seed-alumnos-tipos.ts');
	}

	// Obtener carreras
	const careers = await prisma.career.findMany({ take: 2 });
	if (careers.length === 0) {
		throw new Error('No hay carreras. Ejecuta primero seed-materias.ts');
	}

	console.log(`📚 Materias: ${subjects.length}`);
	console.log(`👨‍🏫 Docentes: ${teachers.length}`);
	console.log(`📍 Ubicaciones: ${locations.length}`);
	console.log(`👨‍🎓 Alumnos: ${students.length}`);

	// Crear comisiones
	console.log('\n🏫 Creando comisiones...');
	let comisionesCount = 0;

	for (const subject of subjects) {
		// Crear 1-2 comisiones por materia
		const numCommissions = Math.random() > 0.5 ? 1 : 2;
		const career = careers[Math.floor(Math.random() * careers.length)];

		for (let i = 0; i < numCommissions; i++) {
			const location = locations[Math.floor(Math.random() * locations.length)];
			const teacher = teachers[Math.floor(Math.random() * teachers.length)];
			const commissionCode = `${subject.code}-${i === 0 ? 'A' : 'B'}-2026`;

			const commission = await prisma.subjectCommission.upsert({
				where: { code: commissionCode },
				update: {},
				create: {
					code: commissionCode,
					subjectId: subject.id,
					teacherId: teacher.id,
					locationId: location.id,
					academicTermId: academicTerm.id,
					careerId: career.id,
					schedule: `${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][Math.floor(Math.random() * 5)]} ${8 + Math.floor(Math.random() * 6)}:00 - ${10 + Math.floor(Math.random() * 6)}:00`,
					maxCapacity: 30,
					active: true
				}
			});

			comisionesCount++;

			// Inscribir alumnos en la comisión (15-25 alumnos por comisión)
			const numStudents = 15 + Math.floor(Math.random() * 11);
			const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

			for (let j = 0; j < numStudents && j < shuffledStudents.length; j++) {
				const student = shuffledStudents[j];

				const existingEnrollment = await prisma.subjectEnrollment.findFirst({
					where: {
						commissionId: commission.id,
						studentId: student.id
					}
				});

				// También verificar si ya está inscrito en la materia en el mismo término académico
				const existingSubjectEnrollment = await prisma.subjectEnrollment.findFirst({
					where: {
						studentId: student.id,
						subjectId: subject.id,
						academicTermId: academicTerm.id
					}
				});

				if (!existingEnrollment && !existingSubjectEnrollment) {
					await prisma.subjectEnrollment.create({
						data: {
							commissionId: commission.id,
							studentId: student.id,
							subjectId: subject.id,
							careerId: career.id,
							academicTermId: academicTerm.id,
							enrolledAt: new Date('2026-03-01'),
							status: 'ACTIVE'
						}
					});
				}
			}

			console.log(
				`✅ Comisión creada: ${subject.name} - División ${i === 0 ? 'A' : 'B'} (${numStudents} alumnos)`
			);
		}
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Comisiones creadas: ${comisionesCount}`);
	console.log(`   • Inscripciones promedio: ~20 por comisión`);

	console.log('\n✅ Seed de comisiones completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
