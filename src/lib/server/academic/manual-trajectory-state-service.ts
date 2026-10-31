import {
	AcademicRecordSource,
	AcademicStatus,
	AcademicTrajectoryManualState,
	AuditAction,
	CourseStatus,
	RegularityStatus,
	SubjectAccreditationType
} from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { getStudentAcademicTrajectory } from './academic-trajectory-service';

export type ManualQuickAcademicStatus = 'TAKING' | 'RETAKING' | 'REGULAR' | 'FREE' | 'APPROVED';

export interface ManualAcademicStatusChange {
	subjectId: string;
	status: ManualQuickAcademicStatus;
}

interface SaveManualTrajectoryStatesInput {
	studentId: string;
	yearLevel: number;
	changes: ManualAcademicStatusChange[];
	userId: string;
}

export class ManualTrajectoryStateError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'ManualTrajectoryStateError';
	}
}

const manualStateMap: Record<ManualQuickAcademicStatus, AcademicTrajectoryManualState> = {
	TAKING: AcademicTrajectoryManualState.TAKING,
	RETAKING: AcademicTrajectoryManualState.RETAKING,
	REGULAR: AcademicTrajectoryManualState.REGULAR,
	FREE: AcademicTrajectoryManualState.FREE,
	APPROVED: AcademicTrajectoryManualState.APPROVED
};

function snapshotFields(status: ManualQuickAcademicStatus) {
	switch (status) {
		case 'TAKING':
		case 'RETAKING':
			return {
				approved: false,
				promoted: false,
				academicStatus: AcademicStatus.EN_COURSE,
				courseStatus: CourseStatus.IN_PROGRESS
			};

		case 'REGULAR':
			return {
				approved: false,
				promoted: false,
				regularityStatus: RegularityStatus.REGULAR,
				academicStatus: AcademicStatus.REGULAR,
				courseStatus: CourseStatus.PASSED_COURSE
			};

		case 'FREE':
			return {
				approved: false,
				promoted: false,
				regularityStatus: RegularityStatus.LIBRE,
				academicStatus: AcademicStatus.LIBRE,
				courseStatus: CourseStatus.FAILED_COURSE
			};

		case 'APPROVED':
			return {
				approved: true,
				promoted: false,
				regularityStatus: RegularityStatus.REGULAR,
				academicStatus: AcademicStatus.APROBADO,
				courseStatus: CourseStatus.PASSED_COURSE
			};
	}
}

export async function saveManualTrajectoryStates(input: SaveManualTrajectoryStatesInput) {
	const trajectory = await getStudentAcademicTrajectory(input.studentId);

	if (!trajectory) {
		throw new ManualTrajectoryStateError(404, 'Alumno no encontrado');
	}

	if (!Number.isInteger(input.yearLevel) || input.yearLevel < 1) {
		throw new ManualTrajectoryStateError(400, 'El año curricular no es válido');
	}

	const subjectsById = new Map(
		trajectory.subjects
			.filter((subject) => subject.yearLevel === input.yearLevel)
			.map((subject) => [subject.id, subject])
	);

	if (subjectsById.size === 0) {
		throw new ManualTrajectoryStateError(404, 'No hay materias configuradas para ese año');
	}

	const normalizedChanges = new Map<string, ManualQuickAcademicStatus>();

	for (const change of input.changes) {
		if (!subjectsById.has(change.subjectId)) {
			throw new ManualTrajectoryStateError(
				400,
				'Una de las materias no pertenece al año seleccionado'
			);
		}

		normalizedChanges.set(change.subjectId, change.status);
	}

	if (normalizedChanges.size === 0) {
		throw new ManualTrajectoryStateError(400, 'No hay cambios académicos para guardar');
	}

	const changedAt = new Date();

	return prisma.$transaction(async (tx) => {
		const appliedChanges: Array<{
			subjectId: string;
			previousState: string;
			status: ManualQuickAcademicStatus;
		}> = [];

		for (const [subjectId, status] of normalizedChanges) {
			const subject = subjectsById.get(subjectId);

			if (!subject) {
				continue;
			}

			const snapshot = snapshotFields(status);

			await tx.studentSubjectStatus.upsert({
				where: {
					studentId_subjectId: {
						studentId: input.studentId,
						subjectId
					}
				},
				update: {
					manualTrajectoryState: manualStateMap[status],
					manualTrajectoryStateUpdatedAt: changedAt,
					...snapshot
				},
				create: {
					studentId: input.studentId,
					subjectId,
					manualTrajectoryState: manualStateMap[status],
					manualTrajectoryStateUpdatedAt: changedAt,
					...snapshot
				}
			});

			/*
			 * Aprobada necesita además una acreditación real.
			 * Si ya existe una acreditación histórica, NO la
			 * reemplazamos ni eliminamos.
			 */
			if (status === 'APPROVED') {
				const accreditation = await tx.subjectAccreditation.findUnique({
					where: {
						studentId_subjectId: {
							studentId: input.studentId,
							subjectId
						}
					},
					select: {
						id: true
					}
				});

				if (!accreditation) {
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
				}
			}

			appliedChanges.push({
				subjectId,
				previousState: subject.state,
				status
			});
		}

		await auditLog(
			{
				userId: input.userId,
				action: AuditAction.UPDATE,
				entityType: 'STUDENT_ACADEMIC_TRAJECTORY',
				entityId: input.studentId,
				description: `Actualizó manualmente la situación académica de ${input.yearLevel}° año`,
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
}
