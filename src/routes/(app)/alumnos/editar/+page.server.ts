import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import bcrypt from 'bcryptjs';
import { auditLog } from '$lib/server/audit';
import { AuditAction, StudentStatus } from '@prisma/client';
import { checkPermission } from '$lib/server/auth/permissions-granular';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'No autenticado' });

		// Verificar permiso para actualizar alumnos
		const canUpdate = await checkPermission(user, 'STUDENT', 'update');
		if (!canUpdate) {
			return fail(403, { error: 'No tenés permiso para actualizar alumnos' });
		}

		const data = await request.formData();
		const id = data.get('id')?.toString();
		const userId = data.get('userId')?.toString();
		const email = data.get('email')?.toString();
		const firstName = data.get('firstName')?.toString();
		const lastName = data.get('lastName')?.toString();
		const alumnoType = data.get('alumnoType')?.toString() || 'normal';
		const newPassword = data.get('newPassword')?.toString();
		const careerId = data.get('careerId')?.toString();
		const currentYear = data.get('currentYear')?.toString()
			? parseInt(data.get('currentYear')?.toString() || '1')
			: null;
		const status = data.get('status')?.toString();
		const statusReason = data.get('statusReason')?.toString();

		// Campos extendidos
		const birthDate = data.get('birthDate')?.toString();
		const bloodType = data.get('bloodType')?.toString();
		const phone = data.get('phone')?.toString();
		const address = data.get('address')?.toString();
		const locality = data.get('locality')?.toString();
		const postalCode = data.get('postalCode')?.toString();
		const highSchool = data.get('highSchool')?.toString();
		const highSchoolYear = data.get('highSchoolYear')?.toString();
		const instituteYear = data.get('instituteYear')?.toString();
		const familyContactName = data.get('familyContactName')?.toString();
		const familyContactPhone = data.get('familyContactPhone')?.toString();
		const familyRelationship = data.get('familyRelationship')?.toString();

		if (!id || !userId || !email || !firstName || !lastName) {
			return fail(400, { error: 'Por favor completá todos los campos requeridos' });
		}

		// Validar que el estado sea válido
		const validStatuses: StudentStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED'];
		if (status && !validStatuses.includes(status as StudentStatus)) {
			return fail(400, { error: 'Estado académico inválido' });
		}

		// Si el estado cambia a algo diferente de ACTIVE, requerir motivo
		if (status && status !== 'ACTIVE' && !statusReason?.trim()) {
			return fail(400, { error: 'El motivo es obligatorio para estados no activos' });
		}

		try {
			// Obtener estado actual del alumno para auditoría
			const currentStudent = await prisma.student.findUnique({
				where: { id },
				select: { status: true }
			});

			if (!currentStudent) {
				return fail(404, { error: 'Alumno no encontrado' });
			}

			const statusChanged = status && status !== currentStudent.status;

			// Validación: No se puede cambiar a GRADUATED sin confirmación de requisitos
			if (status === 'GRADUATED' && currentStudent.status !== 'GRADUATED') {
				// Verificar si el alumno tiene todas las materias aprobadas
				const student = await prisma.student.findUnique({
					where: { id },
					include: {
						subjectStatuses: true,
						career: {
							include: {
								careerSubjects: true
							}
						}
					}
				});

				if (!student) {
					return fail(404, { error: 'Alumno no encontrado' });
				}

				const totalSubjects = student.career.careerSubjects.length;
				const approvedSubjects = student.subjectStatuses.filter((s) => s.approved).length;

				if (approvedSubjects < totalSubjects) {
					return fail(400, {
						error: `El alumno no puede egresar. Tiene ${approvedSubjects} de ${totalSubjects} materias aprobadas.`
					});
				}
			}

			// Actualizar en transacción
			await prisma.$transaction(async (tx) => {
				// Preparar datos de actualización del usuario
				const userUpdateData: any = {
					email,
					firstName,
					lastName
				};

				// Si se proporcionó una nueva contraseña, hashearla y actualizarla
				if (newPassword && newPassword.trim().length > 0) {
					userUpdateData.passwordHash = await bcrypt.hash(newPassword, 10);
				}

				// Actualizar usuario
				await tx.user.update({
					where: { id: userId },
					data: userUpdateData
				});

				// Calcular flags según tipo
				const isBecado = alumnoType === 'becado';
				const isRecursante = alumnoType === 'recursante';

				// Actualizar alumno con campos extendidos
				await tx.student.update({
					where: { id },
					data: {
						firstName,
						lastName,
						isBecado,
						isRecursante,
						careerId: careerId || undefined,
						currentYear: currentYear || undefined,
						status: status ? (status as StudentStatus) : undefined,
						birthDate: birthDate ? new Date(birthDate) : null,
						bloodType: bloodType || null,
						phone: phone || null,
						address: address || null,
						locality: locality || null,
						postalCode: postalCode || null,
						highSchool: highSchool || null,
						highSchoolYear: highSchoolYear ? parseInt(highSchoolYear) : null,
						instituteYear: instituteYear ? parseInt(instituteYear) : null,
						familyContactName: familyContactName || null,
						familyContactPhone: familyContactPhone || null,
						familyRelationship: familyRelationship || null
					}
				});
			});

			// Registrar en auditoría
			let auditDescription = `Actualización de alumno: ${firstName} ${lastName} (${email})`;

			if (statusChanged) {
				auditDescription += ` - Cambio de estado: ${currentStudent.status} → ${status}`;
				if (statusReason) {
					auditDescription += ` (Motivo: ${statusReason})`;
				}
			}

			await auditLog({
				userId: user.id,
				action: AuditAction.UPDATE,
				entityType: 'STUDENT',
				entityId: id,
				description: auditDescription
			});

			const successMessage =
				newPassword && newPassword.trim().length > 0
					? 'Alumno actualizado exitosamente (incluyendo contraseña)'
					: 'Alumno actualizado exitosamente';

			return { success: successMessage };
		} catch (error) {
			console.error('Error al actualizar alumno:', error);
			const message = error instanceof Error ? error.message : 'Error al actualizar el alumno';
			return fail(500, { error: message });
		}
	}
};
