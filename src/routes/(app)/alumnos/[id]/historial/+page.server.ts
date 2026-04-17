import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireStudentAccess } from '$lib/server/auth/student-access';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireStudentAccess(locals.user, params.id);

	const student = await prisma.student.findUniqueOrThrow({
		where: { id: params.id },
		include: {
			career: true,
			subjectStatuses: {
				include: {
					subject: true
				}
			},
			studentCharges: true
		}
	});

	return {
		student: {
			id: student.id,
			fullName: `${student.firstName} ${student.lastName}`,
			dni: student.dni,
			status: student.status,
			career: student.career.name
		},
		academic: {
			totalSubjects: student.subjectStatuses.length,
			approvedSubjects: student.subjectStatuses.filter((s) => s.approved).length,
			regularSubjects: student.subjectStatuses.filter((s) => s.regularityStatus === 'REGULAR')
				.length,
			progress: 75,
			subjects: student.subjectStatuses.map((status) => ({
				id: status.id,
				subject: status.subject.name,
				yearLevel: status.subject.yearLevel,
				attendancePercent: Number(status.attendancePercent),
				regularityStatus: status.regularityStatus,
				approved: status.approved
			}))
		},
		financial: {
			totalDebt: 0
		}
	};
};
