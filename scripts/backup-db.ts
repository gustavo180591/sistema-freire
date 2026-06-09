import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function backupDatabase() {
	console.log('=== BACKUP DE BASE DE DATOS ===\n');

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupDir = 'prisma/backup';
	const backupFile = join(backupDir, `backup-${timestamp}.json`);

	try {
		// Asegurar que el directorio existe
		mkdirSync(backupDir, { recursive: true });

		const backup: any = {
			timestamp: new Date().toISOString(),
			database: 'sistema-freire',
			tables: {}
		};

		// Lista de todas las tablas
		const tables = [
			'users',
			'students',
			'teachers',
			'subjects',
			'careers',
			'study_plans',
			'locations',
			'academic_terms',
			'subject_commissions',
			'subject_enrollments',
			'subject_teachers',
			'subject_correlatives',
			'career_subjects',
			'plan_subjects',
			'career_locations',
			'attendance_records',
			'attendance_entries',
			'student_subject_status',
			'grades',
			'evaluations',
			'class_materials',
			'student_charges',
			'payments',
			'payment_allocations',
			'charge_concepts',
			'payslips',
			'scholarships',
			'student_documents',
			'student_followups',
			'audit_logs',
			'roles',
			'permissions',
			'user_roles',
			'user_location_permissions',
			'sessions',
			'academic_year_history'
		];

		console.log('Exportando datos...');

		for (const table of tables) {
			try {
				const data = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
				backup.tables[table] = data;
				console.log(`  ✓ ${table}: ${Array.isArray(data) ? data.length : 0} registros`);
			} catch (error: any) {
				console.log(`  ✗ ${table}: [ERROR - ${error.code || 'UNKNOWN'}]`);
				backup.tables[table] = { error: error.message };
			}
		}

		// Guardar backup
		writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');

		console.log(`\n✓ Backup completado: ${backupFile}`);
		console.log(`  Tamaño: ${(Buffer.byteLength(JSON.stringify(backup)) / 1024).toFixed(2)} KB`);
	} catch (error) {
		console.error('Error durante backup:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

backupDatabase();
