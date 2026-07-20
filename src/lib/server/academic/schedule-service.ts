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
	studyPlanId?: string;
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
			message: 'Ya existe un horario para esta carrera, año y día en el mismo rango horario',
			existingSchedule: careerOverlap
		});
	}

	// Check for teacher overlap if teacher is assigned
	if (input.teacherId) {
		const teacherOverlap = await prisma.classSchedule.findFirst({
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
			}
		});

		if (teacherOverlap) {
			conflicts.push({
				type: 'TEACHER_DAY',
				message: 'El docente ya tiene un horario asignado en este día y rango horario',
				existingSchedule: teacherOverlap
			});
		}
	}

	// Check for classroom overlap if classroom and location are assigned
	if (input.classroom && input.locationId) {
		const classroomOverlap = await prisma.classSchedule.findFirst({
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
			}
		});

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

/**
 * Validate that subject belongs to the active/default study plan of the career
 */
export async function validateSubjectInCareerPlan(
	careerId: string,
	subjectId: string,
	yearLevel: number
): Promise<{
	isValid: boolean;
	reason?: string;
	studyPlanId?: string;
}> {
	// Get the active/default study plan for the career
	const studyPlan = await prisma.studyPlan.findFirst({
		where: {
			careerId,
			active: true,
			OR: [{ isDefault: true }, { active: true }]
		}
	});

	if (!studyPlan) {
		return {
			isValid: false,
			reason: 'No hay un plan de estudio activo para esta carrera'
		};
	}

	// Check if subject is in the plan
	const planSubject = await prisma.planSubject.findFirst({
		where: {
			planId: studyPlan.id,
			subjectId
		},
		include: {
			subject: true
		}
	});

	if (!planSubject) {
		return {
			isValid: false,
			reason: 'La materia no pertenece al plan de estudio activo de esta carrera'
		};
	}

	// Check if subject year level matches
	if (planSubject.subject.yearLevel !== yearLevel) {
		return {
			isValid: false,
			reason: `La materia es de año ${planSubject.subject.yearLevel}, no del año ${yearLevel}`
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
	// Validate subject in career plan
	const planValidation = await validateSubjectInCareerPlan(
		input.careerId,
		input.subjectId,
		input.yearLevel
	);

	if (!planValidation.isValid) {
		throw new Error(planValidation.reason);
	}

	// Set studyPlanId from validation
	const studyPlanId = planValidation.studyPlanId || input.studyPlanId;

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
	// If career, subject, or yearLevel changed, validate subject in plan
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

			const planValidation = await validateSubjectInCareerPlan(careerId, subjectId, yearLevel);

			if (!planValidation.isValid) {
				throw new Error(planValidation.reason);
			}

			if (planValidation.studyPlanId) {
				input.studyPlanId = planValidation.studyPlanId;
			}
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
				subjectId: existing.subjectId,
				studyPlanId: existing.studyPlanId || undefined,
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
