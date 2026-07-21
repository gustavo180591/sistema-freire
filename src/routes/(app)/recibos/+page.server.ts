import type { PageServerLoad } from './$types';
import {
	getPayslipsForUser,
	getActiveTeachers
} from '$lib/server/services/payroll/payslip.service';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ locals, url }) => {
	const isTeacher = locals.user?.roles.includes('TEACHER');

	// Obtener filtros de la URL
	const teacherId = url.searchParams.get('teacherId');
	const year = url.searchParams.get('year');
	const month = url.searchParams.get('month');
	const status = url.searchParams.get('status');

	// Para admin, obtener docentes activos para el filtro
	const teachers = isTeacher ? [] : await getActiveTeachers();

	// Obtener años disponibles para filtros
	const currentYear = new Date().getFullYear();
	const years = [currentYear, currentYear - 1, currentYear - 2];

	// Obtener URL del portal de recibos desde la base de datos
	const payslipConfig = await prisma.financialConfig.findUnique({
		where: { key: 'payslip_portal_url' }
	});

	return {
		...(await getPayslipsForUser(locals.user)),
		teachers,
		years,
		filters: {
			teacherId,
			year,
			month,
			status
		},
		payslipPortalUrl: payslipConfig?.value as string | null
	};
};
