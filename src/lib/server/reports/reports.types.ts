// Types for Reports Module
// Fase 1: Base server-side de reportes

export type InstitutionalMetrics = {
	totalStudents: number;
	activeStudents: number;
	totalTeachers: number;
	activeTeachers: number;
	totalUsers: number;
	activeUsers: number;
	totalDocuments: number;
	documentsByCategory: Record<string, number>;
	totalCareers: number;
	activeCareers: number;
	totalSubjects: number;
	activeSubjects: number;
	// Financial summary
	totalDebt: number;
	totalCollected: number;
	totalPending: number;
	overdueDebt: number;
	// Attendance summary
	averageAttendance: number;
	lowAttendanceCount: number;
};

export type FinancialReportMetrics = {
	totalCharges: number;
	totalPaid: number;
	totalPending: number;
	overdueDebt: number;
	studentsWithDebt: number;
	paymentsCount: number;
	totalCollected: number;
	receiptsIssued: number;
	receiptsCancelled: number;
	activeAgreements: number;
	overdueAgreements: number;
	defaultedAgreements: number;
};

export type AcademicReportMetrics = {
	totalStudents: number;
	activeStudents: number;
	studentsByCareer: Record<string, number>;
	studentsByStatus: Record<string, number>;
	totalSubjects: number;
	activeSubjects: number;
	totalTeachers: number;
	activeTeachers: number;
	totalCommissions: number;
	activeCommissions: number;
	totalEvaluations: number;
	totalGrades: number;
	averageGrade: number;
	regularCount: number;
	libreCount: number;
	riskStudents: number;
};

export type AttendanceReportMetrics = {
	totalAttendanceRecords: number;
	totalAttendanceEntries: number;
	presentCount: number;
	absentCount: number;
	justifiedCount: number;
	unjustifiedCount: number;
	averageAttendance: number;
	averageBySubject: Record<string, number>;
	averageByCommission: Record<string, number>;
};

export type ReportFilters = {
	careerId?: string;
	subjectId?: string;
	commissionId?: string;
	studentId?: string;
	teacherId?: string;
	startDate?: Date;
	endDate?: Date;
	locationId?: string;
};

export type ReportResult<T> = {
	data: T;
	generatedAt: Date;
	recordCount: number;
};
