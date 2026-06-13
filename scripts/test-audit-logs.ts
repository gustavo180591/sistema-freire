import { PrismaClient, EvaluationType, GradeStatus, RoleCode, TrainingField, TermType, SubjectType, AuditAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { EvaluationService } from '../src/lib/server/academic/evaluation-service';

const prisma = new PrismaClient();
const evaluationService = new EvaluationService(prisma);

const TEST_PREFIX = 'AUDIT_TEST_';

async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, 10);
}

async function cleanup() {
	console.log('Limpiando datos de prueba de auditoría...');

	await prisma.auditLog.deleteMany({
		where: {
			description: {
				contains: TEST_PREFIX
			}
		}
	});

	await prisma.grade.deleteMany({
		where: {
			evaluation: {
				title: {
					startsWith: TEST_PREFIX
				}
			}
		}
	});

	await prisma.evaluation.deleteMany({
		where: {
			title: {
				startsWith: TEST_PREFIX
			}
		}
	});

	await prisma.studentSubjectStatus.deleteMany({
		where: {
			subject: {
				code: {
					startsWith: TEST_PREFIX
				}
			}
		}
	});

	await prisma.subjectEnrollment.deleteMany({
		where: {
			subject: {
				code: {
					startsWith: TEST_PREFIX
				}
			}
		}
	});

	await prisma.subjectCommission.deleteMany({
		where: {
			code: {
				startsWith: TEST_PREFIX
			}
		}
	});

	await prisma.subject.deleteMany({
		where: {
			code: {
				startsWith: TEST_PREFIX
			}
		}
	});

	await prisma.student.deleteMany({
		where: {
			user: {
				email: {
					startsWith: TEST_PREFIX
				}
			}
		}
	});

	await prisma.teacher.deleteMany({
		where: {
			user: {
				email: {
					startsWith: TEST_PREFIX
				}
			}
		}
	});

	await prisma.career.deleteMany({
		where: {
			code: {
				startsWith: TEST_PREFIX
			}
		}
	});

	await prisma.academicTerm.deleteMany({
		where: {
			code: {
				startsWith: TEST_PREFIX
			}
		}
	});

	await prisma.location.deleteMany({
		where: {
			code: {
				startsWith: TEST_PREFIX
			}
		}
	});

	await prisma.user.deleteMany({
		where: {
			email: {
				startsWith: TEST_PREFIX
			}
		}
	});

	console.log('Limpieza completada');
}

