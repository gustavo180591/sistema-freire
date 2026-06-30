# Gestión Documental - Fase 1.5: Interfaz protegida de gestión documental

## Objetivo

Crear una UI protegida para usar los endpoints documentales ya implementados en la Fase 1.4.

## Alcance

Esta fase implementa la interfaz de usuario para:

- Ver listado de documentos
- Filtrar documentos por categoría, subtipo, visibilidad, estado, tipo de propietario e ID de propietario
- Subir documentos con validación de archivo
- Ver detalle básico de documentos
- Descargar documentos mediante endpoint protegido
- Realizar soft delete de documentos
- Restaurar documentos eliminados
- Mostrar errores 401, 403, validación de archivo y errores de backend de forma clara

## Arquitectura

### Rutas

- `src/routes/(app)/documentos/+page.svelte` - Página principal de gestión documental
- `src/routes/(app)/documentos/+page.server.ts` - Server load function (mínimo, datos cargados client-side)

### Componentes

- `src/lib/components/document-management/DocumentUploadForm.svelte` - Formulario de subida de documentos
- `src/lib/components/document-management/DocumentList.svelte` - Lista responsive de documentos
- `src/lib/components/document-management/DocumentFilters.svelte` - Filtros de búsqueda
- `src/lib/components/document-management/DocumentDetailModal.svelte` - Modal de detalle de documento

## Conexión con Endpoints

### Listado de Documentos

**Endpoint:** `GET /api/documents`

**Parámetros de query:**
- `ownerType` (opcional): Tipo de propietario (USER, STUDENT, TEACHER, CAREER, SUBJECT)
- `ownerId` (opcional): ID del propietario
- `category` (opcional): Categoría del documento
- `subType` (opcional): Subtipo del documento
- `visibility` (opcional): Visibilidad del documento
- `status` (opcional): Estado del documento (ACTIVE, DELETED, EXPIRED)

**Implementación:**
```typescript
const queryParams = new URLSearchParams();
if (filters.ownerType) queryParams.append('ownerType', filters.ownerType);
// ... otros filtros
const response = await fetch(`/api/documents?${queryParams.toString()}`);
```

### Subida de Documentos

**Endpoint:** `POST /api/documents`

**Body:** `multipart/form-data`
- `file`: Archivo a subir
- `ownerType`: Tipo de propietario
- `ownerId`: ID del propietario
- `category`: Categoría
- `subType`: Subtipo
- `visibility`: Visibilidad
- `metadata` (opcional): JSON string con metadata adicional

**Implementación:**
```typescript
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('ownerType', ownerType);
// ... otros campos
const response = await fetch('/api/documents', { method: 'POST', body: formData });
```

### Descarga de Documentos

**Endpoint:** `GET /api/documents/[id]/download`

**Implementación:**
```typescript
const response = await fetch(`/api/documents/${document.id}/download`);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = window.document.createElement('a');
a.href = url;
a.download = document.originalName;
window.document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(url);
window.document.body.removeChild(a);
```

### Soft Delete

**Endpoint:** `DELETE /api/documents/[id]`

**Implementación:**
```typescript
const response = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
```

### Restauración

**Endpoint:** `POST /api/documents/[id]/restore`

**Implementación:**
```typescript
const response = await fetch(`/api/documents/${document.id}/restore`, { method: 'POST' });
```

## Funcionalidades

### Upload

1. **Validación de archivo:**
   - Tamaño máximo: 10MB (configurado en `MAX_FILE_SIZE`)
   - Tipos permitidos: PDF, DOC, DOCX, JPG, JPEG, PNG
   - Validación MIME type y extensión

2. **Campos requeridos:**
   - Archivo
   - Tipo de propietario
   - ID del propietario
   - Categoría
   - Subtipo
   - Visibilidad

3. **Campo opcional:**
   - Metadata (JSON string)

### Listado/Filtros

1. **Filtros disponibles:**
   - Categoría (ACADEMIC, ADMINISTRATIVE, FINANCIAL, LEGAL, OTHER)
   - Subtipo (ENROLLMENT_CERTIFICATE, REGULARITY_CERTIFICATE, etc.)
   - Visibilidad (PRIVATE, INTERNAL, PUBLIC)
   - Estado (ACTIVE, DELETED, EXPIRED)
   - Tipo de propietario (USER, STUDENT, TEACHER, CAREER, SUBJECT)
   - ID del propietario

2. **Vista responsive:**
   - Desktop: Tabla con columnas
   - Mobile: Cards con información compacta

### Detalle

1. **Información mostrada:**
   - Nombre del archivo
   - Tipo MIME
   - Tamaño
   - Categoría y subtipo
   - Visibilidad
   - Estado
   - Propietario (tipo e ID)
   - Fechas de creación y eliminación (si aplica)
   - Metadata (si existe)

