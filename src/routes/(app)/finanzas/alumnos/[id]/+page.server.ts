import type { PageServerLoad } from './$types';
import { financialService } from '$lib/server/financial/financial-service';
import { hasPermission } from '$lib/server/auth/permissions-granular';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	const studentId = params.id;

	// Get user roles
	const userRoles = await prisma.userRole.findMany({
		where: { userId: locals.user.id },
		include: { role: true }
	});
	const roleCodes = userRoles.map((ur: any) => ur.role.code);

	// Check if user is the student or has permission to view financial reports
	const user = await prisma.user.findUnique({
		where: { id: locals.user.id },
		include: { student: true }
	});

	const isStudent = user?.student?.id === studentId;
	const canViewReports = await hasPermission(roleCodes[0] || '', 'FINANCIAL_REPORT', 'read');

	if (!isStudent && !canViewReports) {
		throw new Error('No tiene permisos para ver el estado financiero de este alumno');
	}

	try {
		const report = await financialService.getStudentFinancialReport(studentId);
		return { report };
	} catch (error: any) {
		throw new Error(error.message || 'Error al obtener el reporte financiero');
	}
};
