import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user || !user.roles.includes('ALUMNO')) {
        throw redirect(303, '/login');
    }

    const student = await prisma.student.findFirst({
        where: { userId: user.id },
        include: {
            career: true,
            user: {
                select: {
                    email: true,
                    firstName: true,
                    lastName: true
                }
            }
        }
    });

    if (!student) {
        throw redirect(303, '/dashboard');
    }

    return {
        student: {
            id: student.id,
            dni: student.dni,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.user.email,
            career: student.career?.name || 'Sin carrera',
            status: student.status
        }
    };
};

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const user = locals.user;

        if (!user || !user.roles.includes('ALUMNO')) {
            return fail(403, { error: 'No autorizado' });
        }

        const formData = await request.formData();
        const firstName = formData.get('firstName')?.toString();
        const lastName = formData.get('lastName')?.toString();
        const email = formData.get('email')?.toString();

        if (!firstName || !lastName || !email) {
            return fail(400, { error: 'Todos los campos son obligatorios' });
        }

        try {
            const student = await prisma.student.findFirst({
                where: { userId: user.id }
            });

            if (!student) {
                return fail(404, { error: 'Estudiante no encontrado' });
            }

            // Actualizar en transacción
            await prisma.$transaction(async (tx) => {
                // Actualizar usuario
                await tx.user.update({
                    where: { id: user.id },
                    data: { email, firstName, lastName }
                });

                // Actualizar estudiante
                await tx.student.update({
                    where: { id: student.id },
                    data: { firstName, lastName }
                });
            });

            return { success: true };
        } catch (e) {
            console.error('Error actualizando perfil:', e);
            return fail(500, { error: 'Error al actualizar el perfil' });
        }
    }
};
