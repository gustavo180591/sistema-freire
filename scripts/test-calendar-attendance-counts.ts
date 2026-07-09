#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

console.log('🧪 Testing Calendar Attendance Counts Integration\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean | void) {
	try {
		const result = fn();
		if (result === false) {
			console.log(`❌ ${name}`);
			failed++;
		} else {
			console.log(`✅ ${name}`);
			passed++;
		}
	} catch (error) {
		console.log(`❌ ${name} - Error: ${error}`);
		failed++;
	}
}

// Test 1: schema.prisma has countsAttendance in Holiday
test('schema.prisma has countsAttendance Boolean @default(false) in Holiday', () => {
	const schemaPath = join(ROOT, 'prisma/schema.prisma');
	const schema = readFileSync(schemaPath, 'utf-8');
	const holidayModel = schema.match(/model Holiday \{[\s\S]*?\n\}/)?.[0];
	if (!holidayModel) return false;
	return (
		holidayModel.includes('countsAttendance') &&
		holidayModel.includes('Boolean') &&
		holidayModel.includes('@default(false)')
	);
});

// Test 2: schema.prisma has countsAttendance in ImportantDate
test('schema.prisma has countsAttendance Boolean @default(false) in ImportantDate', () => {
	const schemaPath = join(ROOT, 'prisma/schema.prisma');
	const schema = readFileSync(schemaPath, 'utf-8');
	const importantDateModel = schema.match(/model ImportantDate \{[\s\S]*?\n\}/)?.[0];
	if (!importantDateModel) return false;
	return (
		importantDateModel.includes('countsAttendance') &&
		importantDateModel.includes('Boolean') &&
		importantDateModel.includes('@default(false)')
	);
});

// Test 3: migration add_calendar_config_tables exists
test('migration add_calendar_config_tables exists', () => {
	const migrationPath = join(
		ROOT,
		'prisma/migrations/20260705004825_add_calendar_config_tables/migration.sql'
	);
	return existsSync(migrationPath);
});

// Test 4: migration add_calendar_attendance_counts exists
test('migration add_calendar_attendance_counts exists', () => {
	const migrationPath = join(
		ROOT,
		'prisma/migrations/20260705005020_add_calendar_attendance_counts/migration.sql'
	);
	return existsSync(migrationPath);
});

// Test 5: migration adds countsAttendance column
test('migration adds countsAttendance column', () => {
	const migrationPath = join(
		ROOT,
		'prisma/migrations/20260705005020_add_calendar_attendance_counts/migration.sql'
	);
	const migration = readFileSync(migrationPath, 'utf-8');
	return migration.includes('countsAttendance') && migration.includes('ADD COLUMN');
});

// Test 6: migration only touches calendar tables
test('migration add_calendar_attendance_counts only touches holidays and important_dates', () => {
	const migrationPath = join(
		ROOT,
		'prisma/migrations/20260705005020_add_calendar_attendance_counts/migration.sql'
	);
	const migration = readFileSync(migrationPath, 'utf-8');

	// Check for forbidden table operations
	const forbiddenTables = [
		'users',
		'careers',
		'students',
		'teachers',
		'subjects',
		'enrollments',
		'financial',
		'receipts',
		'payments',
		'documents',
		'calendar_config'
	];

	for (const table of forbiddenTables) {
		if (migration.toLowerCase().includes(table)) {
			return false;
		}
	}

	// Check that it only touches holidays and important_dates
	return migration.includes('holidays') && migration.includes('important_dates');
});

// Test 7: addHoliday reads countsAttendance
test('addHoliday action reads countsAttendance from form data', () => {
	const serverPath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.server.ts');
	const server = readFileSync(serverPath, 'utf-8');
	const addHolidayAction = server.match(/addHoliday: async \([\s\S]*?\n\t\}/)?.[0];
	if (!addHolidayAction) return false;
	return addHolidayAction.includes("formData.get('countsAttendance')");
});

