import { PrismaClient, SubjectType, TrainingField, CorrelativeType } from '@prisma/client';

const prisma = new PrismaClient();

// ======================================================
// MATERIAS COMUNES - Formación General (todas las carreras)
// ======================================================
const materiasComunes = [
  // 1er Año - Formación General
  { 
    code: 'MAT101', 
    name: 'Matemática I', 
    yearLevel: 1, 
    hoursPerWeek: 4,
    description: 'Números reales, funciones, límites, derivadas e integrales'
  },
  { 
    code: 'LEN101', 
    name: 'Lengua y Literatura I', 
    yearLevel: 1, 
    hoursPerWeek: 4,
    description: 'Gramática, comprensión lectora y producción textual'
  },
  { 
    code: 'HIS101', 
    name: 'Historia Social de la Educación', 
    yearLevel: 1, 
    hoursPerWeek: 3,
    description: 'Evolución histórica de los sistemas educativos'
  },
  { 
    code: 'PSI101', 
    name: 'Psicología General', 
    yearLevel: 1, 
    hoursPerWeek: 3,
    description: 'Bases psicológicas del aprendizaje'
  },
  
  // 2do Año - Formación General
  { 
    code: 'MAT201', 
    name: 'Matemática II', 
    yearLevel: 2, 
    hoursPerWeek: 4,
    description: 'Ecuaciones diferenciales, series, probabilidad'
  },
  { 
    code: 'LEN201', 
    name: 'Lengua y Literatura II', 
    yearLevel: 2, 
    hoursPerWeek: 4,
    description: 'Análisis literario, géneros discursivos'
  },
  { 
    code: 'FIL201', 
    name: 'Filosofía de la Educación', 
    yearLevel: 2, 
    hoursPerWeek: 3,
    description: 'Pensamiento filosófico y educación'
  },
];

// ======================================================
// EDIs - Espacios de Definición Institucional
// ======================================================
const materiasEDIs = [
  { 
    code: 'EDI101', 
    name: 'Taller de Escritura Académica', 
    yearLevel: 1, 
    hoursPerWeek: 2,
    description: 'Desarrollo de habilidades de escritura formal'
  },
  { 
    code: 'EDI102', 
    name: 'Proyectos Comunitarios', 
    yearLevel: 2, 
    hoursPerWeek: 2,
    description: 'Vinculación con la comunidad educativa'
  },
  { 
    code: 'EDI201', 
    name: 'Seminario de Integración I', 
    yearLevel: 3, 
    hoursPerWeek: 2,
    description: 'Integración de saberes disciplinares'
  },
  { 
    code: 'EDI301', 
    name: 'Seminario de Integración II', 
    yearLevel: 4, 
    hoursPerWeek: 2,
    description: 'Proyecto de integración final'
  },
];

