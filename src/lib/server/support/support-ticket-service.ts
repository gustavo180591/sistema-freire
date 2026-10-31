import {
	AuditAction,
	SupportTicketPriority,
	SupportTicketStatus,
	SupportTicketType
} from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { getStudentAcademicTrajectory } from '$lib/server/academic/academic-trajectory-service';

export class SupportTicketError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'SupportTicketError';
	}
}

interface CreateAcademicDeletionTicketInput {
	studentId: string;
	subjectId: string;
	reason: string;
	requestedByUserId: string;
}

export async function createAcademicDeletionTicket(input: CreateAcademicDeletionTicketInput) {
	const reason = input.reason.trim();

	if (reason.length < 10) {
		throw new SupportTicketError(
			400,
			'El motivo debe explicar claramente por qué se solicita la eliminación'
		);
	}

	const trajectory = await getStudentAcademicTrajectory(input.studentId);

	if (!trajectory) {
		throw new SupportTicketError(404, 'Alumno no encontrado');
	}

	const subject = trajectory.subjects.find((item) => item.id === input.subjectId);

	if (!subject) {
		throw new SupportTicketError(404, 'La materia no pertenece a la trayectoria del alumno');
	}

	const hasPersistedAcademicEvidence = Boolean(
		subject.approval ||
		subject.currentEnrollment ||
		subject.regularity ||
		subject.courseAttempts.length > 0 ||
		subject.finalExamAttempts.length > 0
	);

	if (!hasPersistedAcademicEvidence) {
		throw new SupportTicketError(
			400,
			'La materia no tiene un registro académico persistido para eliminar'
		);
	}

	const entityId = `${input.studentId}:${input.subjectId}`;

	const existingTicket = await prisma.supportTicket.findFirst({
		where: {
			type: SupportTicketType.DELETE_REQUEST,
			entityType: 'STUDENT_SUBJECT_TRAJECTORY',
			entityId,
			status: {
				in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_REVIEW, SupportTicketStatus.APPROVED]
			}
		},
		select: {
			number: true,
			status: true
		}
	});

	if (existingTicket) {
		throw new SupportTicketError(
			409,
			`Ya existe el ticket #${existingTicket.number} para esta solicitud`
		);
	}

	return prisma.$transaction(async (tx) => {
		const ticket = await tx.supportTicket.create({
			data: {
				type: SupportTicketType.DELETE_REQUEST,
				status: SupportTicketStatus.OPEN,
				priority: SupportTicketPriority.NORMAL,
				title: `Eliminar registro académico: ${subject.name}`,
				description: reason,
				entityType: 'STUDENT_SUBJECT_TRAJECTORY',
				entityId,
				requestedByUserId: input.requestedByUserId,
				context: {
					studentId: input.studentId,
					studentName: trajectory.student.fullName,
					subjectId: input.subjectId,
					subjectCode: subject.code,
					subjectName: subject.name,
					yearLevel: subject.yearLevel,
					currentState: subject.state
				}
			}
		});

		await auditLog(
			{
				userId: input.requestedByUserId,
				action: AuditAction.CREATE,
				entityType: 'SUPPORT_TICKET',
				entityId: ticket.id,
				description: `Creó ticket #${ticket.number} para solicitar eliminación de registro académico`,
				metadata: {
					ticketNumber: ticket.number,
					studentId: input.studentId,
					subjectId: input.subjectId
				}
			},
			tx
		);

		return ticket;
	});
}
