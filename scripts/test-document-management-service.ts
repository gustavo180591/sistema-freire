import {
	PrismaClient,
	DocumentCategory,
	DocumentSubType,
	DocumentVisibility,
	DocumentOwnerType,
	DocumentAccessAction,
	UserStatus
} from '@prisma/client';
import { documentManagementService } from '../src/lib/server/document-management/document-management.service';
import { documentStorageService } from '../src/lib/server/document-management/document-storage.service';

const prisma = new PrismaClient();

/**
 * Create a minimal valid PDF file for testing
 */
function createTestPdfFile(): File {
	const pdfContent =
		'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Count 0\n/Kids []\n>>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer\n<<\n/Size 3\n/Root 1 0 R\n>>\nstartxref\n109\n%%EOF';
	const buffer = Buffer.from(pdfContent, 'utf-8');
	return new File([buffer], 'test-document.pdf', { type: 'application/pdf' });
}

async function testDocumentManagementService() {
	console.log('🧪 Testing Document Management Service...\n');

	const testDocumentIds: string[] = [];
	const testUserId: string[] = [];

	try {
		// Test 1: Create test user
		console.log('Test 1: Creating test user...');
		const testUser = await prisma.user.create({
			data: {
				email: 'test-doc-service@example.com',
				passwordHash: 'hashed_password',
				firstName: 'Test',
				lastName: 'User',
				status: UserStatus.ACTIVE
			}
		});
		testUserId.push(testUser.id);
		console.log(`✅ Test user created: ${testUser.id}\n`);

		// Test 2: Create document with file
		console.log('Test 2: Creating document with file...');
		const testFile = createTestPdfFile();
		const testMetadata = { test: true, foo: 'bar', number: 42 };
		const document = await documentManagementService.createDocument({
			file: testFile,
			ownerType: DocumentOwnerType.USER,
			ownerId: testUser.id,
			category: DocumentCategory.ACADEMIC,
			subType: DocumentSubType.ENROLLMENT_CERTIFICATE,
			visibility: DocumentVisibility.PRIVATE,
			uploadedById: testUser.id,
			metadata: testMetadata
		});
		testDocumentIds.push(document.id);
		console.log(`✅ Document created: ${document.id}`);
		console.log(`   - Original name: ${document.originalName}`);
		console.log(`   - Storage key: ${document.storageKey}`);
		console.log(`   - MIME type: ${document.mimeType}`);
		console.log(`   - Size: ${document.sizeBytes} bytes`);
		console.log(`   - SHA-256: ${document.sha256Hash?.substring(0, 16)}...\n`);

		// Test 3: Verify physical file exists
		console.log('Test 3: Verifying physical file exists...');
		console.log(`   - Storage key: ${document.storageKey}`);
		const fileExists = await documentStorageService.documentFileExists(document.storageKey);
		if (fileExists) {
			console.log(`✅ Physical file exists in storage\n`);
		} else {
			throw new Error('Physical file does not exist');
		}

		// Test 4: Verify Document record exists
		console.log('Test 4: Verifying Document record exists...');
		const retrievedDocument = await documentManagementService.getDocumentById(document.id);
		if (retrievedDocument) {
			console.log(`✅ Document record exists`);
			console.log(`   - Status: ${retrievedDocument.status}`);
			console.log(`   - Category: ${retrievedDocument.category}`);
			console.log(`   - SubType: ${retrievedDocument.subType}\n`);
		} else {
			throw new Error('Document record does not exist');
		}

		// Test 4.1: Verify Document metadata is structured JSON, not string
		console.log('Test 4.1: Verifying Document metadata is structured JSON...');
		if (retrievedDocument && retrievedDocument.metadata) {
			const metadata = retrievedDocument.metadata as Record<string, unknown>;
			if (typeof metadata === 'string') {
				throw new Error('Document metadata is a string, should be structured JSON');
			}
			if (metadata.test === true && metadata.foo === 'bar' && metadata.number === 42) {
				console.log(`✅ Document metadata is structured JSON`);
				console.log(`   - test: ${metadata.test}`);
				console.log(`   - foo: ${metadata.foo}`);
				console.log(`   - number: ${metadata.number}\n`);
			} else {
				throw new Error('Document metadata properties do not match expected values');
			}
		} else {
			throw new Error('Document metadata is missing');
		}

		// Test 5: Verify UPLOAD log was created
		console.log('Test 5: Verifying UPLOAD log was created...');
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

		// Test 5.1: Verify DocumentAccessLog metadata is structured JSON, not string
		console.log('Test 5.1: Verifying DocumentAccessLog metadata is structured JSON...');
		if (uploadLogs[0].metadata) {
			const logMetadata = uploadLogs[0].metadata as Record<string, unknown>;
			if (typeof logMetadata === 'string') {
				throw new Error('DocumentAccessLog metadata is a string, should be structured JSON');
			}
			if (logMetadata.test === true && logMetadata.foo === 'bar' && logMetadata.number === 42) {
				console.log(`✅ DocumentAccessLog metadata is structured JSON`);
				console.log(`   - test: ${logMetadata.test}`);
				console.log(`   - foo: ${logMetadata.foo}`);
				console.log(`   - number: ${logMetadata.number}\n`);
			} else {
				throw new Error('DocumentAccessLog metadata properties do not match expected values');
			}
		} else {
			throw new Error('DocumentAccessLog metadata is missing');
		}

		// Test 6: Verify Document.uploadedBy relation
		console.log('Test 6: Verifying Document.uploadedBy relation...');
		const docWithUploader = await prisma.document.findUnique({
			where: { id: document.id },
			include: {
				uploadedBy: {
					select: {
						id: true,
						firstName: true,
						lastName: true
					}
				}
			}
		});
		if (docWithUploader && docWithUploader.uploadedBy) {
			console.log(`✅ Document.uploadedBy relation exists`);
			console.log(`   - Uploader ID: ${docWithUploader.uploadedBy.id}`);
			console.log(
				`   - Uploader name: ${docWithUploader.uploadedBy.firstName} ${docWithUploader.uploadedBy.lastName}\n`
			);
		} else {
			throw new Error('Document.uploadedBy relation does not exist');
		}

		// Test 7: Verify DocumentAccessLog.user relation
		console.log('Test 7: Verifying DocumentAccessLog.user relation...');
		const logWithUser = await prisma.documentAccessLog.findFirst({
			where: { documentId: document.id }
		});
		if (logWithUser && logWithUser.userId) {
			console.log(`✅ DocumentAccessLog.userId exists: ${logWithUser.userId}\n`);
		} else {
			throw new Error('DocumentAccessLog.userId does not exist');
		}

		// Test 8: List documents by ownerType + ownerId
		console.log('Test 8: Listing documents by ownerType + ownerId...');
		const userDocuments = await documentManagementService.listDocuments({
			ownerType: DocumentOwnerType.USER,
			ownerId: testUser.id
		});
		if (userDocuments.length > 0) {
			console.log(`✅ Found ${userDocuments.length} document(s) for user\n`);
		} else {
			throw new Error('No documents found for user');
		}

		// Test 9: List documents by category
		console.log('Test 9: Listing documents by category...');
		const academicDocuments = await documentManagementService.listDocuments({
			category: DocumentCategory.ACADEMIC
		});
		if (academicDocuments.length > 0) {
			console.log(`✅ Found ${academicDocuments.length} ACADEMIC document(s)\n`);
		} else {
			throw new Error('No ACADEMIC documents found');
		}

		// Test 10: List documents by subType
		console.log('Test 10: Listing documents by subType...');
		const enrollmentDocs = await documentManagementService.listDocuments({
			subType: DocumentSubType.ENROLLMENT_CERTIFICATE
		});
		if (enrollmentDocs.length > 0) {
			console.log(`✅ Found ${enrollmentDocs.length} ENROLLMENT_CERTIFICATE document(s)\n`);
		} else {
			throw new Error('No ENROLLMENT_CERTIFICATE documents found');
		}

		// Test 11: Register VIEW log
		console.log('Test 11: Registering VIEW log...');
		await documentManagementService.logDocumentAccess({
			documentId: document.id,
			userId: testUser.id,
			action: DocumentAccessAction.VIEW,
			ipAddress: '127.0.0.1',
			userAgent: 'Test Agent'
		});
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

		// Test 12: Register DOWNLOAD log
		console.log('Test 12: Registering DOWNLOAD log...');
		await documentManagementService.logDocumentAccess({
			documentId: document.id,
			userId: testUser.id,
			action: DocumentAccessAction.DOWNLOAD
		});
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

		// Test 13: Soft delete document
		console.log('Test 13: Soft deleting document...');
		const deletedDocument = await documentManagementService.softDeleteDocument(
			document.id,
			testUser.id
		);
		if (deletedDocument.status === 'DELETED' && deletedDocument.deletedAt) {
			console.log(`✅ Document soft deleted`);
			console.log(`   - Status: ${deletedDocument.status}`);
			console.log(`   - Deleted at: ${deletedDocument.deletedAt.toISOString()}\n`);
		} else {
			throw new Error('Document was not soft deleted');
		}

		// Test 14: Confirm soft delete does not delete physical file
		console.log('Test 14: Confirming soft delete does not delete physical file...');
		console.log(`   - Storage key: ${document.storageKey}`);
		const fileStillExists = await documentStorageService.documentFileExists(document.storageKey);
		if (fileStillExists) {
			console.log(`✅ Physical file still exists after soft delete\n`);
		} else {
			throw new Error('Physical file was deleted during soft delete');
		}

		// Test 15: Confirm access logs are preserved
		console.log('Test 15: Confirming access logs are preserved...');
		const allLogs = await prisma.documentAccessLog.findMany({
			where: { documentId: document.id }
		});
		if (allLogs.length >= 3) {
			// UPLOAD, VIEW, DOWNLOAD
			console.log(`✅ Access logs preserved: ${allLogs.length} log(s)\n`);
		} else {
			throw new Error('Access logs were not preserved');
		}

		// Test 16: Restore document
		console.log('Test 16: Restoring document...');
		const restoredDocument = await documentManagementService.restoreDocument(
			document.id,
			testUser.id
		);
		if (restoredDocument.status === 'ACTIVE' && !restoredDocument.deletedAt) {
			console.log(`✅ Document restored`);
			console.log(`   - Status: ${restoredDocument.status}`);
			console.log(`   - Deleted at: ${restoredDocument.deletedAt}\n`);
		} else {
			throw new Error('Document was not restored');
		}

		// Test 17: Get document with access logs
		console.log('Test 17: Getting document with access logs...');
		const documentWithLogs = await documentManagementService.getDocumentWithAccessLogs(document.id);
		if (documentWithLogs) {
			console.log(`✅ Document with access logs retrieved`);
			console.log(`   - Document ID: ${documentWithLogs.document.id}`);
			console.log(`   - Access logs count: ${documentWithLogs.accessLogs.length}\n`);
		} else {
			throw new Error('Document with access logs not retrieved');
		}

		// Test 17.1: Verify no absolute paths exposed in service responses
		console.log('Test 17.1: Verifying no absolute paths exposed in service responses...');
		if (documentWithLogs) {
			const docStr = JSON.stringify(documentWithLogs.document);
			if (
				docStr.includes('/home/') ||
				docStr.includes('/storage/') ||
				docStr.includes('/private/')
			) {
				throw new Error('Service response contains absolute filesystem paths');
			}
			console.log(`✅ No absolute paths exposed in document response\n`);
		}

		console.log('✅ All document management service tests passed successfully!\n');
	} catch (error) {
		console.error('❌ Test failed:', error);
		throw error;
	} finally {
		// Cleanup
		console.log('🧹 Cleaning up test data...');

		for (const documentId of testDocumentIds) {
			try {
				await documentManagementService.cleanupDocumentForTest(documentId);
				console.log(`✅ Cleaned document: ${documentId}`);
			} catch (error) {
				console.error(`Failed to cleanup document ${documentId}:`, error);
			}
		}

		for (const userId of testUserId) {
			try {
				await prisma.user.delete({
					where: { id: userId }
				});
				console.log(`✅ Cleaned user: ${userId}`);
			} catch (error) {
				console.error(`Failed to cleanup user ${userId}:`, error);
			}
		}

		console.log('✅ Cleanup complete\n');
	}
}

async function main() {
	try {
		await testDocumentManagementService();
		console.log('🎉 Document Management Service Test Suite: PASSED\n');
	} catch (error) {
		console.error('💥 Document Management Service Test Suite: FAILED');
		process.exit(1);
	}
}

main();