// ======================================================
// MATERIAS ESPECÍFICAS - Carrera: Lengua y Literatura
// ======================================================
const materiasLengua = [
  // 1er Año
  { code: 'LEN_ESPEC_101', name: 'Gramática Castellana I', yearLevel: 1, hoursPerWeek: 4 },
  { code: 'LEN_ESPEC_102', name: 'Literatura Argentina', yearLevel: 1, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_103', name: 'Lectura y Escritura', yearLevel: 1, hoursPerWeek: 3 },
  
  // 2do Año
  { code: 'LEN_ESPEC_201', name: 'Gramática Castellana II', yearLevel: 2, hoursPerWeek: 4 },
  { code: 'LEN_ESPEC_202', name: 'Literatura Española', yearLevel: 2, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_203', name: 'Teoría Literaria', yearLevel: 2, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_204', name: 'Didáctica de la Lengua I', yearLevel: 2, hoursPerWeek: 3 },
  
  // 3er Año
  { code: 'LEN_ESPEC_301', name: 'Literatura Latinoamericana', yearLevel: 3, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_302', name: 'Literatura Comparada', yearLevel: 3, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_303', name: 'Análisis del Discurso', yearLevel: 3, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_304', name: 'Didáctica de la Lengua II', yearLevel: 3, hoursPerWeek: 3 },
  
  // 4to Año
  { code: 'LEN_ESPEC_401', name: 'Literatura Universal', yearLevel: 4, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_402', name: 'Sociolingüística', yearLevel: 4, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_403', name: 'Didáctica de la Lengua III', yearLevel: 4, hoursPerWeek: 3 },
  { code: 'LEN_ESPEC_404', name: 'Práctica Docente I', yearLevel: 4, hoursPerWeek: 6, isElective: false },
  { code: 'LEN_ESPEC_405', name: 'Práctica Docente II', yearLevel: 4, hoursPerWeek: 6, isElective: false },
];

// ======================================================
// MATERIAS ESPECÍFICAS - Carrera: Matemática
// ======================================================
const materiasMatematica = [
  // 1er Año
  { code: 'MAT_ESPEC_101', name: 'Álgebra y Geometría I', yearLevel: 1, hoursPerWeek: 5 },
  { code: 'MAT_ESPEC_102', name: 'Análisis Matemático I', yearLevel: 1, hoursPerWeek: 5 },
  { code: 'MAT_ESPEC_103', name: 'Lógica y Conjuntos', yearLevel: 1, hoursPerWeek: 3 },
  
  // 2do Año
  { code: 'MAT_ESPEC_201', name: 'Álgebra y Geometría II', yearLevel: 2, hoursPerWeek: 5 },
  { code: 'MAT_ESPEC_202', name: 'Análisis Matemático II', yearLevel: 2, hoursPerWeek: 5 },
  { code: 'MAT_ESPEC_203', name: 'Álgebra Lineal', yearLevel: 2, hoursPerWeek: 4 },
  { code: 'MAT_ESPEC_204', name: 'Didáctica de la Matemática I', yearLevel: 2, hoursPerWeek: 3 },
  
  // 3er Año
  { code: 'MAT_ESPEC_301', name: 'Análisis Matemático III', yearLevel: 3, hoursPerWeek: 4 },
  { code: 'MAT_ESPEC_302', name: 'Álgebra Abstracta', yearLevel: 3, hoursPerWeek: 4 },
  { code: 'MAT_ESPEC_303', name: 'Probabilidad y Estadística', yearLevel: 3, hoursPerWeek: 4 },
  { code: 'MAT_ESPEC_304', name: 'Didáctica de la Matemática II', yearLevel: 3, hoursPerWeek: 3 },
  
  // 4to Año
  { code: 'MAT_ESPEC_401', name: 'Ecuaciones Diferenciales', yearLevel: 4, hoursPerWeek: 4 },
  { code: 'MAT_ESPEC_402', name: 'Análisis Numérico', yearLevel: 4, hoursPerWeek: 3 },
  { code: 'MAT_ESPEC_403', name: 'Didáctica de la Matemática III', yearLevel: 4, hoursPerWeek: 3 },
  { code: 'MAT_ESPEC_404', name: 'Práctica Docente I', yearLevel: 4, hoursPerWeek: 6, isElective: false },
  { code: 'MAT_ESPEC_405', name: 'Práctica Docente II', yearLevel: 4, hoursPerWeek: 6, isElective: false },
];

// ======================================================
// CORRELATIVIDADES
// ======================================================
const correlativas = [
  // Matemática
  { subjectCode: 'MAT201', requiredCode: 'MAT101', type: CorrelativeType.REGULAR },
  { subjectCode: 'MAT_ESPEC_201', requiredCode: 'MAT_ESPEC_101', type: CorrelativeType.REGULAR },
  { subjectCode: 'MAT_ESPEC_202', requiredCode: 'MAT_ESPEC_102', type: CorrelativeType.REGULAR },
  { subjectCode: 'MAT_ESPEC_203', requiredCode: 'MAT_ESPEC_103', type: CorrelativeType.REGULAR },
  { subjectCode: 'MAT_ESPEC_301', requiredCode: 'MAT_ESPEC_202', type: CorrelativeType.REGULAR },
  
  // Lengua
  { subjectCode: 'LEN201', requiredCode: 'LEN101', type: CorrelativeType.REGULAR },
  { subjectCode: 'LEN_ESPEC_201', requiredCode: 'LEN_ESPEC_101', type: CorrelativeType.REGULAR },
  { subjectCode: 'LEN_ESPEC_202', requiredCode: 'LEN_ESPEC_102', type: CorrelativeType.REGULAR },
  { subjectCode: 'LEN_ESPEC_301', requiredCode: 'LEN_ESPEC_202', type: CorrelativeType.REGULAR },
  { subjectCode: 'LEN_ESPEC_401', requiredCode: 'LEN_ESPEC_301', type: CorrelativeType.REGULAR },
  
  // Prácticas Docentes (requieren 75% de materias aprobadas)
  { subjectCode: 'LEN_ESPEC_404', requiredCode: 'LEN_ESPEC_304', type: CorrelativeType.REGULAR },
  { subjectCode: 'LEN_ESPEC_405', requiredCode: 'LEN_ESPEC_404', type: CorrelativeType.REGULAR },
  { subjectCode: 'MAT_ESPEC_404', requiredCode: 'MAT_ESPEC_304', type: CorrelativeType.REGULAR },
  { subjectCode: 'MAT_ESPEC_405', requiredCode: 'MAT_ESPEC_404', type: CorrelativeType.REGULAR },
  
  // EDIs
  { subjectCode: 'EDI102', requiredCode: 'EDI101', type: CorrelativeType.REGULAR },
  { subjectCode: 'EDI201', requiredCode: 'EDI102', type: CorrelativeType.REGULAR },
  { subjectCode: 'EDI301', requiredCode: 'EDI201', type: CorrelativeType.REGULAR },
];

async function seed() {
  console.log('🌱 Iniciando seed de materias curriculares...\n');

  // ======================================================
  // 1. CREAR/ACTUALIZAR CARRERAS
  // ======================================================
  console.log('📚 Creando carreras...');
  
  const carreraLengua = await prisma.career.upsert({
    where: { code: 'LENGUA_LITERATURA' },
    update: {
      trainingField: TrainingField.ESPECIFICA,
      durationYears: 4,
    },
    create: {
      code: 'LENGUA_LITERATURA',
      name: 'Profesorado de Lengua y Literatura',
      trainingField: TrainingField.ESPECIFICA,
      resolution: 'Res. ME N° 1234/2024',
      durationYears: 4,
      active: true,
    }
  });
  
  const carreraMatematica = await prisma.career.upsert({
    where: { code: 'MATEMATICA' },
    update: {
      trainingField: TrainingField.ESPECIFICA,
      durationYears: 4,
    },
    create: {
      code: 'MATEMATICA',
      name: 'Profesorado de Matemática',
      trainingField: TrainingField.ESPECIFICA,
      resolution: 'Res. ME N° 1235/2024',
      durationYears: 4,
      active: true,
    }
  });
  
  console.log(`  ✅ ${carreraLengua.name}`);
  console.log(`  ✅ ${carreraMatematica.name}\n`);

  // ======================================================
  // 2. CREAR MATERIAS COMUNES (Formación General)
  // ======================================================
  console.log('📖 Creando materias comunes (Formación General)...');
  
  for (const mat of materiasComunes) {
    await prisma.subject.upsert({
      where: { code: mat.code },
      update: {
        name: mat.name,
        yearLevel: mat.yearLevel,
        hoursPerWeek: mat.hoursPerWeek,
        description: mat.description,
      },
      create: {
        code: mat.code,
        name: mat.name,
        subjectType: SubjectType.COMMON,
        trainingField: TrainingField.GENERAL,
        yearLevel: mat.yearLevel,
        hoursPerWeek: mat.hoursPerWeek,
        description: mat.description,
        active: true,
      }
    });
    console.log(`     ${mat.code} - ${mat.name}`);
  }
  console.log();

  // ======================================================
  // 3. CREAR EDIs
  // ======================================================
  console.log('🎯 Creando EDIs (Espacios de Definición Institucional)...');
  
  for (const mat of materiasEDIs) {
    await prisma.subject.upsert({
      where: { code: mat.code },
      update: {
        name: mat.name,
        yearLevel: mat.yearLevel,
        hoursPerWeek: mat.hoursPerWeek,
        description: mat.description,
      },
      create: {
        code: mat.code,
        name: mat.name,
        subjectType: SubjectType.EDI,
        trainingField: TrainingField.GENERAL, // Los EDIs son parte de Formación General
        yearLevel: mat.yearLevel,
        hoursPerWeek: mat.hoursPerWeek,
        description: mat.description,
        active: true,
      }
    });
    console.log(`     ${mat.code} - ${mat.name}`);
  }
  console.log();

  // ======================================================
  // 4. CREAR MATERIAS ESPECÍFICAS DE LENGUA
  // ======================================================
  console.log('📚 Creando materias específicas de Lengua y Literatura...');
  
  for (const mat of materiasLengua) {
    const subject = await prisma.subject.upsert({
      where: { code: mat.code },
      update: {
        name: mat.name,
        yearLevel: mat.yearLevel,
        hoursPerWeek: mat.hoursPerWeek,
        isElective: mat.isElective ?? false,
      },
      create: {
        code: mat.code,
        name: mat.name,
        subjectType: SubjectType.CAREER_SPECIFIC,
        trainingField: TrainingField.ESPECIFICA,
        yearLevel: mat.yearLevel,
        hoursPerWeek: mat.hoursPerWeek,
        isElective: mat.isElective ?? false,
        active: true,
      }
    });
    
    // Vincular a carrera
    await prisma.careerSubject.upsert({
      where: {
        careerId_subjectId: {
          careerId: carreraLengua.id,
          subjectId: subject.id,
        }
      },
      update: {
        yearLevel: mat.yearLevel,
        isMandatory: !mat.isElective,
      },
      create: {
        careerId: carreraLengua.id,
        subjectId: subject.id,
        yearLevel: mat.yearLevel,
        isMandatory: !mat.isElective,
      }
    });
    
    console.log(`     ${mat.code} - ${mat.name} (${mat.yearLevel}° año)`);
  }
  console.log();

  // ======================================================
  // 5. CREAR MATERIAS ESPECÍFICAS DE MATEMÁTICA
  // ======================================================
  console.log('🔢 Creando materias específicas de Matemática...');
  
  for (const mat of materiasMatematica) {
    const subject = await prisma.subject.upsert({
      where: { code: mat.code },
      update: {
        name: mat.name,
        yearLevel: mat.yearLevel,
        hoursPerWeek: mat.hoursPerWeek,
        isElective: mat.isElective ?? false,
      },
      create: {
        code: mat.code,
        name: mat.name,
        subjectType: SubjectType.CAREER_SPECIFIC,
        trainingField: TrainingField.ESPECIFICA,
        yearLevel: mat.yearLevel,
        hoursPerWeek: mat.hoursPerWeek,
        isElective: mat.isElective ?? false,
        active: true,
      }
    });
    
    // Vincular a carrera
    await prisma.careerSubject.upsert({
      where: {
        careerId_subjectId: {
          careerId: carreraMatematica.id,
          subjectId: subject.id,
        }
      },
      update: {
        yearLevel: mat.yearLevel,
        isMandatory: !mat.isElective,
      },
      create: {
        careerId: carreraMatematica.id,
        subjectId: subject.id,
        yearLevel: mat.yearLevel,
        isMandatory: !mat.isElective,
      }
    });
    
    console.log(`     ${mat.code} - ${mat.name} (${mat.yearLevel}° año)`);
  }
  console.log();

  // ======================================================
  // 6. CREAR CORRELATIVIDADES
  // ======================================================
  console.log('🔗 Creando correlatividades...');
  
  for (const corr of correlativas) {
    const subject = await prisma.subject.findUnique({
      where: { code: corr.subjectCode }
    });
    const requiredSubject = await prisma.subject.findUnique({
      where: { code: corr.requiredCode }
    });
    
    if (subject && requiredSubject) {
      // Buscar correlativa existente (globales: careerId = null)
      const existing = await prisma.subjectCorrelative.findFirst({
        where: {
          subjectId: subject.id,
          requiredSubjectId: requiredSubject.id,
          careerId: null
        }
      });
      
      if (existing) {
        await prisma.subjectCorrelative.update({
          where: { id: existing.id },
          data: { correlativeType: corr.type }
        });
      } else {
        await prisma.subjectCorrelative.create({
          data: {
            subjectId: subject.id,
            requiredSubjectId: requiredSubject.id,
            correlativeType: corr.type,
            careerId: null, // Correlativas globales
            isActive: true,
          }
        });
      }
      console.log(`     ${corr.subjectCode} → requiere ${corr.requiredCode} (${corr.type})`);
    }
  }
  console.log();

  // ======================================================
  // RESUMEN
  // ======================================================
  console.log('✅ Seed completado exitosamente!\n');
  console.log('📊 Resumen:');
  console.log(`   • Carreras creadas: 2`);
  console.log(`   • Materias comunes: ${materiasComunes.length}`);
  console.log(`   • EDIs: ${materiasEDIs.length}`);
  console.log(`   • Materias Lengua: ${materiasLengua.length}`);
  console.log(`   • Materias Matemática: ${materiasMatematica.length}`);
  console.log(`   • Correlativas: ${correlativas.length}`);
  console.log(`   • Total materias: ${materiasComunes.length + materiasEDIs.length + materiasLengua.length + materiasMatematica.length}`);
}

seed()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
