import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { redirect, error } from '@sveltejs/kit';
import { getStudentBlockingMessage } from '$lib/server/financial/student-blocking-service';
import { getCurrentStudentForUser } from '$lib/server/students/current-student-service';
import { checkAndExpireScholarshipsForStudent } from '$lib/server/financial/scholarship-expiration-service';

/**
 * Mapper para convertir StudentCharge a POJO serializable
 * Convierte todos los campos Decimal a Number
 */
function serializeStudentCharge(charge: {
	id: string;
	studentId: string;
	conceptId: string;
	periodLabel: string;
	amount: { toString: () => string };
	paidAmount: { toString: () => string };
	dueDate: Date | null;
	status: string;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
	userId: string | null;
	academicTermId: string;
	lateFeeApplied: { toString: () => string };
	discountApplied: { toString: () => string };
	scholarshipApplied: { toString: () => string };
	finalAmount: { toString: () => string };
	isOverdue: boolean;
	overdueSince: Date | null;
	installmentNumber: number | null;
	benefitType: string | null;
	benefitReason: string | null;
	concept: {
		id: string;
		name: string;
		code: string;
		description: string | null;
	} | null;
}) {
	const amount = Number(charge.amount);
	const finalAmount = Number(charge.finalAmount);
	const scholarshipApplied = Number(charge.scholarshipApplied);

	// Determinar si la beca fue perdida (tiene amount > finalAmount pero scholarshipApplied == 0)
	const scholarshipLost = amount > finalAmount && scholarshipApplied === 0;

	return {
		id: charge.id,
		studentId: charge.studentId,
		conceptId: charge.conceptId,
		periodLabel: charge.periodLabel,
		amount,
		paidAmount: Number(charge.paidAmount),
		dueDate: charge.dueDate ? charge.dueDate.toISOString() : null,
		status: charge.status,
		notes: charge.notes,
		createdAt: charge.createdAt.toISOString(),
		updatedAt: charge.updatedAt.toISOString(),
		userId: charge.userId,
		academicTermId: charge.academicTermId,
		lateFeeApplied: Number(charge.lateFeeApplied),
		discountApplied: Number(charge.discountApplied),
		scholarshipApplied,
		finalAmount,
		isOverdue: charge.isOverdue,
		overdueSince: charge.overdueSince ? charge.overdueSince.toISOString() : null,
		installmentNumber: charge.installmentNumber,
		benefitType: charge.benefitType,
		benefitReason: charge.benefitReason,
		scholarshipLost,
		concept: charge.concept
			? {
					id: charge.concept.id,
					name: charge.concept.name,
					code: charge.concept.code,
					description: charge.concept.description
				}
			: null
	};
}

/**
 * Mapper para convertir Payment a POJO serializable
 * Convierte todos los campos Decimal a Number
 */
