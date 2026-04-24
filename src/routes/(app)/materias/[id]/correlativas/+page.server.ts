import { prisma } from '$lib/server/db/prisma';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const subject = await prisma.subject.findUnique({
        where: { id: params.id },
        include: {
            correlatives: {
                include: {
                    requiredSubject: true,
                    career: true
                },
                where: { isActive: true }
            },
            requiredBy: {
                include: {
                    subject: true,
                    career: true
                },
                where: { isActive: true }
            },
            careerSubjects: {
                include: {
                    career: true
                }
            }
        }
    });

    if (!subject) {
        throw redirect(302, '/materias');
    }

    // Get all subjects that can be correlatives (same or lower year)
    const availableSubjects = await prisma.subject.findMany({
        where: {
            yearLevel: { lte: subject.yearLevel },
            id: { not: subject.id },
            active: true
        },
        include: {
            careerSubjects: {
                include: { career: true }
            }
        },
        orderBy: [
            { yearLevel: 'asc' },
            { code: 'asc' }
        ]
    });

    // Get all careers for this subject
    const careers = subject.careerSubjects.map(cs => cs.career);

    return {
        subject,
        availableSubjects,
        careers
    };
};

export const actions: Actions = {
    addCorrelative: async ({ params, request }) => {
        const formData = await request.formData();
        const requiredSubjectId = formData.get('requiredSubjectId')?.toString();
        const correlativeType = formData.get('correlativeType')?.toString() || 'REGULAR';
        const careerId = formData.get('careerId')?.toString() || null;

        if (!requiredSubjectId) {
            return fail(400, { error: 'Debe seleccionar una materia' });
        }

        try {
            await prisma.subjectCorrelative.create({
                data: {
                    subjectId: params.id,
                    requiredSubjectId,
                    correlativeType: correlativeType as any,
                    careerId: careerId || null
                }
            });
            return { success: true };
        } catch (e) {
            console.error('Error creating correlative:', e);
            return fail(500, { error: 'Error al crear la correlativa' });
        }
    },

    removeCorrelative: async ({ params, request }) => {
        const formData = await request.formData();
        const correlativeId = formData.get('correlativeId')?.toString();

        if (!correlativeId) {
            return fail(400, { error: 'ID de correlativa requerido' });
        }

        try {
            await prisma.subjectCorrelative.update({
                where: { id: correlativeId },
                data: { isActive: false }
            });
            return { success: true };
        } catch (e) {
            console.error('Error removing correlative:', e);
            return fail(500, { error: 'Error al eliminar la correlativa' });
        }
    }
};
