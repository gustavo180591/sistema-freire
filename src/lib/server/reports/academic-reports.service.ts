import { prisma } from '$lib/server/db/prisma';
import type { AcademicReportMetrics, ReportResult, ReportFilters } from './reports.types';

/**
 * Get academic report metrics
 */
export async function getAcademicReportMetrics(
	filters?: ReportFilters
): Promise<ReportResult<AcademicReportMetrics>> {
	const [
		totalStudents,
		activeStudents,
		studentsByCareer,
		studentsByStatus,
		totalSubjects,
		activeSubjects,
		totalTeachers,
		activeTeachers,
		totalCommissions,
		activeCommissions,
		totalEvaluations,
		totalGrades,
		averageGrade,
		regularCount,
		libreCount,
		riskStudents
	] = await Promise.all([
		// Students
		getTotalStudents(filters),
		getActiveStudents(filters),
		getStudentsByCareer(filters),
		getStudentsByStatus(filters),
		// Subjects
		getTotalSubjects(filters),
		getActiveSubjects(filters),
		// Teachers
		getTotalTeachers(filters),
		getActiveTeachers(filters),
		// Commissions
		getTotalCommissions(filters),
		getActiveCommissions(filters),
		// Evaluations and Grades
		getTotalEvaluations(filters),
		getTotalGrades(filters),
		getAverageGrade(filters),
		// Regularity and Risk
		getRegularCount(filters),
		getLibreCount(filters),
		getRiskStudents(filters)
	]);

	const metrics: AcademicReportMetrics = {
		totalStudents,
		activeStudents,
		studentsByCareer,
		studentsByStatus,
		totalSubjects,
		activeSubjects,
		totalTeachers,
		activeTeachers,
		totalCommissions,
		activeCommissions,
		totalEvaluations,
		totalGrades,
		averageGrade,
		regularCount,
		libreCount,
		riskStudents
	};

	return {
		data: metrics,
		generatedAt: new Date(),
		recordCount: 1
	};
}

/**
 * Get total students
 */
async function getTotalStudents(filters?: ReportFilters): Promise<number> {
	const where = buildStudentWhere(filters);
	return prisma.student.count({ where });
}

/**
 * Get active students
 */
async function getActiveStudents(filters?: ReportFilters): Promise<number> {
	const where = buildStudentWhere(filters);
	return prisma.student.count({ where: { ...where, status: 'ACTIVE' } });
}

/**
 * Get students grouped by career
 */
async function getStudentsByCareer(filters?: ReportFilters): Promise<Record<string, number>> {
	const where = buildStudentWhere(filters);
	const grouped = await prisma.student.groupBy({
		where,
		by: ['careerId'],
		_count: true
	});

	const careerIds = grouped.map((g) => g.careerId);
	const careers = await prisma.career.findMany({
		where: { id: { in: careerIds } },
		select: { id: true, name: true }
	});

	const careerMap = new Map(careers.map((c) => [c.id, c.name]));

	return grouped.reduce(
		(acc, item) => {
			const careerName = careerMap.get(item.careerId) || 'Unknown';
			acc[careerName] = item._count;
			return acc;
		},
		{} as Record<string, number>
	);
}

/**
 * Get students grouped by status
 */
async function getStudentsByStatus(filters?: ReportFilters): Promise<Record<string, number>> {
	const where = buildStudentWhere(filters);
	const grouped = await prisma.student.groupBy({
		where,
		by: ['status'],
		_count: true
	});

	return grouped.reduce(
		(acc, item) => {
			acc[item.status] = item._count;
			return acc;
		},
		{} as Record<string, number>
	);
}

/**
 * Get total subjects
 */
async function getTotalSubjects(filters?: ReportFilters): Promise<number> {
	const where = buildSubjectWhere(filters);
	return prisma.subject.count({ where });
}

/**
 * Get active subjects
 */
async function getActiveSubjects(filters?: ReportFilters): Promise<number> {
	const where = buildSubjectWhere(filters);
	return prisma.subject.count({ where: { ...where, active: true } });
}

/**
 * Get total teachers
 */
async function getTotalTeachers(filters?: ReportFilters): Promise<number> {
	return prisma.teacher.count();
}

/**
 * Get active teachers
 */
