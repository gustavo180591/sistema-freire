import { prisma } from '$lib/server/db/prisma';
import type { Prisma } from '@prisma/client';
import type { PageServerLoad } from './$types';
import { getUserAllowedLocationIds } from '$lib/server/auth/authorization';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) {
		throw new Error('Usuario no autenticado');
	}

	const careerId = url.searchParams.get('carrera');
	const allowedLocationIds = await getUserAllowedLocationIds(locals.user.id);

	const where: Prisma.StudentWhereInput = careerId ? { careerId } : {};

	// Filtrar por localidades permitidas a través de la carrera
	if (allowedLocationIds.length > 0) {
		where.career = {
			locationId: { in: allowedLocationIds }
		};
	}
	
	const students = await prisma.student.findMany({
		where,
		include: {
			user: true,
			career: true
		},
		orderBy: [
			{ lastName: 'asc' },
			{ firstName: 'asc' }
		]
	});

	const careers = await prisma.career.findMany({
		where: {
			active: true,
			locationId: { in: allowedLocationIds }
		},
		orderBy: { name: 'asc' },
		select: { id: true, name: true }
	});

	type StudentWithRelations = Prisma.StudentGetPayload<{
		include: { user: true; career: true };
	}>;

	// Get career name if filtering by career
	let careerName = null;
	if (careerId && students.length > 0) {
		careerName = students[0].career.name;
	}
	
	return {
		students: students.map((s: StudentWithRelations) => ({
			id: s.id,
			userId: s.userId,
			dni: s.dni,
			firstName: s.firstName,
			lastName: s.lastName,
			email: s.user.email,
			career: s.career.name,
			careerId: s.careerId,
			status: s.status,
			isBecado: s.isBecado,
			isRecursante: s.isRecursante,
			currentYear: s.currentYear,
			createdAt: s.createdAt,
			// Campos extendidos
			birthDate: s.birthDate,
			bloodType: s.bloodType,
			phone: s.phone,
			address: s.address,
			locality: s.locality,
			postalCode: s.postalCode,
			highSchool: s.highSchool,
			highSchoolYear: s.highSchoolYear,
			instituteYear: s.instituteYear,
			familyContactName: s.familyContactName,
			familyContactPhone: s.familyContactPhone,
			familyRelationship: s.familyRelationship
		})),
		careers,
		filter: careerId ? { careerId, careerName } : null
	};
}
