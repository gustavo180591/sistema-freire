import { prisma } from '$lib/server/db/prisma';
import { WeekDay } from '@prisma/client';

export interface ScheduleFilters {
	locationId?: string;
	careerId?: string;
	yearLevel?: number;
	active?: boolean;
}

export interface ScheduleInput {
	locationId?: string;
	careerId: string;
	studyPlanId?: string | null;
	subjectId: string;
	commissionId?: string;
	teacherId?: string;
	yearLevel: number;
	dayOfWeek: WeekDay;
	startTime: string;
	endTime: string;
	classroom?: string;
	observations?: string;
	active?: boolean;
}

export interface ScheduleConflict {
	type: 'CAREER_YEAR_DAY' | 'TEACHER_DAY' | 'CLASSROOM_LOCATION_DAY';
	message: string;
	existingSchedule?: any;
}

interface SharedScheduleCandidate {
	careerId: string;
	subjectId: string;
	teacherId: string | null;
	locationId: string | null;
	dayOfWeek: WeekDay;
	startTime: string;
	endTime: string;
}

/**
 * Determina si dos registros representan la misma clase
 * compartida por carreras diferentes.
 *
 * La excepción es deliberadamente estricta:
 * - carreras distintas;
 * - misma materia;
 * - mismo docente;
 * - misma localidad;
 * - mismo día;
 * - mismo horario exacto.
 *
 * No se permiten solapamientos parciales ni materias distintas.
 */
function isSharedCrossCareerSchedule(
	existing: SharedScheduleCandidate,
	input: ScheduleInput
): boolean {
	if (!existing.teacherId || !input.teacherId) {
		return false;
	}

	return (
		existing.careerId !== input.careerId &&
		existing.subjectId === input.subjectId &&
		existing.teacherId === input.teacherId &&
		(existing.locationId ?? null) === (input.locationId ?? null) &&
		existing.dayOfWeek === input.dayOfWeek &&
		existing.startTime === input.startTime &&
		existing.endTime === input.endTime
	);
}

/**
 * Get schedules by career and year level
 */
export async function getSchedulesByCareerAndYear(
	careerId: string,
	yearLevel: number,
	filters?: ScheduleFilters
) {
	const where: any = {
		careerId,
		yearLevel,
		active: true
	};

	if (filters?.locationId) {
		where.locationId = filters.locationId;
	}

	if (filters?.active !== undefined) {
		where.active = filters.active;
	}

	const schedules = await prisma.classSchedule.findMany({
		where,
		include: {
			location: {
				select: {
					id: true,
					name: true
				}
			},
			career: {
				select: {
					id: true,
					name: true
				}
			},
			studyPlan: {
				select: {
					id: true,
					name: true
				}
			},
			subject: {
				select: {
					id: true,
					name: true,
					code: true
				}
			},
			teacher: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			},
			commission: {
				select: {
					id: true,
					code: true
				}
			}
		},
		orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
	});

	return schedules;
}

/**
 * Get schedules for a specific date
 * This considers the day of the week and academic calendar
 */
export async function getSchedulesForDate(date: Date, careerId?: string, yearLevel?: number) {
	const dayOfWeek = date.getDay();
	const prismaDayOfWeek = mapJsDayToPrismaDay(dayOfWeek);

	const where: any = {
		dayOfWeek: prismaDayOfWeek,
		active: true
	};

	if (careerId) {
		where.careerId = careerId;
	}

	if (yearLevel) {
		where.yearLevel = yearLevel;
	}

	const schedules = await prisma.classSchedule.findMany({
		where,
		include: {
			location: {
				select: {
					id: true,
					name: true
				}
			},
			career: {
				select: {
					id: true,
					name: true
				}
			},
			studyPlan: {
				select: {
					id: true,
					name: true
				}
			},
			subject: {
				select: {
					id: true,
					name: true,
					code: true
				}
			},
			teacher: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			},
			commission: {
				select: {
					id: true,
					code: true
				}
			}
		},
		orderBy: [{ startTime: 'asc' }]
	});

	return schedules;
}

/**
 * Validate schedule against academic calendar
 * Checks if the date is a working day, not a holiday, etc.
 */