async function setup() {
	console.log('Configurando datos de prueba...');

	const career = await prisma.career.create({
		data: {
			code: `${TEST_PREFIX}CAREER`,
			name: 'Carrera de Prueba Auditoría',
			trainingField: TrainingField.GENERAL,
			durationYears: 5,
			active: true
		}
	});

	const academicTerm = await prisma.academicTerm.create({
		data: {
			code: `${TEST_PREFIX}TERM_2024`,
			name: 'Año 2024',
			year: 2024,
			termType: TermType.ANUAL,
			startDate: new Date('2024-03-01'),
			endDate: new Date('2024-12-31'),
			active: true
		}
	});

	const location = await prisma.location.create({
		data: {
			code: `${TEST_PREFIX}LOCATION`,
			name: 'Sede Prueba Auditoría',
			address: 'Calle Prueba 123',
			city: 'Ciudad Prueba',
			province: 'Provincia Prueba',
			active: true
		}
	});

	const subject = await prisma.subject.create({
		data: {
			code: `${TEST_PREFIX}SUBJECT_1`,
			name: 'Materia de Prueba Auditoría',
			subjectType: SubjectType.COMMON,
			trainingField: TrainingField.GENERAL,
			yearLevel: 1,
			approvalThreshold: 6,
			promotionThreshold: 8,
			active: true
		}
	});

	const commission = await prisma.subjectCommission.create({
		data: {
			code: `${TEST_PREFIX}COMMISSION_1`,
			subjectId: subject.id,
			academicTermId: academicTerm.id,
			careerId: career.id,
			locationId: location.id,
			maxCapacity: 40,
			active: true
		}
	});

	const teacherUser = await prisma.user.create({
		data: {
			email: `${TEST_PREFIX}teacher@example.com`,
			passwordHash: await hashPassword('TestPassword123!'),
			firstName: 'Docente',
			lastName: 'Prueba Auditoría',
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
		}
	});

	const teacher = await prisma.teacher.create({
		data: {
			userId: teacherUser.id,
			dni: '87654321',
			firstName: 'Docente',
			lastName: 'Prueba Auditoría',
			status: 'ACTIVE'
		}
	});

	const studentUser = await prisma.user.create({
		data: {
			email: `${TEST_PREFIX}student@example.com`,
			passwordHash: await hashPassword('TestPassword123!'),
			firstName: 'Alumno',
			lastName: 'Prueba Auditoría',
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
		}
	});

	const student = await prisma.student.create({
		data: {
			userId: studentUser.id,
			dni: '12345678',
			firstName: 'Alumno',
			lastName: 'Prueba Auditoría',
			status: 'ACTIVE',
			currentYear: 1,
			careerId: career.id
		}
	});

	await prisma.subjectEnrollment.create({
		data: {
			studentId: student.id,
			subjectId: subject.id,
			academicTermId: academicTerm.id,
			careerId: career.id,
			commissionId: commission.id,
			status: 'ACTIVE'
		}
	});

	await prisma.studentSubjectStatus.create({
		data: {
			studentId: student.id,
			subjectId: subject.id,
			courseStatus: 'IN_PROGRESS',
			academicStatus: 'EN_COURSE',
			regularityStatus: 'REGULAR'
		}
	});

	return { subject, commission, teacher, teacherUser, student, studentUser };
}

async function verifyAuditLog(
	entityType: string,
	action: AuditAction,
	entityId: string,
	userId: string,
	descriptionContains: string
) {
	const logs = await prisma.auditLog.findMany({
		where: {
			entityType,
			action,
			entityId,
			userId,
			description: {
				contains: descriptionContains
			}
		},
		orderBy: {
			createdAt: 'desc'
		}
	});

	if (logs.length === 0) {
		throw new Error(`No se encontró log de auditoría para ${entityType} ${action}`);
	}

	const log = logs[0];
	console.log(`✓ Log de auditoría encontrado: ${log.description}`);
	console.log(`  - Action: ${log.action}`);
	console.log(`  - EntityType: ${log.entityType}`);
	console.log(`  - EntityId: ${log.entityId}`);
	console.log(`  - UserId: ${log.userId}`);
	console.log(`  - Metadata:`, log.metadata);

	return log;
}

