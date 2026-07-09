import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';
import type { PageServerLoad } from './$types';
import { getUserAllowedLocationIds } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	const careerId = url.searchParams.get('carrera');
	const locationIdParam = url.searchParams.get('localidad');
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	// Obtener todas las localidades activas
	const allLocations = await prisma.location.findMany({
		where: { active: true },
		select: { id: true, name: true, code: true },
		orderBy: { name: 'asc' }
	});

	// Determinar si el usuario tiene acceso global (todas las localidades)
	const hasGlobalAccess = allowedLocationIds.length === allLocations.length;

	// Filtrar localidades a mostrar en el selector
	const filterableLocations = hasGlobalAccess
		? allLocations
		: allLocations.filter((l) => allowedLocationIds.includes(l.id));

	// Determinar localidades a usar en el filtro
	let effectiveLocationIds = allowedLocationIds;
	let selectedLocationId: string | null = null;

	// Si el usuario tiene acceso global y seleccionó una localidad específica
	if (hasGlobalAccess && locationIdParam) {
		const selectedLocation = allLocations.find((l) => l.id === locationIdParam);
		if (selectedLocation) {
			effectiveLocationIds = [selectedLocation.id];
			selectedLocationId = selectedLocation.id;
		}
	}

	// Obtener usuarios con rol ALUMNO
	const usersWithAlumnoRole = await prisma.user.findMany({
		where: {
			roles: {
				some: {
					role: {
						code: 'ALUMNO'
					}
				}
			}
		},
		include: {
			roles: {
				include: {
					role: true
				}
			},
			student: {
				include: {
					career: true
				}
			}
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
	});

	// Filtrar por localidades si el usuario no tiene acceso global
	let filteredUsers = usersWithAlumnoRole;
	if (!hasGlobalAccess && effectiveLocationIds.length > 0) {
		filteredUsers = usersWithAlumnoRole.filter((user) => {
			if (!user.student) return false;
			// Verificar si la carrera del alumno está en las localidades permitidas
			return effectiveLocationIds.includes(user.student.careerId);
		});
	}

	// Filtrar por carrera si se especificó
	if (careerId) {
		filteredUsers = filteredUsers.filter((user) => {
			return user.student && user.student.careerId === careerId;
		});
	}

	const careers = await prisma.career.findMany({
		where: {
			active: true,
			locations: {
				some: {
					locationId: { in: effectiveLocationIds }
				}
			}
		},
		orderBy: { name: 'asc' },
		select: { id: true, name: true }
	});

	// Get career name if filtering by career
	let careerName = null;
	if (careerId && filteredUsers.length > 0) {
		const userWithCareer = filteredUsers.find((u) => u.student && u.student.careerId === careerId);
		if (userWithCareer && userWithCareer.student) {
			careerName = userWithCareer.student.career.name;
		}
	}

	return {
		students: filteredUsers.map((user) => ({
			id: user.student?.id || user.id,
			userId: user.id,
			dni: user.student?.dni || '',
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			career: user.student?.career?.name || 'Sin carrera',
			careerId: user.student?.careerId || '',
			status: user.student?.status || 'ACTIVE',
			isBecado: user.student?.isBecado || false,
			isRecursante: user.student?.isRecursante || false,
			currentYear: user.student?.currentYear || 1,
			createdAt: user.createdAt,
			// Campos extendidos - usar null en lugar de undefined
			birthDate: user.student?.birthDate ?? null,
			bloodType: user.student?.bloodType ?? null,
			phone: user.student?.phone ?? null,
			address: user.student?.address ?? null,
			locality: user.student?.locality ?? null,
			postalCode: user.student?.postalCode ?? null,
			highSchool: user.student?.highSchool ?? null,
			highSchoolYear: user.student?.highSchoolYear ?? null,
			instituteYear: user.student?.instituteYear ?? null,
			familyContactName: user.student?.familyContactName ?? null,
			familyContactPhone: user.student?.familyContactPhone ?? null,
			familyRelationship: user.student?.familyRelationship ?? null
		})),
		careers,
		locations: filterableLocations,
		hasGlobalAccess,
		selectedLocationId,
		filter: careerId ? { careerId, careerName } : null
	};
};
