import { PrismaClient, RoleCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de personal administrativo...\n');

	// Obtener ubicaciones
	const locations = await prisma.location.findMany();
	if (locations.length < 2) {
		throw new Error('Se requieren al menos 2 ubicaciones. Ejecuta primero: npx tsx prisma/seed-locations.ts');
	}

	console.log(`📍 Ubicaciones encontradas: ${locations.length}`);

	// Obtener roles
	const preceptorRole = await prisma.role.findUnique({
		where: { code: RoleCode.PRECEPTOR }
	});
	const secretariaRole = await prisma.role.findUnique({
		where: { code: RoleCode.SECRETARIA }
	});
	const directorRole = await prisma.role.findUnique({
		where: { code: RoleCode.DIRECTOR }
	});

	if (!preceptorRole || !secretariaRole || !directorRole) {
		throw new Error('No se encontraron los roles requeridos. Ejecuta primero: npx prisma db seed');
	}

	// Crear Preceptores
	console.log('\n👨‍🏫 Creando Preceptores...');
	const preceptores = [
		{
			email: 'preceptor1@example.com',
			firstName: 'Carlos',
			lastName: 'Mendoza',
			password: 'Preceptor123'
		},
		{
			email: 'preceptor2@example.com',
			firstName: 'Laura',
			lastName: 'Fernández',
			password: 'Preceptor123'
		}
	];

	for (const preceptor of preceptores) {
		const passwordHash = await bcrypt.hash(preceptor.password, 10);

		const user = await prisma.user.upsert({
			where: { email: preceptor.email },
			update: {
				firstName: preceptor.firstName,
				lastName: preceptor.lastName,
				passwordHash
			},
			create: {
				email: preceptor.email,
				firstName: preceptor.firstName,
				lastName: preceptor.lastName,
				passwordHash
			}
		});

		// Asignar rol PRECEPTOR
		const existingRole = await prisma.userRole.findFirst({
			where: {
				userId: user.id,
				roleId: preceptorRole.id
			}
		});

		if (!existingRole) {
			await prisma.userRole.create({
				data: {
					userId: user.id,
					roleId: preceptorRole.id
				}
			});
		}

		// Dar acceso a todas las ubicaciones
		for (const location of locations) {
			const existingAccess = await prisma.userLocationPermission.findFirst({
				where: {
					userId: user.id,
					locationId: location.id
				}
			});

			if (!existingAccess) {
				await prisma.userLocationPermission.create({
					data: {
						userId: user.id,
						locationId: location.id
					}
				});
			}
		}

		console.log(`✅ Preceptor creado: ${preceptor.firstName} ${preceptor.lastName} (${preceptor.email})`);
	}

	// Crear Secretarios (uno por localidad)
	console.log('\n📝 Creando Secretarios...');
	const secretarios = [
		{
			email: 'secretaria.alem@example.com',
			firstName: 'María',
			lastName: 'Gómez',
			password: 'Secretaria123',
			locationId: locations[0].id
		},
		{
			email: 'secretaria.capiovi@example.com',
			firstName: 'Ana',
			lastName: 'Rodríguez',
			password: 'Secretaria123',
			locationId: locations[1].id
		}
	];

	for (const secretario of secretarios) {
		const passwordHash = await bcrypt.hash(secretario.password, 10);

		const user = await prisma.user.upsert({
			where: { email: secretario.email },
			update: {
				firstName: secretario.firstName,
				lastName: secretario.lastName,
				passwordHash
			},
			create: {
				email: secretario.email,
				firstName: secretario.firstName,
				lastName: secretario.lastName,
				passwordHash
			}
		});

		// Asignar rol SECRETARIA
		const existingRole = await prisma.userRole.findFirst({
			where: {
				userId: user.id,
				roleId: secretariaRole.id
			}
		});

		if (!existingRole) {
			await prisma.userRole.create({
				data: {
					userId: user.id,
					roleId: secretariaRole.id
				}
			});
		}

		// Dar acceso solo a su localidad
		const existingAccess = await prisma.userLocationPermission.findFirst({
			where: {
				userId: user.id,
				locationId: secretario.locationId
			}
		});

		if (!existingAccess) {
			await prisma.userLocationPermission.create({
				data: {
					userId: user.id,
					locationId: secretario.locationId
				}
			});
		}

		const locationName = locations.find(l => l.id === secretario.locationId)?.name || 'Desconocida';
		console.log(`✅ Secretaria creada: ${secretario.firstName} ${secretario.lastName} (${secretario.email}) - ${locationName}`);
	}

	// Crear Director
	console.log('\n🎓 Creando Director...');
	const director = {
		email: 'director@example.com',
		firstName: 'Roberto',
		lastName: 'Sánchez',
		password: 'Director123'
	};

	const passwordHash = await bcrypt.hash(director.password, 10);

	const directorUser = await prisma.user.upsert({
		where: { email: director.email },
		update: {
			firstName: director.firstName,
			lastName: director.lastName,
			passwordHash
		},
		create: {
			email: director.email,
			firstName: director.firstName,
			lastName: director.lastName,
			passwordHash
		}
	});

	// Asignar rol DIRECTOR
	const existingDirectorRole = await prisma.userRole.findFirst({
		where: {
			userId: directorUser.id,
			roleId: directorRole.id
		}
	});

	if (!existingDirectorRole) {
		await prisma.userRole.create({
			data: {
				userId: directorUser.id,
				roleId: directorRole.id
			}
		});
	}

	// Dar acceso a todas las ubicaciones
	for (const location of locations) {
		const existingAccess = await prisma.userLocationPermission.findFirst({
			where: {
				userId: directorUser.id,
				locationId: location.id
			}
		});

		if (!existingAccess) {
			await prisma.userLocationPermission.create({
				data: {
					userId: directorUser.id,
					locationId: location.id
				}
			});
		}
	}

	console.log(`✅ Director creado: ${director.firstName} ${director.lastName} (${director.email})`);

	console.log('\n📊 RESUMEN:');
	console.log(`   • Preceptores: 2 (acceso a todas las ubicaciones)`);
	console.log(`   • Secretarios: 2 (uno por ubicación)`);
	console.log(`   • Director: 1 (acceso a todas las ubicaciones)`);

	console.log('\n🔑 Credenciales:');
	console.log('   Preceptores: preceptor1@example.com / Preceptor123');
	console.log('               preceptor2@example.com / Preceptor123');
	console.log('   Secretarios: secretaria.alem@example.com / Secretaria123');
	console.log('               secretaria.capiovi@example.com / Secretaria123');
	console.log('   Director: director@example.com / Director123');

	console.log('\n✅ Seed de personal administrativo completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
