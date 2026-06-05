# Plan de Ejecución para Encriptación de Datos Sensibles

## Objetivo
Implementar encriptación AES-256-GCM para datos sensibles de alumnos (DNI, teléfonos) siguiendo el plan documentado en `ENCRYPTION_PLAN.md`.

## Datos a Encriptar
- `Student.dni` - Documento Nacional de Identidad
- `Student.phone` - Teléfono personal
- `Student.familyContactPhone` - Teléfono de contacto familiar

## Estrategia de Migración

### Fase 1: Preparación (Sin tocar datos existentes)
1. ✅ Crear módulo de encriptación con helpers
2. ✅ Agregar variables de entorno al `.env.example`
3. ✅ Documentar puntos de encriptación/desencriptación
4. ✅ Crear script de migración (sin ejecutar)
5. ✅ Crear script de rollback

### Fase 2: Pruebas en Ambiente de Desarrollo
1. Ejecutar script de migración en base de datos de desarrollo
2. Verificar que los datos se encriptan correctamente
3. Probar lectura/desencriptación en la aplicación
4. Ejecutar rollback para revertir cambios
5. Repetir ciclo hasta que esté estable

### Fase 3: Migración en Producción (Requiere aprobación)
1. **BACKUP OBLIGATORIO** de la base de datos completa
2. Notificar a stakeholders sobre ventana de mantenimiento
3. Ejecutar script de migración
4. Verificar integridad de datos
5. Monitorear logs por errores
6. Tener script de rollback listo por si falla

## Variables de Entorno

Agregar a `.env`:
```env
ENCRYPTION_KEY=tu_clave_de_32_bytes_aleatoria
ENCRYPTION_KEY_IV=tu_iv_de_16_bytes_aleatoria
```

**IMPORTANTE:**
- `ENCRYPTION_KEY`: Debe ser exactamente 32 bytes (64 caracteres hexadecimales o 32 caracteres ASCII)
- `ENCRYPTION_KEY_IV`: Debe ser exactamente 16 bytes (32 caracteres hexadecimales o 16 caracteres ASCII)
- Estas claves NO deben cambiarse después de la migración
- Guardar de forma segura (no en código, usar secret manager en producción)

## Puntos de Encriptación/Desencriptación

### Encriptación (al guardar datos)
1. **Creación de alumno** - `/usuarios/nuevo/+page.server.ts`
2. **Edición de alumno** - `/alumnos/editar/+page.server.ts`
3. **Importación masiva** (si existe)

### Desencriptación (al leer datos)
1. **Listado de alumnos** - `/alumnos/+page.server.ts`
2. **Detalle de alumno** - `/alumnos/[id]/+page.server.ts`
3. **Historial académico** - `/alumnos/[id]/historial/+page.server.ts`
4. **Exportación de reportes** (si existe)
5. **Búsqueda por DNI** (si existe)

## Módulo de Encriptación

### Ubicación
`/src/lib/server/encryption.ts`

### Funciones
```typescript
encrypt(text: string): Promise<string>
decrypt(encryptedText: string): Promise<string>
```

### Algoritmo
- AES-256-GCM (Galois/Counter Mode)
- Proporciona confidencialidad e integridad
- IV único por encriptación (para evitar ataques de repetición)

## Script de Migración

### Ubicación
`/prisma/migrate-encryption.ts`

### Pasos
1. Conectar a base de datos
2. Leer todos los alumnos con datos en texto plano
3. Para cada alumno:
   - Encriptar DNI si existe
   - Encriptar phone si existe
   - Encriptar familyContactPhone si existe
   - Actualizar registro
4. Registrar progreso y errores
5. Generar reporte de migración

### Rollback
Script inverso que desencripta todos los datos (solo para emergencias)

## Validaciones

### Pre-migración
- [ ] Backup de base de datos completado
- [ ] Variables de entorno configuradas
- [ ] Script de migración revisado
- [ ] Script de rollback probado

### Post-migración
- [ ] Todos los datos encriptados correctamente
- [ ] Aplicación puede leer datos desencriptados
- [ ] No hay errores en logs
- [ ] Búsqueda por DNI funciona
- [ ] Exportación de reportes funciona

## Riesgos y Mitigaciones

### Riesgo 1: Pérdida de datos durante migración
**Mitigación:** Backup obligatorio antes de migración, script de rollback listo

### Riesgo 2: Claves de encriptación perdidas
**Mitigación:** Documentar proceso de recuperación, usar secret manager en producción

### Riesgo 3: Performance impact
**Mitigación:** Encriptación/desencriptación es rápida (microsegundos), cachear si necesario

### Riesgo 4: Error en script de migración
**Mitigación:** Validar script en desarrollo, ejecutar en transacción con rollback automático

## Plan de Contingencia

Si la migración falla:
1. Ejecutar script de rollback inmediatamente
2. Restaurar backup si rollback falla
3. Investigar causa del error
4. Corregir script
5. Repetir proceso

## Checklist Final Antes de Producción

- [ ] Código de encriptación implementado y probado
- [ ] Variables de entorno configuradas en producción
- [ ] Script de migración probado en desarrollo
- [ ] Script de rollback probado en desarrollo
- [ ] Backup de base de datos realizado
- [ ] Ventana de mantenimiento comunicada
- [ ] Equipo de monitoreo alertado
- [ ] Documentación actualizada

## Estado Actual
**Fase 1: Preparación** - En progreso
- [x] Documentación del plan
- [ ] Módulo de encriptación
- [ ] Variables de entorno
- [ ] Script de migración
- [ ] Script de rollback

**Fase 2: Pruebas** - Pendiente
**Fase 3: Producción** - Pendiente (requiere aprobación)