function serializePayment(payment: {
	id: string;
	studentId: string;
	amount: { toString: () => string };
	method: string;
	reference: string | null;
	paidAt: Date;
	notes: string | null;
	createdAt: Date;
	userId: string | null;
	academicTermId: string | null;
	receiptId: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	cancelledReason: string | null;
	isCancelled: boolean;
	receipt: {
		id: string;
		receiptNumber: number;
		issuedAt: Date | null;
	} | null;
}) {
	return {
		id: payment.id,
		studentId: payment.studentId,
		amount: Number(payment.amount),
		method: payment.method,
		reference: payment.reference,
		paidAt: payment.paidAt.toISOString(),
		notes: payment.notes,
		createdAt: payment.createdAt.toISOString(),
		userId: payment.userId,
		academicTermId: payment.academicTermId,
		receiptId: payment.receiptId,
		cancelledAt: payment.cancelledAt ? payment.cancelledAt.toISOString() : null,
		cancelledBy: payment.cancelledBy,
		cancelledReason: payment.cancelledReason,
		isCancelled: payment.isCancelled,
		receipt: payment.receipt
			? {
					id: payment.receipt.id,
					receiptNumber: payment.receipt.receiptNumber,
					issuedAt: payment.receipt.issuedAt ? payment.receipt.issuedAt.toISOString() : null
				}
			: null
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	// Verificar que sea alumno
	const isStudent = user.roles.includes('ALUMNO');
	if (!isStudent) {
		throw redirect(303, '/dashboard');
	}

	// Intentar obtener el estudiante asociado al usuario por DNI
	let student;
	try {
		student = await getCurrentStudentForUser(user.id);
	} catch (e) {
		// Si no se encuentra el estudiante, mostrar datos del usuario sin información financiera
		return {
			student: {
				id: user.id,
				fullName: `${user.firstName} ${user.lastName}`,
				dni: null,
				status: 'NO_VINCULADO',
				career: 'Sin carrera',
				location: null,
				currentYear: 0,
				financialBlocked: false,
				blockingMessage: null
			},
			financial: {
				totalCharges: 0,
				totalPayments: 0,
				totalDebt: 0,
				overdueDebt: 0,
				charges: [],
				payments: [],
				chargesByConcept: {}
			}
		};
	}

	// Verificar y expirar becas vencidas por pago fuera de término
	await checkAndExpireScholarshipsForStudent(
		student.id,
		user.id,
		`${user.firstName} ${user.lastName}`
	);

	// Cargar datos adicionales del estudiante
	const studentWithRelations = await prisma.student.findUnique({
		where: { id: student.id },
		include: {
			career: true,
			location: true,
			studentCharges: {
				include: {
					concept: true
				},
				orderBy: { dueDate: 'desc' }
			},
			payments: {
				include: {
					receipt: true
				},
				orderBy: { paidAt: 'desc' }
			}
		}
	});

	if (!studentWithRelations) {
		throw error(404, 'No se encontraron datos del estudiante');
	}

	// Obtener mensaje de bloqueo financiero
	const blockingMessage = await getStudentBlockingMessage(studentWithRelations.id);

	// Calcular deuda total
	const totalCharges = studentWithRelations.studentCharges.reduce(
		(sum: number, charge) => sum + Number(charge.amount),
		0
	);
	const totalPayments = studentWithRelations.payments.reduce(
		(sum: number, payment) => sum + Number(payment.amount),
		0
	);
	const totalDebt = totalCharges - totalPayments;

	// Calcular deuda vencida
	const overdueDebt = studentWithRelations.studentCharges
		.filter((charge) => charge.dueDate && new Date(charge.dueDate) < new Date())
		.reduce((sum: number, charge) => sum + Number(charge.amount) - Number(charge.paidAmount), 0);

	// Agrupar cargos por concepto
	const chargesByConcept = studentWithRelations.studentCharges.reduce(
		(acc: Record<string, { count: number; total: number }>, charge) => {
			const conceptName = charge.concept?.name || 'Sin concepto';
			if (!acc[conceptName]) {
				acc[conceptName] = { count: 0, total: 0 };
			}
			acc[conceptName].count += 1;
			acc[conceptName].total += Number(charge.amount);
			return acc;
		},
		{}
	);

	return {
		student: {
			id: studentWithRelations.id,
			fullName: `${studentWithRelations.firstName} ${studentWithRelations.lastName}`,
			dni: studentWithRelations.dni,
			status: studentWithRelations.status,
			career: studentWithRelations.career.name,
			location: studentWithRelations.location?.name || null,
			currentYear: studentWithRelations.currentYear,
			financialBlocked: studentWithRelations.financialBlocked,
			blockingMessage
		},
		financial: {
			totalCharges,
			totalPayments,
			totalDebt,
			overdueDebt,
			charges: studentWithRelations.studentCharges.map(serializeStudentCharge),
			payments: studentWithRelations.payments.map(serializePayment),
			chargesByConcept
		}
	};
};
