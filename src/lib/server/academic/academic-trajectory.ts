import type {
	AcademicTrajectorySubjectState,
	TrajectoryAccreditationType
} from '$lib/types/academic-trajectory';

export interface DeriveAcademicTrajectoryStateInput {
	accreditationType: TrajectoryAccreditationType | null;
	hasActiveEnrollment: boolean;
	activeEnrollmentAttemptType: 'FIRST_TIME' | 'REPEAT' | null;
	hasPriorEnrollment: boolean;
	regularityStatus: 'REGULAR' | 'LIBRE' | null;
	regularityExpiresAt: Date | null;
	latestCourseStatus: 'IN_PROGRESS' | 'PASSED_COURSE' | 'FAILED_COURSE' | 'PROMOTED' | null;
	legacyAcademicStatus: 'EN_COURSE' | 'REGULAR' | 'LIBRE' | 'APROBADO' | 'PROMOCIONADO' | null;
	legacyApproved: boolean;
	hasAcademicRecord: boolean;
}

export interface LegacyAcademicEvidence {
	regularityStatus: 'REGULAR' | 'LIBRE';
	approved: boolean;
	promoted: boolean;
	finalGrade: number | null;
	promotionDate: Date | null;
	finalApprovalDate: Date | null;
	finalExamScore: number | null;
	finalExamStatus: 'PENDING' | 'NOT_REQUIRED' | 'PASSED' | 'FAILED';
	academicStatus: 'EN_COURSE' | 'REGULAR' | 'LIBRE' | 'APROBADO' | 'PROMOCIONADO';
	courseStatus: 'IN_PROGRESS' | 'PASSED_COURSE' | 'FAILED_COURSE' | 'PROMOTED';
	courseAverage: number | null;
}

export function isRegularityExpired(expiresAt: Date | null, now = new Date()): boolean {
	if (!expiresAt) return false;

	return expiresAt.getTime() < now.getTime();
}

export function hasLegacyAcademicEvidence(status: LegacyAcademicEvidence | null): boolean {
	if (!status) return false;

	return (
		status.approved ||
		status.promoted ||
		status.regularityStatus === 'REGULAR' ||
		status.academicStatus !== 'EN_COURSE' ||
		status.courseStatus !== 'IN_PROGRESS' ||
		status.finalExamStatus !== 'PENDING' ||
		status.finalGrade !== null ||
		status.courseAverage !== null ||
		status.promotionDate !== null ||
		status.finalApprovalDate !== null ||
		status.finalExamScore !== null
	);
}

export function deriveAcademicTrajectoryState(
	input: DeriveAcademicTrajectoryStateInput,
	now = new Date()
): AcademicTrajectorySubjectState {
	const hasDefinitiveApproval =
		input.accreditationType !== null ||
		input.legacyApproved ||
		input.latestCourseStatus === 'PROMOTED' ||
		input.legacyAcademicStatus === 'APROBADO' ||
		input.legacyAcademicStatus === 'PROMOCIONADO';

	if (hasDefinitiveApproval) {
		return 'APPROVED';
	}

	if (input.hasActiveEnrollment) {
		const isRetaking = input.activeEnrollmentAttemptType === 'REPEAT' || input.hasPriorEnrollment;

		return isRetaking ? 'RETAKING' : 'TAKING';
	}

	const hasRegularity =
		input.regularityStatus === 'REGULAR' ||
		input.latestCourseStatus === 'PASSED_COURSE' ||
		input.legacyAcademicStatus === 'REGULAR';

	if (hasRegularity) {
		return isRegularityExpired(input.regularityExpiresAt, now) ? 'REGULAR_EXPIRED' : 'REGULAR';
	}

	const hasFreeCondition =
		input.regularityStatus === 'LIBRE' ||
		input.latestCourseStatus === 'FAILED_COURSE' ||
		input.legacyAcademicStatus === 'LIBRE';

	if (input.hasAcademicRecord && hasFreeCondition) {
		return 'FREE';
	}

	return 'NOT_STARTED';
}

/**
 * Aplica la progresión académica implícita del año administrativo actual.
 *
 * Regla:
 * - Si TODAS las materias de años anteriores al currentYear están aprobadas,
 *   las materias del currentYear que todavía no poseen estado académico real
 *   se consideran cursando.
 * - No crea inscripciones ni modifica historial persistido.
 * - Cualquier estado académico real prevalece.
 */
export function applyCurrentYearProgression<
	T extends {
		yearLevel: number;
		state: AcademicTrajectorySubjectState;
	}
>(subjects: T[], currentYear: number): T[] {
	if (!Number.isInteger(currentYear) || currentYear < 1) {
		return subjects;
	}

	const previousYearSubjects = subjects.filter((subject) => subject.yearLevel < currentYear);

	const previousYearsFullyApproved = previousYearSubjects.every(
		(subject) => subject.state === 'APPROVED'
	);

	if (!previousYearsFullyApproved) {
		return subjects;
	}

	return subjects.map((subject) => {
		if (subject.yearLevel === currentYear && subject.state === 'NOT_STARTED') {
			return {
				...subject,
				state: 'TAKING' as AcademicTrajectorySubjectState
			};
		}

		return subject;
	});
}
