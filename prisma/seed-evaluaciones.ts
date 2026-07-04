import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de evaluaciones...\n');

	// Obtener comisiones
	const commissions = await prisma.subjectCommission.findMany({ take: 15 });
	if (commissions.length === 0) {
		throw new Error('No hay comisiones. Ejecuta primero: npx tsx prisma/seed-comisiones.ts');
	}

	// Obtener usuarios
	const users = await prisma.user.findMany({ take: 5 });
	if (users.length === 0) {
		throw new Error('No hay usuarios. Ejecuta primero: npx prisma db seed');
	}

	console.log(`🏫 Comisiones: ${commissions.length}`);
	console.log(`👤 Usuarios: ${users.length}`);

	// Crear evaluaciones
	console.log('\n📝 Creando evaluaciones...');
	let evaluationsCount = 0;

	for (const commission of commissions) {
		// Crear 2-3 evaluaciones por comisión
		const numEvaluations = 2 + Math.floor(Math.random() * 2);

		for (let i = 0; i < numEvaluations; i++) {
			const user = users[Math.floor(Math.random() * users.length)];
			const evaluationType = i === 0 ? 'PARCIAL' : i === 1 ? 'EXAMEN_FINAL' : 'RECUPERATORIO';
			const evaluationDate = new Date(2026, 2 + i, 15 + i * 15);

			await prisma.evaluation.create({
				data: {
					subjectId: commission.subjectId,
					commissionId: commission.id,
					title: `${evaluationType} - ${commission.code}`,
					type: evaluationType as any,
					evaluationDate: evaluationDate,
					maxScore: 10,
					createdByUserId: user.id,
					closedByUserId: user.id,
					closedAt: new Date(evaluationDate.getTime() + 86400000),
					isClosed: true,
					observations: 'Evaluación regular'
				}
			});

			evaluationsCount++;
		}

		console.log(`✅ Evaluaciones creadas para comisión: ${commission.code}`);
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Evaluaciones creadas: ${evaluationsCount}`);

	console.log('\n✅ Seed de evaluaciones completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
