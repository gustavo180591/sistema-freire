import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: 'postgresql://postgres:postgres@localhost:5442/sistema-freire-test-3'
		}
	}
});

async function main() {
	console.log('=== Verificación de Schema de Migración ===\n');

	try {
		// 1. Verificar enums críticos
		console.log('1. Verificando enums críticos...');
		const enums = await prisma.$queryRaw`
			SELECT typname 
			FROM pg_type 
			WHERE typtype = 'e' 
			AND typname IN ('EvaluationType', 'GradeStatus', 'CourseStatus', 'FinalExamStatus', 'AcademicStatus', 'RegularityStatus')
			ORDER BY typname;
		`;
		
		const expectedEnums = ['EvaluationType', 'GradeStatus', 'CourseStatus', 'FinalExamStatus', 'AcademicStatus', 'RegularityStatus'];
		const foundEnums = (enums as any[]).map(e => e.typname);
		
		for (const expected of expectedEnums) {
			if (foundEnums.includes(expected)) {
				console.log(`  ✓ ${expected}`);
			} else {
				console.log(`  ✗ ${expected} NO ENCONTRADO`);
			}
		}

		// 2. Verificar tabla Evaluation
		console.log('\n2. Verificando tabla Evaluation...');
		const evaluationColumns = await prisma.$queryRaw`
			SELECT column_name, data_type, is_nullable 
			FROM information_schema.columns 
			WHERE table_name = 'evaluations' 
			AND table_schema = 'public'
			ORDER BY ordinal_position;
		`;
		
		const expectedEvaluationColumns = [
			'id', 'subjectId', 'commissionId', 'title', 'description', 'type',
			'evaluationDate', 'maxScore', 'minPassingScore', 'weight',
			'parentEvaluationId', 'createdByUserId', 'createdAt', 'updatedAt',
			'isClosed', 'closedAt', 'closedByUserId', 'closedReason',
			'reopenedAt', 'reopenedByUserId', 'reopenReason'
		];
		
		const foundEvaluationColumns = (evaluationColumns as any[]).map(c => c.column_name);
		
		for (const expected of expectedEvaluationColumns) {
			if (foundEvaluationColumns.includes(expected)) {
				console.log(`  ✓ ${expected}`);
			} else {
				console.log(`  ✗ ${expected} NO ENCONTRADO`);
			}
		}

		// 3. Verificar tabla Grade
		console.log('\n3. Verificando tabla Grade...');
		const gradeColumns = await prisma.$queryRaw`
			SELECT column_name, data_type, is_nullable 
			FROM information_schema.columns 
			WHERE table_name = 'grades' 
			AND table_schema = 'public'
			ORDER BY ordinal_position;
		`;
		
		const expectedGradeColumns = [
			'id', 'evaluationId', 'studentId', 'value', 'status',
			'observations', 'createdByUserId', 'createdAt', 'updatedAt'
		];
		
		const foundGradeColumns = (gradeColumns as any[]).map(c => c.column_name);
		
		for (const expected of expectedGradeColumns) {
			if (foundGradeColumns.includes(expected)) {
				console.log(`  ✓ ${expected}`);
			} else {
				console.log(`  ✗ ${expected} NO ENCONTRADO`);
			}
		}

		// 4. Verificar campos nuevos de StudentSubjectStatus
		console.log('\n4. Verificando campos nuevos de StudentSubjectStatus...');
		const sssColumns = await prisma.$queryRaw`
			SELECT column_name, data_type, is_nullable 
			FROM information_schema.columns 
			WHERE table_name = 'student_subject_status' 
			AND table_schema = 'public'
			AND column_name IN ('finalExamStatus', 'finalExamScore', 'regularityStatus')
			ORDER BY column_name;
		`;
		
		const expectedSSSColumns = ['finalExamStatus', 'finalExamScore', 'regularityStatus'];
		const foundSSSColumns = (sssColumns as any[]).map(c => c.column_name);
		
		for (const expected of expectedSSSColumns) {
			if (foundSSSColumns.includes(expected)) {
				console.log(`  ✓ ${expected}`);
			} else {
				console.log(`  ✗ ${expected} NO ENCONTRADO`);
			}
		}

		// 5. Verificar foreign keys en evaluations
		console.log('\n5. Verificando foreign keys en evaluations...');
		const evaluationFKs = await prisma.$queryRaw`
			SELECT
				tc.constraint_name,
				kcu.column_name,
				ccu.table_name AS foreign_table_name,
				ccu.column_name AS foreign_column_name
			FROM information_schema.table_constraints AS tc
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage AS ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_name = 'evaluations'
			ORDER BY tc.constraint_name;
		`;
		
		console.log('  Foreign keys encontradas:');
		for (const fk of evaluationFKs as any[]) {
			console.log(`    - ${fk.constraint_name}: ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
		}

		// 6. Verificar constraint único en grades
		console.log('\n6. Verificando constraint único [evaluationId, studentId] en grades...');
		const gradeUnique = await prisma.$queryRaw`
			SELECT
				tc.constraint_name,
				kcu.column_name
			FROM information_schema.table_constraints AS tc
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			WHERE tc.constraint_type = 'UNIQUE'
				AND tc.table_name = 'grades'
			ORDER BY tc.constraint_name, kcu.ordinal_position;
		`;
		
		console.log('  Constraints únicos encontrados:');
		for (const u of gradeUnique as any[]) {
			console.log(`    - ${u.constraint_name}: ${u.column_name}`);
		}
		
		// Also check for unique indexes (PostgreSQL treats them as constraints)
		const gradeUniqueIndexes = await prisma.$queryRaw`
			SELECT
				i.relname as index_name,
				a.attname as column_name
			FROM pg_class t
			JOIN pg_index ix ON t.oid = ix.indrelid
			JOIN pg_class i ON i.oid = ix.indexrelid
			JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
			WHERE t.relname = 'grades'
			AND ix.indisunique = true
			AND NOT ix.indisprimary
			ORDER BY i.relname, a.attnum;
		`;
		
		console.log('  Índices únicos encontrados:');
		for (const idx of gradeUniqueIndexes as any[]) {
			console.log(`    - ${idx.index_name} (${idx.column_name})`);
		}
		
		const uniqueColumns = (gradeUnique as any[]).map(u => u.column_name);
		const uniqueIndexColumns = (gradeUniqueIndexes as any[]).map(i => i.column_name);
		
		if (uniqueColumns.includes('evaluationId') && uniqueColumns.includes('studentId')) {
			console.log('  ✓ Constraint único [evaluationId, studentId] encontrado');
		} else if (uniqueIndexColumns.includes('evaluationId') && uniqueIndexColumns.includes('studentId')) {
			console.log('  ✓ Índice único [evaluationId, studentId] encontrado (funciona como constraint)');
		} else {
			console.log('  ✗ Constraint único [evaluationId, studentId] NO ENCONTRADO');
		}

		// 7. Verificar autorrelación de recuperatorios
		console.log('\n7. Verificando autorrelación de recuperatorios...');
		const recuperatoryFK = await prisma.$queryRaw`
			SELECT
				tc.constraint_name,
				kcu.column_name,
				ccu.table_name AS foreign_table_name
			FROM information_schema.table_constraints AS tc
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage AS ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_name = 'evaluations'
				AND ccu.table_name = 'evaluations'
				AND kcu.column_name = 'parentEvaluationId'
		`;
		
		if ((recuperatoryFK as any[]).length > 0) {
			console.log('  ✓ Autorrelación parentEvaluationId encontrada');
		} else {
			console.log('  ✗ Autorrelación parentEvaluationId NO ENCONTRADA');
		}

		// 8. Verificar campos de cierre y reapertura
		console.log('\n8. Verificando campos de cierre y reapertura...');
		const closeReopenColumns = await prisma.$queryRaw`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_name = 'evaluations' 
			AND table_schema = 'public'
			AND column_name IN ('isClosed', 'closedAt', 'closedByUserId', 'closedReason', 'reopenedAt', 'reopenedByUserId', 'reopenReason')
			ORDER BY column_name;
		`;
		
		const expectedCloseReopen = ['isClosed', 'closedAt', 'closedByUserId', 'closedReason', 'reopenedAt', 'reopenedByUserId', 'reopenReason'];
		const foundCloseReopen = (closeReopenColumns as any[]).map(c => c.column_name);
		
		for (const expected of expectedCloseReopen) {
			if (foundCloseReopen.includes(expected)) {
				console.log(`  ✓ ${expected}`);
			} else {
				console.log(`  ✗ ${expected} NO ENCONTRADO`);
			}
		}

		// 9. Verificar índices
		console.log('\n9. Verificando índices críticos...');
		const indexes = await prisma.$queryRaw`
			SELECT
				i.relname as index_name,
				a.attname as column_name
			FROM pg_class t
			JOIN pg_index ix ON t.oid = ix.indrelid
			JOIN pg_class i ON i.oid = ix.indexrelid
			JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
			WHERE t.relname IN ('evaluations', 'grades', 'student_subject_status')
			AND NOT ix.indisprimary
			ORDER BY t.relname, i.relname, a.attnum;
		`;
		
		console.log('  Índices encontrados:');
		for (const idx of indexes as any[]) {
			console.log(`    - ${idx.index_name} (${idx.column_name})`);
		}

		// 10. Verificar estado de migraciones
		console.log('\n10. Verificando estado de migraciones...');
		const migrations = await prisma.$queryRaw`
			SELECT migration_name, started_at, finished_at, applied_steps_count
			FROM _prisma_migrations
			ORDER BY started_at;
		`;
		
		console.log(`  Migraciones aplicadas: ${(migrations as any[]).length}`);
		console.log('  Últimas 5 migraciones:');
		for (const m of (migrations as any[]).slice(-5)) {
			console.log(`    - ${m.migration_name}`);
		}

		console.log('\n=== Verificación Completada ===');

	} catch (error) {
		console.error('Error en verificación:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

main();
