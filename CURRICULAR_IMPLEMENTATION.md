# Implementación del Modelo Curricular - Sistema Freire

## Resumen Ejecutivo

Se ha implementado un modelo de datos curricular completo y escalable que permite gestionar:

- **Campos de formación**: General, Específica, Práctica, EDIs
- **Carreras**: Con vínculo a campos de formación y duración variable
- **Materias**: Comunes, específicas de carrera, y EDIs
- **Correlatividades**: Relaciones recursivas con tipos (regular, aprobado, libre, equivalencia)

---

## Cambios Realizados en Schema.prisma

### 1. Nuevos Enums (Líneas 565-583)

```prisma
enum TrainingField {
  GENERAL      // Formación General
  ESPECIFICA   // Formación Específica
  PRACTICA     // Prácticas Profesionalizantes
  EDI          // Espacios de Definición Institucional
}

enum SubjectType {
  COMMON          // Común a todas las carreras
  CAREER_SPECIFIC // Específica de una carrera
  EDI             // Parte de Formación General
}

enum CorrelativeType {
  REGULAR      // Para cursar regular
  APROBADO     // Requiere aprobación final
  LIBRE        // Para cursar libre
  EQUIVALENCIA // Equivalencia
}
```

### 2. Modelo Career Mejorado (Líneas 81-97)

Agregados campos:
- `trainingField: TrainingField` - Campo de formación
- `resolution: String?` - Resolución ministerial
- `durationYears: Int` - Duración (default: 4)
- Relación `careerSubjects` - Materias específicas
- Relación `subjectCorrelatives` - Correlativas específicas

### 3. Modelo Subject Mejorado (Líneas 165-200)

Agregados campos:
- `subjectType: SubjectType` - Tipo de materia
- `trainingField: TrainingField` - Campo formativo
- `hoursPerWeek: Int?` - Horas cátedra
- `isElective: Boolean` - Optativa
- `isRemedial: Boolean` - Para recursantes
- `description: String?` - Descripción
- Relación `careerSubjects` - Carreras asociadas
- Índices optimizados para búsquedas frecuentes

### 4. Modelo SubjectCorrelative Mejorado (Líneas 257-283)

Agregados campos:
- `correlativeType: CorrelativeType` - Tipo de correlatividad
- `careerId: String?` - Opcional: correlativa específica por carrera
- `isActive: Boolean` - Para desactivar sin borrar
- `notes: String?` - Notas
- Timestamps `createdAt` y `updatedAt`
- Índices para validación eficiente

### 5. Nuevo Modelo CareerSubject (Líneas 286-304)

Relación N:M entre Carrera y Materia:
- `careerId` + `subjectId` - Claves foráneas
- `isMandatory: Boolean` - Obligatoria u optativa
- `yearLevel: Int` - Año específico en la carrera
- Índices para filtrado por carrera/año

---

## Diagrama de Relaciones

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Career    │────<│  CareerSubject  │>────│   Subject   │
├─────────────┤     ├─────────────────┤     ├─────────────┤
│trainingField│     │isMandatory      │     │subjectType  │
│durationYears│     │yearLevel        │     │trainingField│
└─────────────┘     └─────────────────┘     └─────────────┘
       │                                              │
       │                                              │
       v                                              v
┌─────────────┐                             ┌─────────────────┐
│  StudyPlan  │                             │SubjectCorrelative│
├─────────────┤                             ├─────────────────┤
│isDefault    │                             │correlativeType  │
└─────────────┘                             │careerId (opt)   │
                                            └─────────────────┘
```

---

## Queries de Ejemplo

### Obtener malla curricular de una carrera

```typescript
const curriculum = await prisma.careerSubject.findMany({
  where: { careerId: 'matematica-id' },
  include: {
    subject: {
      include: {
        correlatives: {
          include: { requiredSubject: true }
        }
      }
    }
  },
  orderBy: [
    { yearLevel: 'asc' },
    { subject: { code: 'asc' } }
  ]
});

// Agrupar por año
const byYear = curriculum.reduce((acc, cs) => {
  const year = cs.yearLevel;
  if (!acc[year]) acc[year] = [];
  acc[year].push({
    ...cs.subject,
    isMandatory: cs.isMandatory
  });
  return acc;
}, {});
```

### Validar correlativas para inscripción

```typescript
async function validateCorrelatives(
  studentId: string,
  subjectId: string,
  careerId: string
): Promise<{ canEnroll: boolean; pending: string[] }> {
  
  // 1. Obtener correlativas requeridas
  const correlatives = await prisma.subjectCorrelative.findMany({
    where: {
      subjectId,
      isActive: true,
      OR: [
        { careerId: null },      // Globales
        { careerId }             // Específicas de carrera
      ]
    }
  });

  // 2. Obtener estados del alumno
  const statuses = await prisma.studentSubjectStatus.findMany({
    where: {
      studentId,
      subjectId: {
        in: correlatives.map(c => c.requiredSubjectId)
      }
    }
  });
  
  const statusMap = new Map(statuses.map(s => [s.subjectId, s.status]));

  // 3. Verificar cada correlativa
  const pending: string[] = [];
  
  for (const cor of correlatives) {
    const status = statusMap.get(cor.requiredSubjectId);
    
    const satisfied = {
      'REGULAR': ['PASSED', 'ACCREDITED'].includes(status),
      'APROBADO': status === 'FINAL_APPROVED',
      'LIBRE': status !== 'FAILED' && status !== null
    }[cor.correlativeType];
    
    if (!satisfied) {
      pending.push(cor.requiredSubjectId);
    }
  }

  return { canEnroll: pending.length === 0, pending };
}
```

### Materias por campo de formación

```typescript
// Materias de Formación General (incluye EDIs)
const generalSubjects = await prisma.subject.findMany({
  where: {
    trainingField: 'GENERAL',
    OR: [
      { subjectType: 'COMMON' },
      { subjectType: 'EDI' }
    ],
    active: true
  },
  orderBy: { yearLevel: 'asc' }
});

