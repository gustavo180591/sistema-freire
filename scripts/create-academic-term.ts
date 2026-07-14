import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const currentYear = new Date().getFullYear();

	// Buscar si ya existe un ciclo lectivo activo
	const existingActive = await prisma.academicTerm.findFirst({
		where: { active: true }
	});

	if (existingActive) {
		console.log('Ya existe un ciclo lectivo activo:', existingActive);
		return;
	}

	// Buscar una location para asociar (opcional)
	const location = await prisma.location.findFirst({
		where: { active: true }
	});

	// Crear ciclo lectivo activo para el año actual
	const academicTerm = await prisma.academicTerm.create({
		data: {
			name: `Ciclo Lectivo ${currentYear}`,
			code: `CL-${currentYear}`,
			year: currentYear,
			termType: 'ANUAL',
			startDate: new Date(currentYear, 2, 1), // 1 de marzo
			endDate: new Date(currentYear, 11, 31), // 31 de diciembre
			active: true,
			locationId: location?.id
		}
	});

	console.log('Ciclo lectivo activo creado:', academicTerm);
}

main()
	.catch((e) => {
		console.error('Error:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