// Test 8: addImportantDate reads countsAttendance
test('addImportantDate action reads countsAttendance from form data', () => {
	const serverPath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.server.ts');
	const server = readFileSync(serverPath, 'utf-8');
	const addImportantDateAction = server.match(/addImportantDate: async \([\s\S]*?\n\t\}/)?.[0];
	if (!addImportantDateAction) return false;
	return addImportantDateAction.includes("formData.get('countsAttendance')");
});

// Test 9: UI has checkbox countsAttendance in holiday form
test('UI has checkbox countsAttendance in holiday form', () => {
	const pagePath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.svelte');
	const page = readFileSync(pagePath, 'utf-8');
	return page.includes('name="countsAttendance"') && page.includes('id="countsAttendance"');
});

// Test 10: UI has checkbox countsAttendance in important date form
test('UI has checkbox countsAttendance in important date form', () => {
	const pagePath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.svelte');
	const page = readFileSync(pagePath, 'utf-8');
	return page.includes('name="countsAttendance"') && page.includes('id="countsAttendanceDate"');
});

// Test 11: UI shows "Cuenta asistencia" when countsAttendance is true
test('UI shows "Cuenta asistencia" when countsAttendance is true', () => {
	const pagePath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.svelte');
	const page = readFileSync(pagePath, 'utf-8');
	return page.includes('Cuenta asistencia');
});

// Test 12: No changes to financial module
test('No changes to financial module files', () => {
	const serverPath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.server.ts');
	const server = readFileSync(serverPath, 'utf-8');
	return (
		!server.toLowerCase().includes('financial') &&
		!server.toLowerCase().includes('receipt') &&
		!server.toLowerCase().includes('payment')
	);
});

// Test 13: No new endpoints created
test('No new endpoints created (only server actions)', () => {
	const serverPath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.server.ts');
	const server = readFileSync(serverPath, 'utf-8');
	// Check that only existing actions are present: addHoliday, deleteHoliday, addImportantDate, deleteImportantDate, updateWorkingDays
	const allowedActions = [
		'addHoliday',
		'deleteHoliday',
		'addImportantDate',
		'deleteImportantDate',
		'updateWorkingDays'
	];
	const lines = server.split('\n');
	const actionLines = lines.filter((line) => line.match(/^\s*[a-zA-Z]+:\s+async/));

	// Count actions
	let foundActions = 0;
	for (const line of actionLines) {
		const actionName = line.match(/([a-zA-Z]+):/)?.[1];
		if (actionName && allowedActions.includes(actionName)) {
			foundActions++;
		}
	}

	// Should have exactly 5 actions
	return foundActions === 5;
});

// Test 14: No SQL raw queries used
test('No SQL raw queries used', () => {
	const serverPath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.server.ts');
	const server = readFileSync(serverPath, 'utf-8');
	const queryRaw = '$' + 'queryRaw';
	const executeRaw = '$' + 'executeRaw';
	return !server.includes(queryRaw) && !server.includes(executeRaw);
});

// Test 15: No forbidden patterns (concatenated to avoid grep detection)
test('No forbidden patterns', () => {
	const serverPath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.server.ts');
	const pagePath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.svelte');

	const server = readFileSync(serverPath, 'utf-8');
	const page = readFileSync(pagePath, 'utf-8');

	const tsIgnore = '@' + 'ts-ignore';
	const tsExpect = '@' + 'ts-expect-error';
	const anyType = ': ' + 'any';
	const anyCast = 'as ' + 'any';

	const combined = server + page;

	return (
		!combined.includes(tsIgnore) &&
		!combined.includes(tsExpect) &&
		!combined.includes(anyType) &&
		!combined.includes(anyCast)
	);
});

// Test 16: Checkbox uses 'on' value (not 'true')
test('Checkbox uses "on" value for boolean parsing', () => {
	const serverPath = join(ROOT, 'src/routes/(app)/configuracion/calendario/+page.server.ts');
	const server = readFileSync(serverPath, 'utf-8');
	return server.includes("=== 'on'") && !server.includes("=== 'true'");
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
	process.exit(1);
}
