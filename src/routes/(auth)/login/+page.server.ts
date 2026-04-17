import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import bcrypt from 'bcryptjs';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'Faltan credenciales', missing: true });
		}

		const user = await prisma.user.findUnique({
			where: { email },
			include: { roles: { include: { role: true } } }
		});

		if (!user) {
			return fail(400, { error: 'Credenciales inválidas', incorrect: true });
		}

		if (user.status !== 'ACTIVE') {
			return fail(403, { error: 'El usuario se encuentra inactivo o bloqueado' });
		}

		const validPassword = await bcrypt.compare(password, user.passwordHash);

		if (!validPassword) {
			return fail(400, { error: 'Credenciales inválidas', incorrect: true });
		}

		const token = crypto.randomUUID();

		await prisma.session.create({
			data: {
				userId: user.id,
				tokenHash: token,
				expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
			}
		});

		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30 // 30 días
		});

		const roles = user.roles.map(r => r.role.code);
		let redirectUrl = '/';

		if (roles.some((r) => ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'].includes(r))) {
			redirectUrl = '/dashboard';
		} else if (roles.includes('DOCENTE')) {
			redirectUrl = '/comisiones';
		} else if (roles.includes('FINANZAS')) {
			redirectUrl = '/finanzas';
		} else if (roles.includes('ALUMNO')) {
			redirectUrl = `/alumnos/${user.id}/historial`; // o donde corresponda para alumnos
		}

		throw redirect(303, redirectUrl);
	}
} satisfies Actions;
