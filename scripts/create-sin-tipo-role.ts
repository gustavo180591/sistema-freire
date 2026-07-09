import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const role = await prisma.role.upsert({
		where: { code: 'SIN_TIPO' },
		update: {},
		create: {
			code: 'SIN_TIPO',
			name: 'Sin Tipo'
		}
	});

	console.log('Rol SIN_TIPO creado:', role);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