2. **Acciones disponibles:**
   - Descargar
   - Eliminar (si está ACTIVE)
   - Restaurar (si está DELETED)

### Download Controlado

- La descarga siempre pasa por el endpoint protegido `/api/documents/[id]/download`
- No se construyen URLs directas a `storage/private`
- No se usa `<a href="/storage/...">`
- El archivo se descarga programáticamente usando blob y createElement

### Soft Delete

- Realiza soft delete del documento
- Muestra modal de confirmación
- El documento puede ser restaurado posteriormente

### Restore

- Restaura documentos con estado DELETED
- Muestra modal de confirmación
- El documento vuelve a estado ACTIVE

## Manejo de Errores

### 401 Unauthorized

**Comportamiento:**
- Redirección a `/login`
- Mensaje: "Sesión expirada o no autenticado"

**Implementación:**
```typescript
if (response.status === 401) {
	goto('/login');
	return;
}
```

### 403 Forbidden

**Comportamiento:**
- Muestra mensaje de error en banner rojo
- Mensaje: "No tienes permiso para [acción]"

**Implementación:**
```typescript
if (response.status === 403) {
	uploadError = 'No tienes permiso para [acción]';
	return;
}
```

### Errores de Validación

**Comportamiento:**
- Muestra mensaje específico de validación
- Ejemplos:
  - "El archivo excede el tamaño máximo de 10MB"
  - "Debe seleccionar un archivo"
  - "Debe especificar el ID del propietario"

### Errores de Backend

**Comportamiento:**
- Muestra mensaje genérico de error
- Ejemplos:
  - "Error al cargar documentos"
  - "Error al subir documento"
  - "Error al descargar documento"

## Seguridad

### No Exposición de Rutas Absolutas

- La UI nunca muestra rutas absolutas del filesystem
- No se expone `storageKey` como URL pública
- No se construyen URLs hacia `storage/private`

### No Escritura en static/uploads

- La subida usa el endpoint `/api/documents` que escribe en `storage/private/documents`
- No se escribe en `static/uploads`

### No Prisma Directo desde UI

- La UI no usa Prisma directamente
- Todas las operaciones pasan por los endpoints protegidos

### No Lectura de Filesystem desde UI

- La UI no lee el filesystem directamente
- Todos los archivos se descargan vía endpoint protegido

## Reglas de Permisos

La UI no asume permisos como seguridad principal. Los endpoints siguen siendo la autoridad.

Sin embargo, la UI:

- Maneja 401 mostrando que la sesión expiró o no hay sesión
- Maneja 403 mostrando que no tiene permiso
- Oculta acciones si la información disponible lo permite
- No rompe si el backend rechaza una acción

## Patrones Visuales

### Tema

- Tema oscuro: `bg-slate-950`
- Bordes: `border-slate-800`
- Texto: `text-white`, `text-slate-300`, `text-slate-400`

### Componentes

- Bordes redondeados: `rounded-2xl`, `rounded-3xl`
- Cards: `bg-slate-900/70`
- Inputs: `bg-slate-950`, `border-slate-700`, `focus:border-slate-500`
- Botones primarios: `bg-white`, `text-slate-950`
- Botones de acción: colores específicos (rojo para eliminar, azul para descargar, etc.)

### Responsive

- Desktop: Tabla con columnas
- Mobile: Cards con información compacta
- Grid de filtros: 1 columna mobile, 2 columnas tablet, 3 columnas desktop

## Estados

### Estados de Carga

- `loading`: Indicador de carga mientras se obtienen documentos
- `uploading`: Indicador de carga mientras se sube un documento

### Estados de Error

- `uploadError`: Mensaje de error mostrado en banner rojo
- Se puede cerrar con botón X

### Estados de Interacción

- `showUploadForm`: Toggle para mostrar/ocultar formulario de subida
- `selectedDocument`: Documento seleccionado para ver en modal
- `deletingDocument`: Documento en proceso de eliminación (modal)
- `restoringDocument`: Documento en proceso de restauración (modal)

## Validaciones

### Validaciones de Archivo

- Tamaño máximo: 10MB
- Tipos permitidos: PDF, DOC, DOCX, JPG, JPEG, PNG
- Validación MIME type y extensión

### Validaciones de Formulario

- Archivo requerido
- ID de propietario requerido
- Todos los campos de selección requeridos

## Próximos Pasos

Fases futuras pueden incluir:

- Preview de documentos (PDF, imágenes)
- OCR para extracción de texto
- Cloud storage (S3, GCS, Azure Blob)
- Migración de entidades existentes (StudentDocument, Payslip, ClassMaterial, Receipt)
- Búsqueda avanzada con full-text search
- Versionado de documentos
- Compartido de documentos con permisos granulares
