import { PrismaClient, RoleCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de docentes...\n');

	const defaultPassword = await bcrypt.hash('password123', 10);

	// Obtener rol de docente
	const docenteRole = await prisma.role.findUnique({
		where: { code: RoleCode.DOCENTE }
	});

	if (!docenteRole) {
		throw new Error('Rol DOCENTE no encontrado. Ejecuta primero: npx prisma db seed');
	}

	// Obtener ubicaciones
	const locations = await prisma.location.findMany();
	if (locations.length === 0) {
		throw new Error('No hay ubicaciones. Ejecuta primero: npx tsx prisma/seed-locations.ts');
	}

	// Obtener materias
	const subjects = await prisma.subject.findMany({ take: 20 });
	if (subjects.length === 0) {
		throw new Error('No hay materias. Ejecuta primero: npx tsx prisma/seed-materias.ts');
	}

	// Datos de docentes
	const docentes = [
		{
			email: 'maria.garcia@instituto.edu',
			firstName: 'María',
			lastName: 'García',
			dni: '20123456',
			phone: '+5493744123456',
			observations: 'Especialista en Lengua y Literatura'
		},
		{
			email: 'juan.perez@instituto.edu',
			firstName: 'Juan',
			lastName: 'Pérez',
			dni: '20123457',
			phone: '+5493744123457',
			observations: 'Especialista en Matemáticas'
		},
		{
			email: 'ana.rodriguez@instituto.edu',
			firstName: 'Ana',
			lastName: 'Rodríguez',
			dni: '20123458',
			phone: '+5493744123458',
			observations: 'Especialista en Historia'
		},
		{
			email: 'carlos.lopez@instituto.edu',
			firstName: 'Carlos',
			lastName: 'López',
			dni: '20123459',
			phone: '+5493744123459',
			observations: 'Especialista en Ciencias Naturales'
		},
		{
			email: 'laura.martinez@instituto.edu',
			firstName: 'Laura',
			lastName: 'Martínez',
			dni: '20123460',
			phone: '+5493744123460',
			observations: 'Especialista en Inglés'
		},
		{
			email: 'roberto.sanchez@instituto.edu',
			firstName: 'Roberto',
			lastName: 'Sánchez',
			dni: '20123461',
			phone: '+5493744123461',
			observations: 'Especialista en Educación Física'
		},
		{
			email: 'carmen.fernandez@instituto.edu',
			firstName: 'Carmen',
			lastName: 'Fernández',
			dni: '20123462',
			phone: '+5493744123462',
			observations: 'Especialista en Artes'
		},
		{
			email: 'miguel.gonzalez@instituto.edu',
			firstName: 'Miguel',
			lastName: 'González',
			dni: '20123463',
			phone: '+5493744123463',
			observations: 'Especialista en Filosofía'
		},
		{
			email: 'elena.diaz@instituto.edu',
			firstName: 'Elena',
			lastName: 'Díaz',
			dni: '20123464',
			phone: '+5493744123464',
			observations: 'Especialista en Geografía'
		},
		{
			email: 'jose.ruiz@instituto.edu',
			firstName: 'José',
			lastName: 'Ruiz',
			dni: '20123465',
			phone: '+5493744123465',
			observations: 'Especialista en Informática'
		}
	];

	console.log(`📚 Creando ${docentes.length} docentes...`);

	for (const docente of docentes) {
		// Crear usuario
		const user = await prisma.user.upsert({
			where: { email: docente.email },
			update: {},
			create: {
				email: docente.email,
				firstName: docente.firstName,
				lastName: docente.lastName,
				passwordHash: defaultPassword,
				phone: docente.phone
			}
		});

		// Asignar rol de docente
		const existingRole = await prisma.userRole.findUnique({
			where: {
				userId_roleId: {
					userId: user.id,
					roleId: docenteRole.id
				}
			}
		});

		if (!existingRole) {
			await prisma.userRole.create({
				data: {
					userId: user.id,
					roleId: docenteRole.id
				}
			});
		}

		// Crear perfil de docente
		const teacher = await prisma.teacher.upsert({
			where: { userId: user.id },
			update: {},
			create: {
				userId: user.id,
				dni: docente.dni,
				firstName: docente.firstName,
				lastName: docente.lastName,
				observations: docente.observations,
				hireDate: new Date('2020-03-01')
			}
		});

		// Asignar materias (2-3 materias por docente)
		const subjectIndex = docentes.indexOf(docente);
		const assignedSubjects = subjects.slice(subjectIndex * 2, (subjectIndex + 1) * 2 + 1);

		for (const subject of assignedSubjects) {
			const existingAssignment = await prisma.subjectTeacher.findUnique({
				where: {
					subjectId_teacherId: {
						subjectId: subject.id,
						teacherId: teacher.id
					}
				}
			});

			if (!existingAssignment) {
				await prisma.subjectTeacher.create({
					data: {
						subjectId: subject.id,
						teacherId: teacher.id
					}
				});
			}
		}

		// Asignar permisos de ubicación (todas las ubicaciones)
		for (const location of locations) {
			const existingPermission = await prisma.userLocationPermission.findUnique({
				where: {
					userId_locationId: {
						userId: user.id,
						locationId: location.id
					}
				}
			});

			if (!existingPermission) {
				await prisma.userLocationPermission.create({
					data: {
						userId: user.id,
						locationId: location.id
					}
				});
			}
		}

		console.log(
			`✅ Docente creado: ${docente.firstName} ${docente.lastName} (${docente.observations})`
		);
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Docentes creados: ${docentes.length}`);
	console.log(`   • Materias asignadas: ${docentes.length * 3}`);
	console.log(`   • Ubicaciones asignadas: ${docentes.length * locations.length}`);

	console.log('\n✅ Seed de docentes completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
