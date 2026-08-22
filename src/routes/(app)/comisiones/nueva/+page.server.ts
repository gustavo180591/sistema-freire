import type { Actions, PageServerLoad } from './$types';
import { Prisma } from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { fail, redirect } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/auth/permissions-granular';

const COMMISSION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
const COMMISSION_LETTER_VALUES: readonly string[] = COMMISSION_LETTERS;

type CommissionLetter = (typeof COMMISSION_LETTERS)[number];

function normalizeOptional(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function parseYearLevel(value: FormDataEntryValue | null): number | null {
	const normalized = normalizeOptional(value);
	if (!normalized) return null;

	const parsed = Number(normalized);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 7) return null;

	return parsed;
}

function parseCapacity(value: FormDataEntryValue | null): number | null {
	const normalized = normalizeOptional(value);
	if (!normalized) return null;

	const parsed = Number(normalized);
	if (!Number.isInteger(parsed) || parsed < 1) return null;

	return parsed;
}

function isCommissionLetter(value: string): value is CommissionLetter {
	return COMMISSION_LETTER_VALUES.includes(value);
}

function getSelectedLetters(formData: FormData): CommissionLetter[] {
	const rawValues = formData
		.getAll('letters')
		.filter((value): value is string => typeof value === 'string')
		.map((value) => value.trim().toUpperCase())
		.filter(isCommissionLetter);

	return Array.from(new Set(rawValues));
}

function inferSubjectCodePrefix(career: { code: string | null; name: string }): string | null {
	const source = `${career.code ?? ''} ${career.name}`.toUpperCase();

	if (source.includes('MAT')) return 'MAT-';
	if (source.includes('LENGUA') || source.includes('LITERATURA') || source.includes('LYL'))
		return 'LYL-';

	return null;
}

function normalizeCodePart(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	await requirePermission(user, 'SUBJECT_COMMISSION', 'create');

	const [careers, terms, locations] = await Promise.all([
		prisma.career.findMany({
			where: { active: true },
			orderBy: { name: 'asc' },
			select: {
				id: true,
				code: true,
				name: true
			}
		}),
		prisma.academicTerm.findMany({
			where: { active: true },
			orderBy: { startDate: 'desc' },
			select: {
				id: true,
				name: true,
				year: true
			}
		}),
		prisma.location.findMany({
			where: { active: true },
			orderBy: { name: 'asc' },
			select: {
				id: true,
				name: true
			}
		})
	]);

	return {
		careers,
		terms,
		locations
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		await requirePermission(user, 'SUBJECT_COMMISSION', 'create');

		const formData = await request.formData();

		const careerId = normalizeOptional(formData.get('careerId'));
		const yearLevel = parseYearLevel(formData.get('yearLevel'));
		const locationId = normalizeOptional(formData.get('locationId'));
		const academicTermId = normalizeOptional(formData.get('academicTermId'));
		const maxCapacity = parseCapacity(formData.get('maxCapacity'));
		const selectedLetters = getSelectedLetters(formData);

		if (!careerId || !yearLevel || !academicTermId || selectedLetters.length === 0) {
			return fail(400, {
				error: 'Seleccioná carrera, año, período lectivo y al menos una comisión.'
			});
		}

		const [career, academicTerm, studyPlan] = await Promise.all([
			prisma.career.findUnique({
				where: { id: careerId },
				select: {
					id: true,
					code: true,
					name: true
				}
			}),
			prisma.academicTerm.findUnique({
				where: { id: academicTermId },
				select: {
					id: true,
					name: true,
					year: true
				}
			}),
			prisma.studyPlan.findFirst({
				where: {
					careerId,
					active: true
				},
				orderBy: { version: 'desc' },
				select: {
					id: true
				}
			})
		]);

		if (!career) {
			return fail(404, { error: 'La carrera seleccionada no existe.' });
		}

		if (!academicTerm) {
			return fail(404, { error: 'El período lectivo seleccionado no existe.' });
		}

		const location = locationId
			? await prisma.location.findUnique({
					where: { id: locationId },
					select: {
						id: true,
						code: true,
						name: true
					}
				})
			: null;

		if (locationId && !location) {
			return fail(404, { error: 'La localidad seleccionada no existe.' });
		}

		const subjectCodePrefix = inferSubjectCodePrefix(career);

		const subjects = await prisma.subject.findMany({
			where: {
				active: true,
				yearLevel,
				...(subjectCodePrefix ? { code: { startsWith: subjectCodePrefix } } : {})
			},
			orderBy: [{ name: 'asc' }],
			select: {
				id: true,
				code: true,
				name: true
			}
		});

		if (subjects.length === 0) {
			return fail(400, {
				error:
					'No se encontraron materias activas para esa carrera y año. Revisá el plan de estudios o las materias cargadas.'
			});
		}

		let createdCount = 0;
		let existingCount = 0;

		for (const letter of selectedLetters) {
			for (const subject of subjects) {
				const generatedCode = normalizeCodePart(
					`${career.code ?? career.name}-${yearLevel}-${letter}-${subject.code}-${location?.code ?? 'SIN-SEDE'}-${academicTerm.year}-${academicTerm.name}`
				);

				const existing = await prisma.subjectCommission.findUnique({
					where: {
						code: generatedCode
					},
					select: {
						id: true
					}
				});

				if (existing) {
					existingCount += 1;
					continue;
				}

				try {
					await prisma.subjectCommission.create({
						data: {
							code: generatedCode,
							subjectId: subject.id,
							careerId,
							studyPlanId: studyPlan?.id ?? null,
							academicTermId,
							locationId,
							maxCapacity: maxCapacity ?? undefined,
							active: true,
							observations: `Comisión ${letter} generada automáticamente para ${career.name} - ${yearLevel}° año.`
						}
					});

					createdCount += 1;
				} catch (error) {
					if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
						existingCount += 1;
						continue;
					}

					throw error;
				}
			}
		}

		return {
			success: true,
			message: `Proceso finalizado. Se crearon ${createdCount} comisiones y ${existingCount} ya existían.`,
			createdCount,
			existingCount,
			subjectCount: subjects.length
		};
	}
};
