import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

interface ValidationResult {
	success: boolean;
	message: string;
	details?: string[];
}

function checkFileExists(filePath: string): ValidationResult {
	const fullPath = join(projectRoot, filePath);
	const exists = existsSync(fullPath);

	return {
		success: exists,
		message: exists ? `✅ File exists: ${filePath}` : `❌ File missing: ${filePath}`
	};
}

function checkFileContent(filePath: string, patterns: string[]): ValidationResult {
	const fullPath = join(projectRoot, filePath);

	if (!existsSync(fullPath)) {
		return {
			success: false,
			message: `❌ File not found: ${filePath}`
		};
	}

	const content = readFileSync(fullPath, 'utf-8');
	const details: string[] = [];

	for (const pattern of patterns) {
		const found = content.includes(pattern);
		details.push(found ? `✅ Contains: ${pattern}` : `❌ Missing: ${pattern}`);
	}

	const allFound = details.every((d) => d.startsWith('✅'));

	return {
		success: allFound,
		message: allFound
			? `✅ All patterns found in ${filePath}`
			: `❌ Some patterns missing in ${filePath}`,
		details
	};
}

function checkForbiddenPatterns(filePath: string, forbiddenPatterns: string[]): ValidationResult {
	const fullPath = join(projectRoot, filePath);

	if (!existsSync(fullPath)) {
		return {
			success: true,
			message: `⚠️ File not found (skipping check): ${filePath}`
		};
	}

	const content = readFileSync(fullPath, 'utf-8');
	const details: string[] = [];

	for (const pattern of forbiddenPatterns) {
		const found = content.includes(pattern);
		if (found) {
			details.push(`❌ Found forbidden pattern: ${pattern}`);
		}
	}

	const noneFound = details.length === 0;

	return {
		success: noneFound,
		message: noneFound
			? `✅ No forbidden patterns in ${filePath}`
			: `❌ Forbidden patterns found in ${filePath}`,
		details: noneFound ? undefined : details
	};
}

async function testDocumentManagementUI() {
	console.log('🧪 Testing Document Management UI...\n');

	const results: ValidationResult[] = [];

	// Check file structure
	console.log('📁 Checking file structure...');
	results.push(checkFileExists('src/routes/(app)/documentos/+page.svelte'));
	results.push(checkFileExists('src/routes/(app)/documentos/+page.server.ts'));
	results.push(checkFileExists('src/lib/components/document-management/DocumentUploadForm.svelte'));
	results.push(checkFileExists('src/lib/components/document-management/DocumentList.svelte'));
	results.push(checkFileExists('src/lib/components/document-management/DocumentFilters.svelte'));
	results.push(
		checkFileExists('src/lib/components/document-management/DocumentDetailModal.svelte')
	);
	results.push(checkFileExists('docs/DOCUMENT_MANAGEMENT_PHASE_1_5_UI.md'));

	// Check server-side protection
	console.log('\n🔒 Checking server-side protection...');
	results.push(
		checkFileContent('src/routes/(app)/documentos/+page.server.ts', [
			'locals',
			'locals.user',
			'redirect',
			'/login'
		])
	);

	// Check page component has required functionality
	console.log('\n🔍 Checking page component functionality...');
	results.push(
		checkFileContent('src/routes/(app)/documentos/+page.svelte', [
			'fetchDocuments',
			'handleUpload',
			'handleDownload',
			'handleDelete',
			'handleRestore',
			'handleFilterChange',
			'401',
			'403',
			'DocumentUploadForm',
			'DocumentList',
			'DocumentFilters',
			'DocumentDetailModal'
		])
	);

	// Check upload form has required fields
	console.log('\n🔍 Checking upload form fields...');
	results.push(
		checkFileContent('src/lib/components/document-management/DocumentUploadForm.svelte', [
			'ownerType',
			'ownerId',
			'category',
			'subType',
			'visibility',
			'metadata',
			'MAX_FILE_SIZE',
			'handleFileSelect',
			'handleSubmit'
		])
	);

	// Check document list has required functionality
	console.log('\n🔍 Checking document list functionality...');
	results.push(
		checkFileContent('src/lib/components/document-management/DocumentList.svelte', [
			'onView',
			'onDownload',
			'onDelete',
			'onRestore',
			'statusColors',
			'formatFileSize',
			'formatDate'
		])
	);

	// Check filters has required filter options
	console.log('\n🔍 Checking filter options...');
	results.push(
		checkFileContent('src/lib/components/document-management/DocumentFilters.svelte', [
			'category',
			'subType',
			'visibility',
			'status',
			'ownerType',
			'ownerId',
			'clearFilters'
		])
	);

	// Check detail modal has required functionality
	console.log('\n🔍 Checking detail modal functionality...');
	results.push(
		checkFileContent('src/lib/components/document-management/DocumentDetailModal.svelte', [
			'onDownload',
			'onDelete',
			'onRestore',
			'formatFileSize',
			'formatDate',
			'statusColors'
		])
	);

	// Check for forbidden patterns in UI files
	console.log('\n🚫 Checking for forbidden patterns in UI files...');
	const forbiddenPatterns = [
		'$queryRaw',
		'$executeRaw',
		'@ts-ignore',
		'@ts-except-error',
		': any',
		'as any'
	];

	results.push(
		checkForbiddenPatterns('src/routes/(app)/documentos/+page.svelte', forbiddenPatterns)
	);
	results.push(
		checkForbiddenPatterns(
			'src/lib/components/document-management/DocumentUploadForm.svelte',
			forbiddenPatterns
		)
	);
	results.push(
		checkForbiddenPatterns(
			'src/lib/components/document-management/DocumentList.svelte',
			forbiddenPatterns
		)
	);
	results.push(
		checkForbiddenPatterns(
			'src/lib/components/document-management/DocumentFilters.svelte',
			forbiddenPatterns
		)
	);
	results.push(
		checkForbiddenPatterns(
			'src/lib/components/document-management/DocumentDetailModal.svelte',
			forbiddenPatterns
		)
	);

	// Check that download uses protected endpoint
	console.log('\n🔒 Checking download uses protected endpoint...');
	results.push(
		checkFileContent('src/routes/(app)/documentos/+page.svelte', [
			'/api/documents/${document.id}/download',
			'window.URL.createObjectURL',
			'createElement'
		])
	);

	// Check that storage/private is not used as URL
	console.log('\n🔒 Checking storage/private is not used as URL...');
	const pageContent = readFileSync(
		join(projectRoot, 'src/routes/(app)/documentos/+page.svelte'),
		'utf-8'
	);
	const hasStorageUrl =
		pageContent.includes('storage/private') &&
		(pageContent.includes('href=') || pageContent.includes('src='));

	results.push({
		success: !hasStorageUrl,
		message: !hasStorageUrl
			? '✅ storage/private not used as URL'
			: '❌ storage/private used as URL'
	});

	// Print results
	console.log('\n📊 Test Results:\n');

	let passed = 0;
	let failed = 0;

	for (const result of results) {
		console.log(result.message);
		if (result.details) {
			for (const detail of result.details) {
				console.log(`  ${detail}`);
			}
		}

		if (result.success) {
			passed++;
		} else {
			failed++;
		}
	}

	console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);

	if (failed > 0) {
		console.error('\n💥 Document Management UI Test Suite: FAILED');
		process.exit(1);
	} else {
		console.log('\n🎉 Document Management UI Test Suite: PASSED\n');
	}
}

testDocumentManagementUI();
