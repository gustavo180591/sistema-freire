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

	const subjects = subjectTeachers.map(st => st.subject);

	// Obtener estudiantes por materia
	const studentsBySubject = await Promise.all(
		subjects.map(async (subject) => {
			const careerIds = subject.careerSubjects.map(cs => cs.career.id);
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

			return {
				subjectId: subject.id,
				totalStudents: students.length
			};
		})
	);

	return {
		subjects: subjects.map(s => {
			const studentData = studentsBySubject.find(sbs => sbs.subjectId === s.id);
			return {
				id: s.id,
				code: s.code,
				name: s.name,
				yearLevel: s.yearLevel,
				careers: s.careerSubjects.map(cs => cs.career.name),
				totalStudents: studentData?.totalStudents || 0
			};
		})
	};
};
