import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
    const careers = await prisma.career.findMany({
        where: {
            active: true
        },
        include: {
            studyPlans: {
                select: {
                    id: true
                }
            },
            students: {
                select: {
                    id: true
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    const normalizedCareers = careers.map((career) => ({
        id: career.id,
        code: career.code,
        name: career.name,
        active: career.active,
        plans: career.studyPlans.length,
        students: career.students.length
    }));

    const totalPlans = normalizedCareers.reduce((acc, item) => acc + item.plans, 0);
    const totalStudents = normalizedCareers.reduce((acc, item) => acc + item.students, 0);

    return {
        careers: normalizedCareers,
        metrics: {
            activeCareers: normalizedCareers.length,
            totalPlans,
            totalStudents
        }
    };
};

export const actions: Actions = {
    delete: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) {
            return fail(400, { error: 'ID de carrera no proporcionado' });
        }

        try {
            // Verificar si tiene planes o alumnos
            const career = await prisma.career.findUnique({
                where: { id },
                include: {
                    studyPlans: { select: { id: true } },
                    students: { select: { id: true } }
                }
            });

            if (!career) {
                return fail(404, { error: 'Carrera no encontrada' });
            }

            if (career.studyPlans.length > 0) {
                return fail(400, { error: 'No se puede eliminar: la carrera tiene planes de estudio asociados' });
            }

            if (career.students.length > 0) {
                return fail(400, { error: 'No se puede eliminar: la carrera tiene alumnos inscriptos' });
            }

            await prisma.career.delete({
                where: { id }
            });

            return { success: true };
        } catch (error) {
            console.error('Error al eliminar carrera:', error);
            return fail(500, { error: 'Error al eliminar la carrera. Intente nuevamente.' });
        }
    }
};
