import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { hasPermission } from '$lib/server/auth/permissions-granular';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	// Get user roles
	const userRoles = await prisma.userRole.findMany({
		where: { userId: locals.user.id },
		include: { role: true }
	});
	const roleCodes = userRoles.map((ur: any) => ur.role.code);

	// Check if user has permission to view financial reports
	const canViewReports = await hasPermission(roleCodes[0] || '', 'FINANCIAL_REPORT', 'read');

	if (!canViewReports) {
		throw new Error('No tiene permisos para ver reportes financieros');
	}

	// Get students with debt
	const studentsWithDebt = await prisma.student.findMany({
		where: {
			studentCharges: {
				some: {
					status: 'PENDING'
				}
			}
		},
		include: {
			career: true,
			location: true,
			studentCharges: {
				where: {
					status: 'PENDING'
				}
			}
		},
		orderBy: {
			lastName: 'asc'
		}
	});

	// Calculate debt per student
	const studentsWithDebtTotal = studentsWithDebt.map((student) => {
		const totalDebt = student.studentCharges.reduce(
			(sum, charge) => sum + Number(charge.amount),
			0
		);
		return {
			id: student.id,
			fullName: `${student.firstName} ${student.lastName}`,
			dni: student.dni,
			career: student.career?.name || 'Sin carrera',
			location: student.location?.name || null,
			totalDebt,
			pendingCharges: student.studentCharges.length
		};
	});

	return {
		students: studentsWithDebtTotal
	};
};
