import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	const email = 'juan.perez@freire.com';
	const newPassword = '12345678';

	const passwordHash = await bcrypt.hash(newPassword, 10);

	const user = await prisma.user.update({
		where: { email },
		data: { passwordHash }
	});

	console.log(`✅ Contraseña reseteada para: ${user.email}`);
	console.log(`🔑 Nueva contraseña temporal: ${newPassword}`);
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
