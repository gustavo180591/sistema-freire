import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const BACKUP_DIR = path.join(process.cwd(), 'prisma', 'backup');

async function inspectAndBackup() {
	console.log('🔍 Inspeccionando base de datos...\n');

	// Crear directorio de backup
	if (!fs.existsSync(BACKUP_DIR)) {
		fs.mkdirSync(BACKUP_DIR, { recursive: true });
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupDir = path.join(BACKUP_DIR, `backup-${timestamp}`);
	fs.mkdirSync(backupDir, { recursive: true });

	const tables = [
		{ name: 'users', model: prisma.user },
		{ name: 'roles', model: prisma.role },
		{ name: 'userRoles', model: prisma.userRole },
		{ name: 'permissions', model: prisma.permission },
		{ name: 'students', model: prisma.student },
		{ name: 'careers', model: prisma.career },
		{ name: 'locations', model: prisma.location },
		{ name: 'careerLocations', model: prisma.careerLocation },
		{ name: 'userLocationPermissions', model: prisma.userLocationPermission },
		{ name: 'academicTerms', model: prisma.academicTerm },
		{ name: 'payments', model: prisma.payment },
		{ name: 'studentCharges', model: prisma.studentCharge },
		{ name: 'studentDocuments', model: prisma.studentDocument },
		{ name: 'studentFollowUps', model: prisma.studentFollowUp },
		{ name: 'subjects', model: prisma.subject },
		{ name: 'careerSubjects', model: prisma.careerSubject },
		{ name: 'studentSubjectStatuses', model: prisma.studentSubjectStatus },
		{ name: 'teachers', model: prisma.teacher },
		{ name: 'academicYearHistory', model: prisma.academicYearHistory }
	];

	const report: any = {};

	for (const table of tables) {
		try {
			const count = await (table.model as any).count();
			report[table.name] = { count };

			if (count > 0) {
				const data = await (table.model as any).findMany();
				report[table.name].sample = data.slice(0, 3); // Guardar muestra de 3 registros

				// Exportar datos completos a JSON
				const filePath = path.join(backupDir, `${table.name}.json`);
				fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
				console.log(`✅ ${table.name}: ${count} registros → backup guardado`);
			} else {
				console.log(`⚪ ${table.name}: 0 registros`);
			}
		} catch (error) {
			console.log(`❌ ${table.name}: Error - ${(error as any).message}`);
			report[table.name] = { error: (error as any).message };
		}
	}

	// Guardar reporte
	const reportPath = path.join(backupDir, 'report.json');
	fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

	console.log(`\n📊 Reporte guardado en: ${reportPath}`);
	console.log(`💾 Backup completo en: ${backupDir}`);

	// Resumen
	const totalTables = Object.keys(report).length;
	const tablesWithData = Object.values(report).filter((t: any) => t.count > 0).length;
	const totalRecords = Object.values(report).reduce(
		(sum: number, t: any) => sum + (t.count || 0),
		0
	);

	console.log(`\n📈 Resumen:`);
	console.log(`   - Tablas inspeccionadas: ${totalTables}`);
	console.log(`   - Tablas con datos: ${tablesWithData}`);
	console.log(`   - Total de registros: ${totalRecords}`);

	await prisma.$disconnect();
}

inspectAndBackup().catch(console.error);
