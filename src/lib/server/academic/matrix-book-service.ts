import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { formatGradeInWords } from '$lib/utils/grade-in-words';

export interface MatrixBookStudentFilters {
	search?: string;
	careerId?: string;
	locationIds: string[];
}

export async function listMatrixBookStudents(filters: MatrixBookStudentFilters) {
	const search = filters.search?.trim() ?? '';
	const careerId = filters.careerId?.trim() ?? '';

	const where: Prisma.StudentWhereInput = {
		locationId: {
			in: filters.locationIds
		},
		...(careerId ? { careerId } : {}),
		...(search
			? {
					OR: [
						{ firstName: { contains: search, mode: 'insensitive' } },
						{ lastName: { contains: search, mode: 'insensitive' } },
						{ dni: { contains: search } }
					]
				}
			: {})
	};

	return prisma.student.findMany({
		where,
		select: {
			id: true,
			dni: true,
			firstName: true,
			lastName: true,
			status: true,
			currentYear: true,
			career: {
				select: {
					id: true,
					name: true
				}
			},
			studyPlan: {
				select: {
					id: true,
					name: true,
					code: true,
					version: true,
					resolution: true
				}
			}
		},
		orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
		take: 250
	});
}

export async function getMatrixBook(studentId: string) {
	const student = await prisma.student.findUnique({
		where: { id: studentId },
		select: {
			id: true,
			dni: true,
			firstName: true,
			lastName: true,
			status: true,
			birthDate: true,
			birthPlace: true,
			entryCertificateTitle: true,
			entryCertificateIssuer: true,
			highSchool: true,
			highSchoolYear: true,
			careerId: true,
			studyPlanId: true,
			career: {
				select: {
					id: true,
					name: true,
					durationYears: true
				}
			},
			studyPlan: {
				select: {
					id: true,
					code: true,
					name: true,
					version: true,
					resolution: true,
					durationYears: true
				}
			},
			location: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	if (!student) {
		return null;
	}

	const [plans, accreditations, subjectStatuses] = await Promise.all([
		prisma.studyPlan.findMany({
			where: {
				careerId: student.careerId,
				active: true
			},
			select: {
				id: true,
				code: true,
				name: true,
				version: true,
				resolution: true,
				durationYears: true,
				isDefault: true
			},
			orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
		}),
		prisma.subjectAccreditation.findMany({
			where: {
				studentId
			},
			select: {
				id: true,
				subjectId: true,
				type: true,
				source: true,
				accreditedAt: true,
				academicYear: true,
				grade: true,
				observations: true,
				folio: true,
				establishment: true,
				officialReference: true
			}
		}),
		prisma.studentSubjectStatus.findMany({
			where: {
				studentId
			},
			select: {
				subjectId: true,
				approved: true,
				promoted: true,
				finalGrade: true,
				promotionDate: true,
				finalApprovalDate: true,
				academicStatus: true,
				courseStatus: true
			}
		})
	]);

	const accreditationBySubject = new Map(
		accreditations.map((accreditation) => [accreditation.subjectId, accreditation])
	);

	const statusBySubject = new Map(subjectStatuses.map((status) => [status.subjectId, status]));

	let curriculumSource: 'STUDY_PLAN' | 'CAREER_REFERENCE';
	let curriculumSubjects: Array<{
		subjectId: string;
		code: string;
		name: string;
		yearLevel: number;
		sortOrder: number;
	}>;

	if (student.studyPlanId) {
		const planSubjects = await prisma.planSubject.findMany({
			where: {
				planId: student.studyPlanId
			},
			include: {
				subject: true
			},
			orderBy: {
				sortOrder: 'asc'
			}
		});

		curriculumSource = 'STUDY_PLAN';

		curriculumSubjects = planSubjects.map((entry) => ({
			subjectId: entry.subject.id,
			code: entry.subject.code,
			name: entry.subject.name,
			yearLevel: entry.subject.yearLevel,
			sortOrder: entry.sortOrder
		}));
	} else {
		const careerSubjects = await prisma.careerSubject.findMany({
			where: {
				careerId: student.careerId
			},
			include: {
				subject: true
			}
		});

		curriculumSource = 'CAREER_REFERENCE';

		curriculumSubjects = careerSubjects
			.map((entry, index) => ({
				subjectId: entry.subject.id,
				code: entry.subject.code,
				name: entry.subject.name,
				yearLevel: entry.yearLevel,
				sortOrder: index
			}))
			.sort(
				(a, b) =>
					a.yearLevel - b.yearLevel ||
					a.sortOrder - b.sortOrder ||
					a.name.localeCompare(b.name, 'es')
			);
	}

	const rows = curriculumSubjects.map((subject) => {
		const accreditation = accreditationBySubject.get(subject.subjectId) ?? null;
		const status = statusBySubject.get(subject.subjectId) ?? null;

		const grade =
			accreditation?.grade !== null && accreditation?.grade !== undefined
				? Number(accreditation.grade)
				: status?.finalGrade !== null && status?.finalGrade !== undefined
					? Number(status.finalGrade)
					: null;

		return {
			...subject,
			approved: status?.approved ?? Boolean(accreditation),
			promoted: status?.promoted ?? accreditation?.type === 'PROMOTION',
			academicStatus: status?.academicStatus ?? null,
			courseStatus: status?.courseStatus ?? null,
			accreditation: accreditation
				? {
						id: accreditation.id,
						type: accreditation.type,
						source: accreditation.source,
						accreditedAt: accreditation.accreditedAt,
						academicYear: accreditation.academicYear,
						grade,
						gradeInWords: formatGradeInWords(grade),
						observations: accreditation.observations,
						folio: accreditation.folio,
						establishment: accreditation.establishment,
						officialReference: accreditation.officialReference
					}
				: null
		};
	});

	const durationYears = student.studyPlan?.durationYears ?? student.career.durationYears;

	const years = Array.from({ length: durationYears }, (_, index) => index + 1).map((yearLevel) => ({
		yearLevel,
		rows: rows
			.filter((row) => row.yearLevel === yearLevel)
			.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'))
	}));
	const suggestedStudyPlanId =
		student.studyPlanId ??
		(plans.filter((plan) => plan.isDefault).length === 1
			? (plans.find((plan) => plan.isDefault)?.id ?? null)
			: plans.length === 1
				? plans[0].id
				: null);

	return {
		student,
		plans,
		suggestedStudyPlanId,
		curriculumSource,
		years
	};
}
