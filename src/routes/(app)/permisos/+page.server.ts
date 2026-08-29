import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { ENTITIES, type Entity, setPermission } from '$lib/server/auth/permissions-granular';
import { fail, error } from '@sveltejs/kit';

// Solo SUPERADMIN puede gestionar permisos
export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ['SUPERADMIN']);

	const roleCodes = [
		'DIRECTOR',
		'SECRETARIA',
		'DOCENTE',
		'FINANZAS',
		'ALUMNO',
		'APODERADO',
		'PRECEPTOR',
		'LIQUIDADOR'
	];

	// Obtener todos los permisos existentes
	const permissions = await prisma.permission.findMany({
		orderBy: [{ roleCode: 'asc' }, { entity: 'asc' }]
	});

	// Organizar por rol
	const permissionsByRole: Record<string, any[]> = {};
	for (const role of roleCodes) {
		permissionsByRole[role] = permissions.filter((p) => p.roleCode === role);
	}

	// Entidades disponibles
	const entityLabels: Record<string, string> = {
		USER: 'Usuarios',
		STUDENT: 'Alumnos',
		TEACHER: 'Docentes',
		CAREER: 'Carreras',
		SUBJECT: 'Materias',
		SUBJECT_COMMISSION: 'Comisiones',
		SUBJECT_ENROLLMENT: 'Inscripciones a materias',
		ACADEMIC_TERM: 'Ciclos lectivos',
		STUDENT_CHARGE: 'Cargos de alumnos',
		PAYMENT: 'Pagos',
		RECEIPT: 'Recibos financieros',
		PAYSLIP: 'Recibos de sueldo',
		SCHOLARSHIP: 'Becas',
		AUDIT_LOG: 'Auditoría',
		PERMISSION: 'Permisos',
		GRADE: 'Calificaciones',
		ATTENDANCE: 'Asistencia',
		STUDENT_FOLLOW_UP: 'Seguimiento de alumnos',
		MATERIAL: 'Materiales',
		COMMUNICATION: 'Comunicaciones',
		EVALUATION: 'Evaluaciones y mesas',
		SCHEDULE: 'Horarios',
		DOCUMENT: 'Documentos',
		FINANCIAL_BLOCK: 'Bloqueos financieros',
		FINANCIAL_REPORT: 'Reportes financieros',
		PAYMENT_AGREEMENT: 'Convenios de pago'
	};

	return {
		roleCodes,
		entities: ENTITIES,
		entityLabels,
		permissionsByRole
	};
};

