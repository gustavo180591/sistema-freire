export type AcademicTrajectorySubjectState =
	| 'APPROVED'
	| 'TAKING'
	| 'RETAKING'
	| 'REGULAR'
	| 'REGULAR_EXPIRED'
	| 'FREE'
	| 'NOT_STARTED';

export type AcademicRecordSourceValue = 'SYSTEM' | 'MANUAL' | 'IMPORT';

export type TrajectoryAccreditationType =
	| 'FINAL_EXAM'
	| 'PROMOTION'
	| 'EQUIVALENCE'
	| 'UNSPECIFIED';

export type ApprovalMethod = TrajectoryAccreditationType | 'LEGACY';

export interface AcademicTrajectoryCourseAttempt {
	id: string;
	academicYear: number | null;
	attemptType: 'FIRST_TIME' | 'REPEAT' | null;
	recordSource: AcademicRecordSourceValue;
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
}

export interface AcademicTrajectoryFinalExamAttempt {
	gradeId: string;
	evaluationId: string;
	evaluationType: string;
	evaluationDate: Date;
	callNumber: number | null;
	status: string;
	grade: number | null;
	passed: boolean | null;
	observations: string | null;
}

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
		source: AcademicRecordSourceValue | 'LEGACY';
		accreditedAt: Date | null;
		academicYear: number | null;
		grade: number | null;
		observations: string | null;
	} | null;
	currentEnrollment: {
		id: string;
		academicYear: number | null;
		attemptType: 'FIRST_TIME' | 'REPEAT' | null;
		recordSource: AcademicRecordSourceValue;
		commissionCode: string | null;
	} | null;
	regularity: {
		status: 'REGULAR' | 'LIBRE' | null;
		regularizedAt: Date | null;
		expiresAt: Date | null;
		expired: boolean;
	} | null;
	courseAttempts: AcademicTrajectoryCourseAttempt[];
	finalExamAttempts: AcademicTrajectoryFinalExamAttempt[];
}
