# Document Management - Phase 1.0: Design and Technical Analysis

## Overview

This document provides a comprehensive analysis of the current system and proposes a technical design for the Document Management module. This is a design-only phase - no implementation will be done without approval.

**Status:** Design Phase - No Implementation
**Date:** June 27, 2026
**Phase:** 1.0 - Diagnosis and Technical Design

---

## 1. Current System Analysis

### 1.1 Existing Document-Related Models

The system already has several document-related models:

#### StudentDocument
**Location:** `prisma/schema.prisma` (lines 818-838)

```prisma
model StudentDocument {
  id         String       @id @default(cuid())
  studentId  String
  type       DocumentType
  name       String
  fileUrl    String
  fileSize   Int?
  mimeType   String?
  uploadedBy String
  verified   Boolean      @default(false)
  verifiedBy String?
  verifiedAt DateTime?
  notes      String?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  student    Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  uploader   User         @relation("UploadedBy", fields: [uploadedBy], references: [id])
  verifier   User?        @relation("VerifiedBy", fields: [verifiedBy], references: [id])

  @@index([studentId, type])
  @@map("student_documents")
}
```

**Purpose:** Student documents (DNI, certificates, etc.)
**Storage:** `static/uploads/{studentId}/`
**Features:** Verification workflow, audit logging

#### Payslip
**Location:** `prisma/schema.prisma` (lines 700-716)

```prisma
model Payslip {
  id               String        @id @default(cuid())
  teacherId        String
  periodMonth      Int
  periodYear       Int
  amount           Decimal       @db.Decimal(12, 2)
  status           PayslipStatus @default(PENDING)
  fileUrl          String?
  fileKey          String?
  fileSize         Int?
  mimeType         String?
  originalFileName String?
  notes            String?
  uploadedBy       String?
  deletedAt        DateTime?
  deletedBy        String?
  // ... relations
}
```

**Purpose:** Teacher payslips (salary receipts)
**Storage:** `storage/private/payslips/{year}/{month}/{teacherId}/{uuid}.pdf`
**Features:** Private storage, soft delete, audit logging

#### ClassMaterial
**Location:** `prisma/schema.prisma` (lines 865-882)

```prisma
model ClassMaterial {
  id          String   @id @default(cuid())
  subjectId   String
  title       String
  description String?
  fileUrl     String
  fileSize    Int?
  mimeType    String?
  uploadedBy  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  subject     Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  uploader    User     @relation("MaterialUploader", fields: [uploadedBy], references: [id])

  @@index([subjectId])
  @@index([uploadedBy])
  @@map("class_materials")
}
```

**Purpose:** Class materials uploaded by teachers
**Storage:** `static/uploads/materials/`
**Features:** Public access, teacher-specific

#### Receipt
**Location:** `prisma/schema.prisma` (lines 526-565)

```prisma
model Receipt {
  id               String        @id @default(cuid())
  receiptNumber    Int
  receiptYear      Int
  studentId        String
  studentName      String
  studentDni       String?
  studentAddress   String?
  totalAmount      Decimal       @db.Decimal(12, 2)
  paymentMethod    PaymentMethod
  paymentReference String?
  pdfUrl           String?
  pdfFileKey       String?
  pdfFileSize      Int?
  pdfMimeType      String?
  // ... other fields
}
```

**Purpose:** Payment receipts
**Storage:** Not clearly defined in schema (likely private storage)
**Features:** PDF generation, financial tracking

### 1.2 Existing DocumentType Enum

**Location:** `prisma/schema.prisma` (lines 1147-1155)

```prisma
enum DocumentType {
  DNI
  CERTIFICATE
  CONSTANCY
  SECONDARY_TITLE
  PHOTO_ID
  MEDICAL_CERTIFICATE
  OTHER
}
```

**Purpose:** Types of student documents
**Scope:** Currently limited to student documents only

### 1.3 Current Storage Strategy

The system uses **two different storage strategies**:

#### Public Storage
**Location:** `static/uploads/`
**Used by:**
- `StudentDocument` - `static/uploads/{studentId}/`
- `ClassMaterial` - `static/uploads/materials/`

**Characteristics:**
- Files are publicly accessible via URL
- No access control at file level
- Relies on application-level permissions
- Risk: Direct URL access possible

#### Private Storage
**Location:** `storage/private/payslips/`
**Used by:**
- `Payslip` - `storage/private/payslips/{year}/{month}/{teacherId}/{uuid}.pdf`

**Characteristics:**
- Files are outside `static/` directory
- Not publicly accessible via URL
- Requires protected endpoint for access
- More secure for sensitive documents

### 1.4 Existing File Storage Service

**Location:** `src/lib/server/services/storage/file-storage.service.ts`