async function getActiveTeachers(filters?: ReportFilters): Promise<number> {
	return prisma.teacher.count({ where: { status: 'ACTIVE' } });
}

/**
 * Get total commissions
 */
async function getTotalCommissions(filters?: ReportFilters): Promise<number> {
	const where = buildCommissionWhere(filters);
	return prisma.subjectCommission.count({ where });
}

/**
 * Get active commissions
 */
async function getActiveCommissions(filters?: ReportFilters): Promise<number> {
	const where = buildCommissionWhere(filters);
	return prisma.subjectCommission.count({ where: { ...where, active: true } });
}

/**
 * Get total evaluations
 */
async function getTotalEvaluations(filters?: ReportFilters): Promise<number> {
	const where = buildEvaluationWhere(filters);
	return prisma.evaluation.count({ where });
}

/**
 * Get total grades
 */
async function getTotalGrades(filters?: ReportFilters): Promise<number> {
	const where = buildGradeWhere(filters);
	return prisma.grade.count({ where });
}

/**
 * Get average grade
 */
async function getAverageGrade(filters?: ReportFilters): Promise<number> {
	const where = buildGradeWhere(filters);
	const grades = await prisma.grade.findMany({
		where,
		select: { value: true }
	});

	if (grades.length === 0) return 0;

	const total = grades.reduce((acc, grade) => acc + Number(grade.value), 0);
	return total / grades.length;
}

/**
 * Get count of regular students
 */
async function getRegularCount(filters?: ReportFilters): Promise<number> {
	const where = buildStudentSubjectStatusWhere(filters);
	return prisma.studentSubjectStatus.count({
		where: { ...where, regularityStatus: 'REGULAR' }
	});
}

/**
 * Get count of libre students
 */
async function getLibreCount(filters?: ReportFilters): Promise<number> {
	const where = buildStudentSubjectStatusWhere(filters);
	return prisma.studentSubjectStatus.count({
		where: { ...where, regularityStatus: 'LIBRE' }
	});
}

/**
 * Get count of students at risk (low attendance)
 */
async function getRiskStudents(filters?: ReportFilters): Promise<number> {
	const THRESHOLD = 75;
	const where = buildStudentSubjectStatusWhere(filters);
	return prisma.studentSubjectStatus.count({
		where: { ...where, attendancePercent: { lt: THRESHOLD } }
	});
}

/**
 * Build where clause for students based on filters
 */
function buildStudentWhere(filters?: ReportFilters) {
	const where: {
		careerId?: string;
	} = {};

	if (filters?.careerId) {
		where.careerId = filters.careerId;
	}

	return where;
}

/**
 * Build where clause for subjects based on filters
 * Note: Subject does not have direct careerId field in schema.
 * Career relationship is through CareerSubject model.
 * For Phase 1, career filter is not applied to subjects.
 */
function buildSubjectWhere(filters?: ReportFilters): Record<string, unknown> {
	const where: Record<string, unknown> = {};

	// Note: careerId filter not applied to Subject due to schema structure
	// Subject relates to Career through CareerSubject model
	// This could be implemented in future phases with complex queries

	return where;
}

/**
 * Build where clause for commissions based on filters
 */
function buildCommissionWhere(filters?: ReportFilters) {
	const where: {
		subjectId?: string;
		teacherId?: string;
	} = {};

	if (filters?.subjectId) {
		where.subjectId = filters.subjectId;
	}

	if (filters?.teacherId) {
		where.teacherId = filters.teacherId;
	}

	return where;
}

/**
 * Build where clause for evaluations based on filters
 */
function buildEvaluationWhere(filters?: ReportFilters) {
	const where: {
		subjectId?: string;
	} = {};

	if (filters?.subjectId) {
		where.subjectId = filters.subjectId;
	}

	return where;
}

/**
 * Build where clause for grades based on filters
 */
function buildGradeWhere(filters?: ReportFilters) {
	const where: {
		studentId?: string;
	} = {};

	if (filters?.studentId) {
		where.studentId = filters.studentId;
	}

	return where;
}

/**
 * Build where clause for student subject status based on filters
 */
function buildStudentSubjectStatusWhere(filters?: ReportFilters) {
	const where: {
		studentId?: string;
		subjectId?: string;
	} = {};

	if (filters?.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters?.subjectId) {
		where.subjectId = filters.subjectId;
	}

	return where;
}
