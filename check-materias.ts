import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('🔍 Verificando materias en la base de datos...\n');
  
  const count = await prisma.subject.count();
  console.log(`Total de materias: ${count}`);
  
  if (count > 0) {
    const subjects = await prisma.subject.findMany({
      take: 5,
      select: {
        id: true,
        code: true,
        name: true,
        subjectType: true,
        trainingField: true,
        yearLevel: true,
      }
    });
    
    console.log('\nPrimeras 5 materias:');
    subjects.forEach(s => {
      console.log(`  - ${s.code}: ${s.name} (Tipo: ${s.subjectType}, Campo: ${s.trainingField}, Año: ${s.yearLevel})`);
    });
  }
  
  const careerCount = await prisma.career.count();
  console.log(`\nTotal de carreras: ${careerCount}`);
  
  const correlatives = await prisma.subjectCorrelative.count();
  console.log(`Total de correlativas: ${correlatives}`);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
