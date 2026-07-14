import { Prisma } from '@prisma/client';
import { EnrollmentStatus } from '@prisma/client';

interface AutoEnrollmentInput {
	studentId: string;
	careerId: string;
	currentYear: number;
	locationId?: string;
	tx: Prisma.TransactionClient;
}

/**
 * Inscribir automáticamente a un alumno en las materias de su año actual
 * Para alumnos de 1º año, inscribe todas las materias de 1º año del plan activo
 */
export async function autoEnrollStudentInYearSubjects({
	studentId,
	careerId,
	currentYear,
	locationId,
	tx
}: AutoEnrollmentInput): Promise<void> {
	// Buscar el StudyPlan activo/default de la carrera
	const studyPlan = await tx.studyPlan.findFirst({
		where: {
			careerId,
			active: true,
			isDefault: true
		}
	});

	// Si no hay plan default, buscar el plan activo más reciente
	const activeStudyPlan =
		studyPlan ||
		(await tx.studyPlan.findFirst({
			where: {
				careerId,
				active: true
			},
			orderBy: {
				createdAt: 'desc'
			}
		}));

	if (!activeStudyPlan) {
		throw new Error('No hay un plan de estudio activo para la carrera');
	}

	// Obtener materias del plan para el año actual
	const planSubjects = await tx.planSubject.findMany({
		where: {
			planId: activeStudyPlan.id
		},
		include: {
			subject: true
		},
		orderBy: {
			sortOrder: 'asc'
		}
	});

	// Filtrar materias del año actual y activas
	const yearSubjects = planSubjects.filter(
		(ps) => ps.subject.yearLevel === currentYear && ps.subject.active
	);

	// Obtener ciclo lectivo activo
	let activeAcademicTerm;
	if (locationId) {
		activeAcademicTerm = await tx.academicTerm.findFirst({
			where: { active: true, locationId }
		});
	}

	// Fallback a ciclo lectivo activo general
	if (!activeAcademicTerm) {
		activeAcademicTerm = await tx.academicTerm.findFirst({
			where: { active: true }
		});
	}

	if (!activeAcademicTerm) {
		throw new Error('No hay un ciclo lectivo activo configurado');
	}

	// Crear inscripciones para cada materia
	for (const planSubject of yearSubjects) {
		const subject = planSubject.subject;

		// Verificar si ya existe inscripción
		const existingEnrollment = await tx.subjectEnrollment.findUnique({
			where: {
				studentId_subjectId_academicTermId: {
					studentId,
					subjectId: subject.id,
					academicTermId: activeAcademicTerm.id
				}
			}
		});

		if (existingEnrollment) {
			continue; // Ya está inscripto, saltar
		}

		// Buscar comisión activa para la materia, carrera y sede
		const commission = await tx.subjectCommission.findFirst({
			where: {
				subjectId: subject.id,
				careerId,
				locationId: locationId || null,
				academicTermId: activeAcademicTerm.id,
				active: true
			}
		});

		// Crear inscripción
		await tx.subjectEnrollment.create({
			data: {
				studentId,
				subjectId: subject.id,
				careerId,
				studyPlanId: activeStudyPlan.id,
				academicTermId: activeAcademicTerm.id,
				commissionId: commission?.id || null,
				status: EnrollmentStatus.ACTIVE,
				confirmedAt: new Date()
			}
		});

		// Crear o actualizar StudentSubjectStatus
		const existingStatus = await tx.studentSubjectStatus.findUnique({
			where: {
				studentId_subjectId: {
					studentId,
					subjectId: subject.id
				}
			}
		});

		if (!existingStatus) {
			await tx.studentSubjectStatus.create({
				data: {
					studentId,
					subjectId: subject.id,
					academicStatus: 'EN_COURSE',
					courseStatus: 'IN_PROGRESS',
					regularityStatus: 'LIBRE',
					approved: false,
					promoted: false,
					attendancePercent: 0
				}
			});
		}
	}
}
