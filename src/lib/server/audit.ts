import { prisma } from '$lib/server/db/prisma';
import type { AuditAction } from '@prisma/client';

type AuditLogInput = {
	action: AuditAction;
	entityType: string;
	entityId?: string;
	description: string;
	userId?: string;
	metadata?: Record<string, any>;
	ip?: string;
	userAgent?: string;
};

export async function auditLog(data: AuditLogInput) {
	return prisma.auditLog.create({
		data: {
			action: data.action,
			entityType: data.entityType,
			entityId: data.entityId,
			description: data.description,
			userId: data.userId ?? null,
			metadata: data.metadata ? data.metadata : undefined,
			ip: data.ip ?? null,
			userAgent: data.userAgent ?? null
		}
	});
}
