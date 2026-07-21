import { prisma } from '$lib/server/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Servicio de reportes financieros
 * Centraliza la lógica de generación de reportes para el módulo de finanzas
 */

// Tipos de reporte
export type ReportType =
	| 'period_summary'
	| 'payments'
	| 'debt'
	| 'overdue_debt'
	| 'movements'
	| 'receipts'
	| 'discounts'
	| 'scholarships'
	| 'payment_methods'
	| 'charges';

// Parámetros de filtros para reportes
export type ReportFilters = {
	startDate?: Date;
	endDate?: Date;
	studentId?: string;
	studentSearch?: string; // nombre, apellido o DNI
	careerId?: string;
	locationId?: string;
	currentYear?: number;
	studentStatus?: string;
	studentType?: 'NORMAL' | 'BECADO' | 'RECURSANTE';
	conceptCode?: string;
	chargeStatus?: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
	paymentMethod?: string;
	movementType?: string;
	onlyOverdue?: boolean;
	onlyBlocked?: boolean;
	onlyCancelled?: boolean;
	page?: number;
	pageSize?: number;
};

// Resultado de paginación
export type PaginatedResult<T> = {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

// Métricas de reporte
export type ReportMetrics = {
	totalBilled?: number;
	totalCollected?: number;
	totalPending?: number;
	totalOverdue?: number;
	paymentCount?: number;
	studentCount?: number;
	receiptCount?: number;
	totalDiscounted?: number;
	totalScholarships?: number;
	totalLateFees?: number;
};

// Item de reporte de pagos
export type PaymentReportItem = {
	id: string;
	date: string;
	studentName: string;
	studentDni: string;
	method: string;
	reference: string | null;
	amount: number;
	userId: string;
	userName: string;
	receiptId: string | null;
	receiptNumber: number | null;
	receiptYear: number | null;
	status: string;
};

// Item de reporte de deuda
export type DebtReportItem = {
	studentId: string;
	studentName: string;
	studentDni: string;
	careerName: string;
	locationName: string;
	studentType: string;
	totalDebt: number;
	overdueDebt: number;
	pendingCharges: number;
	overdueCharges: number;
	isBlocked: boolean;
};

// Item de reporte de movimientos
export type MovementReportItem = {
	id: string;
	date: string;
	studentName: string;
	studentDni: string;
	movementType: string;
	description: string;
	amount: number;
	balanceBefore: number;
	balanceAfter: number;
	userId: string;
	userName: string;
	entityType: string;
	entityId: string | null;
};

// Item de reporte de recibos
export type ReceiptReportItem = {
	id: string;
	receiptNumber: number;
	receiptYear: number;
	date: string;
	studentName: string;
	studentDni: string;
	totalAmount: number;
	method: string;
	status: string;
	issuedBy: string;
	issuedByName: string;
};

// Item de reporte de descuentos/condonaciones
export type DiscountReportItem = {
	id: string;
	date: string;
	studentName: string;
	studentDni: string;
	chargeConcept: string;
	periodLabel: string | null;
	amount: number;
	reason: string;
	userId: string;
	userName: string;
};

// Item de reporte de becas
export type ScholarshipReportItem = {
	id: string;
	studentName: string;
	studentDni: string;
	chargeConcept: string;
	periodLabel: string | null;
	percentage: number;
	amount: number;
	appliedAt: string;
};

/**
 * Serializa valores monetarios de Decimal a Number
 */
function serializeMoney(value: Decimal | number | null | undefined): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === 'number') return value;
	return Number(value);
}

/**
 * Serializa fechas a string ISO
 */
function serializeDate(date: Date | null | undefined): string {
	if (!date) return '';
	return date.toISOString();
}

/**
 * Obtiene opciones de filtros para reportes
 */