// Materias específicas de una carrera
const specificSubjects = await prisma.subject.findMany({
  where: {
    subjectType: 'CAREER_SPECIFIC',
    careerSubjects: {
      some: { careerId: 'lengua-literatura-id' }
    }
  }
});
```

---

## Migración de Datos desde Excel

### Estructura esperada del archivo Excel:

| Carrera | Código Materia | Nombre | Año | Tipo | Campo | Correlativa 1 | Tipo Corr 1 | Correlativa 2 | Tipo Corr 2 |
|---------|---------------|--------|-----|------|-------|---------------|-------------|---------------|-------------|
| Lengua  | MAT101        | Matemática I | 1 | COMMON | GENERAL | - | - | - | - |
| Lengua  | LIT201        | Literatura II | 2 | CAREER_SPECIFIC | ESPECIFICA | LIT101 | REGULAR | - | - |

### Script de importación:

```typescript
import * as XLSX from 'xlsx';

async function importCurriculumFromExcel(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  for (const row of rows) {
    // 1. Crear/actualizar materia
    const subject = await prisma.subject.upsert({
      where: { code: row['Código Materia'] },
      update: {
        name: row['Nombre'],
        subjectType: row['Tipo'],
        trainingField: row['Campo'],
        yearLevel: row['Año']
      },
      create: {
        code: row['Código Materia'],
        name: row['Nombre'],
        subjectType: row['Tipo'],
        trainingField: row['Campo'],
        yearLevel: row['Año']
      }
    });

    // 2. Vincular a carrera (si es específica)
    if (row['Tipo'] === 'CAREER_SPECIFIC') {
      const career = await prisma.career.findFirst({
        where: { name: row['Carrera'] }
      });
      
      if (career) {
        await prisma.careerSubject.upsert({
          where: {
            careerId_subjectId: {
              careerId: career.id,
              subjectId: subject.id
            }
          },
          update: { yearLevel: row['Año'] },
          create: {
            careerId: career.id,
            subjectId: subject.id,
            yearLevel: row['Año']
          }
        });
      }
    }

    // 3. Procesar correlativas
    for (let i = 1; i <= 5; i++) {
      const corrCode = row[`Correlativa ${i}`];
      const corrType = row[`Tipo Corr ${i}`] || 'REGULAR';
      
      if (!corrCode) continue;

      const requiredSubject = await prisma.subject.findUnique({
        where: { code: corrCode }
      });

      if (requiredSubject) {
        await prisma.subjectCorrelative.upsert({
          where: {
            subjectId_requiredSubjectId_careerId: {
              subjectId: subject.id,
              requiredSubjectId: requiredSubject.id,
              careerId: null // Global
            }
          },
          update: { correlativeType: corrType },
          create: {
            subjectId: subject.id,
            requiredSubjectId: requiredSubject.id,
            correlativeType: corrType
          }
        });
      }
    }
  }
}
```

---

## Optimizaciones Implementadas

### Índices para Performance:

1. **Career**: `@@index([trainingField, active])`
   - Filtrado rápido por campo formativo

2. **Subject**: `@@index([subjectType, yearLevel])`
   - Búsqueda eficiente de materias por tipo y año

3. **CareerSubject**: `@@index([careerId, yearLevel])`
   - Malla curricular ordenada por año

4. **SubjectCorrelative**: `@@index([subjectId, correlativeType])`
   - Validación rápida de correlativas

---

## Escalabilidad Futura

El diseño permite:

1. **Nuevas carreras**: Solo agregar registro en `Career` y vincular materias
2. **Planes históricos**: `StudyPlan` permite versionado de mallas
3. **Correlativas complejas**: Soporte para correlativas globales o por carrera
4. **EDIs dinámicos**: Identificables como tipo `EDI` dentro de `GENERAL`
5. **Materias optativas**: Campo `isElective` en `Subject` y `CareerSubject`

---

## Próximos Pasos Sugeridos

1. Ejecutar migración: `npx prisma migrate dev --name add_curricular_model`
2. Generar cliente: `npx prisma generate`
3. Crear seed de materias de ejemplo
4. Implementar UI para gestión de mallas curriculares
5. Agregar validación de correlativas en proceso de inscripción

---

## Documentación Adicional

Ver archivo completo: `prisma/schema-curricular.md`
