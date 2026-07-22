import { prisma } from '../db/prisma';
import { error } from '@sveltejs/kit';

export interface TeacherSubject {
	id: string;
	code: string;
	name: string;
	yearLevel: number;
	accreditationMode: string;
	approvalThreshold: number;
	promotionThreshold: number;
	assignmentType: string;
}

export interface TeacherCommission {
	id: string;
	code: string;
	subjectId: string;
	subjectName: string;
	subjectCode: string;
	academicTermId: string | null;
	academicTermName: string | null;
	careerId: string | null;
	careerName: string | null;
	locationId: string | null;
	locationName: string | null;
	maxCapacity: number;
	currentEnrolled: number;
	schedule: string | null;
	active: boolean;
}

export interface TeacherAcademicData {
	teacher: {
		id: string;
		firstName: string;
		lastName: string;
		dni: string;
		status: string;
	};
	subjects: TeacherSubject[];
	commissions: TeacherCommission[];
}

/**
 * Servicio académico para docentes
 */
export class TeacherAcademicService {
	/**
	 * Obtiene el docente asociado a un usuario
	 */
	async getCurrentTeacherForUser(userId: string) {
		const teacher = await prisma.teacher.findUnique({
			where: { userId },
			include: {
				user: {
					select: {
						email: true
					}
				}
			}
		});

		if (!teacher) {
			return null;
		}

		return teacher;
	}

	/**
	 * Obtiene las materias y comisiones asignadas a un docente
	 */
	async getTeacherSubjectsAndCommissions(teacherId: string): Promise<TeacherAcademicData> {
		const teacher = await prisma.teacher.findUnique({
			where: { id: teacherId },
			include: {
				user: {
					select: {
						email: true
					}
				}
			}
		});

		if (!teacher) {
			throw error(404, 'Docente no encontrado');
		}

		// Obtener materias asignadas vía SubjectTeacher
		const subjectTeachers = await prisma.subjectTeacher.findMany({
			where: { teacherId },
			include: {
				subject: true
			}
		});

		const subjects: TeacherSubject[] = subjectTeachers.map((st) => ({
			id: st.subject.id,
			code: st.subject.code,
			name: st.subject.name,
			yearLevel: st.subject.yearLevel,
			accreditationMode: st.subject.accreditationMode,
			approvalThreshold: Number(st.subject.approvalThreshold),
			promotionThreshold: Number(st.subject.promotionThreshold),
			assignmentType: st.assignmentType
		}));

		// Obtener comisiones asignadas
		const commissions = await prisma.subjectCommission.findMany({
			where: { teacherId },
			include: {
				subject: true,
				academicTerm: true,
				career: true,
				location: true
			},
			orderBy: [{ active: 'desc' }, { code: 'asc' }]
		});

		const teacherCommissions: TeacherCommission[] = commissions.map((c) => ({
			id: c.id,
			code: c.code,
			subjectId: c.subjectId,
			subjectName: c.subject.name,
			subjectCode: c.subject.code,
			academicTermId: c.academicTermId,
			academicTermName: c.academicTerm?.name || null,
			careerId: c.careerId,
			careerName: c.career?.name || null,
			locationId: c.locationId,
			locationName: c.location?.name || null,
			maxCapacity: c.maxCapacity,
			currentEnrolled: c.currentEnrolled,
			schedule: c.schedule,
			active: c.active
		}));

		return {
			teacher: {
				id: teacher.id,
				firstName: teacher.firstName,
				lastName: teacher.lastName,
				dni: teacher.dni,
				status: teacher.status
			},
			subjects,
			commissions: teacherCommissions
		};
	}

	/**
	 * Verifica que el docente tenga acceso a una materia
	 */
	async assertTeacherCanAccessSubject(teacherId: string, subjectId: string): Promise<void> {
		const subjectTeacher = await prisma.subjectTeacher.findUnique({
			where: {
				subjectId_teacherId: {
					subjectId,
					teacherId
				}
			}
		});

		if (!subjectTeacher) {
			throw error(403, 'No tienes acceso a esta materia');
		}
	}

	/**
	 * Verifica que el docente tenga acceso a una comisión
	 */
	async assertTeacherCanAccessCommission(teacherId: string, commissionId: string): Promise<void> {
		const commission = await prisma.subjectCommission.findUnique({
			where: { id: commissionId }
		});

		if (!commission) {
			throw error(404, 'Comisión no encontrada');
		}

		if (commission.teacherId !== teacherId) {
			throw error(403, 'No tienes acceso a esta comisión');
		}
	}

	/**
	 * Obtiene alumnos inscriptos en una comisión
	 */
	async getCommissionStudents(commissionId: string) {
		const enrollments = await prisma.subjectEnrollment.findMany({
			where: {
				commissionId,
				status: 'ACTIVE'
			},
			include: {
				student: {
					include: {
						user: {
							select: {
								email: true
							}
						}
					}
				}
			}
		});

		return enrollments.map((e) => ({
			id: e.student.id,
			studentId: e.student.id,
			enrollmentId: e.id,
			firstName: e.student.firstName,
			lastName: e.student.lastName,
			dni: e.student.dni,
			email: e.student.user?.email || null,
			status: e.status
		}));
	}
}

export const teacherAcademicService = new TeacherAcademicService();