export async function getFinancialReportFilters() {
	const careers = await prisma.career.findMany({
		where: { active: true },
		select: { id: true, name: true },
		orderBy: { name: 'asc' }
	});

	const locations = await prisma.location.findMany({
		where: { active: true },
		select: { id: true, name: true },
		orderBy: { name: 'asc' }
	});

	const concepts = await prisma.chargeConcept.findMany({
		where: { active: true },
		select: { id: true, code: true, name: true },
		orderBy: { name: 'asc' }
	});

	const currentYear = new Date().getFullYear();

	return {
		careers,
		locations,
		concepts,
		currentYear
	};
}

/**
 * Reporte de pagos registrados
 */
export async function getPaymentsReport(
	filters: ReportFilters
): Promise<PaginatedResult<PaymentReportItem> & { metrics: ReportMetrics }> {
	const page = filters.page || 1;
	const pageSize = filters.pageSize || 25;
	const skip = (page - 1) * pageSize;

	// Construir where clause
	const where: any = {};

	if (filters.startDate || filters.endDate) {
		where.paidAt = {};
		if (filters.startDate) where.paidAt.gte = filters.startDate;
		if (filters.endDate) where.paidAt.lte = filters.endDate;
	}

	if (filters.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters.studentSearch) {
		where.student = {
			OR: [
				{ firstName: { contains: filters.studentSearch, mode: 'insensitive' } },
				{ lastName: { contains: filters.studentSearch, mode: 'insensitive' } },
				{ dni: { contains: filters.studentSearch } }
			]
		};
	}

	if (filters.paymentMethod) {
		where.method = filters.paymentMethod;
	}

	if (filters.onlyCancelled) {
		where.isCancelled = true;
	}

	// Obtener pagos
	const [payments, total] = await Promise.all([
		prisma.payment.findMany({
			where,
			include: {
				student: {
					select: {
						firstName: true,
						lastName: true,
						dni: true
					}
				},
				user: {
					select: {
						firstName: true,
						lastName: true
					}
				},
				receipt: {
					select: {
						id: true,
						receiptNumber: true,
						receiptYear: true
					}
				}
			},
			orderBy: { paidAt: 'desc' },
			skip,
			take: pageSize
		}),
		prisma.payment.count({ where })
	]);

	// Serializar datos
	const data: PaymentReportItem[] = payments.map((p) => ({
		id: p.id,
		date: serializeDate(p.paidAt),
		studentName: `${p.student.firstName} ${p.student.lastName}`,
		studentDni: p.student.dni || '',
		method: p.method,
		reference: p.reference,
		amount: serializeMoney(p.amount),
		userId: p.userId || '',
		userName: p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Sistema',
		receiptId: p.receipt?.id || null,
		receiptNumber: p.receipt?.receiptNumber || null,
		receiptYear: p.receipt?.receiptYear || null,
		status: p.isCancelled ? 'CANCELLED' : 'ACTIVE'
	}));

	// Calcular métricas
	const metrics: ReportMetrics = {
		totalCollected: serializeMoney(
			payments.reduce((sum, p) => (p.isCancelled ? sum : sum + Number(p.amount)), 0)
		),
		paymentCount: payments.filter((p) => !p.isCancelled).length,
		studentCount: new Set(payments.map((p) => p.studentId)).size
	};

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
		metrics
	};
}

/**
 * Reporte de deudas por alumno
 */