**Features:**
- File validation (size, MIME type, extension)
- PDF magic bytes validation
- Secure file naming with UUID
- Directory structure organization
- Private storage path generation
- Read/write/delete operations

**Configuration:**
- Max file size: 10MB
- Allowed MIME types: `application/pdf` only
- Storage base: `storage/private/payslips/`

**Current Limitation:** Designed specifically for payslips, not generic

### 1.5 Existing Permission System

**Location:** `src/lib/server/auth/permissions-granular.ts`

**Entities:**
- STUDENT
- TEACHER
- CAREER
- SUBJECT
- COURSE
- COMMISSION
- PAYMENT
- RECEIPT
- FINANCIAL_BLOCK
- FINANCIAL_REPORT
- PAYMENT_AGREEMENT

**Permissions:**
- create
- read
- update
- delete

**Functions:**
- `checkPermission(user, entity, permission)` - Check if user has permission
- `requirePermission(user, entity, permission)` - Throw error if no permission
- `hasPermission(roleCode, entity, permission)` - Check role-specific permission

**Current Limitation:** No DOCUMENT entity defined

### 1.6 Existing Audit System

**Location:** `src/lib/server/audit.ts`

**Model:** `AuditLog` in schema
**Features:**
- Action tracking (CREATE, UPDATE, DELETE, EXPORT, etc.)
- Entity type and ID tracking
- User tracking
- Description field
- Timestamp

**Usage:** Already used in document-related operations (StudentDocument, Payslip, ClassMaterial)

### 1.7 Existing Download Pattern

**Example:** `/recibos/[id]/download/+server.ts`

**Pattern:**
1. Protected endpoint (not static file)
2. Permission validation before access
3. File read from private storage
4. Audit logging of download
5. Response with appropriate headers (Content-Type, Content-Disposition)

**Benefits:**
- No direct URL access
- Permission check on every download
- Audit trail
- Secure for sensitive documents

---

## 2. Design Questions and Answers

### Q1: ¿Ya existe algún modelo para archivos/documentos?

**Answer:** SÍ, existen varios modelos:
- `StudentDocument` - Documentos de alumnos
- `Payslip` - Recibos de sueldo de docentes
- `ClassMaterial` - Materiales de clase
- `Receipt` - Recibos de pagos

**Analysis:** Cada modelo está especializado para su caso de uso. No existe un modelo genérico de documentos.

### Q2: ¿Dónde se guardan actualmente los archivos subidos?

**Answer:** En dos lugares:
- **Público:** `static/uploads/` (StudentDocument, ClassMaterial)
- **Privado:** `storage/private/payslips/` (Payslip)

**Analysis:** Estrategia mixta. Los archivos sensibles usan storage privado, los menos sensibles usan storage público.

### Q3: ¿Existe una estrategia de storage?

**Answer:** SÍ, pero no unificada:
- Storage público para archivos menos sensibles
- Storage privado para archivos sensibles
- Servicio `FileStorageService` para payslips
- Validación de tamaño, MIME type, magic bytes

**Analysis:** Buena base, pero el servicio es específico para payslips. Necesita generalización.

### Q4: ¿Los archivos se guardan en `static/uploads`, en carpeta privada o en otro lugar?

**Answer:** Ambos:
- `static/uploads/` - archivos públicos
- `storage/private/` - archivos privados

**Analysis:** Patrón correcto. Los archivos sensibles deben estar en storage privado.

### Q5: ¿Cómo se validan tipos MIME y extensiones?

**Answer:** En `FileStorageService`:
- Validación de MIME type contra lista blanca
- Validación de extensión de archivo
- Validación de magic bytes para PDF

**Analysis:** Buen enfoque. Debe extenderse a otros tipos de archivo.

### Q6: ¿Cómo se limita el tamaño máximo?

**Answer:** En `FileStorageService`:
- Límite de 10MB configurado
- Validación antes de guardar

**Analysis:** Buen enfoque. Debe ser configurable por tipo de documento.

### Q7: ¿Qué entidades pueden tener documentos?

**Answer:** Actualmente:
- Student (StudentDocument)
- Teacher (Payslip)
- Subject (ClassMaterial)
- Payment (Receipt)

**Analysis:** Limitado a casos específicos. Necesita generalización.

### Q8: ¿Los documentos pertenecen a docentes, alumnos, usuarios, instituciones o al sistema?

**Answer:** Actualmente:
- Alumnos (StudentDocument)
- Docentes (Payslip)
- Materias (ClassMaterial)
- Pagos (Receipt)

**Analysis:** No hay documentos institucionales ni del sistema. Necesita expansión.

### Q9: ¿Qué tipos de documento iniciales conviene crear?

