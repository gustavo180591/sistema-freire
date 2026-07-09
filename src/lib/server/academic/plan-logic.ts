import {
	PrismaClient,
	CorrelativeType,
	SubjectType,
	CourseStatus,
	FinalExamStatus,
	AcademicStatus
} from '@prisma/client';
import type { StudentSubjectStatus, SubjectCorrelative, Subject, Prisma } from '@prisma/client';

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
				{ careerId: null }, // Correlativas globales
				{ careerId } // Correlativas específicas de carrera
			]
		},
		include: {
			requiredSubject: {
				select: {
					id: true,
					code: true,
					name: true
				}
			}
		}
	});

	// 2. Obtener estados del estudiante en todas las materias
	const statuses = await prisma.studentSubjectStatus.findMany({
		where: {
			studentId
		},
		include: {
			subject: {
				select: {
					id: true,
					code: true
				}
			}
		}
	});

	// 3. Construir mapa de estados
	const statusMap: SubjectStatusMap = {};
	for (const status of statuses) {
		statusMap[status.subjectId] = {
			regularityStatus: status.regularityStatus,
			approved: status.approved
		};
	}

	// 4. Verificar cada correlativa
	const pending = {
		regular: [] as string[],
		approved: [] as string[],
		final: [] as string[]
	};
	const warnings = [] as string[];

	for (const corr of correlativas) {
		const requiredSubjectId = corr.requiredSubjectId;
		const studentStatus = statusMap[requiredSubjectId];
		const subjectInfo = corr.requiredSubject;

		const isRegular =
			studentStatus &&
			['REGULAR', 'APROBADO_LIBRE', 'APROBADO'].includes(studentStatus.regularityStatus);
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
		warnings
	};
}

/**
 * Calcula el estado final de un estudiante en una materia
 * Implementa el nuevo modelo Grade → Evaluation → Subject
 * - Distingue evaluaciones de cursada, recuperatorios y examen final
 * - Calcula promedio ponderado: sum(nota × peso) / sum(pesos)
 * - Maneja PRESENT (nota requerida), ABSENT (nota null), EXCUSED (nota null)
 * - Toma nota efectiva entre original y recuperatorio
 * - Calcula courseStatus, finalExamStatus, academicStatus
 * - Sincroniza temporalmente approved, promoted, finalGrade
 */
