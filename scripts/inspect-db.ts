import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDatabase() {
  console.log('=== INSPECCIÓN DE BASE DE DATOS (SOLO LECTURA) ===\n');

  try {
    // 1. Obtener todas las tablas usando query raw
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    console.log('=== TABLAS EXISTENTES ===');
    console.log(`Total de tablas: ${tables.length}`);
    tables.forEach(t => console.log(`  - ${t.tablename}`));
    console.log('');

    // 2. Contar registros en tablas clave
    const keyTables = [
      'users',
      'students',
      'teachers',
      'subjects',
      'careers',
      'attendance_records',
      'attendance_entries',
      'subject_teachers',
      'subject_commissions',
      'subject_enrollments',
      'academic_terms',
      'student_subject_status',
      'grades',
      '_prisma_migrations'
    ];

    console.log('=== REGISTROS POR TABLA CLAVE ===');
    for (const table of keyTables) {
      try {
        const tableName = table.replace(/"/g, '');
        const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM "${tableName}"`
        );
        const count = result[0]?.count?.toString() || '0';
        console.log(`  ${table}: ${count} registros`);
      } catch (error: any) {
        console.log(`  ${table}: [ERROR - ${error.code || 'UNKNOWN'}]`);
      }
    }
    console.log('');

    // 3. Verificar migraciones aplicadas
    console.log('=== MIGRACIONES APLICADAS ===');
    try {
      const migrations = await prisma.$queryRawUnsafe<Array<{ migration_name: string; started_at: Date }>>(
        `SELECT migration_name, started_at FROM "_prisma_migrations" ORDER BY started_at`
      );
      console.log(`Total migraciones aplicadas: ${migrations.length}`);
      migrations.forEach(m => {
        console.log(`  - ${m.migration_name} (${m.started_at.toISOString()})`);
      });
    } catch (error: any) {
      console.log(`  [No se pudo leer _prisma_migrations - ${error.code}]`);
    }
    console.log('');

    // 4. Verificar modelos específicos
    console.log('=== VERIFICACIÓN DE MODELOS ESPECÍFICOS ===');
    
    const models = [
      { name: 'SubjectCommission', table: 'subject_commissions' },
      { name: 'SubjectEnrollment', table: 'subject_enrollments' },
      { name: 'AcademicTerm', table: 'academic_terms' },
      { name: 'SubjectTeacher', table: 'subject_teachers' },
      { name: 'AttendanceRecord', table: 'attendance_records' },
      { name: 'AttendanceEntry', table: 'attendance_entries' }
    ];

    for (const model of models) {
      try {
        const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM "${model.table}"`
        );
        const count = result[0]?.count?.toString() || '0';
        const exists = tables.some(t => t.tablename === model.table);
        console.log(`  ${model.name} (${model.table}): ${exists ? 'EXISTS' : 'NOT IN SCHEMA'} - ${count} registros`);
      } catch (error: any) {
        console.log(`  ${model.name} (${model.table}): ERROR - ${error.code}`);
      }
    }
    console.log('');

    // 5. Muestra de datos en tablas clave
    console.log('=== MUESTRA DE DATOS (primeros 3 registros) ===');
    
    try {
      const users = await prisma.$queryRawUnsafe<Array<{ id: string; email: string; roles: string[] }>>(
        `SELECT id, email, roles FROM "users" LIMIT 3`
      );
      console.log('Users:');
      users.forEach((u) => console.log(`  - ${u.email} (${u.roles})`));
    } catch (error: any) {
      console.log(`  [No se pudo leer users - ${error.code}]`);
    }
    console.log('');

    try {
      const students = await prisma.$queryRawUnsafe<Array<{ id: string; firstName: string; lastName: string; dni: string; status: string }>>(
        `SELECT id, "firstName", "lastName", dni, status FROM "students" LIMIT 3`
      );
      console.log('Students:');
      students.forEach((s) => console.log(`  - ${s.firstName} ${s.lastName} (${s.dni}) - ${s.status}`));
    } catch (error: any) {
      console.log(`  [No se pudo leer students - ${error.code}]`);
    }
    console.log('');

    try {
      const attendance = await prisma.$queryRawUnsafe<Array<{ id: string; subjectId: string; classDate: Date; createdByUserId: string; commissionId: string | null }>>(
        `SELECT id, "subjectId", "classDate", "createdByUserId", "commissionId" FROM "attendance_records" LIMIT 3`
      );
      console.log('Attendance Records:');
      attendance.forEach((a) => console.log(`  - ${a.id} | ${a.subjectId} | ${a.classDate} | commissionId: ${a.commissionId}`));
    } catch (error: any) {
      console.log(`  [No se pudo leer attendance_records - ${error.code}]`);
    }
    console.log('');

    // 6. Verificar estructura de attendance_records
    console.log('=== ESTRUCTURA DE attendance_records ===');
    try {
      const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string; is_nullable: string }>>(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'attendance_records' ORDER BY ordinal_position`
      );
      columns.forEach((col) => console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`));
    } catch (error: any) {
      console.log(`  [No se pudo leer estructura - ${error.code}]`);
    }
    console.log('');

    // 7. Verificar constraints de attendance_records
    console.log('=== CONSTRAINTS DE attendance_records ===');
    try {
      const constraints = await prisma.$queryRawUnsafe<Array<{ constraint_name: string; constraint_type: string }>>(
        `SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'attendance_records'`
      );
      constraints.forEach((c) => console.log(`  - ${c.constraint_name}: ${c.constraint_type}`));
    } catch (error: any) {
      console.log(`  [No se pudo leer constraints - ${error.code}]`);
    }
    console.log('');

    // 8. Verificar índices únicos de attendance_records
    console.log('=== ÍNDICES ÚNICOS DE attendance_records ===');
    try {
      const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string; indexdef: string }>>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'attendance_records' AND (indexname LIKE '%unique%' OR indexdef LIKE '%UNIQUE%')`
      );
      indexes.forEach((i) => console.log(`  - ${i.indexname}: ${i.indexdef}`));
    } catch (error: any) {
      console.log(`  [No se pudo leer índices - ${error.code}]`);
    }
    console.log('');

  } catch (error) {
    console.error('Error durante inspección:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();
