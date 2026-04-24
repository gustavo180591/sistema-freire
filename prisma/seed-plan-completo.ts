import { PrismaClient, SubjectType, TrainingField, CorrelativeType, AccreditationMode } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface MateriaData {
  code: string;
  name: string;
  subjectType: string;
  trainingField: string;
  yearLevel: number;
  accreditationMode: string;
  hoursPerWeek: number;
  careers: string[];
}

interface CorrelativaData {
  subjectCode: string;
  requiredCodes: string[];
  type: string;
}

interface PlanData {
  carreras: { code: string; name: string; resolution: string; durationYears: number }[];
  plan: { version: string; isDefault: boolean };
  materias: MateriaData[];
  correlativas: CorrelativaData[];
}

async function loadPlanData(): Promise<PlanData> {
  const filePath = path.join(process.cwd(), 'data', 'plan-estudios.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as PlanData;
}

async function seedCarreras(carreras: PlanData['carreras']) {
  console.log('📚 Creando carreras...');
  const careerMap = new Map<string, string>(); // code -> id

  for (const carrera of carreras) {
    const career = await prisma.career.upsert({
      where: { code: carrera.code },
      update: {
        name: carrera.name,
        trainingField: TrainingField.ESPECIFICA,
        resolution: carrera.resolution,
        durationYears: carrera.durationYears,
      },
      create: {
        code: carrera.code,
        name: carrera.name,
        trainingField: TrainingField.ESPECIFICA,
        resolution: carrera.resolution,
        durationYears: carrera.durationYears,
        active: true,
      }
    });
    careerMap.set(career.code, career.id);
    console.log(`  ✅ ${career.name}`);
  }

  return careerMap;
}

async function seedMaterias(materias: MateriaData[], careerMap: Map<string, string>) {
  console.log('\n📖 Creando materias...');
  const subjectMap = new Map<string, string>(); // code -> id

  // Primero creamos/actualizamos todas las materias
  for (const mat of materias) {
    const subject = await prisma.subject.upsert({
      where: { code: mat.code },
      update: {
        name: mat.name,
        subjectType: mat.subjectType as SubjectType,
        trainingField: mat.trainingField as TrainingField,
        yearLevel: mat.yearLevel,
        accreditationMode: mat.accreditationMode as AccreditationMode,
        hoursPerWeek: mat.hoursPerWeek,
        active: true,
      },
      create: {
        code: mat.code,
        name: mat.name,
        subjectType: mat.subjectType as SubjectType,
        trainingField: mat.trainingField as TrainingField,
        yearLevel: mat.yearLevel,
        accreditationMode: mat.accreditationMode as AccreditationMode,
        hoursPerWeek: mat.hoursPerWeek,
        active: true,
      }
    });
    subjectMap.set(subject.code, subject.id);
    console.log(`  ✅ ${subject.code} - ${subject.name}`);
  }

  // Luego vinculamos a carreras
  console.log('\n🔗 Vinculando materias a carreras...');
  for (const mat of materias) {
    const subjectId = subjectMap.get(mat.code);
    if (!subjectId) continue;

    for (const careerCode of mat.careers) {
      const careerId = careerMap.get(careerCode);
      if (!careerId) continue;

      await prisma.careerSubject.upsert({
        where: {
          careerId_subjectId: {
            careerId,
            subjectId,
          }
        },
        update: {
          yearLevel: mat.yearLevel,
          isMandatory: true,
        },
        create: {
          careerId,
          subjectId,
          yearLevel: mat.yearLevel,
          isMandatory: true,
        }
      });
    }
  }

  console.log(`  ✅ ${materias.length} materias vinculadas`);
  return subjectMap;
}

async function seedCorrelativas(correlativas: CorrelativaData[], subjectMap: Map<string, string>) {
  console.log('\n🔗 Creando correlativas...');
  let count = 0;

  for (const corr of correlativas) {
    const subjectId = subjectMap.get(corr.subjectCode);
    if (!subjectId) {
      console.log(`  ⚠️ Materia ${corr.subjectCode} no encontrada`);
      continue;
    }

    for (const requiredCode of corr.requiredCodes) {
      const requiredSubjectId = subjectMap.get(requiredCode);
      if (!requiredSubjectId) {
        console.log(`  ⚠️ Materia requerida ${requiredCode} no encontrada`);
        continue;
      }

      // Verificar si ya existe
      const existing = await prisma.subjectCorrelative.findFirst({
        where: {
          subjectId,
          requiredSubjectId,
          careerId: null
        }
      });

      if (existing) {
        await prisma.subjectCorrelative.update({
          where: { id: existing.id },
          data: {
            correlativeType: corr.type as CorrelativeType,
            isActive: true,
          }
        });
      } else {
        await prisma.subjectCorrelative.create({
          data: {
            subjectId,
            requiredSubjectId,
            correlativeType: corr.type as CorrelativeType,
            careerId: null,
            isActive: true,
          }
        });
      }
      count++;
      console.log(`  ✅ ${corr.subjectCode} → ${requiredCode} (${corr.type})`);
    }
  }

  console.log(`\n📊 Total correlativas: ${count}`);
}

async function seedPlanes(careerMap: Map<string, string>) {
  console.log('\n📋 Creando planes de estudio...');

  for (const [careerCode, careerId] of careerMap) {
    await prisma.studyPlan.upsert({
      where: {
        careerId_version: {
          careerId,
          version: '2024-01'
        }
      },
      update: {
        isDefault: true,
        active: true,
      },
      create: {
        careerId,
        version: '2024-01',
        name: `Plan 2024 - ${careerCode}`,
        isDefault: true,
        active: true,
      }
    });
    console.log(`  ✅ Plan 2024-01 para ${careerCode}`);
  }
}

async function main() {
  console.log('🌱 Iniciando seed del plan completo...\n');

  try {
    const data = await loadPlanData();
    
    // 1. Crear carreras
    const careerMap = await seedCarreras(data.carreras);
    
    // 2. Crear materias y vincular a carreras
    const subjectMap = await seedMaterias(data.materias, careerMap);
    
    // 3. Crear planes de estudio
    await seedPlanes(careerMap);
    
    // 4. Crear correlativas
    await seedCorrelativas(data.correlativas, subjectMap);

    console.log('\n✅ Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   • Carreras: ${data.carreras.length}`);
    console.log(`   • Materias: ${data.materias.length}`);
    console.log(`   • Correlativas: ${data.correlativas.length}`);

    // Estadísticas por tipo
    const byType = data.materias.reduce((acc, m) => {
      acc[m.subjectType] = (acc[m.subjectType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📚 Materias por tipo:');
    for (const [type, count] of Object.entries(byType)) {
      console.log(`   • ${type}: ${count}`);
    }

    // Estadísticas por año
    const byYear = data.materias.reduce((acc, m) => {
      acc[m.yearLevel] = (acc[m.yearLevel] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    console.log('\n📅 Materias por año:');
    for (const [year, count] of Object.entries(byYear)) {
      console.log(`   • ${year}° año: ${count}`);
    }

  } catch (error) {
    console.error('\n❌ Error en seed:', error);
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
