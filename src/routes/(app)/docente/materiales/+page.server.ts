import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { auditLog } from '$lib/server/audit';
import { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['DOCENTE']);

	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Obtener el docente asociado al usuario
	const teacher = await prisma.teacher.findUnique({
		where: { userId: locals.user.id }
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las materias asignadas al docente
	const subjectTeachers = await prisma.subjectTeacher.findMany({
		where: { teacherId: teacher.id },
		include: {
			subject: {
				include: {
					careerSubjects: {
						include: {
							career: true
						}
					}
				}
			}
		}
	});

	const subjects = subjectTeachers.map(st => st.subject);

	// Obtener materiales de clase del docente
	const materials = await prisma.classMaterial.findMany({
		where: {
			uploadedBy: locals.user.id,
			subjectId: {
				in: subjects.map(s => s.id)
			}
		},
		include: {
			subject: true,
			uploader: true
		},
		orderBy: { createdAt: 'desc' },
		take: 50
	});

	return {
		subjects: subjects.map(s => ({
			id: s.id,
			code: s.code,
			name: s.name,
			yearLevel: s.yearLevel,
			careers: s.careerSubjects.map(cs => cs.career.name)
		})),
		materials: materials.map(m => ({
			id: m.id,
			title: m.title,
			description: m.description,
			fileUrl: m.fileUrl,
			fileSize: m.fileSize,
			mimeType: m.mimeType,
			subject: m.subject.name,
			createdAt: m.createdAt,
			uploaderName: `${m.uploader.firstName} ${m.uploader.lastName}`
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user, ['DOCENTE']);

		if (!locals.user) {
			return { error: 'No autenticado' };
		}

		const data = await request.formData();
		const subjectId = data.get('subjectId')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const file = data.get('file') as File;

		if (!subjectId || !title || !file) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Verificar que la materia pertenezca al docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: locals.user.id }
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			const subjectTeacher = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId,
						teacherId: teacher.id
					}
				}
			});

			if (!subjectTeacher) {
				return { error: 'No tenés permiso para subir materiales a esta materia' };
			}

			// Obtener datos de la materia para auditoría
			const subject = await prisma.subject.findUnique({
				where: { id: subjectId }
			});

			// Convertir archivo a buffer
			const bytes = await file.arrayBuffer();
			const buffer = Buffer.from(bytes);

			// Generar nombre de archivo único
			const timestamp = Date.now();
			const fileName = `${timestamp}-${file.name}`;
			const fileUrl = `/uploads/materials/${fileName}`;

			// Guardar archivo en sistema de archivos
			// Nota: En producción esto debería ir a un servicio de almacenamiento como S3
			const fs = await import('fs');
			const path = await import('path');
			const uploadsDir = path.join(process.cwd(), 'static', 'uploads', 'materials');

			try {
				await fs.promises.mkdir(uploadsDir, { recursive: true });
			} catch (e) {
				// Directorio ya existe
			}

			const filePath = path.join(uploadsDir, fileName);
			await fs.promises.writeFile(filePath, buffer);

			await prisma.classMaterial.create({
				data: {
					subjectId,
					title,
					description: description || null,
					fileUrl,
					fileSize: file.size,
					mimeType: file.type,
					uploadedBy: locals.user.id
				}
			});

			// Registrar en auditoría
			await auditLog({
				userId: locals.user.id,
				action: AuditAction.CREATE,
				entityType: 'MATERIAL',
				entityId: subjectId,
				description: `Material de clase subido: ${title} para ${subject?.name} (${file.name})`
			});

			return { success: 'Material subido exitosamente' };
		} catch (error) {
			console.error('Error al subir material:', error);
			return { error: 'Error al subir el material' };
		}
	}
};
