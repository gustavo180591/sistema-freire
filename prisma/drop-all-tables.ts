import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dropAllTables() {
	console.log('💥 Eliminando todas las tablas y tipos de la base de datos...\n');

	try {
		// Primero eliminar todas las tablas
		const tables = await prisma.$queryRaw`
			SELECT tablename 
			FROM pg_tables 
			WHERE schemaname = 'public' 
			AND tablename NOT LIKE '_prisma_%'
		`;

		console.log(`📊 Tablas a eliminar: ${(tables as any[]).length}\n`);

		for (const table of tables as any[]) {
			const tableName = table.tablename;
			await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
			console.log(`   ✅ Eliminada: ${tableName}`);
		}

		// Eliminar la tabla de migraciones
		await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "_prisma_migrations" CASCADE`);
		console.log(`   ✅ Eliminada: _prisma_migrations`);

		// Eliminar todos los tipos personalizados (enums)
		const types = await prisma.$queryRaw`
			SELECT typname 
			FROM pg_type 
			WHERE typtype = 'e' 
			AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
		`;

		console.log(`\n📊 Tipos a eliminar: ${(types as any[]).length}\n`);

		for (const type of types as any[]) {
			const typeName = type.typname;
			await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${typeName}" CASCADE`);
			console.log(`   ✅ Eliminado: ${typeName}`);
		}

		console.log(`\n✅ Todas las tablas y tipos eliminados exitosamente`);

	} catch (error) {
		console.error('❌ Error:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

dropAllTables().catch(console.error);
