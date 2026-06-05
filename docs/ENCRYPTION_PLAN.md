# Plan de Encriptación de Datos Sensibles

## Estado: Mejora Posterior Planificada

**Fecha:** Junio 2026  
**Prioridad:** Media  
**Riesgo Controlado:** Sí (acceso restringido, autenticación, roles, permisos y auditoría funcionando)

## Datos Sensibles Identificados

### En Texto Plano Actualmente

**Tabla `User`:**
- `phone` (String, opcional)

**Tabla `Student`:**
- `dni` (String, único, obligatorio)
- `phone` (String, opcional)
- `familyContactPhone` (String, opcional)

**Tabla `Teacher`:**
- `dni` (String, único, obligatorio)

## Estrategia Recomendada: AES-256-GCM

### Algoritmo
- **AES-256-GCM** (Galois/Counter Mode)
- **Ventajas:**
  - Autenticación integrada (detecta manipulaciones)
  - Estándar industrial robusto
  - Soporte nativo en Node.js (crypto module)
  - No requiere cambios en PostgreSQL
  - Clave maestra en variable de entorno

### Implementación Técnica

#### 1. Variables de Entorno Requeridas

```bash
# .env
ENCRYPTION_KEY=your-256-bit-hex-key-here
ENCRYPTION_KEY_IV=your-96-bit-hex-iv-here
```

#### 2. Módulo de Encriptación

```typescript
// src/lib/server/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recomendado para GCM)
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(text: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
  const iv = Buffer.from(process.env.ENCRYPTION_KEY_IV || '', 'hex');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
  
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

#### 3. Script de Migración

```typescript
// scripts/migrate-sensitive-data.ts
import { prisma } from '$lib/server/db/prisma';
import { encrypt } from '$lib/server/encryption';

async function migrate() {
  console.log('Iniciando migración de datos sensibles...');
  
  // Migrar Student.dni y Student.phone
  const students = await prisma.student.findMany();
  for (const student of students) {
    if (student.dni && !student.dni.includes(':')) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          dni: encrypt(student.dni),
          phone: student.phone ? encrypt(student.phone) : null,
          familyContactPhone: student.familyContactPhone ? encrypt(student.familyContactPhone) : null
        }
      });
    }
  }
  
  // Migrar Teacher.dni
  const teachers = await prisma.teacher.findMany();
  for (const teacher of teachers) {
    if (teacher.dni && !teacher.dni.includes(':')) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { dni: encrypt(teacher.dni) }
      });
    }
  }
  
  // Migrar User.phone
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (user.phone && !user.phone.includes(':')) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: encrypt(user.phone) }
      });
    }
  }
  
  console.log('Migración completada');
}

migrate().catch(console.error);
```

#### 4. Modificación de Puntos de Escritura

**Archivos a modificar:**
- `src/routes/(app)/usuarios/nuevo/+page.server.ts` - Encriptar al crear
- `src/routes/(app)/usuarios/[id]/editar/+page.server.ts` - Encriptar al actualizar

**Ejemplo:**
```typescript
import { encrypt } from '$lib/server/encryption';

// Al crear estudiante
await tx.student.create({
  data: {
    dni: encrypt(dni),
    phone: phone ? encrypt(phone) : null,
    // ... otros campos
  }
});
```

#### 5. Modificación de Puntos de Lectura

**Archivos a modificar:**
- `src/routes/(app)/alumnos/+page.server.ts` - Desencriptar al listar
- `src/routes/(app)/docente/+page.server.ts` - Desencriptar al listar
- Cualquier reporte o exportación

**Ejemplo:**
```typescript
import { decrypt } from '$lib/server/encryption';

