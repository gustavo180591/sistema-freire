import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['PRECEPTOR']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener carreras
	const careers = await prisma.career.findMany({
		where: { active: true },
		orderBy: { name: 'asc' }
	});

	// Estadísticas de asistencia (último mes)
	const attendanceStats = await prisma.attendanceEntry.groupBy({
		by: ['present'],
		_count: true,
		where: {
			attendance: {
				classDate: {
					gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
				}
			}
		}
	});

	const totalAttendance = attendanceStats.reduce((sum, stat) => sum + stat._count, 0);
	const presentAttendance = attendanceStats.find(s => s.present)?._count || 0;
	const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

	// Estadísticas de incidencias (último mes)
	const incidentCount = await prisma.studentFollowUp.count({
		where: {
			type: 'INCIDENT',
			createdAt: {
				gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
			}
		}
	});

	// Estadísticas de estudiantes por carrera
	const studentsByCareer = await prisma.student.groupBy({
		by: ['careerId'],
		_count: true,
		where: { status: 'ACTIVE' }
	});

	const careerStats = await Promise.all(
		studentsByCareer.map(async (stat) => {
			const career = await prisma.career.findUnique({
				where: { id: stat.careerId }
			});
			return {
				careerName: career?.name || 'Desconocido',
				count: stat._count
			};
		})
	);

	// Observaciones por tipo (último mes)
	const observationsByType = await prisma.studentFollowUp.groupBy({
		by: ['type'],
		_count: true,
		where: {
			createdAt: {
				gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
			}
		}
	});

	return {
		careers,
		stats: {
			attendanceRate,
			totalAttendance,
			presentAttendance,
			incidentCount,
			careerStats,
			observationsByType: observationsByType.map(o => ({
				type: o.type,
				count: o._count
			}))
		}
	};
};