**Answer:** Basado en el enum `DocumentType` existente:
- DNI
- CERTIFICATE
- CONSTANCY
- SECONDARY_TITLE
- PHOTO_ID
- MEDICAL_CERTIFICATE
- OTHER

**Propuesta adicional:**
- CONTRACT (contratos)
- LEGAL (documentos legales)
- ADMINISTRATIVE (documentos administrativos)
- ACADEMIC (documentos académicos)
- FINANCIAL (documentos financieros)

**Analysis:** El enum actual es limitado a documentos de alumnos. Necesita expansión.

### Q10: ¿Cómo se organiza por tipo?

**Answer:** Actualmente:
- Por modelo (StudentDocument, Payslip, etc.)
- Por enum DocumentType (solo para StudentDocument)

**Analysis:** No hay organización unificada. Cada modelo maneja sus tipos.

### Q11: ¿Quién puede subir documentos?

**Answer:** Actualmente:
- StudentDocument: Roles con permiso STUDENT update
- Payslip: Roles FINANZAS, LIQUIDADOR
- ClassMaterial: Docentes (propietarios de materia)
- Receipt: Roles con permiso RECEIPT create

**Analysis:** Permisos granulares existentes, pero no unificados para documentos.

### Q12: ¿Quién puede ver documentos?

**Answer:** Actualmente:
- StudentDocument: Roles con permiso STUDENT read
- Payslip: DIRECTOR, FINANZAS, LIQUIDADOR, docente propietario
- ClassMaterial: Público (a través de URL estática)
- Receipt: Roles con permiso RECEIPT read

**Analysis:** Inconsistente. ClassMaterial es público, otros requieren permisos.

### Q13: ¿Quién puede descargar documentos?

**Answer:** Actualmente:
- StudentDocument: Misma lógica que ver (URL pública)
- Payslip: Mismos permisos que ver (endpoint protegido)
- ClassMaterial: Público (URL estática)
- Receipt: No claro (probablemente endpoint protegido)

**Analysis:** Inconsistente. Payslip usa endpoint protegido, otros usan URL pública.

### Q14: ¿Quién puede eliminar o desactivar documentos?

**Answer:** Actualmente:
- StudentDocument: Roles con permiso STUDENT delete
- Payslip: Soft delete por roles autorizados
- ClassMaterial: No claro (probablemente solo uploader)
- Receipt: No claro

**Analysis:** Inconsistente. Payslip tiene soft delete, otros tienen hard delete.

### Q15: ¿Debe existir auditoría de subida, descarga, visualización y eliminación?

**Answer:** Actualmente:
- Subida: SÍ (auditLog en StudentDocument, Payslip, ClassMaterial)
- Descarga: SÍ (auditLog en Payslip download endpoint)
- Visualización: NO
- Eliminación: SÍ (auditLog en StudentDocument, Payslip)

**Analysis:** Auditoría parcial. Falta visualización. Debe ser consistente.

### Q16: ¿La descarga debe ser por URL pública o endpoint protegido?

**Answer:** Actualmente mixto:
- StudentDocument: URL pública
- Payslip: Endpoint protegido
- ClassMaterial: URL pública
- Receipt: Endpoint protegido (probable)

**Analysis:** Inconsistente. Recomendación: Endpoint protegido para todos.

### Q17: ¿Cómo se evita que alguien acceda a un archivo pegando la URL?

**Answer:** Actualmente:
- Payslip: Archivo en storage privado, no accesible por URL
- StudentDocument/ClassMaterial: Archivo en static/uploads, accesible por URL

**Analysis:** Riesgo de seguridad en StudentDocument/ClassMaterial. Debe migrar a storage privado.

### Q18: ¿Se requiere versionado de documentos?

**Answer:** Actualmente: NO
**Analysis:** No existe versionado. Podría ser útil para documentos institucionales.

### Q19: ¿Se requiere vencimiento de documentos?

**Answer:** Actualmente: NO
**Analysis:** No existe vencimiento. Podría ser útil para documentos temporales (certificados médicos).

### Q20: ¿Se requiere estado: activo, vencido, eliminado, reemplazado?

**Answer:** Actualmente:
- StudentDocument: verified (boolean)
- Payslip: status (enum), deletedAt (soft delete)
- ClassMaterial: Sin estado específico
- Receipt: status (enum)

**Analysis:** Inconsistente. Debe unificarse.

### Q21: ¿Qué UI mínima se necesita?

**Answer:** Actualmente:
- StudentDocument: UI en `/alumnos/[id]/documentos`
- Payslip: UI en finanzas
- ClassMaterial: UI en `/docente/materiales`
- Receipt: UI en `/recibos`

**Analysis:** UI fragmentada por entidad. Necesita UI unificada.

