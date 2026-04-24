# Diseño de Modelo Curricular - Sistema Freire

## Resumen de Cambios Propuestos

### 1. Nuevos Enums

```prisma
enum TrainingField {
  GENERAL        // Formación General
  ESPECIFICA     // Formación Específica
  PRACTICA       // Formación Práctica
  EDI            // Espacios de Definición Institucional
}

enum SubjectType {
  COMMON         // Común a todas las carreras
  CAREER_SPECIFIC // Específica de una carrera
  EDI            // Parte de Formación General pero identificable como EDI
}

enum CorrelativeType {
  REGULAR        // Para cursar regular (prerrequisito común)
  APROBADO       // Para cursar (prerrequisito aprobado)
  LIBRE          // Para cursar libre
  EQUIVALENCIA   // Equivalencia con otra materia
}
```

### 2. Modelos Modificados

#### Career (Carrera)
```prisma
model Career {
  id              String         @id @default(cuid())
  code            String         @unique
  name            String
  trainingField   TrainingField  // Campo de formación
  resolution      String?        // Resolución ministerial
  durationYears   Int            @default(4)
  active          Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  // Relaciones
  students        Student[]
  studyPlans      StudyPlan[]
  careerSubjects  CareerSubject[] // Materias específicas de esta carrera

  @@index([trainingField, active])
  @@map("careers")
}
```

#### Subject (Materia/Unidad Curricular)
```prisma
model Subject {
  id               String              @id @default(cuid())
  code             String              @unique
  name             String
  subjectType      SubjectType         // Tipo: común, específica, EDI
  yearLevel        Int                 // Año al que pertenece (1-4)
  hoursPerWeek     Int?                // Horas semanales
  trainingField    TrainingField       // Campo de formación al que pertenece
  
  // Campos opcionales según tipo
  isElective       Boolean             @default(false)
  isRemedial       Boolean             @default(false) // Para recursantes
  
  // Metadata
  description      String?
  active           Boolean             @default(true)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  // Relaciones
  careerSubjects   CareerSubject[]     // Carreras donde se dicta
  enrollments      Enrollment[]
  grades           Grade[]
  subjectStatuses  StudentSubjectStatus[]
  
  // Correlatividades
  correlatives     SubjectCorrelative[] @relation("subject_correlatives")
  requiredBy       SubjectCorrelative[] @relation("subject_required")
  
  // Planes de estudio
  planSubjects     PlanSubject[]
  commissions      Commission[]

  @@index([subjectType, yearLevel])
  @@index([trainingField, yearLevel])
  @@index([active])
  @@map("subjects")
}
```

#### CareerSubject (Relación N:M Carrera-Materia)
```prisma
model CareerSubject {
  id          String    @id @default(cuid())
  careerId    String
  subjectId   String
  isMandatory Boolean   @default(true) // Obligatoria u optativa
  yearLevel   Int       // Año específico en esta carrera
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  career      Career    @relation(fields: [careerId], references: [id], onDelete: Cascade)
  subject     Subject   @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@unique([careerId, subjectId])
  @@index([careerId, yearLevel])
  @@index([subjectId])
  @@map("career_subjects")
}
```

#### SubjectCorrelative (Correlatividades Mejoradas)
```prisma
model SubjectCorrelative {
  id                String           @id @default(cuid())
  subjectId         String           // Materia que tiene la correlativa
  requiredSubjectId String           // Materia requerida
  correlativeType   CorrelativeType  // Tipo de correlatividad
  
  // Opcional: solo para ciertas carreras (null = todas)
  careerId          String?
  
  isActive          Boolean          @default(true)
  notes             String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  // Relaciones
  subject           Subject          @relation("subject_correlatives", fields: [subjectId], references: [id], onDelete: Cascade)
  requiredSubject   Subject          @relation("subject_required", fields: [requiredSubjectId], references: [id], onDelete: Cascade)
  career            Career?          @relation(fields: [careerId], references: [id])

  @@unique([subjectId, requiredSubjectId, careerId])
  @@index([subjectId, correlativeType])
  @@index([requiredSubjectId])
  @@map("subject_correlatives")
}
```

