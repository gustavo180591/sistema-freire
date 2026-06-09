import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id }
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las materias asignadas al docente
	const subjectTeachers = await prisma.subjectTeacher.findMany({
		where: { teacherId: teacher.id },
		include: {
			subject: {
				include: {
					careerSubjects: {
						include: {
							career: true
						}
					}
				}
			}
		}
	});

	const subjects = subjectTeachers.map((st) => st.subject);
	const subjectIds = subjects.map((s) => s.id);

	// Obtener estudiantes de las carreras de las materias del docente
	const careerIds = subjects.flatMap((s) => s.careerSubjects.map((cs) => cs.career.id));
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			careerId: {
				in: careerIds
			}
		},
		include: {
			career: true
		}
	});

	const studentIds = students.map((s) => s.id);

	// Calificaciones por materia (nuevo modelo Grade → Evaluation → Subject)
	const grades = await prisma.grade.findMany({
		where: {
			studentId: {
				in: studentIds
			},
			evaluation: {
				subjectId: {
					in: subjectIds
				}
			}
		},
		include: {
			evaluation: {
				include: {
					subject: true
				}
			}
		}
	});

	// Agrupar calificaciones por materia
	const gradesBySubjectMap = new Map();
	for (const grade of grades) {
		const subjectId = grade.evaluation.subjectId;
		if (!gradesBySubjectMap.has(subjectId)) {
			gradesBySubjectMap.set(subjectId, {
				subjectId,
				_count: 0,
				_avg: { value: null }
			});
		}
		const data = gradesBySubjectMap.get(subjectId);
		data._count++;
		if (grade.value !== null) {
			const currentAvg = data._avg.value ? Number(data._avg.value) : 0;
			const count = data._count;
			data._avg.value = (currentAvg * (count - 1) + Number(grade.value)) / count;
		}
	}
	const gradesBySubject = Array.from(gradesBySubjectMap.values());

	// Asistencia por materia
	const attendanceRecords = await prisma.attendanceRecord.findMany({
		where: {
			subjectId: {
				in: subjectIds
			}
		},
		include: {
			entries: true
		}
	});

	const attendanceBySubject = subjectIds.map((subjectId) => {
		const records = attendanceRecords.filter((r) => r.subjectId === subjectId);
		const totalEntries = records.reduce((sum, r) => sum + r.entries.length, 0);
		const presentEntries = records.reduce(
			(sum, r) => sum + r.entries.filter((e: any) => e.present).length,
			0
		);
		const attendanceRate = totalEntries > 0 ? (presentEntries / totalEntries) * 100 : 0;

		return {
			subjectId,
			totalClasses: records.length,
			totalEntries,
			presentEntries,
			attendanceRate: Math.round(attendanceRate * 10) / 10
		};
	});

	// Combinar datos por materia
	const subjectReports = subjects.map((subject) => {
		const gradesData = gradesBySubject.find((g) => g.subjectId === subject.id);
		const attendanceData = attendanceBySubject.find((a) => a.subjectId === subject.id);
		const subjectStudents = students.filter((s) => careerIds.includes(s.careerId));

		const avgValue = gradesData?._avg.value;
		const averageGrade = avgValue !== null ? Math.round(Number(avgValue) * 100) / 100 : 0;

		return {
			id: subject.id,
			code: subject.code,
			subject: subject.name,
			yearLevel: subject.yearLevel,
			careers: subject.careerSubjects.map((cs) => cs.career.name),
			totalStudents: subjectStudents.length,
			totalGrades: gradesData?._count || 0,
			averageGrade,
			totalClasses: attendanceData?.totalClasses || 0,
			attendanceRate: attendanceData?.attendanceRate || 0
		};
	});

	return {
		subjectReports
	};
};