### Q22: ¿Qué migraciones serían necesarias?

**Answer:** Depende del diseño:
- Si se crea modelo genérico: Nueva migración
- Si se extiende StudentDocument: Migración para agregar campos
- Si se crea nuevo enum: Migración para enum
- Si se agrega entidad DOCUMENT a permisos: Migración para permisos

**Analysis:** Requiere migración en cualquier caso.

### Q23: ¿Qué riesgos de seguridad existen?

**Answer:** Actualmente:
- Acceso directo a archivos en static/uploads
- Inconsistencia en validación de permisos
- Falta de validación unificada de tipos MIME
- Falta de auditoría completa

**Analysis:** Riesgos significativos que deben abordarse.

### Q24: ¿Qué queda fuera del MVP?

**Answer:** Propuesta:
- Versionado de documentos
- Vencimiento automático
- OCR / indexación de contenido
- Preview de documentos en browser
- Edición inline de documentos
- Compartir documentos externamente
- Workflow de aprobación complejo
- Integración con storage cloud (S3, etc.)

---

## 3. Proposed Design

### 3.1 Design Philosophy

**Principles:**
1. **Security First:** All documents in private storage, protected endpoints
2. **Consistency:** Unified document model, unified permissions
3. **Extensibility:** Generic model that can handle multiple entity types
4. **Auditability:** Complete audit trail for all operations
5. **Reusability:** Leverage existing infrastructure (permissions, audit, storage)

### 3.2 Proposed Prisma Models

#### Option A: Generic Document Model (Recommended)

```prisma
// Tipo de entidad dueña del documento
enum DocumentOwnerType {
  STUDENT
  TEACHER
  STAFF
  INSTITUTION
  SYSTEM
  COURSE
  COMMISSION
  SUBJECT
  PAYMENT
  RECEIPT
  PAYMENT_AGREEMENT
}

// Tipo de documento (expandido)
enum DocumentCategory {
  // Documentos personales
  IDENTITY           // DNI, pasaporte, etc.
  ACADEMIC           // Títulos, certificados académicos
  MEDICAL            // Certificados médicos
  LEGAL              // Contratos, documentos legales
  
  // Documentos institucionales
  ADMINISTRATIVE     // Documentos administrativos
  FINANCIAL          // Documentos financieros
  ACADEMIC_INST      // Documentos académicos institucionales
  
  // Documentos de sistema
  SYSTEM             // Documentos del sistema
  TEMPLATE           // Plantillas
  
  // Otros
  OTHER
}

// Subtipo específico (para categorización fina)
enum DocumentSubType {
  // Identidad
  DNI
  PASSPORT
  PHOTO_ID
  
  // Académicos
  SECONDARY_TITLE
  UNIVERSITY_TITLE
  CERTIFICATE
  CONSTANCY
  TRANSCRIPT
  
  // Médicos
  MEDICAL_CERTIFICATE
  VACCINATION_RECORD
  
  // Legales
  CONTRACT
  AGREEMENT
  LIABILITY_WAIVER
  
  // Administrativos
  ENROLLMENT_FORM
  REGISTRATION
  OFFICIAL_NOTICE
  
  // Financieros
  RECEIPT
  INVOICE
  PAYMENT_PROOF
  
  // Sistema
  LOGO
  LETTERHEAD
  FORM_TEMPLATE
  
  OTHER
}

// Estado del documento
enum DocumentStatus {
  ACTIVE       // Activo y accesible
  EXPIRED      // Vencido
  REVOKED      // Revocado
  REPLACED     // Reemplazado por nueva versión
  DELETED      // Eliminado (soft delete)
}

// Visibilidad del documento
enum DocumentVisibility {
  PRIVATE      // Solo dueño y roles autorizados
  INTERNAL     // Solo usuarios del sistema
  PUBLIC       // Público (con URL)
}

// Modelo principal de documento
model Document {
  id                String              @id @default(cuid())
  
  // Metadatos del archivo
  originalFileName  String
  internalFileName  String              // Nombre seguro con UUID
  fileKey           String              // Clave de almacenamiento
  filePath          String              // Ruta de almacenamiento
  fileSize          Int
  mimeType          String
  fileHash          String?             // SHA-256 para integridad
  
  // Categorización
  category          DocumentCategory
  subType           DocumentSubType
  customType        String?             // Tipo personalizado si subType = OTHER
  
  // Propietario y entidad
  ownerType         DocumentOwnerType
  ownerId           String              // ID de la entidad dueña
  
  // Estado y visibilidad
  status            DocumentStatus      @default(ACTIVE)
  visibility        DocumentVisibility  @default(PRIVATE)
  
  // Metadatos adicionales
  title             String
  description       String?             @db.Text
  tags              String[]            // Array de tags para búsqueda
  metadata          Json?               // Metadatos flexibles
  
  // Fechas
  uploadedAt        DateTime            @default(now())
  expiresAt         DateTime?           // Vencimiento opcional
  accessedAt        DateTime?           // Último acceso
  deletedAt         DateTime?           // Soft delete
  
  // Usuario y contexto
  uploadedBy        String
  uploadedByName    String
  lastModifiedBy    String?
  lastModifiedByName String?
  
  // Versionado (opcional para MVP)
  version           Int                 @default(1)
  parentDocumentId  String?             // Si es versión de otro documento
  isLatestVersion   Boolean             @default(true)
  
  // Relaciones
  uploader          User                @relation("DocumentUploader", fields: [uploadedBy], references: [id])
  lastModifier      User?               @relation("DocumentLastModifier", fields: [lastModifiedBy], references: [id])
  parentDocument    Document?           @relation("DocumentVersions", fields: [parentDocumentId], references: [id])
  versions          Document[]          @relation("DocumentVersions")
  accessLogs        DocumentAccessLog[]
  
  @@index([ownerType, ownerId])
  @@index([category, subType])
  @@index([status])
  @@index([visibility])
  @@index([uploadedAt])
  @@index([expiresAt])
  @@index([fileKey])
  @@map("documents")
}

// Log de acceso a documentos
model DocumentAccessLog {
  id          String   @id @default(cuid())
  documentId  String
  action      String   // VIEW, DOWNLOAD, PRINT, SHARE
  userId      String?
  userName    String?
  ipAddress   String?
  userAgent   String?
  success     Boolean  @default(true)
  error       String?
  accessedAt  DateTime @default(now())
  
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@index([documentId])
  @@index([userId])
  @@index([accessedAt])
  @@map("document_access_logs")
}
```

