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
		console.log(`  ❌ Archivo no existe: ${filePath}`);
		process.exit(1);
	}
	return readFileSync(fullPath, 'utf-8');
}

function checkFileContains(filePath: string, pattern: string): boolean {
	const content = readFileContent(filePath);
	return content.includes(pattern);
}

function checkFileNotContains(filePath: string, pattern: string): boolean {
	const content = readFileContent(filePath);
	return !content.includes(pattern);
}

console.log('🧪 Ejecutando test de validación de Beneficios de Cuotas...\n');

// 1. Verificar schema tiene nuevos campos
console.log('1. Verificar schema.prisma...');
const schemaContent = readFileContent('prisma/schema.prisma');
test('StudentCharge tiene installmentNumber', schemaContent.includes('installmentNumber'));
test('StudentCharge tiene benefitType', schemaContent.includes('benefitType'));
test('StudentCharge tiene benefitReason', schemaContent.includes('benefitReason'));
test('StudentCharge tiene ruleSnapshot', schemaContent.includes('ruleSnapshot'));
test('Campos son nullable', schemaContent.includes('Int?') && schemaContent.includes('String?') && schemaContent.includes('Json?'));

// 2. Verificar migración existe
console.log('\n2. Verificar migración...');
const migrationFiles = ['prisma/migrations'].map((dir) => join(rootDir, dir));
const hasMigration = existsSync(join(rootDir, 'prisma/migrations'));
test('Migración creada', hasMigration);

// 3. Verificar helper benefit-calculator existe
console.log('\n3. Verificar helper benefit-calculator...');
test('benefit-calculator.ts existe', existsSync('src/lib/server/financial/benefit-calculator.ts'));
const calculatorContent = readFileContent('src/lib/server/financial/benefit-calculator.ts');
test('Función calculateChargeBenefit existe', calculatorContent.includes('calculateChargeBenefit'));
test('Función getBenefitsConfig existe', calculatorContent.includes('getBenefitsConfig'));
test('Tipo BenefitsConfig existe', calculatorContent.includes('BenefitsConfig'));
test('Tipo ChargeCalculation existe', calculatorContent.includes('ChargeCalculation'));
test('Configuración por defecto tiene normalFeeAmount', calculatorContent.includes('normalFeeAmount: 50000'));
test('Configuración por defecto tiene becadoFeeAmount', calculatorContent.includes('becadoFeeAmount: 25000'));
test('Configuración por defecto tiene recursantFeeAmount', calculatorContent.includes('recursantFeeAmount: 30000'));
test('Configuración por defecto tiene enrollmentAmount', calculatorContent.includes('enrollmentAmount: 50000'));
test('Configuración por defecto tiene benefitsMonths', calculatorContent.includes('benefitsMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]'));
test('Configuración recursantBenefitType = FIXED_FINAL_AMOUNT', calculatorContent.includes('FIXED_FINAL_AMOUNT'));
test('Estrategia BEST_AMOUNT', calculatorContent.includes('BEST_AMOUNT'));

// 4. Verificar lógica de cálculo
console.log('\n4. Verificar lógica de cálculo...');
test('Verifica beneficiosMonths.includes(monthToCheck)', calculatorContent.includes('benefitsMonths.includes(monthToCheck)'));
test('Retorna NONE cuando no aplica beneficios', calculatorContent.includes('benefitType: \'NONE\''));
test('Calcula monto con beca', calculatorContent.includes('calculateScholarshipAmount'));
test('Calcula monto recursante FIXED_FINAL_AMOUNT', calculatorContent.includes('FIXED_FINAL_AMOUNT'));
test('Elige monto más favorable (menor)', calculatorContent.includes('isLessThan'));
test('Crea ruleSnapshot', calculatorContent.includes('createRuleSnapshot'));

