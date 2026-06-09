import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params }) => {
	const subject = await prisma.subject.findUnique({
		where: { id: params.id },
		include: {
			careerSubjects: {
				include: {
					career: {
						select: { id: true, code: true, name: true, trainingField: true }
					}
				}
			},
			correlatives: {
				include: {
					requiredSubject: {
						select: { id: true, code: true, name: true, yearLevel: true }
					},
					career: {
						select: { id: true, code: true, name: true }
					}
				},
				where: { isActive: true }
			},
			requiredBy: {
				include: {
					subject: {
						select: { id: true, code: true, name: true, yearLevel: true }
					},
					career: {
						select: { id: true, code: true, name: true }
					}
				},
				where: { isActive: true }
			}
		}
	});

	if (!subject) {
		throw error(404, 'Materia no encontrada');
	}

	return { subject };
};
