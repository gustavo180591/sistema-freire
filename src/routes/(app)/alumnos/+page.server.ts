import { prisma } from '$lib/server/db/prisma';
import { getUserAllowedLocationIds } from '$lib/server/auth/authorization';
import type { Prisma } from '@prisma/client';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

function parsePage(value: string | null) {
	if (!value) return 1;

	const page = Number.parseInt(value, 10);

	return Number.isInteger(page) && page > 0 ? page : 1;
}

function buildSearchFilters(searchQuery: string): Prisma.StudentWhereInput[] {
	const terms = searchQuery
		.split(/\s+/)
		.map((term) => term.trim())
		.filter(Boolean);

	return terms.map((term) => ({
		OR: [
			{
				dni: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				firstName: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				lastName: {
					contains: term,
					mode: 'insensitive'
				}
			},
			{
				user: {
					is: {
						firstName: {
							contains: term,
							mode: 'insensitive'
						}
					}
				}
			},
			{
				user: {
					is: {
						lastName: {
							contains: term,
							mode: 'insensitive'
						}
					}
				}
			},
			{
				user: {
					is: {
						email: {
							contains: term,
							mode: 'insensitive'
						}
					}
				}
			},
			{
				location: {
					is: {
						name: {
							contains: term,
							mode: 'insensitive'
						}
					}
				}
			}
		]
	}));
}

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	const careerId = url.searchParams.get('carrera');
	const locationIdParam = url.searchParams.get('localidad');
	const searchQuery = url.searchParams.get('q')?.trim() ?? '';
	const requestedPage = parsePage(url.searchParams.get('page'));

	const allowedLocationIds = await getUserAllowedLocationIds(locals.user);

	const allLocations = await prisma.location.findMany({
		where: {
			active: true
		},
		select: {
			id: true,
			name: true,
			code: true
		},
		orderBy: {
			name: 'asc'
		}
	});

	const hasGlobalAccess =
		allLocations.length > 0 && allowedLocationIds.length === allLocations.length;

	const filterableLocations = hasGlobalAccess
		? allLocations
		: allLocations.filter((location) => allowedLocationIds.includes(location.id));

	let effectiveLocationIds = allowedLocationIds;
	let selectedLocationId: string | null = null;

	if (hasGlobalAccess && locationIdParam) {
		const selectedLocation = allLocations.find((location) => location.id === locationIdParam);

		if (selectedLocation) {
			effectiveLocationIds = [selectedLocation.id];
			selectedLocationId = selectedLocation.id;
		}
	}

	/*
	 * Alcance institucional:
	 * - usuarios limitados: únicamente sus localidades autorizadas;
	 * - usuarios globales: todas las localidades, salvo filtro explícito;
	 * - carrera: se aplica cuando fue seleccionada.
	 */
	const studentScopeWhere: Prisma.StudentWhereInput = {
		user: {
			is: {
				roles: {
					some: {
						role: {
							code: 'ALUMNO'
						}
					}
				}
			}
		}
	};

	if (!hasGlobalAccess) {
		studentScopeWhere.locationId = {
			in: allowedLocationIds
		};
	} else if (selectedLocationId) {
		studentScopeWhere.locationId = selectedLocationId;
	}

	if (careerId) {
		studentScopeWhere.careerId = careerId;
	}

	const searchFilters = buildSearchFilters(searchQuery);

	const studentWhere: Prisma.StudentWhereInput =
		searchFilters.length > 0
			? {
					AND: [studentScopeWhere, ...searchFilters]
				}
			: studentScopeWhere;

	/*
	 * Las métricas conservan el comportamiento anterior:
	 * respetan carrera/localidad, pero no se reducen por el texto del buscador.
	 */
	const [
		totalItems,
		totalStudents,
		activeStudents,
		scholarshipStudents,
		repeatingStudents,
		careers
	] = await Promise.all([
		prisma.student.count({
			where: studentWhere
		}),
		prisma.student.count({
			where: studentScopeWhere
		}),
		prisma.student.count({
			where: {
				AND: [studentScopeWhere, { status: 'ACTIVE' }]
			}
		}),
		prisma.student.count({
			where: {
				AND: [studentScopeWhere, { isBecado: true }]
			}
		}),
		prisma.student.count({
			where: {
				AND: [studentScopeWhere, { isRecursante: true }]
			}
		}),
		prisma.career.findMany({
			where: {
				active: true,
				locations: {
					some: {
						locationId: {
							in: effectiveLocationIds
						}
					}
				}
			},
			orderBy: {
				name: 'asc'
			},
			select: {
				id: true,
				name: true
			}
		})
	]);

	const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
	const page = Math.min(requestedPage, totalPages);
	const skip = (page - 1) * PAGE_SIZE;

	const students = await prisma.student.findMany({
		where: studentWhere,
		include: {
			user: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					createdAt: true
				}
			},
			career: {
				select: {
					id: true,
					name: true
				}
			},
			location: {
				select: {
					id: true,
					name: true
				}
			}
		},
		orderBy: [
			{
				user: {
					lastName: 'asc'
				}
			},
			{
				user: {
					firstName: 'asc'
				}
			},
			{
				id: 'asc'
			}
		],
		skip,
		take: PAGE_SIZE
	});

	const careerName = careerId
		? (careers.find((career) => career.id === careerId)?.name ?? null)
		: null;

	const from = totalItems === 0 ? 0 : skip + 1;
	const to = totalItems === 0 ? 0 : Math.min(skip + students.length, totalItems);

	return {
		students: students.map((student) => ({
			id: student.id,
			userId: student.userId,
			dni: student.dni,
			firstName: student.user.firstName,
			lastName: student.user.lastName,
			email: student.user.email,
			career: student.career.name,
			careerId: student.careerId,
			academicLocation: student.location?.name ?? 'Sin asignar',
			academicLocationId: student.locationId ?? '',
			status: student.status,
			isBecado: student.isBecado,
			isRecursante: student.isRecursante,
			currentYear: student.currentYear,
			createdAt: student.user.createdAt,
			birthDate: student.birthDate,
			bloodType: student.bloodType,
			phone: student.phone,
			address: student.address,
			locality: student.locality,
			postalCode: student.postalCode,
			highSchool: student.highSchool,
			highSchoolYear: student.highSchoolYear,
			instituteYear: student.instituteYear,
			familyContactName: student.familyContactName,
			familyContactPhone: student.familyContactPhone,
			familyRelationship: student.familyRelationship
		})),
		careers,
		locations: filterableLocations,
		hasGlobalAccess,
		selectedLocationId,
		searchQuery,
		metrics: {
			total: totalStudents,
			active: activeStudents,
			scholarship: scholarshipStudents,
			repeating: repeatingStudents
		},
		pagination: {
			page,
			pageSize: PAGE_SIZE,
			totalItems,
			totalPages,
			from,
			to
		},
		filter: careerId
			? {
					careerId,
					careerName
				}
			: null
	};
};
