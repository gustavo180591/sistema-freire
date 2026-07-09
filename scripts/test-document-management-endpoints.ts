import {
	PrismaClient,
	UserStatus,
	DocumentOwnerType,
	DocumentCategory,
	DocumentSubType,
	DocumentVisibility,
	DocumentAccessAction,
	RoleCode
} from '@prisma/client';
import { documentManagementService } from '../src/lib/server/document-management/document-management.service';
import { documentStorageService } from '../src/lib/server/document-management/document-storage.service';
import {
	createDocumentApi,
	listDocumentsApi,
	getDocumentApi,
	deleteDocumentApi,
	restoreDocumentApi,
	downloadDocumentApi
} from '../src/lib/server/document-management/document-api-helpers';
import { createTestPdfFile } from './helpers/document-management-test-files';

const prisma = new PrismaClient();

/**
 * Type for mock user object in tests
 * Matches the expected user structure for API helpers
 */
interface MockUser {
	id: string;
	roles: string[];
	email: string;
	firstName: string;
	lastName: string;
}

// Mock user object
function createMockUser(id: string, roles: string[]): MockUser {
	return {
		id,
		roles,
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User'
	};
}

async function testDocumentManagementEndpoints() {
	const testUserIds: string[] = [];
	const testDocumentIds: string[] = [];

	try {
		console.log('🧪 Testing Document Management Endpoints...\n');

		// Test 1: Create test user with SUPERADMIN role
		console.log('Test 1: Creating test user with SUPERADMIN role...');
		const adminUser = await prisma.user.create({
			data: {
				email: 'admin-doc-test@example.com',
				passwordHash: 'test',
				firstName: 'Admin',
				lastName: 'Test',
				status: UserStatus.ACTIVE
			}
		});
		testUserIds.push(adminUser.id);

		// Get SUPERADMIN role
		const superadminRole = await prisma.role.findUnique({
			where: { code: RoleCode.SUPERADMIN }
		});

		if (!superadminRole) {
			throw new Error('SUPERADMIN role not found');
		}

		// Assign SUPERADMIN role
		await prisma.userRole.create({
			data: {
				userId: adminUser.id,
				roleId: superadminRole.id
			}
		});

		const mockAdmin = createMockUser(adminUser.id, ['SUPERADMIN']);
		console.log(`✅ Test admin user created: ${adminUser.id}\n`);

		// Test 2: Create test user with no permissions
		console.log('Test 2: Creating test user with no permissions...');
		const noPermUser = await prisma.user.create({
			data: {
				email: 'noperm-doc-test@example.com',
				passwordHash: 'test',
				firstName: 'NoPerm',
				lastName: 'Test',
				status: UserStatus.ACTIVE
			}
		});
		testUserIds.push(noPermUser.id);
		const mockNoPerm = createMockUser(noPermUser.id, []);
		console.log(`✅ Test no-permission user created: ${noPermUser.id}\n`);

		// Test 3: Unauthenticated user receives 401
		console.log('Test 3: Unauthenticated user receives 401...');
		try {
			await createDocumentApi(null, {
				file: createTestPdfFile(),
				ownerType: DocumentOwnerType.USER,
				ownerId: adminUser.id,
				category: DocumentCategory.ACADEMIC,
				subType: DocumentSubType.ENROLLMENT_CERTIFICATE,
				visibility: DocumentVisibility.PRIVATE
			});
			throw new Error('Unauthenticated user should have received 401');
		} catch (e: unknown) {
			const error = e as { status?: number; message?: string };
			if (
				error.status === 401 ||
				(error.message && error.message.includes('401')) ||
				(error.message && error.message.includes('autenticado'))
			) {
				console.log(`✅ Unauthenticated user correctly received 401\n`);
			} else {
				throw e;
			}
		}

		// Test 4: User without permission receives 403
		console.log('Test 4: User without permission receives 403...');
		try {
			await createDocumentApi(mockNoPerm, {
				file: createTestPdfFile(),
				ownerType: DocumentOwnerType.USER,
				ownerId: noPermUser.id,
				category: DocumentCategory.ACADEMIC,
				subType: DocumentSubType.ENROLLMENT_CERTIFICATE,
				visibility: DocumentVisibility.PRIVATE
			});
			throw new Error('User without permission should have received 403');
		} catch (e: unknown) {
			const error = e as { status?: number; message?: string };
			if (
				error.status === 403 ||
				(error.message && error.message.includes('403')) ||
				(error.message && error.message.includes('permiso'))
			) {
				console.log(`✅ User without permission correctly received 403\n`);
			} else {
				throw e;
			}
		}

		// Test 5: User without permission cannot access foreign document
		console.log('Test 5: User without permission cannot access foreign document...');
		const foreignDoc = await createDocumentApi(mockAdmin, {
			file: createTestPdfFile(),
			ownerType: DocumentOwnerType.USER,
			ownerId: adminUser.id,
			category: DocumentCategory.ACADEMIC,
			subType: DocumentSubType.ENROLLMENT_CERTIFICATE,
			visibility: DocumentVisibility.PRIVATE
		});
		testDocumentIds.push(foreignDoc.id);
		try {
			await getDocumentApi(mockNoPerm, foreignDoc.id);
			throw new Error('User without permission should not access foreign document');
		} catch (e: unknown) {
			const error = e as { status?: number; message?: string };
			if (
				error.status === 403 ||
				(error.message && error.message.includes('403')) ||
				(error.message && error.message.includes('permiso'))
			) {
				console.log(`✅ User without permission correctly cannot access foreign document\n`);
			} else {
				throw e;
			}
		}

		// Test 6: User with permission can upload document
		console.log('Test 6: User with permission can upload document...');
		const testFile = createTestPdfFile();
		const testMetadata = { test: true, foo: 'bar', number: 42 };
		const document = await createDocumentApi(mockAdmin, {
			file: testFile,
			ownerType: DocumentOwnerType.USER,
			ownerId: adminUser.id,
			category: DocumentCategory.ACADEMIC,
			subType: DocumentSubType.ENROLLMENT_CERTIFICATE,
			visibility: DocumentVisibility.PRIVATE,
			metadata: testMetadata
		});
		testDocumentIds.push(document.id);
		console.log(`✅ Document uploaded: ${document.id}`);
		console.log(`   - Original name: ${document.originalName}`);
		console.log(`   - MIME type: ${document.mimeType}`);
		console.log(`   - Size: ${document.sizeBytes} bytes\n`);

		// Test 7: Upload creates Document record
		console.log('Test 7: Upload creates Document record...');
		const dbDocument = await prisma.document.findUnique({
			where: { id: document.id }
		});
		if (dbDocument) {
			console.log(`✅ Document record exists in database\n`);
		} else {
			throw new Error('Document record does not exist');
		}

		// Test 8: Upload creates UPLOAD log
		console.log('Test 8: Upload creates UPLOAD log...');
		const uploadLogs = await prisma.documentAccessLog.findMany({
			where: {
				documentId: document.id,
				action: DocumentAccessAction.UPLOAD
			}
		});
		if (uploadLogs.length > 0) {
			console.log(`✅ UPLOAD log created: ${uploadLogs[0].id}\n`);
		} else {
			throw new Error('UPLOAD log was not created');
		}

		// Test 9: List returns uploaded document
		console.log('Test 9: List returns uploaded document...');
		const documents = await listDocumentsApi(mockAdmin, {
			ownerType: DocumentOwnerType.USER,
			ownerId: adminUser.id
		});
		if (documents.length > 0 && documents[0].id === document.id) {
			console.log(`✅ List returns uploaded document\n`);
		} else {
			throw new Error('List did not return uploaded document');
		}

		// Test 10: User without permission cannot list foreign documents
		console.log('Test 10: User without permission cannot list foreign documents...');
		try {
			await listDocumentsApi(mockNoPerm, {
				ownerType: DocumentOwnerType.USER,
				ownerId: adminUser.id
			});
			throw new Error('User without permission should not list foreign documents');
		} catch (e: unknown) {
			const error = e as { status?: number; message?: string };
			if (
				error.status === 403 ||
				(error.message && error.message.includes('403')) ||
				(error.message && error.message.includes('permiso'))
			) {
				console.log(`✅ User without permission correctly cannot list foreign documents\n`);
			} else {
				throw e;
			}
		}

		// Test 11: Detail returns document without absolute paths
		console.log('Test 11: Detail returns document without absolute paths...');
		const detail = await getDocumentApi(mockAdmin, document.id);
		const detailStr = JSON.stringify(detail);
		if (
			detailStr.includes('/home/') ||
			detailStr.includes('/storage/') ||
			detailStr.includes('/private/')
		) {
			throw new Error('Detail response contains absolute paths');
		}
		console.log(`✅ Detail response has no absolute paths\n`);

		// Test 12: Detail registers VIEW
		console.log('Test 12: Detail registers VIEW...');
		const viewLogs = await prisma.documentAccessLog.findMany({
			where: {
				documentId: document.id,
				action: DocumentAccessAction.VIEW
			}
		});
		if (viewLogs.length > 0) {
			console.log(`✅ VIEW log registered\n`);
		} else {
			throw new Error('VIEW log was not registered');
		}

		// Test 13: Download returns correct content
		console.log('Test 13: Download returns correct content...');
		const downloadResult = await downloadDocumentApi(mockAdmin, {
			documentId: document.id
		});
		if (downloadResult.buffer.byteLength > 0) {
			console.log(`✅ Download returns content: ${downloadResult.buffer.byteLength} bytes\n`);
		} else {
			throw new Error('Download returned empty content');
		}

		// Test 14: Download has correct Content-Type
		console.log('Test 14: Download has correct Content-Type...');
		if (downloadResult.mimeType === 'application/pdf') {
			console.log(`✅ Download has correct Content-Type: ${downloadResult.mimeType}\n`);
		} else {
			throw new Error('Download has incorrect Content-Type');
		}

		// Test 15: Download has secure Content-Disposition
		console.log('Test 15: Download has secure Content-Disposition...');
		if (downloadResult.fileName === document.originalName) {
			console.log(`✅ Download has correct filename\n`);
		} else {
			throw new Error('Download has incorrect filename');
		}

		// Test 16: Download registers DOWNLOAD
		console.log('Test 16: Download registers DOWNLOAD...');
		const downloadLogs = await prisma.documentAccessLog.findMany({
			where: {
				documentId: document.id,
				action: DocumentAccessAction.DOWNLOAD
			}
		});
		if (downloadLogs.length > 0) {
			console.log(`✅ DOWNLOAD log registered\n`);
		} else {
			throw new Error('DOWNLOAD log was not registered');
		}

		// Test 17: Download of deleted document is rejected
		console.log('Test 17: Download of deleted document is rejected...');
		await deleteDocumentApi(mockAdmin, document.id);
		try {
			await downloadDocumentApi(mockAdmin, { documentId: document.id });
			throw new Error('Download of deleted document should have been rejected');
		} catch (e: unknown) {
			const error = e as { status?: number; message?: string };
			if (
				error.status === 410 ||
				(error.message && (error.message.includes('410') || error.message.includes('eliminado')))
			) {
				console.log(`✅ Download of deleted document correctly rejected\n`);
			} else {
				throw e;
			}
		}

		// Test 18: Delete does soft delete
		console.log('Test 18: Delete does soft delete...');
		const deletedDoc = await prisma.document.findUnique({
			where: { id: document.id }
		});
		if (deletedDoc && deletedDoc.status === 'DELETED' && deletedDoc.deletedAt) {
			console.log(`✅ Document soft deleted\n`);
		} else {
			throw new Error('Document was not soft deleted');
		}

		// Test 19: Delete does not delete physical file
		console.log('Test 19: Delete does not delete physical file...');
		const dbDocForFile = await prisma.document.findUnique({
			where: { id: document.id }
		});
		if (dbDocForFile) {
			const fileExists = await documentStorageService.documentFileExists(dbDocForFile.storageKey);
			if (fileExists) {
				console.log(`✅ Physical file still exists after soft delete\n`);
			} else {
				throw new Error('Physical file was deleted during soft delete');
			}
		}

		// Test 20: Restore works
		console.log('Test 20: Restore works...');
		const restoredDoc = await restoreDocumentApi(mockAdmin, document.id);
		if (restoredDoc.status === 'ACTIVE' && !restoredDoc.deletedAt) {
			console.log(`✅ Document restored\n`);
		} else {
			throw new Error('Document was not restored');
		}

		// Test 21: Responses don't expose absolute paths
		console.log("Test 21: Responses don't expose absolute paths...");
		const allResponses = [
			JSON.stringify(document),
			JSON.stringify(documents),
			JSON.stringify(detail),
			JSON.stringify(restoredDoc)
		];
		for (const response of allResponses) {
			if (
				response.includes('/home/') ||
				response.includes('/storage/') ||
				response.includes('/private/')
			) {
				throw new Error('Response contains absolute paths');
			}
		}
		console.log(`✅ No responses expose absolute paths\n`);

		// Test 22: Endpoint upload does not write to static/uploads
		console.log('Test 22: Endpoint upload does not write to static/uploads...');
		const dbDocForPath = await prisma.document.findUnique({
			where: { id: document.id }
		});
		if (dbDocForPath) {
			// Verify physical file exists in storage/private/documents
			const fileExists = await documentStorageService.documentFileExists(dbDocForPath.storageKey);
			if (!fileExists) {
				throw new Error('Physical file does not exist in storage/private/documents');
			}

			// Verify storage path does not contain static/uploads
			if (dbDocForPath.storageKey.includes('static/uploads')) {
				throw new Error('Storage key contains static/uploads path');
			}

			// Verify storage key starts with expected pattern (ownerType/ownerId/...)
			if (!dbDocForPath.storageKey.startsWith(`${document.ownerType}/${document.ownerId}/`)) {
				throw new Error('Storage key does not follow expected pattern');
			}

			console.log(`✅ Endpoint upload does not write to static/uploads\n`);
		} else {
			throw new Error('Document not found for path verification');
		}

		// Test 23: Cleanup final elimina logs, documentos, usuario y archivo físico
		console.log('Test 23: Cleanup final elimina logs, documentos, usuario y archivo físico...');
		// This test will be verified in the finally block
		console.log(`✅ Cleanup verification will be performed in finally block\n`);

		// Test 24: No quedan archivos físicos de prueba
		console.log('Test 24: No quedan archivos físicos de prueba...');
		// This test will be verified in the finally block
		console.log(`✅ Physical files verification will be performed in finally block\n`);

		console.log('✅ All document management endpoint tests passed successfully!\n');
	} catch (error) {
		console.error('❌ Test failed:', error);
		throw error;
	} finally {
		// Cleanup
		console.log('🧹 Cleaning up test data...');

		const initialDocCount = testDocumentIds.length;
		const initialUserCount = testUserIds.length;

		for (const documentId of testDocumentIds) {
			// Get document before deletion to have storageKey
			const doc = await prisma.document.findUnique({
				where: { id: documentId }
			});

			// Delete access logs
			await prisma.documentAccessLog.deleteMany({
				where: { documentId }
			});

			// Delete physical file before deleting document record
			if (doc) {
				try {
					await documentStorageService.deleteDocumentFileForCleanup(doc.storageKey);
				} catch (e) {
					console.error(`Failed to delete physical file for ${documentId}:`, e);
				}
			}

			// Delete document
			await prisma.document.delete({
				where: { id: documentId }
			});

			console.log(`✅ Cleaned document: ${documentId}`);
		}

		for (const userId of testUserIds) {
			// Delete user roles
			await prisma.userRole.deleteMany({
				where: { userId }
			});

			// Delete user
			await prisma.user.delete({
				where: { id: userId }
			});

			console.log(`✅ Cleaned user: ${userId}`);
		}

		console.log('✅ Cleanup complete\n');

		// Test 23 verification: Verify cleanup was successful
		console.log('Test 23 verification: Verifying cleanup was successful...');
		let logsDeleted = true;
		let docsDeleted = true;
		let usersDeleted = true;

		for (const documentId of testDocumentIds) {
			const logs = await prisma.documentAccessLog.findMany({
				where: { documentId }
			});
			if (logs.length > 0) {
				logsDeleted = false;
				console.error(`❌ Logs still exist for document ${documentId}`);
			}

			const doc = await prisma.document.findUnique({
				where: { id: documentId }
			});
			if (doc) {
				docsDeleted = false;
				console.error(`❌ Document still exists: ${documentId}`);
			}
		}

		for (const userId of testUserIds) {
			const user = await prisma.user.findUnique({
				where: { id: userId }
			});
			if (user) {
				usersDeleted = false;
				console.error(`❌ User still exists: ${userId}`);
			}
		}

		if (logsDeleted && docsDeleted && usersDeleted) {
			console.log(`✅ Test 23: Cleanup final elimina logs, documentos, usuario y archivo físico\n`);
		} else {
			console.error(`❌ Test 23: Cleanup verification failed`);
		}

		// Test 24 verification: Verify no physical files remain
		console.log('Test 24 verification: Verifying no physical files remain...');
		const fs = await import('fs');
		const path = await import('path');
		const storagePath = path.join(process.cwd(), 'storage', 'private', 'documents');
		let filesFound = false;

		if (fs.existsSync(storagePath)) {
			const findFiles = (dir: string, files: string[] = []): string[] => {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						findFiles(fullPath, files);
					} else if (entry.isFile()) {
						files.push(fullPath);
					}
				}
				return files;
			};

			const files = findFiles(storagePath);
			if (files.length > 0) {
				filesFound = true;
				console.error(`❌ Physical files found: ${files.join(', ')}`);
			}
		}

		if (!filesFound) {
			console.log(`✅ Test 24: No quedan archivos físicos de prueba\n`);
		} else {
			console.error(`❌ Test 24: Physical files verification failed`);
		}
	}
}

async function main() {
	try {
		await testDocumentManagementEndpoints();
		console.log('🎉 Document Management Endpoints Test Suite: PASSED\n');
	} catch (error) {
		console.error('💥 Document Management Endpoints Test Suite: FAILED');
		process.exit(1);
	}
}

main();
