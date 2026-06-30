# Gestión Documental - Fase 1.4: Endpoints Protegidos

## Objetivo

Exponer la capa documental mediante endpoints server-side protegidos, sin crear UI todavía. Esta fase permite subir, listar, consultar, descargar, soft-delete y restaurar documentos mediante una API REST segura.

## Alcance

Esta fase implementa los siguientes endpoints server-side:

- `POST /api/documents` - Subir documento
- `GET /api/documents` - Listar documentos
- `GET /api/documents/[id]` - Obtener detalle de documento
- `DELETE /api/documents/[id]` - Soft delete de documento
- `POST /api/documents/[id]/restore` - Restaurar documento
- `GET /api/documents/[id]/download` - Descargar archivo controlado

## Archivos Creados

### 1. Helper de Permisos
**Archivo:** `src/lib/server/document-management/document-permissions.ts`

Funciones de validación de permisos específicas para documentos:

- `canCreateDocument()` / `requireCreateDocumentPermission()` - Verificar permiso de creación
- `canReadDocument()` / `requireReadDocumentPermission()` - Verificar permiso de lectura (considera ownership y visibilidad)
- `canUpdateDocument()` / `requireUpdateDocumentPermission()` - Verificar permiso de actualización
- `canDeleteDocument()` / `requireDeleteDocumentPermission()` - Verificar permiso de eliminación
- `canRestoreDocument()` / `requireRestoreDocumentPermission()` - Verificar permiso de restauración
- `canListDocuments()` / `requireListDocumentsPermission()` - Verificar permiso de listado

**Reglas de acceso:**
- `SUPERADMIN`: acceso total a todas las operaciones
- Otros roles: requieren permiso granular `DOCUMENT` + verificación de ownership según visibilidad
- `PUBLIC`: cualquier usuario con permiso de lectura puede acceder
- `PRIVATE`: solo el propietario puede acceder
- `INTERNAL`: tratado como privado por ahora

### 2. API Helpers
**Archivo:** `src/lib/server/document-management/document-api-helpers.ts`

Funciones que encapsulan la lógica de los endpoints para facilitar testing:

- `createDocumentApi()` - Crear documento
- `listDocumentsApi()` - Listar documentos
- `getDocumentApi()` - Obtener detalle
- `deleteDocumentApi()` - Soft delete
- `restoreDocumentApi()` - Restaurar
- `downloadDocumentApi()` - Descargar archivo

**Mapper de respuesta segura:**
- `toSafeDocument()` - Convierte `Document` a `SafeDocumentResponse` excluyendo rutas absolutas

### 3. Endpoints

