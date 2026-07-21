import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { PAYSLLIP_PORTAL_URL } from '$lib/config';

export const load: PageServerLoad = async () => {
	const [activeStudents, activeSubjects, studentsWithDebt] = await Promise.all([
		prisma.student.count({
			where: { status: 'ACTIVE' }
		}),
		prisma.subject.count({
			where: { active: true }
		}),
		prisma.studentCharge.groupBy({
			by: ['studentId'],
			where: {
				status: {
					in: ['PENDING', 'PARTIAL']
				}
			}
		})
	]);

	const hasPayslipPortal = Boolean(PAYSLLIP_PORTAL_URL);

	const reports = [
		{
			id: 'academic-summary',
			title: 'Reporte académico general',
			description: `${activeStudents} alumnos activos y ${activeSubjects} materias operativas.`,
			format: 'PDF / Excel',
			href: '/reportes/academico',
			status: 'available' as const,
			isExternal: false
		},
		{
			id: 'financial-delinquency',
			title: 'Reporte de morosidad',
			description: `${studentsWithDebt.length} alumnos con bloqueo financiero o saldo pendiente.`,
			format: 'PDF / Excel',
			href: '/reportes/financiero',
			status: 'available' as const,
			isExternal: false
		},
		{
			id: 'salary-receipts',
			title: 'Recibos de sueldo docentes',
			description: 'Acceso al portal externo de recibos de sueldo generado por el liquidador.',
			format: 'PDF',
			href: PAYSLLIP_PORTAL_URL || '#',
			status: hasPayslipPortal ? ('external' as const) : ('pending' as const),
			isExternal: hasPayslipPortal
		},
		{
			id: 'official-records',
			title: 'Actas y libro matriz',
			description: 'Documentación oficial consolidada para inspección y archivo.',
			format: 'PDF / Excel',
			href: '/reportes/oficiales',
			status: 'available' as const,
			isExternal: false
		}
	];

	return {
		reports,
		metrics: {
			availableReports: reports.length,
			currentPeriod: '2026',
			formats: 'PDF · XLSX'
		}
	};
};
