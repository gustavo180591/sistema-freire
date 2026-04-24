import { PrismaClient, RoleCode } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
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
	const superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPERADMIN' } });
	if (superAdminRole) {
		const existingUser = await prisma.user.findUnique({
			where: { email: 'gustavo.faccendini@gmail.com' }
		});
		if (!existingUser) {
			const passwordHash = hashPassword('$Gustavo1805');
			await prisma.user.create({
				data: {
					email: 'gustavo.faccendini@gmail.com',
					passwordHash,
					firstName: 'Gustavo',
					lastName: 'Faccendini',
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
