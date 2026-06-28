import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { DocumentCategory, DocumentOwnerType } from '@prisma/client';
import { documentStorageService } from '../src/lib/server/document-management/document-storage.service';
import {
	validateDocumentFile,
	isAllowedMimeType,
	isAllowedExtension,
	sanitizeFilename,
	validateStorageKey,
	DocumentValidationError,
	MAX_FILE_SIZE
} from '../src/lib/server/document-management/document-file-validation';

/**
 * Create a minimal valid PDF file for testing
 */
function createTestPdfFile(): File {
	const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Count 0\n/Kids []\n>>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer\n<<\n/Size 3\n/Root 1 0 R\n>>\nstartxref\n109\n%%EOF';
	const buffer = Buffer.from(pdfContent, 'utf-8');
	return new File([buffer], 'test-document.pdf', { type: 'application/pdf' });
}

/**
 * Create a minimal valid PNG file for testing
 */
function createTestPngFile(): File {
	const pngHeader = Buffer.from([
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
		0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
		0x49, 0x48, 0x44, 0x52, // IHDR
		0x00, 0x00, 0x00, 0x01, // Width: 1
		0x00, 0x00, 0x00, 0x01, // Height: 1
		0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth: 8, Color type: 6 (RGBA), Compression: 0, Filter: 0, Interlace: 0
		0x1F, 0x15, 0xC4, 0x89, // CRC
		0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
		0x49, 0x44, 0x41, 0x54, // IDAT
		0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
		0x0D, 0x0A, 0x2B, 0x4B, // CRC
		0x00, 0x00, 0x00, 0x00, // IEND chunk length
		0x49, 0x45, 0x4E, 0x44, // IEND
		0xAE, 0x42, 0x60, 0x82 // CRC
	]);
	return new File([pngHeader], 'test-image.png', { type: 'image/png' });
}

/**
 * Create a file with disallowed MIME type
 */
function createDisallowedMimeTypeFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], 'test.exe', { type: 'application/x-msdownload' });
}

/**
 * Create a file with disallowed extension
 */
function createDisallowedExtensionFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], 'test.exe', { type: 'application/pdf' });
}

/**
 * Create a file exceeding max size
 */
function createOversizedFile(): File {
	const buffer = Buffer.alloc(MAX_FILE_SIZE + 1);
	return new File([buffer], 'oversized.pdf', { type: 'application/pdf' });
}

/**
 * Create a file with malicious filename
 */
function createMaliciousFilenameFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], '../../../etc/passwd.pdf', { type: 'application/pdf' });
}

/**
 * Create a minimal valid JPEG file (.jpg)
 */
function createTestJpegFile(): File {
	const jpegHeader = Buffer.from([
		0xFF, 0xD8, 0xFF, 0xE0, // JPEG SOI + APP0 marker
		0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, // JFIF identifier
		0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // Version, units, density
		0xFF, 0xD9 // JPEG EOI
	]);
	return new File([jpegHeader], 'test-image.jpg', { type: 'image/jpeg' });
}

/**
 * Create a minimal valid JPEG file (.jpeg)
 */
function createTestJpegFileAlt(): File {
	const jpegHeader = Buffer.from([
		0xFF, 0xD8, 0xFF, 0xE0,
		0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00,
		0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
		0xFF, 0xD9
	]);
	return new File([jpegHeader], 'test-image.jpeg', { type: 'image/jpeg' });
}

/**
 * Create a minimal valid DOCX file
 */
function createTestDocxFile(): File {
	const docxHeader = Buffer.from([
		0x50, 0x4B, 0x03, 0x04, // ZIP signature (DOCX is a ZIP)
		0x14, 0x00, 0x00, 0x00, 0x08, 0x00, // Version and flags
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // CRC, sizes
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // More sizes
		0x09, 0x00, 0x00, 0x00, // Filename length
		0x00, 0x00, 0x00, 0x00, // Extra field length
		0x5B, 0x43, 0x6F, 0x6E, 0x74, 0x65, 0x6E, 0x74, 0x5F, 0x54, 0x79, 0x70, 0x65, 0x73, 0x2E, 0x78, 0x6D, 0x6C // "[Content_Types].xml"
	]);
	return new File([docxHeader], 'test-document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/**
 * Create a file with false extension (allowed MIME with dangerous extension)
 */
function createFalseExtensionFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], 'document.pdf.exe', { type: 'application/pdf' });
}

/**
 * Create a file with incompatible extension for allowed MIME
 */
function createIncompatibleExtensionFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], 'document.pdf', { type: 'image/jpeg' });
}

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
		const jpegFileAlt = createTestJpegFileAlt();
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

testDocumentManagementStorage()
	.then(() => {
		console.log('🎉 Document Management Storage Service Test Suite: PASSED');
		process.exit(0);
	})
	.catch((error) => {
		console.error('💥 Document Management Storage Service Test Suite: FAILED');
		console.error(error);
		process.exit(1);
	});
