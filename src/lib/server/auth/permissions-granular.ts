import { prisma } from '$lib/server/db/prisma';
import { error } from '@sveltejs/kit';

// Entidades disponibles para permisos
export const ENTITIES = [
  'USER',
  'STUDENT',
  'TEACHER',
  'CAREER',
  'SUBJECT',
  'COMMISSION',
  'ACADEMIC_TERM',
  'ENROLLMENT',
  'STUDENT_CHARGE',
  'PAYMENT',
  'PAYSLIP',
  'SCHOLARSHIP',
  'AUDIT_LOG',
  'PERMISSION'
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
    // Si no hay registro, usar defaults (solo lectura)
    return permission === 'read';
  }

  switch (permission) {
    case 'create': return permissionRecord.canCreate;
    case 'read': return permissionRecord.canRead;
    case 'update': return permissionRecord.canUpdate;
    case 'delete': return permissionRecord.canDelete;
    default: return false;
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
    throw error(403, `No tienes permiso para ${getPermissionLabel(permission)} ${getEntityLabel(entity)}`);
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
    'USER': 'usuarios',
    'STUDENT': 'alumnos',
    'TEACHER': 'docentes',
    'CAREER': 'carreras',
    'SUBJECT': 'materias',
    'COMMISSION': 'comisiones',
    'ACADEMIC_TERM': 'ciclos lectivos',
    'ENROLLMENT': 'inscripciones',
    'STUDENT_CHARGE': 'cargos',
    'PAYMENT': 'pagos',
    'PAYSLIP': 'recibos',
    'SCHOLARSHIP': 'becas',
    'AUDIT_LOG': 'auditoría',
    'PERMISSION': 'permisos'
  };
  return labels[entity] || entity.toLowerCase();
}

// Seed de permisos por defecto
export async function seedDefaultPermissions() {
  const defaultPermissions = [
    // DIRECTOR - Puede todo excepto permisos (solo SUPERADMIN)
    { roleCode: 'DIRECTOR', entity: 'USER', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'STUDENT', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'TEACHER', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'CAREER', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'SUBJECT', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'COMMISSION', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'ACADEMIC_TERM', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'ENROLLMENT', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'STUDENT_CHARGE', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'PAYMENT', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'PAYSLIP', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'SCHOLARSHIP', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    { roleCode: 'DIRECTOR', entity: 'AUDIT_LOG', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'DIRECTOR', entity: 'PERMISSION', canCreate: false, canRead: true, canUpdate: false, canDelete: false },

    // SECRETARIA - Puede gestionar académico pero no finanzas
    { roleCode: 'SECRETARIA', entity: 'USER', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'SECRETARIA', entity: 'STUDENT', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    { roleCode: 'SECRETARIA', entity: 'TEACHER', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'SECRETARIA', entity: 'CAREER', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'SECRETARIA', entity: 'SUBJECT', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'SECRETARIA', entity: 'COMMISSION', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'SECRETARIA', entity: 'ENROLLMENT', canCreate: true, canRead: true, canUpdate: true, canDelete: false },

    // FINANZAS - Solo finanzas
    { roleCode: 'FINANZAS', entity: 'USER', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'FINANZAS', entity: 'STUDENT', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'FINANZAS', entity: 'STUDENT_CHARGE', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    { roleCode: 'FINANZAS', entity: 'PAYMENT', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    { roleCode: 'FINANZAS', entity: 'PAYSLIP', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    { roleCode: 'FINANZAS', entity: 'SCHOLARSHIP', canCreate: false, canRead: true, canUpdate: false, canDelete: false },

    // DOCENTE - Solo lectura de lo académico y comisiones asignadas
    { roleCode: 'DOCENTE', entity: 'STUDENT', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'DOCENTE', entity: 'COMMISSION', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    { roleCode: 'DOCENTE', entity: 'PAYSLIP', canCreate: false, canRead: true, canUpdate: false, canDelete: false },

    // ALUMNO - Solo ver sus datos
    { roleCode: 'ALUMNO', entity: 'STUDENT', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  ];

  for (const perm of defaultPermissions) {
    await prisma.permission.upsert({
      where: {
        roleCode_entity: {
          roleCode: perm.roleCode as any,
          entity: perm.entity as Entity
        }
      },
      update: perm,
      create: perm
    });
  }
}
