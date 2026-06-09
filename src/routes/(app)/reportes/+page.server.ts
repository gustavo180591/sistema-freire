import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';

export const load: PageServerLoad = async () => {
	const [activeStudents, activeSubjects, studentsWithDebt, payslipsCount] = await Promise.all([
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
		}),
		prisma.payslip.count()
	]);

	const reports = [
		{
			id: 'academic-summary',
			title: 'Reporte académico general',
			description: `${activeStudents} alumnos activos y ${activeSubjects} materias operativas.`,
			format: 'PDF / Excel',
			href: '/reportes/academico'
		},
		{
			id: 'financial-delinquency',
			title: 'Reporte de morosidad',
			description: `${studentsWithDebt.length} alumnos con bloqueo financiero o saldo pendiente.`,
			format: 'PDF / Excel',
			href: '/reportes/financiero'
		},
		{
			id: 'salary-receipts',
			title: 'Recibos docentes',
			description: `${payslipsCount} recibos históricos disponibles para consulta.`,
			format: 'PDF',
			href: '/recibos'
		},
		{
			id: 'official-records',
			title: 'Actas y libro matriz',
			description: 'Documentación oficial consolidada para inspección y archivo.',
			format: 'PDF / Excel',
			href: '/reportes/oficiales'
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
