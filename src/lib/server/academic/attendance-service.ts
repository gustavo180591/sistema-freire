import { prisma } from '../db/prisma';
import { error } from '@sveltejs/kit';
import { teacherAcademicService } from './teacher-academic-service';

export interface AttendanceFormData {
	recordId: string | null;
	subjectId: string;
	subjectName: string;
	subjectCode: string;
	commissionId: string | null;
	commissionName: string | null;
	classDate: Date;
	students: Array<{
		studentId: string;
		enrollmentId: string;
		firstName: string;
		lastName: string;
		dni: string;
		present: boolean;
		notes: string | null;
	}>;
}

export interface AttendanceEntryInput {
	studentId: string;
	present: boolean;
	notes?: string | null;
}

/**
 * Servicio de asistencia
 */
export class AttendanceService {
	/**
	 * Obtiene los datos del formulario de asistencia
	 */
	async getAttendanceFormData(
		teacherId: string,
		subjectId: string,
		commissionId: string | null,
		classDate: Date
	): Promise<AttendanceFormData> {
		// Verificar acceso a la materia o comisión
		if (commissionId) {
			await teacherAcademicService.assertTeacherCanAccessCommission(teacherId, commissionId);
		} else {
			await teacherAcademicService.assertTeacherCanAccessSubject(teacherId, subjectId);
		}

		// Obtener datos de la materia
		const subject = await prisma.subject.findUnique({
			where: { id: subjectId }
		});

		if (!subject) {
			throw error(404, 'Materia no encontrada');
		}

		// Obtener datos de la comisión si existe
		let commissionName = null;
		if (commissionId) {
			const commission = await prisma.subjectCommission.findUnique({
				where: { id: commissionId }
			});
			commissionName = commission?.code || null;
		}

		// Buscar registro de asistencia existente
		const existingRecord = await prisma.attendanceRecord.findFirst({
			where: {
				subjectId,
				classDate,
				commissionId: commissionId || null
			},
			include: {
				entries: true
			}
		});

		// Obtener alumnos inscriptos
		const students = commissionId
			? await teacherAcademicService.getCommissionStudents(commissionId)
			: [];

		// Mapear entradas existentes si hay
		const entriesMap = new Map<string, { present: boolean; notes: string | null }>();
		if (existingRecord) {
			const entries = await prisma.attendanceEntry.findMany({
				where: { attendanceId: existingRecord.id }
			});
			for (const entry of entries) {
				entriesMap.set(entry.studentId, { present: entry.present, notes: entry.notes });
			}
		}

		const attendanceStudents = students.map((s) => ({
			studentId: s.studentId,
			enrollmentId: s.enrollmentId,
			firstName: s.firstName,
			lastName: s.lastName,
			dni: s.dni,
			present: entriesMap.get(s.studentId)?.present || true,
			notes: entriesMap.get(s.studentId)?.notes || null
		}));

		return {
			recordId: existingRecord?.id || null,
			subjectId,
			subjectName: subject.name,
			subjectCode: subject.code,
			commissionId,
			commissionName,
			classDate,
			students: attendanceStudents
		};
	}

	/**
	 * Crea o actualiza un registro de asistencia
	 */
	async createOrUpdateAttendanceRecord(
		teacherId: string,
		subjectId: string,
		commissionId: string | null,
		classDate: Date,
		createdByUserId: string,
		entries: AttendanceEntryInput[]
	): Promise<string> {
		// Verificar acceso
		if (commissionId) {
			await teacherAcademicService.assertTeacherCanAccessCommission(teacherId, commissionId);
		} else {
			await teacherAcademicService.assertTeacherCanAccessSubject(teacherId, subjectId);
		}

		// Buscar registro existente
		const existingRecord = await prisma.attendanceRecord.findFirst({
			where: {
				subjectId,
				classDate,
				commissionId: commissionId || null
			}
		});

		let recordId: string;

		if (existingRecord) {
			// Actualizar registro existente
			recordId = existingRecord.id;

			// Eliminar entradas existentes
			await prisma.attendanceEntry.deleteMany({
				where: { attendanceId: recordId }
			});

			// Crear nuevas entradas
			await prisma.attendanceEntry.createMany({
				data: entries.map((e) => ({
					attendanceId: recordId,
					studentId: e.studentId,
					present: e.present,
					notes: e.notes || null
				}))
			});
		} else {
			// Crear nuevo registro
			const record = await prisma.attendanceRecord.create({
				data: {
					subjectId,
					classDate,
					commissionId,
					createdByUserId
				}
			});

			recordId = record.id;

			// Crear entradas
			await prisma.attendanceEntry.createMany({
				data: entries.map((e) => ({
					attendanceId: recordId,
					studentId: e.studentId,
					present: e.present,
					notes: e.notes || null
				}))
			});
		}

		// Recalcular porcentaje de asistencia para cada alumno
		for (const entry of entries) {
			await this.recalculateAttendancePercent(entry.studentId, subjectId, commissionId);
		}

		return recordId;
	}

	/**
	 * Recalcula el porcentaje de asistencia de un alumno en una materia/comisión
	 */
	async recalculateAttendancePercent(
		studentId: string,
		subjectId: string,
		commissionId: string | null
	): Promise<number> {
		// Obtener todos los registros de asistencia de la materia/comisión
		const records = await prisma.attendanceRecord.findMany({
			where: {
				subjectId,
				commissionId
			},
			include: {
				entries: {
					where: { studentId }
				}
			}
		});

		if (records.length === 0) {
			return 0;
		}

		let presentCount = 0;
		for (const record of records) {
			const entry = record.entries[0];
			if (entry && entry.present) {
				presentCount++;
			}
		}

		const attendancePercent = (presentCount / records.length) * 100;

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
				attendancePercent
			},
			update: {
				attendancePercent
			}
		});

		return attendancePercent;
	}

	/**
	 * Obtiene el historial de asistencia de un alumno
	 */
	async getStudentAttendanceHistory(studentId: string, subjectId?: string) {
		const whereClause: any = { studentId };
		if (subjectId) {
			whereClause.attendance = { subjectId };
		}

		const entries = await prisma.attendanceEntry.findMany({
			where: whereClause,
			include: {
				attendance: {
					include: {
						subject: true,
						commission: true
					}
				}
			},
			orderBy: {
				attendance: {
					classDate: 'desc'
				}
			}
		});

		return entries.map((e) => ({
			id: e.id,
			classDate: e.attendance.classDate,
			subjectName: e.attendance.subject.name,
			subjectCode: e.attendance.subject.code,
			commissionCode: e.attendance.commission?.code || null,
			present: e.present,
			notes: e.notes
		}));
	}

	/**
	 * Obtiene el resumen de asistencia de un alumno por materia
	 */
	async getStudentAttendanceSummary(studentId: string) {
		const statuses = await prisma.studentSubjectStatus.findMany({
			where: { studentId },
			include: {
				subject: true
			}
		});

		const summary = await Promise.all(
			statuses.map(async (s) => {
				const entries = await prisma.attendanceEntry.findMany({
					where: {
						studentId,
						attendance: { subjectId: s.subjectId }
					}
				});

				const presentCount = entries.filter((e) => e.present).length;
				const absentCount = entries.length - presentCount;

				return {
					subjectId: s.subjectId,
					subjectName: s.subject.name,
					subjectCode: s.subject.code,
					attendancePercent: Number(s.attendancePercent),
					regularityStatus: s.regularityStatus,
					academicStatus: s.academicStatus,
					presentCount,
					absentCount,
					totalClasses: entries.length
				};
			})
		);

		return summary;
	}
}

export const attendanceService = new AttendanceService();