#### POST /api/documents
**Archivo:** `src/routes/api/documents/+server.ts`

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file`: File (obligatorio)
  - `ownerType`: DocumentOwnerType (obligatorio)
  - `ownerId`: string (obligatorio)
  - `category`: DocumentCategory (obligatorio)
  - `subType`: DocumentSubType (obligatorio)
  - `visibility`: DocumentVisibility (obligatorio)
  - `metadata`: string JSON (opcional)

**Response:**
```json
{
  "id": "string",
  "originalName": "string",
  "storedName": "string",
  "mimeType": "string",
  "extension": "string",
  "sizeBytes": number,
  "sha256Hash": "string | null",
  "ownerType": "DocumentOwnerType",
  "ownerId": "string",
  "category": "DocumentCategory",
  "subType": "DocumentSubType",
  "status": "string",
  "visibility": "DocumentVisibility",
  "uploadedById": "string",
  "createdAt": "Date",
  "updatedAt": "Date",
  "metadata": "object",
  "tags": "string[]"
}
```

**Comportamiento:**
- Requiere autenticación (401 si no hay sesión)
- Requiere permiso `DOCUMENT:create` (403 si no tiene permiso)
- Usa `DocumentManagementService.createDocument()` que registra `UPLOAD` automáticamente
- No expone rutas absolutas del filesystem

#### GET /api/documents
**Archivo:** `src/routes/api/documents/+server.ts`

**Request:**
- Method: `GET`
- Query params (todos opcionales):
  - `ownerType`: DocumentOwnerType
  - `ownerId`: string
  - `category`: DocumentCategory
  - `subType`: DocumentSubType
  - `status`: string
  - `visibility`: DocumentVisibility
  - `uploadedById`: string
  - `includeDeleted`: boolean (default: false)
  - `limit`: number
  - `offset`: number

**Response:**
```json
[
  {
    "id": "string",
    "originalName": "string",
    "storedName": "string",
    "mimeType": "string",
    "extension": "string",
    "sizeBytes": number,
    "sha256Hash": "string | null",
    "ownerType": "DocumentOwnerType",
    "ownerId": "string",
    "category": "DocumentCategory",
    "subType": "DocumentSubType",
    "status": "string",
    "visibility": "DocumentVisibility",
    "uploadedById": "string",
    "createdAt": "Date",
    "updatedAt": "Date",
    "deletedAt": "Date | null",
    "expiresAt": "Date | null",
    "metadata": "object",
    "tags": "string[]"
  }
]
```

**Comportamiento:**
- Requiere autenticación (401 si no hay sesión)
- Requiere permiso `DOCUMENT:read` (403 si no tiene permiso)
- Por defecto excluye documentos eliminados
- No registra `VIEW` para cada documento listado
- No expone rutas absolutas

#### GET /api/documents/[id]
**Archivo:** `src/routes/api/documents/[id]/+server.ts`

**Request:**
- Method: `GET`
- Params: `id` (string)

**Response:**
```json
{
  "id": "string",
  "originalName": "string",
  "storedName": "string",
  "mimeType": "string",
  "extension": "string",
  "sizeBytes": number,
  "sha256Hash": "string | null",
  "ownerType": "DocumentOwnerType",
  "ownerId": "string",
  "category": "DocumentCategory",
  "subType": "DocumentSubType",
  "status": "string",
  "visibility": "DocumentVisibility",
  "uploadedById": "string",
  "createdAt": "Date",
  "updatedAt": "Date",
  "deletedAt": "Date | null",
  "expiresAt": "Date | null",
  "metadata": "object",
  "tags": "string[]"
}
```

**Comportamiento:**
- Requiere autenticación (401 si no hay sesión)
- Requiere permiso de lectura según ownership y visibilidad (403 si no tiene permiso)
- Registra acción `VIEW` en `DocumentAccessLog`
- No expone rutas absolutas

#### DELETE /api/documents/[id]
**Archivo:** `src/routes/api/documents/[id]/+server.ts`

**Request:**
- Method: `DELETE`
- Params: `id` (string)

**Response:**
```json
{
  "id": "string",
  "originalName": "string",
  "storedName": "string",
  "mimeType": "string",
  "extension": "string",
  "sizeBytes": number,
  "sha256Hash": "string | null",
  "ownerType": "DocumentOwnerType",
  "ownerId": "string",
  "category": "DocumentCategory",
  "subType": "DocumentSubType",
  "status": "DELETED",
  "visibility": "DocumentVisibility",
  "uploadedById": "string",
  "createdAt": "Date",
  "updatedAt": "Date",
  "deletedAt": "Date",
  "expiresAt": "Date | null",
  "metadata": "object",
  "tags": "string[]"
}
```

**Comportamiento:**
- Requiere autenticación (401 si no hay sesión)
- Requiere permiso de eliminación según ownership (403 si no tiene permiso)
- Usa `DocumentManagementService.softDeleteDocument()` que:
  - Marca `status = DELETED`
  - Setea `deletedAt`
  - Registra acción `DELETE` en `DocumentAccessLog`
  - **NO** elimina el archivo físico
  - **NO** elimina los access logs
- No expone rutas absolutas

#### POST /api/documents/[id]/restore
**Archivo:** `src/routes/api/documents/[id]/restore/+server.ts`

**Request:**
- Method: `POST`
- Params: `id` (string)

**Response:**
```json
{
  "id": "string",
  "originalName": "string",
  "storedName": "string",
  "mimeType": "string",
  "extension": "string",
  "sizeBytes": number,
  "sha256Hash": "string | null",
  "ownerType": "DocumentOwnerType",
  "ownerId": "string",
  "category": "DocumentCategory",
  "subType": "DocumentSubType",
  "status": "ACTIVE",
  "visibility": "DocumentVisibility",
  "uploadedById": "string",
  "createdAt": "Date",
  "updatedAt": "Date",
  "deletedAt": null,
  "expiresAt": "Date | null",
  "metadata": "object",
  "tags": "string[]"
}
```

**Comportamiento:**
- Requiere autenticación (401 si no hay sesión)
- Requiere permiso de restauración según ownership (403 si no tiene permiso)
- Usa `DocumentManagementService.restoreDocument()` que:
  - Marca `status = ACTIVE`
  - Limpia `deletedAt`
  - Registra acción `RESTORE` en `DocumentAccessLog`
- No expone rutas absolutas

#### GET /api/documents/[id]/download
**Archivo:** `src/routes/api/documents/[id]/download/+server.ts`

**Request:**
- Method: `GET`
- Params: `id` (string)

**Response:**
- Content-Type: MIME type del documento
- Content-Length: tamaño en bytes
- Content-Disposition: `attachment; filename="..."` (filename codificado)
- Cache-Control: `private, max-age=0`
- X-Content-Type-Options: `nosniff`
- Body: contenido binario del archivo

**Comportamiento:**
- Requiere autenticación (401 si no hay sesión)
- Requiere permiso de lectura según ownership y visibilidad (403 si no tiene permiso)
- Verifica que el documento no esté eliminado (410 si está eliminado)
- Verifica que el archivo físico exista (404 si no existe)
- Lee el archivo usando `DocumentStorageService.readDocumentFile()`
- Registra acción `DOWNLOAD` en `DocumentAccessLog`
- **NO** usa redirect a URL pública
- **NO** sirve desde `static/uploads`
- Sirve el archivo directamente desde el servidor con headers seguros

## Seguridad

### Validación de Sesión
Todos los endpoints verifican `locals.user`:
- Si no hay usuario: retorna `401 No autenticado`

### Validación de Permisos
Usa el sistema de permisos granular existente:
- `permissions-granular.ts` define permisos por entidad y acción
- `document-permissions.ts` agrega lógica específica de ownership y visibilidad
- Si no hay permiso: retorna `403 No tienes permiso...`

### Respuestas Seguras
**NO se expone:**
- `absolutePath`
- `filePath`
- `resolvedPath`
- `storageBaseDir`
- Cualquier ruta absoluta del filesystem

**SÍ se expone:**
- `id`, `originalName`, `storedName`
- `mimeType`, `extension`, `sizeBytes`, `sha256Hash`
- `ownerType`, `ownerId`, `category`, `subType`
- `status`, `visibility`, `uploadedById`
- `createdAt`, `updatedAt`, `deletedAt`, `expiresAt`
- `metadata`, `tags`
- `storageKey` (solo si es necesario para administración interna, nunca como URL pública)

### Descarga Controlada
- El endpoint de descarga sirve el archivo directamente
- No usa URLs públicas ni redirects
- Headers seguros para evitar MIME sniffing
- Validación de que el archivo no esté eliminado
- Validación de que el archivo físico exista

## Auditoría

### Acciones Registradas
- `UPLOAD`: registrado automáticamente al crear documento
- `VIEW`: registrado al consultar detalle
- `DOWNLOAD`: registrado al descargar archivo
- `DELETE`: registrado al soft delete
- `RESTORE`: registrado al restaurar

### Metadata de Log
- `documentId`: ID del documento
- `userId`: ID del usuario que realizó la acción
- `action`: acción realizada
- `ipAddress`: IP del cliente (desde headers `x-forwarded-for` o `x-real-ip`)
- `userAgent`: User agent del cliente (desde header `user-agent`)
- `metadata`: metadata opcional de la acción

## Tests

### Script de Prueba
**Archivo:** `scripts/test-document-management-endpoints.ts`

**Tests implementados:**
1. Usuario no autenticado recibe 401
2. Usuario sin permiso recibe 403
3. Usuario con permiso puede subir documento
4. Upload crea registro `Document`
5. Upload crea log `UPLOAD`
6. List devuelve documento subido
7. Detail devuelve documento sin rutas absolutas
8. Detail registra `VIEW`
9. Download devuelve contenido correcto
10. Download tiene `Content-Type` correcto
11. Download tiene `Content-Disposition` seguro
12. Download registra `DOWNLOAD`
13. Download de documento eliminado es rechazado
14. Delete hace soft delete
15. Delete no elimina archivo físico
16. Restore funciona
17. Respuestas no exponen rutas absolutas
18. Cleanup final elimina logs, documentos, usuarios y archivo físico de prueba
19. `find storage/private/documents -type f` no deja archivos de prueba
20. No escritura en `static/uploads`

**Resultado:**
```
🎉 Document Management Endpoints Test Suite: PASSED
```

## Validaciones

### Validaciones de Schema
- `npx prisma format` - Formateo de schema
- `npx prisma validate` - Validación de schema
- `npx prisma generate` - Generación de cliente Prisma
- `npx prisma migrate status` - Estado de migraciones

### Validaciones de Código
- `npm run check` - Chequeo de TypeScript
- `npm run build` - Build del proyecto

### Validaciones de Tests
- `npx tsx scripts/test-document-management-storage.ts` - Test de storage (18 tests)
- `npx tsx scripts/test-document-management-service.ts` - Test de servicio (19 tests)
- `npx tsx scripts/test-document-management-endpoints.ts` - Test de endpoints (19 tests)

### Validaciones de Calidad
- `git status --short` - Estado de working tree
- `git diff --name-status` - Archivos modificados
- `git diff --stat` - Estadísticas de cambios
- `find storage/private/documents -type f | head -20` - Verificar archivos físicos
- `git diff -U0 | grep -E "^\+.*(\$queryRaw|\$executeRaw|@ts-ignore|@ts-expect-error|: any|as any)"` - Verificar patrones prohibidos
- `grep -R "\$queryRaw\|\$executeRaw\|@ts-ignore\|@ts-expect-error\|: any\|as any" src/lib/server/document-management src/routes/api/documents scripts/test-document-management-*.ts` - Verificar patrones prohibidos en archivos específicos

## Restricciones

### NO hacer
- No usar `$queryRaw` o `$executeRaw`
- No usar `any`, `as any`, `@ts-ignore`, `@ts-expect-error`
- No usar `db push`
- No usar `migrate reset` o `migrate resolve`
- No crear migraciones
- No modificar schema
- No escribir en `static/uploads`
- No crear UI
- No exponer rutas absolutas
- No permitir descarga por URL pública
- No implementar preview
- No implementar OCR
- No migrar archivos existentes

### SÍ hacer
- Usar `DocumentManagementService` para operaciones
- Usar `DocumentStorageService` para archivos físicos
- Usar sistema de permisos granular existente
- Registrar auditoría en `DocumentAccessLog`
- Retornar respuestas seguras sin rutas absolutas
- Implementar descarga controlada con headers seguros
- Validar autenticación y autorización

## Próximos Pasos

La Fase 1.4 completa la capa de API para gestión documental. Los siguientes pasos podrían incluir:

- Fase 1.5: UI para gestión documental (frontend)
- Fase 1.6: Integración con módulos existentes (estudiantes, pagos, etc.)
- Fase 1.7: Migración de documentos existentes (si aplica)
- Fase 1.8: OCR y procesamiento de documentos (si aplica)
