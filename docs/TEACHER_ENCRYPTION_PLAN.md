# Plan de Protección de Datos Sensibles - Módulo Docentes

## Estado Actual

**Infraestructura de Encriptación:** ✅ DISPONIBLE

La infraestructura de encriptación AES-256-GCM ya está implementada en el sistema como parte del Módulo de Gestión de Alumnos:

- **Módulo de encriptación:** `src/lib/server/encryption.ts`
- **Script de migración:** `prisma/migrate-encryption.ts`
- **Script de rollback:** `prisma/rollback-encryption.ts`
- **Variables de entorno:** `ENCRYPTION_KEY` y `ENCRYPTION_KEY_IV` (documentadas en `.env.example`)

## Datos Sensibles del Módulo Docentes

Los siguientes datos del modelo `Teacher` son sensibles y deberían encriptarse:

1. **DNI** - Actualmente en texto plano en `Teacher.dni`
2. **Teléfono** - No existe actualmente en el modelo Teacher (usa User.phone si está disponible)

## Plan de Implementación

### Fase 1: Preparación
1. **Backup de datos**
   - Exportar tabla `teachers` a JSON
   - Verificar integridad del backup
   - Guardar backup en ubicación segura

2. **Configuración de variables de entorno**
   - Generar `ENCRYPTION_KEY` (32 bytes)
   - Generar `ENCRYPTION_KEY_IV` (16 bytes)
   - Configurar en `.env` (no en `.env.example`)

### Fase 2: Modificación del Schema
1. **Agregar campos encriptados al modelo Teacher**
   ```prisma
   model Teacher {
     // Campos existentes
     dni         String              @unique
     phone       String?
     
     // Campos encriptados (agregar)
     dniEncrypted String?            @map("dni_encrypted")
     phoneEncrypted String?          @map("phone_encrypted")
   }
   ```

2. **Crear migración**
   - Agregar campos `dniEncrypted` y `phoneEncrypted`
   - Crear índices para búsqueda eficiente

### Fase 3: Migración de Datos
1. **Ejecutar script de encriptación**
   - Leer registros existentes
   - Encriptar DNI y teléfono
   - Guardar en campos encriptados
   - Verificar integridad

2. **Validación**
   - Verificar que todos los datos estén encriptados
   - Probar desencriptación
   - Validar búsquedas

### Fase 4: Actualización de Código
1. **Modificación de endpoints de lectura**
   - Desencriptar datos al leer de la base
   - Usar `encryption.decrypt()` en todos los `findMany` y `findUnique`

2. **Modificación de endpoints de escritura**
   - Encriptar datos al escribir en la base
   - Usar `encryption.encrypt()` en todos los `create` y `update`

3. **Actualización de validaciones**
   - Validar DNI único usando datos desencriptados
   - Ajustar búsquedas por DNI

### Fase 5: Limpieza
1. **Eliminar campos en texto plano** (opcional, después de validación completa)
   - Eliminar `dni` y `phone` del schema
   - Crear migración de limpieza
   - Ejecutar en ventana de mantenimiento

## Riesgos y Consideraciones

### Riesgos
- **Pérdida de datos** si falla la encriptación
- **Problemas de rendimiento** por desencriptación masiva
- **Errores en migración** si hay datos corruptos
- **Compatibilidad** con código existente

### Mitigaciones
- **Backup completo** antes de migración
- **Validación paso a paso** con pruebas
- **Rollback plan** disponible
- **Ventana de mantenimiento** para ejecución

## Requisitos Previos

- ✅ Infraestructura de encriptación implementada
- ✅ Scripts de migración y rollback disponibles
- ⏳ Variables de entorno configuradas
- ⏳ Backup de datos realizado
- ⏳ Plan de pruebas definido

## Recursos Existentes

- **Documentación de encriptación:** `docs/ENCRYPTION_EXECUTION_PLAN.md`
- **Módulo de encriptación:** `src/lib/server/encryption.ts`
- **Script de migración:** `prisma/migrate-encryption.ts`
- **Script de rollback:** `prisma/rollback-encryption.ts`

## Cronograma Sugerido

1. **Preparación:** 1 día (backup, configuración)
2. **Migración Schema:** 0.5 días
3. **Migración Datos:** 1 día (encriptación, validación)
4. **Actualización Código:** 2 días (endpoints, validaciones)
5. **Pruebas:** 1 día
6. **Limpieza:** 0.5 días

**Total estimado:** 6 días

## Estado del Plan

**Estado:** 📋 PLANIFICADO - NO EJECUTADO

**Prioridad:** MEDIA - Mejora de seguridad

**Bloqueantes:**
- Aprobación de ventana de mantenimiento
- Configuración de variables de entorno
- Definición de plan de pruebas

## Notas

- Este plan reutiliza la infraestructura ya implementada para el Módulo de Alumnos
- La encriptación es transparente para el usuario final
- Los datos encriptados no pueden recuperarse sin las claves correctas
- Las claves deben guardarse de forma segura (no en código ni en repositorio)
