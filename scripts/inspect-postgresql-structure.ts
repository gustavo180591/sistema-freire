import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ColumnInfo {
	column_name: string;
	data_type: string;
	is_nullable: string;
	column_default: string | null;
	ordinal_position: number;
}

interface ConstraintInfo {
	constraint_name: string;
	constraint_type: string;
	column_name: string | null;
}

interface IndexInfo {
	indexname: string;
	indexdef: string;
}

interface ForeignKeyInfo {
	constraint_name: string;
	column_name: string;
	foreign_table_name: string;
	foreign_column_name: string;
	on_delete: string;
	on_update: string;
}

async function inspectTable(tableName: string) {
	console.log(`\n=== Tabla: ${tableName} ===\n`);
	
	// Columnas
	const columns = await prisma.$queryRaw<ColumnInfo[]>`
		SELECT 
			column_name,
			data_type,
			is_nullable,
			column_default,
			ordinal_position
		FROM information_schema.columns
		WHERE table_name = ${tableName}
		ORDER BY ordinal_position
	`;
	
	console.log('Columnas:');
	for (const col of columns) {
		console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
	}
	
	// Primary Key
	const pk = await prisma.$queryRaw<{ column_name: string }[]>`
		SELECT 
			kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		WHERE tc.table_name = ${tableName}
			AND tc.constraint_type = 'PRIMARY KEY'
	`;
	
	if (pk.length > 0) {
		console.log(`\nPrimary Key: ${pk.map(p => p.column_name).join(', ')}`);
	}
	
	// Unique Constraints
	const unique = await prisma.$queryRaw<{ constraint_name: string; column_name: string }[]>`
		SELECT 
			tc.constraint_name,
			kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		WHERE tc.table_name = ${tableName}
			AND tc.constraint_type = 'UNIQUE'
		ORDER BY tc.constraint_name, kcu.ordinal_position
	`;
	
	if (unique.length > 0) {
		console.log('\nUnique Constraints:');
		const grouped = unique.reduce((acc, curr) => {
			if (!acc[curr.constraint_name]) acc[curr.constraint_name] = [];
			acc[curr.constraint_name].push(curr.column_name);
			return acc;
		}, {} as Record<string, string[]>);
		
		for (const [name, cols] of Object.entries(grouped)) {
			console.log(`  - ${name}: (${cols.join(', ')})`);
		}
	}
	
	// Foreign Keys
	const fk = await prisma.$queryRaw<ForeignKeyInfo[]>`
		SELECT
			tc.constraint_name,
			kcu.column_name,
			ccu.table_name AS foreign_table_name,
			ccu.column_name AS foreign_column_name,
			rc.delete_rule AS on_delete,
			rc.update_rule AS on_update
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage ccu
			ON ccu.constraint_name = tc.constraint_name
			AND ccu.table_schema = tc.table_schema
		JOIN information_schema.referential_constraints rc
			ON rc.constraint_name = tc.constraint_name
		WHERE tc.table_name = ${tableName}
			AND tc.constraint_type = 'FOREIGN KEY'
		ORDER BY tc.constraint_name
	`;
	
	if (fk.length > 0) {
		console.log('\nForeign Keys:');
		for (const f of fk) {
			console.log(`  - ${f.constraint_name}: ${f.column_name} -> ${f.foreign_table_name}.${f.foreign_column_name} ON DELETE ${f.on_delete} ON UPDATE ${f.on_update}`);
		}
	}
	
	// Indexes
	const indexes = await prisma.$queryRaw<IndexInfo[]>`
		SELECT 
			indexname,
			indexdef
		FROM pg_indexes
		WHERE tablename = ${tableName}
		ORDER BY indexname
	`;
	
	if (indexes.length > 0) {
		console.log('\nIndexes:');
		for (const idx of indexes) {
			console.log(`  - ${idx.indexname}`);
		}
	}
	
	return { columns, pk, unique, fk, indexes };
}

async function inspectEnums() {
	console.log('\n=== Enums en PostgreSQL ===\n');
	
	const enums = await prisma.$queryRaw<{ typname: string; enumlabel: string }[]>`
		SELECT 
			t.typname,
			e.enumlabel
		FROM pg_type t
		JOIN pg_enum e ON t.oid = e.enumtypid
		WHERE t.typtype = 'e'
		ORDER BY t.typname, e.enumsortorder
	`;
	
	const grouped = enums.reduce((acc, curr) => {
		if (!acc[curr.typname]) acc[curr.typname] = [];
		acc[curr.typname].push(curr.enumlabel);
		return acc;
	}, {} as Record<string, string[]>);
	
	for (const [name, values] of Object.entries(grouped)) {
		console.log(`${name}:`);
		for (const val of values) {
			console.log(`  - ${val}`);
		}
	}
	
	return grouped;
}

async function checkTableCounts() {
	console.log('\n=== Conteo de Registros ===\n');
	
	const gradesCount = await prisma.grade.count();
	const evaluationsCount = await prisma.evaluation.count();
	const studentStatusCount = await prisma.studentSubjectStatus.count();
	
	console.log(`grades: ${gradesCount} registros`);
	console.log(`evaluations: ${evaluationsCount} registros`);
	console.log(`student_subject_status: ${studentStatusCount} registros`);
	
	if (studentStatusCount > 0) {
		// Usar query raw para evitar error de Prisma con columnas faltantes
		const sample = await prisma.$queryRaw<any[]>`
			SELECT * FROM student_subject_status LIMIT 1
		`;
		console.log('\nMuestra de student_subject_status:');
		console.log(JSON.stringify(sample[0], null, 2));
	}
	
	return { gradesCount, evaluationsCount, studentStatusCount };
}

async function main() {
	console.log('=== Inspección de Estructura PostgreSQL ===');
	
	try {
		// Inspeccionar tablas
		await inspectTable('evaluations');
		await inspectTable('grades');
		await inspectTable('student_subject_status');
		
		// Inspeccionar enums
		const enums = await inspectEnums();
		
		// Verificar conteos
		const counts = await checkTableCounts();
		
	} catch (error) {
		console.error('Error:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

main();
