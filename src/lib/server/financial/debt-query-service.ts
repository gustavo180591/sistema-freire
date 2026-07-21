import { prisma } from '../db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import * as DecimalHelpers from './decimal-helpers';

export type DebtStudentFilters = {
	search?: string;
	careerId?: string;
	locationId?: string;
	studentType?: 'NORMAL' | 'BECADO' | 'RECURSANT';
	financialStatus?: 'with_debt' | 'overdue' | 'not_overdue' | 'blocked' | 'not_blocked';
	academicStatus?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'GRADUATED';
	conceptCode?: string;
	periodFrom?: string;
	periodTo?: string;
	minDebt?: number;
	maxDebt?: number;
	overdueCharges?: '1_or_more' | '2_or_more' | '3_or_more';
	page?: number;
	pageSize?: number;
	sortBy?:
		| 'debt_desc'
		| 'debt_asc'
		| 'overdue_desc'
		| 'name_asc'
		| 'career_asc'
		| 'location_asc'
		| 'oldest_due_date';
};

export type DebtStudent = {
	id: string;
	firstName: string;
	lastName: string;
	dni: string;
	email?: string;
	careerId?: string;
	careerName?: string;
	locationId?: string;
	locationName?: string;
	currentYear?: number;
	isBecado: boolean;
	isRecursante: boolean;
	status: string;
	totalDebt: number;
	overdueDebt: number;
	pendingCharges: number;
	overdueCharges: number;
	oldestDueDate?: Date;
	isBlocked: boolean;
};

