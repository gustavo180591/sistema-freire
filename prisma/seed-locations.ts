import { PrismaClient, RoleCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('Seeding locations...');

	// Crear localidades iniciales
	const locations = [
		{
			name: 'Leandro N. Alem',
			code: 'ALEM',
			address: 'Dirección Sede Leandro N. Alem',
			city: 'Leandro N. Alem',
			province: 'Misiones',
			active: true
		},
		{
			name: 'Capiovi',
			code: 'CAPIOVI',
			address: 'Dirección Sede Capiovi',
			city: 'Capiovi',
			province: 'Misiones',
			active: true
		}
	];

	const createdLocations = [];
	for (const location of locations) {
		const created = await prisma.location.upsert({
			where: { code: location.code },
			update: {},
			create: location
		});
		createdLocations.push(created);
		console.log(`Location ${location.name} created/updated`);
	}

	// Dar acceso global al superadmin a todas las localidades
	console.log('Granting superadmin access to all locations...');
	const superAdminRole = await prisma.role.findFirst({
		where: { code: RoleCode.SUPERADMIN }
	});

	if (superAdminRole) {
		const superAdminUsers = await prisma.user.findMany({
			where: {
				roles: {
					some: {
						roleId: superAdminRole.id
					}
				}
			}
		});

		for (const user of superAdminUsers) {
			for (const location of createdLocations) {
				await prisma.userLocationPermission.upsert({
					where: {
						userId_locationId: {
							userId: user.id,
							locationId: location.id
						}
					},
					update: {},
					create: {
						userId: user.id,
						locationId: location.id
					}
				});
			}
			console.log(`Superadmin ${user.email} granted access to all locations`);
		}
	}

	// Crear un período académico inicial para 2026
	console.log('Seeding initial academic term...');
	const alemLocation = createdLocations.find(l => l.code === 'ALEM');
	if (alemLocation) {
		await prisma.academicTerm.upsert({
			where: { code: '2026-ANUAL' },
			update: {},
			create: {
				name: '2026 - Año Completo',
				code: '2026-ANUAL',
				year: 2026,
				termType: 'ANUAL',
				startDate: new Date('2026-03-01'),
				endDate: new Date('2026-12-31'),
				active: true,
				locationId: alemLocation.id
			}
		});
		console.log('Academic term 2026 created/updated');
	}

	console.log('Locations seeding completed!');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
