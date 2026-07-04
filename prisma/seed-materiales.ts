import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de materiales de clase...\n');

	// Obtener comisiones
	const commissions = await prisma.subjectCommission.findMany({ take: 10 });
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

	// Crear materiales de clase
	console.log('\n📚 Creando materiales de clase...');
	let materialsCount = 0;

	const tiposMateriales = ['PDF', 'VIDEO', 'LINK', 'DOCUMENTO', 'PRESENTACION'];

	for (const commission of commissions) {
		// Crear 2-3 materiales por comisión
		const numMaterials = 2 + Math.floor(Math.random() * 2);

		for (let i = 0; i < numMaterials; i++) {
			const user = users[Math.floor(Math.random() * users.length)];

			await prisma.classMaterial.create({
				data: {
					subjectId: commission.subjectId,
					title: `Material ${i + 1} - ${commission.code}`,
					description: `Material de estudio para ${commission.code}`,
					fileUrl: 'https://example.com/material.pdf',
					fileSize: 1024000,
					mimeType: 'application/pdf',
					uploadedBy: user.id
				}
			});

			materialsCount++;
		}

		console.log(`✅ Materiales creados para comisión: ${commission.code}`);
	}

	console.log('\n📊 RESUMEN:');
	console.log(`   • Materiales creados: ${materialsCount}`);

	console.log('\n✅ Seed de materiales completado exitosamente!');
}

main()
	.catch((e) => {
		console.error('❌ Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