// 5. Verificar integración en financial-service
console.log('\n5. Verificar integración en financial-service...');
const serviceContent = readFileContent('src/lib/server/financial/financial-service.ts');
test('Importa benefit-calculator', serviceContent.includes('benefit-calculator'));
test('Usa calculateChargeBenefit', serviceContent.includes('calculateChargeBenefit'));
test('Usa getBenefitsConfig', serviceContent.includes('getBenefitsConfig'));
test('ChargeInput tiene installmentNumber', serviceContent.includes('installmentNumber'));
test('Guarda installmentNumber en StudentCharge', serviceContent.includes('installmentNumber: input.installmentNumber'));
test('Guarda benefitType en StudentCharge', serviceContent.includes('benefitType: benefitCalculation.benefitType'));
test('Guarda benefitReason en StudentCharge', serviceContent.includes('benefitReason: benefitCalculation.benefitReason'));
test('Guarda ruleSnapshot en StudentCharge', serviceContent.includes('ruleSnapshot: benefitCalculation.ruleSnapshot'));

// 6. Verificar que no se tocan archivos prohibidos
console.log('\n6. Verificar archivos no modificados...');
test('No se toca /alumnos', !checkFileContains('src/routes/(app)/alumnos/+page.svelte', 'benefitType'));
test('No se toca seeders', !checkFileContains('prisma/seed-financiero-completo.ts', 'installmentNumber'));

// 7. Verificar patrones prohibidos en código nuevo
console.log('\n7. Verificar patrones prohibidos en código nuevo...');
// Solo verificar benefit-calculator.ts (archivo nuevo creado)
const newFilePatterns = [
	{ pattern: '$' + 'queryRaw', file: 'src/lib/server/financial/benefit-calculator.ts' },
	{ pattern: '$' + 'executeRaw', file: 'src/lib/server/financial/benefit-calculator.ts' },
	{ pattern: '@ts-' + 'ignore', file: 'src/lib/server/financial/benefit-calculator.ts' },
	{ pattern: '@ts-' + 'expect-error', file: 'src/lib/server/financial/benefit-calculator.ts' },
	{ pattern: 'as ' + 'any', file: 'src/lib/server/financial/benefit-calculator.ts' }
];

for (const { pattern, file } of newFilePatterns) {
	if (existsSync(file)) {
		const content = readFileContent(file);
		test(`No hay ${pattern} en ${file}`, !content.includes(pattern));
	}
}

// Verificar que no agregamos : any o as any en las secciones modificadas de financial-service.ts
const serviceLines = serviceContent.split('\n');
const modifiedSectionStart = serviceLines.findIndex((line) => line.includes('import.*benefit-calculator'));
const modifiedSectionEnd = serviceLines.findIndex((line) => line.includes('ruleSnapshot: benefitCalculation.ruleSnapshot'));

if (modifiedSectionStart >= 0 && modifiedSectionEnd >= 0) {
	const modifiedSection = serviceLines.slice(modifiedSectionStart, modifiedSectionEnd + 1).join('\n');
	test('No hay : any en sección modificada de financial-service.ts', !modifiedSection.includes(': any'));
	test('No hay as any en sección modificada de financial-service.ts', !modifiedSection.includes('as any'));
}

// 8. Verificar que snapshot contiene campos requeridos
console.log('\n8. Verificar snapshot contiene campos requeridos...');
test('Snapshot contiene baseAmount', calculatorContent.includes('baseAmount'));
test('Snapshot contiene installmentNumber', calculatorContent.includes('installmentNumber'));
test('Snapshot contiene benefitsMonths', calculatorContent.includes('benefitsMonths'));
test('Snapshot contiene studentFlags', calculatorContent.includes('studentFlags'));
test('Snapshot contiene selectedBenefit', calculatorContent.includes('selectedBenefit'));

// 10. Verificar que recursante fijo es monto final
console.log('\n10. Verificar recursante fijo es monto final...');
test('Recursante FIXED_FINAL_AMOUNT retorna valor configurado', calculatorContent.includes('new Decimal(config.recursantBenefitValue)'));
test('No calcula descuento para recursante fijo', !calculatorContent.includes('subtract(baseAmount, recursantBenefitValue)'));

console.log('\n📊 Resumen del test:');
console.log('  ✅ Todos los tests pasaron');
console.log('\n✅ Test exitoso. Beneficios de cuotas correctamente implementados.');
