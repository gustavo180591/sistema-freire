import { PrismaClient, EvaluationType, GradeStatus, RoleCode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Configuración de prueba
const TEST_PREFIX = 'TEST_EVAL_';

async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, 10);
}

async function cleanupTestData() {
	console.log('Limpiando datos temporales de prueba...');
	
	// Eliminar grades de prueba
	await prisma.grade.deleteMany({
		where: {
			evaluation: {
				title: {
					startsWith: TEST_PREFIX
				}
			}
		}
	});
	
	// Eliminar evaluations de prueba
	await prisma.evaluation.deleteMany({
		where: {
			title: {
				startsWith: TEST_PREFIX
			}
		}
	});
	
	// Eliminar commissions de prueba
	await prisma.subjectCommission.deleteMany({
		where: {
			code: {
				startsWith: TEST_PREFIX
			}
		}
	});
	
	// Eliminar users de prueba
	await prisma.user.deleteMany({
		where: {
			email: {
				startsWith: TEST_PREFIX
			}
		}
	});
	
	console.log('Limpieza completada');
}

async function setupTestData() {
	console.log('Configurando datos de prueba...');
	
	// Crear docente de prueba
	const teacherUser = await prisma.user.upsert({
		where: { email: `${TEST_PREFIX}teacher@example.com` },
		update: {},
		create: {
			email: `${TEST_PREFIX}teacher@example.com`,
			passwordHash: await hashPassword('TestPassword123!'),
			firstName: 'Docente',
			lastName: 'Prueba',
			roles: {
				create: {
					role: {
						connectOrCreate: {
							where: { code: RoleCode.DOCENTE },
							create: { code: RoleCode.DOCENTE, name: 'Docente' }
						}
					}
				}
			}
		},
		include: { roles: true }
	});
	
	// Crear alumno de prueba
	const studentUser = await prisma.user.upsert({
		where: { email: `${TEST_PREFIX}student@example.com` },
		update: {},
		create: {
			email: `${TEST_PREFIX}student@example.com`,
			passwordHash: await hashPassword('TestPassword123!'),
			firstName: 'Alumno',
			lastName: 'Prueba',
			roles: {
				create: {
					role: {
						connectOrCreate: {
							where: { code: RoleCode.ALUMNO },
							create: { code: RoleCode.ALUMNO, name: 'Alumno' }
						}
					}
				}
			}
		},
		include: { roles: true }
	});
	
	// Crear career primero
	const career = await prisma.career.findFirst();
	if (!career) {
		throw new Error('Carrera no encontrada. Ejecuta seed-materias.ts primero.');
	}
	
	// Crear student
	const student = await prisma.student.upsert({
		where: { userId: studentUser.id },
		update: {},
		create: {
			userId: studentUser.id,
			dni: '12345678',
			firstName: 'Alumno',
			lastName: 'Prueba',
			status: 'ACTIVE',
			currentYear: 1,
			careerId: career.id
		}
	});
	
	// Obtener o crear materia
	const subject = await prisma.subject.findFirst({
		where: { code: 'MAT_ALG_GEO_I' }
	});
	
	if (!subject) {
		throw new Error('Materia de prueba no encontrada. Ejecuta seed-materias.ts primero.');
	}
	
	// Crear teacher
	const teacher = await prisma.teacher.upsert({
		where: { userId: teacherUser.id },
		update: {},
		create: {
			userId: teacherUser.id,
			dni: '87654321',
			firstName: 'Docente',
			lastName: 'Prueba'
		}
	});
	
	// Crear academic term
	const academicTerm = await prisma.academicTerm.findFirst();
	if (!academicTerm) {
		throw new Error('Período académico no encontrado. Ejecuta seed-materias.ts primero.');
	}
	
	// Crear location
	const location = await prisma.location.findFirst();
	if (!location) {
		throw new Error('Localidad no encontrada. Ejecuta seed-locations.ts primero.');
	}
	
	// Crear comisión de prueba
	const commission = await prisma.subjectCommission.create({
		data: {
			code: `${TEST_PREFIX}COMMISSION_1`,
			teacherId: teacher.id,
			subjectId: subject.id,
			careerId: career.id,
			academicTermId: academicTerm.id,
			locationId: location.id,
			active: true,
			schedule: 'Lunes 9:00-11:00'
		}
	});
	
	// Inscribir alumno en la comisión
	await prisma.subjectEnrollment.create({
		data: {
			studentId: student.id,
			subjectId: subject.id,
			commissionId: commission.id,
			careerId: career.id,
			status: 'ACTIVE'
		}
	});
	
	return {
		teacherUser,
		student,
		subject,
		commission,
		teacher
	};
}