export async function validateScheduleAgainstAcademicCalendar(
	date: Date,
	locationId?: string
): Promise<{
	isValid: boolean;
	reason?: string;
}> {
	// This will integrate with the calendar configuration
	// For now, return valid as a placeholder
	// TODO: Implement actual calendar validation

	return {
		isValid: true
	};
}

/**
 * Check if a specific date is a class day based on calendar
 */
export async function isClassDayByCalendar(date: Date, locationId?: string): Promise<boolean> {
	const validation = await validateScheduleAgainstAcademicCalendar(date, locationId);
	return validation.isValid;
}

/**
 * Get active academic calendar for a location
 */
export async function getActiveAcademicCalendarForLocation(locationId?: string) {
	// TODO: Implement when academic calendar model is available
	return null;
}

/**
 * Validate schedule for conflicts
 */
export async function validateScheduleConflicts(input: ScheduleInput): Promise<ScheduleConflict[]> {
	const conflicts: ScheduleConflict[] = [];

	// Check for career/year/day overlap
	const careerOverlap = await prisma.classSchedule.findFirst({
		where: {
			locationId: input.locationId ?? null,
			careerId: input.careerId,
			yearLevel: input.yearLevel,
			dayOfWeek: input.dayOfWeek,
			active: true,
			OR: [
				{
					AND: [{ startTime: { lte: input.startTime } }, { endTime: { gt: input.startTime } }]
				},
				{
					AND: [{ startTime: { lt: input.endTime } }, { endTime: { gte: input.endTime } }]
				},
				{
					AND: [{ startTime: { gte: input.startTime } }, { endTime: { lte: input.endTime } }]
				}
			]
		}
	});

	if (careerOverlap) {
		conflicts.push({
			type: 'CAREER_YEAR_DAY',
			message:
				'Ya existe un horario para esta localidad, carrera, año y día en el mismo rango horario',
			existingSchedule: careerOverlap
		});
	}

	// Check for teacher overlap if teacher is assigned.
	//
	// Una misma clase puede ser compartida por carreras distintas
	// cuando materia, docente, localidad, día y horario coinciden
	// exactamente.
	if (input.teacherId) {
		const teacherOverlaps = await prisma.classSchedule.findMany({
			where: {
				teacherId: input.teacherId,
				dayOfWeek: input.dayOfWeek,
				active: true,
				OR: [
					{
						AND: [{ startTime: { lte: input.startTime } }, { endTime: { gt: input.startTime } }]
					},
					{
						AND: [{ startTime: { lt: input.endTime } }, { endTime: { gte: input.endTime } }]
					},
					{
						AND: [{ startTime: { gte: input.startTime } }, { endTime: { lte: input.endTime } }]
					}
				]
			},
			select: {
				id: true,
				careerId: true,
				subjectId: true,
				teacherId: true,
				locationId: true,
				dayOfWeek: true,
				startTime: true,
				endTime: true
			}
		});

		const teacherOverlap = teacherOverlaps.find(
			(schedule) => !isSharedCrossCareerSchedule(schedule, input)
		);

		if (teacherOverlap) {
			conflicts.push({
				type: 'TEACHER_DAY',
				message: 'El docente ya tiene un horario asignado en este día y rango horario',
				existingSchedule: teacherOverlap
			});
		}
	}

	// Check for classroom overlap if classroom and location are assigned.
	//
	// Una clase compartida entre carreras puede utilizar la misma aula,
	// porque representa una única clase física registrada académicamente
	// para más de una carrera.
	if (input.classroom && input.locationId) {
		const classroomOverlaps = await prisma.classSchedule.findMany({
			where: {
				locationId: input.locationId,
				classroom: input.classroom,
				dayOfWeek: input.dayOfWeek,
				active: true,
				OR: [
					{
						AND: [{ startTime: { lte: input.startTime } }, { endTime: { gt: input.startTime } }]
					},
					{
						AND: [{ startTime: { lt: input.endTime } }, { endTime: { gte: input.endTime } }]
					},
					{
						AND: [{ startTime: { gte: input.startTime } }, { endTime: { lte: input.endTime } }]
					}
				]
			},
			select: {
				id: true,
				careerId: true,
				subjectId: true,
				teacherId: true,
				locationId: true,
				dayOfWeek: true,
				startTime: true,
				endTime: true
			}
		});

		const classroomOverlap = classroomOverlaps.find(
			(schedule) => !isSharedCrossCareerSchedule(schedule, input)
		);

		if (classroomOverlap) {
			conflicts.push({
				type: 'CLASSROOM_LOCATION_DAY',
				message: 'El aula ya está ocupada en esta localidad, día y rango horario',
				existingSchedule: classroomOverlap
			});
		}
	}

	return conflicts;
}

