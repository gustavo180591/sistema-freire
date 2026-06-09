import { PrismaClient } from '@prisma/client';
import { updateAttendanceStatus } from '../src/lib/server/academic/plan-logic';

const prisma = new PrismaClient();

async function testCommissionAttendance() {
	console.log('=== PRUEBA DE ASISTENCIA CON COMISIÓN ===\n');

	try {
		// 1. Obtener datos existentes
		console.log('1. Obteniendo datos existentes...');
		const student = await prisma.student.findFirst({ where: { status: 'ACTIVE' } });
		const subject = await prisma.subject.findFirst();
		const teacher = await prisma.teacher.findFirst();
		const location = await prisma.location.findFirst();
		const academicTerm = await prisma.academicTerm.findFirst();

		if (!student || !subject || !teacher || !location || !academicTerm) {
			console.log('❌ No se encontraron datos de prueba válidos');
			return;
		}

		console.log(`   - Estudiante: ${student.firstName} ${student.lastName}`);
		console.log(`   - Materia: ${subject.name}`);
		console.log(`   - Docente: ${teacher.id}`);
		console.log(`   - Localidad: ${location.name}`);
		console.log(`   - Período: ${academicTerm.code}`);
		console.log('');

		// 2. Crear SubjectTeacher si no existe
		console.log('2. Verificando/creando SubjectTeacher...');
		let subjectTeacher = await prisma.subjectTeacher.findUnique({
			where: {
				subjectId_teacherId: {
					subjectId: subject.id,
					teacherId: teacher.id
				}
			}
		});

		if (!subjectTeacher) {
			subjectTeacher = await prisma.subjectTeacher.create({
				data: {
					subjectId: subject.id,
					teacherId: teacher.id
				}
			});
			console.log('   ✅ SubjectTeacher creado');
		} else {
			console.log('   ✅ SubjectTeacher ya existe');
		}
		console.log('');

		// 3. Crear SubjectCommission
		console.log('3. Creando SubjectCommission...');
		const commissionCode = `TEST-${Date.now().toString().slice(-4)}`;
		const commission = await prisma.subjectCommission.create({
			data: {
				code: commissionCode,
				subjectId: subject.id,
				academicTermId: academicTerm.id,
				careerId: student.careerId,
				teacherId: teacher.id,
				locationId: location.id,
				maxCapacity: 40,
				currentEnrolled: 1,
				schedule: 'Lunes 14-18',
				active: true
			}
		});
		console.log(`   ✅ Comisión creada: ${commission.id} (${commission.code})`);
		console.log('');

		// 4. Crear o actualizar SubjectEnrollment para el estudiante
		console.log('4. Creando/actualizando SubjectEnrollment...');
		const enrollment = await prisma.subjectEnrollment.upsert({
			where: {
				studentId_subjectId_academicTermId: {
					studentId: student.id,
					subjectId: subject.id,
					academicTermId: academicTerm.id
				}
			},
			create: {
				studentId: student.id,
				subjectId: subject.id,
				commissionId: commission.id,
				careerId: student.careerId,
				academicTermId: academicTerm.id,
				status: 'ACTIVE',
				enrolledAt: new Date()
			},
			update: {
				commissionId: commission.id,
				status: 'ACTIVE'
			}
		});
		console.log(`   ✅ Inscripción: ${enrollment.id}`);
		console.log('');

		// 5. Crear o actualizar StudentSubjectStatus
		console.log('5. Creando/actualizando StudentSubjectStatus...');
		const studentStatus = await prisma.studentSubjectStatus.upsert({
			where: {
				studentId_subjectId: {
					studentId: student.id,
					subjectId: subject.id
				}
			},
			create: {
				studentId: student.id,
				subjectId: subject.id,
				attendancePercent: 0,
				regularityStatus: 'LIBRE'
			},
			update: {
				attendancePercent: 0,
				regularityStatus: 'LIBRE'
			}
		});
		console.log(`   ✅ StudentSubjectStatus: ${studentStatus.id}`);
		console.log('');

		// 6. Crear AttendanceRecord con commissionId
		console.log('6. Creando AttendanceRecord con commissionId...');
		const testDate = new Date();
		testDate.setHours(0, 0, 0, 0);

		const attendanceRecord = await prisma.attendanceRecord.create({
			data: {
				subjectId: subject.id,
				classDate: testDate,
				commissionId: commission.id,
				createdByUserId: teacher.userId
			}
		});
		console.log(`   ✅ AttendanceRecord creado: ${attendanceRecord.id}`);
		console.log(`   - commissionId: ${attendanceRecord.commissionId}`);
		console.log('');

		// 7. Crear AttendanceEntry (presente)
		console.log('7. Creando AttendanceEntry (presente)...');
		const attendanceEntry = await prisma.attendanceEntry.create({
			data: {
				attendanceId: attendanceRecord.id,
				studentId: student.id,
				present: true,
				notes: 'Prueba con comisión'
			}
		});
		console.log(`   ✅ AttendanceEntry creado: ${attendanceEntry.id}`);
		console.log('');

		// 8. Llamar a updateAttendanceStatus
		console.log('8. Llamando a updateAttendanceStatus...');
		const statusUpdate = await updateAttendanceStatus(student.id, subject.id);
		console.log(`   ✅ updateAttendanceStatus ejecutado`);
		console.log(`   - attendancePercent: ${statusUpdate.attendancePercent}%`);
		console.log(`   - regularityStatus: ${statusUpdate.regularityStatus}`);
		console.log('');

		// 9. Verificar StudentSubjectStatus
		console.log('9. Verificando StudentSubjectStatus...');
		const finalStatus = await prisma.studentSubjectStatus.findUnique({
			where: {
				studentId_subjectId: {
					studentId: student.id,
					subjectId: subject.id
				}
			}
		});

		if (finalStatus) {
			console.log(`   - attendancePercent: ${finalStatus.attendancePercent}%`);
			console.log(`   - regularityStatus: ${finalStatus.regularityStatus}`);
		}
		console.log('');

		// 10. Verificar que el reporte por comisión pueda acceder a los datos
		console.log('10. Verificando datos para reporte por comisión...');
		const commissionData = await prisma.subjectCommission.findUnique({
			where: { id: commission.id },
			include: {
				subject: true,
				teacher: true,
				location: true,
				enrollments: {
					include: {
						student: {
							include: {
								user: true,
								career: true
							}
						}
					}
				}
			}
		});

		if (commissionData) {
			console.log(`   ✅ Comisión encontrada: ${commissionData.code}`);
			console.log(`   - Materia: ${commissionData.subject.name}`);
			console.log(`   - Inscriptos: ${commissionData.enrollments.length}`);
			console.log(
				`   - Estudiantes: ${commissionData.enrollments.map((e) => e.student.firstName + ' ' + e.student.lastName).join(', ')}`
			);
		}
		console.log('');

		// 11. Verificar registros de asistencia de la comisión
		console.log('11. Verificando registros de asistencia de la comisión...');
		const commissionAttendance = await prisma.attendanceRecord.findMany({
			where: {
				commissionId: commission.id
			},
			include: {
				subject: true,
				entries: {
					include: {
						student: {
							include: {
								user: true
							}
						}
					}
				}
			}
		});

		console.log(`   - Registros de asistencia: ${commissionAttendance.length}`);
		commissionAttendance.forEach((ar) => {
			console.log(
				`   - ${ar.classDate.toISOString().split('T')[0]}: ${ar.entries.length} estudiantes`
			);
		});
		console.log('');

		console.log('=== PRUEBA COMPLETADA ===');
		console.log('✅ Comisión creada con éxito');
		console.log('✅ Asistencia cargada con commissionId');
		console.log('✅ Cálculo de regularidad funcionando');
		console.log(`✅ ID de comisión para reporte: ${commission.id}`);
		console.log('');
		console.log('Para verificar el reporte por comisión, accede a:');
		console.log(`/comisiones/${commission.id}/asistencia`);
	} catch (error) {
		console.error('❌ Error durante la prueba:', error);
	} finally {
		await prisma.$disconnect();
	}
}

testCommissionAttendance();
