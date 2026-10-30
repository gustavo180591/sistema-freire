import { prisma } from '$lib/server/db/prisma';
import {
	deriveAcademicTrajectoryState,
	hasLegacyAcademicEvidence,
	type AcademicTrajectorySubjectState
} from './academic-trajectory';

type ApprovalMethod = 'FINAL_EXAM' | 'PROMOTION' | 'EQUIVALENCE' | 'LEGACY';

type CourseAttempt = {
	id: string;
	academicYear: number | null;
	attemptType: 'FIRST_TIME' | 'REPEAT' | null;
	recordSource: 'SYSTEM' | 'MANUAL' | 'IMPORT';
	status: string;
	enrolledAt: Date;
	commissionCode: string | null;
	courseResult: {
		courseAverage: number | null;
		courseStatus: string;
		academicStatus: string;
		approved: boolean;
		promoted: boolean;
		finalGrade: number | null;
		regularizedAt: Date | null;
		regularityExpiresAt: Date | null;
	} | null;
};

type FinalExamAttempt = {
	gradeId: string;
	evaluationId: string;
	evaluationType: string;
	evaluationDate: Date;
	callNumber: number | null;
	status: string;
	grade: number | null;
	passed: boolean | null;
	observations: string | null;
};

export interface AcademicTrajectorySubject {
	id: string;
	code: string;
	name: string;
	yearLevel: number;
	sortOrder: number;
	active: boolean;
	state: AcademicTrajectorySubjectState;
	approval: {
		method: ApprovalMethod;
		source: 'SYSTEM' | 'MANUAL' | 'IMPORT' | 'LEGACY';
		accreditedAt: Date | null;
		academicYear: number | null;
		grade: number | null;
		observations: string | null;
	} | null;
	currentEnrollment: {
		id: string;
		academicYear: number | null;
		attemptType: 'FIRST_TIME' | 'REPEAT' | null;
		recordSource: 'SYSTEM' | 'MANUAL' | 'IMPORT';
		commissionCode: string | null;
	} | null;
	regularity: {
		status: 'REGULAR' | 'LIBRE' | null;
		regularizedAt: Date | null;
		expiresAt: Date | null;
		expired: boolean;
	} | null;
	courseAttempts: CourseAttempt[];
	finalExamAttempts: FinalExamAttempt[];
}

function numberOrNull(value: unknown): number | null {
	if (value === null || value === undefined) return null;

	return Number(value);
}

function enrollmentAcademicYear(enrollment: {
	academicYear: number | null;
	academicTerm: { year: number } | null;
	enrolledAt: Date;
}): number {
	return (
		enrollment.academicYear ?? enrollment.academicTerm?.year ?? enrollment.enrolledAt.getFullYear()
	);
}

