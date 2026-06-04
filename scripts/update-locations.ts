import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('Updating location names...');

	// Update POSADAS to Leandro N. Alem
	const posadas = await prisma.location.findUnique({
		where: { code: 'POSADAS' }
	});

	if (posadas) {
		await prisma.location.update({
			where: { id: posadas.id },
			data: {
				name: 'Leandro N. Alem',
				code: 'ALEM',
				city: 'Leandro N. Alem'
			}
		});
		console.log('Updated POSADAS to Leandro N. Alem');
	}

	// Update OBERA to Capiovi
	const obera = await prisma.location.findUnique({
		where: { code: 'OBERA' }
	});

	if (obera) {
		await prisma.location.update({
			where: { id: obera.id },
			data: {
				name: 'Capiovi',
				code: 'CAPIOVI',
				city: 'Capiovi'
			}
		});
		console.log('Updated OBERA to Capiovi');
	}

	// Update careers that reference the old default-location-id
	const alemLocation = await prisma.location.findUnique({
		where: { code: 'ALEM' }
	});

	if (alemLocation) {
		await prisma.career.updateMany({
			where: { locationId: 'default-location-id' },
			data: { locationId: alemLocation.id }
		});
		console.log('Updated careers to reference new ALEM location');
	}

	console.log('Location names updated successfully!');
}

main()
	.catch((e) => {
		console.error('Error updating locations:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
