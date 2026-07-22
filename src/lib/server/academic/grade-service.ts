import { prisma } from '../db/prisma';
import { error } from '@sveltejs/kit';
import { teacherAcademicService } from './teacher-academic-service';
import { EvaluationType, GradeStatus, CourseStatus, AcademicStatus } from '@prisma/client';

export interface EvaluationInput {
	subjectId: string;
	commissionId: string | null;
	title: string;
	type: EvaluationType;
	description: string | null;
	evaluationDate: Date;
	maxScore: number;
	minPassingScore: number;
	observations: string | null;
}

export interface GradeInput {
	studentId: string;
	value: number | null;
	status: GradeStatus;
	observations: string | null;
}

export interface EvaluationWithGrades {
	id: string;
	subjectId: string;
	subjectName: string;
	subjectCode: string;
	commissionId: string | null;
	commissionName: string | null;
	title: string;
	description: string | null;
	evaluationDate: Date;
	maxScore: number;
	minPassingScore: number;
	isClosed: boolean;
	observations: string | null;
	grades: Array<{
		id: string;
		studentId: string;
		studentName: string;
		studentDni: string;
		value: number | null;
		status: string;
		observations: string | null;
	}>;
}

/**
 * Servicio de evaluaciones y notas
 */
export class GradeService {
	/**
	 * Crea una nueva evaluación
	 */
	async createEvaluation(
		teacherId: string,
		createdByUserId: string,
		data: EvaluationInput
	): Promise<string> {
		// Verificar acceso a la materia o comisión
		if (data.commissionId) {
			await teacherAcademicService.assertTeacherCanAccessCommission(teacherId, data.commissionId);
		} else {
			await teacherAcademicService.assertTeacherCanAccessSubject(teacherId, data.subjectId);
		}

		const evaluation = await prisma.evaluation.create({
			data: {
				subjectId: data.subjectId,
				commissionId: data.commissionId,
				title: data.title,
				type: data.type as EvaluationType,
				description: data.description,
				evaluationDate: data.evaluationDate,
				maxScore: data.maxScore,
				minPassingScore: data.minPassingScore,
				observations: data.observations,
				createdByUserId
			}
		});

		return evaluation.id;
	}

	/**
	 * Obtiene evaluaciones de un docente
	 */
	async getTeacherEvaluations(teacherId: string) {
		// Obtener materias y comisiones del docente
		const academicData = await teacherAcademicService.getTeacherSubjectsAndCommissions(teacherId);

		const subjectIds = academicData.subjects.map((s) => s.id);
		const commissionIds = academicData.commissions.map((c) => c.id);

		const evaluations = await prisma.evaluation.findMany({
			where: {
				OR: [{ subjectId: { in: subjectIds } }, { commissionId: { in: commissionIds } }]
			},
			include: {
				subject: true,
				commission: true
			},
			orderBy: {
				evaluationDate: 'desc'
			}
		});

		return evaluations.map((e) => ({
			id: e.id,
			subjectId: e.subjectId,
			subjectName: e.subject.name,
			subjectCode: e.subject.code,
			commissionId: e.commissionId,
			commissionName: e.commission?.code || null,
			title: e.title,
			description: e.description,
			type: e.type,
			evaluationDate: e.evaluationDate,
			maxScore: Number(e.maxScore),
			minPassingScore: Number(e.minPassingScore),
			isClosed: e.isClosed,
			observations: e.observations
		}));
	}

	/**
	 * Obtiene una evaluación con sus notas
	 */
	async getEvaluationWithGrades(
		evaluationId: string,
		teacherId: string
	): Promise<EvaluationWithGrades> {
		const evaluation = await prisma.evaluation.findUnique({
			where: { id: evaluationId },
			include: {
				subject: true,
				commission: true,
				grades: {
					include: {
						student: true
					}
				}
			}
		});

		if (!evaluation) {
			throw error(404, 'Evaluación no encontrada');
		}

		// Verificar acceso
		if (evaluation.commissionId) {
			await teacherAcademicService.assertTeacherCanAccessCommission(
				teacherId,
				evaluation.commissionId
			);
		} else {
			await teacherAcademicService.assertTeacherCanAccessSubject(teacherId, evaluation.subjectId);
		}

		const grades = evaluation.grades.map((g) => ({
			id: g.id,
			studentId: g.studentId,
			studentName: `${g.student.firstName} ${g.student.lastName}`,
			studentDni: g.student.dni,
			value: g.value ? Number(g.value) : null,
			status: g.status,
			observations: g.observations
		}));

		return {
			id: evaluation.id,
			subjectId: evaluation.subjectId,
			subjectName: evaluation.subject.name,
			subjectCode: evaluation.subject.code,
			commissionId: evaluation.commissionId,
			commissionName: evaluation.commission?.code || null,
			title: evaluation.title,
			description: evaluation.description,
			evaluationDate: evaluation.evaluationDate,
			maxScore: Number(evaluation.maxScore),
			minPassingScore: Number(evaluation.minPassingScore),
			isClosed: evaluation.isClosed,
			observations: evaluation.observations,
			grades
		};
	}

