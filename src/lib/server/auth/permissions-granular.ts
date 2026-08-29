import { prisma } from '$lib/server/db/prisma';
import { error } from '@sveltejs/kit';

// Entidades disponibles para permisos
export const ENTITIES = [
	'USER',
	'STUDENT',
	'TEACHER',
	'CAREER',
	'SUBJECT',
	'SUBJECT_COMMISSION',
	'SUBJECT_ENROLLMENT',
	'ACADEMIC_TERM',
	'STUDENT_CHARGE',
	'PAYMENT',
	'RECEIPT',
	'PAYSLIP',
	'SCHOLARSHIP',
	'AUDIT_LOG',
	'PERMISSION',
	'GRADE',
	'ATTENDANCE',
	'STUDENT_FOLLOW_UP',
	'MATERIAL',
	'COMMUNICATION',
	'EVALUATION',
	'SCHEDULE',
	'DOCUMENT',
	'FINANCIAL_BLOCK',
	'FINANCIAL_REPORT',
	'PAYMENT_AGREEMENT'
] as const;

export type Entity = (typeof ENTITIES)[number];

// Tipo de permiso
export type PermissionType = 'create' | 'read' | 'update' | 'delete';

// Verificar si un rol tiene un permiso específico
export async function hasPermission(
	roleCode: string,
	entity: Entity,
	permission: PermissionType
): Promise<boolean> {
	// SUPERADMIN siempre tiene todos los permisos
	if (roleCode === 'SUPERADMIN') return true;

	const permissionRecord = await prisma.permission.findUnique({
		where: {
			roleCode_entity: {
				roleCode: roleCode as any,
				entity
			}
		}
	});

	if (!permissionRecord) {
		// Seguridad por defecto: todo permiso debe concederse explícitamente.
		return false;
	}

	switch (permission) {
		case 'create':
			return permissionRecord.canCreate;
		case 'read':
			return permissionRecord.canRead;
		case 'update':
			return permissionRecord.canUpdate;
		case 'delete':
			return permissionRecord.canDelete;
		default:
			return false;
	}
}

// Verificar si el usuario tiene alguno de los roles con el permiso requerido
export async function checkPermission(
	user: App.Locals['user'],
	entity: Entity,
	permission: PermissionType
): Promise<boolean> {
	if (!user) return false;

	// Verificar cada rol del usuario
	for (const role of user.roles) {
		if (await hasPermission(role, entity, permission)) {
			return true;
		}
	}

	return false;
}

// Requerir permiso (lanza error si no tiene)
export async function requirePermission(
	user: App.Locals['user'],
	entity: Entity,
	permission: PermissionType
): Promise<void> {
	const hasAccess = await checkPermission(user, entity, permission);

	if (!hasAccess) {
		throw error(
			403,
			`No tienes permiso para ${getPermissionLabel(permission)} ${getEntityLabel(entity)}`
		);
	}
}

// Obtener todos los permisos de un rol
export async function getRolePermissions(roleCode: string) {
	return prisma.permission.findMany({
		where: { roleCode: roleCode as any },
		orderBy: { entity: 'asc' }
	});
}

// Crear o actualizar permiso
export async function setPermission(
	roleCode: string,
	entity: Entity,
	permissions: {
		canCreate?: boolean;
		canRead?: boolean;
		canUpdate?: boolean;
		canDelete?: boolean;
	}
) {
	return prisma.permission.upsert({
		where: {
			roleCode_entity: {
				roleCode: roleCode as any,
				entity
			}
		},
		update: permissions,
		create: {
			roleCode: roleCode as any,
			entity,
			...permissions
		}
	});
}

// Helpers para labels
function getPermissionLabel(permission: PermissionType): string {
	const labels: Record<PermissionType, string> = {
		create: 'crear',
		read: 'ver',
		update: 'editar',
		delete: 'eliminar'
	};
	return labels[permission];
}

