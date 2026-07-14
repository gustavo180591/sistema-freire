import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	// Crear concepto de INSCRIPCION si no existe
	const inscriptionConcept = await prisma.chargeConcept.upsert({
		where: { code: 'INSCRIPCION' },
		update: {},
		create: {
			code: 'INSCRIPCION',
			name: 'Inscripción',
			description: 'Cargo por inscripción anual',
			active: true
		}
	});

	console.log('Concepto INSCRIPCION:', inscriptionConcept);

	// Crear concepto de CUOTA_MENSUAL si no existe
	const monthlyConcept = await prisma.chargeConcept.upsert({
		where: { code: 'CUOTA_MENSUAL' },
		update: {},
		create: {
			code: 'CUOTA_MENSUAL',
			name: 'Cuota Mensual',
			description: 'Cuota mensual de matrícula',
			active: true
		}
	});

	console.log('Concepto CUOTA_MENSUAL:', monthlyConcept);
}

main()
	.catch((e) => {
		console.error('Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
