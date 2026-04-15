import PDFDocument from 'pdfkit';
import { AuditAction } from '@prisma/client';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { auditLog } from '$lib/server/audit';
import { requireStudentAccess } from '$lib/server/auth/student-access';

export const GET: RequestHandler = async ({ params, locals }) => {
	await requireStudentAccess(locals.user, params.id);

	const student = await prisma.student.findUnique({
		where: { id: params.id },
		include: {
			career: true,
			subjectStatuses: true
		}
	});

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	const regularSubjects = student.subjectStatuses.filter(
		(s) => s.regularityStatus === 'REGULAR'
	).length;

	const totalSubjects = student.subjectStatuses.length;

	const doc = new PDFDocument({
		margin: 40,
		size: 'A4'
	});

	const chunks: Buffer[] = [];

	doc.on('data', (chunk) => chunks.push(chunk));

	const done = new Promise<Buffer>((resolve) => {
		doc.on('end', () => resolve(Buffer.concat(chunks)));
	});

	// Header institucional
	doc.fontSize(18).text('Instituto Paulo Freire', {
		align: 'center'
	});
	doc.moveDown(0.5);
	doc.fontSize(14).text('Certificado de Alumno Regular', {
		align: 'center'
	});
	doc.moveDown(2);

	doc
		.fontSize(11)
		.text(
			`Se certifica que ${student.firstName} ${student.lastName}, DNI ${student.dni}, ` +
				`se encuentra cursando activamente la carrera ${student.career.name}.`
		);

	doc.moveDown();
	doc.text(`Materias regulares: ${regularSubjects}`);
	doc.text(`Total de materias registradas: ${totalSubjects}`);
	doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`);

	doc.moveDown(3);
	doc.text('Secretaría Académica', {
		align: 'right'
	});

	doc.end();

	const buffer = await done;

	try {
		await auditLog({
			action: AuditAction.EXPORT,
			entityType: 'StudentCertificate',
			entityId: student.id,
			description: `Certificado generado para ${student.firstName} ${student.lastName}`,
			userId: locals.user?.id
		});
	} catch {
		// noop
	}

	const fileName = `certificado-${student.lastName}-${student.firstName}.pdf`;

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${fileName}"`
		}
	});
};
