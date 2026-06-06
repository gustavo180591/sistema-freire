import { PrismaClient, RoleCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function main() {
	console.log('Seeding roles...');

	const roles = [
		{ code: RoleCode.SUPERADMIN, name: 'Super Administrador' },
		{ code: RoleCode.DIRECTOR, name: 'Director' },
		{ code: RoleCode.SECRETARIA, name: 'Secretaría' },
		{ code: RoleCode.DOCENTE, name: 'Docente' },
		{ code: RoleCode.PRECEPTOR, name: 'Preceptor' },
		{ code: RoleCode.ALUMNO, name: 'Alumno' },
		{ code: RoleCode.FINANZAS, name: 'Finanzas' },
		{ code: RoleCode.APODERADO, name: 'Apoderado' }
	];

	for (const role of roles) {
		await prisma.role.upsert({
			where: { code: role.code },
			update: {},
			create: role
		});
		console.log(`Role ${role.code} created/updated`);
	}

	// Crear usuario admin si no existe
	console.log('Seeding admin user...');
	const superAdminRole = await prisma.role.findFirst({ where: { code: RoleCode.SUPERADMIN } });
	if (superAdminRole) {
		const existingUser = await prisma.user.findUnique({
			where: { email: 'admin.test@example.com' }
		});
		if (!existingUser) {
			const passwordHash = await hashPassword('TestPassword123!');
			await prisma.user.create({
				data: {
					email: 'admin.test@example.com',
					passwordHash,
					firstName: 'Admin',
					lastName: 'Test',
					roles: { create: [{ role: { connect: { id: superAdminRole.id } } }] }
				}
			});
			console.log('Admin user created/updated');
		} else {
			console.log('Admin user already exists');
		}
	}

	console.log('Seeding completed!');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