**Advantages:**
- Unified model for all document types
- Flexible categorization
- Support for multiple entity types
- Built-in versioning support
- Complete audit trail
- Private storage by default
- Extensible metadata

**Disadvantages:**
- Requires migration
- May need data migration from existing models
- More complex than simple extension

#### Option B: Extend Existing Models (Alternative)

Extend `StudentDocument` to be more generic and create similar models for other entities.

**Advantages:**
- Less migration work
- Preserves existing functionality
- Simpler transition

**Disadvantages:**
- Code duplication across models
- Inconsistent behavior
- Harder to maintain
- No unified document management

**Recommendation:** Option A (Generic Document Model)

### 3.3 Proposed Storage Strategy

**Base Strategy:** Private storage for all documents

**Storage Structure:**
```
storage/private/documents/
  ├── {ownerType}/
  │   ├── {ownerId}/
  │   │   ├── {category}/
  │   │   │   ├── {year}/
  │   │   │   │   ├── {month}/
  │   │   │   │   │   ├── {uuid}.{ext}
```

**Example:**
```
storage/private/documents/
  ├── STUDENT/
  │   ├── student_123/
  │   │   ├── IDENTITY/
  │   │   │   ├── 2026/
  │   │   │   │   ├── 06/
  │   │   │   │   │   ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
  ├── TEACHER/
  │   ├── teacher_456/
  │   │   ├── FINANCIAL/
  │   │   │   ├── 2026/
  │   │   │   │   ├── 06/
  │   │   │   │   │   ├── f6e5d4c3-b2a1-0987-fedc-ba9876543210.pdf
```

**File Key Format:**
```
{ownerType}/{ownerId}/{category}/{year}/{month}/{uuid}.{ext}
```

**Benefits:**
- Organized by entity type
- Organized by time (useful for cleanup)
- Not publicly accessible
- Consistent with existing Payslip pattern
- Easy to migrate to cloud storage later

### 3.4 Proposed Permission System

**Add to existing entities:**
```typescript
// In permissions-granular.ts
const ENTITIES = [
  // ... existing entities
  'DOCUMENT'
] as const;

export type Entity = (typeof ENTITIES)[number];
```

**Permission Matrix:**

| Role | create | read | update | delete |
|------|--------|------|--------|--------|
| SUPERADMIN | ✅ | ✅ | ✅ | ✅ |
| DIRECTOR | ✅ | ✅ | ✅ | ✅ |
| SECRETARIA | ✅ | ✅ | ✅ | ✅ |
| FINANZAS | ✅ | ✅ | ✅ | ✅ |
| DOCENTE | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) |
| PRECEPTOR | ❌ | ✅ (students) | ❌ | ❌ |
| ALUMNO | ❌ | ✅ (own) | ❌ | ❌ |

