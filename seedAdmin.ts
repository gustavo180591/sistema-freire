import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	const email = 'gustavo.faccendini@gmail.com';
	const password = '$Mariel1805';

	// Hasheamos la contraseña
	const passwordHash = await bcrypt.hash(password, 10);

	// 1. Asegurar que el rol SUPERADMIN exista en la base
	const superAdminRole = await prisma.role.upsert({
		where: { code: 'SUPERADMIN' },
		update: {},
		create: {
			code: 'SUPERADMIN',
			name: 'Administrador Global'
		}
	});

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
