import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		console.log('Starting subject creation process');
		try {
			const formData = await request.formData();
			console.log('Form data received:', Object.fromEntries(formData.entries()));
			const code = formData.get('code') as string;
			const name = formData.get('name') as string;
			const yearLevel = formData.get('yearLevel') as string;
			const active = formData.get('active') === 'true';

			console.log('Extracted values:', { code, name, yearLevel, active });

			if (!code || !name || !yearLevel) {
				console.log('Validation failed: missing required fields');
				return {
					success: false,
					errors: {
						code: !code ? 'El código es requerido' : '',
						name: !name ? 'El nombre es requerido' : '',
						yearLevel: !yearLevel ? 'El año es requerido' : ''
					}
				};
			}

			const yearLevelNum = parseInt(yearLevel, 10);
			if (isNaN(yearLevelNum) || yearLevelNum < 1 || yearLevelNum > 10) {
				console.log('Validation failed: invalid year level');
				return {
					success: false,
					errors: {
						yearLevel: 'El año debe ser un número entre 1 y 10'
					}
				};
			}

			console.log('Checking for existing subject with code:', code);
			// Check if code already exists
			const existingSubject = await prisma.subject.findUnique({
				where: {
					code
				}
			});

			if (existingSubject) {
				console.log('Subject with code already exists');
				return {
					success: false,
					errors: {
						code: `Ya existe una materia con el código "${code}"`
					}
				};
			}

			console.log('Creating subject with data:', { code, name, yearLevel: yearLevelNum, active });
			await prisma.subject.create({
				data: {
					code,
					name,
					yearLevel: yearLevelNum,
					active
				}
			});

			console.log('Subject created successfully, redirecting');
			throw redirect(303, '/materias');
		} catch (e) {
			console.error('Error in subject creation:', e);
			// Check if it's a redirect (not an error)
			if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
				console.log('This is a redirect, throwing it');
				throw e;
			}
			if (e instanceof Error) {
				console.error('Error details:', e.message, e.stack);
				return {
					success: false,
					errors: {
						general: `Error: ${e.message}`
					}
				};
			}
			console.error('Unknown error type:', e);
			return {
				success: false,
				errors: {
					general: 'Error al crear la materia. Intente nuevamente.'
				}
			};
		}
	}
};
