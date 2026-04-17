import { PrismaClient, RoleCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('Seeding roles...');

	const roles = [
		{ code: RoleCode.SUPERADMIN, name: 'Super Administrador', description: 'Acceso total al sistema' },
		{ code: RoleCode.DIRECTOR, name: 'Director', description: 'Dirección institucional' },
		{ code: RoleCode.SECRETARIA, name: 'Secretaría', description: 'Gestión administrativa' },
		{ code: RoleCode.DOCENTE, name: 'Docente', description: 'Personal docente' },
		{ code: RoleCode.ALUMNO, name: 'Alumno', description: 'Estudiante' },
		{ code: RoleCode.FINANZAS, name: 'Finanzas', description: 'Gestión financiera' },
		{ code: RoleCode.APODERADO, name: 'Apoderado', description: 'Padre o tutor' }
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
