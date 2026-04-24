import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetLoginAttempts() {
	const email = 'gustavo.faccendini@gmail.com';

	console.log(`🔓 Resetting login attempts for ${email}...`);

	const user = await prisma.user.update({
		where: { email },
		data: {
			failedLoginAttempts: 0,
			lockedUntil: null,
			lastFailedAttempt: null
		}
	});

	console.log(`✅ Login attempts reset for: ${user.email}`);
	console.log(`   Failed attempts: ${user.failedLoginAttempts}`);
	console.log(`   Status: ${user.status}`);
}

resetLoginAttempts()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
