import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

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

		// Verificar si la cuenta está bloqueada
		const now = new Date();
		if (user.lockedUntil && user.lockedUntil > now) {
			const minutesLeft = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
			
			// Registrar intento bloqueado
			await prisma.auditLog.create({
				data: {
					action: AuditAction.BLOCKED_ATTEMPT,
					entityType: 'User',
					entityId: user.id,
					description: `Intento de login bloqueado. Cuenta bloqueada por ${minutesLeft} minutos más.`,
					userId: user.id
				}
			});
			
			return fail(403, { 
				error: `Cuenta temporalmente bloqueada. Intente nuevamente en ${minutesLeft} minutos.`,
				locked: true,
				minutesLeft
			});
		}

		// Si pasó el tiempo de bloqueo, limpiar el bloqueo
		if (user.lockedUntil && user.lockedUntil <= now) {
			await prisma.user.update({
				where: { id: user.id },
				data: {
					failedLoginAttempts: 0,
					lockedUntil: null,
					lastFailedAttempt: null
				}
			});
		}

		if (user.status !== 'ACTIVE') {
			return fail(403, { error: 'El usuario se encuentra inactivo o bloqueado' });
		}

		const validPassword = await bcrypt.compare(password, user.passwordHash);

		if (!validPassword) {
			// Incrementar contador de intentos fallidos
			const newAttempts = (user.failedLoginAttempts || 0) + 1;
			const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
			
			await prisma.user.update({
				where: { id: user.id },
				data: {
					failedLoginAttempts: newAttempts,
					lastFailedAttempt: now,
					lockedUntil: shouldLock 
						? new Date(now.getTime() + LOCK_DURATION_MINUTES * 60000)
						: user.lockedUntil
				}
			});

			// Registrar intento fallido
			await prisma.auditLog.create({
				data: {
					action: AuditAction.LOGIN,
					entityType: 'User',
					entityId: user.id,
					description: `Intento de login fallido #${newAttempts}`,
					userId: user.id
				}
			});

			// Mensaje diferente si es el intento que bloquea
			if (shouldLock) {
				return fail(403, { 
					error: `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCK_DURATION_MINUTES} minutos.`,
					locked: true,
					minutesLeft: LOCK_DURATION_MINUTES
				});
			}

			return fail(400, { 
				error: 'Credenciales inválidas', 
				incorrect: true,
				attemptsLeft: MAX_FAILED_ATTEMPTS - newAttempts
			});
		}

		// Login exitoso - limpiar contador de intentos
		if (user.failedLoginAttempts > 0 || user.lockedUntil) {
			await prisma.user.update({
				where: { id: user.id },
				data: {
					failedLoginAttempts: 0,
					lockedUntil: null,
					lastFailedAttempt: null
				}
			});
		}

		// Verificar si tiene 2FA habilitado
		if (user.totpEnabled) {
			// Guardar cookie temporal para flujo de 2FA
			cookies.set('pending_2fa', user.id, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: 60 * 5 // 5 minutos para completar 2FA
			});
			throw redirect(303, '/verify-2fa');
		}

		// Crear sesión directamente (sin 2FA)
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
} satisfies Actions;
