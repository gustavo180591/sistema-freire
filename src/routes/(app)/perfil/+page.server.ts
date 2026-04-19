import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user) {
        throw redirect(303, '/login');
    }

    // Redirigir alumnos a su perfil específico
    if (user.roles.includes('ALUMNO')) {
        throw redirect(303, '/alumno');
    }

    // Redirigir docentes a su perfil específico (cuando exista)
    if (user.roles.includes('DOCENTE')) {
        throw redirect(303, '/docente');
    }

    // Cargar información completa del usuario
    const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            roles: {
                include: {
                    role: {
                        select: { code: true, name: true }
                    }
                }
            }
        }
    });

    if (!userWithRoles) {
        throw error(404, 'Usuario no encontrado');
    }

    // Obtener métricas del sistema
    const [
        totalUsers,
        totalStudents,
        totalCareers,
        totalCommissions
    ] = await Promise.all([
        prisma.user.count(),
        prisma.student.count(),
        prisma.career.count({ where: { active: true } }),
        prisma.commission.count({ where: { active: true } })
    ]);

    return {
        user: {
            id: userWithRoles.id,
            email: userWithRoles.email,
            firstName: userWithRoles.firstName,
            lastName: userWithRoles.lastName,
            fullName: `${userWithRoles.firstName} ${userWithRoles.lastName}`,
            roles: userWithRoles.roles.map(r => r.role.code),
            status: userWithRoles.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
        },
        metrics: {
            totalUsers,
            totalStudents,
            totalCareers,
            totalCommissions
        }
    };
};
