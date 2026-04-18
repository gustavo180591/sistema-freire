import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de comisiones...\n');

    // 1. Buscar materias necesarias
    const subjects = await prisma.subject.findMany({
        where: {
            OR: [
                { code: { contains: 'MAT', mode: 'insensitive' } },
                { code: { contains: 'LEN', mode: 'insensitive' } },
                { name: { contains: 'Matemática', mode: 'insensitive' } },
                { name: { contains: 'Lengua', mode: 'insensitive' } }
            ]
        }
    });

    console.log(`📚 Materias encontradas: ${subjects.length}`);
    subjects.forEach(s => {
        console.log(`   - ${s.name} (${s.code})`);
    });

    // 2. Buscar o crear un ciclo lectivo activo
    let term = await prisma.academicTerm.findFirst({
        where: { active: true },
        orderBy: { year: 'desc' }
    });

    if (!term) {
        const currentYear = new Date().getFullYear();
        term = await prisma.academicTerm.create({
            data: {
                name: 'Ciclo Lectivo',
                year: currentYear,
                startDate: new Date(currentYear, 2, 1), // Marzo 1
                endDate: new Date(currentYear, 11, 31), // Diciembre 31
                active: true
            }
        });
        console.log(`\n📅 Ciclo lectivo creado: ${term.name} ${term.year}`);
    } else {
        console.log(`\n📅 Ciclo lectivo encontrado: ${term.name} ${term.year}`);
    }

    // 3. Obtener carreras para mapear materias
    const careers = await prisma.career.findMany();
    const mateCapioviCareer = careers.find(c => c.code.toLowerCase().includes('matematica') && c.code.toLowerCase().includes('capiovi'));
    const lenguaCapioviCareer = careers.find(c => c.code.toLowerCase().includes('lengua') && c.code.toLowerCase().includes('capiovi'));
    const lenguaAlemCareer = careers.find(c => c.code.toLowerCase().includes('lengua') && c.code.toLowerCase().includes('alem'));

    // Obtener materias vinculadas a planes de estudio de cada carrera
    async function getSubjectsForCareer(careerId: string | undefined, subjectName: string) {
        if (!careerId) return null;
        const planSubjects = await prisma.planSubject.findMany({
            where: {
                plan: { careerId },
                subject: { name: { contains: subjectName, mode: 'insensitive' } }
            },
            include: { subject: true },
            take: 1
        });
        return planSubjects[0]?.subject || null;
    }

    const mateCapiovi = await getSubjectsForCareer(mateCapioviCareer?.id, 'Matemática');
    const lenguaCapiovi = await getSubjectsForCareer(lenguaCapioviCareer?.id, 'Lengua');
    const lenguaAlem = await getSubjectsForCareer(lenguaAlemCareer?.id, 'Lengua');

    // 4. Crear comisiones
    const comisionesConfig = [
        { name: 'A', subject: mateCapiovi, descripcion: 'Matemática - Capioví' },
        { name: 'B', subject: lenguaCapiovi, descripcion: 'Lengua - Capioví' },
        { name: 'C', subject: lenguaAlem, descripcion: 'Lengua - Alem' }
    ];

    for (const config of comisionesConfig) {
        if (!config.subject) {
            console.log(`  ⚠️  No se encontró materia para: ${config.descripcion}`);
            continue;
        }

        // Verificar si ya existe la comisión
        const existing = await prisma.commission.findFirst({
            where: {
                name: config.name,
                subjectId: config.subject.id,
                termId: term.id
            }
        });

        if (existing) {
            console.log(`  ⚠️  Comisión ${config.name} (${config.descripcion}) ya existe`);
            continue;
        }

        // Crear la comisión
        const commission = await prisma.commission.create({
            data: {
                name: config.name,
                subjectId: config.subject.id,
                termId: term.id,
                capacity: 30,
                active: true
            },
            include: {
                subject: true,
                term: true
            }
        });

        console.log(`  ✅ Comisión ${commission.name} creada: ${commission.subject.name} - ${commission.term.name} ${commission.term.year}`);
    }

    console.log('\n✨ Seed de comisiones completado!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
