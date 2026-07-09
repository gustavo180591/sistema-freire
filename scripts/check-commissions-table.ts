import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	// Verificar si la tabla commissions existe
	try {
		const result = await prisma.$queryRaw`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'commissions'
			);
		`;
		console.log('Table commissions exists:', result);
	} catch (e) {
		console.log('Error checking commissions table:', e);
	}

	// Verificar si hay datos en commissions
	try {
		const count = await prisma.$queryRaw`
			SELECT COUNT(*) as count FROM "commissions";
		`;
		console.log('Commissions count:', count);
	} catch (e) {
		console.log('Error counting commissions (table may not exist):', e);
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
