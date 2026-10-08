import type { RoleCode } from '@prisma/client';

declare global {
	namespace App {
		interface SessionUser {
			id: string;
			email: string;
			firstName: string;
			lastName: string;

			/**
			 * Roles efectivos para la petición actual.
			 *
			 * Cuando existe un activeRole contiene únicamente ese rol.
			 * Se mantiene esta propiedad para conservar compatibilidad con
			 * los controles de autorización existentes.
			 */
			roles: RoleCode[];

			/**
			 * Todos los roles realmente asignados al usuario.
			 */
			assignedRoles: RoleCode[];

			/**
			 * Rol con el que el usuario está trabajando actualmente.
			 */
			activeRole: RoleCode | null;
		}

		interface ImpersonationContext {
			active: true;
			startedAt: Date;
			originalUser: SessionUser;
		}

		interface Locals {
			/**
			 * Usuario efectivo utilizado por autorización,
			 * permisos, scopes y reglas de negocio.
			 */
			user?: SessionUser;

			/**
			 * Propietario real de la sesión.
			 * No cambia durante una impersonación.
			 */
			authenticatedUser?: SessionUser;

			sessionId?: string;

			impersonation?: ImpersonationContext;
		}
	}
}

export {};