function getEntityLabel(entity: Entity): string {
	const labels: Record<Entity, string> = {
		USER: 'usuarios',
		STUDENT: 'alumnos',
		TEACHER: 'docentes',
		CAREER: 'carreras',
		SUBJECT: 'materias',
		SUBJECT_COMMISSION: 'comisiones',
		SUBJECT_ENROLLMENT: 'inscripciones',
		ACADEMIC_TERM: 'ciclos lectivos',
		STUDENT_CHARGE: 'cargos',
		PAYMENT: 'pagos',
		RECEIPT: 'recibos financieros',
		PAYSLIP: 'liquidaciones',
		SCHOLARSHIP: 'becas',
		AUDIT_LOG: 'auditoría',
		PERMISSION: 'permisos',
		GRADE: 'calificaciones',
		ATTENDANCE: 'asistencia',
		STUDENT_FOLLOW_UP: 'seguimientos',
		PAYMENT_AGREEMENT: 'convenios de pago',
		MATERIAL: 'materiales',
		COMMUNICATION: 'comunicaciones',
		EVALUATION: 'evaluaciones',
		SCHEDULE: 'horarios',
		DOCUMENT: 'documentos',
		FINANCIAL_BLOCK: 'bloqueos financieros',
		FINANCIAL_REPORT: 'reportes financieros'
	};
	return labels[entity] || entity.toLowerCase();
}