**Additional Rules:**
- Users can always read their own documents
- Users can always upload documents for entities they own
- ADMIN roles can manage all documents
- Document visibility (PRIVATE/INTERNAL/PUBLIC) adds another layer

### 3.5 Proposed Validation Rules

**File Validation:**
- Max size: 10MB (configurable by category)
- Allowed MIME types by category:
  - IDENTITY: application/pdf, image/jpeg, image/png
  - ACADEMIC: application/pdf
  - MEDICAL: application/pdf, image/jpeg, image/png
  - LEGAL: application/pdf
  - FINANCIAL: application/pdf
  - OTHER: application/pdf, image/jpeg, image/png
- Magic bytes validation for PDF
- Extension validation matches MIME type

**Filename Sanitization:**
- Original filename preserved in DB
- Internal filename: `{uuid}.{ext}`
- No special characters in internal filename
- No path traversal possible

**Integrity Check:**
- SHA-256 hash calculated on upload
- Hash stored in database
- Optional: Re-validate on download

### 3.6 Proposed Audit Strategy

**Audit Actions:**
- CREATE: Document uploaded
- UPDATE: Document metadata updated
- DELETE: Document deleted (soft)
- RESTORE: Document restored
- VIEW: Document viewed
- DOWNLOAD: Document downloaded
- EXPIRE: Document expired
- REVOKE: Document revoked

**Audit Fields:**
- userId, userName
- action
- entityType: 'Document'
- entityId
- description
- changes (JSON diff for updates)
- ipAddress
- userAgent

**Access Log:**
- Separate table for detailed access tracking
- Every view/download logged
- Includes success/failure
- Useful for security analysis

### 3.7 Proposed Download Pattern

**Endpoint:** `/api/documents/[id]/download`

**Flow:**
1. User requests download
2. Check authentication
3. Check permission (read + ownership or role)
4. Check document status (ACTIVE, not EXPIRED)
5. Check document visibility
6. Log access in DocumentAccessLog
7. Log audit action (DOWNLOAD)
8. Read file from private storage
9. Return file with appropriate headers
10. Update accessedAt timestamp

**Headers:**
```
Content-Type: {mimeType}
Content-Disposition: attachment; filename="{originalFileName}"
Cache-Control: no-cache, no-store, must-revalidate
```

**Security:**
- No direct URL access
- Permission check on every download
- Audit trail
- No caching of sensitive documents

### 3.8 Proposed UI Structure

**Route:** `/documentos` (main document management)

**Features:**
- List all documents (filtered by permissions)
- Filter by category, subType, ownerType, status
- Search by title, description, tags
- Upload new document
- View document details
- Download document
- Delete document (soft)
- View access logs

**Entity-Specific Routes:**
- `/alumnos/[id]/documentos` - Student documents (existing, redirect to new)
- `/docente/[id]/documentos` - Teacher documents
- `/institucion/documentos` - Institutional documents

**UI Components:**
- Document list with filters
- Document detail view
- Upload form with validation
- Access log viewer
- Version history (if versioning implemented)

---

## 4. Security Risks and Mitigations

### 4.1 Identified Risks

**Risk 1: Direct URL Access to Public Files**
- **Current:** StudentDocument and ClassMaterial in static/uploads
- **Impact:** Unauthorized access by guessing URLs
- **Mitigation:** Migrate all documents to private storage

**Risk 2: Inconsistent Permission Validation**
- **Current:** Different permission patterns per model
- **Impact:** Potential authorization bypass
- **Mitigation:** Unified permission system for all documents

**Risk 3: Insufficient File Validation**
- **Current:** Only PDF validation in FileStorageService
- **Impact:** Malicious file upload
- **Mitigation:** Comprehensive validation by category

**Risk 4: Missing Audit Trail**
- **Current:** No view access logging
- **Impact:** Unable to detect unauthorized access
- **Mitigation:** Complete access logging

**Risk 5: File Deletion Without Trace**
- **Current:** Hard delete in some models
- **Impact:** Data loss, no recovery
- **Mitigation:** Soft delete for all documents

**Risk 6: Filename Exposure**
- **Current:** Original filenames in URLs
- **Impact:** Information disclosure
- **Mitigation:** UUID-based internal filenames

**Risk 7: No File Integrity Verification**
- **Current:** No hash verification
- **Impact:** File tampering undetected
- **Mitigation:** SHA-256 hash storage and verification

**Risk 8: No Expiration Management**
- **Current:** No expiration for sensitive documents
- **Impact:** Sensitive documents accessible indefinitely
- **Mitigation:** Expiration date and automatic status update

### 4.2 Mitigation Strategies

**Storage Security:**
- All documents in private storage
- Protected endpoints for all access
- No direct URL access

