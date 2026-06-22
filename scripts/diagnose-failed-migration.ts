import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseFailedMigration() {
  console.log('🔍 Diagnóstico de Migración Fallida - Consultas Read-Only\n');

  try {
    // 1. Estado de la migración fallida en _prisma_migrations
    console.log('=== 1. Estado de _prisma_migrations ===');
    const migrationStatus = await prisma.$queryRawUnsafe(`
      SELECT
        id,
        migration_name,
        started_at,
        finished_at,
        rolled_back_at,
        applied_steps_count,
        logs
      FROM "_prisma_migrations"
      WHERE migration_name = '20260620164627_add_payment_agreements_phase1'
    `) as any[];
    
    if (migrationStatus.length === 0) {
      console.log('❌ No se encontró registro de la migración fallida');
    } else {
      console.log('Registro de migración fallida:');
      migrationStatus.forEach((row: any) => {
        console.log(`  - ID: ${row.id}`);
        console.log(`  - Migration Name: ${row.migration_name}`);
        console.log(`  - Started At: ${row.started_at}`);
        console.log(`  - Finished At: ${row.finished_at}`);
        console.log(`  - Rolled Back At: ${row.rolled_back_at}`);
        console.log(`  - Applied Steps Count: ${row.applied_steps_count}`);
        console.log(`  - Logs: ${row.logs}`);
      });
    }

    // 2. Índices de student_subject_status
    console.log('\n=== 2. Índices de student_subject_status ===');
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'student_subject_status'
      ORDER BY indexname
    `) as any[];
    
    console.log(`Total de índices: ${indexes.length}`);
    indexes.forEach((row: any) => {
      console.log(`  - ${row.indexname}`);
      console.log(`    ${row.indexdef}`);
    });

    // 3. Constraints de student_subject_status
    console.log('\n=== 3. Constraints de student_subject_status ===');
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'student_subject_status'
      ORDER BY tc.constraint_name, kcu.column_name
    `) as any[];
    
    console.log(`Total de constraints: ${constraints.length}`);
    constraints.forEach((row: any) => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_type} (${row.column_name})`);
    });

    // 4. Tablas de Convenios (si se creó algo parcial)
    console.log('\n=== 4. Tablas de Convenios ===');
    const agreementTables = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name ILIKE '%agreement%'
      ORDER BY table_name
    `) as any[];
    
    if (agreementTables.length === 0) {
      console.log('✅ No se encontraron tablas de Convenios (no se creó nada parcial)');
    } else {
      console.log(`⚠️ Se encontraron ${agreementTables.length} tablas de Convenios:`);
      agreementTables.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    }

    // 5. Enums de Convenios (si se creó algo parcial)
    console.log('\n=== 5. Enums de Convenios ===');
    const agreementEnums = await prisma.$queryRawUnsafe(`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname ILIKE '%agreement%'
      ORDER BY t.typname, e.enumsortorder
    `) as any[];
    
    if (agreementEnums.length === 0) {
      console.log('✅ No se encontraron enums de Convenios (no se creó nada parcial)');
    } else {
      console.log(`⚠️ Se encontraron enums de Convenios:`);
      const enumMap = new Map<string, string[]>();
      agreementEnums.forEach((row: any) => {
        if (!enumMap.has(row.enum_name)) {
          enumMap.set(row.enum_name, []);
        }
        enumMap.get(row.enum_name)!.push(row.enum_value);
      });
      enumMap.forEach((values, enumName) => {
        console.log(`  - ${enumName}: [${values.join(', ')}]`);
      });
    }

    console.log('\n✅ Diagnóstico completado exitosamente (solo consultas read-only)');

  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseFailedMigration();
