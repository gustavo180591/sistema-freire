import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, error, fail } from '@sveltejs/kit';
import { generateTOTPSecret, generateQRCode, verifyTOTP } from '$lib/server/auth/totp';

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
            status: userWithRoles.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
            totpEnabled: userWithRoles.totpEnabled,
            totpVerified: userWithRoles.totpVerified
        },
        metrics: {
            totalUsers,
            totalStudents,
            totalCareers,
            totalCommissions
        }
    };
};

export const actions: Actions = {
    // Iniciar configuración 2FA - generar secreto y QR
    setup2FA: async ({ locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, email: true, totpEnabled: true }
        });

        if (!dbUser) return fail(404, { error: 'Usuario no encontrado' });
        if (dbUser.totpEnabled) return fail(400, { error: '2FA ya está activado' });

        // Generar secreto y QR
        const { secret, uri } = generateTOTPSecret(dbUser.id, dbUser.email);
        const qrCode = await generateQRCode(uri);

        // Guardar secreto temporalmente (no activado hasta verificar)
        await prisma.user.update({
            where: { id: user.id },
            data: { totpSecret: secret, totpEnabled: false, totpVerified: false }
        });

        return {
            success: true,
            secret,
            qrCode
        };
    },

    // Verificar y activar 2FA
    verify2FA: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const data = await request.formData();
        const code = data.get('code')?.toString();

        if (!code || code.length !== 6) {
            return fail(400, { error: 'Código inválido' });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { totpSecret: true, totpEnabled: true }
        });

        if (!dbUser?.totpSecret) {
            return fail(400, { error: 'No hay configuración 2FA pendiente' });
        }

        if (dbUser.totpEnabled) {
            return fail(400, { error: '2FA ya está activado' });
        }

        // Verificar código
        const isValid = verifyTOTP(dbUser.totpSecret, code);
        
        if (!isValid) {
            return fail(400, { error: 'Código incorrecto' });
        }

        // Activar 2FA
        await prisma.user.update({
            where: { id: user.id },
            data: { totpEnabled: true, totpVerified: true }
        });

        return { success: true, message: '2FA activado correctamente' };
    },

    // Desactivar 2FA
    disable2FA: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, '/login');

        const data = await request.formData();
        const code = data.get('code')?.toString();

        if (!code || code.length !== 6) {
            return fail(400, { error: 'Código inválido' });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { totpSecret: true, totpEnabled: true }
        });

        if (!dbUser?.totpEnabled || !dbUser.totpSecret) {
            return fail(400, { error: '2FA no está activado' });
        }

        // Verificar código antes de desactivar
        const isValid = verifyTOTP(dbUser.totpSecret, code);
        
        if (!isValid) {
            return fail(400, { error: 'Código incorrecto' });
        }

        // Desactivar 2FA
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                totpEnabled: false, 
                totpVerified: false,
                totpSecret: null 
            }
        });

        return { success: true, message: '2FA desactivado correctamente' };
    }
};
