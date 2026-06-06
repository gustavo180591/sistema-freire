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

    // Convert Decimal types to strings for serialization
    const normalizedSubject = {
        ...subject,
        approvalThreshold: subject.approvalThreshold?.toString() || '6',
        promotionThreshold: subject.promotionThreshold?.toString() || '7',
        correlatives: subject.correlatives.map(c => ({
            ...c,
            requiredSubject: {
                ...c.requiredSubject,
                approvalThreshold: c.requiredSubject.approvalThreshold?.toString() || '6',
                promotionThreshold: c.requiredSubject.promotionThreshold?.toString() || '7'
            }
        })),
        requiredBy: subject.requiredBy.map(r => ({
            ...r,
            subject: {
                ...r.subject,
                approvalThreshold: r.subject.approvalThreshold?.toString() || '6',
                promotionThreshold: r.subject.promotionThreshold?.toString() || '7'
            }
        }))
    };

    // Get all careers for this subject
    const careers = subject.careerSubjects.map(cs => cs.career);
    const careerIds = careers.map(c => c.id);

    // Get all subjects that can be correlatives (same or lower year, same careers)
    const availableSubjects = await prisma.subject.findMany({
        where: {
            yearLevel: { lte: subject.yearLevel },
            id: { not: subject.id },
            active: true,
            careerSubjects: {
                some: {
                    careerId: { in: careerIds }
                }
            }
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

    // Normalize available subjects as well
    const normalizedAvailableSubjects = availableSubjects.map(s => ({
        ...s,
        approvalThreshold: s.approvalThreshold?.toString() || '6',
        promotionThreshold: s.promotionThreshold?.toString() || '7'
    }));

    return {
        subject: normalizedSubject,
        availableSubjects: normalizedAvailableSubjects,
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
            await prisma.subjectCorrelative.delete({
                where: { id: correlativeId }
            });
            return { success: true };
        } catch (e) {
            console.error('Error removing correlative:', e);
            return fail(500, { error: 'Error al eliminar la correlativa' });
        }
    }
};
