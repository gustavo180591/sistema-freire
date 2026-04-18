import { prisma } from '../src/lib/server/db/prisma';

const materiasMatematicas = [
  // 1er Año
  { name: 'Álgebra y Geometría I', code: 'MAT_ALG_GEO_I', yearLevel: 1 },
  { name: 'Análisis Matemático I', code: 'MAT_ANAL_I', yearLevel: 1 },
  { name: 'Lógica y Conjuntos', code: 'MAT_LOGICA', yearLevel: 1 },
  { name: 'Geometría Plana y del Espacio', code: 'MAT_GEO_PLANA', yearLevel: 1 },
  { name: 'Didáctica de la Matemática I', code: 'MAT_DID_I', yearLevel: 1 },
  { name: 'Resolución de Problemas Matemáticos', code: 'MAT_PROB_RES', yearLevel: 1 },
  
  // 2do Año
  { name: 'Álgebra y Geometría II', code: 'MAT_ALG_GEO_II', yearLevel: 2 },
  { name: 'Análisis Matemático II', code: 'MAT_ANAL_II', yearLevel: 2 },
  { name: 'Álgebra Lineal', code: 'MAT_ALG_LIN', yearLevel: 2 },
  { name: 'Geometría Analítica', code: 'MAT_GEO_ANAL', yearLevel: 2 },
  { name: 'Didáctica de la Matemática II', code: 'MAT_DID_II', yearLevel: 2 },
  { name: 'Historia de las Matemáticas', code: 'MAT_HIST', yearLevel: 2 },
  { name: 'Probabilidad y Estadística I', code: 'MAT_PROB_EST_I', yearLevel: 2 },
  
  // 3er Año
  { name: 'Análisis Matemático III', code: 'MAT_ANAL_III', yearLevel: 3 },
  { name: 'Álgebra Abstracta', code: 'MAT_ALG_ABS', yearLevel: 3 },
  { name: 'Geometría Diferencial', code: 'MAT_GEO_DIFF', yearLevel: 3 },
  { name: 'Análisis Numérico', code: 'MAT_ANAL_NUM', yearLevel: 3 },
  { name: 'Probabilidad y Estadística II', code: 'MAT_PROB_EST_II', yearLevel: 3 },
  { name: 'Matemática Discreta', code: 'MAT_DISCRETA', yearLevel: 3 },
  { name: 'Didáctica de la Matemática III', code: 'MAT_DID_III', yearLevel: 3 },
  { name: 'Taller de Laboratorio de Matemática', code: 'MAT_LAB', yearLevel: 3 },
  
  // 4to Año
  { name: 'Análisis Complejo', code: 'MAT_ANAL_COMP', yearLevel: 4 },
  { name: 'Topología', code: 'MAT_TOPO', yearLevel: 4 },
  { name: 'Ecuaciones Diferenciales', code: 'MAT_EC_DIFF', yearLevel: 4 },
  { name: 'Física Matemática', code: 'MAT_FISICA', yearLevel: 4 },
  { name: 'Didáctica de la Matemática IV', code: 'MAT_DID_IV', yearLevel: 4 },
  { name: 'Práctica Docente I', code: 'MAT_PRAC_I', yearLevel: 4 },
  { name: 'Práctica Docente II', code: 'MAT_PRAC_II', yearLevel: 4 },
  { name: 'Seminario de Integración', code: 'MAT_SEM_INT', yearLevel: 4 },
  { name: 'Trabajo Final de Grado', code: 'MAT_TFG', yearLevel: 4 },
];

const materiasLengua = [
  // 1er Año
  { name: 'Gramática Castellana I', code: 'LEN_GRAM_I', yearLevel: 1 },
  { name: 'Literatura Argentina y Latinoamericana', code: 'LEN_LIT_LAT', yearLevel: 1 },
  { name: 'Historia de la Lengua', code: 'LEN_HIST_LENG', yearLevel: 1 },
  { name: 'Lectura y Escritura Académica', code: 'LEN_LEC_ESC', yearLevel: 1 },
  { name: 'Didáctica de la Lengua I', code: 'LEN_DID_I', yearLevel: 1 },
  
  // 2do Año
  { name: 'Gramática Castellana II', code: 'LEN_GRAM_II', yearLevel: 2 },
  { name: 'Literatura Española', code: 'LEN_LIT_ESP', yearLevel: 2 },
  { name: 'Teoría Literaria', code: 'LEN_TEORIA_LIT', yearLevel: 2 },
  { name: 'Filología e Historiografía', code: 'LEN_FILO', yearLevel: 2 },
  { name: 'Didáctica de la Lengua II', code: 'LEN_DID_II', yearLevel: 2 },
  
  // 3er Año
  { name: 'Literatura Comparada', code: 'LEN_LIT_COMP', yearLevel: 3 },
  { name: 'Análisis del Discurso', code: 'LEN_ANAL_DISC', yearLevel: 3 },
  { name: 'Sociolingüística', code: 'LEN_SOCIOLING', yearLevel: 3 },
  { name: 'Psicolingüística', code: 'LEN_PSICOLING', yearLevel: 3 },
  { name: 'Didáctica de la Lengua III', code: 'LEN_DID_III', yearLevel: 3 },
  
  // 4to Año
  { name: 'Semántica y Pragmática', code: 'LEN_SEM_PRAG', yearLevel: 4 },
  { name: 'Literatura Universal', code: 'LEN_LIT_UNIV', yearLevel: 4 },
  { name: 'Producción de Textos Literarios', code: 'LEN_PROD_TEXT', yearLevel: 4 },
  { name: 'Didáctica de la Lengua IV', code: 'LEN_DID_IV', yearLevel: 4 },
  { name: 'Práctica Docente I', code: 'LEN_PRAC_I', yearLevel: 4 },
  { name: 'Práctica Docente II', code: 'LEN_PRAC_II', yearLevel: 4 },
  { name: 'Trabajo Final de Grado', code: 'LEN_TFG', yearLevel: 4 },
];