**Access Control:**
- Unified permission system
- Role-based access control
- Ownership-based access control
- Visibility levels (PRIVATE/INTERNAL/PUBLIC)

**File Validation:**
- Category-specific MIME type validation
- Magic bytes validation
- Extension validation
- Size limits
- Filename sanitization

**Audit and Monitoring:**
- Complete audit trail
- Access logging
- Failed access attempt logging
- Regular audit review

**Data Integrity:**
- SHA-256 hash storage
- Optional hash verification on download
- Soft delete with retention period
- Versioning support

---

## 5. MVP Phases

### Phase 1.1: Schema and Database
**Objective:** Create database structure

**Tasks:**
- Create Document model
- Create DocumentAccessLog model
- Create enums (DocumentOwnerType, DocumentCategory, DocumentSubType, DocumentStatus, DocumentVisibility)
- Add DOCUMENT entity to permissions
- Create migration
- Test migration

**Deliverables:**
- Updated schema.prisma
- Migration file
- Migration applied successfully

### Phase 1.2: Storage Service
**Objective:** Generic file storage service

**Tasks:**
- Refactor FileStorageService to be generic
- Add category-specific validation
- Add support for multiple MIME types
- Add hash calculation
- Implement private storage structure
- Add file existence check
- Add file deletion with soft delete support

**Deliverables:**
- Generic FileStorageService
- Unit tests for storage service
- Documentation

### Phase 1.3: Document Service
**Objective:** Business logic for document management

**Tasks:**
- Create DocumentService
- Implement upload method
- Implement download method
- Implement list method
- Implement delete method (soft)
- Implement update method
- Implement permission checks
- Implement audit logging
- Implement access logging

**Deliverables:**
- DocumentService
- Unit tests
- Integration tests

### Phase 1.4: API Endpoints
**Objective:** REST API for document operations

**Tasks:**
- Create `/api/documents/upload` endpoint
- Create `/api/documents/[id]/download` endpoint
- Create `/api/documents/[id]` endpoint (GET, PATCH, DELETE)
- Create `/api/documents` endpoint (GET, POST)
- Implement authentication
- Implement permission checks
- Implement audit logging
- Implement error handling

**Deliverables:**
- API endpoints
- API tests
- API documentation

### Phase 1.5: Basic UI
**Objective:** Minimal UI for document management

**Tasks:**
- Create `/documentos` route
- Create document list view
- Create document upload form
- Create document detail view
- Implement filters
- Implement search
- Implement permission-based UI

**Deliverables:**
- UI components
- UI tests
- User documentation

### Phase 1.6: Data Migration (Optional)
**Objective:** Migrate existing documents

**Tasks:**
- Create migration script for StudentDocument
- Create migration script for ClassMaterial
- Migrate files from static to private storage
- Update database records
- Verify migration
- Rollback plan

**Deliverables:**
- Migration script
- Migration verification
- Rollback script

### Phase 1.7: Testing and Validation
**Objective:** Comprehensive testing

**Tasks:**
- Unit tests for all services
- Integration tests for API
- E2E tests for UI
- Security tests
- Performance tests
- Load tests

**Deliverables:**
- Test suite
- Test results
- Performance benchmarks

### Phase 1.8: Documentation and Closure
**Objective:** Complete documentation

**Tasks:**
- API documentation
- User documentation
- Admin documentation
- Security documentation
- Deployment documentation
- Closure checklist

**Deliverables:**
- Complete documentation
- Closure document
- Production readiness checklist

---

## 6. Out of Scope for MVP

**Features NOT included in MVP:**
- Document versioning (infrastructure exists, UI not implemented)
- Document expiration automation (infrastructure exists, cron not implemented)
- OCR / content indexing
- Document preview in browser
- Inline document editing
- External document sharing
- Complex approval workflows
- Cloud storage integration (S3, GCS, Azure)
- Document analytics
- Advanced search (full-text)
- Document collaboration
- Electronic signatures
- Document watermarking
- Batch operations
- Document templates
- Automated document generation

---

## 7. Files to Modify

**Schema:**
- `prisma/schema.prisma` - Add new models and enums

**Services:**
- `src/lib/server/services/storage/file-storage.service.ts` - Refactor to generic
- `src/lib/server/services/document/document.service.ts` - Create new

**Permissions:**
- `src/lib/server/auth/permissions-granular.ts` - Add DOCUMENT entity

**API:**
- `src/routes/api/documents/+server.ts` - Create new
- `src/routes/api/documents/[id]/+server.ts` - Create new
- `src/routes/api/documents/[id]/download/+server.ts` - Create new

**UI:**
- `src/routes/(app)/documentos/+page.svelte` - Create new
- `src/routes/(app)/documentos/+page.server.ts` - Create new

