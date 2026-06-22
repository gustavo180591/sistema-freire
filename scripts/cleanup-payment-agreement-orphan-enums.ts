import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanEnums() {
  console.log('🧹 Limpieza Controlada de Enums Huérfanos de Convenios\n');

  try {
    const orphanEnums = [
      'PaymentAgreementChargeRelationType',
      'PaymentAgreementEventType',
      'PaymentAgreementInstallmentStatus',
      'PaymentAgreementStatus',
      'FinancialBlockExceptionSource'
    ];

    for (const enumName of orphanEnums) {
      console.log(`=== Verificando ${enumName} ===`);
      
      // Verificar dependencias de tablas/columnas
      const tableDependencies = await prisma.$queryRawUnsafe(`
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
      
      if (tableDependencies.length > 0) {
        console.log(`❌ ABORTANDO: ${enumName} tiene ${tableDependencies.length} dependencias de tablas/columnas:`);
        tableDependencies.forEach((dep: any) => {
          console.log(`  - ${dep.dependent_object} -> ${dep.referenced_object} (${dep.dependency_type})`);
        });
        console.log('\n⚠️ No se puede eliminar este enum sin romper dependencias.');
        console.log('⚠️ Abortando limpieza completa.');
        return;
      }
      
      console.log(`✅ ${enumName} no tiene dependencias de tablas/columnas (puede eliminarse safely)`);
    }

    console.log('\n=== Todos los enums pasaron verificación de dependencias ===');
    console.log('=== Procediendo con eliminación ===\n');

    // Eliminar enums
    for (const enumName of orphanEnums) {
      console.log(`🗑️ Eliminando ${enumName}...`);
      
      await prisma.$queryRawUnsafe(`
        DROP TYPE IF EXISTS "${enumName}"
      `);
      
      console.log(`✅ ${enumName} eliminado exitosamente`);
    }

    console.log('\n✅ Limpieza completada exitosamente');
    console.log('📊 Resumen:');
    console.log(`  - Enums eliminados: ${orphanEnums.length}`);
    console.log(`  - ${orphanEnums.join(', ')}`);

  } catch (error) {
    console.error('❌ Error durante limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanEnums();
