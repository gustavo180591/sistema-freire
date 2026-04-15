import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async () => {
	const commissions = await prisma.commission.findMany({
		where: {
			active: true
		},
		include: {
			subject: {
				select: {
					name: true
				}
			},
			term: {
				select: {
					name: true,
					year: true
				}
			},
			teachers: {
				select: {
					teacherId: true
				}
			},
			enrollments: {
				where: {
					status: 'ACTIVE'
				},
				select: {
					id: true
				}
			}
		},
		orderBy: [{ term: { year: 'desc' } }, { name: 'asc' }]
	});

	const normalizedCommissions = commissions.map((commission) => ({
		id: commission.id,
		name: commission.name,
		subject: commission.subject.name,
		term: `${commission.term.name} ${commission.term.year}`,
		teachers: commission.teachers.length,
		students: commission.enrollments.length,
		active: commission.active
	}));

	const totalTeachers = normalizedCommissions.reduce((acc, item) => acc + item.teachers, 0);
	const totalStudents = normalizedCommissions.reduce((acc, item) => acc + item.students, 0);

	return {
		commissions: normalizedCommissions,
		metrics: {
			activeCommissions: normalizedCommissions.length,
			totalTeachers,
			totalStudents
		}
	};
};
