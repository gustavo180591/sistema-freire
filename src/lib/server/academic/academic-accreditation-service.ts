import {
	AcademicRecordSource,
	AcademicStatus,
	AuditAction,
	CourseStatus,
	FinalExamStatus,
	Prisma,
	RegularityStatus,
	SubjectAccreditationType
} from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { getStudentAcademicTrajectory } from './academic-trajectory-service';

export class AcademicAccreditationError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'AcademicAccreditationError';
	}
}

export type ManualQuickAcademicStatus = 'APPROVED' | 'REGULAR' | 'FREE';

export interface ManualAcademicStatusChange {
	subjectId: string;
	status: ManualQuickAcademicStatus;
}

export interface SaveManualAcademicYearStatusesInput {
	studentId: string;
	yearLevel: number;
	changes: ManualAcademicStatusChange[];
	userId: string;
	allowApprovalOverExistingEvidence?: boolean;
}

export async function saveManualAcademicYearStatuses(input: SaveManualAcademicYearStatusesInput) {
	if (input.changes.length === 0) {
		throw new AcademicAccreditationError(400, 'No hay cambios académicos para guardar');
	}

	const trajectory = await getStudentAcademicTrajectory(input.studentId);

	if (!trajectory) {
		throw new AcademicAccreditationError(404, 'Alumno no encontrado');
	}

	if (
		!Number.isInteger(input.yearLevel) ||
		input.yearLevel < 1 ||
		input.yearLevel > trajectory.student.currentYear
	) {
		throw new AcademicAccreditationError(
			400,
			'El año curricular seleccionado no es válido para este alumno'
		);
	}

	const yearSubjects = new Map(
		trajectory.subjects
			.filter((subject) => subject.yearLevel === input.yearLevel)
			.map((subject) => [subject.id, subject])
	);

	const normalizedChanges = new Map<string, ManualQuickAcademicStatus>();

	for (const change of input.changes) {
		const subject = yearSubjects.get(change.subjectId);

		if (!subject) {
			throw new AcademicAccreditationError(
				400,
				'Una de las materias no pertenece al año curricular seleccionado'
			);
		}

		const isBulkApprovalOverExistingEvidence =
			change.status === 'APPROVED' && input.allowApprovalOverExistingEvidence === true;

		if (subject.state === 'APPROVED') {
			throw new AcademicAccreditationError(409, `${subject.name} ya se encuentra aprobada`);
		}

		if (subject.state !== 'NOT_STARTED' && !isBulkApprovalOverExistingEvidence) {
			throw new AcademicAccreditationError(
				409,
				`${subject.name} ya tiene antecedentes académicos y no puede modificarse desde la carga rápida`
			);
		}

		normalizedChanges.set(change.subjectId, change.status);
	}

	try {
		return await prisma.$transaction(async (tx) => {
			const appliedChanges: ManualAcademicStatusChange[] = [];

			for (const [subjectId, status] of normalizedChanges) {
				if (status === 'APPROVED') {
					await tx.subjectAccreditation.create({
						data: {
							studentId: input.studentId,
							subjectId,
							type: SubjectAccreditationType.UNSPECIFIED,
							source: AcademicRecordSource.MANUAL,
							accreditedAt: null,
							academicYear: null,
							grade: null,
							observations: null,
							createdByUserId: input.userId
						}
					});

					await tx.studentSubjectStatus.upsert({
						where: {
							studentId_subjectId: {
								studentId: input.studentId,
								subjectId
							}
						},
						create: {
							studentId: input.studentId,
							subjectId,
							approved: true,
							promoted: false,
							academicStatus: AcademicStatus.APROBADO,
							finalExamStatus: FinalExamStatus.PENDING
						},
						update: {
							approved: true,
							promoted: false,
							academicStatus: AcademicStatus.APROBADO,
							finalExamStatus: FinalExamStatus.PENDING
						}
					});
				}

				if (status === 'REGULAR') {
					await tx.studentSubjectStatus.upsert({
						where: {
							studentId_subjectId: {
								studentId: input.studentId,
								subjectId
							}
						},
						create: {
							studentId: input.studentId,
							subjectId,
							regularityStatus: RegularityStatus.REGULAR,
							academicStatus: AcademicStatus.REGULAR,
							courseStatus: CourseStatus.PASSED_COURSE,
							approved: false,
							promoted: false,
							finalExamStatus: FinalExamStatus.PENDING
						},
						update: {
							regularityStatus: RegularityStatus.REGULAR,
							academicStatus: AcademicStatus.REGULAR,
							courseStatus: CourseStatus.PASSED_COURSE,
							approved: false,
							promoted: false,
							finalExamStatus: FinalExamStatus.PENDING
						}
					});
				}

				if (status === 'FREE') {
					await tx.studentSubjectStatus.upsert({
						where: {
							studentId_subjectId: {
								studentId: input.studentId,
								subjectId
							}
						},
						create: {
							studentId: input.studentId,
							subjectId,
							regularityStatus: RegularityStatus.LIBRE,
							academicStatus: AcademicStatus.LIBRE,
							courseStatus: CourseStatus.FAILED_COURSE,
							approved: false,
							promoted: false,
							finalExamStatus: FinalExamStatus.PENDING
						},
						update: {
							regularityStatus: RegularityStatus.LIBRE,
							academicStatus: AcademicStatus.LIBRE,
							courseStatus: CourseStatus.FAILED_COURSE,
							approved: false,
							promoted: false,
							finalExamStatus: FinalExamStatus.PENDING
						}
					});
				}

				appliedChanges.push({
					subjectId,
					status
				});
			}

			await auditLog(
				{
					userId: input.userId,
					action: AuditAction.UPDATE,
					entityType: 'STUDENT_ACADEMIC_TRAJECTORY',
					entityId: input.studentId,
					description: `Carga académica rápida de ${input.yearLevel}° año`,
					metadata: {
						yearLevel: input.yearLevel,
						changes: appliedChanges
					}
				},
				tx
			);

			return {
				updated: appliedChanges.length
			};
		});
	} catch (cause) {
		if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
			throw new AcademicAccreditationError(
				409,
				'Una de las materias ya fue modificada por otro proceso'
			);
		}

		throw cause;
	}
}

