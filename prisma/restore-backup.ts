import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RestorePlan {
	table: string;
	dependsOn: string[];
	count: number;
	filePath: string;
}

interface DryRunReport {
	table: string;
	count: number;
	dependsOn: string[];
	status: 'OK' | 'MISSING_DEPENDENCY' | 'INVALID_REFERENCE' | 'MISSING_FILE';
	issues: string[];
}

async function restoreBackup(backupPath: string, dryRun: boolean = true) {
	console.log(`🔍 ${dryRun ? 'DRY-RUN' : 'RESTORING'} desde: ${backupPath}\n`);

	// Orden de restauración respetando dependencias de foreign keys
	// NOTA: roles y users NO se restauran porque el seed ya los crea
	const restorePlan: RestorePlan[] = [
		{ table: 'locations', dependsOn: [], count: 0, filePath: path.join(backupPath, 'locations.json') },
		{ table: 'careers', dependsOn: [], count: 0, filePath: path.join(backupPath, 'careers.json') },
		{ table: 'careerLocations', dependsOn: ['careers', 'locations'], count: 0, filePath: path.join(backupPath, 'careerLocations.json') },
		{ table: 'academicTerms', dependsOn: ['locations'], count: 0, filePath: path.join(backupPath, 'academicTerms.json') },
		{ table: 'subjects', dependsOn: [], count: 0, filePath: path.join(backupPath, 'subjects.json') },
		{ table: 'careerSubjects', dependsOn: ['careers', 'subjects'], count: 0, filePath: path.join(backupPath, 'careerSubjects.json') },
		{ table: 'teachers', dependsOn: ['users'], count: 0, filePath: path.join(backupPath, 'teachers.json') },
		{ table: 'userLocationPermissions', dependsOn: ['users', 'locations'], count: 0, filePath: path.join(backupPath, 'userLocationPermissions.json') },
	];

	const dryRunReport: DryRunReport[] = [];
	const idMap: Map<string, string> = new Map(); // Mapeo de IDs viejos a nuevos si es necesario

	// Fase 1: Validación (dry-run)
	for (const plan of restorePlan) {
		const report: DryRunReport = {
			table: plan.table,
			count: 0,
			dependsOn: plan.dependsOn,
			status: 'OK',
			issues: []
		};

		// Verificar que el archivo existe
		if (!fs.existsSync(plan.filePath)) {
			report.status = 'MISSING_FILE';
			report.issues.push(`Archivo no encontrado: ${plan.filePath}`);
			dryRunReport.push(report);
			continue;
		}

		// Leer datos
		const data = JSON.parse(fs.readFileSync(plan.filePath, 'utf-8'));
		report.count = data.length;
		plan.count = data.length;

		// Verificar dependencias
		for (const dep of plan.dependsOn) {
			// Si la dependencia es 'users', asumimos que existe porque el seed lo crea
			if (dep === 'users') {
				continue;
			}
			const depPlan = restorePlan.find(p => p.table === dep);
			if (!depPlan || depPlan.count === 0) {
				report.status = 'MISSING_DEPENDENCY';
				report.issues.push(`Dependencia faltante: ${dep}`);
			}
		}

		// En dry-run, solo validar estructura de datos, no referencias cruzadas
		// Las referencias se validarán durante la restauración real
		if (data.length > 0) {
			const sample = data[0];
			
			// Validar que los campos obligatorios existan
			if (plan.table === 'userRoles') {
				const missingFields = data.filter((r: any) => !r.userId || !r.roleId);
				if (missingFields.length > 0) {
					report.status = 'INVALID_REFERENCE';
					report.issues.push(`${missingFields.length} registros con campos faltantes (userId o roleId)`);
				}
			}
			
			if (plan.table === 'careerLocations') {
				const missingFields = data.filter((r: any) => !r.careerId || !r.locationId);
				if (missingFields.length > 0) {
					report.status = 'INVALID_REFERENCE';
					report.issues.push(`${missingFields.length} registros con campos faltantes (careerId o locationId)`);
				}
			}

			if (plan.table === 'academicTerms') {
				const missingFields = data.filter((r: any) => !r.name || !r.code || !r.year);
				if (missingFields.length > 0) {
					report.status = 'INVALID_REFERENCE';
					report.issues.push(`${missingFields.length} registros con campos faltantes (name, code o year)`);
				}
			}

			if (plan.table === 'careerSubjects') {
				const missingFields = data.filter((r: any) => !r.careerId || !r.subjectId);
				if (missingFields.length > 0) {
					report.status = 'INVALID_REFERENCE';
					report.issues.push(`${missingFields.length} registros con campos faltantes (careerId o subjectId)`);
				}
			}

			if (plan.table === 'teachers') {
				const missingFields = data.filter((r: any) => !r.userId || !r.dni);
				if (missingFields.length > 0) {
					report.status = 'INVALID_REFERENCE';
					report.issues.push(`${missingFields.length} registros con campos faltantes (userId o dni)`);
				}
			}

			if (plan.table === 'userLocationPermissions') {
				const missingFields = data.filter((r: any) => !r.userId || !r.locationId);
				if (missingFields.length > 0) {
					report.status = 'INVALID_REFERENCE';
					report.issues.push(`${missingFields.length} registros con campos faltantes (userId o locationId)`);
				}
			}
		}

		dryRunReport.push(report);
	}

	// Imprimir reporte dry-run
	console.log('📊 REPORTE DRY-RUN\n');
	console.log('┌─────────────────────────────┬────────┬──────────────────────────┬──────────┐');
	console.log('│ Tabla                      │ Registros│ Dependencias              │ Estado   │');
	console.log('├─────────────────────────────┼────────┼──────────────────────────┼──────────┤');

	for (const report of dryRunReport) {
		const deps = report.dependsOn.join(', ') || '-';
		const status = report.status === 'OK' ? '✅ OK' : `❌ ${report.status}`;
		console.log(`│ ${report.table.padEnd(27)} │ ${String(report.count).padEnd(6)} │ ${deps.padEnd(24)} │ ${status.padEnd(8)} │`);
		
		if (report.issues.length > 0) {
			for (const issue of report.issues) {
				console.log(`│   ⚠️ ${issue.padEnd(79)} │`);
			}
		}
	}

	console.log('└─────────────────────────────┴────────┴──────────────────────────┴──────────┘\n');

	// Resumen
	const totalRecords = dryRunReport.reduce((sum, r) => sum + r.count, 0);
	const tablesWithIssues = dryRunReport.filter(r => r.status !== 'OK').length;

	console.log(`📈 Resumen:`);
	console.log(`   - Total de registros a restaurar: ${totalRecords}`);
	console.log(`   - Tablas con problemas: ${tablesWithIssues}`);
	console.log(`   - Tablas OK: ${dryRunReport.length - tablesWithIssues}`);

	if (tablesWithIssues > 0) {
		console.log(`\n❌ DRY-RUN FALLÓ: Hay ${tablesWithIssues} tablas con problemas. No se puede proceder con la restauración.`);
		await prisma.$disconnect();
		process.exit(1);
	}

	if (dryRun) {
		console.log(`\n✅ DRY-RUN EXITOSO: El script está listo para restaurar ${totalRecords} registros.`);
		console.log(`\nPara ejecutar la restauración real, usa:`);
		console.log(`   npx tsx prisma/restore-backup.ts ${backupPath} --execute`);
		await prisma.$disconnect();
		return;
	}

	// Fase 2: Restauración real
	console.log(`\n🚀 Iniciando restauración...\n`);

	for (const plan of restorePlan) {
		console.log(`📥 Restaurando ${plan.table} (${plan.count} registros)...`);

		const data = JSON.parse(fs.readFileSync(plan.filePath, 'utf-8'));

		try {
			switch (plan.table) {
				case 'locations':
					await prisma.location.createMany({ data, skipDuplicates: true });
					data.forEach((l: any) => idMap.set(l.id, l.id));
					break;
				case 'careers':
					await prisma.career.createMany({ data, skipDuplicates: true });
					data.forEach((c: any) => idMap.set(c.id, c.id));
					break;
				case 'careerLocations':
					await prisma.careerLocation.createMany({ data, skipDuplicates: true });
					break;
				case 'academicTerms':
					await prisma.academicTerm.createMany({ data, skipDuplicates: true });
					break;
				case 'subjects':
					await prisma.subject.createMany({ data, skipDuplicates: true });
					data.forEach((s: any) => idMap.set(s.id, s.id));
					break;
				case 'careerSubjects':
					await prisma.careerSubject.createMany({ data, skipDuplicates: true });
					break;
				case 'teachers':
					await prisma.teacher.createMany({ data, skipDuplicates: true });
					break;
				case 'userLocationPermissions':
					// Filtrar para solo restaurar permisos de usuarios que existen
					const existingUsers = await prisma.user.findMany({ select: { id: true } });
					const existingUserIds = new Set(existingUsers.map(u => u.id));
					const validPermissions = data.filter((p: any) => existingUserIds.has(p.userId));
					await prisma.userLocationPermission.createMany({ data: validPermissions, skipDuplicates: true });
					console.log(`   ✅ userLocationPermissions: ${validPermissions.length}/${data.length} registros restaurados (filtrados por usuarios existentes)`);
					break;
			}
			console.log(`   ✅ ${plan.table}: ${plan.count} registros restaurados`);
		} catch (error) {
			console.log(`   ❌ ${plan.table}: Error - ${(error as any).message}`);
			throw error;
		}
	}

	console.log(`\n✅ Restauración completada: ${totalRecords} registros restaurados.`);
	await prisma.$disconnect();
}

// Parsear argumentos
const args = process.argv.slice(2);
const backupPath = args[0];
const executeFlag = args.includes('--execute');

if (!backupPath) {
	console.error('❌ Error: Debes especificar la ruta del backup');
	console.error('Uso: npx tsx prisma/restore-backup.ts <backup-path> [--execute]');
	process.exit(1);
}

restoreBackup(backupPath, !executeFlag).catch(console.error);
