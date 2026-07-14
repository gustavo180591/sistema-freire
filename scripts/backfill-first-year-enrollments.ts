import { PrismaClient } from '@prisma/client';
import { autoEnrollStudentInYearSubjects } from '../src/lib/server/academic/enrollment-service';

const prisma = new PrismaClient();

/**
 * Script para regularizar alumnos de 1º año que hoy figuran sin materias inscritas.
 *
 * Este script:
 * 1. Busca alumnos activos de 1º año
 * 2. Para cada alumno, obtiene su plan de estudio activo/default
 * 3. Inscribió automáticamente en las materias de 1º año del plan
 * 4. Es idempotente: si ya existe el registro, no duplica
 *
 * Uso:
 * npx ts-node scripts/backfill-first-year-enrollments.ts
 */

async function main() {
	console.log('🚀 Iniciando backfill de inscripciones para alumnos de 1º año...');

	// Buscar alumnos activos de 1º año
	const firstYearStudents = await prisma.student.findMany({
		where: {
			currentYear: 1,
			user: {
				status: 'ACTIVE'
			}
		},
		include: {
			user: true
		}
	});

	console.log(`📊 Encontrados ${firstYearStudents.length} alumnos de 1º año activos`);

	let processedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	for (const student of firstYearStudents) {
		try {
			console.log(
				`\n👤 Procesando alumno: ${student.lastName} ${student.firstName} (${student.id})`
			);

			// Verificar si ya tiene inscripciones para materias de 1º año
			const existingEnrollments = await prisma.subjectEnrollment.count({
				where: {
					studentId: student.id,
					subject: {
						yearLevel: 1
					}
				}
			});

			if (existingEnrollments > 0) {
				console.log(`  ✅ Ya tiene ${existingEnrollments} inscripciones de 1º año, saltando...`);
				skippedCount++;
				continue;
			}

			// Inscribir automáticamente en materias de 1º año
			await prisma.$transaction(async (tx) => {
				await autoEnrollStudentInYearSubjects({
					studentId: student.id,
					careerId: student.careerId,
					currentYear: student.currentYear,
					locationId: student.locationId || undefined,
					tx
				});
			});

			console.log(`  ✅ Inscripciones creadas exitosamente`);
			processedCount++;
		} catch (error) {
			console.error(`  ❌ Error procesando alumno ${student.id}:`, error);
			errorCount++;
		}
	}

	console.log('\n📋 Resumen:');
	console.log(`  ✅ Procesados exitosamente: ${processedCount}`);
	console.log(`  ⏭️  Saltados (ya tenían inscripciones): ${skippedCount}`);
	console.log(`  ❌ Errores: ${errorCount}`);
	console.log(`  📊 Total alumnos: ${firstYearStudents.length}`);

	console.log('\n✨ Backfill completado');
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error('❌ Error fatal:', e);
		await prisma.$disconnect();
		process.exit(1);
	});
