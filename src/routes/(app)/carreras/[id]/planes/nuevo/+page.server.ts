import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export const load: PageServerLoad = async ({ params }) => {
	const career = await prisma.career.findUnique({
		where: {
			id: params.id
		},
		select: {
			id: true,
			code: true,
			name: true
		}
	});

	if (!career) {
		throw error(404, 'Carrera no encontrada');
	}

	return {
		career
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const version = formData.get('version') as string;
		const durationYears = formData.get('durationYears') as string;
		const active = formData.get('active') === 'true';

		if (!name || !version || !durationYears) {
			return {
				success: false,
				errors: {
					name: !name ? 'El nombre es requerido' : '',
					version: !version ? 'La versión es requerida' : '',
					durationYears: !durationYears ? 'La duración es requerida' : ''
				}
			};
		}

		const durationYearsNum = parseInt(durationYears, 10);
		if (isNaN(durationYearsNum) || durationYearsNum < 1 || durationYearsNum > 10) {
			return {
				success: false,
				errors: {
					durationYears: 'La duración debe ser un número entre 1 y 10 años'
				}
			};
		}

		// Check if version already exists for this career
		const existingPlan = await prisma.studyPlan.findUnique({
			where: {
				careerId_version: {
					careerId: params.id,
					version
				}
			}
		});

		if (existingPlan) {
			return {
				success: false,
				errors: {
					version: `Ya existe un plan con la versión "${version}" para esta carrera.`
				}
			};
		}

		try {
			const studyPlan = await prisma.studyPlan.create({
				data: {
					careerId: params.id,
					name,
					version,
					durationYears: durationYearsNum,
					active
				}
			});

			throw redirect(303, `/carreras/${params.id}`);
		} catch (e) {
			console.error('Error creating study plan - Full error:', e);
			
			// Handle Prisma specific errors
			if (e instanceof PrismaClientKnownRequestError) {
				console.error('Prisma error code:', e.code);
				console.error('Prisma meta:', e.meta);
				
				if (e.code === 'P2002') {
					return {
						success: false,
						errors: {
							version: 'Ya existe un plan con esta versión para la carrera.'
						}
					};
				}
				if (e.code === 'P2003') {
					return {
						success: false,
						errors: {
							general: 'Error de referencia: la carrera no existe.'
						}
					};
				}
				// Default Prisma error handler
				return {
					success: false,
					errors: {
						general: `Error de base de datos (${e.code}): ${e.message}`
					}
				};
			}
			
			if (e instanceof Error) {
				if (e.message.includes('redirect')) {
					throw e;
				}
				// Log detailed error info
				console.error('Error name:', e.name);
				console.error('Error message:', e.message);
				console.error('Error stack:', e.stack);
				
				return {
					success: false,
					errors: {
						general: `Error: ${e.message}`
					}
				};
			}
			return {
				success: false,
				errors: {
					general: 'Error al crear el plan de estudio. Intente nuevamente.'
				}
			};
		}
	}
};
