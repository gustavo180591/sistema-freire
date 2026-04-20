import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { ENTITIES, type Entity, setPermission } from '$lib/server/auth/permissions-granular';
import { fail, error } from '@sveltejs/kit';

// Solo SUPERADMIN puede gestionar permisos
export const load: PageServerLoad = async ({ locals }) => {
    requireRole(locals.user, ['SUPERADMIN']);

    const roleCodes = ['DIRECTOR', 'SECRETARIA', 'DOCENTE', 'FINANZAS', 'ALUMNO', 'APODERADO', 'PRECEPTOR'];
    
    // Obtener todos los permisos existentes
    const permissions = await prisma.permission.findMany({
        orderBy: [{ roleCode: 'asc' }, { entity: 'asc' }]
    });

    // Organizar por rol
    const permissionsByRole: Record<string, any[]> = {};
    for (const role of roleCodes) {
        permissionsByRole[role] = permissions.filter(p => p.roleCode === role);
    }

    // Entidades disponibles
    const entityLabels: Record<string, string> = {
        'USER': 'Usuarios',
        'STUDENT': 'Alumnos',
        'TEACHER': 'Docentes',
        'CAREER': 'Carreras',
        'SUBJECT': 'Materias',
        'COMMISSION': 'Comisiones',
        'ACADEMIC_TERM': 'Ciclos Lectivos',
        'ENROLLMENT': 'Inscripciones',
        'STUDENT_CHARGE': 'Cargos',
        'PAYMENT': 'Pagos',
        'PAYSLIP': 'Recibos',
        'SCHOLARSHIP': 'Becas',
        'AUDIT_LOG': 'Auditoría',
        'PERMISSION': 'Permisos'
    };

    return {
        roleCodes,
        entities: ENTITIES,
        entityLabels,
        permissionsByRole
    };
};

export const actions: Actions = {
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