// Seed de permisos por defecto
export async function seedDefaultPermissions() {
	type PermissionFlags = {
		canCreate: boolean;
		canRead: boolean;
		canUpdate: boolean;
		canDelete: boolean;
	};

	const NONE: PermissionFlags = {
		canCreate: false,
		canRead: false,
		canUpdate: false,
		canDelete: false
	};

	const READ: PermissionFlags = {
		canCreate: false,
		canRead: true,
		canUpdate: false,
		canDelete: false
	};

	const CR: PermissionFlags = {
		canCreate: true,
		canRead: true,
		canUpdate: false,
		canDelete: false
	};

	const CRU: PermissionFlags = {
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: false
	};

	const CRD: PermissionFlags = {
		canCreate: true,
		canRead: true,
		canUpdate: false,
		canDelete: true
	};

	const CRUD: PermissionFlags = {
		canCreate: true,
		canRead: true,
		canUpdate: true,
		canDelete: true
	};

	const roleNames: Record<string, string> = {
		DIRECTOR: 'Director',
		SECRETARIA: 'Secretaría',
		DOCENTE: 'Docente',
		FINANZAS: 'Finanzas',
		PRECEPTOR: 'Preceptor',
		ALUMNO: 'Alumno',
		APODERADO: 'Apoderado',
		LIQUIDADOR: 'Liquidador',
		SIN_TIPO: 'Sin tipo'
	};

	const managedRoles = Object.keys(roleNames);

	/*
	 * DIRECTOR y APODERADO poseen autoridad operativa completa.
	 * PERMISSION queda reservado exclusivamente a SUPERADMIN.
	 */
	const fullOperationalRoles = new Set(['DIRECTOR', 'APODERADO']);

	/*
	 * Las entidades no declaradas aquí quedan explícitamente en NONE.
	 * Esto acompaña la política deny-by-default de hasPermission().
	 */
	const grants: Record<string, Partial<Record<Entity, PermissionFlags>>> = {
		DIRECTOR: {},

		SECRETARIA: {
			USER: CRU,
			STUDENT: CRU,
			TEACHER: CRU,
			CAREER: READ,
			SUBJECT: READ,
			SUBJECT_COMMISSION: CRU,
			SUBJECT_ENROLLMENT: CRUD,
			ACADEMIC_TERM: READ,
			STUDENT_CHARGE: READ,
			PAYMENT: READ,
			RECEIPT: READ,
			SCHOLARSHIP: CRU,
			GRADE: READ,
			ATTENDANCE: READ,
			STUDENT_FOLLOW_UP: CRU,
			MATERIAL: READ,
			COMMUNICATION: CRU,
			EVALUATION: CRU,
			SCHEDULE: CRU,
			DOCUMENT: CRU,
			FINANCIAL_BLOCK: READ,
			FINANCIAL_REPORT: READ,
			PAYMENT_AGREEMENT: READ
		},

		DOCENTE: {
			STUDENT: READ,
			TEACHER: READ,
			CAREER: READ,
			SUBJECT: READ,
			SUBJECT_COMMISSION: READ,
			SUBJECT_ENROLLMENT: READ,
			ACADEMIC_TERM: READ,
			GRADE: CRU,
			ATTENDANCE: CRU,
			STUDENT_FOLLOW_UP: CRU,
			MATERIAL: CRUD,
			COMMUNICATION: CRU,
			EVALUATION: CRU,
			SCHEDULE: READ,
			DOCUMENT: CR
		},

		FINANZAS: {
			USER: READ,
			STUDENT: READ,
			CAREER: READ,
			ACADEMIC_TERM: READ,
			STUDENT_CHARGE: CRU,
			PAYMENT: CRU,
			RECEIPT: CRU,
			SCHOLARSHIP: CRUD,
			DOCUMENT: READ,
			FINANCIAL_BLOCK: CRU,
			FINANCIAL_REPORT: READ,
			PAYMENT_AGREEMENT: CRU
		},

		PRECEPTOR: {
			STUDENT: READ,
			TEACHER: READ,
			CAREER: READ,
			SUBJECT: READ,
			SUBJECT_COMMISSION: READ,
			SUBJECT_ENROLLMENT: READ,
			ACADEMIC_TERM: READ,
			GRADE: CRU,
			ATTENDANCE: CRU,
			STUDENT_FOLLOW_UP: CRU,
			MATERIAL: READ,
			COMMUNICATION: CRU,
			EVALUATION: READ,
			SCHEDULE: READ,
			DOCUMENT: CRU
		},

		ALUMNO: {
			USER: READ,
			STUDENT: READ,
			TEACHER: READ,
			CAREER: READ,
			SUBJECT: READ,
			SUBJECT_COMMISSION: READ,
			SUBJECT_ENROLLMENT: CRD,
			ACADEMIC_TERM: READ,
			STUDENT_CHARGE: READ,
			PAYMENT: READ,
			RECEIPT: READ,
			SCHOLARSHIP: READ,
			GRADE: READ,
			ATTENDANCE: READ,
			MATERIAL: READ,
			COMMUNICATION: READ,
			EVALUATION: READ,
			SCHEDULE: READ,
			DOCUMENT: READ,
			FINANCIAL_BLOCK: READ,
			PAYMENT_AGREEMENT: READ
		},

		APODERADO: {},

		LIQUIDADOR: {
			PAYSLIP: CRU
		},

		SIN_TIPO: {}
	};

	const defaultPermissions = managedRoles.flatMap((roleCode) =>
		ENTITIES.map((entity) => {
			const permissions =
				fullOperationalRoles.has(roleCode) && entity !== 'PERMISSION'
					? CRUD
					: (grants[roleCode]?.[entity] ?? NONE);

			return {
				roleCode,
				entity,
				...permissions
			};
		})
	);

	if (defaultPermissions.length !== managedRoles.length * ENTITIES.length) {
		throw new Error(
			`Matriz institucional incompleta: ${defaultPermissions.length}/${managedRoles.length * ENTITIES.length}`
		);
	}

	await prisma.$transaction(async (tx) => {
		/*
		 * Asegurar también las filas de roles institucionales.
		 * Esto evita casos como LIQUIDADOR existente en RoleCode
		 * pero ausente de la tabla roles.
		 */
		for (const [roleCode, name] of Object.entries(roleNames)) {
			await tx.role.upsert({
				where: {
					code: roleCode as any
				},
				update: {
					name
				},
				create: {
					code: roleCode as any,
					name
				}
			});
		}

		/*
		 * "Restablecer" significa reemplazar completamente la matriz
		 * de estos roles por los valores institucionales oficiales.
		 *
		 * SUPERADMIN queda fuera porque posee bypass técnico.
		 */
		await tx.permission.deleteMany({
			where: {
				roleCode: {
					in: managedRoles as any
				}
			}
		});

		await tx.permission.createMany({
			data: defaultPermissions.map((permission) => ({
				roleCode: permission.roleCode as any,
				entity: permission.entity,
				canCreate: permission.canCreate,
				canRead: permission.canRead,
				canUpdate: permission.canUpdate,
				canDelete: permission.canDelete
			}))
		});
	});
}
