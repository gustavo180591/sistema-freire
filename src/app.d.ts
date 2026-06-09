declare global {
	namespace App {
		interface Locals {
			user?: {
				id: string;
				email: string;
				firstName: string;
				lastName: string;
				roles: string[];
			};
		}
	}
}

export {};
