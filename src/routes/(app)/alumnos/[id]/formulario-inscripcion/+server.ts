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

function formatDate(date: Date | null): string {
	if (!date) {
		return 'No informado';
	}

	return new Intl.DateTimeFormat('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		timeZone: INSTITUTION_TIME_ZONE
	}).format(date);
}

function valueOrFallback(value: string | null | undefined): string {
	const normalized = value?.trim();
	return normalized || 'No informado';
}

function buildAddress(address: string | null, locality: string | null): string {
	const parts = [address?.trim(), locality?.trim()].filter(Boolean);

	return parts.length > 0 ? parts.join(' - ') : 'No informado';
}

function buildFamilyContact(input: {
	name: string | null;
	relationship: string | null;
	phone: string | null;
}): string {
	const name = input.name?.trim();
	const relationship = input.relationship?.trim();
	const phone = input.phone?.trim();

	if (!name && !relationship && !phone) {
		return 'No informado';
	}

	const parts: string[] = [];

	if (name) {
		parts.push(name);
	}

	if (relationship) {
		parts.push(`(${relationship})`);
	}

	if (phone) {
		parts.push(`Tel.: ${phone}`);
	}

	return parts.join(' ');
}

function safeFileNamePart(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

type PDFDocumentInstance = InstanceType<typeof PDFDocument>;

function addFormField(doc: PDFDocumentInstance, label: string, value: string): void {
	const left = 55;
	const labelWidth = 140;
	const valueLeft = 205;
	const valueWidth = 335;
	const rowY = doc.y;

	doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#111827');

	const labelHeight = doc.heightOfString(label, {
		width: labelWidth
	});

	const valueHeight = doc.font('Helvetica').heightOfString(value, {
		width: valueWidth
	});

	const contentHeight = Math.max(labelHeight, valueHeight, 16);
	const rowHeight = contentHeight + 14;

	doc.font('Helvetica-Bold').text(label, left, rowY, {
		width: labelWidth
	});

	doc.font('Helvetica').text(value, valueLeft, rowY, {
		width: valueWidth
	});

	doc
		.moveTo(left, rowY + rowHeight - 5)
		.lineTo(540, rowY + rowHeight - 5)
		.lineWidth(0.5)
		.strokeColor('#d1d5db')
		.stroke();

	doc.y = rowY + rowHeight;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	await requireStudentAccess(locals.user, params.id);

	const activeRole = locals.user?.activeRole ?? null;

	if (!canGenerateStudentCertificate(activeRole)) {
		throw error(403, 'No tenés permiso para generar documentación académica');
	}

	const student = await prisma.student.findUnique({
		where: {
			id: params.id
		},
		include: {
			career: true,
			location: true,
			user: {
				select: {
					email: true,
					phone: true
				}
			}
		}
	});

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	const fullName = formatPersonName(student.firstName, student.lastName);

	const phone = student.phone?.trim() || student.user.phone?.trim() || 'No informado';

	const familyContact = buildFamilyContact({
		name: student.familyContactName,
		relationship: student.familyRelationship,
		phone: student.familyContactPhone
	});

	const doc = new PDFDocument({
		margin: 50,
		size: 'A4',
		info: {
			Title: 'Formulario de Inscripción',
			Author: 'Instituto Superior de Formación Docente Paulo Freire 1117',
			Subject: `Formulario de inscripción de ${fullName}`
		}
	});

	const chunks: Buffer[] = [];

	doc.on('data', (chunk) => chunks.push(chunk));

	const done = new Promise<Buffer>((resolveBuffer) => {
		doc.on('end', () => resolveBuffer(Buffer.concat(chunks)));
	});

	await addInstitutionalLetterhead(doc, {
		gapAfter: 20
	});

	doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text('FORMULARIO DE INSCRIPCIÓN', {
		align: 'center'
	});

	doc.moveDown(1.5);

	addFormField(doc, 'Fecha de inscripción', formatDate(student.createdAt));

	addFormField(doc, 'Profesorado', valueOrFallback(student.career.name));

	addFormField(doc, 'Apellido y Nombres', fullName);

	addFormField(doc, 'DNI', formatDni(student.dni));

	addFormField(doc, 'Fecha de Nacimiento', formatDate(student.birthDate));

	addFormField(doc, 'Domicilio', buildAddress(student.address, student.locality));

	addFormField(doc, 'Teléfono', phone);

	addFormField(doc, 'Email', valueOrFallback(student.user.email));

	addFormField(doc, 'Escuela Secundaria', valueOrFallback(student.highSchool));

	addFormField(doc, 'Año de Egreso', student.highSchoolYear?.toString() ?? 'No informado');

	addFormField(doc, 'Contacto familiar o allegado', familyContact);

	doc.end();

	const buffer = await done;

	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'StudentEnrollmentForm',
			entityId: student.id,
			description: `Formulario de inscripción generado para ${fullName}`,
			userId: locals.user?.id
		});
	} catch {
		// La generación del documento no debe fallar por un problema de auditoría.
	}

	const fileName =
		`formulario-inscripcion-` +
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
