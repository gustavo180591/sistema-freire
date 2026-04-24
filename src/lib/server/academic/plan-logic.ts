import { PrismaClient, CorrelativeType, SubjectType } from '@prisma/client';
import type { StudentSubjectStatus, SubjectCorrelative, Subject } from '@prisma/client';

const prisma = new PrismaClient();

interface EnrollmentCheck {
  canEnroll: boolean;
  pending: {
    regular: string[];
    approved: string[];
    final: string[];
  };
  warnings: string[];
}

interface SubjectStatusMap {
  [subjectId: string]: {
    regularityStatus: string;
    approved: boolean;
  };
}

/**
 * Verifica si un estudiante puede cursar una materia
 * Revisa correlativas de tipo REGULAR (para cursar) y APROBADO (para promocionar)
 */
export async function canStudentEnroll(
  studentId: string,
  subjectId: string,
  careerId?: string
): Promise<EnrollmentCheck> {
  // 1. Obtener correlativas requeridas
  const correlativas = await prisma.subjectCorrelative.findMany({
    where: {
      subjectId,
      isActive: true,
      OR: [
        { careerId: null },      // Correlativas globales
        { careerId }             // Correlativas específicas de carrera
      ]
    },
    include: {
      requiredSubject: {
        select: {
          id: true,
          code: true,
          name: true,
        }
      }
    }
  });

  // 2. Obtener estados del estudiante en todas las materias
  const statuses = await prisma.studentSubjectStatus.findMany({
    where: {
      studentId,
    },
    include: {
      subject: {
        select: {
          id: true,
          code: true,
        }
      }
    }
  });

  // 3. Construir mapa de estados
  const statusMap: SubjectStatusMap = {};
  for (const status of statuses) {
    statusMap[status.subjectId] = {
      regularityStatus: status.regularityStatus,
      approved: status.approved,
    };
  }

  // 4. Verificar cada correlativa
  const pending = {
    regular: [] as string[],
    approved: [] as string[],
    final: [] as string[],
  };
  const warnings = [] as string[];

  for (const corr of correlativas) {
    const requiredSubjectId = corr.requiredSubjectId;
    const studentStatus = statusMap[requiredSubjectId];
    const subjectInfo = corr.requiredSubject;

    const isRegular = studentStatus && ['REGULAR', 'APROBADO_LIBRE', 'APROBADO'].includes(studentStatus.regularityStatus);
    const isApproved = studentStatus && studentStatus.approved;

    switch (corr.correlativeType) {
      case CorrelativeType.REGULAR:
        // Para cursar regular: necesita regularizar la correlativa
        if (!isRegular) {
          pending.regular.push(`${subjectInfo.code} - ${subjectInfo.name}`);
        }
        break;

      case CorrelativeType.APROBADO:
        // Para cursar: necesita aprobar final la correlativa
        if (!isApproved) {
          pending.approved.push(`${subjectInfo.code} - ${subjectInfo.name}`);
        }
        break;

      case CorrelativeType.LIBRE:
        // Para cursar libre: solo necesita haberse inscripto (no aplica en este caso)
        break;

      case CorrelativeType.EQUIVALENCIA:
        // Equivalencia: verificar si tiene equivalencia aprobada (por ahora simplificado)
        if (!isApproved) {
          pending.approved.push(`${subjectInfo.code} - ${subjectInfo.name} (equivalencia)`);
        }
        break;
    }
  }

  // 5. Determinar si puede cursar
  const canEnroll = pending.regular.length === 0 && pending.approved.length === 0;

  // 6. Verificar si ya está inscripto
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      commission: {
        subjectId
      },
      status: {
        in: ['ACTIVE', 'PENDING']
      }
    }
  });

  if (existingEnrollment) {
    warnings.push('El estudiante ya está inscripto en esta materia');
  }

  return {
    canEnroll,
    pending,
    warnings,
  };
}

/**
 * Verifica si un estudiante puede aprobar una materia
 * Revisa correlativas de tipo APROBADO para dar el final
 */