export interface ScheduleSubjectOption {
	id: string;
	name: string;
	code: string;
	yearLevel: number;
}

/**
 * Devuelve todas las materias que pueden utilizarse para
 * configurar horarios de una carrera y año.
 *
 * Se contemplan dos relaciones:
 *
 * - CareerSubject: relación directa carrera/materia/año.
 * - PlanSubject: compatibilidad con materias históricas que
 *   ya pertenecen a un plan de estudio activo.
 *
 * Esto permite que las materias creadas desde /materias/nueva
 * aparezcan inmediatamente en horarios sin romper los planes
 * académicos existentes.
 */
export async function getAvailableSubjectsForCareerSchedule(
	careerId: string,
	yearLevel: number
): Promise<ScheduleSubjectOption[]> {
	const subjects = await prisma.subject.findMany({
		where: {
			active: true,
			OR: [
				{
					careerSubjects: {
						some: {
							careerId,
							yearLevel
						}
					}
				},
				{
					yearLevel,
					planSubjects: {
						some: {
							plan: {
								careerId,
								active: true
							}
						}
					}
				}
			]
		},
		select: {
			id: true,
			name: true,
			code: true
		},
		orderBy: [{ name: 'asc' }, { code: 'asc' }]
	});

	return subjects.map((subject) => ({
		...subject,
		yearLevel
	}));
}

/**
 * Valida que una materia pueda utilizarse para configurar
 * un horario de una carrera y año determinados.
 *
 * CareerSubject tiene prioridad cuando existe.
 *
 * Para preservar compatibilidad con datos existentes,
 * una materia que todavía no tenga CareerSubject también
 * puede ser válida si pertenece a un plan activo de la
 * carrera y su año académico coincide.
 */
export async function validateSubjectForCareerSchedule(
	careerId: string,
	subjectId: string,
	yearLevel: number
): Promise<{
	isValid: boolean;
	reason?: string;
	studyPlanId?: string;
}> {
	const subject = await prisma.subject.findUnique({
		where: {
			id: subjectId
		},
		select: {
			active: true,
			yearLevel: true
		}
	});

	if (!subject) {
		return {
			isValid: false,
			reason: 'La materia no existe'
		};
	}

	if (!subject.active) {
		return {
			isValid: false,
			reason: 'La materia está inactiva'
		};
	}

	const [careerSubject, studyPlan] = await Promise.all([
		prisma.careerSubject.findUnique({
			where: {
				careerId_subjectId: {
					careerId,
					subjectId
				}
			},
			select: {
				yearLevel: true
			}
		}),

		prisma.studyPlan.findFirst({
			where: {
				careerId,
				active: true,
				subjects: {
					some: {
						subjectId
					}
				}
			},
			orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
			select: {
				id: true
			}
		})
	]);

	/*
	 * Si existe CareerSubject, esa relación determina
	 * explícitamente el año dentro de la carrera.
	 */
	if (careerSubject) {
		if (careerSubject.yearLevel !== yearLevel) {
			return {
				isValid: false,
				reason: `La materia corresponde a ${careerSubject.yearLevel}° año, no a ${yearLevel}° año`
			};
		}

		return {
			isValid: true,
			studyPlanId: studyPlan?.id
		};
	}

	/*
	 * Compatibilidad histórica:
	 * si no existe CareerSubject, todavía aceptamos la materia
	 * cuando pertenece a un plan activo de la carrera.
	 */
	if (!studyPlan) {
		return {
			isValid: false,
			reason: 'La materia no está vinculada a esta carrera ni pertenece a un plan de estudio activo'
		};
	}

	if (subject.yearLevel !== yearLevel) {
		return {
			isValid: false,
			reason: `La materia corresponde a ${subject.yearLevel}° año, no a ${yearLevel}° año`
		};
	}

	return {
		isValid: true,
		studyPlanId: studyPlan.id
	};
}