export async function getDebtReport(
	filters: ReportFilters
): Promise<PaginatedResult<DebtReportItem> & { metrics: ReportMetrics }> {
	const page = filters.page || 1;
	const pageSize = filters.pageSize || 25;
	const skip = (page - 1) * pageSize;

	// Obtener alumnos con cargos pendientes
	const students = await prisma.student.findMany({
		where: {
			status: 'ACTIVE',
			...(filters.studentSearch && {
				OR: [
					{ firstName: { contains: filters.studentSearch, mode: 'insensitive' } },
					{ lastName: { contains: filters.studentSearch, mode: 'insensitive' } },
					{ dni: { contains: filters.studentSearch } }
				]
			}),
			...(filters.careerId && { careerId: filters.careerId }),
			...(filters.locationId && { locationId: filters.locationId }),
			...(filters.studentType === 'BECADO' && { isBecado: true }),
			...(filters.studentType === 'RECURSANTE' && { isRecursante: true }),
			...(filters.studentType === 'NORMAL' && { isBecado: false, isRecursante: false })
		},
		include: {
			career: { select: { name: true } },
			location: { select: { name: true } }
		},
		orderBy: { lastName: 'asc' }
	});

	// Obtener cargos pendientes de estos alumnos
	const studentIds = students.map((s) => s.id);
	const charges = await prisma.studentCharge.findMany({
		where: {
			studentId: { in: studentIds },
			status: { in: ['PENDING', 'PARTIAL'] },
			...(filters.conceptCode && {
				concept: { code: filters.conceptCode }
			})
		},
		include: {
			concept: { select: { name: true } }
		}
	});

	// Obtener bloqueos financieros
	const blocks = await prisma.financialBlock.findMany({
		where: {
			studentId: { in: studentIds },
			isActive: true
		}
	});

	// Agrupar cargos por alumno
	const chargesByStudent = new Map<string, typeof charges>();
	for (const charge of charges) {
		if (!chargesByStudent.has(charge.studentId)) {
			chargesByStudent.set(charge.studentId, []);
		}
		chargesByStudent.get(charge.studentId)!.push(charge);
	}

	// Agrupar bloqueos por alumno
	const blocksByStudent = new Map<string, typeof blocks>();
	for (const block of blocks) {
		if (!blocksByStudent.has(block.studentId)) {
			blocksByStudent.set(block.studentId, []);
		}
		blocksByStudent.get(block.studentId)!.push(block);
	}

	// Calcular deuda por alumno
	const now = new Date();
	const debtItems: DebtReportItem[] = students
		.map((student) => {
			const studentCharges = chargesByStudent.get(student.id) || [];

			if (studentCharges.length === 0) return null;

			const totalDebt = studentCharges.reduce(
				(sum: number, c) => sum + Number(c.finalAmount) - Number(c.paidAmount),
				0
			);
			const overdueCharges = studentCharges.filter((c) => c.dueDate && c.dueDate < now);
			const overdueDebt = overdueCharges.reduce(
				(sum: number, c) => sum + Number(c.finalAmount) - Number(c.paidAmount),
				0
			);

			// Filtrar por deuda vencida si corresponde
			if (filters.onlyOverdue && overdueDebt === 0) return null;

			// Filtrar por bloqueados si corresponde
			const studentBlocks = blocksByStudent.get(student.id) || [];
			if (filters.onlyBlocked && studentBlocks.length === 0) return null;

			return {
				studentId: student.id,
				studentName: `${student.firstName} ${student.lastName}`,
				studentDni: student.dni || '',
				careerName: student.career?.name || '',
				locationName: student.location?.name || '',
				studentType: student.isBecado ? 'BECADO' : student.isRecursante ? 'RECURSANTE' : 'NORMAL',
				totalDebt,
				overdueDebt,
				pendingCharges: studentCharges.length,
				overdueCharges: overdueCharges.length,
				isBlocked: studentBlocks.length > 0
			};
		})
		.filter((item): item is DebtReportItem => item !== null);

	// Ordenar por deuda total descendente
	debtItems.sort((a, b) => b.totalDebt - a.totalDebt);

	// Paginar
	const total = debtItems.length;
	const paginatedData = debtItems.slice(skip, skip + pageSize);

	// Calcular métricas
	const metrics: ReportMetrics = {
		totalPending: debtItems.reduce((sum, item) => sum + item.totalDebt, 0),
		totalOverdue: debtItems.reduce((sum, item) => sum + item.overdueDebt, 0),
		studentCount: debtItems.length
	};

	return {
		data: paginatedData,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
		metrics
	};
}

/**
 * Reporte de movimientos financieros
 */
