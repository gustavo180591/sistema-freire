import { PrismaClient, RoleCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de alumnos por tipo...\n');

    // 1. Crear rol PRECEPTOR si no existe
    const preceptorRole = await prisma.role.upsert({
        where: { code: RoleCode.PRECEPTOR },
        update: {},
        create: {
            code: RoleCode.PRECEPTOR,
            name: 'Preceptor'
        }
    });
    console.log(`✅ Rol PRECEPTOR asegurado: ${preceptorRole.name}`);

    // 2. Obtener rol ALUMNO
    const alumnoRole = await prisma.role.findUnique({
        where: { code: RoleCode.ALUMNO }
    });

    if (!alumnoRole) {
        throw new Error('Rol ALUMNO no encontrado');
    }

    // 3. Obtener todas las carreras
    const careers = await prisma.career.findMany();
    console.log(`\n📚 Se encontraron ${careers.length} carreras`);

    const defaultPassword = await bcrypt.hash('password123', 10);

    // Nombres para generar alumnos variados
    const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Laura', 'Pedro', 'Sofía', 'Diego', 'Valentina', 'Martín', 'Lucía'];
    const apellidos = ['Pérez', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'García', 'Sánchez', 'Torres', 'Ramírez', 'Flores', 'Rivera'];

    for (const career of careers) {
        console.log(`\n🎓 Procesando carrera: ${career.name} (${career.code})`);

        // Crear al menos un alumno por año (1-4)
        for (let year = 1; year <= 4; year++) {
            const nombreIndex = (year - 1) % nombres.length;
            const apellidoIndex = (year - 1) % apellidos.length;
            
            const tipoAlumno = {
                tipo: year === 1 ? 'Normal' : year === 2 ? 'Becado' : year === 3 ? 'Recursante' : 'Normal',
                isBecado: year === 2,
                isRecursante: year === 3,
                firstName: nombres[nombreIndex],
                lastName: apellidos[apellidoIndex],
                year: year
            };

            const email = `${tipoAlumno.firstName.toLowerCase()}.${tipoAlumno.lastName.toLowerCase()}.year${year}.${career.code.toLowerCase()}@instituto.edu`.replace(/[^a-z0-9.@]/g, '');
            const dni = `${Math.floor(10000000 + Math.random() * 90000000)}`;

            try {
                // Verificar si ya existe un usuario con este email
                const existingUser = await prisma.user.findUnique({
                    where: { email }
                });

                if (existingUser) {
                    console.log(`  ⚠️  Alumno año ${year} ya existe: ${email}`);
                    continue;
                }

                // Crear usuario
                const user = await prisma.user.create({
                    data: {
                        email,
                        passwordHash: defaultPassword,
                        firstName: tipoAlumno.firstName,
                        lastName: tipoAlumno.lastName,
                        status: 'ACTIVE',
                        roles: {
                            create: {
                                roleId: alumnoRole.id
                            }
                        }
                    }
                });

                // Crear estudiante
                const student = await prisma.student.create({
                    data: {
                        userId: user.id,
                        dni,
                        firstName: tipoAlumno.firstName,
                        lastName: tipoAlumno.lastName,
                        careerId: career.id,
                        currentYear: tipoAlumno.year,
                        isBecado: tipoAlumno.isBecado,
                        isRecursante: tipoAlumno.isRecursante,
                        status: 'ACTIVE'
                    }
                });

                console.log(`  ✅ Año ${year}: ${tipoAlumno.firstName} ${tipoAlumno.lastName} (${tipoAlumno.tipo}) - DNI: ${dni}`);
            } catch (error) {
                console.error(`  ❌ Error creando alumno año ${year}:`, error);
            }
        }

        // También crear los 3 tipos especiales adicionales si no existen
        console.log(`  📌 Creando tipos adicionales...`);
        const tiposAlumno = [
            { tipo: 'Normal Extra', isBecado: false, isRecursante: false, firstName: 'Extra', lastName: 'Normal' },
            { tipo: 'Becado Extra', isBecado: true, isRecursante: false, firstName: 'Extra', lastName: 'Becado' },
            { tipo: 'Recursante Extra', isBecado: false, isRecursante: true, firstName: 'Extra', lastName: 'Recursante' }
        ];

        for (const tipo of tiposAlumno) {
            const email = `${tipo.firstName.toLowerCase()}.${tipo.lastName.toLowerCase()}.${career.code.toLowerCase()}@instituto.edu`.replace(/[^a-z0-9.@]/g, '');
            const dni = `${Math.floor(10000000 + Math.random() * 90000000)}`;

            try {
                // Verificar si ya existe un usuario con este email
                const existingUser = await prisma.user.findUnique({
                    where: { email }
                });

                if (existingUser) {
                    console.log(`  ⚠️  Alumno ${tipo.tipo} ya existe: ${email}`);
                    continue;
                }

                // Crear usuario
                const user = await prisma.user.create({
                    data: {
                        email,
                        passwordHash: defaultPassword,
                        firstName: tipo.firstName,
                        lastName: tipo.lastName,
                        status: 'ACTIVE',
                        roles: {
                            create: {
                                roleId: alumnoRole.id
                            }
                        }
                    }
                });

                // Crear estudiante
                const student = await prisma.student.create({
                    data: {
                        userId: user.id,
                        dni,
                        firstName: tipo.firstName,
                        lastName: tipo.lastName,
                        careerId: career.id,
                        isBecado: tipo.isBecado,
                        isRecursante: tipo.isRecursante,
                        status: 'ACTIVE'
                    }
                });

                console.log(`     ${tipo.tipo}: ${tipo.firstName} ${tipo.lastName} (Año 1)`);
            } catch (error) {
                console.error(`     ❌ Error creando ${tipo.tipo}:`, error);
            }
        }
    }

    console.log('\n✨ Seed completado!');
    console.log('\n📋 Resumen:');
    console.log(`   • Rol PRECEPTOR creado/verificado`);
    console.log(`   • ${careers.length} carreras procesadas`);
    console.log(`   • 4+ alumnos por carrera (1 por año + 3 tipos)`);
    console.log(`   • Campo currentYear agregado a Student`);
    console.log(`\n🔑 Contraseña por defecto: password123`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
