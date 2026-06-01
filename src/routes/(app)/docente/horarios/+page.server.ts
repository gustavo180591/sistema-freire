import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id },
		include: {
			commissions: {
				include: {
					commission: {
						include: {
							subject: true,
							term: true
						}
					}
				}
			}
		}
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las comisiones asignadas al docente
	const commissions = teacher.commissions.map(ct => ct.commission);

	// Obtener estudiantes por comisión
	const studentsByCommission = await Promise.all(
		commissions.map(async (commission) => {
			const students = await prisma.student.findMany({
				where: {
					status: 'ACTIVE',
					enrollments: {
						some: {
							commissionId: commission.id
						}
					}
				},
				include: {
					career: true
				}
			});

			return {
				commissionId: commission.id,
				totalStudents: students.length
			};
		})
	);

	return {
		commissions: commissions.map(c => {
			const studentData = studentsByCommission.find(s => s.commissionId === c.id);
			return {
				id: c.id,
				name: c.name,
				subject: c.subject.name,
				subjectCode: c.subject.code,
				term: c.term.name,
				active: c.active,
				totalStudents: studentData?.totalStudents || 0
			};
		})
	};
};
