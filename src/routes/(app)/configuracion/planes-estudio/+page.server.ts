import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { requireRole } from '$lib/server/auth/authorization';
import { prisma } from '$lib/server/db/prisma';

function getPlanText(formData: FormData) {
	return String(formData.get('plan') ?? '').trim();
}

async function requireAdmin(locals: App.Locals) {
	const user = locals.user;

	if (!user || user.activeRole !== 'SUPERADMIN') {
		throw error(403, 'No tenés permiso para administrar planes de estudio');
	}

	requireRole(user, ['SUPERADMIN']);

	return user;
}

export const load: PageServerLoad = async ({ locals }) => {
	await requireAdmin(locals);

	const [plans, careers] = await Promise.all([
		prisma.studyPlan.findMany({
			select: {
				id: true,
				code: true,
				name: true,
				version: true,
				active: true,
				isDefault: true,
				career: {
					select: {
						id: true,
						name: true
					}
				}
			},
			orderBy: [{ career: { name: 'asc' } }, { name: 'asc' }]
		}),
		prisma.career.findMany({
			where: {
				active: true
			},
			select: {
				id: true,
				name: true
			},
			orderBy: {
				name: 'asc'
			}
		})
	]);

	return {
		plans,
		careers
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		await requireAdmin(locals);

		const formData = await request.formData();

		const plan = getPlanText(formData);
		const careerId = String(formData.get('careerId') ?? '').trim();

		if (!plan || !careerId) {
			return fail(400, {
				error: 'Completá el plan y la carrera'
			});
		}

		if (plan.length > 50) {
			return fail(400, {
				error: 'El plan no puede superar los 50 caracteres'
			});
		}

		const career = await prisma.career.findUnique({
			where: {
				id: careerId
			},
			select: {
				id: true,
				durationYears: true
			}
		});

		if (!career) {
			return fail(404, {
				error: 'Carrera no encontrada'
			});
		}

		const duplicate = await prisma.studyPlan.findFirst({
			where: {
				careerId,
				name: {
					equals: plan,
					mode: 'insensitive'
				}
			},
			select: {
				id: true
			}
		});

		if (duplicate) {
			return fail(400, {
				error: 'Ese plan ya existe para la carrera seleccionada'
			});
		}

		await prisma.studyPlan.create({
			data: {
				careerId,
				name: plan,
				version: plan,
				durationYears: career.durationYears,
				isDefault: false,
				active: true
			}
		});

		return {
			success: true,
			message: `Plan ${plan} creado correctamente`
		};
	},

	update: async ({ request, locals }) => {
		await requireAdmin(locals);

		const formData = await request.formData();

		const id = String(formData.get('id') ?? '').trim();
		const plan = getPlanText(formData);

		if (!id || !plan) {
			return fail(400, {
				error: 'Datos inválidos'
			});
		}

		if (plan.length > 50) {
			return fail(400, {
				error: 'El plan no puede superar los 50 caracteres'
			});
		}

		const current = await prisma.studyPlan.findUnique({
			where: {
				id
			},
			select: {
				id: true,
				careerId: true
			}
		});

		if (!current) {
			return fail(404, {
				error: 'Plan no encontrado'
			});
		}

		const duplicate = await prisma.studyPlan.findFirst({
			where: {
				id: {
					not: id
				},
				careerId: current.careerId,
				name: {
					equals: plan,
					mode: 'insensitive'
				}
			},
			select: {
				id: true
			}
		});

		if (duplicate) {
			return fail(400, {
				error: 'Ya existe otro plan con ese nombre para la carrera'
			});
		}

		await prisma.studyPlan.update({
			where: {
				id
			},
			data: {
				name: plan,
				version: plan
			}
		});

		return {
			success: true,
			message: `Plan ${plan} actualizado`
		};
	},

	toggle: async ({ request, locals }) => {
		await requireAdmin(locals);

		const formData = await request.formData();
		const id = String(formData.get('id') ?? '').trim();

		const current = await prisma.studyPlan.findUnique({
			where: {
				id
			},
			select: {
				id: true,
				name: true,
				active: true
			}
		});

		if (!current) {
			return fail(404, {
				error: 'Plan no encontrado'
			});
		}

		await prisma.studyPlan.update({
			where: {
				id
			},
			data: {
				active: !current.active
			}
		});

		return {
			success: true,
			message: `${current.name} ${current.active ? 'desactivado' : 'activado'}`
		};
	},

	delete: async ({ request, locals }) => {
		await requireAdmin(locals);

		const formData = await request.formData();
		const id = String(formData.get('id') ?? '').trim();

		if (!id) {
			return fail(400, {
				error: 'Plan inválido'
			});
		}

		const [students, subjects] = await Promise.all([
			prisma.student.count({
				where: {
					studyPlanId: id
				}
			}),
			prisma.planSubject.count({
				where: {
					planId: id
				}
			})
		]);

		if (students > 0 || subjects > 0) {
			return fail(400, {
				error:
					'Este plan ya está relacionado con alumnos o materias. Desactivalo en lugar de eliminarlo.'
			});
		}

		await prisma.studyPlan.delete({
			where: {
				id
			}
		});

		return {
			success: true,
			message: 'Plan eliminado correctamente'
		};
	}
};
