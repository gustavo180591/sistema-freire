import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPreRecoveryState() {
	console.log('🔍 Verificación Previa a Recuperación\n');

	try {
		// Verificar estado de migración fallida
		console.log('=== Estado de Migración Fallida ===');
		const migrationStatus = (await prisma.$queryRawUnsafe(`
      SELECT
        migration_name,
        started_at,
        finished_at,
        rolled_back_at,
        applied_steps_count,
        logs
      FROM "_prisma_migrations"
      WHERE migration_name = '20260620164627_add_payment_agreements_phase1'
    `)) as any[];

		if (migrationStatus.length === 0) {
			console.log('❌ Migración no encontrada en _prisma_migrations');
			return;
		}

		const migration = migrationStatus[0];
		console.log(`Migration Name: ${migration.migration_name}`);
		console.log(`Started At: ${migration.started_at}`);
		console.log(`Finished At: ${migration.finished_at}`);
		console.log(`Rolled Back At: ${migration.rolled_back_at}`);
		console.log(`Applied Steps Count: ${migration.applied_steps_count}`);
		console.log(`Logs: ${migration.logs ? migration.logs.substring(0, 200) + '...' : 'null'}`);

		if (migration.applied_steps_count !== 0) {
			console.log('\n❌ ABORTANDO: La migración tiene applied_steps_count != 0');
			console.log('⚠️ No se puede proceder con la recuperación.');
			return;
		}

		console.log('\n✅ Migración tiene applied_steps_count = 0 (puede proceder)');

		// Verificar enums huérfanos
		console.log('\n=== Enums Huérfanos ===');
		const orphanEnums = (await prisma.$queryRawUnsafe(`
      SELECT t.typname AS enum_name
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname IN (
          'PaymentAgreementChargeRelationType',
          'PaymentAgreementEventType',
          'PaymentAgreementInstallmentStatus',
          'PaymentAgreementStatus'
        )
      ORDER BY t.typname
    `)) as any[];

		if (orphanEnums.length === 0) {
			console.log('ℹ️ No se encontraron enums huérfanos (ya fueron eliminados)');
		} else {
			console.log(`✅ Se encontraron ${orphanEnums.length} enums huérfanos:`);
			orphanEnums.forEach((e: any) => {
				console.log(`  - ${e.enum_name}`);
			});
		}

		// Verificar dependencias de enums huérfanos
		console.log('\n=== Dependencias de Enums Huérfanos ===');
		for (const enumName of [
			'PaymentAgreementChargeRelationType',
			'PaymentAgreementEventType',
			'PaymentAgreementInstallmentStatus',
			'PaymentAgreementStatus'
		]) {
			const dependencies = (await prisma.$queryRawUnsafe(
				`
        SELECT
          d.classid::regclass::text AS dependent_object,
          d.objid::regclass::text AS referenced_object,
          d.deptype AS dependency_type
        FROM pg_depend d
        JOIN pg_type t ON d.objid = t.oid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.typname = $1
          AND d.deptype IN ('a', 'i')
        ORDER BY d.deptype, dependent_object
      `,
				enumName
			)) as any[];

			if (dependencies.length > 0) {
				console.log(
					`❌ ABORTANDO: ${enumName} tiene ${dependencies.length} dependencias de tablas/columnas:`
				);
				dependencies.forEach((dep: any) => {
					console.log(
						`  - ${dep.dependent_object} -> ${dep.referenced_object} (${dep.dependency_type})`
					);
				});
				console.log('\n⚠️ No se puede proceder con la recuperación.');
				return;
			}
		}

		console.log(
			'✅ Todos los enums huérfanos no tienen dependencias de tablas/columnas (pueden eliminarse safely)'
		);

		console.log('\n✅ Verificación previa completada exitosamente');
		console.log('📊 Resumen:');
		console.log(`  - Migración fallida: ${migration.migration_name}`);
		console.log(`  - Applied steps count: ${migration.applied_steps_count}`);
		console.log(`  - Enums huérfanos: ${orphanEnums.length}`);
		console.log(`  - Dependencias de enums: 0`);
		console.log('\n✅ Puede proceder con la recuperación.');
	} catch (error) {
		console.error('❌ Error durante verificación:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

verifyPreRecoveryState();