export interface ApproveManualAcademicYearInput {
	studentId: string;
	yearLevel: number;
	userId: string;
}

export async function approveManualAcademicYear(input: ApproveManualAcademicYearInput) {
	const trajectory = await getStudentAcademicTrajectory(input.studentId);

	if (!trajectory) {
		throw new AcademicAccreditationError(404, 'Alumno no encontrado');
	}

	if (
		!Number.isInteger(input.yearLevel) ||
		input.yearLevel < 1 ||
		input.yearLevel > trajectory.student.currentYear
	) {
		throw new AcademicAccreditationError(
			400,
			'El año curricular seleccionado no es válido para este alumno'
		);
	}

	const yearSubjects = trajectory.subjects.filter(
		(subject) => subject.yearLevel === input.yearLevel
	);

	if (yearSubjects.length === 0) {
		throw new AcademicAccreditationError(
			404,
			'No hay materias configuradas para ese año curricular'
		);
	}

	const subjectsToApprove = yearSubjects.filter((subject) => subject.state !== 'APPROVED');

	if (subjectsToApprove.length === 0) {
		return {
			updated: 0,
			total: yearSubjects.length,
			skipped: yearSubjects.length
		};
	}

	const result = await saveManualAcademicYearStatuses({
		studentId: input.studentId,
		yearLevel: input.yearLevel,
		userId: input.userId,
		allowApprovalOverExistingEvidence: true,
		changes: subjectsToApprove.map((subject) => ({
			subjectId: subject.id,
			status: 'APPROVED'
		}))
	});

	return {
		updated: result.updated,
		total: yearSubjects.length,
		skipped: yearSubjects.length - subjectsToApprove.length
	};
}