export const actions: Actions = {
	applyDirectorMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		try {
			await Promise.all(
				ENTITIES.map((entity) =>
					setPermission(
						'DIRECTOR',
						entity,
						entity === 'PERMISSION'
							? {
									canCreate: false,
									canRead: false,
									canUpdate: false,
									canDelete: false
								}
							: {
									canCreate: true,
									canRead: true,
									canUpdate: true,
									canDelete: true
								}
					)
				)
			);

			return {
				success: true,
				message:
					'Matriz de Director aplicada: acceso total operativo, excepto administración de permisos'
			};
		} catch (e) {
			console.error('Error applying Director permission matrix:', e);
			return fail(500, {
				error: 'No se pudo aplicar la matriz de permisos del Director'
			});
		}
	},

	applySecretaryMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const matrix: Record<
			Entity,
			{
				canCreate: boolean;
				canRead: boolean;
				canUpdate: boolean;
				canDelete: boolean;
			}
		> = {
			USER: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			STUDENT: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			TEACHER: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			CAREER: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			SUBJECT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			SUBJECT_COMMISSION: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			SUBJECT_ENROLLMENT: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: true
			},
			ACADEMIC_TERM: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			STUDENT_CHARGE: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			PAYMENT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			RECEIPT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			PAYSLIP: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			SCHOLARSHIP: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			AUDIT_LOG: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			PERMISSION: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			GRADE: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			ATTENDANCE: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			STUDENT_FOLLOW_UP: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			MATERIAL: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			COMMUNICATION: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			EVALUATION: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			SCHEDULE: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			DOCUMENT: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			FINANCIAL_BLOCK: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			FINANCIAL_REPORT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			PAYMENT_AGREEMENT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			}
		};

		try {
			await Promise.all(
				ENTITIES.map((entity) => setPermission('SECRETARIA', entity, matrix[entity]))
			);

			return {
				success: true,
				message: 'Matriz institucional de Secretaría aplicada correctamente'
			};
		} catch (e) {
			console.error('Error applying Secretaría permission matrix:', e);

			return fail(500, {
				error: 'No se pudo aplicar la matriz de permisos de Secretaría'
			});
		}
	},

	applyTeacherMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const matrix: Record<
			Entity,
			{
				canCreate: boolean;
				canRead: boolean;
				canUpdate: boolean;
				canDelete: boolean;
			}
		> = {
			USER: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			STUDENT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			TEACHER: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			CAREER: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			SUBJECT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			SUBJECT_COMMISSION: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			SUBJECT_ENROLLMENT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			ACADEMIC_TERM: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			STUDENT_CHARGE: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			PAYMENT: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			RECEIPT: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			PAYSLIP: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			SCHOLARSHIP: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			AUDIT_LOG: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			PERMISSION: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			GRADE: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			ATTENDANCE: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			STUDENT_FOLLOW_UP: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			MATERIAL: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: true
			},
			COMMUNICATION: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			EVALUATION: {
				canCreate: true,
				canRead: true,
				canUpdate: true,
				canDelete: false
			},
			SCHEDULE: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			DOCUMENT: {
				canCreate: true,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},
			FINANCIAL_BLOCK: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			FINANCIAL_REPORT: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},
			PAYMENT_AGREEMENT: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			}
		};

		try {
			await Promise.all(ENTITIES.map((entity) => setPermission('DOCENTE', entity, matrix[entity])));

			return {
				success: true,
				message: 'Matriz institucional de Docente aplicada correctamente'
			};
		} catch (e) {
			console.error('Error applying Docente permission matrix:', e);

			return fail(500, {
				error: 'No se pudo aplicar la matriz de permisos de Docente'
			});
		}
	},

	applyFinanceMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const matrix: Record<
			Entity,
			{
				canCreate: boolean;
				canRead: boolean;
				canUpdate: boolean;
				canDelete: boolean;
			}
		> = {
			USER: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			STUDENT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			TEACHER: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			CAREER: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			SUBJECT: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			SUBJECT_COMMISSION: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			SUBJECT_ENROLLMENT: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			ACADEMIC_TERM: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			STUDENT_CHARGE: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
			PAYMENT: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
			RECEIPT: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
			PAYSLIP: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			SCHOLARSHIP: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
			AUDIT_LOG: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			PERMISSION: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			GRADE: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			ATTENDANCE: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			STUDENT_FOLLOW_UP: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			MATERIAL: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			COMMUNICATION: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			EVALUATION: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			SCHEDULE: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			DOCUMENT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			FINANCIAL_BLOCK: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
			FINANCIAL_REPORT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			PAYMENT_AGREEMENT: { canCreate: true, canRead: true, canUpdate: true, canDelete: false }
		};

		try {
			await Promise.all(
				ENTITIES.map((entity) => setPermission('FINANZAS', entity, matrix[entity]))
			);

			return {
				success: true,
				message: 'Matriz institucional de Finanzas aplicada correctamente'
			};
		} catch (e) {
			console.error('Error applying Finanzas permission matrix:', e);

			return fail(500, {
				error: 'No se pudo aplicar la matriz de permisos de Finanzas'
			});
		}
	},

	applyPreceptorMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const matrix: Record<
			Entity,
			{
				canCreate: boolean;
				canRead: boolean;
				canUpdate: boolean;
				canDelete: boolean;
			}
		> = {
			USER: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			STUDENT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			TEACHER: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			CAREER: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			SUBJECT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			SUBJECT_COMMISSION: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			SUBJECT_ENROLLMENT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			ACADEMIC_TERM: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },

			STUDENT_CHARGE: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			PAYMENT: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			RECEIPT: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			PAYSLIP: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			SCHOLARSHIP: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },

			AUDIT_LOG: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			PERMISSION: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },

			GRADE: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
			ATTENDANCE: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
			STUDENT_FOLLOW_UP: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },

			MATERIAL: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			COMMUNICATION: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
			EVALUATION: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			SCHEDULE: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },

			DOCUMENT: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },

			FINANCIAL_BLOCK: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			FINANCIAL_REPORT: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			PAYMENT_AGREEMENT: { canCreate: false, canRead: false, canUpdate: false, canDelete: false }
		};

		try {
			await Promise.all(
				ENTITIES.map((entity) => setPermission('PRECEPTOR', entity, matrix[entity]))
			);

			return {
				success: true,
				message: 'Matriz institucional de Preceptor aplicada correctamente'
			};
		} catch (e) {
			console.error('Error applying Preceptor permission matrix:', e);

			return fail(500, {
				error: 'No se pudo aplicar la matriz de permisos de Preceptor'
			});
		}
	},

	applyStudentMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const matrix: Record<
			Entity,
			{
				canCreate: boolean;
				canRead: boolean;
				canUpdate: boolean;
				canDelete: boolean;
			}
		> = {
			USER: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			STUDENT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			TEACHER: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			CAREER: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			SUBJECT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			SUBJECT_COMMISSION: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },

			SUBJECT_ENROLLMENT: {
				canCreate: true,
				canRead: true,
				canUpdate: false,
				canDelete: true
			},

			ACADEMIC_TERM: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },

			STUDENT_CHARGE: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			PAYMENT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			RECEIPT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			PAYSLIP: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			SCHOLARSHIP: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },

			AUDIT_LOG: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
			PERMISSION: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },

			GRADE: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			ATTENDANCE: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },

			STUDENT_FOLLOW_UP: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},

			MATERIAL: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			COMMUNICATION: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			EVALUATION: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
			SCHEDULE: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },

			DOCUMENT: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },

			FINANCIAL_BLOCK: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			},

			FINANCIAL_REPORT: {
				canCreate: false,
				canRead: false,
				canUpdate: false,
				canDelete: false
			},

			PAYMENT_AGREEMENT: {
				canCreate: false,
				canRead: true,
				canUpdate: false,
				canDelete: false
			}
		};

		try {
			await Promise.all(ENTITIES.map((entity) => setPermission('ALUMNO', entity, matrix[entity])));

			return {
				success: true,
				message: 'Matriz institucional de Alumno aplicada correctamente'
			};
		} catch (e) {
			console.error('Error applying Alumno permission matrix:', e);

			return fail(500, {
				error: 'No se pudo aplicar la matriz de permisos de Alumno'
			});
		}
	},

	applyOwnerMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		try {
			await Promise.all(
				ENTITIES.map((entity) =>
					setPermission(
						'APODERADO',
						entity,
						entity === 'PERMISSION'
							? {
									canCreate: false,
									canRead: false,
									canUpdate: false,
									canDelete: false
								}
							: {
									canCreate: true,
									canRead: true,
									canUpdate: true,
									canDelete: true
								}
					)
				)
			);

			return {
				success: true,
				message:
					'Matriz institucional de Apoderado aplicada: acceso total operativo, excepto administración de permisos'
			};
		} catch (e) {
			console.error('Error applying Apoderado permission matrix:', e);

			return fail(500, {
				error: 'No se pudo aplicar la matriz de permisos de Apoderado'
			});
		}
	},

	applyPayrollMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		try {
			await Promise.all(
				ENTITIES.map((entity) =>
					setPermission(
						'LIQUIDADOR',
						entity,
						entity === 'PAYSLIP'
							? {
									canCreate: true,
									canRead: true,
									canUpdate: true,
									canDelete: false
								}
							: {
									canCreate: false,
									canRead: false,
									canUpdate: false,
									canDelete: false
								}
					)
				)
			);

			return {
				success: true,
				message: 'Matriz institucional de Liquidador aplicada correctamente'
			};
		} catch (e) {
			console.error('Error applying Liquidador permission matrix:', e);

			return fail(500, {
				error: 'No se pudo aplicar la matriz de permisos de Liquidador'
			});
		}
	},

	applyNoRoleMatrix: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		try {
			await Promise.all(
				ENTITIES.map((entity) =>
					setPermission('SIN_TIPO', entity, {
						canCreate: false,
						canRead: false,
						canUpdate: false,
						canDelete: false
					})
				)
			);

			return {
				success: true,
				message: 'Matriz de Sin tipo aplicada: sin acceso funcional'
			};
		} catch (e) {
			console.error('Error applying Sin tipo permission matrix:', e);

			return fail(500, {
				error: 'No se pudo aplicar la matriz de Sin tipo'
			});
		}
	},

	update: async ({ request, locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		const data = await request.formData();
		const roleCode = data.get('roleCode')?.toString();
		const entity = data.get('entity')?.toString();
		const canCreate = data.get('canCreate') === 'true';
		const canRead = data.get('canRead') === 'true';
		const canUpdate = data.get('canUpdate') === 'true';
		const canDelete = data.get('canDelete') === 'true';

		if (!roleCode || !entity) {
			return fail(400, { error: 'Faltan datos requeridos' });
		}

		try {
			await setPermission(roleCode, entity as Entity, {
				canCreate,
				canRead,
				canUpdate,
				canDelete
			});

			return { success: true };
		} catch (e) {
			console.error('Error updating permission:', e);
			return fail(500, { error: 'Error al actualizar permiso' });
		}
	},

	reset: async ({ locals }) => {
		requireRole(locals.user, ['SUPERADMIN']);

		try {
			// Importar dinámicamente para evitar problemas de circular dependency
			const { seedDefaultPermissions } = await import('$lib/server/auth/permissions-granular');
			await seedDefaultPermissions();

			return { success: true, message: 'Permisos restablecidos a valores por defecto' };
		} catch (e) {
			console.error('Error resetting permissions:', e);
			return fail(500, { error: 'Error al restablecer permisos' });
		}
	}
};
