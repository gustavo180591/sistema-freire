import { MAX_FILE_SIZE } from '../../src/lib/server/document-management/document-file-validation';

/**
 * Create a minimal valid PDF file for testing
 */
export function createTestPdfFile(): File {
	const pdfContent =
		'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Count 0\n/Kids []\n>>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer\n<<\n/Size 3\n/Root 1 0 R\n>>\nstartxref\n109\n%%EOF';
	const buffer = Buffer.from(pdfContent, 'utf-8');
	return new File([buffer], 'test-document.pdf', { type: 'application/pdf' });
}

/**
 * Create a minimal valid PNG file for testing
 */
export function createTestPngFile(): File {
	const pngHeader = Buffer.from([
		0x89,
		0x50,
		0x4e,
		0x47,
		0x0d,
		0x0a,
		0x1a,
		0x0a, // PNG signature
		0x00,
		0x00,
		0x00,
		0x0d, // IHDR chunk length
		0x49,
		0x48,
		0x44,
		0x52, // IHDR
		0x00,
		0x00,
		0x00,
		0x01, // Width: 1
		0x00,
		0x00,
		0x00,
		0x01, // Height: 1
		0x08,
		0x06,
		0x00,
		0x00,
		0x00, // Bit depth: 8, Color type: 6 (RGBA), Compression: 0, Filter: 0, Interlace: 0
		0x1f,
		0x15,
		0xc4,
		0x89, // CRC
		0x00,
		0x00,
		0x00,
		0x0a, // IDAT chunk length
		0x49,
		0x44,
		0x41,
		0x54, // IDAT
		0x78,
		0x9c,
		0x63,
		0x00,
		0x01,
		0x00,
		0x00,
		0x05,
		0x00,
		0x01, // Compressed data
		0x0d,
		0x0a,
		0x2b,
		0x4b, // CRC
		0x00,
		0x00,
		0x00,
		0x00, // IEND chunk length
		0x49,
		0x45,
		0x4e,
		0x44, // IEND
		0xae,
		0x42,
		0x60,
		0x82 // CRC
	]);
	return new File([pngHeader], 'test-image.png', { type: 'image/png' });
}

/**
 * Create a file with disallowed MIME type
 */
export function createDisallowedMimeTypeFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], 'test.exe', { type: 'application/x-msdownload' });
}

/**
 * Create a file with disallowed extension
 */
export function createDisallowedExtensionFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], 'test.exe', { type: 'application/pdf' });
}

/**
 * Create a file exceeding max size
 */
export function createOversizedFile(): File {
	const buffer = Buffer.alloc(MAX_FILE_SIZE + 1);
	return new File([buffer], 'oversized.pdf', { type: 'application/pdf' });
}

/**
 * Create a file with malicious filename
 */
export function createMaliciousFilenameFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], '../../../etc/passwd.pdf', { type: 'application/pdf' });
}

/**
 * Create a minimal valid JPEG file (.jpg)
 */
export function createTestJpegFile(): File {
	const jpegHeader = Buffer.from([
		0xff,
		0xd8,
		0xff,
		0xe0, // JPEG SOI + APP0 marker
		0x00,
		0x10,
		0x4a,
		0x46,
		0x49,
		0x46,
		0x00, // JFIF identifier
		0x01,
		0x01,
		0x00,
		0x00,
		0x01,
		0x00,
		0x01,
		0x00,
		0x00, // Version, units, density
		0xff,
		0xd9 // JPEG EOI
	]);
	return new File([jpegHeader], 'test-image.jpg', { type: 'image/jpeg' });
}

/**
 * Create a minimal valid JPEG file (.jpeg)
 */
export function createTestJpegFile2(): File {
	const jpegHeader = Buffer.from([
		0xff,
		0xd8,
		0xff,
		0xe0, // JPEG SOI + APP0 marker
		0x00,
		0x10,
		0x4a,
		0x46,
		0x49,
		0x46,
		0x00, // JFIF identifier
		0x01,
		0x01,
		0x00,
		0x00,
		0x01,
		0x00,
		0x01,
		0x00,
		0x00, // Version, units, density
		0xff,
		0xd9 // JPEG EOI
	]);
	return new File([jpegHeader], 'test-image.jpeg', { type: 'image/jpeg' });
}

/**
 * Create a minimal valid DOCX file for testing
 */
export function createTestDocxFile(): File {
	const docxHeader = Buffer.from([
		0x50,
		0x4b,
		0x03,
		0x04, // ZIP signature (DOCX is a ZIP)
		0x14,
		0x00,
		0x00,
		0x00, // Version
		0x08,
		0x00, // Flags
		0x08,
		0x00, // Compression method (deflate)
		0x00,
		0x00,
		0x00,
		0x00, // Mod time
		0x00,
		0x00,
		0x00,
		0x00, // Mod date
		0x00,
		0x00,
		0x00,
		0x00, // CRC32
		0x00,
		0x00,
		0x00,
		0x00, // Compressed size
		0x00,
		0x00,
		0x00,
		0x00, // Uncompressed size
		0x00,
		0x00, // Filename length
		0x00,
		0x00 // Extra field length
	]);
	return new File([docxHeader], 'test-document.docx', {
		type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	});
}

/**
 * Create a file with false extension (allowed MIME with dangerous extension)
 */
export function createFalseExtensionFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], 'document.pdf.exe', { type: 'application/pdf' });
}

/**
 * Create a file with incompatible extension for allowed MIME
 */
export function createIncompatibleExtensionFile(): File {
	const buffer = Buffer.from('test content');
	return new File([buffer], 'document.pdf', { type: 'image/jpeg' });
}
