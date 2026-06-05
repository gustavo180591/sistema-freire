import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanMigrationHistory() {
	console.log('🧹 Limpiando historial de migraciones problemáticas...\n');

	try {
		// Eliminar migraciones problemáticas del historial
		const result = await prisma.$executeRaw`
			DELETE FROM "_prisma_migrations" 
			WHERE "migration_name" IN (
				'20260604004154_add_annual_grade_thresholds',
				'20260604004155_update_location_names_to_alem_capiovi',
				'20260603193908_add_locations_and_academic_terms'
			)
		`;

		console.log(`✅ ${result} migraciones eliminadas del historial`);
		
		// Verificar migraciones restantes
		const remaining = await prisma.$queryRaw`
			SELECT "migration_name", "started_at" 
			FROM "_prisma_migrations" 
			ORDER BY "started_at"
		`;

		console.log(`\n📊 Migraciones restantes en historial: ${(remaining as any[]).length}`);
		for (const m of remaining as any[]) {
			console.log(`   - ${m.migration_name}`);
		}

	} catch (error) {
		console.error('❌ Error:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

cleanMigrationHistory().catch(console.error);
