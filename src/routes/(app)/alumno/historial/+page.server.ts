import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, error } from '@sveltejs/kit';
import { getStudentBlockingMessage } from '$lib/server/financial/student-blocking-service';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';
import { studentFinancialSummaryService } from '$lib/server/financial/student-financial-summary-service';

interface EnhancedSubject {
	id: string;
	subjectId: string;
	attendancePercent: number;
	regularityStatus: string;
	approved: boolean;
	subject: {
		id: string;
		code: string;
		name: string;
		yearLevel: number;
		subjectType: string;
		accreditationMode: string;
		approvalThreshold: number;
		promotionThreshold: number;
	};
	isApproved: boolean;
	isRegular: boolean;
	pendingCorrelatives: string[];
	metCorrelatives: string[];
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Verificar que sea alumno
	const isStudent = user.roles.includes('ALUMNO');
	if (!isStudent) {
		throw redirect(303, '/dashboard');
	}

	// Obtener el estudiante asociado al usuario (por userId o DNI)
	const student = await getCurrentStudentForUser(user.id);

	// Cargar datos adicionales del estudiante
	const studentWithRelations = await prisma.student.findUnique({
		where: { id: student.id },
		include: {
			career: true,
			location: true,
			subjectStatuses: {
				include: {
					subject: {
						include: {
							correlatives: {
								where: {
									isActive: true,
									OR: [{ careerId: null }, { careerId: undefined }]
								},
								include: {
									requiredSubject: true
								}
							}
						}
					}
				}
			},
			studentCharges: true
		}
	});

	if (!studentWithRelations) {
		throw error(404, 'No se encontraron datos del estudiante');
	}

	// Obtener mensaje de bloqueo financiero
	const blockingMessage = await getStudentBlockingMessage(studentWithRelations.id);

	// Obtener el plan de estudio activo de la carrera
	const studyPlan = await prisma.studyPlan.findFirst({
		where: {
			careerId: studentWithRelations.careerId,
			active: true,
			isDefault: true
		}
	});

	const activeStudyPlan =
		studyPlan ||
		(await prisma.studyPlan.findFirst({
			where: {
				careerId: studentWithRelations.careerId,
				active: true
			},
			orderBy: {
				createdAt: 'desc'
			}
		}));

	// Obtener materias del plan de estudio
	const planSubjects = activeStudyPlan
		? await prisma.planSubject.findMany({
				where: {
					planId: activeStudyPlan.id
				},
				include: {
					subject: {
						include: {
							correlatives: {
								where: {
									isActive: true,
									OR: [{ careerId: null }, { careerId: undefined }]
								},
								include: {
									requiredSubject: true
								}
							}
						}
					}
				},
				orderBy: {
					sortOrder: 'asc'
				}
			})
		: [];

	// Obtener IDs de materias aprobadas y regulares del alumno
	const approvedSubjectIds = studentWithRelations.subjectStatuses
		.filter((s) => s.approved)
		.map((s) => s.subjectId);
	const regularSubjectIds = studentWithRelations.subjectStatuses
		.filter((s) => s.regularityStatus === 'REGULAR')
		.map((s) => s.subjectId);

	// Calcular estado de cada materia del plan
	const subjectsByYear: Record<number, EnhancedSubject[]> = {};

	for (const planSubject of planSubjects) {
		const subject = planSubject.subject;
		const subjectStatus = studentWithRelations.subjectStatuses.find(
			(s) => s.subjectId === subject.id
		);

		const isApproved = approvedSubjectIds.includes(subject.id);
		const isRegular = regularSubjectIds.includes(subject.id);

		// Verificar correlatividades
		let pendingCorrelatives: string[] = [];
		let metCorrelatives: string[] = [];

		if (subject.correlatives.length > 0) {
			for (const correlative of subject.correlatives) {
				const requiredSubjectId = correlative.requiredSubjectId;
				const isRequiredApproved = approvedSubjectIds.includes(requiredSubjectId);
				const isRequiredRegular = regularSubjectIds.includes(requiredSubjectId);

				if (isRequiredApproved || isRequiredRegular) {
					metCorrelatives.push(correlative.requiredSubject.name);
				} else {
					pendingCorrelatives.push(correlative.requiredSubject.name);
				}
			}
		}

		const yearLevel = subject.yearLevel;
		if (!subjectsByYear[yearLevel]) {
			subjectsByYear[yearLevel] = [];
		}

		const enhancedSubject: EnhancedSubject = {
			id: subjectStatus?.id || '',
			subjectId: subject.id,
			attendancePercent: subjectStatus ? Number(subjectStatus.attendancePercent) : 0,
			regularityStatus: subjectStatus?.regularityStatus || 'LIBRE',
			approved: isApproved,
			subject: {
				id: subject.id,
				code: subject.code,
				name: subject.name,
				yearLevel: subject.yearLevel,
				subjectType: subject.subjectType,
				accreditationMode: subject.accreditationMode,
				approvalThreshold: Number(subject.approvalThreshold),
				promotionThreshold: Number(subject.promotionThreshold)
			},
			isApproved,
			isRegular,
			pendingCorrelatives,
			metCorrelatives
		};

		subjectsByYear[yearLevel].push(enhancedSubject);
	}

	// Calcular progreso real basado en materias del plan
	const totalPlanSubjects = planSubjects.length;
	const approvedCount = approvedSubjectIds.length;
	const progress =
		totalPlanSubjects > 0 ? Math.round((approvedCount / totalPlanSubjects) * 100) : 0;

	// Calcular resumen financiero usando el servicio común
	const financialSummary = await studentFinancialSummaryService.getStudentFinancialSummary(
		studentWithRelations.id
	);

	return {
		student: {
			id: studentWithRelations.id,
			fullName: `${studentWithRelations.firstName} ${studentWithRelations.lastName}`,
			dni: studentWithRelations.dni,
			status: studentWithRelations.status,
			career: studentWithRelations.career.name,
			location: studentWithRelations.location?.name || null,
			currentYear: studentWithRelations.currentYear,
			financialBlocked: financialSummary.financialBlocked,
			blockingMessage: financialSummary.blockingMessage
		},
		academic: {
			totalSubjects: totalPlanSubjects,
			approvedSubjects: approvedCount,
			regularSubjects: regularSubjectIds.length,
			freeSubjects: totalPlanSubjects - approvedCount - regularSubjectIds.length,
			progress,
			subjectsByYear
		},
		financial: {
			totalDebt: financialSummary.totalDebt
		}
	};
};