/**
 * Create a new schedule
 */
export async function createSchedule(input: ScheduleInput) {
	// Validar que la materia pertenezca a la carrera y al año.
	const subjectValidation = await validateSubjectForCareerSchedule(
		input.careerId,
		input.subjectId,
		input.yearLevel
	);

	if (!subjectValidation.isValid) {
		throw new Error(subjectValidation.reason);
	}

	/*
	 * Asociar el plan cuando exista.
	 * Si la materia todavía no pertenece a un plan activo,
	 * ClassSchedule puede conservar studyPlanId en null.
	 */
	const studyPlanId = subjectValidation.studyPlanId ?? undefined;

	// Validate time range
	if (input.startTime >= input.endTime) {
		throw new Error('La hora de fin debe ser mayor a la hora de inicio');
	}

	// Check for conflicts
	const conflicts = await validateScheduleConflicts({
		...input,
		studyPlanId
	});

	if (conflicts.length > 0) {
		throw new Error(conflicts.map((c) => c.message).join('. '));
	}

	// Create schedule
	const schedule = await prisma.classSchedule.create({
		data: {
			...input,
			studyPlanId
		},
		include: {
			location: {
				select: {
					id: true,
					name: true
				}
			},
			career: {
				select: {
					id: true,
					name: true
				}
			},
			studyPlan: {
				select: {
					id: true,
					name: true
				}
			},
			subject: {
				select: {
					id: true,
					name: true,
					code: true
				}
			},
			teacher: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			},
			commission: {
				select: {
					id: true,
					code: true
				}
			}
		}
	});

	return schedule;
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(id: string, input: Partial<ScheduleInput>) {
	// Si cambia carrera, materia o año, validar nuevamente la relación académica.
	if (input.careerId || input.subjectId || input.yearLevel) {
		const existing = await prisma.classSchedule.findUnique({
			where: { id },
			select: {
				careerId: true,
				subjectId: true,
				yearLevel: true
			}
		});

		if (existing) {
			const careerId = input.careerId || existing.careerId;
			const subjectId = input.subjectId || existing.subjectId;
			const yearLevel = input.yearLevel !== undefined ? input.yearLevel : existing.yearLevel;

			const subjectValidation = await validateSubjectForCareerSchedule(
				careerId,
				subjectId,
				yearLevel
			);

			if (!subjectValidation.isValid) {
				throw new Error(subjectValidation.reason);
			}

			/*
			 * Si la nueva materia pertenece a un plan activo,
			 * asociarlo. Si no pertenece a ninguno, limpiar una
			 * posible asociación anterior para no dejar datos
			 * inconsistentes.
			 */
			input.studyPlanId = subjectValidation.studyPlanId ?? null;
		}
	}

	// Validate time range if both times provided
	if (input.startTime && input.endTime && input.startTime >= input.endTime) {
		throw new Error('La hora de fin debe ser mayor a la hora de inicio');
	}

	// Check for conflicts (excluding current schedule)
	if (input.dayOfWeek || input.startTime || input.endTime) {
		const existing = await prisma.classSchedule.findUnique({
			where: { id },
			select: {
				careerId: true,
				yearLevel: true,
				dayOfWeek: true,
				startTime: true,
				endTime: true,
				teacherId: true,
				locationId: true,
				classroom: true,
				subjectId: true,
				studyPlanId: true,
				commissionId: true,
				observations: true,
				active: true
			}
		});

		if (existing) {
			const checkInput: ScheduleInput = {
				careerId: input.careerId || existing.careerId,
				subjectId: input.subjectId || existing.subjectId,
				studyPlanId: existing.studyPlanId,
				commissionId: existing.commissionId || undefined,
				teacherId:
					input.teacherId !== undefined ? input.teacherId : existing.teacherId || undefined,
				locationId:
					input.locationId !== undefined ? input.locationId : existing.locationId || undefined,
				classroom:
					input.classroom !== undefined ? input.classroom : existing.classroom || undefined,
				observations: existing.observations || undefined,
				yearLevel: input.yearLevel !== undefined ? input.yearLevel : existing.yearLevel,
				dayOfWeek: input.dayOfWeek || existing.dayOfWeek,
				startTime: input.startTime || existing.startTime,
				endTime: input.endTime || existing.endTime,
				active: existing.active
			};

			const conflicts = await validateScheduleConflicts(checkInput);
			// Filter out conflicts with the current schedule
			const otherConflicts = conflicts.filter((c) => c.existingSchedule?.id !== id);

			if (otherConflicts.length > 0) {
				throw new Error(otherConflicts.map((c) => c.message).join('. '));
			}
		}
	}

	const schedule = await prisma.classSchedule.update({
		where: { id },
		data: input,
		include: {
			location: {
				select: {
					id: true,
					name: true
				}
			},
			career: {
				select: {
					id: true,
					name: true
				}
			},
			studyPlan: {
				select: {
					id: true,
					name: true
				}
			},
			subject: {
				select: {
					id: true,
					name: true,
					code: true
				}
			},
			teacher: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			},
			commission: {
				select: {
					id: true,
					code: true
				}
			}
		}
	});

	return schedule;
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(id: string) {
	await prisma.classSchedule.delete({
		where: { id }
	});
}

