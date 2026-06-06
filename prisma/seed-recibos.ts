#!/usr/bin/env tsx
import { PrismaClient, RoleCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, 10);
}

async function main() {
	console.log('🔄 Seed para módulo de recibos de sueldo...\n');

	// 1. Crear roles si no existen
	console.log('📋 Verificando roles...');
	const roles = [
		{ code: RoleCode.SUPERADMIN, name: 'Super Administrador' },
		{ code: RoleCode.DIRECTOR, name: 'Director' },
		{ code: RoleCode.SECRETARIA, name: 'Secretaría' },
		{ code: RoleCode.DOCENTE, name: 'Docente' },
		{ code: RoleCode.PRECEPTOR, name: 'Preceptor' },
		{ code: RoleCode.ALUMNO, name: 'Alumno' },
		{ code: RoleCode.FINANZAS, name: 'Finanzas' },
		{ code: RoleCode.APODERADO, name: 'Apoderado' },
		{ code: RoleCode.LIQUIDADOR, name: 'Liquidador' }
	];

	for (const role of roles) {
		await prisma.role.upsert({
			where: { code: role.code },
			update: {},
			create: role
		});
		console.log(`  ✅ Rol ${role.code} creado/verificado`);
	}

	// 2. Crear usuarios de prueba
	console.log('\n👤 Creando usuarios de prueba...');

	// Usuario SUPERADMIN
	const superadminRole = await prisma.role.findUnique({ where: { code: RoleCode.SUPERADMIN } });
	if (superadminRole) {
		const superadminUser = await prisma.user.upsert({
			where: { email: 'superadmin.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Super',
				lastName: 'Admin',
				status: 'ACTIVE'
			},
			create: {
				email: 'superadmin.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Super',
				lastName: 'Admin',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: superadminUser.id,
					roleId: superadminRole.id
				}
			},
			update: {},
			create: {
				userId: superadminUser.id,
				roleId: superadminRole.id
			}
		});
		console.log(`  ✅ Usuario SUPERADMIN creado: superadmin.test@example.com / TestPassword123!`);
	}

	// Usuario DIRECTOR
	const directorRole = await prisma.role.findUnique({ where: { code: RoleCode.DIRECTOR } });
	if (directorRole) {
		const directorUser = await prisma.user.upsert({
			where: { email: 'director.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Carlos',
				lastName: 'Director',
				status: 'ACTIVE'
			},
			create: {
				email: 'director.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Carlos',
				lastName: 'Director',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: directorUser.id,
					roleId: directorRole.id
				}
			},
			update: {},
			create: {
				userId: directorUser.id,
				roleId: directorRole.id
			}
		});
		console.log(`  ✅ Usuario DIRECTOR creado: director.test@example.com / TestPassword123!`);
	}

	// Usuario FINANZAS
	const finanzasRole = await prisma.role.findUnique({ where: { code: RoleCode.FINANZAS } });
	if (finanzasRole) {
		const finanzasUser = await prisma.user.upsert({
			where: { email: 'finanzas.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'María',
				lastName: 'Finanzas',
				status: 'ACTIVE'
			},
			create: {
				email: 'finanzas.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'María',
				lastName: 'Finanzas',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: finanzasUser.id,
					roleId: finanzasRole.id
				}
			},
			update: {},
			create: {
				userId: finanzasUser.id,
				roleId: finanzasRole.id
			}
		});
		console.log(`  ✅ Usuario FINANZAS creado: finanzas.test@example.com / TestPassword123!`);
	}

	// Usuario LIQUIDADOR
	const liquidadorRole = await prisma.role.findUnique({ where: { code: RoleCode.LIQUIDADOR } });
	if (liquidadorRole) {
		const liquidadorUser = await prisma.user.upsert({
			where: { email: 'liquidador.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Roberto',
				lastName: 'Liquidador',
				status: 'ACTIVE'
			},
			create: {
				email: 'liquidador.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Roberto',
				lastName: 'Liquidador',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: liquidadorUser.id,
					roleId: liquidadorRole.id
				}
			},
			update: {},
			create: {
				userId: liquidadorUser.id,
				roleId: liquidadorRole.id
			}
		});
		console.log(`  ✅ Usuario LIQUIDADOR creado: liquidador.test@example.com / TestPassword123!`);
	}

	// Usuario SECRETARIA
	const secretariaRole = await prisma.role.findUnique({ where: { code: RoleCode.SECRETARIA } });
	if (secretariaRole) {
		const secretariaUser = await prisma.user.upsert({
			where: { email: 'secretaria.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Ana',
				lastName: 'Secretaria',
				status: 'ACTIVE'
			},
			create: {
				email: 'secretaria.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Ana',
				lastName: 'Secretaria',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: secretariaUser.id,
					roleId: secretariaRole.id
				}
			},
			update: {},
			create: {
				userId: secretariaUser.id,
				roleId: secretariaRole.id
			}
		});
		console.log(`  ✅ Usuario SECRETARIA creado: secretaria.test@example.com / TestPassword123!`);
	}

	// Usuario PRECEPTOR
	const preceptorRole = await prisma.role.findUnique({ where: { code: RoleCode.PRECEPTOR } });
	if (preceptorRole) {
		const preceptorUser = await prisma.user.upsert({
			where: { email: 'preceptor.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Pedro',
				lastName: 'Preceptor',
				status: 'ACTIVE'
			},
			create: {
				email: 'preceptor.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Pedro',
				lastName: 'Preceptor',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: preceptorUser.id,
					roleId: preceptorRole.id
				}
			},
			update: {},
			create: {
				userId: preceptorUser.id,
				roleId: preceptorRole.id
			}
		});
		console.log(`  ✅ Usuario PRECEPTOR creado: preceptor.test@example.com / TestPassword123!`);
	}

	// Usuario ALUMNO
	const alumnoRole = await prisma.role.findUnique({ where: { code: RoleCode.ALUMNO } });
	if (alumnoRole) {
		const alumnoUser = await prisma.user.upsert({
			where: { email: 'alumno.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Luis',
				lastName: 'Alumno',
				status: 'ACTIVE'
			},
			create: {
				email: 'alumno.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Luis',
				lastName: 'Alumno',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: alumnoUser.id,
					roleId: alumnoRole.id
				}
			},
			update: {},
			create: {
				userId: alumnoUser.id,
				roleId: alumnoRole.id
			}
		});
		console.log(`  ✅ Usuario ALUMNO creado: alumno.test@example.com / TestPassword123!`);
	}

	// Usuario APODERADO
	const apoderadoRole = await prisma.role.findUnique({ where: { code: RoleCode.APODERADO } });
	if (apoderadoRole) {
		const apoderadoUser = await prisma.user.upsert({
			where: { email: 'apoderado.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Jorge',
				lastName: 'Apoderado',
				status: 'ACTIVE'
			},
			create: {
				email: 'apoderado.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Jorge',
				lastName: 'Apoderado',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: apoderadoUser.id,
					roleId: apoderadoRole.id
				}
			},
			update: {},
			create: {
				userId: apoderadoUser.id,
				roleId: apoderadoRole.id
			}
		});
		console.log(`  ✅ Usuario APODERADO creado: apoderado.test@example.com / TestPassword123!`);
	}

	// Usuario DOCENTE
	const docenteRole = await prisma.role.findUnique({ where: { code: RoleCode.DOCENTE } });
	if (docenteRole) {
		const docenteUser = await prisma.user.upsert({
			where: { email: 'docente.test@example.com' },
			update: {
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Juan',
				lastName: 'Docente',
				status: 'ACTIVE'
			},
			create: {
				email: 'docente.test@example.com',
				passwordHash: await hashPassword('TestPassword123!'),
				firstName: 'Juan',
				lastName: 'Docente',
				status: 'ACTIVE'
			}
		});

		await prisma.userRole.upsert({
			where: {
				userId_roleId: {
					userId: docenteUser.id,
					roleId: docenteRole.id
				}
			},
			update: {},
			create: {
				userId: docenteUser.id,
				roleId: docenteRole.id
			}
		});

		// Crear Teacher asociado al usuario docente
		const teacher = await prisma.teacher.upsert({
			where: { userId: docenteUser.id },
			update: { 
				status: 'ACTIVE',
				dni: '12345678',
				firstName: 'Juan',
				lastName: 'Docente'
			},
			create: {
				userId: docenteUser.id,
				dni: '12345678',
				firstName: 'Juan',
				lastName: 'Docente',
				status: 'ACTIVE'
			}
		});
		console.log(`  ✅ Usuario DOCENTE creado: docente.test@example.com / TestPassword123!`);
		console.log(`  ✅ Teacher asociado creado con ID: ${teacher.id}`);
	}

	// 3. Crear directorio de almacenamiento privado
	console.log('\n📁 Verificando directorio de almacenamiento...');
	const fs = await import('fs');
	const path = await import('path');

	const storageDir = path.join(process.cwd(), 'storage', 'private', 'payslips');
	if (!fs.existsSync(storageDir)) {
		fs.mkdirSync(storageDir, { recursive: true });
		console.log(`  ✅ Directorio creado: ${storageDir}`);
	} else {
		console.log(`  ✅ Directorio ya existe: ${storageDir}`);
	}

	console.log('\n✅ Seed de recibos completado!');
	console.log('\n📝 Usuarios de prueba creados:');
	console.log('   • SUPERADMIN: superadmin.test@example.com / TestPassword123!');
	console.log('   • DIRECTOR: director.test@example.com / TestPassword123!');
	console.log('   • SECRETARIA: secretaria.test@example.com / TestPassword123!');
	console.log('   • FINANZAS: finanzas.test@example.com / TestPassword123!');
	console.log('   • LIQUIDADOR: liquidador.test@example.com / TestPassword123!');
	console.log('   • PRECEPTOR: preceptor.test@example.com / TestPassword123!');
	console.log('   • ALUMNO: alumno.test@example.com / TestPassword123!');
	console.log('   • APODERADO: apoderado.test@example.com / TestPassword123!');
	console.log('   • DOCENTE: docente.test@example.com / TestPassword123!');
	console.log('\n📁 Directorio de almacenamiento: storage/private/payslips/');
}

main()
	.catch((e) => {
		console.error('❌ Error en seed:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