**Tests:**
- `scripts/test-document-service.ts` - Create new
- `scripts/test-document-api.ts` - Create new

**Migration:**
- `prisma/migrations/{timestamp}_add_document_management/` - Create new

---

## 8. Migration Requirements

**Required Migration:**
- Add Document model
- Add DocumentAccessLog model
- Add DocumentOwnerType enum
- Add DocumentCategory enum
- Add DocumentSubType enum
- Add DocumentStatus enum
- Add DocumentVisibility enum
- Add DOCUMENT entity to Permission model (if needed)
- Update User relations for Document

**Optional Migration (Data Migration):**
- Migrate StudentDocument to Document
- Migrate ClassMaterial to Document
- Migrate files from static/uploads to storage/private/documents
- Update file URLs and keys

**Migration Strategy:**
1. Create schema migration
2. Apply schema migration
3. Create data migration script
4. Test data migration in staging
5. Run data migration in production
6. Verify migration
7. Cleanup old data after retention period

---

## 9. Summary and Recommendations

### 9.1 Current State Summary

**Strengths:**
- Existing document models (StudentDocument, Payslip, ClassMaterial)
- Existing permission system (granular)
- Existing audit system
- Existing private storage pattern (Payslip)
- Existing FileStorageService foundation

**Weaknesses:**
- Inconsistent storage strategy (public vs private)
- Inconsistent permission validation
- Incomplete audit trail (no view logging)
- No unified document model
- Limited document types
- Security risks in public storage

### 9.2 Design Recommendations

**Primary Recommendation:**
- Implement generic Document model (Option A)
- Migrate all documents to private storage
- Implement unified permission system
- Implement complete audit trail
- Refactor FileStorageService to generic

**Secondary Recommendations:**
- Start with MVP phases
- Implement data migration after MVP is stable
- Consider cloud storage for future scalability
- Implement document versioning in future phase

### 9.3 Implementation Priority

**High Priority:**
1. Schema and database (Phase 1.1)
2. Storage service refactoring (Phase 1.2)
3. Document service (Phase 1.3)
4. API endpoints (Phase 1.4)

**Medium Priority:**
5. Basic UI (Phase 1.5)
6. Testing and validation (Phase 1.7)

**Low Priority:**
7. Data migration (Phase 1.6) - can be done later
8. Advanced features (out of scope)

### 9.4 Security Recommendations

**Immediate:**
- Migrate all documents to private storage
- Implement protected download endpoints
- Implement complete access logging

**Short-term:**
- Implement file integrity verification
- Implement document expiration
- Implement soft delete for all documents

**Long-term:**
- Implement document versioning
- Implement advanced security features
- Regular security audits

### 9.5 Go/No-Go Criteria

**Go Criteria:**
- Schema design approved
- Storage strategy approved
- Permission model approved
- Security risks addressed
- MVP phases defined

**No-Go Criteria:**
- Schema design not approved
- Security risks not addressed
- Insufficient resources for migration
- Incomplete requirements

---

## 10. Next Steps

**Immediate:**
1. Review and approve this design document
2. Approve or modify proposed models
3. Approve or modify storage strategy
4. Approve or modify permission model
5. Approve MVP phases

**After Approval:**
1. Begin Phase 1.1 (Schema and Database)
2. Create migration
3. Test migration
4. Proceed to Phase 1.2

---

## Appendix A: Reusable Components

**Existing Components to Reuse:**
- `FileStorageService` - Refactor to generic
- `checkPermission` / `requirePermission` - Add DOCUMENT entity
- `auditLog` - Use for all document operations
- `AuditLog` model - Already exists
- Private storage pattern - From Payslip

**Components to Create:**
- `DocumentService` - New business logic
- Generic `FileStorageService` - Refactored
- Document API endpoints - New
- Document UI - New

---

## Appendix B: Alternative Approaches Considered

**Alternative 1: Cloud Storage (S3, GCS, Azure)**
- **Pros:** Scalable, reliable, CDN integration
- **Cons:** Additional cost, complexity, dependency
- **Decision:** Start with local storage, migrate to cloud later

**Alternative 2: Multiple Document Models**
- **Pros:** Simpler migration, preserves existing structure
- **Cons:** Code duplication, inconsistency, maintenance burden
- **Decision:** Unified generic model preferred

**Alternative 3: Hybrid Storage (Public + Private)**
- **Pros:** Flexibility, performance for public docs
- **Cons:** Complexity, security risks
- **Decision:** Private storage only for security

---

## Document History

- **Created:** June 27, 2026
- **Phase:** 1.0 - Design and Technical Analysis
- **Status:** Awaiting Approval
- **Next Phase:** 1.1 - Schema and Database (after approval)
