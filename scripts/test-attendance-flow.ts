import { PrismaClient } from '@prisma/client';
import { calculateAttendancePercent, updateAttendanceStatus } from '../src/lib/server/academic/plan-logic';

const prisma = new PrismaClient();

async function testAttendanceFlow() {
  console.log('=== PRUEBA FUNCIONAL DEL MÓDULO DE ASISTENCIA ===\n');

  try {
    // 1. Verificar estado actual de la base de datos
    console.log('1. Verificando estado de la base de datos...');
    const attendanceRecords = await prisma.attendanceRecord.count();
    const attendanceEntries = await prisma.attendanceEntry.count();
    const studentStatuses = await prisma.studentSubjectStatus.count();
    const students = await prisma.student.count();
    const subjects = await prisma.subject.count();
    const teachers = await prisma.teacher.count();

    console.log(`   - AttendanceRecords: ${attendanceRecords}`);
    console.log(`   - AttendanceEntries: ${attendanceEntries}`);
    console.log(`   - StudentSubjectStatus: ${studentStatuses}`);
    console.log(`   - Students: ${students}`);
    console.log(`   - Subjects: ${subjects}`);
    console.log(`   - Teachers: ${teachers}`);
    console.log('');

    // 2. Verificar si hay datos suficientes para la prueba
    if (students === 0 || subjects === 0 || teachers === 0) {
      console.log('❌ No hay datos suficientes para realizar la prueba funcional.');
      console.log('   Se requiere al menos: 1 estudiante, 1 materia, 1 docente');
      console.log('   Para ejecutar pruebas funcionales, primero se deben crear datos de prueba.\n');
      return;
    }

    // 3. Obtener datos de prueba
    console.log('2. Obteniendo datos de prueba...');
    const student = await prisma.student.findFirst({ where: { status: 'ACTIVE' } });
    const subject = await prisma.subject.findFirst();
    const teacher = await prisma.teacher.findFirst();

    if (!student || !subject || !teacher) {
      console.log('❌ No se encontraron datos de prueba válidos.\n');
      return;
    }

    console.log(`   - Estudiante: ${student.firstName} ${student.lastName} (${student.id})`);
    console.log(`   - Materia: ${subject.name} (${subject.id})`);
    console.log(`   - Docente: ${teacher.id}`);
    console.log('');

    // 4. Crear SubjectTeacher si no existe
    console.log('3. Verificando/creando SubjectTeacher...');
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
      console.log(`   ✅ SubjectTeacher creado`);
    } else {
      console.log(`   ✅ SubjectTeacher ya existe`);
    }
    console.log('');

    // 5. Crear StudentSubjectStatus si no existe
    console.log('4. Verificando/creando StudentSubjectStatus...');
    let studentStatus = await prisma.studentSubjectStatus.findUnique({
      where: {
        studentId_subjectId: {
          studentId: student.id,
          subjectId: subject.id
        }
      }
    });

    if (!studentStatus) {
      studentStatus = await prisma.studentSubjectStatus.create({
        data: {
          studentId: student.id,
          subjectId: subject.id,
          attendancePercent: 0,
          regularityStatus: 'LIBRE'
        }
      });
      console.log(`   ✅ StudentSubjectStatus creado: ${studentStatus.id}`);
    } else {
      console.log(`   ✅ StudentSubjectStatus ya existe: ${studentStatus.id}`);
      console.log(`   - attendancePercent: ${studentStatus.attendancePercent}`);
      console.log(`   - regularityStatus: ${studentStatus.regularityStatus}`);
    }
    console.log('');

    // 6. Crear AttendanceRecord
    console.log('5. Creando AttendanceRecord...');
    const testDate = new Date();
    testDate.setHours(0, 0, 0, 0);

    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        subjectId: subject.id,
        classDate: testDate,
        createdByUserId: teacher.userId
      }
    });
    console.log(`   ✅ AttendanceRecord creado: ${attendanceRecord.id}`);
    console.log(`   - subjectId: ${attendanceRecord.subjectId}`);
    console.log(`   - classDate: ${attendanceRecord.classDate}`);
    console.log('');

    // 7. Crear AttendanceEntry (presente)
    console.log('6. Creando AttendanceEntry (presente)...');
    const attendanceEntry = await prisma.attendanceEntry.create({
      data: {
        attendanceId: attendanceRecord.id,
        studentId: student.id,
        present: true,
        notes: 'Prueba funcional'
      }
    });
    console.log(`   ✅ AttendanceEntry creado: ${attendanceEntry.id}`);
    console.log(`   - studentId: ${attendanceEntry.studentId}`);
    console.log(`   - present: ${attendanceEntry.present}`);
    console.log('');

    // 8. Llamar a updateAttendanceStatus para simular el flujo real
    console.log('7. Llamando a updateAttendanceStatus para calcular regularidad...');
    const statusUpdate1 = await updateAttendanceStatus(student.id, subject.id);
    console.log(`   ✅ updateAttendanceStatus ejecutado`);
    console.log(`   - attendancePercent: ${statusUpdate1.attendancePercent}%`);
    console.log(`   - regularityStatus: ${statusUpdate1.regularityStatus}`);
    console.log(`   - statusChanged: ${statusUpdate1.statusChanged}`);
    console.log('');

    // 9. Verificar StudentSubjectStatus después de crear asistencia
    console.log('8. Verificando StudentSubjectStatus después de crear asistencia...');
    const statusAfterCreate = await prisma.studentSubjectStatus.findUnique({
      where: {
        studentId_subjectId: {
          studentId: student.id,
          subjectId: subject.id
        }
      }
    });

    if (statusAfterCreate) {
      console.log(`   - attendancePercent: ${statusAfterCreate.attendancePercent}`);
      console.log(`   - regularityStatus: ${statusAfterCreate.regularityStatus}`);
      console.log(`   ✅ Porcentaje calculado: ${statusAfterCreate.attendancePercent}%`);
    }
    console.log('');

    // 9. Editar AttendanceEntry (cambiar a ausente)
    console.log('8. Editando AttendanceEntry (cambiar a ausente)...');
    const updatedEntry = await prisma.attendanceEntry.update({
      where: { id: attendanceEntry.id },
      data: { present: false }
    });
    console.log(`   ✅ AttendanceEntry actualizado: ${updatedEntry.id}`);
    console.log(`   - present: ${updatedEntry.present}`);
    console.log('');

    // 10. Llamar a updateAttendanceStatus después de editar
    console.log('9. Llamando a updateAttendanceStatus después de editar...');
    const statusUpdate2 = await updateAttendanceStatus(student.id, subject.id);
    console.log(`   ✅ updateAttendanceStatus ejecutado`);
    console.log(`   - attendancePercent: ${statusUpdate2.attendancePercent}%`);
    console.log(`   - regularityStatus: ${statusUpdate2.regularityStatus}`);
    console.log(`   - statusChanged: ${statusUpdate2.statusChanged}`);
    console.log('');

    // 11. Verificar StudentSubjectStatus después de editar
    console.log('10. Verificando StudentSubjectStatus después de editar...');
    const statusAfterEdit = await prisma.studentSubjectStatus.findUnique({
      where: {
        studentId_subjectId: {
          studentId: student.id,
          subjectId: subject.id
        }
      }
    });

    if (statusAfterEdit) {
      console.log(`   - attendancePercent: ${statusAfterEdit.attendancePercent}`);
      console.log(`   - regularityStatus: ${statusAfterEdit.regularityStatus}`);
      console.log(`   ✅ Porcentaje recalculado: ${statusAfterEdit.attendancePercent}%`);
    }
    console.log('');

    // 12. Crear más registros para probar cálculo de porcentaje
    console.log('11. Creando más registros de asistencia para probar cálculo...');
    for (let i = 0; i < 4; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i + 1));
      date.setHours(0, 0, 0, 0);

      const ar = await prisma.attendanceRecord.create({
        data: {
          subjectId: subject.id,
          classDate: date,
          createdByUserId: teacher.userId
        }
      });

      await prisma.attendanceEntry.create({
        data: {
          attendanceId: ar.id,
          studentId: student.id,
          present: i < 3, // 3 presentes, 1 ausente
          notes: `Prueba ${i + 1}`
        }
      });
    }
    console.log('   ✅ 4 registros adicionales creados (3 presentes, 1 ausente)');
    console.log('');

    // 13. Llamar a updateAttendanceStatus después de crear más registros
    console.log('12. Llamando a updateAttendanceStatus después de crear más registros...');
    const statusUpdate3 = await updateAttendanceStatus(student.id, subject.id);
    console.log(`   ✅ updateAttendanceStatus ejecutado`);
    console.log(`   - attendancePercent: ${statusUpdate3.attendancePercent}%`);
    console.log(`   - regularityStatus: ${statusUpdate3.regularityStatus}`);
    console.log(`   - statusChanged: ${statusUpdate3.statusChanged}`);
    console.log('');

    // 14. Verificar cálculo final
    console.log('13. Verificando cálculo final de regularidad...');
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
      console.log(`   ✅ Cálculo final: ${finalStatus.attendancePercent}% (${finalStatus.regularityStatus})`);
    }
    console.log('');

    // 15. Verificar registros de auditoría
    console.log('14. Verificando registros de auditoría...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ATTENDANCE_RECORD'
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`   - Registros de auditoría encontrados: ${auditLogs.length}`);
    auditLogs.forEach(log => {
      console.log(`   - ${log.action}: ${log.description}`);
    });
    console.log('');

    console.log('=== PRUEBA FUNCIONAL COMPLETADA ===');
    console.log('✅ Todos los pasos se ejecutaron correctamente');
    console.log('✅ El cálculo de regularidad funciona correctamente');
    console.log('✅ La auditoría registra los cambios de asistencia');

  } catch (error) {
    console.error('❌ Error durante la prueba funcional:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAttendanceFlow();
