import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import type { Document, DocumentOwnerType, DocumentVisibility, RoleCode } from '@prisma/client';

/**
 * Permission checks for document operations
 * Combines granular permissions with ownership and visibility rules
 * Uses explicit permission checks for DOCUMENT entity (no default read permission)
 */

/**
 * Check if a role has explicit DOCUMENT permission (no default)
 */
async function hasExplicitDocumentPermission(
	roleCode: string,
	permission: 'create' | 'read' | 'update' | 'delete'
): Promise<boolean> {
	// SUPERADMIN always has all permissions
	if (roleCode === 'SUPERADMIN') return true;

	const permissionRecord = await prisma.permission.findUnique({
		where: {
			roleCode_entity: {
				roleCode: roleCode as RoleCode,
				entity: 'DOCUMENT'
			}
		}
	});

	// If no explicit permission record exists, deny (secure by default for DOCUMENT)
	if (!permissionRecord) return false;

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

/**
 * Check if user has explicit DOCUMENT permission for any of their roles
 */
async function checkDocumentPermission(
	user: App.Locals['user'],
	permission: 'create' | 'read' | 'update' | 'delete'
): Promise<boolean> {
	if (!user) return false;

	// Check each role for explicit DOCUMENT permission
	for (const role of user.roles) {
		if (await hasExplicitDocumentPermission(role, permission)) {
			return true;
		}
	}

	return false;
}

/**
 * Check if user can create documents
 */
export async function canCreateDocument(user: App.Locals['user']): Promise<boolean> {
	if (!user) return false;
	return await checkDocumentPermission(user, 'create');
}

/**
 * Require user to have create permission
 */
export async function requireCreateDocumentPermission(user: App.Locals['user']): Promise<void> {
	if (!user) {
		throw error(401, 'No autenticado');
	}
	const hasPermission = await checkDocumentPermission(user, 'create');
	if (!hasPermission) {
		throw error(403, 'No tienes permiso para crear documentos');
	}
}

/**
 * Check if user can read a specific document
 * Takes into account:
 * - Granular read permission
 * - Document ownership
 * - Document visibility
 */
export async function canReadDocument(
	user: App.Locals['user'],
	document: Document
): Promise<boolean> {
	if (!user) return false;

	// SUPERADMIN always has access
	if (user.roles.includes('SUPERADMIN')) return true;

	// Check granular permission (explicit, no default)
	const hasReadPermission = await checkDocumentPermission(user, 'read');
	if (!hasReadPermission) return false;

	// Owner can always read their own documents
	if (document.ownerType === 'USER' && document.ownerId === user.id) return true;

	// Check visibility rules
	switch (document.visibility) {
		case 'PUBLIC':
			// Anyone with read permission can read public documents
			return true;

		case 'PRIVATE':
			// Only owner can read private documents
			return document.ownerType === 'USER' && document.ownerId === user.id;

		case 'INTERNAL':
			// Internal documents: only users with internal access
			// For now, treat as private (can be extended later)
			return document.ownerType === 'USER' && document.ownerId === user.id;

		default:
			return false;
	}
}

/**
 * Require user to have read permission for a specific document
 */
export async function requireReadDocumentPermission(
	user: App.Locals['user'],
	document: Document
): Promise<void> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const canRead = await canReadDocument(user, document);
	if (!canRead) {
		throw error(403, 'No tienes permiso para ver este documento');
	}
}

/**
 * Check if user can update a specific document
 */
export async function canUpdateDocument(
	user: App.Locals['user'],
	document: Document
): Promise<boolean> {
	if (!user) return false;

	// SUPERADMIN always has access
	if (user.roles.includes('SUPERADMIN')) return true;

	// Check granular permission (explicit, no default)
	const hasUpdatePermission = await checkDocumentPermission(user, 'update');
	if (!hasUpdatePermission) return false;

	// Owner can update their own documents
	return document.ownerType === 'USER' && document.ownerId === user.id;
}

/**
 * Require user to have update permission for a specific document
 */
export async function requireUpdateDocumentPermission(
	user: App.Locals['user'],
	document: Document
): Promise<void> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const canUpdate = await canUpdateDocument(user, document);
	if (!canUpdate) {
		throw error(403, 'No tienes permiso para editar este documento');
	}
}

/**
 * Check if user can delete a specific document
 */
export async function canDeleteDocument(
	user: App.Locals['user'],
	document: Document
): Promise<boolean> {
	if (!user) return false;

	// SUPERADMIN always has access
	if (user.roles.includes('SUPERADMIN')) return true;

	// Check granular permission (explicit, no default)
	const hasDeletePermission = await checkDocumentPermission(user, 'delete');
	if (!hasDeletePermission) return false;

	// Owner can delete their own documents
	return document.ownerType === 'USER' && document.ownerId === user.id;
}

/**
 * Require user to have delete permission for a specific document
 */
export async function requireDeleteDocumentPermission(
	user: App.Locals['user'],
	document: Document
): Promise<void> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const canDelete = await canDeleteDocument(user, document);
	if (!canDelete) {
		throw error(403, 'No tienes permiso para eliminar este documento');
	}
}

/**
 * Check if user can restore a specific document
 */
export async function canRestoreDocument(
	user: App.Locals['user'],
	document: Document
): Promise<boolean> {
	if (!user) return false;

	// SUPERADMIN always has access
	if (user.roles.includes('SUPERADMIN')) return true;

	// Check granular permission (explicit, no default)
	const hasDeletePermission = await checkDocumentPermission(user, 'delete');
	if (!hasDeletePermission) return false;

	// Owner can restore their own documents
	return document.ownerType === 'USER' && document.ownerId === user.id;
}

/**
 * Require user to have restore permission for a specific document
 */
export async function requireRestoreDocumentPermission(
	user: App.Locals['user'],
	document: Document
): Promise<void> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const canRestore = await canRestoreDocument(user, document);
	if (!canRestore) {
		throw error(403, 'No tienes permiso para restaurar este documento');
	}
}

/**
 * Check if user can list documents with given filters
 * For now, just check read permission (explicit, no default)
 */
export async function canListDocuments(user: App.Locals['user']): Promise<boolean> {
	if (!user) return false;
	return await checkDocumentPermission(user, 'read');
}

/**
 * Require user to have list permission
 */
export async function requireListDocumentsPermission(user: App.Locals['user']): Promise<void> {
	if (!user) {
		throw error(401, 'No autenticado');
	}

	const canList = await canListDocuments(user);
	if (!canList) {
		throw error(403, 'No tienes permiso para listar documentos');
	}
}
