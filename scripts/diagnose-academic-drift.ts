import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Diagnóstico del Drift Académico - Consultas Read-Only\n');

  try {
    // 1. Estado de migraciones
    console.log('=== 1. Estado de Migraciones ===');
    const migrationsResult = await prisma.$queryRawUnsafe(`
      SELECT migration_name, started_at, finished_at, applied_steps_count 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 10
    `) as any[];
    console.log('Migraciones aplicadas recientemente:');
    migrationsResult.forEach((row: any) => {
      console.log(`  - ${row.migration_name}: ${row.finished_at} (${row.applied_steps_count} steps)`);
    });

    // 2. Tablas existentes
    console.log('\n=== 2. Tablas Existentes ===');
    const tablesResult = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `) as any[];
    console.log(`Total de tablas: ${tablesResult.length}`);
    tablesResult.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    // 3. Enums existentes
    console.log('\n=== 3. Enums Existentes ===');
    const enumsResult = await prisma.$queryRawUnsafe(`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `) as any[];
    const enumMap = new Map<string, string[]>();
    enumsResult.forEach((row: any) => {
      if (!enumMap.has(row.enum_name)) {
        enumMap.set(row.enum_name, []);
      }
      enumMap.get(row.enum_name)!.push(row.enum_value);
    });
    console.log(`Total de enums: ${enumMap.size}`);
    enumMap.forEach((values, enumName) => {
      console.log(`  - ${enumName}: [${values.join(', ')}]`);
    });

    // 4. Columnas de tablas académicas clave
    console.log('\n=== 4. Tablas Académicas Clave ===');
    const academicTables = ['evaluations', 'grades', 'student_subject_status', 'subject_commissions', 'subject_enrollments'];
    for (const tableName of academicTables) {
      const columnsResult = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, tableName) as any[];
      
      if (columnsResult.length > 0) {
        console.log(`\n  Tabla: ${tableName}`);
        columnsResult.forEach((col: any) => {
          console.log(`    - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
      } else {
        console.log(`\n  Tabla: ${tableName} - NO EXISTE`);
      }
    }

    // 5. Constraints y Foreign Keys
    console.log('\n=== 5. Constraints y Foreign Keys ===');
    const constraintsResult = await prisma.$queryRawUnsafe(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = ANY($1)
      ORDER BY tc.table_name, tc.constraint_name
    `, academicTables) as any[];
    
    constraintsResult.forEach((row: any) => {
      console.log(`  - ${row.table_name}.${row.column_name}: ${row.constraint_type} (${row.constraint_name})`);
    });

    console.log('\n✅ Diagnóstico completado exitosamente (solo consultas read-only)');

  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
