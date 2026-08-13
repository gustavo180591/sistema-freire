import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

import { prisma } from '$lib/server/db/prisma';
import { getSchedulesGrouped, type ScheduleFilters } from '$lib/server/academic/schedule-service';

interface CalendarYear {
	yearLevel: number;
	days: Record<string, unknown[]>;
}

interface CalendarCareer {
	career: {
		id: string;
		name: string;
	};
	years: Record<number, CalendarYear>;
}

interface CalendarLocation {
	location: {
		id: string;
		name: string;
	};
	careers: CalendarCareer[];
}

const CALENDAR_YEARS = [1, 2, 3, 4];

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = locals.user;

	const roles = (user?.roles ?? []) as string[];
	const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'SECRETARIA'];

	if (!roles.some((role) => allowedRoles.includes(role))) {
		throw redirect(302, '/');
	}

	// ---------------------------------------------------------
	// Filtros
	// ---------------------------------------------------------

	const locationId = url.searchParams.get('locationId') ?? '';
	const careerId = url.searchParams.get('careerId') ?? '';
	const yearLevel = url.searchParams.get('yearLevel') ?? '';
	const active = url.searchParams.get('active') ?? '';

	const parsedYearLevel = yearLevel ? Number.parseInt(yearLevel, 10) : undefined;

	// ---------------------------------------------------------
	// Localidades para el filtro
	// ---------------------------------------------------------

	const locations = await prisma.location.findMany({
		where: {
			active: true
		},
		orderBy: [
			{
				displayOrder: 'asc'
			},
			{
				name: 'asc'
			}
		],
		select: {
			id: true,
			name: true
		}
	});

	// ---------------------------------------------------------
	// Carreras para el filtro
	//
	// Si se eligió una localidad, mostramos solamente las
	// carreras asociadas a esa localidad.
	// ---------------------------------------------------------

	const careers = await prisma.career.findMany({
		where: {
			active: true,

			...(locationId
				? {
						locations: {
							some: {
								locationId
							}
						}
					}
				: {})
		},
		orderBy: {
			name: 'asc'
		},
		select: {
			id: true,
			name: true,
			durationYears: true
		}
	});

	// ---------------------------------------------------------
	// Horarios para la vista listado existente
	// ---------------------------------------------------------

	const listFilters: ScheduleFilters = {};

	if (locationId) {
		listFilters.locationId = locationId;
	}

	if (careerId) {
		listFilters.careerId = careerId;
	}

	if (parsedYearLevel) {
		listFilters.yearLevel = parsedYearLevel;
	}

	if (active) {
		listFilters.active = active === 'true';
	}

	const groupedSchedules = await getSchedulesGrouped(listFilters);

	// ---------------------------------------------------------
	// Localidades que deben mostrarse en el calendario
	//
	// Sin filtro:
	//   TODAS
	//
	// Con locationId:
	//   solamente la seleccionada
	// ---------------------------------------------------------

	const calendarLocationRows = locationId
		? locations.filter((location) => location.id === locationId)
		: locations;

	// ---------------------------------------------------------
	// Relaciones localidad <-> carrera
	// ---------------------------------------------------------

	const careerLocations = await prisma.careerLocation.findMany({
		where: {
			locationId: {
				in: calendarLocationRows.map((location) => location.id)
			},

			...(careerId
				? {
						careerId
					}
				: {}),

			career: {
				active: true
			}
		},
		include: {
			career: {
				select: {
					id: true,
					name: true,
					durationYears: true
				}
			}
		}
	});

	// ---------------------------------------------------------
	// Construcción:
	//
	// LOCALIDAD
	//   -> CARRERA
	//      -> 1°
	//      -> 2°
	//      -> 3°
	//      -> 4°
	//
	// Incluso cuando un año todavía no tiene horarios.
	// ---------------------------------------------------------

	const calendarLocations: CalendarLocation[] = await Promise.all(
		calendarLocationRows.map(async (location) => {
			const careersForLocation = careerLocations
				.filter((relation) => relation.locationId === location.id)
				.map((relation) => relation.career)
				.sort((a, b) => a.name.localeCompare(b.name, 'es'));

			const locationFilters: ScheduleFilters = {
				locationId: location.id
			};

			if (careerId) {
				locationFilters.careerId = careerId;
			}

			if (parsedYearLevel) {
				locationFilters.yearLevel = parsedYearLevel;
			}

			if (active) {
				locationFilters.active = active === 'true';
			}

			/*
			 * Importante:
			 * consultamos cada localidad por separado para que una
			 * carrera existente en dos localidades nunca mezcle sus
			 * horarios.
			 */
			const existingSchedules = await getSchedulesGrouped(locationFilters);

			const yearsToDisplay = parsedYearLevel
				? CALENDAR_YEARS.includes(parsedYearLevel)
					? [parsedYearLevel]
					: []
				: CALENDAR_YEARS;

			const calendarCareers: CalendarCareer[] = careersForLocation.map((career) => {
				const existingCareer = existingSchedules[career.id];

				const years: Record<number, CalendarYear> = {};

				for (const currentYear of yearsToDisplay) {
					const existingYear = existingCareer?.years?.[currentYear];

					years[currentYear] = {
						yearLevel: currentYear,
						days: existingYear?.days ?? {}
					};
				}

				return {
					career: {
						id: career.id,
						name: career.name
					},
					years
				};
			});

			return {
				location: {
					id: location.id,
					name: location.name
				},
				careers: calendarCareers
			};
		})
	);

	return {
		locations,
		careers,

		/*
		 * Vista listado existente.
		 */
		schedules: groupedSchedules,

		/*
		 * Nueva estructura correcta para Vista calendario.
		 */
		calendarLocations,

		filters: {
			locationId,
			careerId,
			yearLevel,
			active
		}
	};
};
