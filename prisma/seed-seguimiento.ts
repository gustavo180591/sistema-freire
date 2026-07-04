import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de seguimientos...\n');

	// Obtener alumnos
	const students = await prisma.student.findMany({ take: 10 });
	if (students.length === 0) {
		throw new Error('No hay alumnos. Ejecuta primero seed-alumnos-tipos.ts');
	}

	// Obtener usuarios
	const users = await prisma.user.findMany({ take: 5 });
	if (users.length === 0) {
		throw new Error('No hay usuarios. Ejecuta primero npx prisma db seed');
	}

	console.log(`👨‍🎓 Alumnos: ${students.length}`);
	console.log(`👤 Usuarios: ${users.length}`);

	// Crear seguimientos de alumnos
	console.log('\n📋 Creando seguimientos de alumnos...');
	let followUpsCount = 0;

	const tiposSeguimiento = ['INTERVIEW', 'OBSERVATION', 'WARNING', 'MEETING', 'NOTE'];

	for (const student of students) {
		const createdBy = users[Math.floor(Math.random() * users.length)];
		const resolvedBy = users[Math.floor(Math.random() * users.length)];

		// Crear 1-2 seguimientos por alumno
		const numFollowUps = 1 + Math.floor(Math.random() * 2);

		for (let i = 0; i < numFollowUps; i++) {
			const tipo = tiposSeguimiento[i % tiposSeguimiento.length];
			const isResolved = Math.random() > 0.4;
			const isAlert = Math.random() > 0.7;

			await prisma.studentFollowUp.create({
				data: {
					studentId: student.id,
					type: tipo as any,
					title: `Seguimiento de ${tipo.toLowerCase()}`,
					description: `Seguimiento de ${tipo.toLowerCase()} para ${student.firstName} ${student.lastName}`,
					isAlert: isAlert,
					isResolved: isResolved,
					createdBy: createdBy.id,
					resolvedBy: isResolved ? resolvedBy.id : null,
					resolvedAt: isResolved ? new Date() : null
				}
			});

			followUpsCount++;
		}

		console.log(`✅ Seguimientos creados para alumno: ${student.firstName} ${student.lastName}`);
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Seguimientos creados: ${followUpsCount}`);

	console.log('\n✅ Seed de seguimientos completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
