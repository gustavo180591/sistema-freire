import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const count = await prisma.subjectCommission.count();
	console.log('SubjectCommission count:', count);
	
	if (count > 0) {
		const sample = await prisma.subjectCommission.findFirst();
		console.log('Sample record:', sample);
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
