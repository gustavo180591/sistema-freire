import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { prisma } from '$lib/server/db/prisma';

function timeToMinutes(value: string): number {
	const [hours, minutes] = value.split(':').map(Number);

	if (
		!Number.isInteger(hours) ||
		!Number.isInteger(minutes) ||
		hours < 0 ||
		hours > 23 ||
		minutes < 0 ||
		minutes > 59
	) {
		return 0;
	}

	return hours * 60 + minutes;
}

function calculateTeachingMinutes(startTime: string, endTime: string): number {
	const start = timeToMinutes(startTime);
	const end = timeToMinutes(endTime);

	if (end <= start) {
		return 0;
	}

	let total = end - start;

	/*
	 * Receso institucional:
	 * 20:15 a 20:30.
	 *
	 * Normalmente un horario válido no atraviesa el recreo,
	 * pero descontamos cualquier superposición para que el
	 * cálculo siga siendo correcto incluso con datos antiguos.
	 */
	const recessStart = timeToMinutes('20:15');
	const recessEnd = timeToMinutes('20:30');

	const recessOverlap = Math.max(0, Math.min(end, recessEnd) - Math.max(start, recessStart));

	total -= recessOverlap;

	return Math.max(0, total);
}

function formatWeeklyMinutes(totalMinutes: number): string {
	if (totalMinutes <= 0) {
		return '-';
	}

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours === 0) {
		return `${minutes} min`;
	}

	if (minutes === 0) {
		return `${hours} h`;
	}

	return `${hours} h ${minutes} min`;
}

export const load: PageServerLoad = async ({ params }) => {
	const subject = await prisma.subject.findUnique({
		where: {
			id: params.id
		},
		include: {
			classSchedules: {
				where: {
					active: true
				},
				select: {
					id: true,
					dayOfWeek: true,
					startTime: true,
					endTime: true
				}
			}
		}
	});

	if (!subject) {
		throw error(404, 'Materia no encontrada');
	}

	const weeklyMinutes = subject.classSchedules.reduce(
		(total, schedule) => total + calculateTeachingMinutes(schedule.startTime, schedule.endTime),
		0
	);

	const normalizedSubject = {
		id: subject.id,
		code: subject.code,
		name: subject.name,
		subjectType: subject.subjectType,
		trainingField: subject.trainingField,
		yearLevel: subject.yearLevel,
		accreditationMode: subject.accreditationMode,
		approvalThreshold: subject.approvalThreshold.toString(),
		promotionThreshold: subject.promotionThreshold.toString(),
		isAnnual: subject.isAnnual,

		/*
		 * Conservamos el valor histórico/configurado.
		 * La vista usará weeklySchedule como fuente real.
		 */
		hoursPerWeek: subject.hoursPerWeek,

		isElective: subject.isElective,
		isRemedial: subject.isRemedial,
		description: subject.description,
		active: subject.active,
		createdAt: subject.createdAt.toISOString(),
		updatedAt: subject.updatedAt.toISOString()
	};

	return {
		subject: normalizedSubject,

		weeklySchedule: {
			minutes: weeklyMinutes,
			label: formatWeeklyMinutes(weeklyMinutes),
			occurrences: subject.classSchedules.length
		}
	};
};
