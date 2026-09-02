import { prisma } from '../db/prisma';
import { error } from '@sveltejs/kit';
import { teacherAcademicService } from './teacher-academic-service';
import { EvaluationType } from '@prisma/client';

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
		if (evaluation.type === EvaluationType.MESA_EXAMEN && evaluation.responsibleTeacherId) {
			if (evaluation.responsibleTeacherId !== teacherId) {
				throw error(403, 'Solo el docente responsable puede consultar los resultados de esta mesa');
			}
		} else if (evaluation.commissionId) {
			await teacherAcademicService.assertTeacherCanAccessCommission(
				teacherId,
				evaluation.commissionId
			);
		} else {
			/*
			 * Compatibilidad temporal para evaluaciones sin comisión y
			 * mesas históricas anteriores a responsibleTeacherId.
			 */
			await teacherAcademicService.assertTeacherCanAccessSubject(teacherId, evaluation.subjectId);
		}

		const grades = evaluation.grades.map((g) => ({
			id: g.id,
			studentId: g.studentId,
			studentName: `${g.student.firstName} ${g.student.lastName}`,
			studentDni: g.student.dni,
			value: g.value === null ? null : Number(g.value),
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
			value: g.value === null ? null : Number(g.value),
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
