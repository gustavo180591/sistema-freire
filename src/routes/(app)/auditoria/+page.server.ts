import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/prisma';
import { requireRole } from '$lib/server/auth/authorization';
import { error } from '@sveltejs/kit';
import type { AuditAction } from '@prisma/client';

export const load: PageServerLoad = async ({ url, locals }) => {
    // Solo SUPERADMIN y DIRECTOR pueden ver auditoría
    requireRole(locals.user, ['SUPERADMIN', 'DIRECTOR']);

    const searchParams = url.searchParams;
    
    // Filtros
    const action = searchParams.get('action') as AuditAction | null;
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 50;
    const skip = (page - 1) * limit;

    // Construir where clause
    const where: any = {};
    
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    // Obtener logs con paginación
    const [logs, totalCount, uniqueUsers, entityTypes] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        }),
        prisma.auditLog.count({ where }),
        prisma.user.findMany({
            where: { auditLogs: { some: {} } },
            select: { id: true, firstName: true, lastName: true, email: true },
            orderBy: { lastName: 'asc' }
        }),
        prisma.auditLog.groupBy({
            by: ['entityType'],
            _count: true,
            orderBy: { entityType: 'asc' }
        })
    ]);

    // Normalizar datos
    const normalizedLogs = logs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        createdAt: log.createdAt,
        user: log.user ? {
            id: log.user.id,
            fullName: `${log.user.firstName} ${log.user.lastName}`.trim(),
            email: log.user.email
        } : null
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return {
        logs: normalizedLogs,
        pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        },
        filters: {
            users: uniqueUsers.map(u => ({
                id: u.id,
                fullName: `${u.firstName} ${u.lastName}`.trim(),
                email: u.email
            })),
            entityTypes: entityTypes.map(et => et.entityType),
            actions: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'DOWNLOAD', 'EXPORT', 'BLOCKED_ATTEMPT']
        },
        currentFilters: {
            action,
            entityType,
            userId,
            dateFrom,
            dateTo
        }
    };
};
