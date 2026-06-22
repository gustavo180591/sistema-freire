import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEnumDependencies() {
  console.log('🔍 Verificación de Dependencias de Enums Huérfanos - Consultas Read-Only\n');

  try {
    const orphanEnums = [
      'PaymentAgreementChargeRelationType',
      'PaymentAgreementEventType',
      'PaymentAgreementInstallmentStatus',
      'PaymentAgreementStatus'
    ];

    for (const enumName of orphanEnums) {
      console.log(`=== Dependencias de ${enumName} ===`);
      
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
          AND d.deptype IN ('i', 'a', 'n')
        ORDER BY d.deptype, dependent_object
      `, enumName) as any[];
      
      if (dependencies.length === 0) {
        console.log(`✅ ${enumName} no tiene dependencias (puede eliminarse safely)`);
      } else {
        console.log(`⚠️ ${enumName} tiene ${dependencies.length} dependencias:`);
        dependencies.forEach((dep: any) => {
          console.log(`  - ${dep.dependent_object} -> ${dep.referenced_object} (${dep.dependency_type})`);
        });
      }
    }

    console.log('\n✅ Verificación completada exitosamente (solo consultas read-only)');

  } catch (error) {
    console.error('❌ Error durante verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkEnumDependencies();
