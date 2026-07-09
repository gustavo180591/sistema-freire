import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: 'postgresql://postgres:postgres@localhost:5442/sistema-freire-test-3'
		}
	}
});

async function main() {
	console.log('=== Verificando regla ON DELETE de commissionId FK ===\n');

	const result = await prisma.$queryRaw`
		SELECT
			tc.constraint_name,
			kcu.column_name,
			ccu.table_name AS foreign_table_name,
			ccu.column_name AS foreign_column_name,
			rc.delete_rule
		FROM information_schema.table_constraints AS tc
		JOIN information_schema.key_column_usage AS kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage AS ccu
			ON ccu.constraint_name = tc.constraint_name
			AND ccu.table_schema = tc.table_schema
		JOIN information_schema.referential_constraints AS rc
			ON tc.constraint_name = rc.constraint_name
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_name = 'evaluations'
			AND kcu.column_name = 'commissionId';
	`;

	console.log('Foreign key de commissionId:');
	for (const fk of result as any[]) {
		console.log(`  Constraint: ${fk.constraint_name}`);
		console.log(`  Column: ${fk.column_name}`);
		console.log(`  References: ${fk.foreign_table_name}.${fk.foreign_column_name}`);
		console.log(`  ON DELETE: ${fk.delete_rule}`);
	}

	await prisma.$disconnect();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