export async function calculateFinalStatus(
	studentId: string,
	subjectId: string,
	tx?: Omit<Prisma.TransactionClient, '$transaction' | '$use' | '$on' | '$disconnect' | '$connect'>
): Promise<{
	regularityStatus: 'REGULAR' | 'LIBRE';
	approved: boolean;
	promoted: boolean;
	finalGrade: number | null;
	promotionDate?: Date;
	courseAverage: number | null;
	courseStatus: CourseStatus;
	finalExamStatus: FinalExamStatus;
	academicStatus: AcademicStatus;
}> {
	const client = tx || prisma;

	// Obtener calificaciones con sus evaluaciones (nuevo modelo)
	const grades = await client.grade.findMany({
		where: {
			studentId,
			evaluation: {
				subjectId
			}
		},
		include: {
			evaluation: {
				include: {
					subject: true,
					parentEvaluation: true
				}
			}
		}
	});

	if (grades.length === 0) {
		return {
			regularityStatus: 'LIBRE',
			approved: false,
			promoted: false,
			finalGrade: null,
			courseAverage: null,
			courseStatus: CourseStatus.IN_PROGRESS,
			finalExamStatus: FinalExamStatus.PENDING,
			academicStatus: AcademicStatus.EN_COURSE
		};
	}

	// Obtener umbrales de la materia
	const subject = await client.subject.findUnique({
		where: { id: subjectId }
	});

	const approvalThreshold = Number(subject?.approvalThreshold || 6);
	const promotionThreshold = Number(subject?.promotionThreshold || 8);

	// Separar evaluaciones por tipo
	const courseEvaluations = grades.filter(
		(g) =>
			g.evaluation &&
			['PARCIAL', 'TRABAJO_PRACTICO', 'INTEGRADOR'].includes(g.evaluation.type as any)
	);
	const recoveryEvaluations = grades.filter(
		(g) => g.evaluation && g.evaluation.type === 'RECUPERATORIO'
	);
	const finalExamEvaluations = grades.filter(
		(g) => g.evaluation && g.evaluation.type === 'EXAMEN_FINAL'
	);

	// Calcular promedio ponderado de cursada
	// Regla: EXCUSED no participa del promedio, ABSENT no participa (nota null)
	let weightedSum = 0;
	let totalWeight = 0;
	let presentCount = 0;
	let absentCount = 0;
	let excusedCount = 0;

	// Mapa para rastrear evaluaciones originales y sus recuperatorios
	const evaluationMap = new Map<
		string,
		{
			original: any;
			recovery: any;
		}
	>();

	// Primero, mapear evaluaciones originales
	for (const grade of courseEvaluations) {
		if (!grade.evaluation) continue;

		if (grade.status === 'PRESENT' && grade.value !== null) {
			presentCount++;
			const weight = Number(grade.evaluation.weight || 1);
			weightedSum += Number(grade.value) * weight;
			totalWeight += weight;
		} else if (grade.status === 'ABSENT') {
			absentCount++;
		} else if (grade.status === 'EXCUSED') {
			excusedCount++;
		}

		evaluationMap.set(grade.evaluation.id, {
			original: grade,
			recovery: null
		});
	}

	// Luego, procesar recuperatorios y reemplazar notas originales si son mejores
	for (const grade of recoveryEvaluations) {
		if (!grade.evaluation || !grade.evaluation.parentEvaluationId) continue;

		const parentId = grade.evaluation.parentEvaluationId;
		const entry = evaluationMap.get(parentId);

		if (entry) {
			entry.recovery = grade;
			// Si el recuperatorio tiene nota y es mejor que la original, reemplazar
			if (grade.status === 'PRESENT' && grade.value !== null) {
				const originalValue = entry.original.value !== null ? Number(entry.original.value) : 0;
				const recoveryValue = Number(grade.value);

				if (recoveryValue > originalValue) {
					// Restar nota original del sumatorio
					const originalWeight = Number(entry.original.evaluation?.weight || 1);
					weightedSum -= originalValue * originalWeight;

					// Agregar nota del recuperatorio
					const recoveryWeight = Number(grade.evaluation?.weight || originalWeight);
					weightedSum += recoveryValue * recoveryWeight;
				}
			}
		}
	}

	// Calcular promedio ponderado
	const courseAverage = totalWeight > 0 ? weightedSum / totalWeight : null;

	// Determinar courseStatus
	let courseStatus: CourseStatus;
	if (courseAverage === null) {
		courseStatus = CourseStatus.IN_PROGRESS;
	} else if (courseAverage >= promotionThreshold) {
		courseStatus = CourseStatus.PROMOTED;
	} else if (courseAverage >= approvalThreshold) {
		courseStatus = CourseStatus.PASSED_COURSE;
	} else {
		courseStatus = CourseStatus.FAILED_COURSE;
	}

	// Determinar finalExamStatus
	let finalExamStatus: FinalExamStatus;
	if (courseStatus === CourseStatus.PROMOTED) {
		finalExamStatus = FinalExamStatus.NOT_REQUIRED;
	} else if (finalExamEvaluations.length === 0) {
		finalExamStatus = FinalExamStatus.PENDING;
	} else {
		// Verificar si aprobó el examen final
		const finalExam = finalExamEvaluations[0]; // Asumimos un solo examen final
		if (finalExam.status === 'PRESENT' && finalExam.value !== null) {
			if (Number(finalExam.value) >= approvalThreshold) {
				finalExamStatus = FinalExamStatus.PASSED;
			} else {
				finalExamStatus = FinalExamStatus.FAILED;
			}
		} else {
			// ABSENT, EXCUSED y otros se tratan como PENDING
			finalExamStatus = FinalExamStatus.PENDING;
		}
	}

	// Determinar academicStatus (estado académico final)
	let academicStatus: AcademicStatus;
	if (courseStatus === CourseStatus.PROMOTED) {
		academicStatus = AcademicStatus.PROMOCIONADO;
	} else if (finalExamStatus === FinalExamStatus.PASSED) {
		academicStatus = AcademicStatus.APROBADO;
	} else if (finalExamStatus === FinalExamStatus.FAILED) {
		academicStatus = AcademicStatus.LIBRE;
	} else if (courseStatus === CourseStatus.FAILED_COURSE) {
		academicStatus = AcademicStatus.LIBRE;
	} else {
		academicStatus = AcademicStatus.EN_COURSE;
	}

	// Calcular regularityStatus (basado en asistencia, separado de notas)
	// Por ahora, basado en ausencias excesivas (más del 25%)
	const totalEvaluations = presentCount + absentCount + excusedCount;
	const absenceRate = totalEvaluations > 0 ? absentCount / totalEvaluations : 0;
	const regularityStatus = absenceRate > 0.25 ? 'LIBRE' : 'REGULAR';

	// Calcular finalGrade (nota final efectiva)
	let finalGrade: number | null;
	if (courseStatus === CourseStatus.PROMOTED) {
		finalGrade = courseAverage;
	} else if (finalExamStatus === FinalExamStatus.PASSED) {
		finalGrade = Number(finalExamEvaluations[0].value);
	} else {
		finalGrade = courseAverage; // Promedio de cursada como referencia
	}

	// Determinar approved y promoted (campos heredados para compatibilidad)
	const approved =
		academicStatus === AcademicStatus.APROBADO || academicStatus === AcademicStatus.PROMOCIONADO;
	const promoted = academicStatus === AcademicStatus.PROMOCIONADO;
	const promotionDate = promoted ? new Date() : undefined;

	return {
		regularityStatus,
		approved,
		promoted,
		finalGrade,
		promotionDate,
		courseAverage,
		courseStatus,
		finalExamStatus,
		academicStatus
	};
}

