import PDFDocument from 'pdfkit';
import { AuditAction } from '@prisma/client';
import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { requireStudentAccess } from '$lib/server/auth/student-access';
import { canGenerateStudentCertificate } from '$lib/server/auth/student-history-access';
import { addInstitutionalLetterhead } from '$lib/server/pdf/institutional-letterhead';
import { formatDni } from '$lib/utils/dni';

const INSTITUTION_TIME_ZONE = 'America/Argentina/Cordoba';

function getInstitutionDate(date: Date): string {
	return new Intl.DateTimeFormat('es-AR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: INSTITUTION_TIME_ZONE
	}).format(date);
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
			location: true,
			subjectStatuses: true
		}
	});

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	const regularSubjects = student.subjectStatuses.filter(
		(subjectStatus) => subjectStatus.regularityStatus === 'REGULAR'
	).length;

	const totalSubjects = student.subjectStatuses.length;
	const fullName = `${student.firstName} ${student.lastName}`;
	const issuedAt = new Date();

	const doc = new PDFDocument({
		margin: 50,
		size: 'A4',
		info: {
			Title: 'Certificado de Alumno Regular',
			Author: 'Instituto Superior de Formación Docente Paulo Freire 1117',
			Subject: `Certificado de alumno regular de ${fullName}`
		}
	});

	const chunks: Buffer[] = [];

	doc.on('data', (chunk) => chunks.push(chunk));

	const done = new Promise<Buffer>((resolveBuffer) => {
		doc.on('end', () => resolveBuffer(Buffer.concat(chunks)));
	});

	addInstitutionalLetterhead(doc);

	doc
		.font('Helvetica-Bold')
		.fontSize(19)
		.fillColor('#111827')
		.text('CERTIFICADO DE ALUMNO REGULAR', {
			align: 'center'
		});

	doc.moveDown(2);

	doc.font('Helvetica').fontSize(11).fillColor('#111827').text('A quien corresponda:', {
		align: 'left'
	});

	doc.moveDown();

	doc.text(
		`Por medio de la presente se deja constancia de que el/la alumno/a ${fullName}, ` +
			`DNI ${formatDni(student.dni)}, se encuentra registrado/a como alumno/a de ` +
			`${student.career.name}` +
			`${student.location?.name ? `, sede ${student.location.name}` : ''}.`,
		{
			align: 'justify',
			lineGap: 5
		}
	);

	doc.moveDown(1.2);

	doc.text(
		`De acuerdo con los registros académicos disponibles en el sistema, ` +
			`posee ${regularSubjects} materia${regularSubjects === 1 ? '' : 's'} con condición regular ` +
			`sobre ${totalSubjects} materia${totalSubjects === 1 ? '' : 's'} registradas.`,
		{
			align: 'justify',
			lineGap: 5
		}
	);

	doc.moveDown(1.2);

	doc.text(
		`Se expide la presente constancia a solicitud del interesado/a, ` +
			`en fecha ${getInstitutionDate(issuedAt)}, para ser presentada ante quien corresponda.`,
		{
			align: 'justify',
			lineGap: 5
		}
	);

	doc.moveDown(4);

	const signatureY = doc.y + 15;
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
			description: `Certificado de alumno regular generado para ${fullName}`,
			userId: locals.user?.id
		});
	} catch {
		// La generación del documento no debe fallar por un problema de auditoría.
	}

	const fileName = `certificado-alumno-regular-${student.lastName}-${student.firstName}.pdf`;

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${fileName}"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
