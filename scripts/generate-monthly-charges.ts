import 'dotenv/config';
import { prisma } from '../src/lib/server/db/prisma';
import { generateMonthlyChargesForActiveStudents } from '../src/lib/server/financial/monthly-charge-generation-service';

async function main() {
	const startedAt = new Date();

	console.log(`[monthly-charges] Inicio: ${startedAt.toISOString()}`);

	const result = await generateMonthlyChargesForActiveStudents(startedAt);

	console.log(
		JSON.stringify(
			{
				event: 'MONTHLY_CHARGE_GENERATION',
				startedAt: startedAt.toISOString(),
				finishedAt: new Date().toISOString(),
				...result
			},
			null,
			2
		)
	);

	if (result.errors.length > 0) {
		process.exitCode = 1;
	}
}

main()
	.catch((cause) => {
		console.error('[monthly-charges] Error fatal:', cause);

		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
