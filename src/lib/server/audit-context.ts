import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditImpersonationContext {
	originalUserId: string;
	effectiveUserId: string;
	startedAt: string;
}

export interface AuditRequestContext {
	sessionId?: string;
	authenticatedUserId?: string;
	effectiveUserId?: string;
	impersonation?: AuditImpersonationContext;
}

const auditRequestStorage = new AsyncLocalStorage<AuditRequestContext>();

export function runWithAuditRequestContext<T>(context: AuditRequestContext, callback: () => T): T {
	return auditRequestStorage.run(context, callback);
}

export function getAuditRequestContext(): AuditRequestContext | undefined {
	return auditRequestStorage.getStore();
}