export type DebtStudentsResult = {
	students: DebtStudent[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type FilterOptions = {
	careers: Array<{ id: string; name: string }>;
	locations: Array<{ id: string; name: string }>;
	concepts: Array<{ code: string; name: string }>;
};

export class DebtQueryService {
	/**
	 * Get students with debt based on filters
	 */
	async getDebtStudents(filters: DebtStudentFilters = {}): Promise<DebtStudentsResult> {
		const page = filters.page || 1;
		const pageSize = filters.pageSize || 25;
		const skip = (page - 1) * pageSize;

		// Build where clause for students
		const studentWhere: any = {};

		// Search filter (name, last name, DNI, email)
		if (filters.search) {
			studentWhere.OR = [
				{ firstName: { contains: filters.search, mode: 'insensitive' } },
				{ lastName: { contains: filters.search, mode: 'insensitive' } },
				{ dni: { contains: filters.search } },
				{ user: { email: { contains: filters.search, mode: 'insensitive' } } }
			];
		}

		// Career filter
		if (filters.careerId) {
			studentWhere.careerId = filters.careerId;
		}

		// Location filter
		if (filters.locationId) {
			studentWhere.locationId = filters.locationId;
		}

		// Student type filter
		if (filters.studentType === 'BECADO') {
			studentWhere.isBecado = true;
		} else if (filters.studentType === 'RECURSANT') {
			studentWhere.isRecursante = true;
		} else if (filters.studentType === 'NORMAL') {
			studentWhere.isBecado = false;
			studentWhere.isRecursante = false;
		}

		// Academic status filter
		if (filters.academicStatus) {
			studentWhere.status = filters.academicStatus;
		}

		// Get students matching basic filters
		const students = await prisma.student.findMany({
			where: studentWhere,
			include: {
				user: true,
				career: true,
				location: true,
				studentCharges: {
					where: {
						status: { in: ['PENDING', 'PARTIAL'] }
					},
					include: {
						concept: true
					}
				}
			},
			orderBy: this.getOrderBy(filters.sortBy)
		});

		// Calculate debt metrics for each student
		const now = new Date();
		const studentsWithDebt: DebtStudent[] = [];

		for (const student of students) {
			let totalDebt = 0;
			let overdueDebt = 0;
			let pendingCharges = 0;
			let overdueCharges = 0;
			let oldestDueDate: Date | undefined;

			for (const charge of student.studentCharges) {
				const pending = Number(charge.finalAmount) - Number(charge.paidAmount);
				if (pending > 0) {
					pendingCharges++;
					totalDebt += pending;

					// Check if overdue
					const isOverdue = charge.dueDate && charge.dueDate < now;
					if (isOverdue) {
						overdueDebt += pending;
						if (charge.concept.code === 'CUOTA_MENSUAL') {
							overdueCharges++;
						}
					}

					// Track oldest due date
					if (charge.dueDate && (!oldestDueDate || charge.dueDate < oldestDueDate)) {
						oldestDueDate = charge.dueDate;
					}
				}
			}

			// Apply financial status filters
			if (filters.financialStatus === 'with_debt' && totalDebt === 0) continue;
			if (filters.financialStatus === 'overdue' && overdueDebt === 0) continue;
			if (filters.financialStatus === 'not_overdue' && overdueDebt > 0) continue;
			if (filters.financialStatus === 'blocked' && !student.financialBlocked) continue;
			if (filters.financialStatus === 'not_blocked' && student.financialBlocked) continue;

			// Apply concept filter
			if (filters.conceptCode) {
				const hasConcept = student.studentCharges.some(
					(c) => c.concept.code === filters.conceptCode
				);
				if (!hasConcept) continue;
			}

			// Apply period filter
			if (filters.periodFrom || filters.periodTo) {
				const hasPeriodInRange = student.studentCharges.some((c) => {
					if (!c.periodLabel) return false;
					if (filters.periodFrom && c.periodLabel < filters.periodFrom) return false;
					if (filters.periodTo && c.periodLabel > filters.periodTo) return false;
					return true;
				});
				if (!hasPeriodInRange) continue;
			}

			// Apply debt amount filters
			if (filters.minDebt && totalDebt < filters.minDebt) continue;
			if (filters.maxDebt && totalDebt > filters.maxDebt) continue;

			// Apply overdue charges filter
			if (filters.overdueCharges === '1_or_more' && overdueCharges < 1) continue;
			if (filters.overdueCharges === '2_or_more' && overdueCharges < 2) continue;
			if (filters.overdueCharges === '3_or_more' && overdueCharges < 3) continue;

			// Only include students with debt if not specifically filtering for blocked students
			if (totalDebt === 0 && filters.financialStatus !== 'blocked') continue;

			studentsWithDebt.push({
				id: student.id,
				firstName: student.firstName,
				lastName: student.lastName,
				dni: student.dni,
				email: student.user?.email || undefined,
				careerId: student.careerId,
				careerName: student.career?.name,
				locationId: student.locationId ?? undefined,
				locationName: student.location && student.location.name ? student.location.name : undefined,
				currentYear: student.currentYear,
				isBecado: student.isBecado,
				isRecursante: student.isRecursante,
				status: student.status,
				totalDebt,
				overdueDebt,
				pendingCharges,
				overdueCharges,
				oldestDueDate,
				isBlocked: student.financialBlocked
			});
		}

		// Apply sorting after calculation (for debt-based sorting)
		this.applySorting(studentsWithDebt, filters.sortBy);

		// Calculate pagination
		const total = studentsWithDebt.length;
		const totalPages = Math.ceil(total / pageSize);
		const paginatedStudents = studentsWithDebt.slice(skip, skip + pageSize);

		return {
			students: paginatedStudents,
			total,
			page,
			pageSize,
			totalPages
		};
	}

	/**
	 * Get filter options for the debt students query
	 */
	async getDebtStudentsFilters(): Promise<FilterOptions> {
		const [careers, locations, concepts] = await Promise.all([
			prisma.career.findMany({
				where: { active: true },
				select: { id: true, name: true },
				orderBy: { name: 'asc' }
			}),
			prisma.location.findMany({
				select: { id: true, name: true },
				orderBy: { name: 'asc' }
			}),
			prisma.chargeConcept.findMany({
				where: { active: true },
				select: { code: true, name: true },
				orderBy: { name: 'asc' }
			})
		]);

		return {
			careers,
			locations,
			concepts
		};
	}

	/**
	 * Get order by clause for Prisma query
	 */
	private getOrderBy(sortBy?: string): any {
		switch (sortBy) {
			case 'name_asc':
				return [{ lastName: 'asc' }, { firstName: 'asc' }];
			case 'career_asc':
				return { career: { name: 'asc' } };
			case 'location_asc':
				return { location: { name: 'asc' } };
			default:
				return [{ lastName: 'asc' }, { firstName: 'asc' }];
		}
	}

	/**
	 * Apply sorting to the calculated results (for debt-based sorting)
	 */
	private applySorting(students: DebtStudent[], sortBy?: string): void {
		switch (sortBy) {
			case 'debt_desc':
				students.sort((a, b) => b.totalDebt - a.totalDebt);
				break;
			case 'debt_asc':
				students.sort((a, b) => a.totalDebt - b.totalDebt);
				break;
			case 'overdue_desc':
				students.sort((a, b) => b.overdueDebt - a.overdueDebt);
				break;
			case 'oldest_due_date':
				students.sort((a, b) => {
					if (!a.oldestDueDate) return 1;
					if (!b.oldestDueDate) return -1;
					return a.oldestDueDate.getTime() - b.oldestDueDate.getTime();
				});
				break;
		}
	}
}

export const debtQueryService = new DebtQueryService();
