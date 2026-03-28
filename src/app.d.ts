// src/app.d.ts
declare global {
	namespace App {
		interface Locals {
			user?: {
				id: string;
				email: string;
				role?: string;
			};
		}
	}
}

export { };