async function main() {
	try {
		await cleanup();
		const data = await setup();

		console.log('\n=== Pruebas de Auditoría ===\n');

		// 1. Creación de evaluación
		console.log('1. Creando evaluación...');
		const evaluation = await evaluationService.createEvaluation({
			subjectId: data.subject.id,
			commissionId: data.commission.id,
			title: `${TEST_PREFIX}Evaluación Parcial 1`,
			type: EvaluationType.PARCIAL,
			evaluationDate: new Date(),
			maxScore: 10,
			minPassingScore: 6,
			weight: 1,
			userId: data.teacherUser.id
		});

		if ('error' in evaluation) {
			throw new Error(evaluation.error);
		}

		await verifyAuditLog(
			'Evaluation',
			AuditAction.CREATE,
			evaluation.id,
			data.teacherUser.id,
			evaluation.title
		);

		// 2. Carga masiva de calificaciones
		console.log('\n2. Cargando calificaciones en lote...');
		const loadResult = await evaluationService.loadGradesBatch({
			evaluationId: evaluation.id,
			grades: [
				{
					studentId: data.student.id,
					value: 8,
					status: GradeStatus.PRESENT,
					observations: 'Nota de prueba auditoría'
				}
			],
			userId: data.teacherUser.id
		});

		if ('error' in loadResult) {
			throw new Error(loadResult.error);
		}

		const grade = loadResult[0];
		await verifyAuditLog(
			'Evaluation',
			AuditAction.UPDATE,
			evaluation.id,
			data.teacherUser.id,
			'Cargó'
		);

		// 3. Edición de calificación
		console.log('\n3. Editando calificación...');
		const editResult = await evaluationService.editGrade({
			gradeId: grade.id,
			value: 9,
			status: GradeStatus.PRESENT,
			userId: data.teacherUser.id
		});

		if ('error' in editResult) {
			throw new Error(editResult.error);
		}

		await verifyAuditLog(
			'Grade',
			AuditAction.UPDATE,
			grade.id,
			data.teacherUser.id,
			'Editó calificación'
		);

		// 4. Eliminación de calificación
		console.log('\n4. Eliminando calificación...');
		await evaluationService.deleteGrade({
			gradeId: grade.id,
			userId: data.teacherUser.id
		});

		await verifyAuditLog(
			'Grade',
			AuditAction.DELETE,
			grade.id,
			data.teacherUser.id,
			'Eliminó calificación'
		);

		// 5. Cierre de evaluación
		console.log('\n5. Cerrando evaluación...');
		await evaluationService.closeEvaluation({
			evaluationId: evaluation.id,
			userId: data.teacherUser.id,
			reason: 'Prueba de auditoría'
		});

		await verifyAuditLog(
			'Evaluation',
			AuditAction.UPDATE,
			evaluation.id,
			data.teacherUser.id,
			'Cerró evaluación'
		);

		// 6. Reapertura de evaluación
		console.log('\n6. Reabriendo evaluación...');
		await evaluationService.reopenEvaluation({
			evaluationId: evaluation.id,
			userId: data.teacherUser.id,
			reason: 'Prueba de reapertura'
		});

		await verifyAuditLog(
			'Evaluation',
			AuditAction.UPDATE,
			evaluation.id,
			data.teacherUser.id,
			'Reabrió evaluación'
		);

		// 7. Verificar metadata de valores anteriores/nuevos
		console.log('\n7. Verificando metadata de valores anteriores/nuevos...');
		const editLogs = await prisma.auditLog.findMany({
			where: {
				entityType: 'Grade',
				action: AuditAction.UPDATE,
				entityId: grade.id
			}
		});

		if (editLogs.length > 0) {
			const editLog = editLogs[0];
			if (editLog.metadata && typeof editLog.metadata === 'object') {
				const metadata = editLog.metadata as any;
				if (metadata.oldValue && metadata.newValue) {
					console.log('✓ Metadata de oldValue/newValue encontrada:');
					console.log('  - oldValue:', metadata.oldValue);
					console.log('  - newValue:', metadata.newValue);
				} else {
					console.log('⚠ Metadata de oldValue/newValue no encontrada (mejora pendiente)');
				}
			}
		}

		// 8. Resumen de logs de auditoría
		console.log('\n8. Resumen de logs de auditoría generados...');
		const allLogs = await prisma.auditLog.findMany({
			where: {
				userId: data.teacherUser.id,
				description: {
					contains: TEST_PREFIX
				}
			},
			orderBy: {
				createdAt: 'asc'
			}
		});

		console.log(`Total de logs generados: ${allLogs.length}`);
		allLogs.forEach((log, index) => {
			console.log(`  ${index + 1}. ${log.action} - ${log.entityType} - ${log.description}`);
		});

		console.log('\n=== Pruebas de Auditoría Completadas Exitosamente ===');

		await cleanup();
	} catch (error) {
		console.error('Error en pruebas de auditoría:', error);
		await cleanup();
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