export async function getStudentAcademicTrajectory(studentId: string) {
	const student = await prisma.student.findUnique({
		where: {
			id: studentId
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			dni: true,
			status: true,
			currentYear: true,
			careerId: true,
			locationId: true,
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
			},
			subjectStatuses: {
				select: {
					subjectId: true,
					regularityStatus: true,
					approved: true,
					promoted: true,
					finalGrade: true,
					promotionDate: true,
					finalApprovalDate: true,
					finalExamScore: true,
					finalExamStatus: true,
					academicStatus: true,
					courseStatus: true,
					courseAverage: true,
					subject: {
						select: {
							id: true,
							code: true,
							name: true,
							yearLevel: true,
							active: true
						}
					}
				}
			},
			subjectAccreditations: {
				select: {
					id: true,
					subjectId: true,
					type: true,
					source: true,
					accreditedAt: true,
					academicYear: true,
					grade: true,
					observations: true,
					subject: {
						select: {
							id: true,
							code: true,
							name: true,
							yearLevel: true,
							active: true
						}
					}
				}
			},
			enrollments: {
				select: {
					id: true,
					subjectId: true,
					status: true,
					academicYear: true,
					attemptType: true,
					recordSource: true,
					enrolledAt: true,
					academicTerm: {
						select: {
							year: true
						}
					},
					commission: {
						select: {
							code: true
						}
					},
					courseResult: {
						select: {
							courseAverage: true,
							courseStatus: true,
							academicStatus: true,
							approved: true,
							promoted: true,
							finalGrade: true,
							regularizedAt: true,
							regularityExpiresAt: true
						}
					},
					subject: {
						select: {
							id: true,
							code: true,
							name: true,
							yearLevel: true,
							active: true
						}
					}
				}
			}
		}
	});

	if (!student) {
		return null;
	}

	const defaultStudyPlan = await prisma.studyPlan.findFirst({
		where: {
			careerId: student.careerId,
			active: true,
			isDefault: true
		},
		select: {
			id: true,
			name: true,
			version: true
		}
	});

	const studyPlan =
		defaultStudyPlan ??
		(await prisma.studyPlan.findFirst({
			where: {
				careerId: student.careerId,
				active: true
			},
			orderBy: {
				createdAt: 'desc'
			},
			select: {
				id: true,
				name: true,
				version: true
			}
		}));

	const planSubjects = studyPlan
		? await prisma.planSubject.findMany({
				where: {
					planId: studyPlan.id
				},
				orderBy: {
					sortOrder: 'asc'
				},
				select: {
					sortOrder: true,
					subject: {
						select: {
							id: true,
							code: true,
							name: true,
							yearLevel: true,
							active: true
						}
					}
				}
			})
		: [];

	const careerSubjects = await prisma.careerSubject.findMany({
		where: {
			careerId: student.careerId
		},
		select: {
			yearLevel: true,
			subject: {
				select: {
					id: true,
					code: true,
					name: true,
					yearLevel: true,
					active: true
				}
			}
		}
	});

	const finalGrades = await prisma.grade.findMany({
		where: {
			studentId,
			evaluation: {
				type: {
					in: ['EXAMEN_FINAL', 'MESA_EXAMEN']
				}
			}
		},
		orderBy: {
			evaluation: {
				evaluationDate: 'asc'
			}
		},
		select: {
			id: true,
			value: true,
			qualitativeValue: true,
			status: true,
			observations: true,
			evaluation: {
				select: {
					id: true,
					subjectId: true,
					type: true,
					gradingMode: true,
					evaluationDate: true,
					examCallNumber: true,
					minPassingScore: true,
					subject: {
						select: {
							id: true,
							code: true,
							name: true,
							yearLevel: true,
							active: true
						}
					}
				}
			}
		}
	});

	const subjectCatalog = new Map<
		string,
		{
			id: string;
			code: string;
			name: string;
			yearLevel: number;
			active: boolean;
			sortOrder: number;
		}
	>();

	const planSortOrder = new Map(
		planSubjects.map((planSubject) => [planSubject.subject.id, planSubject.sortOrder])
	);

	for (const careerSubject of careerSubjects) {
		subjectCatalog.set(careerSubject.subject.id, {
			...careerSubject.subject,
			yearLevel: careerSubject.yearLevel,
			sortOrder: planSortOrder.get(careerSubject.subject.id) ?? Number.MAX_SAFE_INTEGER
		});
	}

	const statusBySubject = new Map(
		student.subjectStatuses.map((status) => [status.subjectId, status])
	);

	const accreditationBySubject = new Map(
		student.subjectAccreditations.map((accreditation) => [accreditation.subjectId, accreditation])
	);

	const enrollmentsBySubject = new Map<string, typeof student.enrollments>();

	for (const enrollment of student.enrollments) {
		const entries = enrollmentsBySubject.get(enrollment.subjectId) ?? [];
		entries.push(enrollment);
		enrollmentsBySubject.set(enrollment.subjectId, entries);
	}

	const finalsBySubject = new Map<string, typeof finalGrades>();

	for (const grade of finalGrades) {
		const subjectId = grade.evaluation.subjectId;
		const entries = finalsBySubject.get(subjectId) ?? [];
		entries.push(grade);
		finalsBySubject.set(subjectId, entries);
	}

	const now = new Date();

	const subjects: AcademicTrajectorySubject[] = [...subjectCatalog.values()]
		.map((subject) => {
			const legacyStatus = statusBySubject.get(subject.id) ?? null;
			const accreditation = accreditationBySubject.get(subject.id) ?? null;

			const enrollments = [...(enrollmentsBySubject.get(subject.id) ?? [])].sort((a, b) => {
				const yearDifference = enrollmentAcademicYear(b) - enrollmentAcademicYear(a);

				if (yearDifference !== 0) return yearDifference;

				return b.enrolledAt.getTime() - a.enrolledAt.getTime();
			});

			const activeEnrollment =
				enrollments.find((enrollment) => enrollment.status === 'ACTIVE') ?? null;
			const latestEnrollmentWithResult =
				enrollments.find((enrollment) => enrollment.courseResult !== null) ?? null;
			const latestCourseResult = latestEnrollmentWithResult?.courseResult ?? null;

			const hasPriorEnrollment = activeEnrollment
				? enrollments.some((enrollment) => enrollment.id !== activeEnrollment.id)
				: enrollments.length > 1;

			const legacyHasAcademicEvidence = hasLegacyAcademicEvidence(
				legacyStatus
					? {
							regularityStatus: legacyStatus.regularityStatus,
							approved: legacyStatus.approved,
							promoted: legacyStatus.promoted,
							finalGrade: numberOrNull(legacyStatus.finalGrade),
							promotionDate: legacyStatus.promotionDate,
							finalApprovalDate: legacyStatus.finalApprovalDate,
							finalExamScore: numberOrNull(legacyStatus.finalExamScore),
							finalExamStatus: legacyStatus.finalExamStatus,
							academicStatus: legacyStatus.academicStatus,
							courseStatus: legacyStatus.courseStatus,
							courseAverage: numberOrNull(legacyStatus.courseAverage)
						}
					: null
			);

			let regularityStatus: 'REGULAR' | 'LIBRE' | null = null;

			if (
				latestCourseResult?.courseStatus === 'PASSED_COURSE' ||
				latestCourseResult?.academicStatus === 'REGULAR'
			) {
				regularityStatus = 'REGULAR';
			} else if (
				latestCourseResult?.courseStatus === 'FAILED_COURSE' ||
				latestCourseResult?.academicStatus === 'LIBRE'
			) {
				regularityStatus = 'LIBRE';
			} else if (legacyHasAcademicEvidence) {
				regularityStatus = legacyStatus?.regularityStatus ?? null;
			}

			const regularityExpiresAt = latestCourseResult?.regularityExpiresAt ?? null;

			const hasAcademicRecord =
				legacyHasAcademicEvidence ||
				Boolean(accreditation) ||
				enrollments.length > 0 ||
				(finalsBySubject.get(subject.id)?.length ?? 0) > 0;

			const state = deriveAcademicTrajectoryState(
				{
					accreditationType: accreditation?.type ?? null,
					hasActiveEnrollment: Boolean(activeEnrollment),
					activeEnrollmentAttemptType: activeEnrollment?.attemptType ?? null,
					hasPriorEnrollment,
					regularityStatus,
					regularityExpiresAt,
					latestCourseStatus: latestCourseResult?.courseStatus ?? null,
					legacyAcademicStatus: legacyStatus?.academicStatus ?? null,
					legacyApproved: legacyStatus?.approved ?? false,
					hasAcademicRecord
				},
				now
			);

			const approval = accreditation
				? {
						method: accreditation.type as ApprovalMethod,
						source: accreditation.source,
						accreditedAt: accreditation.accreditedAt,
						academicYear: accreditation.academicYear,
						grade: numberOrNull(accreditation.grade),
						observations: accreditation.observations
					}
				: legacyStatus?.approved
					? {
							method: (legacyStatus.promoted ? 'PROMOTION' : 'LEGACY') as ApprovalMethod,
							source: 'LEGACY' as const,
							accreditedAt: legacyStatus.finalApprovalDate ?? legacyStatus.promotionDate ?? null,
							academicYear:
								(legacyStatus.finalApprovalDate ?? legacyStatus.promotionDate)?.getFullYear() ??
								null,
							grade:
								numberOrNull(legacyStatus.finalExamScore) ?? numberOrNull(legacyStatus.finalGrade),
							observations: null
						}
					: null;

			const courseAttempts: CourseAttempt[] = enrollments
				.map((enrollment) => ({
					id: enrollment.id,
					academicYear:
						enrollment.academicYear ??
						enrollment.academicTerm?.year ??
						enrollment.enrolledAt.getFullYear(),
					attemptType: enrollment.attemptType,
					recordSource: enrollment.recordSource,
					status: enrollment.status,
					enrolledAt: enrollment.enrolledAt,
					commissionCode: enrollment.commission?.code ?? null,
					courseResult: enrollment.courseResult
						? {
								courseAverage: numberOrNull(enrollment.courseResult.courseAverage),
								courseStatus: enrollment.courseResult.courseStatus,
								academicStatus: enrollment.courseResult.academicStatus,
								approved: enrollment.courseResult.approved,
								promoted: enrollment.courseResult.promoted,
								finalGrade: numberOrNull(enrollment.courseResult.finalGrade),
								regularizedAt: enrollment.courseResult.regularizedAt,
								regularityExpiresAt: enrollment.courseResult.regularityExpiresAt
							}
						: null
				}))
				.sort((a, b) => {
					const yearDifference = (b.academicYear ?? 0) - (a.academicYear ?? 0);

					if (yearDifference !== 0) return yearDifference;

					return b.enrolledAt.getTime() - a.enrolledAt.getTime();
				});

			const finalExamAttempts: FinalExamAttempt[] = (finalsBySubject.get(subject.id) ?? []).map(
				(grade) => {
					const numericGrade = numberOrNull(grade.value);

					let passed: boolean | null = null;

					if (grade.status === 'PRESENT') {
						if (grade.evaluation.gradingMode === 'QUALITATIVE') {
							passed = grade.qualitativeValue === 'APPROVED';
						} else if (numericGrade !== null) {
							passed = numericGrade >= Number(grade.evaluation.minPassingScore);
						}
					}

					return {
						gradeId: grade.id,
						evaluationId: grade.evaluation.id,
						evaluationType: grade.evaluation.type,
						evaluationDate: grade.evaluation.evaluationDate,
						callNumber: grade.evaluation.examCallNumber,
						status: grade.status,
						grade: numericGrade,
						passed,
						observations: grade.observations
					};
				}
			);

			return {
				id: subject.id,
				code: subject.code,
				name: subject.name,
				yearLevel: subject.yearLevel,
				sortOrder: subject.sortOrder,
				active: subject.active,
				state,
				approval,
				currentEnrollment: activeEnrollment
					? {
							id: activeEnrollment.id,
							academicYear:
								activeEnrollment.academicYear ??
								activeEnrollment.academicTerm?.year ??
								activeEnrollment.enrolledAt.getFullYear(),
							attemptType: activeEnrollment.attemptType,
							recordSource: activeEnrollment.recordSource,
							commissionCode: activeEnrollment.commission?.code ?? null
						}
					: null,
				regularity:
					regularityStatus !== null
						? {
								status: regularityStatus,
								regularizedAt: latestCourseResult?.regularizedAt ?? null,
								expiresAt: regularityExpiresAt,
								expired:
									regularityExpiresAt !== null && regularityExpiresAt.getTime() < now.getTime()
							}
						: null,
				courseAttempts,
				finalExamAttempts
			};
		})
		.sort((a, b) => {
			if (a.yearLevel !== b.yearLevel) {
				return a.yearLevel - b.yearLevel;
			}

			if (a.sortOrder !== b.sortOrder) {
				return a.sortOrder - b.sortOrder;
			}

			return a.name.localeCompare(b.name, 'es');
		});

	const subjectsByYear = [...new Set(subjects.map((subject) => subject.yearLevel))]
		.sort((a, b) => a - b)
		.map((yearLevel) => ({
			yearLevel,
			subjects: subjects.filter((subject) => subject.yearLevel === yearLevel)
		}));

	const metrics = {
		totalSubjects: subjects.length,
		approved: subjects.filter((subject) => subject.state === 'APPROVED').length,
		taking: subjects.filter((subject) => subject.state === 'TAKING').length,
		retaking: subjects.filter((subject) => subject.state === 'RETAKING').length,
		pendingFinals: subjects.filter((subject) => subject.state === 'REGULAR').length,
		expiredRegularities: subjects.filter((subject) => subject.state === 'REGULAR_EXPIRED').length,
		free: subjects.filter((subject) => subject.state === 'FREE').length
	};

	return {
		student: {
			id: student.id,
			fullName: `${student.firstName} ${student.lastName}`,
			dni: student.dni,
			status: student.status,
			currentYear: student.currentYear,
			career: student.career,
			location: student.location
		},
		studyPlan,
		metrics,
		hasCurrentCoursework: metrics.taking + metrics.retaking > 0,
		hasPendingFinals: metrics.pendingFinals > 0,
		subjects,
		subjectsByYear
	};
}
