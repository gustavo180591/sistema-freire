#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Limpiando base de datos...\n');
  
  // Borrar en orden correcto (dependencias primero)
  await prisma.subjectCorrelative.deleteMany({});
  console.log('  ✅ Correlativas eliminadas');
  
  await prisma.careerSubject.deleteMany({});
  console.log('  ✅ CareerSubjects eliminadas');
  
  await prisma.planSubject.deleteMany({});
  console.log('  ✅ PlanSubjects eliminadas');
  
  await prisma.studyPlan.deleteMany({});
  console.log('  ✅ Planes de estudio eliminados');
  
  await prisma.subject.deleteMany({});
  console.log('  ✅ Materias eliminadas');
  
  // No borramos carreras para mantener los IDs
  console.log('\n🧹 Limpieza completada\n');
}

// Datos exactos del documento oficial
const MATERIAS_MATEMATICA = [
  // 1° Año
  { code: 'MAT-TOLE-1', name: 'Taller de Oralidad, Lectura y Escritura', year: 1, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 3 },
  { code: 'MAT-FIL-1', name: 'Filosofía', year: 1, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 3 },
  { code: 'MAT-PED-1', name: 'Pedagogía', year: 1, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'MAT-ALG1-1', name: 'Álgebra I', year: 1, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-GEO1-1', name: 'Geometría I', year: 1, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-TRP-1', name: 'Taller de Resolución de Problemas', year: 1, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 3 },
  { code: 'MAT-PRA1-1', name: 'Práctica I', year: 1, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'PRACTICA', hours: 6 },
  { code: 'MAT-EDI1-1', name: 'EDI I: Taller de Ciudadanía', year: 1, mode: 'PROMOCIONAL', type: 'EDI', field: 'EDI', hours: 2 },
  
  // 2° Año
  { code: 'MAT-TIC-2', name: 'TIC', year: 2, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 2 },
  { code: 'MAT-DIDG-2', name: 'Didáctica General', year: 2, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'MAT-PSI-2', name: 'Psicología Educacional', year: 2, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'MAT-SUE-2', name: 'Sujeto de la Educación Secundaria', year: 2, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'MAT-ALG2-2', name: 'Álgebra II', year: 2, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-GEO2-2', name: 'Geometría II', year: 2, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-ANAI-2', name: 'Análisis Matemático I', year: 2, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-DIDMAT1-2', name: 'Didáctica de la Matemática I', year: 2, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-TICMAT-2', name: 'TIC en la Enseñanza de la Matemática', year: 2, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 3 },
  { code: 'MAT-PRA2-2', name: 'Práctica II', year: 2, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'PRACTICA', hours: 6 },
  { code: 'MAT-EDI2-2', name: 'EDI II: Taller de Expresión Corporal y Uso Apropiado de la Voz', year: 2, mode: 'PROMOCIONAL', type: 'EDI', field: 'EDI', hours: 2 },
  
  // 3° Año
  { code: 'MAT-HIS-3', name: 'Historia y Política de la Educación Argentina', year: 3, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'MAT-SOC-3', name: 'Sociología de la Educación', year: 3, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'MAT-ALG3-3', name: 'Álgebra III', year: 3, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-ANAII-3', name: 'Análisis Matemático II', year: 3, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-EST-3', name: 'Estadística y Probabilidad', year: 3, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-GEO3-3', name: 'Geometría III', year: 3, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-DIDMAT2-3', name: 'Didáctica de la Matemática II', year: 3, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-MATFIN-3', name: 'Matemática Financiera', year: 3, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 3 },
  { code: 'MAT-MATAPP-3', name: 'Matemática Aplicada', year: 3, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 3 },
  { code: 'MAT-PRA3-3', name: 'Práctica III', year: 3, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'PRACTICA', hours: 6 },
  { code: 'MAT-EDI3-3', name: 'EDI III: Derecho Laboral Docente y Seguridad Social', year: 3, mode: 'EXAMEN_FINAL', type: 'EDI', field: 'EDI', hours: 3 },
  
  // 4° Año
  { code: 'MAT-ESI-4', name: 'Educación Sexual Integral', year: 4, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 2 },
  { code: 'MAT-FEC-4', name: 'Formación Ética y Ciudadana', year: 4, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 2 },
  { code: 'MAT-METNUM-4', name: 'Métodos Numéricos', year: 4, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 3 },
  { code: 'MAT-HISMAT-4', name: 'Historia y Fundamentos de la Matemática', year: 4, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 3 },
  { code: 'MAT-SEMDID-4', name: 'Seminario de Didáctica de la Matemática', year: 4, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-ANAIII-4', name: 'Análisis Matemático III', year: 4, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'MAT-RES-4', name: 'Residencia Pedagógica', year: 4, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'PRACTICA', hours: 12 },
  { code: 'MAT-EDI4-4', name: 'EDI IV: Investigación - Acción', year: 4, mode: 'EXAMEN_FINAL', type: 'EDI', field: 'EDI', hours: 3 },
];

const MATERIAS_LENGUA = [
  // 1° Año
  { code: 'LEN-TOLE-1', name: 'Taller de Oralidad, Lectura y Escritura', year: 1, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 3 },
  { code: 'LEN-FIL-1', name: 'Filosofía', year: 1, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 3 },
  { code: 'LEN-PED-1', name: 'Pedagogía', year: 1, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'LEN-LITJ-1', name: 'Literatura para Jóvenes', year: 1, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-TAL-1', name: 'Teoría y Análisis Literarios', year: 1, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-HAL-1', name: 'Historia del Arte y la Literatura', year: 1, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-GRA1-1', name: 'Gramática I', year: 1, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-PRA1-1', name: 'Práctica I', year: 1, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'PRACTICA', hours: 6 },
  { code: 'LEN-EDI1-1', name: 'EDI I: Taller de Ciudadanía', year: 1, mode: 'PROMOCIONAL', type: 'EDI', field: 'EDI', hours: 2 },
  
  // 2° Año
  { code: 'LEN-TIC-2', name: 'TIC', year: 2, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 2 },
  { code: 'LEN-DIDG-2', name: 'Didáctica General', year: 2, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'LEN-PSI-2', name: 'Psicología Educacional', year: 2, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'LEN-SUE-2', name: 'Sujetos de la Educación Secundaria', year: 2, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'LEN-SEM-2', name: 'Semiótica y Análisis del Discurso', year: 2, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-LITES-2', name: 'Literatura Española', year: 2, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-GRA2-2', name: 'Gramática II', year: 2, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-DIDLEN1-2', name: 'Didáctica de la Lengua y la Literatura I', year: 2, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-PRA2-2', name: 'Práctica II', year: 2, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'PRACTICA', hours: 6 },
  { code: 'LEN-EDI2-2', name: 'EDI II: Taller de Expresión Corporal y Uso Apropiado de la Voz', year: 2, mode: 'PROMOCIONAL', type: 'EDI', field: 'EDI', hours: 2 },
  
  // 3° Año
  { code: 'LEN-HIS-3', name: 'Historia y Política de la Educación Argentina', year: 3, mode: 'EXAMEN_FINAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'LEN-SOC-3', name: 'Sociología de la Educación', year: 3, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 4 },
  { code: 'LEN-LENGRE-3', name: 'Lengua y Literatura Grecolatina', year: 3, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-LIN1-3', name: 'Lingüística I', year: 3, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-LITARG1-3', name: 'Literatura Argentina I', year: 3, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-LITLAT-3', name: 'Literatura Latinoamericana', year: 3, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-DIDLEN2-3', name: 'Didáctica de la Lengua y la Literatura II', year: 3, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-PRA3-3', name: 'Práctica III', year: 3, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'PRACTICA', hours: 6 },
  { code: 'LEN-EDI3-3', name: 'EDI III: Derecho Laboral Docente y Seguridad Social', year: 3, mode: 'EXAMEN_FINAL', type: 'EDI', field: 'EDI', hours: 3 },
  
  // 4° Año
  { code: 'LEN-ESI-4', name: 'Educación Sexual Integral', year: 4, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 2 },
  { code: 'LEN-FEC-4', name: 'Formación Ética y Ciudadana', year: 4, mode: 'PROMOCIONAL', type: 'COMMON', field: 'GENERAL', hours: 2 },
  { code: 'LEN-LIN2-4', name: 'Lingüística II', year: 4, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-LITARG2-4', name: 'Literatura Argentina II', year: 4, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-LITUNI-4', name: 'Literatura Universal', year: 4, mode: 'EXAMEN_FINAL', type: 'CAREER_SPECIFIC', field: 'ESPECIFICA', hours: 4 },
  { code: 'LEN-RES-4', name: 'Residencia Pedagógica', year: 4, mode: 'PROMOCIONAL', type: 'CAREER_SPECIFIC', field: 'PRACTICA', hours: 12 },
  { code: 'LEN-EDI4-4', name: 'EDI IV: Investigación - Acción', year: 4, mode: 'EXAMEN_FINAL', type: 'EDI', field: 'EDI', hours: 3 },
];

async function seedSubjects(materias: typeof MATERIAS_MATEMATICA, careerId: string) {
  for (const mat of materias) {
    const subject = await prisma.subject.upsert({
      where: { code: mat.code },
      update: {
        name: mat.name,
        subjectType: mat.type as any,
        trainingField: mat.field as any,
        yearLevel: mat.year,
        accreditationMode: mat.mode as any,
        hoursPerWeek: mat.hours,
      },
      create: {
        code: mat.code,
        name: mat.name,
        subjectType: mat.type as any,
        trainingField: mat.field as any,
        yearLevel: mat.year,
        accreditationMode: mat.mode as any,
        hoursPerWeek: mat.hours,
      },
    });
    
    await prisma.careerSubject.upsert({
      where: {
        careerId_subjectId: {
          careerId,
          subjectId: subject.id,
        },
      },
      update: { yearLevel: mat.year, isMandatory: true },
      create: {
        careerId,
        subjectId: subject.id,
        yearLevel: mat.year,
        isMandatory: true,
      },
    });
    
    console.log(`  ✅ ${mat.code} - ${mat.name}`);
  }
}

async function main() {
  try {
    // 1. Limpiar
    await cleanDatabase();
    
    // 2. Crear/verificar carreras
    let careerMat = await prisma.career.findUnique({ where: { code: 'MATEMATICA' } });
    let careerLen = await prisma.career.findUnique({ where: { code: 'LENGUA_LITERATURA' } });
    
    if (!careerMat) {
      careerMat = await prisma.career.create({
        data: {
          code: 'MATEMATICA',
          name: 'Profesorado de Matemática',
          trainingField: 'ESPECIFICA',
          durationYears: 4,
          active: true
        }
      });
      console.log('  ✅ Carrera Matemática creada');
    }
    
    if (!careerLen) {
      careerLen = await prisma.career.create({
        data: {
          code: 'LENGUA_LITERATURA',
          name: 'Profesorado de Lengua y Literatura',
          trainingField: 'ESPECIFICA',
          durationYears: 4,
          active: true
        }
      });
      console.log('  ✅ Carrera Lengua creada');
    }
    
    // 3. Seed Matemática
    console.log('\n📐 Cargando Matemática...');
    await seedSubjects(MATERIAS_MATEMATICA, careerMat.id);
    
    // 4. Seed Lengua
    console.log('\n📚 Cargando Lengua y Literatura...');
    await seedSubjects(MATERIAS_LENGUA, careerLen.id);
    
    // 5. Crear planes
    await prisma.studyPlan.create({
      data: {
        careerId: careerMat.id,
        name: 'Plan 2024 - Matemática',
        version: '2024-01',
        isDefault: true,
        active: true,
      },
    });
    
    await prisma.studyPlan.create({
      data: {
        careerId: careerLen.id,
        name: 'Plan 2024 - Lengua',
        version: '2024-01',
        isDefault: true,
        active: true,
      },
    });
    
    console.log('\n✅ Seed completado!');
    console.log(`   • Matemática: ${MATERIAS_MATEMATICA.length} materias`);
    console.log(`   • Lengua: ${MATERIAS_LENGUA.length} materias`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
