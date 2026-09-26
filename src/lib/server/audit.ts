import type { AuditAction } from '@prisma/client';
import { getAuditRequestContext } from '$lib/server/audit-context';
import { prisma } from '$lib/server/db/prisma';

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
	const requestContext = getAuditRequestContext();

	let metadata = data.metadata;

	if (requestContext?.impersonation) {
		metadata = {
			...(data.metadata ?? {}),
			impersonation: {
				active: true,
				originalUserId: requestContext.impersonation.originalUserId,
				effectiveUserId: requestContext.impersonation.effectiveUserId,
				sessionId: requestContext.sessionId ?? null,
				startedAt: requestContext.impersonation.startedAt
			}
		};
	}

	return prisma.auditLog.create({
		data: {
			action: data.action,
			entityType: data.entityType,
			entityId: data.entityId,
			description: data.description,
			userId: data.userId ?? null,
			metadata: metadata ?? undefined,
			ip: data.ip ?? null,
			userAgent: data.userAgent ?? null
		}
	});
}