async function seed() {
  console.log('Creando carreras...');
  
  // Carrera: Lengua en Alem
  const lenguaAlem = await prisma.career.upsert({
    where: { code: 'LENGUA_ALEM' },
    update: {},
    create: {
      code: 'LENGUA_ALEM',
      name: 'Profesorado de Lengua y Literatura (Alem)',
      active: true,
    }
  });
  
  // Carrera: Lengua en Capioví
  const lenguaCapiovi = await prisma.career.upsert({
    where: { code: 'LENGUA_CAPIOVI' },
    update: {},
    create: {
      code: 'LENGUA_CAPIOVI',
      name: 'Profesorado de Lengua y Literatura (Capioví)',
      active: true,
    }
  });
  
  // Carrera: Matemáticas en Capioví
  const mateCapiovi = await prisma.career.upsert({
    where: { code: 'MATEMATICA_CAPIOVI' },
    update: {},
    create: {
      code: 'MATEMATICA_CAPIOVI',
      name: 'Profesorado de Matemática (Capioví)',
      active: true,
    }
  });
  
  console.log('Carreras creadas:', { lenguaAlem, lenguaCapiovi, mateCapiovi });
  
  // Crear materias de Matemáticas
  console.log('Creando materias de Matemáticas...');
  for (const mat of materiasMatematicas) {
    await prisma.subject.upsert({
      where: { code: mat.code },
      update: {},
      create: {
        code: mat.code,
        name: mat.name,
        yearLevel: mat.yearLevel,
        active: true,
      }
    });
  }
  
  // Crear materias de Lengua
  console.log('Creando materias de Lengua...');
  for (const mat of materiasLengua) {
    await prisma.subject.upsert({
      where: { code: mat.code },
      update: {},
      create: {
        code: mat.code,
        name: mat.name,
        yearLevel: mat.yearLevel,
        active: true,
      }
    });
  }
  
  console.log('Todas las materias creadas');
  
  // Crear planes de estudio
  console.log('Creando planes de estudio...');
  
  // Plan para Matemáticas en Capioví
  const planMate = await prisma.studyPlan.upsert({
    where: {
      careerId_version: {
        careerId: mateCapiovi.id,
        version: '2025',
      }
    },
    update: {},
    create: {
      careerId: mateCapiovi.id,
      name: 'Plan 2025 - Profesorado de Matemática',
      version: '2025',
      durationYears: 4,
      active: true,
    }
  });
  
  // Asociar materias al plan de Matemáticas
  console.log('Asociando materias al plan de Matemáticas...');
  for (let i = 0; i < materiasMatematicas.length; i++) {
    const mat = materiasMatematicas[i];
    const subject = await prisma.subject.findUnique({ where: { code: mat.code } });
    if (subject) {
      await prisma.planSubject.upsert({
        where: {
          planId_subjectId: {
            planId: planMate.id,
            subjectId: subject.id,
          }
        },
        update: {},
        create: {
          planId: planMate.id,
          subjectId: subject.id,
          sortOrder: i,
        }
      });
    }
  }
  
  // Plan para Lengua en Alem
  const planLenguaAlem = await prisma.studyPlan.upsert({
    where: {
      careerId_version: {
        careerId: lenguaAlem.id,
        version: '2025',
      }
    },
    update: {},
    create: {
      careerId: lenguaAlem.id,
      name: 'Plan 2025 - Profesorado de Lengua',
      version: '2025',
      durationYears: 4,
      active: true,
    }
  });
  
  // Asociar materias al plan de Lengua Alem
  for (let i = 0; i < materiasLengua.length; i++) {
    const mat = materiasLengua[i];
    const subject = await prisma.subject.findUnique({ where: { code: mat.code } });
    if (subject) {
      await prisma.planSubject.upsert({
        where: {
          planId_subjectId: {
            planId: planLenguaAlem.id,
            subjectId: subject.id,
          }
        },
        update: {},
        create: {
          planId: planLenguaAlem.id,
          subjectId: subject.id,
          sortOrder: i,
        }
      });
    }
  }
  
  // Plan para Lengua en Capioví
  const planLenguaCapiovi = await prisma.studyPlan.upsert({
    where: {
      careerId_version: {
        careerId: lenguaCapiovi.id,
        version: '2025',
      }
    },
    update: {},
    create: {
      careerId: lenguaCapiovi.id,
      name: 'Plan 2025 - Profesorado de Lengua',
      version: '2025',
      durationYears: 4,
      active: true,
    }
  });
  
  // Asociar materias al plan de Lengua Capioví
  for (let i = 0; i < materiasLengua.length; i++) {
    const mat = materiasLengua[i];
    const subject = await prisma.subject.findUnique({ where: { code: mat.code } });
    if (subject) {
      await prisma.planSubject.upsert({
        where: {
          planId_subjectId: {
            planId: planLenguaCapiovi.id,
            subjectId: subject.id,
          }
        },
        update: {},
        create: {
          planId: planLenguaCapiovi.id,
          subjectId: subject.id,
          sortOrder: i,
        }
      });
    }
  }
  
  console.log('✅ Todo configurado correctamente!');
  console.log('\nResumen:');
  console.log('- Carreras creadas: 3');
  console.log('- Materias de Matemáticas: ' + materiasMatematicas.length);
  console.log('- Materias de Lengua: ' + materiasLengua.length);
  console.log('- Planes de estudio: 3');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
