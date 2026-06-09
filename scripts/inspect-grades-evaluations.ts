import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectData() {
	console.log('=== INSPECCIÓN DE DATOS EXISTENTES ===\n');

	// Contar registros
	const gradeCount = await prisma.grade.count();
	const evaluationCount = await prisma.evaluation.count();
	const studentSubjectStatusCount = await prisma.studentSubjectStatus.count();

	console.log(`Total de calificaciones (Grade): ${gradeCount}`);
	console.log(`Total de evaluaciones (Evaluation): ${evaluationCount}`);
	console.log(`Total de estados de materia (StudentSubjectStatus): ${studentSubjectStatusCount}\n`);

	// Muestras de Grade
	if (gradeCount > 0) {
		console.log('=== MUESTRA DE CALIFICACIONES (primeros 10) ===');
		const grades = await prisma.grade.findMany({
			take: 10,
			include: {
				student: { select: { firstName: true, lastName: true, dni: true } },
				subject: { select: { name: true, code: true } }
			},
			orderBy: { gradedAt: 'desc' }
		});

		grades.forEach((g) => {
			console.log(`- ID: ${g.id}`);
			console.log(`  Alumno: ${g.student.lastName}, ${g.student.firstName} (${g.student.dni})`);
			console.log(`  Materia: ${g.subject.code} - ${g.subject.name}`);
			console.log(`  Nota: ${g.value}`);
			console.log(`  Tipo: ${g.gradeType}`);
			console.log(`  Fecha: ${g.gradedAt.toISOString()}`);
			console.log(`  Creado por: ${g.createdByUserId}`);
			console.log('');
		});
	}

	// Muestras de Evaluation
	if (evaluationCount > 0) {
		console.log('=== MUESTRA DE EVALUACIONES (primeros 10) ===');
		const evaluations = await prisma.evaluation.findMany({
			take: 10,
			include: {
				subject: { select: { name: true, code: true } },
				creator: { select: { firstName: true, lastName: true } }
			},
			orderBy: { createdAt: 'desc' }
		});

		evaluations.forEach((e) => {
			console.log(`- ID: ${e.id}`);
			console.log(`  Título: ${e.title}`);
			console.log(`  Materia: ${e.subject.code} - ${e.subject.name}`);
			console.log(`  Tipo: ${e.type}`);
			console.log(`  Fecha: ${e.date?.toISOString() || 'Sin fecha'}`);
			console.log(`  Nota máxima: ${e.maxScore}`);
			console.log(`  Creado por: ${e.creator.firstName} ${e.creator.lastName}`);
			console.log(`  Creado el: ${e.createdAt.toISOString()}`);
			console.log('');
		});
	}

	// Tipos de evaluación usados en Grade
	if (gradeCount > 0) {
		console.log('=== TIPOS DE EVALUACIÓN USADOS EN GRADE ===');
		const gradeTypes = await prisma.grade.groupBy({
			by: ['gradeType'],
			_count: { gradeType: true }
		});

		gradeTypes.forEach((gt) => {
			console.log(`- ${gt.gradeType}: ${gt._count.gradeType} registros`);
		});
		console.log('');
	}

	// Tipos de evaluación usados en Evaluation
	if (evaluationCount > 0) {
		console.log('=== TIPOS DE EVALUACIÓN USADOS EN EVALUATION ===');
		const evalTypes = await prisma.evaluation.groupBy({
			by: ['type'],
			_count: { type: true }
		});

		evalTypes.forEach((et) => {
			console.log(`- ${et.type}: ${et._count.type} registros`);
		});
		console.log('');
	}

	// Verificar si hay Grades sin Evaluation asociada (cuando agreguemos evaluationId)
	console.log('=== ANÁLISIS DE COMPATIBILIDAD ===');
	console.log(`Todos los Grades actuales tienen subjectId: ${gradeCount > 0 ? 'Sí' : 'N/A'}`);
	console.log(`Grades que necesitarán migración a Evaluation: ${gradeCount} (todos)`);
	console.log(`Evaluaciones existentes para asociar: ${evaluationCount}`);

	if (evaluationCount > 0 && gradeCount > 0) {
		console.log('\nRECOMENDACIÓN: Crear evaluaciones por defecto para cada Grade existente');
		console.log('o mantener subjectId en Grade como campo redundante para compatibilidad.');
	}

	await prisma.$disconnect();
}

inspectData().catch(console.error);
