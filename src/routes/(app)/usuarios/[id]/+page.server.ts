import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const user = await prisma.user.findUnique({
		where: { id: params.id },
		include: {
			roles: {
				include: {
					role: true
				}
			},
			student: true,
			teacher: {
				include: {
					subjects: {
						include: {
							subject: true
						}
					}
				}
			},
			locationPermissions: {
				include: {
					location: true
				}
			}
		}
	});

	if (!user) {
		throw error(404, 'Usuario no encontrado');
	}

	// Determinar si el usuario tiene roles administrativos
	const isAdmin = user.roles.some((ur) => ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'].includes(ur.role.code));

	// Cargar evaluaciones creadas por el usuario o todas si es admin
	const evaluations = await prisma.evaluation.findMany({
		where: isAdmin ? {} : { createdBy: user.id },
		include: {
			subject: true,
			creator: {
				select: {
					firstName: true,
					lastName: true
				}
			}
		},
		orderBy: { date: 'desc' }
	});

	return {
		user,
		evaluations: evaluations.map(e => ({
			id: e.id,
			title: e.title,
			type: e.type,
			date: e.date,
			subject: e.subject.name,
			subjectCode: e.subject.code,
			creator: `${e.creator.firstName} ${e.creator.lastName}`
		}))
	};
};
