import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return {};
	}

	// Dynamic import to ensure fresh Prisma client
	const { prisma } = await import('$lib/server/db/prisma');

	// Cargar configuración de días laborables
	const workingDaysConfig = await prisma.calendarConfig.findUnique({
		where: { key: 'working_days' }
	});

	// Cargar feriados del año actual
	const currentYear = new Date().getFullYear();
	const holidays = await prisma.holiday.findMany({
		where: { year: currentYear },
		orderBy: { date: 'asc' }
	});

	// Cargar fechas importantes del año actual
	const importantDates = await prisma.importantDate.findMany({
		where: { year: currentYear },
		orderBy: { date: 'asc' }
	});

	return {
		user,
		workingDays: workingDaysConfig?.value as number[] || [1, 2, 3, 4, 5], // Lunes-Viernes por defecto
		holidays,
		importantDates
	};
};

export const actions: Actions = {
	updateWorkingDays: async ({ request }) => {
		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();
		const days = formData.getAll('days').map((d) => parseInt(d.toString()));

		try {
			await prisma.calendarConfig.upsert({
				where: { key: 'working_days' },
				update: { value: days },
				create: { key: 'working_days', value: days, description: 'Días laborables de la semana (0=Domingo, 6=Sábado)' }
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al actualizar días laborables' });
		}
	},

	addHoliday: async ({ request }) => {
		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const date = formData.get('date')?.toString();
		const recurring = formData.get('recurring') === 'on';
		const countsAttendance = formData.get('countsAttendance') === 'on';

		if (!name || !date) {
			return fail(400, { error: 'Nombre y fecha son requeridos' });
		}

		const holidayDate = new Date(date);
		const year = holidayDate.getFullYear();

		try {
			await prisma.holiday.create({
				data: {
					name,
					date: holidayDate,
					year,
					recurring,
					countsAttendance
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al agregar feriado' });
		}
	},

	deleteHoliday: async ({ request }) => {
		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID es requerido' });
		}

		try {
			await prisma.holiday.delete({
				where: { id }
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al eliminar feriado' });
		}
	},

	addImportantDate: async ({ request }) => {
		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const date = formData.get('date')?.toString();
		const recurring = formData.get('recurring') === 'on';
		const countsAttendance = formData.get('countsAttendance') === 'on';

		if (!name || !date) {
			return fail(400, { error: 'Nombre y fecha son requeridos' });
		}

		const importantDate = new Date(date);
		const year = importantDate.getFullYear();

		try {
			await prisma.importantDate.create({
				data: {
					name,
					date: importantDate,
					year,
					recurring,
					countsAttendance
				}
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al agregar fecha importante' });
		}
	},

	deleteImportantDate: async ({ request }) => {
		const { prisma } = await import('$lib/server/db/prisma');
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'ID es requerido' });
		}

		try {
			await prisma.importantDate.delete({
				where: { id }
			});

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Error al eliminar fecha importante' });
		}
	}
};