export async function getMovementsReport(
	filters: ReportFilters
): Promise<PaginatedResult<MovementReportItem> & { metrics: ReportMetrics }> {
	const page = filters.page || 1;
	const pageSize = filters.pageSize || 25;
	const skip = (page - 1) * pageSize;

	// Construir where clause
	const where: any = {};

	if (filters.startDate || filters.endDate) {
		where.createdAt = {};
		if (filters.startDate) where.createdAt.gte = filters.startDate;
		if (filters.endDate) where.createdAt.lte = filters.endDate;
	}

	if (filters.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters.movementType) {
		where.movementType = filters.movementType;
	}

	// Obtener movimientos
	const [movements, total] = await Promise.all([
		prisma.financialMovement.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: pageSize
		}),
		prisma.financialMovement.count({ where })
	]);

	// Obtener estudiantes y usuarios relacionados
	const studentIds = [...new Set(movements.map((m) => m.studentId))];
	const userIds = [
		...new Set(movements.map((m) => m.userId).filter((id): id is string => id !== null))
	];

	const [students, users] = await Promise.all([
		studentIds.length > 0
			? prisma.student.findMany({
					where: { id: { in: studentIds } },
					select: { id: true, firstName: true, lastName: true, dni: true }
				})
			: [],
		userIds.length > 0
			? prisma.user.findMany({
					where: { id: { in: userIds } },
					select: { id: true, firstName: true, lastName: true }
				})
			: []
	]);

	const studentMap = new Map(students.map((s) => [s.id, s]));
	const userMap = new Map(users.map((u) => [u.id, u]));

	// Filtrar por búsqueda de estudiante si corresponde
	let filteredMovements = movements;
	if (filters.studentSearch) {
		const searchLower = filters.studentSearch.toLowerCase();
		filteredMovements = movements.filter((m) => {
			const student = studentMap.get(m.studentId);
			if (!student) return false;
			return (
				student.firstName.toLowerCase().includes(searchLower) ||
				student.lastName.toLowerCase().includes(searchLower) ||
				student.dni.includes(searchLower)
			);
		});
	}

	// Serializar datos
	const data: MovementReportItem[] = filteredMovements.map((m) => {
		const student = studentMap.get(m.studentId);
		const user = m.userId ? userMap.get(m.userId) : null;
		return {
			id: m.id,
			date: serializeDate(m.createdAt),
			studentName: student ? `${student.firstName} ${student.lastName}` : 'Desconocido',
			studentDni: student?.dni || '',
			movementType: m.movementType,
			description: m.description,
			amount: serializeMoney(m.amount),
			balanceBefore: serializeMoney(m.balanceBefore),
			balanceAfter: serializeMoney(m.balanceAfter),
			userId: m.userId || '',
			userName: user ? `${user.firstName} ${user.lastName}` : 'Sistema',
			entityType: m.entityType,
			entityId: m.entityId
		};
	});

	// Calcular métricas
	const metrics: ReportMetrics = {
		studentCount: new Set(movements.map((m) => m.studentId)).size
	};

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
		metrics
	};
}

/**
 * Reporte de recibos emitidos
 */
export async function getReceiptsReport(
	filters: ReportFilters
): Promise<PaginatedResult<ReceiptReportItem> & { metrics: ReportMetrics }> {
	const page = filters.page || 1;
	const pageSize = filters.pageSize || 25;
	const skip = (page - 1) * pageSize;

	// Construir where clause
	const where: any = {};

	if (filters.startDate || filters.endDate) {
		where.issuedAt = {};
		if (filters.startDate) where.issuedAt.gte = filters.startDate;
		if (filters.endDate) where.issuedAt.lte = filters.endDate;
	}

	if (filters.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters.paymentMethod) {
		where.paymentMethod = filters.paymentMethod;
	}

	// Obtener recibos
	const [receipts, total] = await Promise.all([
		prisma.receipt.findMany({
			where,
			orderBy: { issuedAt: 'desc' },
			skip,
			take: pageSize
		}),
		prisma.receipt.count({ where })
	]);

	// Filtrar por búsqueda de estudiante si corresponde
	let filteredReceipts = receipts;
	if (filters.studentSearch) {
		const searchLower = filters.studentSearch.toLowerCase();
		filteredReceipts = receipts.filter((r) => {
			return (
				r.studentName.toLowerCase().includes(searchLower) ||
				(r.studentDni && r.studentDni.includes(searchLower))
			);
		});
	}

	// Serializar datos
	const data: ReceiptReportItem[] = filteredReceipts.map((r) => ({
		id: r.id,
		receiptNumber: r.receiptNumber,
		receiptYear: r.receiptYear,
		date: serializeDate(r.issuedAt),
		studentName: r.studentName,
		studentDni: r.studentDni || '',
		totalAmount: serializeMoney(r.totalAmount),
		method: r.paymentMethod,
		status: r.status,
		issuedBy: r.issuedBy,
		issuedByName: r.issuedByName
	}));

	// Calcular métricas
	const metrics: ReportMetrics = {
		totalCollected: receipts.reduce((sum, r) => sum + Number(r.totalAmount), 0),
		receiptCount: receipts.length,
		studentCount: new Set(receipts.map((r) => r.studentId)).size
	};

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
		metrics
	};
}

