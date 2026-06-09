import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('Verificando conteo de registros en tablas grades y evaluations...');
	
	const gradesCount = await prisma.grade.count();
	const evaluationsCount = await prisma.evaluation.count();
	
	console.log(`\nGrades: ${gradesCount} registros`);
	console.log(`Evaluations: ${evaluationsCount} registros`);
	
	if (gradesCount > 0) {
		const sampleGrades = await prisma.grade.findMany({ take: 3 });
		console.log('\nMuestra de grades:');
		console.log(JSON.stringify(sampleGrades, null, 2));
	}
	
	if (evaluationsCount > 0) {
		const sampleEvaluations = await prisma.evaluation.findMany({ take: 3 });
		console.log('\nMuestra de evaluations:');
		console.log(JSON.stringify(sampleEvaluations, null, 2));
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
