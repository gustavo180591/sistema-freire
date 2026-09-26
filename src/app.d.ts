declare global {
	namespace App {
		interface SessionUser {
			id: string;
			email: string;
			firstName: string;
			lastName: string;
			roles: string[];
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
