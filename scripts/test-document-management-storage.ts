import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'node:url';
import { DocumentCategory, DocumentOwnerType } from '@prisma/client';
import { documentStorageService } from '../src/lib/server/document-management/document-storage.service';
import {
	validateDocumentFile,
	isAllowedMimeType,
	isAllowedExtension,
	sanitizeFilename,
	validateStorageKey,
	DocumentValidationError
} from '../src/lib/server/document-management/document-file-validation';
import {
	createTestPdfFile,
	createTestPngFile,
	createDisallowedMimeTypeFile,
	createDisallowedExtensionFile,
	createOversizedFile,
	createMaliciousFilenameFile,
	createTestJpegFile,
	createTestJpegFile2,
	createTestDocxFile,
	createFalseExtensionFile,
	createIncompatibleExtensionFile
} from './helpers/document-management-test-files';

async function testDocumentManagementStorage() {
	console.log('🧪 Testing Document Management Storage Service...\n');

	const testStorageKeys: string[] = [];
	const testFilePaths: string[] = [];

	try {
		// Test 1: Valid PDF file
		console.log('Test 1: Valid PDF file...');
		const pdfFile = createTestPdfFile();
		const pdfMetadata = validateDocumentFile(pdfFile);
		console.log(`✅ PDF validated: ${pdfMetadata.originalName}`);
		console.log(`   - MIME type: ${pdfMetadata.mimeType}`);
		console.log(`   - Extension: ${pdfMetadata.extension}`);
		console.log(`   - Size: ${pdfMetadata.sizeBytes} bytes\n`);

		// Test 2: Valid PNG file
		console.log('Test 2: Valid PNG file...');
		const pngFile = createTestPngFile();
		const pngMetadata = validateDocumentFile(pngFile);
		console.log(`✅ PNG validated: ${pngMetadata.originalName}`);
		console.log(`   - MIME type: ${pngMetadata.mimeType}`);
		console.log(`   - Extension: ${pngMetadata.extension}`);
		console.log(`   - Size: ${pngMetadata.sizeBytes} bytes\n`);

		// Test 2.1: Valid JPEG file (.jpg)
		console.log('Test 2.1: Valid JPEG file (.jpg)...');
		const jpegFile = createTestJpegFile();
		const jpegMetadata = validateDocumentFile(jpegFile);
		console.log(`✅ JPEG (.jpg) validated: ${jpegMetadata.originalName}`);
		console.log(`   - MIME type: ${jpegMetadata.mimeType}`);
		console.log(`   - Extension: ${jpegMetadata.extension}`);
		console.log(`   - Size: ${jpegMetadata.sizeBytes} bytes\n`);

		// Test 2.2: Valid JPEG file (.jpeg)
		console.log('Test 2.2: Valid JPEG file (.jpeg)...');
		const jpegFileAlt = createTestJpegFile2();
		const jpegMetadataAlt = validateDocumentFile(jpegFileAlt);
		console.log(`✅ JPEG (.jpeg) validated: ${jpegMetadataAlt.originalName}`);
		console.log(`   - MIME type: ${jpegMetadataAlt.mimeType}`);
		console.log(`   - Extension: ${jpegMetadataAlt.extension}`);
		console.log(`   - Size: ${jpegMetadataAlt.sizeBytes} bytes\n`);

		// Test 2.3: Valid DOCX file
		console.log('Test 2.3: Valid DOCX file...');
		const docxFile = createTestDocxFile();
		const docxMetadata = validateDocumentFile(docxFile);
		console.log(`✅ DOCX validated: ${docxMetadata.originalName}`);
		console.log(`   - MIME type: ${docxMetadata.mimeType}`);
		console.log(`   - Extension: ${docxMetadata.extension}`);
		console.log(`   - Size: ${docxMetadata.sizeBytes} bytes\n`);

		// Test 3: Rejection of disallowed MIME type
		console.log('Test 3: Rejection of disallowed MIME type...');
		try {
			const disallowedFile = createDisallowedMimeTypeFile();
			validateDocumentFile(disallowedFile);
			throw new Error('Should have rejected disallowed MIME type');
		} catch (error) {
			if (error instanceof DocumentValidationError && error.code === 'INVALID_MIME_TYPE') {
				console.log(`✅ Disallowed MIME type rejected: ${error.message}\n`);
			} else {
				throw error;
			}
		}

		// Test 4: Rejection of disallowed extension
		console.log('Test 4: Rejection of disallowed extension...');
		try {
			const disallowedExtFile = createDisallowedExtensionFile();
			validateDocumentFile(disallowedExtFile);
			throw new Error('Should have rejected disallowed extension');
		} catch (error) {
			if (error instanceof DocumentValidationError && error.code === 'INVALID_EXTENSION') {
				console.log(`✅ Disallowed extension rejected: ${error.message}\n`);
			} else {
				throw error;
			}
		}

		// Test 4.1: Rejection of false extension (allowed MIME with dangerous extension)
		console.log('Test 4.1: Rejection of false extension (allowed MIME with dangerous extension)...');
		try {
			const falseExtFile = createFalseExtensionFile();
			validateDocumentFile(falseExtFile);
			throw new Error('Should have rejected false extension');
		} catch (error) {
			if (error instanceof DocumentValidationError && error.code === 'INVALID_EXTENSION') {
				console.log(`✅ False extension rejected: ${error.message}\n`);
			} else {
				throw error;
			}
		}

		// Test 4.2: Rejection of incompatible extension for allowed MIME
		console.log('Test 4.2: Rejection of incompatible extension for allowed MIME...');
		try {
			const incompatibleExtFile = createIncompatibleExtensionFile();
			validateDocumentFile(incompatibleExtFile);
			throw new Error('Should have rejected incompatible extension');
		} catch (error) {
			if (error instanceof DocumentValidationError && error.code === 'INVALID_EXTENSION') {
				console.log(`✅ Incompatible extension rejected: ${error.message}\n`);
			} else {
				throw error;
			}
		}

		// Test 5: Rejection by max size
		console.log('Test 5: Rejection by max size...');
		try {
			const oversizedFile = createOversizedFile();
			validateDocumentFile(oversizedFile);
			throw new Error('Should have rejected oversized file');
		} catch (error) {
			if (error instanceof DocumentValidationError && error.code === 'FILE_TOO_LARGE') {
				console.log(`✅ Oversized file rejected: ${error.message}\n`);
			} else {
				throw error;
			}
		}

		// Test 6: Sanitization of filename
		console.log('Test 6: Sanitization of filename...');
		const maliciousFile = createMaliciousFilenameFile();
		const sanitized = sanitizeFilename(maliciousFile.name);
		console.log(`✅ Filename sanitized: ${maliciousFile.name} → ${sanitized}\n`);

		// Test 7: Path traversal prevention
		console.log('Test 7: Path traversal prevention...');
		try {
			validateStorageKey('../../../etc/passwd');
			throw new Error('Should have rejected path traversal');
		} catch (error) {
			if (error instanceof DocumentValidationError && error.code === 'INVALID_FILENAME') {
				console.log(`✅ Path traversal prevented: ${error.message}\n`);
			} else {
				throw error;
			}
		}

		// Test 7.1: ownerId path traversal prevention
		console.log('Test 7.1: ownerId path traversal prevention...');
		const maliciousOwnerIds = ['../evil', 'student/../../evil', '/absolute/path', 'student\\..\\evil'];
		for (const maliciousOwnerId of maliciousOwnerIds) {
			try {
				documentStorageService.generateStorageKey({
					ownerType: DocumentOwnerType.USER,
					ownerId: maliciousOwnerId,
					category: DocumentCategory.ACADEMIC,
					extension: 'pdf'
				});
				throw new Error(`Should have rejected malicious ownerId: ${maliciousOwnerId}`);
			} catch (error) {
				if (error instanceof DocumentValidationError && error.code === 'INVALID_FILENAME') {
					console.log(`✅ Malicious ownerId rejected: ${maliciousOwnerId}`);
				} else {
					throw error;
				}
			}
		}
		console.log();

		// Test 7.2: getFilePath security validation
		console.log('Test 7.2: getFilePath security validation...');
		const dangerousKeys = ['../../../etc/passwd', '/absolute/path', 'user\\..\\evil', '', '   '];
		for (const dangerousKey of dangerousKeys) {
			try {
				documentStorageService.getFilePath(dangerousKey);
				throw new Error(`Should have rejected dangerous storage key: ${dangerousKey}`);
			} catch (error) {
				if (error instanceof DocumentValidationError && error.code === 'INVALID_FILENAME' || 
					error instanceof Error && error.message.includes('Path traversal')) {
					console.log(`✅ Dangerous storage key rejected: ${dangerousKey}`);
				} else {
					throw error;
				}
			}
		}
		console.log();

		// Test 8: Storage key generation
		console.log('Test 8: Storage key generation...');
		const storageKey = documentStorageService.generateStorageKey({
			ownerType: DocumentOwnerType.USER,
			ownerId: 'test-user-123',
			category: DocumentCategory.ACADEMIC,
			extension: 'pdf'
		});
		testStorageKeys.push(storageKey);
		console.log(`✅ Storage key generated: ${storageKey}`);
		console.log(`   - Format: {ownerType}/{ownerId}/{category}/{year}/{month}/{uuid}.{ext}\n`);

		// Test 9: Writing to storage/private/documents
		console.log('Test 9: Writing to storage/private/documents...');
		const testFile = createTestPdfFile();
		await documentStorageService.saveDocumentFile({
			file: testFile,
			storageKey
		});
		const filePath = documentStorageService.getFilePath(storageKey);
		testFilePaths.push(filePath);
		console.log(`✅ File saved to: ${filePath}`);
		console.log(`   - Base dir: ${documentStorageService.getStorageBaseDir()}\n`);

		// Test 10: Confirmation that it doesn't write to static/uploads
		console.log('Test 10: Confirmation that it doesn\'t write to static/uploads...');
		if (!filePath.includes('static/uploads')) {
			console.log(`✅ File not written to static/uploads\n`);
		} else {
			throw new Error('File was written to static/uploads');
		}

		// Test 11: SHA-256 calculation
		console.log('Test 11: SHA-256 calculation...');
		const hash = await documentStorageService.calculateSha256(testFile);
		console.log(`✅ SHA-256 calculated: ${hash.substring(0, 16)}...\n`);

		// Test 12: Reading/verification of saved file
		console.log('Test 12: Reading/verification of saved file...');
		const exists = await documentStorageService.documentFileExists(storageKey);
		if (!exists) {
			throw new Error('Saved file does not exist');
		}
		const readBuffer = await documentStorageService.readDocumentFile(storageKey);
		console.log(`✅ File read successfully: ${readBuffer.length} bytes\n`);

		// Test 13: File existence check
		console.log('Test 13: File existence check...');
		const existsCheck = await documentStorageService.documentFileExists(storageKey);
		if (existsCheck) {
			console.log(`✅ File existence confirmed\n`);
		} else {
			throw new Error('File existence check failed');
		}

		console.log('✅ All storage service tests passed successfully!\n');

	} catch (error) {
		console.error('❌ Test failed:', error);
		throw error;
	} finally {
		// Cleanup
		console.log('🧹 Cleaning up test files...');
		
		for (const filePath of testFilePaths) {
			try {
				await fs.unlink(filePath);
				console.log(`✅ Deleted: ${filePath}`);
			} catch (error) {
				console.log(`⚠️  Could not delete: ${filePath}`);
			}
		}

		// Check for any remaining files in test directories
		const storageBase = documentStorageService.getStorageBaseDir();
		try {
			const testUserDir = join(storageBase, 'USER', 'test-user-123');
			await fs.rm(testUserDir, { recursive: true, force: true });
			console.log(`✅ Cleaned test directory: ${testUserDir}`);
		} catch (error) {
			console.log(`⚠️  Could not clean test directory`);
		}

		console.log('✅ Cleanup complete\n');
	}
}

// Run tests if executed directly
async function main() {
	try {
		await testDocumentManagementStorage();
		console.log('🎉 Document Management Storage Test Suite: PASSED\n');
	} catch (error) {
		console.error('💥 Document Management Storage Test Suite: FAILED');
		process.exit(1);
	}
}

// Only execute if run directly (not when imported)
const isDirectExecution = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
	main();
}
