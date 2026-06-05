# Arquitectura de Roles y Permisos

## Diseño de Roles Fijos

### Decisión de Arquitectura

El sistema mantiene **roles fijos definidos como enum** en `prisma/schema.prisma`. Esta decisión es intencional y basada en las siguientes razones:

### Roles Definidos (Enum RoleCode)

```typescript
enum RoleCode {
  SUPERADMIN    // Super Administrador - Acceso total al sistema
  DIRECTOR      // Director - Gestión completa institucional
  SECRETARIA    // Secretaría - Gestión académica administrativa
  DOCENTE       // Docente - Gestión de materias asignadas
  ALUMNO        // Alumno - Acceso a sus datos académicos
  FINANZAS      // Finanzas - Gestión de pagos y becas
  APODERADO     // Apoderado - Acceso a datos de alumnos a cargo
  PRECEPTOR     // Preceptor - Gestión de asistencia y seguimiento
}
```

### Razones para Roles Fijos

1. **Estabilidad del Negocio**: En una institución educativa, los roles son conceptos estables que no cambian frecuentemente. Director, Secretaría, Docente y Alumno son roles permanentes en el modelo educativo.

2. **Flexibilidad Suficiente**: El sistema implementa una capa de **permisos granulares por entidad** (CRUD) que permite configurar qué puede hacer cada rol sin modificar la estructura de roles base.

3. **Seguridad**: Mantener roles fijos evita que un administrador elimine accidentalmente roles críticos como SUPERADMIN, lo que podría bloquear el acceso al sistema.

4. **Simplicidad**: Reduce la complejidad de configuración y posibles errores. Los administradores solo configuran permisos, no la estructura de roles.

5. **UI Existente**: Ya existe una interfaz completa en `/permisos` para administrar permisos granulares por rol y entidad.

### Sistema de Permisos Granulares

El sistema usa la tabla `Permission` para configurar permisos CRUD por entidad:

- **Entidades**: 24 entidades (USER, STUDENT, TEACHER, CAREER, SUBJECT, etc.)
- **Permisos**: CREATE, READ, UPDATE, DELETE por entidad
- **Configuración**: UI en `/src/routes/(app)/permisos/` (solo SUPERADMIN)
- **Defaults**: Función `seedDefaultPermissions()` en `permissions-granular.ts`

### Reglas Especiales

- **SUPERADMIN**: Tiene todos los permisos automáticamente (hardcoded en `permissions-granular.ts`)
- **No aparece en UI de permisos**: SUPERADMIN no se muestra en la tabla de permisos porque sus permisos no son configurables
- **Restricciones SECRETARIA**: SECRETARIA no puede editar/eliminar usuarios con roles administrativos (SUPERADMIN, DIRECTOR, APODERADO, FINANZAS)

### Gestión de Roles

**No se recomienda agregar CRUD de roles** porque:
- Los roles son conceptos de negocio estables
- La flexibilidad requerida se logra mediante permisos granulares
- Agregar gestión dinámica de roles aumenta el riesgo de configuración incorrecta
- Los roles actuales cubren todos los casos de uso del sistema educativo

### Archivos Relacionados

- `prisma/schema.prisma` - Definición de enum RoleCode
- `src/lib/server/auth/permissions-granular.ts` - Lógica de permisos granulares
- `src/routes/(app)/permisos/+page.server.ts` - Server de UI de permisos
- `src/routes/(app)/permisos/+page.svelte` - UI de configuración de permisos
- `src/lib/server/auth/authorization.ts` - Funciones de autorización por rol

### Modificación de Roles

Si en el futuro se requiere agregar un nuevo rol:

1. Agregar el valor al enum `RoleCode` en `prisma/schema.prisma`
2. Ejecutar migración de Prisma
3. Agregar permisos por defecto en `seedDefaultPermissions()`
4. Actualizar restricciones en `authorization.ts` si es necesario
5. Actualizar UI de permisos para incluir el nuevo rol

Este proceso requiere cambios en código y migración de base de datos, lo que es apropiado dado que los roles son conceptos estructurales del sistema, no configuración de usuario.
