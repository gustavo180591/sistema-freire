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
  const existingStatus = await prisma.studentSubjectStatus.findFirst({
    where: {
      studentId,
      subjectId
    }
  });

  if (existingStatus) {
    warnings.push('El estudiante ya está inscripto en esta materia');
  }

  return {
    canEnroll,
    pending,
    warnings,
  };
}

/**
 * Calcula el estado final de un estudiante en una materia anual
 * Determina si está promocionado, regular o libre según los umbrales
 */
export async function calculateFinalStatus(
  studentId: string,
  subjectId: string
): Promise<{
  regularityStatus: 'REGULAR' | 'LIBRE';
  approved: boolean;
  promoted: boolean;
  finalGrade: number;
  promotionDate?: Date;
}> {
  // Obtener todas las calificaciones del estudiante en la materia
  const grades = await prisma.grade.findMany({
    where: { studentId, subjectId }
  });

  if (grades.length === 0) {
    return {
      regularityStatus: 'LIBRE',
      approved: false,
      promoted: false,
      finalGrade: 0
    };
  }

  // Calcular promedio
  const sum = grades.reduce((acc, g) => acc + Number(g.value), 0);
  const average = sum / grades.length;

  // Obtener umbrales de la materia
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  const approvalThreshold = Number(subject?.approvalThreshold || 6);
  const promotionThreshold = Number(subject?.promotionThreshold || 8);

  // Determinar estado según umbrales
  if (average >= promotionThreshold) {
    return {
      regularityStatus: 'REGULAR',
      approved: true,
      promoted: true,
      finalGrade: average,
      promotionDate: new Date()
    };
  } else if (average >= approvalThreshold) {
    return {
      regularityStatus: 'REGULAR',
      approved: false,  // Necesita rendir final
      promoted: false,
      finalGrade: average
    };
  } else {
    return {
      regularityStatus: 'LIBRE',
      approved: false,
      promoted: false,
      finalGrade: average
    };
  }
}

/**
 * Actualiza el estado de un estudiante en una materia basándose en sus calificaciones
 * Debe llamarse al cerrar el período anual o cuando se carga una calificación final
 */
export async function updateStudentSubjectStatus(
  studentId: string,
  subjectId: string
): Promise<void> {
  // Calcular estado final
  const status = await calculateFinalStatus(studentId, subjectId);

  // Buscar o crear el registro de estado
  const existingStatus = await prisma.studentSubjectStatus.findUnique({
    where: {
      studentId_subjectId: {
        studentId,
        subjectId
      }
    }
  });

  if (existingStatus) {
    // Actualizar registro existente
    await prisma.studentSubjectStatus.update({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId
        }
      },
      data: {
        regularityStatus: status.regularityStatus,
        approved: status.approved,
        promoted: status.promoted,
        finalGrade: status.finalGrade,
        promotionDate: status.promotionDate
      }
    });
  } else {
    // Crear nuevo registro
    await prisma.studentSubjectStatus.create({
      data: {
        studentId,
        subjectId,
        regularityStatus: status.regularityStatus,
        approved: status.approved,
        promoted: status.promoted,
        finalGrade: status.finalGrade,
        promotionDate: status.promotionDate
      }
    });
  }
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
  // Obtener umbrales de la materia
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  const approvalThreshold = Number(subject?.approvalThreshold || 6);

  // 1. Verificar que tenga nota suficiente (usando umbral dinámico)
  if (finalGrade < approvalThreshold) {
    return {
      canPass: false,
      missing: [],
      reason: `La nota mínima para aprobar es ${approvalThreshold}`,
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
  }, {} as Record<number, Array<{ subject: any; isMandatory: boolean }>>);

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

/**
 * Umbral de asistencia para regularidad
 * TODO: Configurable por institución, carrera o materia
 * Por defecto: 75% de asistencia para ser regular
 */
const ATTENDANCE_THRESHOLD = 75;

/**
 * Calcula el porcentaje de asistencia de un estudiante en una materia
 * Basado en los registros de AttendanceEntry y AttendanceRecord
 */
export async function calculateAttendancePercent(
  studentId: string,
  subjectId: string
): Promise<number> {
  // Obtener todos los registros de asistencia del estudiante en la materia
  const attendanceEntries = await prisma.attendanceEntry.findMany({
    where: {
      studentId,
      attendance: {
        subjectId
      }
    },
    include: {
      attendance: true
    }
  });

  if (attendanceEntries.length === 0) {
    return 0;
  }

  // Contar presentes
  const presentCount = attendanceEntries.filter(entry => entry.present).length;
  const totalCount = attendanceEntries.length;

  // Calcular porcentaje
  const percent = (presentCount / totalCount) * 100;
  return Math.round(percent * 100) / 100; // Redondear a 2 decimales
}

/**
 * Actualiza el estado de regularidad basado en asistencia
 * Debe llamarse automáticamente al cargar o editar asistencia
 */
export async function updateAttendanceStatus(
  studentId: string,
  subjectId: string
): Promise<{
  attendancePercent: number;
  regularityStatus: 'REGULAR' | 'LIBRE';
  previousStatus?: 'REGULAR' | 'LIBRE';
  statusChanged: boolean;
}> {
  // Calcular porcentaje de asistencia
  const attendancePercent = await calculateAttendancePercent(studentId, subjectId);

  // Determinar estado de regularidad basado en umbral
  const regularityStatus = attendancePercent >= ATTENDANCE_THRESHOLD ? 'REGULAR' : 'LIBRE';

  // Obtener estado anterior
  const existingStatus = await prisma.studentSubjectStatus.findUnique({
    where: {
      studentId_subjectId: {
        studentId,
        subjectId
      }
    }
  });

  const previousStatus = existingStatus?.regularityStatus;
  const statusChanged = previousStatus !== regularityStatus;

  // Actualizar o crear registro
  if (existingStatus) {
    await prisma.studentSubjectStatus.update({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId
        }
      },
      data: {
        attendancePercent,
        regularityStatus
      }
    });
  } else {
    await prisma.studentSubjectStatus.create({
      data: {
        studentId,
        subjectId,
        attendancePercent,
        regularityStatus
      }
    });
  }

  return {
    attendancePercent,
    regularityStatus,
    previousStatus,
    statusChanged
  };
}

/**
 * Actualiza el estado de regularidad para todos los estudiantes de una materia
 * Útil para recalcular después de correcciones manuales
 */
export async function updateAttendanceStatusForSubject(subjectId: string): Promise<void> {
  // Obtener todos los estudiantes con registros de asistencia en la materia
  const attendanceEntries = await prisma.attendanceEntry.findMany({
    where: {
      attendance: {
        subjectId
      }
    },
    select: {
      studentId: true
    },
    distinct: ['studentId']
  });

  // Actualizar cada estudiante
  for (const entry of attendanceEntries) {
    await updateAttendanceStatus(entry.studentId, subjectId);
  }
}
