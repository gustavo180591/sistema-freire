import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/lib/server/encryption';

const prisma = new PrismaClient();

/**
 * Script de migración para encriptar datos sensibles de alumnos
 *
 * DATOS A ENCRIPTAR:
 * - Student.dni
 * - Student.phone
 * - Student.familyContactPhone
 *
 * EJECUCIÓN:
 * npm run ts-node prisma/migrate-encryption.ts
 *
 * IMPORTANTE:
 * - Hacer backup de la base de datos ANTES de ejecutar
 * - Verificar que ENCRYPTION_KEY y ENCRYPTION_KEY_IV estén configuradas
 * - Este script NO debe ejecutarse en producción sin aprobación
 */

interface MigrationResult {
	success: boolean;
	studentId: string;
	field: string;
	error?: string;
}

async function migrateStudentDni(studentId: string, dni: string): Promise<MigrationResult> {
	try {
		const encrypted = await encrypt(dni);
		await prisma.student.update({
			where: { id: studentId },
			data: { dni: encrypted }
		});
		return { success: true, studentId, field: 'dni' };
	} catch (error) {
		return {
			success: false,
			studentId,
			field: 'dni',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

async function migrateStudentPhone(
	studentId: string,
	phone: string | null
): Promise<MigrationResult | null> {
	if (!phone) return null;
	try {
		const encrypted = await encrypt(phone);
		await prisma.student.update({
			where: { id: studentId },
			data: { phone: encrypted }
		});
		return { success: true, studentId, field: 'phone' };
	} catch (error) {
		return {
			success: false,
			studentId,
			field: 'phone',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

async function migrateFamilyContactPhone(
	studentId: string,
	phone: string | null
): Promise<MigrationResult | null> {
	if (!phone) return null;
	try {
		const encrypted = await encrypt(phone);
		await prisma.student.update({
			where: { id: studentId },
			data: { familyContactPhone: encrypted }
		});
		return { success: true, studentId, field: 'familyContactPhone' };
	} catch (error) {
		return {
			success: false,
			studentId,
			field: 'familyContactPhone',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

async function main() {
	console.log('🔐 Iniciando migración de encriptación de datos sensibles...');
	console.log('⚠️  Asegúrate de haber hecho un backup de la base de datos\n');

	// Verificar variables de entorno
	if (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_KEY_IV) {
		console.error('❌ ERROR: ENCRYPTION_KEY y ENCRYPTION_KEY_IV deben estar configuradas');
		process.exit(1);
	}

	console.log('✅ Variables de entorno verificadas\n');

	// Obtener todos los alumnos
	const students = await prisma.student.findMany({
		select: {
			id: true,
			dni: true,
			phone: true,
			familyContactPhone: true,
			firstName: true,
			lastName: true
		}
	});

	console.log(`📊 Total de alumnos a procesar: ${students.length}\n`);

	const results: MigrationResult[] = [];
	let successCount = 0;
	let errorCount = 0;

	for (const student of students) {
		console.log(`Procesando: ${student.lastName}, ${student.firstName} (${student.dni})`);

		// Migrar DNI
		if (student.dni) {
			const dniResult = await migrateStudentDni(student.id, student.dni);
			if (dniResult) results.push(dniResult);
			if (dniResult.success) {
				console.log(`  ✅ DNI encriptado`);
				successCount++;
			} else {
				console.log(`  ❌ Error en DNI: ${dniResult.error}`);
				errorCount++;
			}
		}

		// Migrar phone
		if (student.phone) {
			const phoneResult = await migrateStudentPhone(student.id, student.phone);
			if (phoneResult) results.push(phoneResult);
			if (phoneResult?.success) {
				console.log(`  ✅ Phone encriptado`);
				successCount++;
			} else if (phoneResult) {
				console.log(`  ❌ Error en phone: ${phoneResult.error}`);
				errorCount++;
			}
		}

		// Migrar familyContactPhone
		if (student.familyContactPhone) {
			const familyPhoneResult = await migrateFamilyContactPhone(
				student.id,
				student.familyContactPhone
			);
			if (familyPhoneResult) results.push(familyPhoneResult);
			if (familyPhoneResult?.success) {
				console.log(`  ✅ Family contact phone encriptado`);
				successCount++;
			} else if (familyPhoneResult) {
				console.log(`  ❌ Error en family contact phone: ${familyPhoneResult.error}`);
				errorCount++;
			}
		}

		console.log('');
	}

	// Reporte final
	console.log('═══════════════════════════════════════════════════════════');
	console.log('📋 REPORTE FINAL DE MIGRACIÓN');
	console.log('═══════════════════════════════════════════════════════════');
	console.log(`Total de operaciones: ${results.length}`);
	console.log(`✅ Exitosas: ${successCount}`);
	console.log(`❌ Fallidas: ${errorCount}`);

	if (errorCount > 0) {
		console.log('\n⚠️  ERRORES DETALLADOS:');
		const errors = results.filter((r) => !r.success);
		errors.forEach((err) => {
			console.log(`  - Student ID: ${err.studentId}, Field: ${err.field}, Error: ${err.error}`);
		});
	}

	console.log('\n═══════════════════════════════════════════════════════════');

	if (errorCount === 0) {
		console.log('✅ Migración completada exitosamente');
		console.log(
			'⚠️  Verifica que la aplicación funcione correctamente antes de eliminar el backup'
		);
	} else {
		console.log('❌ Migración completada con errores');
		console.log('⚠️  Revisa los errores y considera ejecutar el rollback');
	}

	await prisma.$disconnect();
}

main().catch((error) => {
	console.error('Error fatal en migración:', error);
	process.exit(1);
});
