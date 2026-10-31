import { describe, expect, it } from 'vitest';
import {
	deriveAcademicTrajectoryState,
	hasLegacyAcademicEvidence,
	applyCurrentYearProgression
} from './academic-trajectory';

const baseInput = {
	accreditationType: null,
	hasActiveEnrollment: false,
	activeEnrollmentAttemptType: null,
	hasPriorEnrollment: false,
	regularityStatus: null,
	regularityExpiresAt: null,
	latestCourseStatus: null,
	legacyAcademicStatus: null,
	legacyApproved: false,
	hasAcademicRecord: false
} as const;

describe('deriveAcademicTrajectoryState', () => {
	it('prioriza una acreditación definitiva', () => {
		expect(
			deriveAcademicTrajectoryState({
				...baseInput,
				accreditationType: 'FINAL_EXAM',
				hasActiveEnrollment: true
			})
		).toBe('APPROVED');
	});

	it('mantiene compatibilidad con aprobaciones históricas legacy', () => {
		expect(
			deriveAcademicTrajectoryState({
				...baseInput,
				legacyApproved: true,
				hasAcademicRecord: true
			})
		).toBe('APPROVED');
	});

	it('identifica una primera cursada activa', () => {
		expect(
			deriveAcademicTrajectoryState({
				...baseInput,
				hasActiveEnrollment: true,
				activeEnrollmentAttemptType: 'FIRST_TIME',
				hasAcademicRecord: true
			})
		).toBe('TAKING');
	});

	it('identifica una recursada explícita', () => {
		expect(
			deriveAcademicTrajectoryState({
				...baseInput,
				hasActiveEnrollment: true,
				activeEnrollmentAttemptType: 'REPEAT',
				hasAcademicRecord: true
			})
		).toBe('RETAKING');
	});

	it('infiere recursada cuando existe una cursada previa', () => {
		expect(
			deriveAcademicTrajectoryState({
				...baseInput,
				hasActiveEnrollment: true,
				hasPriorEnrollment: true,
				hasAcademicRecord: true
			})
		).toBe('RETAKING');
	});

	it('mantiene una regularidad sin vencimiento configurado como vigente', () => {
		expect(
			deriveAcademicTrajectoryState({
				...baseInput,
				regularityStatus: 'REGULAR',
				hasAcademicRecord: true
			})
		).toBe('REGULAR');
	});

	it('marca vencida solo una regularidad con fecha de vencimiento conocida', () => {
		expect(
			deriveAcademicTrajectoryState(
				{
					...baseInput,
					regularityStatus: 'REGULAR',
					regularityExpiresAt: new Date('2025-12-31T23:59:59Z'),
					hasAcademicRecord: true
				},
				new Date('2026-01-01T00:00:00Z')
			)
		).toBe('REGULAR_EXPIRED');
	});

	it('interpreta PASSED_COURSE como regularidad pendiente de aprobación definitiva', () => {
		expect(
			deriveAcademicTrajectoryState({
				...baseInput,
				latestCourseStatus: 'PASSED_COURSE',
				hasAcademicRecord: true
			})
		).toBe('REGULAR');
	});

	it('identifica una condición libre con antecedentes académicos', () => {
		expect(
			deriveAcademicTrajectoryState({
				...baseInput,
				regularityStatus: 'LIBRE',
				hasAcademicRecord: true
			})
		).toBe('FREE');
	});

	it('no convierte una materia sin antecedentes en libre por defecto', () => {
		expect(deriveAcademicTrajectoryState(baseInput)).toBe('NOT_STARTED');
	});

	it('ignora un StudentSubjectStatus legacy con todos sus valores por defecto', () => {
		expect(
			hasLegacyAcademicEvidence({
				regularityStatus: 'LIBRE',
				approved: false,
				promoted: false,
				finalGrade: null,
				promotionDate: null,
				finalApprovalDate: null,
				finalExamScore: null,
				finalExamStatus: 'PENDING',
				academicStatus: 'EN_COURSE',
				courseStatus: 'IN_PROGRESS',
				courseAverage: null
			})
		).toBe(false);
	});

	it('reconoce una regularidad legacy como evidencia académica real', () => {
		expect(
			hasLegacyAcademicEvidence({
				regularityStatus: 'REGULAR',
				approved: false,
				promoted: false,
				finalGrade: null,
				promotionDate: null,
				finalApprovalDate: null,
				finalExamScore: null,
				finalExamStatus: 'PENDING',
				academicStatus: 'REGULAR',
				courseStatus: 'PASSED_COURSE',
				courseAverage: 7
			})
		).toBe(true);
	});
});

describe('applyCurrentYearProgression', () => {
	it('marca como cursando las materias del primer año para un alumno de primer año', () => {
		const result = applyCurrentYearProgression(
			[
				{
					yearLevel: 1,
					state: 'NOT_STARTED' as const
				},
				{
					yearLevel: 1,
					state: 'NOT_STARTED' as const
				}
			],
			1
		);

		expect(result.map((subject) => subject.state)).toEqual(['TAKING', 'TAKING']);
	});

	it('marca el año actual como cursando cuando todos los años anteriores están aprobados', () => {
		const result = applyCurrentYearProgression(
			[
				{ yearLevel: 1, state: 'APPROVED' as const },
				{ yearLevel: 1, state: 'APPROVED' as const },
				{ yearLevel: 2, state: 'APPROVED' as const },
				{ yearLevel: 3, state: 'APPROVED' as const },
				{ yearLevel: 4, state: 'NOT_STARTED' as const },
				{ yearLevel: 4, state: 'NOT_STARTED' as const }
			],
			4
		);

		expect(
			result.filter((subject) => subject.yearLevel === 4).map((subject) => subject.state)
		).toEqual(['TAKING', 'TAKING']);
	});

	it('no habilita automáticamente el año actual si queda una materia anterior sin aprobar', () => {
		const result = applyCurrentYearProgression(
			[
				{ yearLevel: 1, state: 'APPROVED' as const },
				{ yearLevel: 2, state: 'REGULAR' as const },
				{ yearLevel: 3, state: 'NOT_STARTED' as const }
			],
			3
		);

		expect(result[2].state).toBe('NOT_STARTED');
	});

	it('preserva los estados reales existentes del año actual', () => {
		const result = applyCurrentYearProgression(
			[
				{ yearLevel: 1, state: 'APPROVED' as const },
				{ yearLevel: 2, state: 'APPROVED' as const },
				{ yearLevel: 3, state: 'APPROVED' as const },
				{ yearLevel: 4, state: 'REGULAR' as const },
				{ yearLevel: 4, state: 'FREE' as const },
				{ yearLevel: 4, state: 'APPROVED' as const },
				{ yearLevel: 4, state: 'NOT_STARTED' as const }
			],
			4
		);

		expect(
			result.filter((subject) => subject.yearLevel === 4).map((subject) => subject.state)
		).toEqual(['REGULAR', 'FREE', 'APPROVED', 'TAKING']);
	});
});