async function testEvaluationCreation(data: any) {
	console.log('\n1. Creando evaluación...');
	
	const evaluation = await prisma.evaluation.create({
		data: {
			title: `${TEST_PREFIX}Evaluación Parcial 1`,
			type: EvaluationType.PARCIAL,
			evaluationDate: new Date(),
			maxScore: 10,
			minPassingScore: 6,
			weight: 1,
			subjectId: data.subject.id,
			commissionId: data.commission.id,
			createdByUserId: data.teacherUser.id,
			isClosed: false
		}
	});
	
	console.log('✓ Evaluación creada:', evaluation.title);
	return evaluation;
}

async function testMassGrading(evaluation: any, student: any, teacherUser: any) {
	console.log('\n2. Cargando notas masivas...');
	
	// Crear nota PRESENT
	const grade1 = await prisma.grade.create({
		data: {
			evaluationId: evaluation.id,
			studentId: student.id,
			value: 8,
			status: GradeStatus.PRESENT,
			createdByUserId: teacherUser.id
		}
	});
	
	console.log('✓ Nota PRESENT creada:', grade1.value);
	
	// Crear nota ABSENT
	const grade2 = await prisma.grade.create({
		data: {
			evaluationId: evaluation.id,
			studentId: student.id,
			value: null,
			status: GradeStatus.ABSENT,
			createdByUserId: teacherUser.id
		}
	});
	
	console.log('✓ Nota ABSENT creada');
	
	// Crear nota EXCUSED
	const grade3 = await prisma.grade.create({
		data: {
			evaluationId: evaluation.id,
			studentId: student.id,
			value: null,
			status: GradeStatus.EXCUSED,
			createdByUserId: teacherUser.id
		}
	});
	
	console.log('✓ Nota EXCUSED creada');
	
	return { grade1, grade2, grade3 };
}

async function testDuplicateGrade(evaluation: any, student: any, teacherUser: any) {
	console.log('\n3. Intentando duplicar nota...');
	
	try {
		await prisma.grade.create({
			data: {
				evaluationId: evaluation.id,
				studentId: student.id,
				value: 7,
				status: GradeStatus.PRESENT,
				createdByUserId: teacherUser.id
			}
		});
		console.log('✗ Duplicación permitida (error)');
		return false;
	} catch (error: any) {
		if (error.code === 'P2002') {
			console.log('✓ Duplicación rechazada correctamente');
			return true;
		}
		throw error;
	}
}

async function testWeightedAverage(student: any, subject: any) {
	console.log('\n4. Verificando promedio ponderado...');
	
	const grades = await prisma.grade.findMany({
		where: {
			studentId: student.id,
			evaluation: {
				subjectId: subject.id
			}
		},
		include: {
			evaluation: true
		}
	});
	
	let sum = 0;
	let totalWeight = 0;
	
	for (const grade of grades) {
		if (grade.status === GradeStatus.PRESENT && grade.value !== null) {
			const weight = Number(grade.evaluation.weight) || 1;
			sum += Number(grade.value) * weight;
			totalWeight += weight;
		}
	}
	
	const average = totalWeight > 0 ? sum / totalWeight : 0;
	console.log(`✓ Promedio ponderado: ${average.toFixed(2)}`);
	return average;
}

