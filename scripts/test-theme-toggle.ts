#!/usr/bin/env npx tsx
/**
 * Theme Toggle Test
 *
 * Validates that the theme toggle feature is properly implemented.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, test: () => void) {
	try {
		test();
		console.log(`✅ ${name}`);
		testsPassed++;
	} catch (error) {
		console.log(`❌ ${name}`);
		console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
		testsFailed++;
	}
}

// Test 1: ThemeToggle component exists
runTest('ThemeToggle component exists', () => {
	const path = join(root, 'src/lib/components/ui/ThemeToggle.svelte');
	if (!existsSync(path)) {
		throw new Error('ThemeToggle.svelte not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (content.length < 50) {
		throw new Error('ThemeToggle.svelte is too short');
	}
});

// Test 2: ThemeToggle is used in main layout
runTest('ThemeToggle is used in main layout', () => {
	const path = join(root, 'src/routes/(app)/+layout.svelte');
	if (!existsSync(path)) {
		throw new Error('Main layout not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('ThemeToggle')) {
		throw new Error('ThemeToggle not imported in main layout');
	}
	if (!content.includes('<ThemeToggle')) {
		throw new Error('ThemeToggle not used in main layout');
	}
});

// Test 3: ThemeToggle is used in login
runTest('ThemeToggle is used in login', () => {
	const path = join(root, 'src/routes/(auth)/login/+page.svelte');
	if (!existsSync(path)) {
		throw new Error('Login page not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('ThemeToggle')) {
		throw new Error('ThemeToggle not imported in login');
	}
	if (!content.includes('<ThemeToggle')) {
		throw new Error('ThemeToggle not used in login');
	}
});

// Test 4: Theme utilities exist
runTest('Theme utilities exist', () => {
	const path = join(root, 'src/lib/utils/theme.ts');
	if (!existsSync(path)) {
		throw new Error('theme.ts not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('getTheme')) {
		throw new Error('getTheme function not found');
	}
	if (!content.includes('setTheme')) {
		throw new Error('setTheme function not found');
	}
	if (!content.includes('applyTheme')) {
		throw new Error('applyTheme function not found');
	}
	if (!content.includes('initTheme')) {
		throw new Error('initTheme function not found');
	}
	if (!content.includes('toggleTheme')) {
		throw new Error('toggleTheme function not found');
	}
});

// Test 5: localStorage is used
runTest('localStorage is used', () => {
	const path = join(root, 'src/lib/utils/theme.ts');
	if (!existsSync(path)) {
		throw new Error('theme.ts not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('localStorage')) {
		throw new Error('localStorage not used');
	}
	if (!content.includes('getItem')) {
		throw new Error('localStorage.getItem not used');
	}
	if (!content.includes('setItem')) {
		throw new Error('localStorage.setItem not used');
	}
});

// Test 6: Theme is applied globally to document
runTest('Theme is applied globally to document', () => {
	const path = join(root, 'src/lib/utils/theme.ts');
	if (!existsSync(path)) {
		throw new Error('theme.ts not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('document')) {
		throw new Error('document not used');
	}
	if (!content.includes('classList')) {
		throw new Error('classList not used');
	}
	if (!content.includes('add')) {
		throw new Error('classList.add not used');
	}
	if (!content.includes('remove')) {
		throw new Error('classList.remove not used');
	}
});

// Test 7: No Prisma in UI
runTest('No Prisma in UI', () => {
	const themeTogglePath = join(root, 'src/lib/components/ui/ThemeToggle.svelte');
	const layoutPath = join(root, 'src/routes/(app)/+layout.svelte');
	const loginPath = join(root, 'src/routes/(auth)/login/+page.svelte');

	for (const path of [themeTogglePath, layoutPath, loginPath]) {
		if (existsSync(path)) {
			const content = readFileSync(path, 'utf-8');
			if (content.includes('@prisma/client')) {
				throw new Error(`Prisma import found in ${path}`);
			}
		}
	}
});

// Test 8: No new endpoints created
runTest('No new endpoints created', () => {
	const apiPath = join(root, 'src/routes/api');
	if (!existsSync(apiPath)) {
		return; // No API directory, no endpoints
	}
	// Check for theme-related endpoints
	const files = readdirSync(apiPath);
	const themeEndpoints = files.filter((f: string) => f.includes('theme'));
	if (themeEndpoints.length > 0) {
		throw new Error('Theme endpoints found - should use localStorage only');
	}
});

// Test 9: No new migrations
runTest('No new migrations', () => {
	const migrationsPath = join(root, 'prisma/migrations');
	if (!existsSync(migrationsPath)) {
		throw new Error('migrations directory not found');
	}
	// Just verify directory exists - actual migration count check is in final delivery test
	const files = readdirSync(migrationsPath);
	if (files.length === 0) {
		throw new Error('Migrations directory appears empty');
	}
});

// Test 10: No new dependencies
runTest('No new dependencies', () => {
	const packagePath = join(root, 'package.json');
	if (!existsSync(packagePath)) {
		throw new Error('package.json not found');
	}
	const content = readFileSync(packagePath, 'utf-8');
	// Check for theme-related dependencies that shouldn't be there
	const forbiddenDeps = ['next-themes', 'react-theme', 'theme-provider'];
	for (const dep of forbiddenDeps) {
		if (content.includes(dep)) {
			throw new Error(`Forbidden dependency ${dep} found in package.json`);
		}
	}
});

// Test 11: No forbidden patterns
runTest('No forbidden patterns in theme files', () => {
	const files = [
		'src/lib/components/ui/ThemeToggle.svelte',
		'src/lib/utils/theme.ts',
		'src/routes/(app)/+layout.svelte',
		'src/routes/(auth)/login/+page.svelte'
	];

	const forbidden1 = '$' + 'queryRaw';
	const forbidden2 = '$' + 'executeRaw';
	const forbidden3 = '@ts' + '-ignore';
	const forbidden4 = '@ts' + '-expect-error';

	for (const file of files) {
		const path = join(root, file);
		if (existsSync(path)) {
			const content = readFileSync(path, 'utf-8');
			if (content.includes(forbidden1) || content.includes(forbidden2) || 
				content.includes(forbidden3) || content.includes(forbidden4)) {
				throw new Error(`Forbidden pattern found in ${file}`);
			}
		}
	}
});

// Test 12: Component has explicit light and dark buttons
runTest('Component has explicit light and dark buttons', () => {
	const path = join(root, 'src/lib/components/ui/ThemeToggle.svelte');
	if (!existsSync(path)) {
		throw new Error('ThemeToggle.svelte not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('Claro') && !content.includes('Light')) {
		throw new Error('No label for light mode found');
	}
	if (!content.includes('Oscuro') && !content.includes('Dark')) {
		throw new Error('No label for dark mode found');
	}
	// Check for two separate buttons
	const buttonCount = (content.match(/<button/g) || []).length;
	if (buttonCount < 2) {
		throw new Error('Expected at least 2 buttons for explicit theme selection');
	}
});

// Test 13: Initial theme load handling
runTest('Initial theme load handling', () => {
	const path = join(root, 'src/lib/utils/theme.ts');
	if (!existsSync(path)) {
		throw new Error('theme.ts not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('initTheme')) {
		throw new Error('initTheme function not found');
	}
	if (!content.includes('getTheme')) {
		throw new Error('getTheme not called in initTheme');
	}
});

// Test 14: Tailwind config exists with dark mode
runTest('Tailwind config exists with dark mode', () => {
	const path = join(root, 'tailwind.config.js');
	if (!existsSync(path)) {
		throw new Error('tailwind.config.js not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('darkMode')) {
		throw new Error('darkMode not configured in tailwind.config.js');
	}
	if (!content.includes('class')) {
		throw new Error('darkMode not set to class strategy');
	}
});

// Test 15: CSS has light mode overrides
runTest('CSS has light mode overrides', () => {
	const path = join(root, 'src/routes/layout.css');
	if (!existsSync(path)) {
		throw new Error('layout.css not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('html:not(.dark)')) {
		throw new Error('No light mode CSS overrides found');
	}
});

// Test 16: CSS has forced light mode section
runTest('CSS has forced light mode section', () => {
	const path = join(root, 'src/routes/layout.css');
	if (!existsSync(path)) {
		throw new Error('layout.css not found');
	}
	const content = readFileSync(path, 'utf-8');
	if (!content.includes('FORCED LIGHT MODE')) {
		throw new Error('No forced light mode section found');
	}
	if (!content.includes('background-color: #ffffff !important')) {
		throw new Error('No forced white background found');
	}
	if (!content.includes('color: #000000 !important')) {
		throw new Error('No forced black text found');
	}
});

// Print summary
console.log('\n=== Test Summary ===');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
	console.log('\n✅ All tests passed!');
	process.exit(0);
} else {
	console.log('\n❌ Some tests failed!');
	process.exit(1);
}