/**
 * Get all schedules grouped by career, year, and day
 */
export async function getSchedulesGrouped(filters?: ScheduleFilters) {
	const where: any = {
		active: true
	};

	if (filters?.locationId) {
		where.locationId = filters.locationId;
	}

	if (filters?.careerId) {
		where.careerId = filters.careerId;
	}

	if (filters?.yearLevel) {
		where.yearLevel = filters.yearLevel;
	}

	if (filters?.active !== undefined) {
		where.active = filters.active;
	}

	const schedules = await prisma.classSchedule.findMany({
		where,
		include: {
			location: {
				select: {
					id: true,
					name: true
				}
			},
			career: {
				select: {
					id: true,
					name: true
				}
			},
			studyPlan: {
				select: {
					id: true,
					name: true
				}
			},
			subject: {
				select: {
					id: true,
					name: true,
					code: true
				}
			},
			teacher: {
				select: {
					id: true,
					firstName: true,
					lastName: true
				}
			},
			commission: {
				select: {
					id: true,
					code: true
				}
			}
		},
		orderBy: [
			{ career: { name: 'asc' } },
			{ yearLevel: 'asc' },
			{ dayOfWeek: 'asc' },
			{ startTime: 'asc' }
		]
	});

	// Group by career
	const grouped = schedules.reduce(
		(acc, schedule) => {
			const careerId = schedule.careerId;
			if (!acc[careerId]) {
				acc[careerId] = {
					career: schedule.career,
					years: {}
				};
			}

			const yearLevel = schedule.yearLevel;
			if (!acc[careerId].years[yearLevel]) {
				acc[careerId].years[yearLevel] = {
					yearLevel,
					days: {}
				};
			}

			const dayOfWeek = schedule.dayOfWeek;
			if (!acc[careerId].years[yearLevel].days[dayOfWeek]) {
				acc[careerId].years[yearLevel].days[dayOfWeek] = [];
			}

			acc[careerId].years[yearLevel].days[dayOfWeek].push(schedule);

			return acc;
		},
		{} as Record<string, any>
	);

	return grouped;
}

/**
 * Helper: Map JS day (0-6, Sunday-Saturday) to Prisma WeekDay enum
 */
function mapJsDayToPrismaDay(jsDay: number): WeekDay {
	const days: WeekDay[] = [
		WeekDay.SUNDAY,
		WeekDay.MONDAY,
		WeekDay.TUESDAY,
		WeekDay.WEDNESDAY,
		WeekDay.THURSDAY,
		WeekDay.FRIDAY,
		WeekDay.SATURDAY
	];
	return days[jsDay];
}

/**
 * Helper: Get day name in Spanish
 */
export function getDayName(dayOfWeek: WeekDay): string {
	const names: Record<WeekDay, string> = {
		[WeekDay.MONDAY]: 'Lunes',
		[WeekDay.TUESDAY]: 'Martes',
		[WeekDay.WEDNESDAY]: 'Miércoles',
		[WeekDay.THURSDAY]: 'Jueves',
		[WeekDay.FRIDAY]: 'Viernes',
		[WeekDay.SATURDAY]: 'Sábado',
		[WeekDay.SUNDAY]: 'Domingo'
	};
	return names[dayOfWeek];
}
