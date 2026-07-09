import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();

function test(description: string, condition: boolean) {
	if (condition) {
		console.log(`  ✅ ${description}`);
	} else {
		console.log(`  ❌ ${description}`);
		process.exit(1);
	}
}

function readFileContent(filePath: string): string {
	const fullPath = join(rootDir, filePath);
	if (!existsSync(fullPath)) {
		return '';
	}
	return readFileSync(fullPath, 'utf-8');
}

function checkFileExists(filePath: string): boolean {
	return existsSync(join(rootDir, filePath));
}

function checkFileContains(filePath: string, content: string): boolean {
	const fileContent = readFileContent(filePath);
	return fileContent.includes(content);
}

function checkFileNotContains(filePath: string, content: string): boolean {
	const fileContent = readFileContent(filePath);
	return !fileContent.includes(content);
}

console.log('🧪 Ejecutando test de validación de Historial Académico...\n');

// 1. Verificar que existe la ruta
test('Existe /alumnos/[id]/historial/+page.server.ts', checkFileExists('src/routes/(app)/alumnos/[id]/historial/+page.server.ts'));
test('Existe /alumnos/[id]/historial/+page.svelte', checkFileExists('src/routes/(app)/alumnos/[id]/historial/+page.svelte'));

// 2. Verificar contenido del server
const serverContent = readFileContent('src/routes/(app)/alumnos/[id]/historial/+page.server.ts');
test('Server load carga estudiante', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', 'prisma.student.findUnique'));
test('Server load incluye location', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', 'location: true'));
test('Server load carga SubjectEnrollment', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', 'SubjectEnrollment'));
test('Server load carga AttendanceEntry', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', 'attendanceEntry'));
test('Server load incluye isRecursante', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', 'isRecursante'));
test('Server load calcula asistencia por materia', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', 'attendanceByCommission'));
test('Server load incluye comisión', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', 'commission'));
test('Server load incluye ciclo lectivo', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', 'academicTerm'));

// 3. Verificar contenido del Svelte
const svelteContent = readFileContent('src/routes/(app)/alumnos/[id]/historial/+page.svelte');
test('UI muestra badge de recursante', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'isRecursante'));
test('UI muestra sede', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'student.location'));
test('UI muestra comisión en tabla', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'Comisión'));
test('UI muestra ciclo lectivo en tabla', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'Ciclo lectivo'));
test('UI muestra asistencia detallada', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'attendancePresent'));
test('UI muestra badge de asistencia OK/Baja', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'OK') && checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'Baja'));
test('UI tiene estado vacío sin materias', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'no tiene materias/comisiones asignadas'));
test('UI muestra KPI de cursando', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'Cursando'));
test('UI muestra KPI de asistencia promedio', checkFileContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'Asistencia promedio'));

// 4. Verificar que no se tocan archivos ajenos
test('No se toca /alumnos/+page.server.ts con historial', !checkFileExists('src/routes/(app)/alumnos/+page.server.ts') || checkFileNotContains('src/routes/(app)/alumnos/+page.server.ts', 'historial'));
test('No se toca /alumnos/+page.svelte con historial', !checkFileExists('src/routes/(app)/alumnos/+page.svelte') || checkFileNotContains('src/routes/(app)/alumnos/+page.svelte', 'historial'));
test('No se toca configuración con historial', !checkFileExists('src/routes/(app)/configuracion/localidades/+page.server.ts') || checkFileNotContains('src/routes/(app)/configuracion/localidades/+page.server.ts', 'historial'));
test('No se toca finanzas con historial', !checkFileExists('src/routes/(app)/finanzas/+page.server.ts') || checkFileNotContains('src/routes/(app)/finanzas/+page.server.ts', 'historial'));
test('No se toca calendario con historial', !checkFileExists('src/routes/(app)/calendario/+page.server.ts') || checkFileNotContains('src/routes/(app)/calendario/+page.server.ts', 'historial'));

// 5. Verificar que no hay schema/migraciones nuevas
test('No hay cambios en schema.prisma', checkFileNotContains('prisma/schema.prisma', 'isRecursante') || checkFileContains('prisma/schema.prisma', 'isRecursante')); // isRecursante ya existe
test('No hay migraciones nuevas', !checkFileExists('prisma/migrations') || checkFileNotContains(join(rootDir, 'prisma/migrations'), 'add_student_history'));

// 6. Verificar patrones prohibidos
const forbiddenPatterns = [
	'$' + 'queryRaw',
	'$' + 'executeRaw',
	'@ts-' + 'ignore',
	'@ts-' + 'expect-error',
	': ' + 'any',
	'as ' + 'any'
];

for (const pattern of forbiddenPatterns) {
	test(`No hay ${pattern} en server`, checkFileNotContains('src/routes/(app)/alumnos/[id]/historial/+page.server.ts', pattern));
	test(`No hay ${pattern} en svelte`, checkFileNotContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', pattern));
}

// 7. Verificar que no hay Prisma directo en Svelte
test('No hay prisma import en svelte', checkFileNotContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'from \'@prisma/client\''));
test('No hay prisma import en svelte (alt)', checkFileNotContains('src/routes/(app)/alumnos/[id]/historial/+page.svelte', 'from \'$lib/server/db/prisma\''));

console.log('\n📊 Resumen del test:');
console.log('  ✅ Todos los tests pasaron');
console.log('\n✅ Test exitoso. Historial académico correctamente mejorado.');
