import { PrismaClient } from '@prisma/client';
import { decrypt } from '../src/lib/server/encryption';

const prisma = new PrismaClient();

/**
 * Script de rollback para desencriptar datos sensibles de alumnos
 * 
 * DATOS A DESENCRIPTAR:
 * - Student.dni
 * - Student.phone
 * - Student.familyContactPhone
 * 
 * EJECUCIÓN:
 * npm run ts-node prisma/rollback-encryption.ts
 * 
 * IMPORTANTE:
 * - Solo usar en caso de emergencia o si la migración falló
 * - Verificar que ENCRYPTION_KEY y ENCRYPTION_KEY_IV sean las mismas usadas en la migración
 */

interface RollbackResult {
	success: boolean;
	studentId: string;
	field: string;
	error?: string;
}

async function rollbackStudentDni(studentId: string, dni: string): Promise<RollbackResult> {
	try {
		const decrypted = await decrypt(dni);
		await prisma.student.update({
			where: { id: studentId },
			data: { dni: decrypted }
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

async function rollbackStudentPhone(studentId: string, phone: string | null): Promise<RollbackResult | null> {
	if (!phone) return null;
	try {
		const decrypted = await decrypt(phone);
		await prisma.student.update({
			where: { id: studentId },
			data: { phone: decrypted }
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

async function rollbackFamilyContactPhone(studentId: string, phone: string | null): Promise<RollbackResult | null> {
	if (!phone) return null;
	try {
		const decrypted = await decrypt(phone);
		await prisma.student.update({
			where: { id: studentId },
			data: { familyContactPhone: decrypted }
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
	console.log('🔓 Iniciando rollback de encriptación de datos sensibles...');
	console.log('⚠️  Este proceso desencriptará todos los datos sensibles\n');

	// Verificar variables de entorno
	if (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_KEY_IV) {
		console.error('❌ ERROR: ENCRYPTION_KEY y ENCRYPTION_KEY_IV deben estar configuradas');
		process.exit(1);
	}

	console.log('✅ Variables de entorno verificadas\n');

	// Confirmación
	console.log('⚠️  ESTÁS A PUNTO DE DESENCRIPTAR TODOS LOS DATOS SENSIBLES');
	console.log('⚠️  ¿Estás seguro? (Ctrl+C para cancelar, Enter para continuar)');
	
	// Esperar confirmación (en producción, esto debería ser más seguro)
	await new Promise(resolve => setTimeout(resolve, 3000));

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

	const results: RollbackResult[] = [];
	let successCount = 0;
	let errorCount = 0;

	for (const student of students) {
		console.log(`Procesando: ${student.lastName}, ${student.firstName}`);

		// Rollback DNI
		if (student.dni) {
			const dniResult = await rollbackStudentDni(student.id, student.dni);
			if (dniResult) results.push(dniResult);
			if (dniResult.success) {
				console.log(`  ✅ DNI desencriptado`);
				successCount++;
			} else {
				console.log(`  ❌ Error en DNI: ${dniResult.error}`);
				errorCount++;
			}
		}

		// Rollback phone
		if (student.phone) {
			const phoneResult = await rollbackStudentPhone(student.id, student.phone);
			if (phoneResult) results.push(phoneResult);
			if (phoneResult?.success) {
				console.log(`  ✅ Phone desencriptado`);
				successCount++;
			} else if (phoneResult) {
				console.log(`  ❌ Error en phone: ${phoneResult.error}`);
				errorCount++;
			}
		}

		// Rollback familyContactPhone
		if (student.familyContactPhone) {
			const familyPhoneResult = await rollbackFamilyContactPhone(student.id, student.familyContactPhone);
			if (familyPhoneResult) results.push(familyPhoneResult);
			if (familyPhoneResult?.success) {
				console.log(`  ✅ Family contact phone desencriptado`);
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
	console.log('📋 REPORTE FINAL DE ROLLBACK');
	console.log('═══════════════════════════════════════════════════════════');
	console.log(`Total de operaciones: ${results.length}`);
	console.log(`✅ Exitosas: ${successCount}`);
	console.log(`❌ Fallidas: ${errorCount}`);

	if (errorCount > 0) {
		console.log('\n⚠️  ERRORES DETALLADOS:');
		const errors = results.filter(r => !r.success);
		errors.forEach(err => {
			console.log(`  - Student ID: ${err.studentId}, Field: ${err.field}, Error: ${err.error}`);
		});
	}

	console.log('\n═══════════════════════════════════════════════════════════');

	if (errorCount === 0) {
		console.log('✅ Rollback completado exitosamente');
		console.log('⚠️  Los datos están ahora en texto plano nuevamente');
	} else {
		console.log('❌ Rollback completado con errores');
		console.log('⚠️  Algunos datos pueden estar corruptos. Considera restaurar el backup');
	}

	await prisma.$disconnect();
}

main()
	.catch((error) => {
		console.error('Error fatal en rollback:', error);
		process.exit(1);
	});