/**
 * Reporte de condonaciones/descuentos extraordinarios
 */
export async function getDiscountsReport(
	filters: ReportFilters
): Promise<PaginatedResult<DiscountReportItem> & { metrics: ReportMetrics }> {
	const page = filters.page || 1;
	const pageSize = filters.pageSize || 25;
	const skip = (page - 1) * pageSize;

	// Construir where clause
	const where: any = {
		movementType: 'DISCOUNT',
		entityType: 'STUDENT_CHARGE'
	};

	if (filters.startDate || filters.endDate) {
		where.createdAt = {};
		if (filters.startDate) where.createdAt.gte = filters.startDate;
		if (filters.endDate) where.createdAt.lte = filters.endDate;
	}

	if (filters.studentId) {
		where.studentId = filters.studentId;
	}

	// Obtener movimientos de descuento
	const [movements, total] = await Promise.all([
		prisma.financialMovement.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: pageSize
		}),
		prisma.financialMovement.count({ where })
	]);

	// Obtener estudiantes, usuarios y cargos relacionados
	const studentIds = [...new Set(movements.map((m) => m.studentId))];
	const userIds = [
		...new Set(movements.map((m) => m.userId).filter((id): id is string => id !== null))
	];
	const chargeIds = [
		...new Set(movements.map((m) => m.entityId).filter((id): id is string => id !== null))
	];

	const [students, users, charges] = await Promise.all([
		studentIds.length > 0
			? prisma.student.findMany({
					where: { id: { in: studentIds } },
					select: { id: true, firstName: true, lastName: true, dni: true }
				})
			: [],
		userIds.length > 0
			? prisma.user.findMany({
					where: { id: { in: userIds } },
					select: { id: true, firstName: true, lastName: true }
				})
			: [],
		chargeIds.length > 0
			? prisma.studentCharge.findMany({
					where: { id: { in: chargeIds } },
					include: { concept: { select: { name: true } } }
				})
			: []
	]);

	const studentMap = new Map(students.map((s) => [s.id, s]));
	const userMap = new Map(users.map((u) => [u.id, u]));
	const chargeMap = new Map(charges.map((c) => [c.id, c]));

	// Filtrar por búsqueda de estudiante si corresponde
	let filteredMovements = movements;
	if (filters.studentSearch) {
		const searchLower = filters.studentSearch.toLowerCase();
		filteredMovements = movements.filter((m) => {
			const student = studentMap.get(m.studentId);
			if (!student) return false;
			return (
				student.firstName.toLowerCase().includes(searchLower) ||
				student.lastName.toLowerCase().includes(searchLower) ||
				student.dni.includes(searchLower)
			);
		});
	}

	// Serializar datos
	const data: DiscountReportItem[] = filteredMovements.map((m) => {
		const student = studentMap.get(m.studentId);
		const user = m.userId ? userMap.get(m.userId) : null;
		const charge = chargeMap.get(m.entityId || '');
		const metadata = m.metadata as { reason?: string } | null;
		return {
			id: m.id,
			date: serializeDate(m.createdAt),
			studentName: student ? `${student.firstName} ${student.lastName}` : 'Desconocido',
			studentDni: student?.dni || '',
			chargeConcept: charge?.concept.name || '',
			periodLabel: charge?.periodLabel || null,
			amount: serializeMoney(m.amount),
			reason: metadata?.reason || '',
			userId: m.userId || '',
			userName: user ? `${user.firstName} ${user.lastName}` : 'Sistema'
		};
	});

	// Calcular métricas
	const metrics: ReportMetrics = {
		totalDiscounted: movements.reduce((sum, m) => sum + Number(m.amount), 0),
		studentCount: new Set(movements.map((m) => m.studentId)).size
	};

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
		metrics
	};
}

