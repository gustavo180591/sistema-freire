import PDFDocument from 'pdfkit';
import { AuditAction } from '@prisma/client';
import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { requireStudentFinancialReadAccess } from '$lib/server/auth/financial-access';
import { formatDni } from '$lib/utils/dni';
import { studentFinancialSummaryService } from '$lib/server/financial/student-financial-summary-service';
import { evaluateDebtFreeEligibility } from '$lib/server/financial/debt-free-eligibility';
import { addInstitutionalLetterhead } from '$lib/server/pdf/institutional-letterhead';
import { INSTITUTIONAL_DATA } from '$lib/server/financial/receipt-service';

const INSTITUTION_TIME_ZONE = 'America/Argentina/Cordoba';

function sanitizeFilePart(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

function getInstitutionDate(date: Date): string {
	return new Intl.DateTimeFormat('es-AR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: INSTITUTION_TIME_ZONE
	}).format(date);
}

export const GET: RequestHandler = async ({ params, locals }) => {
	await requireStudentFinancialReadAccess(locals.user, params.id);

	const student = await prisma.student.findUnique({
		where: {
			id: params.id
		},
		include: {
			career: true,
			location: true
		}
	});

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	const [financialSummary, monthlyChargeCount] = await Promise.all([
		studentFinancialSummaryService.getStudentFinancialSummary(student.id),

		prisma.studentCharge.count({
			where: {
				studentId: student.id,
				concept: {
					code: 'CUOTA_MENSUAL'
				}
			}
		})
	]);

	const eligibility = evaluateDebtFreeEligibility({
		totalDebt: financialSummary.totalDebt,
		monthlyChargeCount
	});

	if (!eligibility.eligible) {
		throw error(
			409,
			eligibility.reason ??
				'No se puede emitir el libre de deuda porque existen obligaciones pendientes'
		);
	}

	const locationConfig = student.locationId
		? await prisma.receiptLocationConfig.findUnique({
				where: {
					locationId: student.locationId
				},
				select: {
					institutionName: true,
					institutionCode: true,
					institutionCodeNumber: true,
					institutionAddress: true,
					institutionEmail: true,
					institutionPhone: true
				}
			})
		: null;

	const institutionName = locationConfig?.institutionName ?? INSTITUTIONAL_DATA.name;

	const institutionCode = locationConfig?.institutionCode ?? INSTITUTIONAL_DATA.code;

	const issuedAt = new Date();

	const doc = new PDFDocument({
		size: 'A4',
		margin: 50,
		info: {
			Title: 'Certificado de Libre Deuda',
			Author: `${institutionName} "${institutionCode}"`,
			Subject: `Libre deuda de ${student.firstName} ${student.lastName}`
		}
	});

	const chunks: Buffer[] = [];

	doc.on('data', (chunk) => chunks.push(chunk));

	const done = new Promise<Buffer>((resolveBuffer) => {
		doc.on('end', () => resolveBuffer(Buffer.concat(chunks)));
	});

	const pageWidth = doc.page.width;

	await addInstitutionalLetterhead(doc);

	doc
		.font('Helvetica-Bold')
		.fontSize(19)
		.fillColor('#111827')
		.text('CERTIFICADO DE LIBRE DE DEUDA', {
			align: 'center'
		});

	doc.moveDown(2);

	doc.font('Helvetica').fontSize(11).fillColor('#111827').text('A quien corresponda:', {
		align: 'left'
	});

	doc.moveDown();

	const fullName = `${student.firstName} ${student.lastName}`;

	doc.text(
		`Por medio de la presente se deja constancia de que el/la alumno/a ${fullName}, ` +
			`DNI ${formatDni(student.dni)}, del ${student.career.name}` +
			`${student.location?.name ? `, sede ${student.location.name}` : ''}, ` +
			`no registra deuda pendiente con esta institución al día ${getInstitutionDate(issuedAt)}, ` +
			`de acuerdo con los registros administrativos y financieros disponibles en el sistema.`,
		{
			align: 'justify',
			lineGap: 5
		}
	);

	doc.moveDown(1.2);

	doc.text(
		'Se expide la presente constancia a solicitud del interesado/a, ' +
			'para ser presentada ante quien corresponda.',
		{
			align: 'justify',
			lineGap: 5
		}
	);

	doc.moveDown(1.2);

	doc
		.fontSize(9.5)
		.fillColor('#4b5563')
		.text(
			'La presente certificación refleja el estado financiero registrado al momento de su emisión ' +
				'y no comprende obligaciones que pudieran generarse con posterioridad.',
			{
				align: 'justify',
				lineGap: 4
			}
		);

	doc.moveDown(3);

	const signatureY = doc.y + 20;

	doc.moveTo(70, signatureY).lineTo(245, signatureY).strokeColor('#374151').lineWidth(0.8).stroke();

	doc
		.moveTo(pageWidth - 245, signatureY)
		.lineTo(pageWidth - 70, signatureY)
		.stroke();

	doc
		.font('Helvetica')
		.fontSize(9)
		.fillColor('#374151')
		.text('Secretaría / Administración', 70, signatureY + 8, {
			width: 175,
			align: 'center'
		});

	doc.text('Firma y sello', pageWidth - 245, signatureY + 8, {
		width: 175,
		align: 'center'
	});

	doc
		.fontSize(8.5)
		.fillColor('#6b7280')
		.text(
			`Fecha de emisión: ${getInstitutionDate(issuedAt)} · Documento generado por Sistema Freire`,
			50,
			doc.page.height - 70,
			{
				width: pageWidth - 100,
				align: 'center'
			}
		);

	doc.end();

	const buffer = await done;

	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'DebtFreeCertificate',
			entityId: student.id,
			description: `Libre de deuda generado para ${fullName}, DNI ${formatDni(student.dni)}`,
			userId: locals.user?.id
		});
	} catch {
		// La auditoría no debe impedir la descarga del documento.
	}

	const fileName =
		`libre-deuda-${sanitizeFilePart(student.lastName)}-` +
		`${sanitizeFilePart(student.firstName)}.pdf`;

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${fileName}"`,
			'Cache-Control': 'no-store'
		}
	});
};
