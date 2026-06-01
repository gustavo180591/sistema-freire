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
		where: { userId: locals.user.id },
		include: {
			commissions: {
				include: {
					commission: {
						include: {
							subject: true,
							term: true
						}
					}
				}
			}
		}
	});

	if (!teacher) {
		throw redirect(303, '/dashboard');
	}

	// Obtener las comisiones asignadas al docente
	const commissions = teacher.commissions.map(ct => ct.commission);

	// Obtener materiales de clase del docente
	const materials = await prisma.classMaterial.findMany({
		where: {
			uploadedBy: locals.user.id,
			commissionId: {
				in: commissions.map(c => c.id)
			}
		},
		include: {
			commission: {
				include: {
					subject: true
				}
			},
			uploader: true
		},
		orderBy: { createdAt: 'desc' },
		take: 50
	});

	return {
		commissions: commissions.map(c => ({
			id: c.id,
			name: c.name,
			subject: c.subject.name,
			term: c.term.name,
			active: c.active
		})),
		materials: materials.map(m => ({
			id: m.id,
			title: m.title,
			description: m.description,
			fileUrl: m.fileUrl,
			fileSize: m.fileSize,
			mimeType: m.mimeType,
			subject: m.commission.subject.name,
			commission: m.commission.name,
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
		const commissionId = data.get('commissionId')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const file = data.get('file') as File;

		if (!commissionId || !title || !file) {
			return { error: 'Por favor completá todos los campos requeridos' };
		}

		try {
			// Verificar que la comisión pertenezca al docente
			const teacher = await prisma.teacher.findUnique({
				where: { userId: locals.user.id },
				include: {
					commissions: true
				}
			});

			if (!teacher) {
				return { error: 'Docente no encontrado' };
			}

			const teacherCommissionIds = teacher.commissions.map(ct => ct.commissionId);
			if (!teacherCommissionIds.includes(commissionId)) {
				return { error: 'No tenés permiso para subir materiales a esta comisión' };
			}

			// Obtener datos de la comisión para auditoría
			const commission = await prisma.commission.findUnique({
				where: { id: commissionId },
				include: { subject: true }
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
					commissionId,
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
				entityId: commissionId,
				description: `Material de clase subido: ${title} para ${commission?.subject.name} (${file.name})`
			});

			return { success: 'Material subido exitosamente' };
		} catch (error) {
			console.error('Error al subir material:', error);
			return { error: 'Error al subir el material' };
		}
	}
};