/**
 * Actualiza el estado de un estudiante en una materia basándose en sus calificaciones
 * Debe llamarse al cerrar el período anual o cuando se carga una calificación final
 * Actualiza los nuevos campos: courseStatus, finalExamStatus, academicStatus
 * Sincroniza temporalmente: approved, promoted, finalGrade
 */
export async function updateStudentSubjectStatus(
	studentId: string,
	subjectId: string,
	tx?: Omit<Prisma.TransactionClient, '$transaction' | '$use' | '$on' | '$disconnect' | '$connect'>
): Promise<void> {
	// Calcular estado final
	const status = await calculateFinalStatus(studentId, subjectId, tx);

	// Si no se proporciona un cliente transaccional, crear una transacción
	if (!tx) {
		await prisma.$transaction(async (txClient) => {
			await updateStudentSubjectStatusInternal(studentId, subjectId, status, txClient);
		});
	} else {
		await updateStudentSubjectStatusInternal(studentId, subjectId, status, tx);
	}
}

async function updateStudentSubjectStatusInternal(
	studentId: string,
	subjectId: string,
	status: Awaited<ReturnType<typeof calculateFinalStatus>>,
	tx: Omit<Prisma.TransactionClient, '$transaction' | '$use' | '$on' | '$disconnect' | '$connect'>
): Promise<void> {
	// Buscar el registro de estado
	const existingStatus = await tx.studentSubjectStatus.findUnique({
		where: {
			studentId_subjectId: {
				studentId,
				subjectId
			}
		}
	});

	if (existingStatus) {
		// Actualizar registro existente con nuevos campos
		await tx.studentSubjectStatus.update({
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
				promotionDate: status.promotionDate,
				// Nuevos campos del modelo
				courseAverage: status.courseAverage,
				courseStatus: status.courseStatus,
				finalExamStatus: status.finalExamStatus,
				academicStatus: status.academicStatus
			}
		});
	} else {
		// Crear nuevo registro con nuevos campos
		await tx.studentSubjectStatus.create({
			data: {
				studentId,
				subjectId,
				regularityStatus: status.regularityStatus,
				approved: status.approved,
				promoted: status.promoted,
				finalGrade: status.finalGrade,
				promotionDate: status.promotionDate,
				// Nuevos campos del modelo
				courseAverage: status.courseAverage,
				courseStatus: status.courseStatus,
				finalExamStatus: status.finalExamStatus,
				academicStatus: status.academicStatus
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
	careerId?: string,
	tx?: Omit<Prisma.TransactionClient, '$transaction' | '$use' | '$on' | '$disconnect' | '$connect'>
): Promise<{
	canPass: boolean;
	missing: string[];
	reason?: string;
}> {
	const client = tx || prisma;

	// Obtener umbrales de la materia
	const subject = await client.subject.findUnique({
		where: { id: subjectId }
	});

	const approvalThreshold = Number(subject?.approvalThreshold || 6);

	// 1. Verificar que tenga nota suficiente (usando umbral dinámico)
	if (finalGrade < approvalThreshold) {
		return {
			canPass: false,
			missing: [],
			reason: `La nota mínima para aprobar es ${approvalThreshold}`
		};
	}

	// 2. Obtener correlativas de tipo APROBADO
	const correlativas = await client.subjectCorrelative.findMany({
		where: {
			subjectId,
			isActive: true,
			correlativeType: CorrelativeType.APROBADO,
			OR: [{ careerId: null }, { careerId }]
		},
		include: {
			requiredSubject: {
				select: {
					id: true,
					code: true,
					name: true
				}
			}
		}
	});

	// 3. Verificar cada correlativa
	const missing = [] as string[];

	for (const corr of correlativas) {
		const status = await client.studentSubjectStatus.findFirst({
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
		reason: missing.length > 0 ? 'Faltan correlativas aprobadas' : undefined
	};
}

/**
 * Obtiene la malla curricular completa para una carrera
 */
export async function getCurriculum(careerId: string, year?: number) {
	const where: any = {
		careerId,
		isMandatory: true
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
							OR: [{ careerId: null }, { careerId }]
						},
						include: {
							requiredSubject: {
								select: {
									id: true,
									code: true,
									name: true
								}
							}
						}
					}
				}
			}
		},
		orderBy: [{ yearLevel: 'asc' }, { subject: { code: 'asc' } }]
	});

	// Agrupar por año
	const byYear = careerSubjects.reduce(
		(acc, cs) => {
			const year = cs.yearLevel;
			if (!acc[year]) {
				acc[year] = [];
			}
			acc[year].push({
				subject: cs.subject,
				isMandatory: cs.isMandatory
			});
			return acc;
		},
		{} as Record<number, Array<{ subject: any; isMandatory: boolean }>>
	);

	return {
		careerId,
		byYear,
		total: careerSubjects.length
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
			isMandatory: true
		},
		include: {
			subject: true
		}
	});

	// Obtener estados del estudiante
	const statuses = await prisma.studentSubjectStatus.findMany({
		where: {
			studentId
		}
	});

	const statusMap = new Map(statuses.map((s) => [s.subjectId, s]));

	const stats = {
		total: careerSubjects.length,
		regular: 0,
		approved: 0,
		failed: 0,
		notStarted: 0
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
		completion: Math.round((stats.approved / stats.total) * 100)
	};
}

/**
 * Obtiene materias disponibles para inscripción de un estudiante
 */
export async function getAvailableSubjects(studentId: string, careerId: string) {
	// Obtener todas las materias de la carrera
	const careerSubjects = await prisma.careerSubject.findMany({
		where: {
			careerId
		},
		include: {
			subject: true
		}
	});

	// Filtrar las que puede cursar
	const available = [];

	for (const cs of careerSubjects) {
		const check = await canStudentEnroll(studentId, cs.subjectId, careerId);
		if (check.canEnroll) {
			available.push({
				subject: cs.subject,
				yearLevel: cs.yearLevel
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
	const presentCount = attendanceEntries.filter((entry) => entry.present).length;
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
