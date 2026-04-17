import { PrismaClient, type RoleCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROLES: { code: RoleCode; name: string }[] = [
	{ code: 'SUPERADMIN', name: 'Administrador Global' },
	{ code: 'DIRECTOR', name: 'Director' },
	{ code: 'SECRETARIA', name: 'Secretaría' },
	{ code: 'DOCENTE', name: 'Docente' },
	{ code: 'ALUMNO', name: 'Alumno' },
	{ code: 'FINANZAS', name: 'Finanzas' }
];

async function main() {
	// 1. Crear todos los roles necesarios
	console.log('🔄 Creando roles...');
	for (const role of ROLES) {
		await prisma.role.upsert({
			where: { code: role.code },
			update: {},
			create: role
		});
		console.log(`  ✅ Rol: ${role.code}`);
	}

	const email = 'gustavo.faccendini@gmail.com';
	const password = '$Mariel1805';

	// Hasheamos la contraseña
	const passwordHash = await bcrypt.hash(password, 10);

	// 2. Asegurar que el rol SUPERADMIN exista (ya creado arriba, lo obtenemos)
	const superAdminRole = await prisma.role.findUnique({
		where: { code: 'SUPERADMIN' }
	});

	if (!superAdminRole) {
		throw new Error('No se pudo obtener el rol SUPERADMIN');
	}

	// 2. Upsert del usuario para no romper si corres el script 2 veces
	const user = await prisma.user.upsert({
		where: { email },
		update: {
			passwordHash,
			firstName: 'Gustavo',
			lastName: 'Faccendini',
			status: 'ACTIVE'
		},
		create: {
			email,
			passwordHash,
			firstName: 'Gustavo',
			lastName: 'Faccendini',
			status: 'ACTIVE'
		}
	});

	// 3. Vincular el rol al usuario
	await prisma.userRole.upsert({
		where: {
			userId_roleId: {
				userId: user.id,
				roleId: superAdminRole.id
			}
		},
		update: {},
		create: {
			userId: user.id,
			roleId: superAdminRole.id
		}
	});

	console.log(`✅ ¡Usuario creado con éxito!`);
	console.log(`Nombre: ${user.firstName} ${user.lastName}`);
	console.log(`Email: ${user.email}`);
	console.log(`Rol: SUPERADMIN`);
}

main()
	.catch((e) => {
		console.error('❌ Error creando el usuario:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
