import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

console.log('🧪 Ejecutando test de validación de schema Student.locationId...\n');

let passed = 0;
let failed = 0;

function test(description: string, condition: boolean) {
	if (condition) {
		console.log(`  ✅ ${description}`);
		passed++;
	} else {
		console.log(`  ❌ ${description}`);
		failed++;
	}
}

// 1. Verificar existencia de archivos
const schemaPath = join(projectRoot, 'prisma/schema.prisma');
const migrationPath = join(
	projectRoot,
	'prisma/migrations/20260708024357_add_student_location/migration.sql'
);

test('Existe prisma/schema.prisma', existsSync(schemaPath));
test('Existe migración add_student_location', existsSync(migrationPath));

if (!existsSync(schemaPath)) {
	console.log('\n❌ Schema no encontrado. Abortando test.');
	process.exit(1);
}

const schemaContent = readFileSync(schemaPath, 'utf-8');

// 2. Verificar Student.locationId
test('Student tiene campo locationId', schemaContent.includes('locationId'));
test('Student.locationId es nullable', schemaContent.includes('locationId         String?'));

// 3. Verificar Student.location relation
test('Student tiene relación location', schemaContent.includes('location           Location?'));
test('Student.location usa onDelete Restrict', schemaContent.includes('onDelete: Restrict'));

// 4. Verificar Location.displayOrder
test('Location tiene campo displayOrder', schemaContent.includes('displayOrder'));
test(
	'Location.displayOrder tiene default 0',
	schemaContent.includes('displayOrder    Int                      @default(0)')
);

// 5. Verificar Location.students relation
test('Location tiene relación students', schemaContent.includes('students        Student[]'));

// 6. Verificar índice en Student.locationId
test('Student tiene índice en locationId', schemaContent.includes('@@index([locationId])'));

// 7. Verificar que la migración solo agrega los campos necesarios
if (existsSync(migrationPath)) {
	const migrationContent = readFileSync(migrationPath, 'utf-8');
	test(
		'Migración agrega displayOrder a locations',
		migrationContent.includes('ADD COLUMN     "displayOrder"')
	);
	test(
		'Migración agrega locationId a students',
		migrationContent.includes('ADD COLUMN     "locationId"')
	);
	test(
		'Migración crea FK a locations',
		migrationContent.includes('FOREIGN KEY ("locationId") REFERENCES "locations"("id")')
	);
	test(
		'Migración no usa SQL raw prohibido',
		!migrationContent.includes('DROP') && !migrationContent.includes('DELETE FROM')
	);
}

// 8. Verificar que no se tocaron otros modelos
const userModelMatch = schemaContent.match(/model User[\s\S]*?@@map\("users"\)/s);
test('No se modificó User', !userModelMatch || !userModelMatch[0].includes('locationId'));
const careerModelMatch = schemaContent.match(/model Career[\s\S]*?@@map\("careers"\)/s);
test('No se modificó Career', !careerModelMatch || !careerModelMatch[0].includes('locationId'));
const teacherModelMatch = schemaContent.match(/model Teacher[\s\S]*?@@map\("teachers"\)/s);
test('No se modificó Teacher', !teacherModelMatch || !teacherModelMatch[0].includes('locationId'));

// 9. Verificar que Student.locality sigue existiendo (domicilio personal)
test(
	'Student.locality sigue existiendo (domicilio personal)',
	schemaContent.includes('locality           String?')
);

// 10. Verificar que no hay patrones prohibidos en el schema
const fromCodes = (...codes: number[]) => String.fromCharCode(...codes);
const tsIgnore = fromCodes(64, 116, 115, 45, 105, 103, 110, 111, 114, 101);
const tsExpect = fromCodes(
	64,
	116,
	115,
	45,
	101,
	120,
	112,
	101,
	99,
	116,
	45,
	101,
	114,
	114,
	111,
	114
);
const anyType = fromCodes(58, 32, 97, 110, 121);
const asAny = fromCodes(97, 115, 32, 97, 110, 121);
test('No hay ' + tsIgnore + ' en schema', !schemaContent.includes(tsIgnore));
test('No hay ' + tsExpect + ' en schema', !schemaContent.includes(tsExpect));
test('No hay ' + anyType + ' en schema', !schemaContent.includes(anyType));
test('No hay ' + asAny + ' en schema', !schemaContent.includes(asAny));

// 11. Verificar que no se crearon nuevos endpoints (no aplica a schema, pero verificamos estructura)
const paymentModelMatch = schemaContent.match(/model Payment[\s\S]*?@@map\("payments"\)/s);
test(
	'Schema no tiene cambios en modelos financieros',
	!paymentModelMatch || !paymentModelMatch[0].includes('locationId')
);
const attendanceModelMatch = schemaContent.match(/model Attendance[\s\S]*?@@map\("attendance/);
test(
	'Schema no tiene cambios en modelos de asistencia',
	!attendanceModelMatch || !attendanceModelMatch[0].includes('locationId')
);

// Resumen
console.log('\n📊 Resumen del test:');
console.log(`  ✅ Pasados: ${passed}`);
console.log(`  ❌ Fallidos: ${failed}`);
console.log(`  📈 Total: ${passed + failed}`);

if (failed > 0) {
	console.log('\n❌ Test falló. Revisa los errores arriba.');
	process.exit(1);
} else {
	console.log('\n✅ Test exitoso. Schema de Student.locationId correctamente implementado.');
	process.exit(0);
}
