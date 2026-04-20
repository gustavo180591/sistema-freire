import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, fail } from '@sveltejs/kit';
import { verifyTOTP } from '$lib/server/auth/totp';

export const load: PageServerLoad = async ({ cookies, url }) => {
    const pending2FA = cookies.get('pending_2fa');
    
    if (!pending2FA) {
        throw redirect(303, '/login');
    }

    // Verificar que el usuario existe y tiene 2FA habilitado
    const user = await prisma.user.findUnique({
        where: { id: pending2FA },
        select: { 
            id: true, 
            email: true, 
            totpEnabled: true,
            totpSecret: true,
            firstName: true,
            lastName: true
        }
    });

    if (!user || !user.totpEnabled || !user.totpSecret) {
        // Limpiar cookie y redirigir
        cookies.delete('pending_2fa', { path: '/' });
        throw redirect(303, '/login');
    }

    return {
        user: {
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`
        }
    };
};

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const pending2FA = cookies.get('pending_2fa');
        
        if (!pending2FA) {
            return fail(400, { error: 'Sesión inválida' });
        }

        const data = await request.formData();
        const code = data.get('code')?.toString();

        if (!code || code.length !== 6) {
            return fail(400, { error: 'Código inválido' });
        }

        const user = await prisma.user.findUnique({
            where: { id: pending2FA },
            include: { roles: { include: { role: true } } }
        });

        if (!user || !user.totpEnabled || !user.totpSecret) {
            cookies.delete('pending_2fa', { path: '/' });
            return fail(400, { error: 'Sesión inválida' });
        }

        // Verificar código TOTP
        const isValid = verifyTOTP(user.totpSecret, code);

        if (!isValid) {
            return fail(400, { 
                error: 'Código incorrecto. Verificá que esté sincronizado con la hora actual.',
                attemptsLeft: true 
            });
        }

        // Código válido - limpiar intentos fallidos y crear sesión
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastFailedAttempt: null
            }
        });

        // Crear sesión
        const token = crypto.randomUUID();
        await prisma.session.create({
            data: {
                userId: user.id,
                tokenHash: token,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
            }
        });

        // Limpiar cookie de 2FA pendiente
        cookies.delete('pending_2fa', { path: '/' });

        // Crear cookie de sesión
        cookies.set('session', token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30
        });

        // Redirigir según rol
        const roles = user.roles.map(r => r.role.code);
        let redirectUrl = '/';

        if (roles.some((r) => ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA', 'APODERADO'].includes(r))) {
            redirectUrl = '/dashboard';
        } else if (roles.includes('DOCENTE')) {
            redirectUrl = '/comisiones';
        } else if (roles.includes('FINANZAS')) {
            redirectUrl = '/finanzas';
        } else if (roles.includes('ALUMNO')) {
            redirectUrl = '/alumno';
        }

        throw redirect(303, redirectUrl);
    }
};
