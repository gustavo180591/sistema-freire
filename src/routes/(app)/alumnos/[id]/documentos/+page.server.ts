import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { error, fail, redirect } from '@sveltejs/kit';
import { auditLog } from '$lib/server/audit';
import { hasPermission } from '$lib/server/auth/permissions-granular';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	DNI: 'DNI',
	CERTIFICATE: 'Certificado',
	CONSTANCY: 'Constancia',
	SECONDARY_TITLE: 'Título Secundario',
	PHOTO_ID: 'Foto Carnet',
	MEDICAL_CERTIFICATE: 'Certificado Médico',
	OTHER: 'Otro'
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	// Verificar permiso de lectura
	const canRead = await hasPermission(user.id, 'STUDENT', 'read');
	if (!canRead) {
		throw error(403, 'No tenés permiso para ver documentos');
	}

	const studentId = params.id;

	const student = await prisma.student.findUnique({
		where: { id: studentId },
		include: {
			user: { select: { email: true } },
			career: { select: { name: true } },
			documents: {
				include: {
					uploader: { select: { firstName: true, lastName: true } },
					verifier: { select: { firstName: true, lastName: true } }
				},
				orderBy: { createdAt: 'desc' }
			}
		}
	});

	if (!student) {
		throw error(404, 'Alumno no encontrado');
	}

	return {
		student: {
			id: student.id,
			fullName: `${student.lastName} ${student.firstName}`,
			dni: student.dni,
			career: student.career.name,
			email: student.user.email
		},
		documents: student.documents.map(d => ({
			id: d.id,
			type: d.type,
			typeLabel: DOCUMENT_TYPE_LABELS[d.type],
			name: d.name,
			fileUrl: d.fileUrl,
			fileSize: d.fileSize,
			mimeType: d.mimeType,
			verified: d.verified,
			verifiedBy: d.verifier ? `${d.verifier.lastName} ${d.verifier.firstName}` : null,
			verifiedAt: d.verifiedAt,
			uploadedBy: `${d.uploader.lastName} ${d.uploader.firstName}`,
			createdAt: d.createdAt,
			notes: d.notes
		})),
		documentTypeLabels: DOCUMENT_TYPE_LABELS,
		canUpload: await hasPermission(user.id, 'STUDENT', 'update'),
		canVerify: await hasPermission(user.id, 'STUDENT', 'update')
	};
};

export const actions: Actions = {
	// Subir documento
	upload: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await hasPermission(user.id, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para subir documentos' });
		}

		const studentId = params.id;
		const formData = await request.formData();
		const type = formData.get('type')?.toString();
		const name = formData.get('name')?.toString();
		const notes = formData.get('notes')?.toString();
		const file = formData.get('file') as File | null;

		if (!type || !name || !file || file.size === 0) {
			return fail(400, { error: 'Tipo, nombre y archivo son obligatorios' });
		}

		// Validar tipo
		const validTypes = ['DNI', 'CERTIFICATE', 'CONSTANCY', 'SECONDARY_TITLE', 'PHOTO_ID', 'MEDICAL_CERTIFICATE', 'OTHER'];
		if (!validTypes.includes(type)) {
			return fail(400, { error: 'Tipo de documento inválido' });
		}

		// Validar tamaño (máx 10MB)
		if (file.size > 10 * 1024 * 1024) {
			return fail(400, { error: 'El archivo no puede superar los 10MB' });
		}

		// Guardar archivo (en producción usar S3, etc. Aquí guardamos en disco)
		const buffer = Buffer.from(await file.arrayBuffer());
		const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
		const filePath = `/uploads/${studentId}/${fileName}`;

		// Crear directorio si no existe

		const uploadDir = join(process.cwd(), 'static', 'uploads', studentId);
		if (!existsSync(uploadDir)) {
			await mkdir(uploadDir, { recursive: true });
		}

		await writeFile(join(process.cwd(), 'static', filePath), buffer);

		// Crear registro en BD
		const doc = await prisma.studentDocument.create({
			data: {
				studentId,
				type,
				name,
				fileUrl: filePath,
				fileSize: file.size,
				mimeType: file.type,
				uploadedBy: user.id,
				notes
			}
		});

		// Auditoría
		await auditLog({
			userId: user.id,
			action: 'CREATE',
			entityType: 'StudentDocument',
			entityId: doc.id,
			description: `Subió documento "${name}" (${type}) para alumno ${studentId}`
		});

		return {
			success: true,
			message: 'Documento subido correctamente'
		};
	},

	// Verificar documento
	verify: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canUpdate = await hasPermission(user.id, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para verificar documentos' });
		}

		const formData = await request.formData();
		const documentId = formData.get('documentId')?.toString();
		const verified = formData.get('verified') === 'true';

		if (!documentId) {
			return fail(400, { error: 'ID de documento requerido' });
		}

		const doc = await prisma.studentDocument.findFirst({
			where: { id: documentId, studentId: params.id }
		});

		if (!doc) {
			return fail(404, { error: 'Documento no encontrado' });
		}

		await prisma.studentDocument.update({
			where: { id: documentId },
			data: {
				verified,
				verifiedBy: verified ? user.id : null,
				verifiedAt: verified ? new Date() : null
			}
		});

		await auditLog({
			userId: user.id,
			action: 'UPDATE',
			entityType: 'StudentDocument',
			entityId: documentId,
			description: `${verified ? 'Verificó' : 'Desverificó'} documento "${doc.name}"`
		});

		return {
			success: true,
			message: `Documento ${verified ? 'verificado' : 'desverificado'} correctamente`
		};
	},

	// Eliminar documento
	delete: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		const canDelete = await hasPermission(user.id, 'STUDENT', 'delete');
		if (!canDelete) {
			return fail(403, { error: 'No tenés permiso para eliminar documentos' });
		}

		const formData = await request.formData();
		const documentId = formData.get('documentId')?.toString();

		if (!documentId) {
			return fail(400, { error: 'ID de documento requerido' });
		}

		const doc = await prisma.studentDocument.findFirst({
			where: { id: documentId, studentId: params.id }
		});

		if (!doc) {
			return fail(404, { error: 'Documento no encontrado' });
		}

		// Eliminar archivo físico
		try {
			await unlink(join(process.cwd(), 'static', doc.fileUrl));
		} catch {
			// Ignorar error si archivo no existe
		}

		await prisma.studentDocument.delete({
			where: { id: documentId }
		});

		await auditLog({
			userId: user.id,
			action: 'DELETE',
			entityType: 'StudentDocument',
			entityId: documentId,
			description: `Eliminó documento "${doc.name}" del alumno ${params.id}`
		});

		return {
			success: true,
			message: 'Documento eliminado correctamente'
		};
	}
};