/**
 * Reporte de becas aplicadas
 */
export async function getScholarshipsReport(
	filters: ReportFilters
): Promise<PaginatedResult<ScholarshipReportItem> & { metrics: ReportMetrics }> {
	const page = filters.page || 1;
	const pageSize = filters.pageSize || 25;
	const skip = (page - 1) * pageSize;

	// Construir where clause
	const where: any = {
		scholarshipApplied: { gt: 0 }
	};

	if (filters.startDate || filters.endDate) {
		where.createdAt = {};
		if (filters.startDate) where.createdAt.gte = filters.startDate;
		if (filters.endDate) where.createdAt.lte = filters.endDate;
	}

	if (filters.studentId) {
		where.studentId = filters.studentId;
	}

	if (filters.studentSearch) {
		where.student = {
			OR: [
				{ firstName: { contains: filters.studentSearch, mode: 'insensitive' } },
				{ lastName: { contains: filters.studentSearch, mode: 'insensitive' } },
				{ dni: { contains: filters.studentSearch } }
			]
		};
	}

	if (filters.conceptCode) {
		where.concept = { code: filters.conceptCode };
	}

	// Obtener cargos con becas
	const [charges, total] = await Promise.all([
		prisma.studentCharge.findMany({
			where,
			include: {
				student: {
					select: {
						firstName: true,
						lastName: true,
						dni: true
					}
				},
				concept: {
					select: {
						name: true
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: pageSize
		}),
		prisma.studentCharge.count({ where })
	]);

	// Serializar datos
	const data: ScholarshipReportItem[] = charges.map((c) => ({
		id: c.id,
		studentName: `${c.student.firstName} ${c.student.lastName}`,
		studentDni: c.student.dni || '',
		chargeConcept: c.concept.name,
		periodLabel: c.periodLabel,
		percentage: 0, // Se podría calcular si hay beca relacionada
		amount: serializeMoney(c.scholarshipApplied),
		appliedAt: serializeDate(c.createdAt)
	}));

	// Calcular métricas
	const metrics: ReportMetrics = {
		totalScholarships: charges.reduce((sum, c) => sum + Number(c.scholarshipApplied), 0),
		studentCount: new Set(charges.map((c) => c.studentId)).size
	};

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
		metrics
	};
}

/**
 * Exportar datos a CSV
 */
export function exportToCSV<T extends Record<string, any>>(
	data: T[],
	headers: string[],
	filename: string
): { csv: string; filename: string; recordCount: number } {
	if (data.length === 0) {
		return { csv: '', filename, recordCount: 0 };
	}

	const csvRows: string[] = [];

	// Header
	csvRows.push(headers.join(','));

	// Data rows
	for (const item of data) {
		const values = headers.map((header) => {
			const value = item[header];
			if (value === null || value === undefined) return '';
			if (typeof value === 'string') {
				// Escapar comillas y envolver en comillas si contiene comas
				const escaped = value.replace(/"/g, '""');
				if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
					return `"${escaped}"`;
				}
				return escaped;
			}
			return String(value);
		});
		csvRows.push(values.join(','));
	}

	const csv = csvRows.join('\n');
	return { csv, filename, recordCount: data.length };
}
