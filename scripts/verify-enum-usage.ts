import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEnumUsage() {
	console.log('🔍 Verificación de Uso de Enums Faltantes - Consultas Read-Only\n');

	try {
		// Verificar todos los valores de AcademicStatus
		console.log('=== AcademicStatus ===');
		const allAcademicStatusResult = (await prisma.$queryRawUnsafe(`
      SELECT 
        "academicStatus",
        COUNT(*) as count
      FROM student_subject_status
      GROUP BY "academicStatus"
      ORDER BY count DESC
    `)) as any[];

		console.log('Valores presentes en base real:');
		allAcademicStatusResult.forEach((row: any) => {
			console.log(`  - ${row.academicStatus}: ${row.count} registros`);
		});

		// Verificar si hay valores faltantes (APPROVED, FAILED, DROPPED)
		const hasMissingValues = allAcademicStatusResult.some((row: any) =>
			['APPROVED', 'FAILED', 'DROPPED'].includes(row.academicStatus)
		);

		if (!hasMissingValues) {
			console.log(
				'✅ No se encontraron datos usando APPROVED, FAILED o DROPPED (valores faltantes)'
			);
		} else {
			console.log('⚠️ Se encontraron datos usando valores faltantes (APPROVED, FAILED, DROPPED)');
		}

		// Verificar todos los valores de CourseStatus
		console.log('\n=== CourseStatus ===');
		const allCourseStatusResult = (await prisma.$queryRawUnsafe(`
      SELECT 
        "courseStatus",
        COUNT(*) as count
      FROM student_subject_status
      GROUP BY "courseStatus"
      ORDER BY count DESC
    `)) as any[];

		console.log('Valores presentes en base real:');
		allCourseStatusResult.forEach((row: any) => {
			console.log(`  - ${row.courseStatus}: ${row.count} registros`);
		});

		// Verificar si hay valores faltantes (APPROVED, FAILED, DROPPED)
		const hasMissingCourseValues = allCourseStatusResult.some((row: any) =>
			['APPROVED', 'FAILED', 'DROPPED'].includes(row.courseStatus)
		);

		if (!hasMissingCourseValues) {
			console.log(
				'✅ No se encontraron datos usando APPROVED, FAILED o DROPPED (valores faltantes)'
			);
		} else {
			console.log('⚠️ Se encontraron datos usando valores faltantes (APPROVED, FAILED, DROPPED)');
		}

		// Verificar todos los valores de FinalExamStatus
		console.log('\n=== FinalExamStatus ===');
		const allFinalExamStatusResult = (await prisma.$queryRawUnsafe(`
      SELECT 
        "finalExamStatus",
        COUNT(*) as count
      FROM student_subject_status
      GROUP BY "finalExamStatus"
      ORDER BY count DESC
    `)) as any[];

		console.log('Valores presentes en base real:');
		allFinalExamStatusResult.forEach((row: any) => {
			console.log(`  - ${row.finalExamStatus}: ${row.count} registros`);
		});

		// Verificar si hay valores faltantes (APPROVED, EXEMPT)
		const hasMissingFinalValues = allFinalExamStatusResult.some((row: any) =>
			['APPROVED', 'EXEMPT'].includes(row.finalExamStatus)
		);

		if (!hasMissingFinalValues) {
			console.log('✅ No se encontraron datos usando APPROVED o EXEMPT (valores faltantes)');
		} else {
			console.log('⚠️ Se encontraron datos usando valores faltantes (APPROVED, EXEMPT)');
		}

		console.log('\n✅ Verificación completada exitosamente (solo consultas read-only)');
	} catch (error) {
		console.error('❌ Error durante verificación:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

verifyEnumUsage();
