import { PrismaClient, RoleCode } from '@prisma/client';

const prisma = new PrismaClient();

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