export async function canStudentPass(
  studentId: string,
  subjectId: string,
  finalGrade: number,
  careerId?: string
): Promise<{
  canPass: boolean;
  missing: string[];
  reason?: string;
}> {
  // 1. Verificar que tenga nota suficiente
  if (finalGrade < 4) {
    return {
      canPass: false,
      missing: [],
      reason: 'La nota mínima para aprobar es 4',
    };
  }

  // 2. Obtener correlativas de tipo APROBADO
  const correlativas = await prisma.subjectCorrelative.findMany({
    where: {
      subjectId,
      isActive: true,
      correlativeType: CorrelativeType.APROBADO,
      OR: [
        { careerId: null },
        { careerId }
      ]
    },
    include: {
      requiredSubject: {
        select: {
          id: true,
          code: true,
          name: true,
        }
      }
    }
  });

  // 3. Verificar cada correlativa
  const missing = [] as string[];

  for (const corr of correlativas) {
    const status = await prisma.studentSubjectStatus.findFirst({
      where: {
        studentId,
        subjectId: corr.requiredSubjectId,
        approved: true
      }
    });

    if (!status) {
      missing.push(`${corr.requiredSubject.code} - ${corr.requiredSubject.name}`);
    }
  }

  return {
    canPass: missing.length === 0,
    missing,
    reason: missing.length > 0 ? 'Faltan correlativas aprobadas' : undefined,
  };
}

/**
 * Obtiene la malla curricular completa para una carrera
 */
export async function getCurriculum(careerId: string, year?: number) {
  const where: any = {
    careerId,
    isMandatory: true,
  };

  if (year) {
    where.yearLevel = year;
  }

  const careerSubjects = await prisma.careerSubject.findMany({
    where,
    include: {
      subject: {
        include: {
          correlatives: {
            where: {
              OR: [
                { careerId: null },
                { careerId }
              ]
            },
            include: {
              requiredSubject: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                }
              }
            }
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
  const byYear = careerSubjects.reduce((acc, cs) => {
    const year = cs.yearLevel;
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push({
      subject: cs.subject,
      isMandatory: cs.isMandatory,
    });
    return acc;
  }, {} as Record<number, typeof careerSubjects>);

  return {
    careerId,
    byYear,
    total: careerSubjects.length,
  };
}

/**
 * Calcula el progreso del estudiante en una carrera
 */
export async function getStudentProgress(studentId: string, careerId: string) {
  // Obtener todas las materias de la carrera
  const careerSubjects = await prisma.careerSubject.findMany({
    where: {
      careerId,
      isMandatory: true,
    },
    include: {
      subject: true,
    }
  });

  // Obtener estados del estudiante
  const statuses = await prisma.studentSubjectStatus.findMany({
    where: {
      studentId,
    },
  });

  const statusMap = new Map(statuses.map(s => [s.subjectId, s]));

  const stats = {
    total: careerSubjects.length,
    regular: 0,
    approved: 0,
    failed: 0,
    notStarted: 0,
  };

  for (const cs of careerSubjects) {
    const status = statusMap.get(cs.subjectId);
    if (!status) {
      stats.notStarted++;
    } else if (status.approved) {
      stats.approved++;
    } else if (['REGULAR', 'APROBADO_LIBRE'].includes(status.regularityStatus)) {
      stats.regular++;
    } else if (status.regularityStatus === 'LIBRE' && !status.approved) {
      stats.failed++;
    } else {
      stats.notStarted++;
    }
  }

  return {
    ...stats,
    progress: Math.round(((stats.regular + stats.approved) / stats.total) * 100),
    completion: Math.round((stats.approved / stats.total) * 100),
  };
}

/**
 * Obtiene materias disponibles para inscripción de un estudiante
 */
export async function getAvailableSubjects(studentId: string, careerId: string) {
  // Obtener todas las materias de la carrera
  const careerSubjects = await prisma.careerSubject.findMany({
    where: {
      careerId,
    },
    include: {
      subject: true,
    }
  });

  // Filtrar las que puede cursar
  const available = [];

  for (const cs of careerSubjects) {
    const check = await canStudentEnroll(studentId, cs.subjectId, careerId);
    if (check.canEnroll) {
      available.push({
        subject: cs.subject,
        yearLevel: cs.yearLevel,
      });
    }
  }

  return available.sort((a, b) => a.yearLevel - b.yearLevel);
}