#### StudyPlan (Plan de Estudio)
```prisma
model StudyPlan {
  id              String        @id @default(cuid())
  careerId        String
  name            String        // Ej: "Plan 2024", "Plan Antiguo"
  year            Int           // Año de implementación
  isActive        Boolean       @default(true)
  isDefault       Boolean       @default(false) // Plan por defecto para nuevos alumnos
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  career          Career        @relation(fields: [careerId], references: [id], onDelete: Cascade)
  planSubjects    PlanSubject[]
  enrollments     Enrollment[]

  @@unique([careerId, isDefault])
  @@index([careerId, isActive])
  @@map("study_plans")
}
```

#### PlanSubject (Materia en Plan de Estudio)
```prisma
model PlanSubject {
  id              String    @id @default(cuid())
  studyPlanId     String
  subjectId       String
  yearLevel       Int       // Año dentro del plan
  isMandatory     Boolean   @default(true)
  orderIndex      Int       @default(0) // Orden visualización
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  studyPlan       StudyPlan @relation(fields: [studyPlanId], references: [id], onDelete: Cascade)
  subject         Subject   @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@unique([studyPlanId, subjectId])
  @@index([studyPlanId, yearLevel])
  @@index([subjectId])
  @@map("plan_subjects")
}
```

---

## Ejemplos de Queries

### 1. Obtener materias por año y carrera
```typescript
// Materias de un año específico en una carrera
const subjects = await prisma.careerSubject.findMany({
  where: {
    careerId: 'career-id',
    yearLevel: 2,
    subject: { active: true }
  },
  include: {
    subject: {
      include: {
        correlatives: {
          include: { requiredSubject: true }
        }
      }
    }
  },
  orderBy: { subject: { code: 'asc' } }
});
```

### 2. Obtener correlativas de una materia
```typescript
// Todas las correlativas de una materia
const correlatives = await prisma.subjectCorrelative.findMany({
  where: {
    subjectId: 'subject-id',
    isActive: true,
    OR: [
      { careerId: null },        // Correlativas globales
      { careerId: 'career-id' }  // Correlativas específicas de carrera
    ]
  },
  include: {
    requiredSubject: true,
    career: true
  },
  orderBy: { correlativeType: 'asc' }
});
```

### 3. Validar si alumno puede cursar una materia
```typescript
async function canEnrollSubject(
  studentId: string, 
  subjectId: string, 
  careerId: string
): Promise<{ canEnroll: boolean; missing: string[] }> {
  
  // 1. Obtener correlativas requeridas
  const correlatives = await prisma.subjectCorrelative.findMany({
    where: {
      subjectId,
      isActive: true,
      OR: [{ careerId: null }, { careerId }]
    }
  });

  // 2. Obtener estados del alumno en materias requeridas
  const requiredSubjectIds = correlatives.map(c => c.requiredSubjectId);
  
  const studentStatuses = await prisma.studentSubjectStatus.findMany({
    where: {
      studentId,
      subjectId: { in: requiredSubjectIds }
    }
  });

  // 3. Mapear estado por materia
  const statusMap = new Map(
    studentStatuses.map(s => [s.subjectId, s.status])
  );

  // 4. Verificar cada correlativa
  const missing: string[] = [];
  
  for (const correlative of correlatives) {
    const status = statusMap.get(correlative.requiredSubjectId);
    
    let isSatisfied = false;
    
    switch (correlative.correlativeType) {
      case 'REGULAR':
        isSatisfied = status === 'PASSED' || status === 'ACCREDITED';
        break;
      case 'APROBADO':
        isSatisfied = status === 'PASSED' && status === 'FINAL_APPROVED';
        break;
      case 'LIBRE':
        isSatisfied = status !== 'FAILED' && status !== null;
        break;
    }
    
    if (!isSatisfied) {
      missing.push(correlative.requiredSubjectId);
    }
  }

  return {
    canEnroll: missing.length === 0,
    missing
  };
}
```

