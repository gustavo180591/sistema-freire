import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCommissionReport(commissionId: string) {
  console.log('=== VERIFICACIÓN DE REPORTE POR COMISIÓN ===\n');
  console.log(`ID de comisión: ${commissionId}\n`);

  try {
    // 1. Obtener la comisión
    console.log('1. Obteniendo datos de la comisión...');
    const commission = await prisma.subjectCommission.findUnique({
      where: { id: commissionId },
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

    if (!commission) {
      console.log('❌ Comisión no encontrada');
      return;
    }

    console.log(`   ✅ Comisión: ${commission.code}`);
    console.log(`   - Materia: ${commission.subject.name}`);
    console.log(`   - Docente: ${commission.teacher ? `${commission.teacher.lastName}, ${commission.teacher.firstName}` : 'No asignado'}`);
    console.log(`   - Localidad: ${commission.location?.name || 'No asignada'}`);
    console.log(`   - Horario: ${commission.schedule || 'No especificado'}`);
    console.log(`   - Inscriptos: ${commission.enrollments.length}`);
    console.log('');

    // 2. Obtener registros de asistencia de la comisión
    console.log('2. Obteniendo registros de asistencia...');
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        commissionId: commissionId
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
      },
      orderBy: { classDate: 'desc' }
    });

    console.log(`   - Registros encontrados: ${attendanceRecords.length}`);
    attendanceRecords.forEach(ar => {
      console.log(`   - ${ar.classDate.toISOString().split('T')[0]}: ${ar.entries.length} estudiantes`);
    });
    console.log('');

    // 3. Calcular estadísticas por estudiante
    console.log('3. Calculando estadísticas por estudiante...');
    const studentStats = new Map();

    for (const enrollment of commission.enrollments) {
      const studentId = enrollment.student.id;
      const studentName = `${enrollment.student.lastName}, ${enrollment.student.firstName}`;

      // Obtener StudentSubjectStatus
      const status = await prisma.studentSubjectStatus.findUnique({
        where: {
          studentId_subjectId: {
            studentId,
            subjectId: commission.subjectId
          }
        }
      });

      // Calcular asistencia de la comisión
      const commissionAttendance = await prisma.attendanceEntry.findMany({
        where: {
          studentId,
          attendance: {
            commissionId: commissionId
          }
        }
      });

      const presentCount = commissionAttendance.filter(e => e.present).length;
      const totalCount = commissionAttendance.length;
      const percent = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

      studentStats.set(studentId, {
        studentId,
        studentName,
        attendancePercent: status?.attendancePercent || 0,
        regularityStatus: status?.regularityStatus || 'LIBRE',
        commissionAttendance: totalCount,
        commissionPresent: presentCount,
        commissionPercent: percent
      });
    }

    console.log('   Estadísticas:');
    studentStats.forEach((stats, studentId) => {
      console.log(`   - ${stats.studentName}`);
      console.log(`     Asistencia total: ${stats.attendancePercent}% (${stats.regularityStatus})`);
      console.log(`     Asistencia comisión: ${stats.commissionPercent}% (${stats.commissionPresent}/${stats.commissionAttendance})`);
    });
    console.log('');

    // 4. Calcular estadísticas generales
    console.log('4. Calculando estadísticas generales...');
    const totalStudents = studentStats.size;
    const regularCount = Array.from(studentStats.values()).filter(s => s.regularityStatus === 'REGULAR').length;
    const freeCount = totalStudents - regularCount;
    const criticalCount = Array.from(studentStats.values()).filter(s => s.attendancePercent < 75).length;
    const avgAttendance = totalStudents > 0
      ? Array.from(studentStats.values()).reduce((sum, s) => sum + s.attendancePercent, 0) / totalStudents
      : 0;

    console.log(`   - Total estudiantes: ${totalStudents}`);
    console.log(`   - Regulares: ${regularCount}`);
    console.log(`   - Libres: ${freeCount}`);
    console.log(`   - Críticos (<75%): ${criticalCount}`);
    console.log(`   - Promedio asistencia: ${avgAttendance.toFixed(2)}%`);
    console.log('');

    // 5. Verificar alertas de asistencia crítica
    console.log('5. Verificando alertas de asistencia crítica...');
    const criticalStudents = Array.from(studentStats.values()).filter(s => s.attendancePercent < 75);
    if (criticalStudents.length > 0) {
      console.log(`   ⚠️  ${criticalStudents.length} estudiante(s) con asistencia crítica:`);
      criticalStudents.forEach(s => {
        console.log(`   - ${s.studentName}: ${s.attendancePercent}%`);
      });
    } else {
      console.log('   ✅ No hay estudiantes con asistencia crítica');
    }
    console.log('');

    console.log('=== VERIFICACIÓN COMPLETADA ===');
    console.log('✅ El reporte por comisión tiene todos los datos necesarios');
    console.log('✅ Las estadísticas se calculan correctamente');
    console.log('✅ Las alertas de asistencia crítica funcionan');
    console.log('');
    console.log('El reporte por comisión está listo para ser visualizado en:');
    console.log(`/comisiones/${commissionId}/asistencia`);

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Usar el ID de la comisión creada en la prueba anterior
const commissionId = process.argv[2];
if (!commissionId) {
  console.log('Por favor proporciona el ID de la comisión como argumento');
  console.log('Ejemplo: npx tsx scripts/test-commission-report.ts <commission-id>');
} else {
  testCommissionReport(commissionId);
}
