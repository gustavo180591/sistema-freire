import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async () => {
    const users = await prisma.user.findMany({
        include: {
            roles: {
                include: {
                    role: {
                        select: {
                            code: true,
                            name: true
                        }
                    }
                }
            }
        },
        orderBy: [
            { lastName: 'asc' },
            { firstName: 'asc' }
        ]
    });

    const normalizedUsers = users.map((user) => ({
        id: user.id,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.roles.map((r) => r.role.code).join(', ') || 'SIN_ROL',
        status: user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
    }));

    return {
        users: normalizedUsers,
        metrics: {
            total: normalizedUsers.length,
            active: normalizedUsers.filter((u) => u.status === 'Activo').length,
            inactive: normalizedUsers.filter((u) => u.status === 'Inactivo').length
        }
    };
};
