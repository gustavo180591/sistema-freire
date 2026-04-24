import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixUser() {
  const user = await prisma.user.findUnique({ 
    where: { email: 'gustavo.faccendini@gmail.com' } 
  });
  
  if (!user) {
    console.log('Usuario NO existe. Creando...');
    const hash = await bcrypt.hash('$Gustavo1805', 10);
    
    // Buscar rol SUPERADMIN
    let role = await prisma.role.findFirst({ where: { code: 'SUPERADMIN' } });
    
    // Si no existe, crearlo
    if (!role) {
      role = await prisma.role.create({
        data: {
          code: 'SUPERADMIN',
          name: 'Super Administrador'
        }
      });
      console.log('Rol SUPERADMIN creado');
    }
    
    const newUser = await prisma.user.create({
      data: {
        email: 'gustavo.faccendini@gmail.com',
        passwordHash: hash,
        firstName: 'Gustavo',
        lastName: 'Faccendini',
        roles: {
          create: {
            role: {
              connect: { id: role.id }
            }
          }
        }
      }
    });
    console.log('✅ Usuario creado:', newUser.email);
  } else {
    console.log('Usuario existe, actualizando contraseña...');
    const hash = await bcrypt.hash('$Gustavo1805', 10);
    await prisma.user.update({
      where: { email: 'gustavo.faccendini@gmail.com' },
      data: { passwordHash: hash }
    });
    console.log('✅ Contraseña actualizada');
  }
}

fixUser()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
