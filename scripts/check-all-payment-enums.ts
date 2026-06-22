import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllPaymentEnums() {
  console.log('🔍 Verificando Todos los Enums de Convenios\n');

  try {
    const allPaymentEnums = await prisma.$queryRawUnsafe(`
      SELECT t.typname AS enum_name
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname LIKE '%Payment%'
        OR t.typname LIKE '%Agreement%'
        OR t.typname = 'FinancialBlockExceptionSource'
      ORDER BY t.typname
    `) as any[];

    console.log(`✅ Se encontraron ${allPaymentEnums.length} enums de Convenios:`);
    allPaymentEnums.forEach((e: any) => {
      console.log(`  - ${e.enum_name}`);
    });

    // Verificar dependencias
    console.log('\n=== Dependencias de Enums ===');
    for (const enumRow of allPaymentEnums) {
      const enumName = enumRow.enum_name;
      const dependencies = await prisma.$queryRawUnsafe(`
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
      `, enumName) as any[];

      if (dependencies.length > 0) {
        console.log(`❌ ${enumName} tiene ${dependencies.length} dependencias de tablas/columnas:`);
        dependencies.forEach((dep: any) => {
          console.log(`  - ${dep.dependent_object} -> ${dep.referenced_object} (${dep.dependency_type})`);
        });
      } else {
        console.log(`✅ ${enumName} no tiene dependencias de tablas/columnas`);
      }
    }

  } catch (error) {
    console.error('❌ Error durante verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAllPaymentEnums();