const students = await prisma.student.findMany();
const decryptedStudents = students.map(s => ({
  ...s,
  dni: decrypt(s.dni),
  phone: s.phone ? decrypt(s.phone) : null
}));
```

#### 6. Búsquedas por DNI

Las búsquedas por DNI requieren encriptar el valor de búsqueda:

```typescript
const searchDni = encrypt(formData.get('dni')?.toString());
const student = await prisma.student.findUnique({
  where: { dni: searchDni }
});
```

## Plan de Ejecución

### Fase 1: Preparación (Sin tocar datos)
- [ ] Crear módulo `src/lib/server/encryption.ts`
- [ ] Agregar variables de entorno `ENCRYPTION_KEY` y `ENCRYPTION_KEY_IV`
- [ ] Generar claves seguras con `openssl rand -hex 32` y `openssl rand -hex 12`
- [ ] Documentar el proceso

### Fase 2: Backup Obligatorio
- [ ] Backup completo de la base de datos PostgreSQL
- [ ] Verificar integridad del backup
- [ ] Almacenar backup en ubicación segura
- [ ] Documentar procedimiento de rollback

### Fase 3: Implementación Gradual
- [ ] Modificar puntos de escritura para encriptar
- [ ] Modificar puntos de lectura para desencriptar
- [ ] Actualizar búsquedas por DNI
- [ ] Actualizar validaciones de unicidad

### Fase 4: Migración de Datos
- [ ] Ejecutar script de migración en ambiente de desarrollo
- [ ] Verificar que todos los datos se encriptaron correctamente
- [ ] Probar operaciones CRUD completas
- [ ] Probar búsquedas por DNI
- [ ] Probar reportes y exportaciones

### Fase 5: Validación en Producción
- [ ] Ejecutar backup de producción
- [ ] Desplegar cambios en horario de bajo tráfico
- [ ] Monitorear logs de errores
- [ ] Verificar que todas las operaciones funcionan
- [ ] Tener plan de rollback listo

### Fase 6: Limpieza
- [ ] Eliminar datos en texto plano de backups antiguos
- [ ] Rotar claves de encriptación (opcional, futuro)
- [ ] Documentar procedimiento de rotación de claves

## Riesgos y Mitigaciones

### Riesgos

1. **Pérdida de datos si la clave maestra se pierda**
   - **Mitigación:** Almacenar clave en múltiples lugares seguros (secret manager, archivo encriptado offline)

2. **Impacto en rendimiento**
   - **Mitigación:** Caching de datos desencriptados frecuentes, benchmarking antes de deploy

3. **Complejidad en búsquedas**
   - **Mitigación:** Encriptar valor de búsqueda, índices en datos encriptados (limitado)

4. **Error en migración**
   - **Mitigación:** Backup obligatorio antes de migración, script de rollback

5. **Problemas con unicidad de DNI**
   - **Mitigación:** Mantener índice único en datos encriptados, pruebas exhaustivas

## Pruebas Requeridas

### Unitarias
- [ ] Test de encriptación/desencriptación
- [ ] Test de integridad (autenticación GCM)
- [ ] Test de manejo de errores

### Integración
- [ ] Test de creación de usuario con DNI encriptado
- [ ] Test de actualización de usuario con phone encriptado
- [ ] Test de búsqueda por DNI encriptado
- [ ] Test de listado de alumnos con desencriptación
- [ ] Test de reportes con datos desencriptados

### End-to-End
- [ ] Flujo completo de alta de alumno
- [ ] Flujo completo de búsqueda de alumno por DNI
- [ ] Flujo completo de exportación de datos
- [ ] Verificación de unicidad de DNI

## Rollback Plan

Si algo falla durante la migración:

1. **Detener la aplicación**
2. **Restaurar backup de PostgreSQL**
3. **Revertir cambios en código**
4. **Reiniciar la aplicación**
5. **Verificar funcionamiento**

## Decisiones Pendientes

- **¿Encriptar también otros campos?** (address, postalCode, etc.)
- **¿Usar encriptación a nivel de DB (PostgreSQL pgcrypto)?** (alternativa)
- **¿Rotación de claves?** (frecuencia, procedimiento)
- **¿Backup de claves?** (secret manager, archivo offline)

## Referencias

- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [AES-GCM Best Practices](https://tools.ietf.org/html/rfc5116)
- [OWASP Encryption Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Encryption_Cheat_Sheet.html)