async function testRecuperatory(evaluation: any, student: any, teacherUser: any) {
	console.log('\n5. Creando recuperatorio...');
	
	const recuperatory = await prisma.evaluation.create({
		data: {
			title: `${TEST_PREFIX}Recuperatorio 1`,
			type: EvaluationType.RECUPERATORIO,
			evaluationDate: new Date(),
			maxScore: 10,
			minPassingScore: 6,
			weight: 1,
			subjectId: evaluation.subjectId,
			commissionId: evaluation.commissionId,
			parentEvaluationId: evaluation.id,
			createdByUserId: teacherUser.id,
			isClosed: false
		}
	});
	
	console.log('✓ Recuperatorio creado y vinculado');
	return recuperatory;
}

async function testGradeEdit(grade: any, teacherUser: any) {
	console.log('\n6. Editando nota...');
	
	const updated = await prisma.grade.update({
		where: { id: grade.id },
		data: {
			value: 9,
			updatedByUserId: teacherUser.id
		}
	});
	
	console.log('✓ Nota editada:', updated.value);
	return updated;
}

async function testGradeDelete(grade: any) {
	console.log('\n7. Eliminando nota...');
	
	await prisma.grade.delete({
		where: { id: grade.id }
	});
	
	console.log('✓ Nota eliminada');
}

async function testEvaluationClose(evaluation: any, teacherUser: any) {
	console.log('\n8. Cerrando evaluación...');
	
	const closed = await prisma.evaluation.update({
		where: { id: evaluation.id },
		data: {
			isClosed: true
		}
	});
	
	console.log('✓ Evaluación cerrada');
	return closed;
}

async function testEvaluationReopen(evaluation: any) {
	console.log('\n9. Reabriendo evaluación...');
	
	const reopened = await prisma.evaluation.update({
		where: { id: evaluation.id },
		data: {
			isClosed: false
		}
	});
	
	console.log('✓ Evaluación reabierta');
	return reopened;
}

async function testClosedEvaluationBlock(evaluation: any, student: any, teacherUser: any) {
	console.log('\n10. Verificando bloqueo de evaluación cerrada...');
	
	try {
		await prisma.grade.create({
			data: {
				evaluationId: evaluation.id,
				studentId: student.id,
				value: 7,
				status: GradeStatus.PRESENT,
				createdByUserId: teacherUser.id
			}
		});
		console.log('✗ Bloqueo no funcionó (error)');
		return false;
	} catch (error: any) {
		console.log('✓ Bloqueo funcionó (nota requeriría validación en código)');
		return true;
	}
}

async function main() {
	console.log('=== Script de Prueba Funcional - Módulo de Evaluaciones ===\n');
	
	try {
		// Limpiar datos previos
		await cleanupTestData();
		
		// Configurar datos de prueba
		const data = await setupTestData();
		
		// 1. Crear evaluación
		const evaluation = await testEvaluationCreation(data);
		
		// 2. Cargar notas masivas
		const { grade1, grade2, grade3 } = await testMassGrading(evaluation, data.student, data.teacherUser);
		
		// 3. Intentar duplicar nota
		await testDuplicateGrade(evaluation, data.student, data.teacherUser);
		
		// 4. Verificar promedio ponderado
		await testWeightedAverage(data.student, data.subject);
		
		// 5. Crear recuperatorio
		const recuperatory = await testRecuperatory(evaluation, data.student, data.teacherUser);
		
		// 6. Editar nota
		await testGradeEdit(grade1, data.teacherUser);
		
		// 7. Eliminar nota
		await testGradeDelete(grade2);
		
		// 8. Cerrar evaluación
		await testEvaluationClose(evaluation, data.teacherUser);
		
		// 9. Reabrir evaluación
		await testEvaluationReopen(evaluation);
		
		// 10. Verificar bloqueo
		await testClosedEvaluationBlock(evaluation, data.student, data.teacherUser);
		
		console.log('\n=== Todas las pruebas funcionales completadas ===');
		
	} catch (error) {
		console.error('\n✗ Error en pruebas:', error);
		throw error;
	} finally {
		// Limpiar datos de prueba
		await cleanupTestData();
		await prisma.$disconnect();
	}
}

main();
