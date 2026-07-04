import { PrismaClient, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de logs de auditoría...\n');

	// Obtener usuarios
	const users = await prisma.user.findMany({ take: 10 });
	if (users.length === 0) {
		throw new Error('No hay usuarios. Ejecuta primero npx prisma db seed');
	}

	// Obtener alumnos
	const students = await prisma.student.findMany({ take: 5 });
	if (students.length === 0) {
		throw new Error('No hay alumnos. Ejecuta primero seed-alumnos-tipos.ts');
	}

	console.log(`👤 Usuarios: ${users.length}`);
	console.log(`👨‍🎓 Alumnos: ${students.length}`);

	// Crear logs de auditoría
	console.log('\n📝 Creando logs de auditoría...');
	let auditLogsCount = 0;

	const acciones = [
		AuditAction.CREATE,
		AuditAction.UPDATE,
		AuditAction.DELETE,
		AuditAction.LOGIN,
		AuditAction.LOGOUT
	];

	const entidades = ['User', 'Student', 'Teacher', 'Subject', 'Commission', 'Payment'];

	for (const user of users) {
		// Crear 5-10 logs de auditoría por usuario
		const numLogs = 5 + Math.floor(Math.random() * 6);

		for (let i = 0; i < numLogs; i++) {
			const accion = acciones[Math.floor(Math.random() * acciones.length)];
			const entidad = entidades[Math.floor(Math.random() * entidades.length)];
			const student = students[Math.floor(Math.random() * students.length)];

			await prisma.auditLog.create({
				data: {
					userId: user.id,
					action: accion,
					entityType: entidad,
					entityId: `DEMO-${entidad}-${i}`,
					description: `${accion} operation on ${entidad}`,
					metadata: {
						changes: {
							field1: 'value1',
							field2: 'value2'
						}
					},
					ip: '192.168.1.' + Math.floor(Math.random() * 255),
					userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
				}
			});

			auditLogsCount++;
		}

		console.log(`✅ Logs de auditoría creados para usuario: ${user.firstName} ${user.lastName}`);
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Logs de auditoría creados: ${auditLogsCount}`);

	console.log('\n✅ Seed de logs de auditoría completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