### 4. Obtener malla curricular completa de una carrera
```typescript
// Malla por años con todas las materias
const studyPlan = await prisma.studyPlan.findFirst({
  where: {
    careerId: 'career-id',
    isActive: true,
    isDefault: true
  },
  include: {
    planSubjects: {
      include: {
        subject: {
          include: {
            correlatives: {
              where: { isActive: true },
              include: { requiredSubject: true }
            }
          }
        }
      },
      orderBy: [{ yearLevel: 'asc' }, { orderIndex: 'asc' }]
    }
  }
});

// Agrupar por año
const curriculumByYear = studyPlan?.planSubjects.reduce((acc, ps) => {
  const year = ps.yearLevel;
  if (!acc[year]) acc[year] = [];
  acc[year].push({
    ...ps.subject,
    isMandatory: ps.isMandatory,
    correlatives: ps.subject.correlatives
  });
  return acc;
}, {} as Record<number, typeof studyPlan.planSubjects[0]['subject'][]>);
```

### 5. Materias comunes vs específicas vs EDIs
```typescript
// Materias comunes a todas las carreras (Formación General)
const commonSubjects = await prisma.subject.findMany({
  where: {
    subjectType: 'COMMON',
    trainingField: 'GENERAL',
    yearLevel: 1
  }
});

// EDIs (también son Formación General pero identificables)
const ediSubjects = await prisma.subject.findMany({
  where: {
    subjectType: 'EDI',
    trainingField: 'GENERAL'
  }
});

// Materias específicas de una carrera
const specificSubjects = await prisma.subject.findMany({
  where: {
    subjectType: 'CAREER_SPECIFIC',
    careerSubjects: {
      some: { careerId: 'matematica-career-id' }
    }
  }
});
```

---

## Migración de Datos desde Excel

### Script de importación de correlativas:
```typescript
// Estructura esperada del Excel:
// | Materia | Código | Correlativa 1 | Tipo 1 | Correlativa 2 | Tipo 2 | ...

async function importCorrelativesFromExcel(
  filePath: string, 
  careerId?: string
) {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  for (const row of data) {
    const subject = await prisma.subject.findUnique({
      where: { code: row.Código }
    });

    if (!subject) continue;

    // Procesar cada columna de correlativa
    for (let i = 1; i <= 5; i++) {
      const correlativeCode = row[`Correlativa ${i}`];
      const correlativeType = row[`Tipo ${i}`] || 'REGULAR';

      if (!correlativeCode) continue;

      const requiredSubject = await prisma.subject.findUnique({
        where: { code: correlativeCode }
      });

      if (!requiredSubject) continue;

      await prisma.subjectCorrelative.upsert({
        where: {
          subjectId_requiredSubjectId_careerId: {
            subjectId: subject.id,
            requiredSubjectId: requiredSubject.id,
            careerId: careerId || null
          }
        },
        update: { correlativeType: correlativeType as CorrelativeType },
        create: {
          subjectId: subject.id,
          requiredSubjectId: requiredSubject.id,
          correlativeType: correlativeType as CorrelativeType,
          careerId: careerId || null
        }
      });
    }
  }
}
```

---

## Optimizaciones y Escalabilidad

### Índices clave para performance:
- `@@index([subjectType, yearLevel])` - Búsqueda por tipo y año
- `@@index([trainingField, yearLevel])` - Filtrado por campo formativo
- `@@index([careerId, yearLevel])` - Materias de carrera por año
- `@@index([subjectId, correlativeType])` - Validación de correlativas

### Escalabilidad futura:
1. **Nuevas carreras**: Solo agregar registros en `Career` y `CareerSubject`
2. **Múltiples planes**: `StudyPlan` permite versionado de mallas
3. **Correlativas específicas**: `careerId` opcional permite correlativas globales o por carrera
4. **EDIs flexibles**: Identificables como `subjectType: EDI` pero dentro de `trainingField: GENERAL`

### Consideraciones de diseño:
- **Materias comunes**: Una sola fila en `Subject`, referenciada por múltiples carreras
- **Materias específicas**: Relación directa `CareerSubject` con la carrera
- **EDIs**: Mismo tratamiento que comunes, pero marcad@s como `subjectType: EDI`
- **Correlativas**: Relación recursiva N:M con tipo (regular, aprobado, libre)
