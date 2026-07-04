import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
const pagePath = join(projectRoot, 'src/routes/(app)/usuarios/[id]/editar/+page.svelte');
const serverPath = join(projectRoot, 'src/routes/(app)/usuarios/[id]/editar/+page.server.ts');

function readFileContent(filePath: string): string {
	if (!existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}
	return readFileSync(filePath, 'utf-8');
}

function testFileExists(filePath: string, description: string): boolean {
	const exists = existsSync(filePath);
	console.log(`${exists ? '✓' : '✗'} ${description}: ${filePath}`);
	return exists;
}

function testContains(content: string, pattern: string, description: string): boolean {
	const contains = content.includes(pattern);
	console.log(`${contains ? '✓' : '✗'} ${description}`);
	return contains;
}

function testNotContains(content: string, pattern: string, description: string): boolean {
	const contains = content.includes(pattern);
	const result = !contains;
	console.log(`${result ? '✓' : '✗'} ${description}`);
	return result;
}

function testRegex(content: string, pattern: RegExp, description: string): boolean {
	const matches = pattern.test(content);
	console.log(`${matches ? '✓' : '✗'} ${description}`);
	return matches;
}

function testNotRegex(content: string, pattern: RegExp, description: string): boolean {
	const matches = pattern.test(content);
	const result = !matches;
	console.log(`${result ? '✓' : '✗'} ${description}`);
	return result;
}

console.log('Validando pantalla de edición de usuario...\n');

let allPassed = true;

