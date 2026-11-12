import PDFDocument from 'pdfkit';
import { AuditAction } from '@prisma/client';
import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { auditLog } from '$lib/server/audit';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { canGenerateStudentCertificate } from '$lib/server/auth/student-history-access';
import { prisma } from '$lib/server/db/prisma';
import { addInstitutionalLetterhead } from '$lib/server/pdf/institutional-letterhead';
import { formatDni } from '$lib/utils/dni';
import { formatPersonName } from '$lib/utils/person-name';

const INSTITUTION_TIME_ZONE = 'America/Argentina/Cordoba';

function getInstitutionDate(date: Date): string {
	return new Intl.DateTimeFormat('es-AR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: INSTITUTION_TIME_ZONE
	}).format(date);
}

function getInstitutionCity(input: {
	locationName: string | null | undefined;
	locationCity: string | null | undefined;
	locality: string | null | undefined;
}): string {
	const raw =
		input.locationCity?.trim() || input.locationName?.trim() || input.locality?.trim() || 'Capioví';

	const normalized = raw
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('es-AR');

	if (normalized.includes('alem')) {
		return 'Leandro N. Alem';
	}

	if (normalized.includes('capiovi')) {
		return 'Capioví';
	}

	return raw;
}

function safeFileNamePart(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

export const GET: RequestHandler = async ({ params, locals }) => {
	await requireStudentAccess(locals.user, params.id);

	const activeRole = locals.user?.activeRole ?? null;

	if (!canGenerateStudentCertificate(activeRole)) {
		throw error(403, 'No tenés permiso para generar certificados académicos');
	}

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

	const fullName = formatPersonName(student.firstName, student.lastName, 'FIRST_LAST');

	const issuedAt = new Date();

	const institutionCity = getInstitutionCity({
		locationName: student.location?.name,
		locationCity: student.location?.city,
		locality: student.locality
	});

	const doc = new PDFDocument({
		margin: 50,
		size: 'A4',
		info: {
			Title: 'Constancia de Alumno Regular',
			Author: 'Instituto Superior de Formación Docente Paulo Freire 1117',
			Subject: `Constancia de alumno regular de ${fullName}`
		}
	});

	const chunks: Buffer[] = [];

	doc.on('data', (chunk) => chunks.push(chunk));

	const done = new Promise<Buffer>((resolveBuffer) => {
		doc.on('end', () => resolveBuffer(Buffer.concat(chunks)));
	});

	await addInstitutionalLetterhead(doc, {
		gapAfter: 22
	});

	doc
		.font('Helvetica')
		.fontSize(11)
		.fillColor('#111827')
		.text(`${institutionCity}, Mnes. ${getInstitutionDate(issuedAt)}`, {
			align: 'right'
		});

	doc.moveDown(2);

	doc
		.font('Helvetica-Bold')
		.fontSize(18)
		.fillColor('#111827')
		.text('CONSTANCIA DE ALUMNO REGULAR', {
			align: 'center'
		});

	doc.moveDown(2);

	doc
		.font('Helvetica')
		.fontSize(11.5)
		.fillColor('#111827')
		.text(
			`Con la presente se deja constancia que ${fullName}, DNI ${formatDni(student.dni)}, ` +
				`es alumno/a de ${student.currentYear}° Año del ${student.career.name} ` +
				`del Instituto Superior de Formación Docente “Paulo Freire” 1117.`,
			{
				align: 'justify',
				lineGap: 6
			}
		);

	doc.moveDown(1.8);

	doc.text('Se extiende la misma para ser presentada ante autoridad que lo requiera.', {
		align: 'justify',
		lineGap: 6
	});

	doc.moveDown(5);

	const signatureY = doc.y + 10;
	const pageWidth = doc.page.width;

	doc
		.moveTo(pageWidth - 245, signatureY)
		.lineTo(pageWidth - 70, signatureY)
		.strokeColor('#374151')
		.lineWidth(0.8)
		.stroke();

	doc
		.font('Helvetica')
		.fontSize(9.5)
		.fillColor('#374151')
		.text('Secretaría Académica', pageWidth - 245, signatureY + 8, {
			width: 175,
			align: 'center'
		});

	doc.end();

	const buffer = await done;

	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'StudentCertificate',
			entityId: student.id,
			description: `Constancia de alumno regular generada para ${fullName}`,
			userId: locals.user?.id
		});
	} catch {
		// La generación del documento no debe fallar por un problema de auditoría.
	}

	const fileName =
		`constancia-alumno-regular-` +
		`${safeFileNamePart(student.lastName)}-` +
		`${safeFileNamePart(student.firstName)}.pdf`;

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `inline; filename="${fileName}"`,
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
