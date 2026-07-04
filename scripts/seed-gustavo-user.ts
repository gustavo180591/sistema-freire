import { PrismaClient, RoleCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedGustavoUser() {
	const email = 'gustavo.faccendini@gmail.com';
	const password = '$Gustavo1805';
	const firstName = 'Gustavo';
	const lastName = 'Faccendini';

	console.log('🔑 Creating user for Gustavo...');

	// Hash password
	const passwordHash = await bcrypt.hash(password, 10);

	// Create or update user
	const user = await prisma.user.upsert({
		where: { email },
		update: {
			firstName,
			lastName,
			passwordHash
		},
		create: {
			email,
			firstName,
			lastName,
			passwordHash
		}
	});

	// Assign SUPERADMIN role
	const superadminRole = await prisma.role.findUnique({
		where: { code: RoleCode.SUPERADMIN }
	});

	if (!superadminRole) {
		console.error('❌ SUPERADMIN role not found');
		process.exit(1);
	}

	// Check if role is already assigned
	const existingUserRole = await prisma.userRole.findUnique({
		where: {
			userId_roleId: {
				userId: user.id,
				roleId: superadminRole.id
			}
		}
	});

	if (!existingUserRole) {
		await prisma.userRole.create({
			data: {
				userId: user.id,
				roleId: superadminRole.id
			}
		});
		console.log('✅ SUPERADMIN role assigned');
	} else {
		console.log('✅ SUPERADMIN role already assigned');
	}

	console.log(`✅ User created: ${email}`);
	console.log(`   ID: ${user.id}`);
}

seedGustavoUser()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