	/**
	 * Guarda notas para una evaluación
	 */
	async saveGrades(
		evaluationId: string,
		teacherId: string,
		updatedByUserId: string,
		grades: GradeInput[]
	): Promise<void> {
		const evaluation = await prisma.evaluation.findUnique({
			where: { id: evaluationId }
		});

		if (!evaluation) {
			throw error(404, 'Evaluación no encontrada');
		}

		// Verificar acceso
		if (evaluation.commissionId) {
			await teacherAcademicService.assertTeacherCanAccessCommission(
				teacherId,
				evaluation.commissionId
			);
		} else {
			await teacherAcademicService.assertTeacherCanAccessSubject(teacherId, evaluation.subjectId);
		}

		// Guardar cada nota
		for (const gradeData of grades) {
			// Validar que la nota esté dentro del rango
			if (gradeData.value !== null) {
				if (gradeData.value < 0 || gradeData.value > Number(evaluation.maxScore)) {
					throw error(400, `La nota debe estar entre 0 y ${evaluation.maxScore}`);
				}
			}

			// Buscar nota existente
			const existingGrade = await prisma.grade.findUnique({
				where: {
					evaluationId_studentId: {
						evaluationId,
						studentId: gradeData.studentId
					}
				}
			});

			if (existingGrade) {
				// Actualizar nota existente
				await prisma.grade.update({
					where: { id: existingGrade.id },
					data: {
						value: gradeData.value,
						status: gradeData.status,
						observations: gradeData.observations,
						updatedByUserId
					}
				});
			} else {
				// Crear nueva nota
				await prisma.grade.create({
					data: {
						studentId: gradeData.studentId,
						evaluationId,
						value: gradeData.value,
						status: gradeData.status,
						observations: gradeData.observations,
						createdByUserId: updatedByUserId
					}
				});
			}

			// Recalcular estado académico del alumno
			await this.recalculateStudentSubjectStatus(gradeData.studentId, evaluation.subjectId);
		}
	}

	/**
	 * Recalcula el estado académico de un alumno en una materia
	 */
	async recalculateStudentSubjectStatus(studentId: string, subjectId: string): Promise<void> {
		// Obtener la materia para conocer los thresholds
		const subject = await prisma.subject.findUnique({
			where: { id: subjectId }
		});

		if (!subject) {
			throw error(404, 'Materia no encontrada');
		}

		const approvalThreshold = Number(subject.approvalThreshold);
		const promotionThreshold = Number(subject.promotionThreshold);

		// Obtener todas las notas del alumno en esta materia
		const grades = await prisma.grade.findMany({
			where: {
				studentId,
				evaluation: {
					subjectId
				}
			},
			include: {
				evaluation: true
			}
		});

		// Calcular promedio de cursada (solo notas PRESENT)
		const presentGrades = grades.filter((g) => g.status === 'PRESENT' && g.value !== null);
		let courseAverage = null;
		if (presentGrades.length > 0) {
			const sum = presentGrades.reduce((acc, g) => acc + Number(g.value), 0);
			courseAverage = sum / presentGrades.length;
		}

		// Determinar estado de cursada
		let courseStatus: CourseStatus = 'IN_PROGRESS';
		let approved = false;
		let promoted = false;

		if (courseAverage !== null) {
			if (courseAverage >= promotionThreshold) {
				courseStatus = 'PROMOTED';
				approved = true;
				promoted = true;
			} else if (courseAverage >= approvalThreshold) {
				courseStatus = 'PASSED_COURSE';
				approved = true;
			} else {
				courseStatus = 'FAILED_COURSE';
			}
		}

		// Actualizar StudentSubjectStatus
		await prisma.studentSubjectStatus.upsert({
			where: {
				studentId_subjectId: {
					studentId,
					subjectId
				}
			},
			create: {
				studentId,
				subjectId,
				courseAverage: courseAverage || 0,
				courseStatus,
				approved,
				promoted,
				academicStatus: approved ? 'APROBADO' : 'EN_COURSE'
			},
			update: {
				courseAverage: courseAverage || 0,
				courseStatus,
				approved,
				promoted,
				academicStatus: approved ? 'APROBADO' : 'EN_COURSE'
			}
		});
	}

	/**
	 * Obtiene las notas de un alumno
	 */
	async getStudentGrades(studentId: string) {
		const grades = await prisma.grade.findMany({
			where: { studentId },
			include: {
				evaluation: {
					include: {
						subject: true,
						commission: true
					}
				}
			},
			orderBy: {
				evaluation: {
					evaluationDate: 'desc'
				}
			}
		});

		return grades.map((g) => ({
			id: g.id,
			evaluationId: g.evaluationId,
			evaluationTitle: g.evaluation.title,
			evaluationDate: g.evaluation.evaluationDate,
			evaluationType: g.evaluation.type,
			subjectName: g.evaluation.subject.name,
			subjectCode: g.evaluation.subject.code,
			commissionCode: g.evaluation.commission?.code || null,
			value: g.value ? Number(g.value) : null,
			maxScore: Number(g.evaluation.maxScore),
			minPassingScore: Number(g.evaluation.minPassingScore),
			status: g.status,
			observations: g.observations
		}));
	}

	/**
	 * Obtiene el resumen académico de un alumno por materia
	 */
	async getStudentAcademicSummary(studentId: string) {
		const statuses = await prisma.studentSubjectStatus.findMany({
			where: { studentId },
			include: {
				subject: true
			}
		});

		const grades = await this.getStudentGrades(studentId);

		return {
			subjectStatuses: statuses.map((s) => ({
				subjectId: s.subjectId,
				subjectName: s.subject.name,
				subjectCode: s.subject.code,
				attendancePercent: Number(s.attendancePercent),
				courseAverage: s.courseAverage ? Number(s.courseAverage) : null,
				courseStatus: s.courseStatus,
				academicStatus: s.academicStatus,
				regularityStatus: s.regularityStatus,
				approved: s.approved,
				promoted: s.promoted,
				finalGrade: s.finalGrade ? Number(s.finalGrade) : null,
				promotionDate: s.promotionDate,
				finalExamScore: s.finalExamScore ? Number(s.finalExamScore) : null,
				finalExamStatus: s.finalExamStatus
			})),
			grades: grades.map((g) => ({
				...g,
				evaluationType: g.evaluationType as string
			}))
		};
	}
}

export const gradeService = new GradeService();
