import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, error } from '@sveltejs/kit';
import { CorrelativeType } from '@prisma/client';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user || !user.roles.includes('ALUMNO')) {
		throw redirect(303, '/login');
	}

	// Obtener el estudiante asociado al usuario (por userId o DNI)
	const student = await getCurrentStudentForUser(user.id);

	// Cargar datos adicionales del estudiante
	const studentWithRelations = await prisma.student.findUnique({
		where: { id: student.id },
		include: {
			career: true,
			grades: {
				include: {
					evaluation: {
						include: {
							subject: true
						}
					}
				},
				orderBy: {
					createdAt: 'desc'
				}
			},
			subjectStatuses: {
				include: {
					subject: true
				}
			}
		}
	});

	if (!studentWithRelations) {
		throw error(404, 'No se encontraron datos del estudiante');
	}

	// Agrupar calificaciones por materia (nuevo modelo Grade → Evaluation → Subject)
	const gradesBySubject = new Map();

	for (const grade of studentWithRelations.grades) {
		const subjectName = grade.evaluation?.subject?.name || 'Sin materia';
		const key = subjectName;

		if (!gradesBySubject.has(key)) {
			gradesBySubject.set(key, {
				subject: subjectName,
				grades: [],
				average: 0
			});
		}

		const data = gradesBySubject.get(key);
		data.grades.push({
			value: grade.value !== null ? Number(grade.value) : null,
			status: grade.status || 'UNKNOWN',
			type: grade.evaluation?.type || 'UNKNOWN',
			title: grade.evaluation?.title || 'Sin título',
			date: grade.evaluation?.evaluationDate || grade.createdAt,
			maxScore: grade.evaluation?.maxScore ? Number(grade.evaluation.maxScore) : 10,
			minPassingScore: grade.evaluation?.minPassingScore
				? Number(grade.evaluation.minPassingScore)
				: 6
		});
	}

	// Calcular promedios (solo notas PRESENT con valor)
	const subjects = Array.from(gradesBySubject.values()).map((s) => {
		const validGrades = s.grades.filter((g: any) => g.status === 'PRESENT' && g.value !== null);
		const sum = validGrades.reduce((acc: number, g: { value: number }) => acc + g.value, 0);
		s.average = validGrades.length > 0 ? Math.round((sum / validGrades.length) * 100) / 100 : 0;
		return s;
	});

	// Incluir materias sin calificaciones pero con estado (nuevos campos)
	const subjectStatuses = studentWithRelations.subjectStatuses.map((status) => ({
		subject: status.subject.name,
		status: status.regularityStatus,
		approved: status.approved,
		promoted: status.promoted,
		finalGrade: status.finalGrade ? Number(status.finalGrade) : null,
		promotionDate: status.promotionDate,
		attendancePercent: status.attendancePercent ? Number(status.attendancePercent) : null,
		// Nuevos campos del modelo
		courseAverage: status.courseAverage ? Number(status.courseAverage) : null,
		courseStatus: status.courseStatus || 'UNKNOWN',
		finalExamStatus: status.finalExamStatus || 'UNKNOWN',
		academicStatus: status.academicStatus || 'UNKNOWN'
	}));

	// Calcular promedio general (solo notas PRESENT con valor)
	const validGrades = studentWithRelations.grades.filter(
		(g) => g.status === 'PRESENT' && g.value !== null
	);
	const allGrades = validGrades.map((g) => Number(g.value));
	const overallAverage =
		allGrades.length > 0
			? Math.round((allGrades.reduce((a, b) => a + b, 0) / allGrades.length) * 100) / 100
			: 0;

	// Obtener materias que puede cursar basado en correlatividades
	const approvedSubjectIds = studentWithRelations.subjectStatuses
		.filter((s) => s.approved)
		.map((s) => s.subjectId);

	const regularSubjectIds = studentWithRelations.subjectStatuses
		.filter((s) => s.regularityStatus === 'REGULAR')
		.map((s) => s.subjectId);

	// Obtener todas las materias de la carrera para el año actual del alumno
	const careerSubjects = await prisma.careerSubject.findMany({
		where: {
			careerId: studentWithRelations.careerId,
			yearLevel: studentWithRelations.currentYear
		},
		include: {
			subject: {
				include: {
					correlatives: {
						where: {
							careerId: studentWithRelations.careerId,
							isActive: true
						}
					}
				}
			}
		},
		orderBy: {
			yearLevel: 'asc'
		}
	});

	// Determinar qué materias puede cursar
	const availableSubjects = careerSubjects
		.filter((cs) => {
			// Excluir materias ya aprobadas
			if (approvedSubjectIds.includes(cs.subjectId)) return false;

			// Verificar correlatividades
			const canEnroll = cs.subject.correlatives.every((correlative: any) => {
				const requiredSubjectId = correlative.requiredSubjectId;

				switch (correlative.correlativeType) {
					case CorrelativeType.REGULAR:
						return regularSubjectIds.includes(requiredSubjectId);
					case CorrelativeType.APROBADO:
					case CorrelativeType.APROBADO_APROBAR:
						return approvedSubjectIds.includes(requiredSubjectId);
					default:
						return true;
				}
			});

			return canEnroll;
		})
		.map((cs) => ({
			id: cs.subject.id,
			name: cs.subject.name,
			code: cs.subject.code,
			yearLevel: cs.yearLevel,
			isMandatory: cs.isMandatory,
			accreditationMode: cs.subject.accreditationMode,
			correlatives: cs.subject.correlatives.map((c: any) => ({
				type: c.correlativeType,
				requiredSubjectId: c.requiredSubjectId
			}))
		}));

	return {
		student: {
			id: studentWithRelations.id,
			firstName: studentWithRelations.firstName,
			lastName: studentWithRelations.lastName,
			currentYear: studentWithRelations.currentYear
		},
		subjects,
		subjectStatuses,
		overallAverage,
		totalGrades: allGrades.length,
		approvedCount: studentWithRelations.subjectStatuses.filter((s) => s.approved).length,
		availableSubjects
	};
};
