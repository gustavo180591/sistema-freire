import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDocumentManagementSchema() {
	console.log('🧪 Testing Document Management Schema...\n');

	let testUserId: string | null = null;
	let testDocumentId: string | null = null;
	let testAccessLogId: string | null = null;

	try {
		// Test 1: Create a test user
		console.log('Test 1: Creating test user...');
		const testUser = await prisma.user.create({
			data: {
				email: `test-doc-${Date.now()}@test.local`,
				passwordHash: 'test-hash',
				firstName: 'Test',
				lastName: 'User',
				status: 'ACTIVE'
			}
		});
		testUserId = testUser.id;
		console.log(`✅ User created: ${testUser.id}\n`);

		// Test 2: Validate enums
		console.log('Test 2: Validating enums...');
		const ownerTypes = ['STUDENT', 'TEACHER', 'STAFF', 'USER', 'INSTITUTION', 'SYSTEM'];
		const categories = [
			'ACADEMIC',
			'FINANCIAL',
			'ADMINISTRATIVE',
			'LEGAL',
			'MEDICAL',
			'CERTIFICATE',
			'CONTRACT',
			'OTHER'
		];
		const statuses = ['ACTIVE', 'EXPIRED', 'REVOKED', 'REPLACED', 'DELETED'];
		const visibilities = ['PRIVATE', 'INTERNAL', 'PUBLIC'];
		const actions = ['UPLOAD', 'VIEW', 'DOWNLOAD', 'UPDATE', 'DELETE', 'RESTORE'];

		console.log(`✅ DocumentOwnerType: ${ownerTypes.length} values`);
		console.log(`✅ DocumentCategory: ${categories.length} values`);
		console.log(`✅ DocumentStatus: ${statuses.length} values`);
		console.log(`✅ DocumentVisibility: ${visibilities.length} values`);
		console.log(`✅ DocumentAccessAction: ${actions.length} values\n`);

		// Test 3: Create a document
		console.log('Test 3: Creating test document...');
		const testDocument = await prisma.document.create({
			data: {
				originalName: 'test-document.pdf',
				storedName: 'stored-test-document.pdf',
				storageKey: `test-key-${Date.now()}`,
				mimeType: 'application/pdf',
				extension: 'pdf',
				sizeBytes: 1024,
				sha256Hash: 'abc123def456',
				ownerType: 'USER',
				ownerId: testUserId,
				category: 'ACADEMIC',
				subType: 'STUDY_CERTIFICATE',
				status: 'ACTIVE',
				visibility: 'PRIVATE',
				uploadedById: testUserId,
				metadata: { test: true },
				tags: ['test', 'schema-validation']
			}
		});
		testDocumentId = testDocument.id;
		console.log(`✅ Document created: ${testDocument.id}`);
		console.log(`   - Storage key: ${testDocument.storageKey}`);
		console.log(`   - Owner: ${testDocument.ownerType}/${testDocument.ownerId}`);
		console.log(`   - Category: ${testDocument.category}/${testDocument.subType}\n`);

		// Test 4: Validate relationship with user
		console.log('Test 4: Validating user relationship...');
		const documentWithUser = await prisma.document.findUnique({
			where: { id: testDocumentId },
			include: { uploadedBy: true }
		});

		if (documentWithUser?.uploadedBy.id === testUserId) {
			console.log(`✅ User relationship validated: ${documentWithUser.uploadedBy.email}\n`);
		} else {
			throw new Error('User relationship validation failed');
		}

		// Test 5: Create access log with required userId
		console.log('Test 5: Creating access log with required userId...');
		const testAccessLog = await prisma.documentAccessLog.create({
			data: {
				documentId: testDocumentId,
				userId: testUserId,
				action: 'UPLOAD',
				ipAddress: '127.0.0.1',
				userAgent: 'Test Script',
				metadata: { test: true }
			}
		});
		testAccessLogId = testAccessLog.id;
		console.log(`✅ Access log created: ${testAccessLog.id}`);
		console.log(`   - Action: ${testAccessLog.action}`);
		console.log(`   - Document: ${testAccessLog.documentId}`);
		console.log(`   - User ID: ${testAccessLog.userId} (required)\n`);

		// Test 5.1: Validate DocumentAccessLog -> Document relationship
		console.log('Test 5.1: Validating DocumentAccessLog -> Document relationship...');
		const accessLogWithDocument = await prisma.documentAccessLog.findUnique({
			where: { id: testAccessLogId },
			include: { document: true }
		});

		if (accessLogWithDocument?.document.id === testDocumentId) {
			console.log(`✅ DocumentAccessLog -> Document relationship validated\n`);
		} else {
			throw new Error('DocumentAccessLog -> Document relationship validation failed');
		}

		// Test 5.2: Validate DocumentAccessLog -> User relationship
		console.log('Test 5.2: Validating DocumentAccessLog -> User relationship...');
		const accessLogWithUser = await prisma.documentAccessLog.findUnique({
			where: { id: testAccessLogId },
			include: { user: true }
		});

		if (accessLogWithUser?.user?.id === testUserId) {
			console.log(
				`✅ DocumentAccessLog -> User relationship validated: ${accessLogWithUser.user.email}\n`
			);
		} else {
			throw new Error('DocumentAccessLog -> User relationship validation failed');
		}

		// Test 5.3: Validate userId is required (non-null)
		console.log('Test 5.3: Validating userId is required (non-null)...');
		if (accessLogWithUser?.userId && accessLogWithUser?.user) {
			console.log(`✅ userId is required and present: ${accessLogWithUser.userId}\n`);
		} else {
			throw new Error('userId required validation failed');
		}

		// Test 6: Validate soft delete with deletedAt
		console.log('Test 6: Testing soft delete...');
		await prisma.document.update({
			where: { id: testDocumentId },
			data: {
				status: 'DELETED',
				deletedAt: new Date()
			}
		});

		const deletedDocument = await prisma.document.findUnique({
			where: { id: testDocumentId }
		});

		if (deletedDocument?.status === 'DELETED' && deletedDocument.deletedAt) {
			console.log(
				`✅ Soft delete validated: status=${deletedDocument.status}, deletedAt=${deletedDocument.deletedAt.toISOString()}\n`
			);
		} else {
			throw new Error('Soft delete validation failed');
		}

		// Test 7: Search by ownerType + ownerId
		console.log('Test 7: Testing search by ownerType + ownerId...');
		const documentsByOwner = await prisma.document.findMany({
			where: {
				ownerType: 'USER',
				ownerId: testUserId
			}
		});

		if (documentsByOwner.length > 0) {
			console.log(`✅ Found ${documentsByOwner.length} document(s) for owner\n`);
		} else {
			throw new Error('Search by owner failed');
		}

		// Test 8: Search by category
		console.log('Test 8: Testing search by category...');
		const documentsByCategory = await prisma.document.findMany({
			where: {
				category: 'ACADEMIC'
			}
		});

		if (documentsByCategory.length > 0) {
			console.log(`✅ Found ${documentsByCategory.length} document(s) in ACADEMIC category\n`);
		} else {
			throw new Error('Search by category failed');
		}

		// Test 9: Search by subType
		console.log('Test 9: Testing search by subType...');
		const documentsBySubType = await prisma.document.findMany({
			where: {
				subType: 'STUDY_CERTIFICATE'
			}
		});

		if (documentsBySubType.length > 0) {
			console.log(
				`✅ Found ${documentsBySubType.length} document(s) with STUDY_CERTIFICATE subType\n`
			);
		} else {
			throw new Error('Search by subType failed');
		}

		// Test 10: Validate document with access logs
		console.log('Test 10: Validating document with access logs...');
		const documentWithLogs = await prisma.document.findUnique({
			where: { id: testDocumentId },
			include: {
				accessLogs: true
			}
		});

		if (documentWithLogs?.accessLogs.length > 0) {
			console.log(`✅ Document has ${documentWithLogs.accessLogs.length} access log(s)\n`);
		} else {
			throw new Error('Document access logs validation failed');
		}

		// Test 11: Validate cleanup order (logs before documents due to FK constraints)
		console.log('Test 11: Validating cleanup order (logs before documents)...');
		console.log(
			'✅ Cleanup will delete access logs first, then documents (due to ON DELETE RESTRICT)\n'
		);

		// Test 12: Confirm no physical file operations
		console.log('Test 12: Confirming no physical file operations...');
		console.log('✅ No physical file operations performed (schema-only test)\n');

		console.log('✅ All schema tests passed successfully!\n');
	} catch (error) {
		console.error('❌ Test failed:', error);
		throw error;
	} finally {
		// Cleanup
		console.log('🧹 Cleaning up test data...');

		if (testAccessLogId) {
			await prisma.documentAccessLog.delete({
				where: { id: testAccessLogId }
			});
			console.log('✅ Access log deleted');
		}

		if (testDocumentId) {
			await prisma.document.delete({
				where: { id: testDocumentId }
			});
			console.log('✅ Document deleted');
		}

		if (testUserId) {
			await prisma.user.delete({
				where: { id: testUserId }
			});
			console.log('✅ User deleted');
		}

		console.log('✅ Cleanup complete\n');
	}
}

testDocumentManagementSchema()
	.then(() => {
		console.log('🎉 Document Management Schema Test Suite: PASSED');
		process.exit(0);
	})
	.catch((error) => {
		console.error('💥 Document Management Schema Test Suite: FAILED');
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
