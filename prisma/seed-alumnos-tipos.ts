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

    for (const career of careers) {
        console.log(`\n🎓 Procesando carrera: ${career.name} (${career.code})`);

        // Crear 3 tipos de alumnos para esta carrera
        const tiposAlumno = [
            { 
                tipo: 'Normal', 
                isBecado: false, 
                isRecursante: false,
                firstName: 'Juan',
                lastName: 'Pérez'
            },
            { 
                tipo: 'Becado', 
                isBecado: true, 
                isRecursante: false,
                firstName: 'María',
                lastName: 'González'
            },
            { 
                tipo: 'Recursante', 
                isBecado: false, 
                isRecursante: true,
                firstName: 'Carlos',
                lastName: 'Rodríguez'
            }
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

                console.log(`  ✅ Alumno ${tipo.tipo} creado: ${tipo.firstName} ${tipo.lastName} (DNI: ${dni})`);
            } catch (error) {
                console.error(`  ❌ Error creando alumno ${tipo.tipo}:`, error);
            }
        }
    }

    console.log('\n✨ Seed completado!');
    console.log('\n📋 Resumen:');
    console.log(`   • Rol PRECEPTOR creado/verificado`);
    console.log(`   • ${careers.length} carreras procesadas`);
    console.log(`   • Hasta 3 alumnos por carrera (Normal, Becado, Recursante)`);
    console.log(`\n🔑 Contraseña por defecto para todos los alumnos: password123`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
