import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { financialService } from '$lib/server/financial/financial-service';
import { Decimal } from '@prisma/client/runtime/library';
import { error, fail } from '@sveltejs/kit';
import { getUserAllowedLocationIds } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Usuario no autenticado');
	}

	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Cargar datos necesarios para el formulario
	const [students, concepts, academicTerms, existingCharges] = await Promise.all([
		prisma.student.findMany({
			where: {
				status: 'ACTIVE',
				career: {
					locations: {
						some: {
							locationId: { in: allowedLocationIds }
						}
					}
				}
			},
			include: {
				user: {
					select: {
						email: true
					}
				},
				career: {
					select: {
						name: true
					}
				}
			},
			orderBy: {
				lastName: 'asc'
			}
		}),
		prisma.chargeConcept.findMany({
			where: {
				active: true
			},
			orderBy: {
				name: 'asc'
			}
		}),
		prisma.academicTerm.findMany({
			where: {
				active: true
			},
			orderBy: {
				year: 'desc',
				name: 'asc'
			}
		}),
		prisma.studentCharge.findMany({
			where: {
				student: {
					career: {
						locations: {
							some: {
								locationId: { in: allowedLocationIds }
							}
						}
					}
				}
			},
			include: {
				student: {
					select: {
						firstName: true,
						lastName: true
					}
				},
				concept: {
					select: {
						name: true
					}
				},
				academicTerm: {
					select: {
						name: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: 50
		})
	]);

	return {
		students,
		concepts,
		academicTerms,
		existingCharges
	};
};

export const actions: Actions = {
	// Crear cuota individual
	createCharge: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		const data = await request.formData();
		const studentId = data.get('studentId') as string;
		const conceptId = data.get('conceptId') as string;
		const periodLabel = data.get('periodLabel') as string;
		const amount = data.get('amount') as string;
		const dueDate = data.get('dueDate') as string | null;
		const academicTermId = data.get('academicTermId') as string;
		const notes = data.get('notes') as string | null;

		if (!studentId || !conceptId || !periodLabel || !amount || !academicTermId) {
			return fail(400, { error: 'Faltan campos requeridos' });
		}

		try {
			const result = await financialService.createCharge({
				studentId,
				conceptId,
				periodLabel,
				amount: new Decimal(amount),
				dueDate: dueDate ? new Date(dueDate) : undefined,
				academicTermId,
				notes: notes || undefined,
				userId: locals.user.id
			});

			return { success: true, chargeId: result.charge.id };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Error al crear cuota' });
		}
	},

	// Crear cuotas masivas
	createBulkCharges: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Usuario no autenticado' });
		}

		const data = await request.formData();
		const studentIds = data.getAll('studentIds') as string[];
		const conceptId = data.get('conceptId') as string;
		const periodLabel = data.get('periodLabel') as string;
		const amount = data.get('amount') as string;
		const dueDate = data.get('dueDate') as string | null;
		const academicTermId = data.get('academicTermId') as string;
		const notes = data.get('notes') as string | null;

		if (!studentIds.length || !conceptId || !periodLabel || !amount || !academicTermId) {
			return fail(400, { error: 'Faltan campos requeridos' });
		}

		try {
			const inputs = studentIds.map((studentId) => ({
				studentId,
				conceptId,
				periodLabel,
				amount: new Decimal(amount),
				dueDate: dueDate ? new Date(dueDate) : undefined,
				academicTermId,
				notes: notes || undefined,
				userId: locals.user!.id
			}));

			const results = await financialService.createBulkCharges(inputs);

			return { success: true, count: results.length };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Error al crear cuotas masivas'
			});
		}
	}
};