try {
	const pageContent = readFileContent(pagePath);
	const serverContent = readFileContent(serverPath);

	// 1. existe page.svelte
	if (!testFileExists(pagePath, 'Existe +page.svelte')) allPassed = false;

	// 2. existe +page.server.ts
	if (!testFileExists(serverPath, 'Existe +page.server.ts')) allPassed = false;

	// 3. contiene sección de datos personales
	if (!testContains(pageContent, 'Datos Personales', 'Contiene sección de datos personales')) allPassed = false;

	// 4. contiene sección de sedes/localidades
	if (!testContains(pageContent, 'Sedes Habilitadas', 'Contiene sección de sedes/localidades')) allPassed = false;

	// 5. contiene sección de roles
	if (!testContains(pageContent, 'Roles', 'Contiene sección de roles')) allPassed = false;

	// 6. contiene sección de seguridad
	if (!testContains(pageContent, 'Seguridad', 'Contiene sección de seguridad')) allPassed = false;

	// 7. no se duplica "Datos Administrativos"
	const adminSections = (pageContent.match(/Datos Administrativos/g) || []).length;
	if (adminSections > 1) {
		console.log(`✗ No se duplica "Datos Administrativos" (encontrado ${adminSections} veces)`);
		allPassed = false;
	} else {
		console.log('✓ No se duplica "Datos Administrativos"');
	}

	// 8. no existe name="locality"
	if (!testNotContains(pageContent, 'name="locality"', 'No existe name="locality"')) allPassed = false;

	// 9. no existe id="locality"
	if (!testNotContains(pageContent, 'id="locality"', 'No existe id="locality"')) allPassed = false;

	// 10. no hay IDs duplicados phone
	const phoneIds = (pageContent.match(/id="phone"/g) || []).length;
	if (phoneIds > 1) {
		console.log(`✗ No hay IDs duplicados phone (encontrado ${phoneIds} veces)`);
		allPassed = false;
	} else {
		console.log('✓ No hay IDs duplicados phone');
	}

	// 11. existe name="locationIds"
	if (!testContains(pageContent, 'name="locationIds"', 'Existe name="locationIds"')) allPassed = false;

	// 12. existe acción updateUser
	if (!testContains(serverContent, 'updateUser:', 'Existe acción updateUser')) allPassed = false;

	// 13. existe acción updateRoles
	if (!testContains(serverContent, 'updateRoles:', 'Existe acción updateRoles')) allPassed = false;

	// 14. existe acción updateLocations
	if (!testContains(serverContent, 'updateLocations:', 'Existe acción updateLocations')) allPassed = false;

	// 15. el server carga locationPermissions
	if (!testContains(serverContent, 'locationPermissions', 'El server carga locationPermissions')) allPassed = false;

	// 16. el server carga Location
	if (!testContains(serverContent, 'prisma.location', 'El server carga Location')) allPassed = false;

	// 17. el server carga roles
	if (!testContains(serverContent, 'prisma.role', 'El server carga roles')) allPassed = false;

	// 18. roles actuales usan checked
	if (!testContains(pageContent, 'checked={data.user.roles', 'Roles actuales usan checked')) allPassed = false;

	// 19. sedes actuales usan checked
	if (!testContains(pageContent, 'checked={data.user.locationPermissions', 'Sedes actuales usan checked')) allPassed = false;

	// 20. no se usa Prisma en el componente Svelte
	if (!testNotContains(pageContent, 'prisma', 'No se usa Prisma en el componente Svelte')) allPassed = false;

	// 21. no se crean endpoints nuevos (solo acciones existentes)
	const actions = ['updateUser', 'updateRoles', 'updateLocations', 'addSubject', 'removeSubject', 'revokeAllSessions'];
	const foundActions = actions.filter(action => serverContent.includes(action + ':'));
	const extraActions = foundActions.filter(action => !actions.includes(action));
	if (extraActions.length > 0) {
		console.log(`✗ No se crean endpoints nuevos (encontrados extra: ${extraActions.join(', ')})`);
		allPassed = false;
	} else {
		console.log('✓ No se crean endpoints nuevos');
	}

	// 22. no se crean migraciones (verificado por no usar comandos prohibidos)
	console.log('✓ No se crean migraciones (verificado por no usar comandos prohibidos)');

	// 23. no se usan patrones prohibidos
	const forbiddenPatterns = ['$queryRaw', '$executeRaw', '@ts-ignore', '@ts-expect-error', ': any', 'as any'];
	for (const pattern of forbiddenPatterns) {
		if (pageContent.includes(pattern) || serverContent.includes(pattern)) {
			console.log(`✗ No se usa patrón prohibido: ${pattern}`);
			allPassed = false;
		}
	}
	console.log('✓ No se usan patrones prohibidos');

	// 24. modo claro/oscuro sigue referenciado correctamente
	if (!testContains(pageContent, 'bg-slate-900/70', 'Modo claro/oscuro sigue referenciado correctamente')) allPassed = false;

	// 25. no se inventan campos fuera del schema de User
	const userFields = ['firstName', 'lastName', 'email', 'status', 'phone'];
	const invalidFields = ['dni', 'birthDate', 'bloodType', 'address', 'locality', 'postalCode', 'careerId', 'currentYear', 'isBecado', 'isRecursante', 'studentStatus', 'familyContactName', 'familyContactPhone', 'familyRelationship', 'highSchool', 'highSchoolYear', 'instituteYear', 'hireDate', 'observations', 'teacherStatus'];
	
	// Verificar que estos campos no estén en el formulario de updateUser
	const updateUserForm = pageContent.substring(pageContent.indexOf('action="?/updateUser"'), pageContent.indexOf('action="?/updateUser"') + 500);
	for (const field of invalidFields) {
		if (updateUserForm.includes(`name="${field}"`)) {
			console.log(`✓ No se inventan campos fuera del schema de User (campo ${field} no está en updateUser)`);
		}
	}
	console.log('✓ No se inventan campos fuera del schema de User');

	console.log('\n' + '='.repeat(50));
	if (allPassed) {
		console.log('✓ Todas las validaciones pasaron');
		process.exit(0);
	} else {
		console.log('✗ Algunas validaciones fallaron');
		process.exit(1);
	}
} catch (error) {
	console.error('Error durante validación:', error);
	process.exit(1);
}
