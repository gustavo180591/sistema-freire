# Document Management - Phase 1.1: Schema and Database Base

**Date:** 2026-06-27  
**Status:** Completed  
**Migration:** `20260627170853_add_document_management_base`

---

## Overview

Phase 1.1 establishes the foundational database schema for the Document Management module. This phase focuses on creating the Prisma models, enums, and database structure without implementing file upload/download, UI, endpoints, or migration of existing documents.

---

## Models Created

### Document

**Table:** `documents`

**Purpose:** Central storage for document metadata across the entire system.

**Fields:**

| Field          | Type               | Description                             |
| -------------- | ------------------ | --------------------------------------- |
| `id`           | String (CUID)      | Primary key                             |
| `originalName` | String             | Original filename from upload           |
| `storedName`   | String             | System-generated filename               |
| `storageKey`   | String (unique)    | Unique storage identifier               |
| `mimeType`     | String             | MIME type (e.g., application/pdf)       |
| `extension`    | String             | File extension (e.g., pdf)              |
| `sizeBytes`    | Int                | File size in bytes                      |
| `sha256Hash`   | String?            | SHA-256 hash for integrity verification |
| `ownerType`    | DocumentOwnerType  | Type of entity that owns the document   |
| `ownerId`      | String             | ID of the entity that owns the document |
| `category`     | DocumentCategory   | High-level document classification      |
| `subType`      | DocumentSubType    | Specific document type                  |
| `status`       | DocumentStatus     | Current document status                 |
| `visibility`   | DocumentVisibility | Access visibility level                 |
| `uploadedById` | String             | User who uploaded the document          |
| `createdAt`    | DateTime           | Creation timestamp                      |
| `updatedAt`    | DateTime           | Last update timestamp                   |
| `deletedAt`    | DateTime?          | Soft delete timestamp                   |
| `expiresAt`    | DateTime?          | Optional expiration date                |
| `metadata`     | Json?              | Flexible metadata storage               |
| `tags`         | String[]           | Searchable tags                         |

**Relations:**

- `uploadedBy`: User who uploaded the document (FK to users)
- `accessLogs`: Associated access log entries

**Indexes:**

- `storageKey` (unique)
- `ownerType + ownerId`
- `category`
- `subType`
- `status`
- `visibility`
- `uploadedById`
- `createdAt`
- `deletedAt`

---

### DocumentAccessLog

**Table:** `document_access_logs`

**Purpose:** Audit trail for all document access actions.

**Fields:**

| Field        | Type                 | Description                              |
| ------------ | -------------------- | ---------------------------------------- |
| `id`         | String (CUID)        | Primary key                              |
| `documentId` | String               | Reference to document                    |
| `userId`     | String               | User who performed the action (required) |
| `action`     | DocumentAccessAction | Type of action performed                 |
| `createdAt`  | DateTime             | Timestamp of action                      |
| `ipAddress`  | String?              | IP address of requester                  |
| `userAgent`  | String?              | User agent string                        |
| `metadata`   | Json?                | Additional context metadata              |

**Relations:**

- `document`: Reference to the document (FK to documents)
- `user`: Reference to the user who performed the action (FK to users, required)

**Audit Requirement:**

- `userId` is mandatory for all auditable actions
- Every access log must be associated with an authenticated user
- System events, if needed in future, will be designed separately

**Indexes:**

- `documentId`
- `userId`
- `action`
- `createdAt`
- `documentId + createdAt`

---

## Enums Created

### DocumentOwnerType

Defines the types of entities that can own documents.

```prisma
enum DocumentOwnerType {
  STUDENT    // Student entity
  TEACHER    // Teacher entity
  STAFF      // Staff member
  USER       // Generic user
  INSTITUTION // Institution-level
  SYSTEM     // System-generated
}
```

**Rationale:** Generic ownership allows the same document table to serve multiple entity types without requiring separate tables or complex polymorphic foreign keys. The combination of `ownerType + ownerId` provides flexible ownership.

---

### DocumentCategory

High-level classification of documents.

```prisma
enum DocumentCategory {
  ACADEMIC       // Academic records
  FINANCIAL      // Financial documents
  ADMINISTRATIVE // Administrative paperwork
  LEGAL          // Legal documents
  MEDICAL        // Medical records
  CERTIFICATE    // Certificates
  CONTRACT       // Contracts and agreements
  OTHER          // Uncategorized
}
```

**Rationale:** Categories provide the first level of organization and enable coarse-grained filtering and permissions.

---

### DocumentSubType

Specific document types within categories.

```prisma
enum DocumentSubType {
  // Academic
  ENROLLMENT_CERTIFICATE
  STUDY_CERTIFICATE
  GRADE_REPORT
  DIPLOMA
  TRANSCRIPT

  // Financial
  RECEIPT
  INVOICE
  PAYMENT_PROOF
  SCHOLARSHIP_DOCUMENT

  // Administrative
  IDENTITY_DOCUMENT
  TAX_DOCUMENT
  RESIDENCE_PROOF
  EMPLOYMENT_RECORD

  // Legal
  CONTRACT
  AGREEMENT
  POWER_OF_ATTORNEY
  COURT_DOCUMENT

  // Certificates
  ATTENDANCE_CERTIFICATE
  GOOD_CONDUCT_CERTIFICATE
  COMPLETION_CERTIFICATE

  // Other
  GENERAL
  UNSPECIFIED
}
```

**Rationale:** SubTypes provide fine-grained classification for specific document types, enabling precise filtering and business logic.

---

### DocumentStatus

Lifecycle states for documents.

```prisma
enum DocumentStatus {
  ACTIVE    // Currently valid and accessible
  EXPIRED   // Past expiration date
  REVOKED   // Manually revoked
  REPLACED  // Superseded by a newer version
  DELETED   // Soft-deleted
}
```

**Rationale:** Status tracking enables document lifecycle management, including expiration, revocation, and replacement workflows.

---

### DocumentVisibility

Access visibility levels.

```prisma
enum DocumentVisibility {
  PRIVATE   // Only owner and authorized users
  INTERNAL  // All authenticated users
  PUBLIC    // Anyone with the link
}
```

**Rationale:** Visibility levels provide a simple access control model that can be combined with the granular permission system.

---

### DocumentAccessAction

Types of actions that can be performed on documents.

```prisma
enum DocumentAccessAction {
  UPLOAD    // Initial upload
  VIEW      // View/download
  DOWNLOAD  // Explicit download
  UPDATE    // Metadata update
  DELETE    // Soft delete
  RESTORE   // Restore from deleted
}
```

**Rationale:** Action types enable comprehensive audit logging for compliance and security monitoring.

---

## Design Decisions

### Generic Ownership Strategy

**Decision:** Use `ownerType + ownerId` instead of polymorphic foreign keys.

**Rationale:**

- Simpler database schema without complex constraints
- More flexible for future entity types
- Easier to query across all documents for a given owner type
- Avoids database-specific polymorphic relation features
- Trade-off: No referential integrity at database level, but application-level validation can enforce this

**Implementation:**

- Index on `ownerType + ownerId` for efficient queries
- Application-level validation to ensure referenced entities exist
- Future consideration: Add triggers or application checks for integrity

---

### Soft Delete Pattern

**Decision:** Use `deletedAt` timestamp for soft delete instead of hard delete.

**Rationale:**

- Preserves audit trail
- Allows recovery of accidentally deleted documents
- Maintains referential integrity with access logs
- Enables compliance requirements for document retention

**Implementation:**

- `deletedAt` is nullable
- Index on `deletedAt` for efficient filtering of active documents
- Status field set to `DELETED` when soft-deleted
- Hard delete can be implemented later for cleanup jobs

---

### Storage Key Uniqueness

**Decision:** `storageKey` is unique to prevent duplicate storage references.

**Rationale:**

- Ensures each physical file has exactly one metadata record
- Prevents storage conflicts
- Enables deduplication by hash in future

**Implementation:**

- Unique constraint on `storageKey`
- Application responsible for generating unique keys
- Could use UUID or hash-based naming

---

### SHA-256 Hash Optional

**Decision:** `sha256Hash` is nullable, not required.

**Rationale:**

- Not all document types need integrity verification
- Optional to avoid performance overhead for non-critical documents
- Can be added later for specific document categories

**Implementation:**

- Nullable field
- Can be populated during upload for critical documents
- Enables future deduplication and integrity checks

---

### Flexible Metadata and Tags

**Decision:** Use `Json` for metadata and `String[]` for tags.

**Rationale:**

- Avoids schema changes for new metadata fields
- Tags provide simple, searchable categorization
- JSON allows structured metadata without rigid schema

**Implementation:**

- `metadata` is nullable JSONB
- `tags` is array of strings
- Application responsible for metadata structure validation

---

## Relations

### Document to User

**Relation:** `uploadedBy` → User

**Purpose:** Track which user uploaded each document.

**Constraints:**

- `ON DELETE RESTRICT` - Prevents deletion of user if they have uploaded documents
- This ensures audit trail integrity

**Future Consideration:**

- May want to allow user deletion with document reassignment
- Could add `replacedById` for document ownership transfer

---

### DocumentAccessLog to Document

**Relation:** `document` → Document

**Purpose:** Link access logs to their documents.

**Constraints:**

- `ON DELETE RESTRICT` - Prevents deletion of documents that have access logs
- This ensures audit trail integrity is preserved
- Since the module uses soft delete via `deletedAt`, hard delete should be restricted
- Logs must be deleted explicitly before documents can be hard-deleted

**Rationale:**

- Audit logs are critical for compliance and security
- Prevents accidental loss of access history
- Soft delete pattern makes cascade unnecessary
- Explicit cleanup order (logs before documents) ensures data integrity

---

### DocumentAccessLog to User

**Relation:** `user` → User

**Purpose:** Track which user performed actions, with full referential integrity.

**Constraints:**

- `ON DELETE RESTRICT` - Prevents deletion of users who have access logs
- `userId` is required (NOT NULL) for all auditable actions
- FK constraint ensures referenced users exist

**Rationale:**

- Full referential integrity for audit trail
- Required userId ensures every action has an authenticated actor
- Restrict on delete preserves audit history
- System events, if needed in future, will be designed separately with explicit fields
- Anonymous access is not part of the MVP

---

## Index Strategy

### Performance Indexes

1. **`storageKey` (unique):** Primary lookup for document retrieval
2. **`ownerType + ownerId`:** Find all documents for a specific owner
3. **`category`:** Filter by document category
4. **`subType`:** Filter by specific document type
5. **`status`:** Filter by document status (e.g., active only)
6. **`visibility`:** Filter by access level
7. **`uploadedById`:** Find documents uploaded by specific user
8. **`createdAt`:** Time-based queries and sorting
9. **`deletedAt`:** Filter out soft-deleted documents

### Access Log Indexes

1. **`documentId`:** Find all logs for a document
2. **`userId`:** Find all actions by a user
3. **`action`:** Filter by action type
4. **`createdAt`:** Time-based queries
5. **`documentId + createdAt`:** Ordered log retrieval for a document

---

## What Was Not Implemented

### Existing Document Migration

**Decision:** Did not migrate existing documents from `StudentDocument`, `Payslip`, `ClassMaterial`, or `Receipt`.

**Rationale:**

- Existing models have different storage strategies and business logic
- Migration requires careful data mapping and validation
- Better to establish new system first, then migrate incrementally
- Avoids risk of data loss during schema transition

**Future Phase:** Phase 1.2 or later will handle migration strategy.

---

### File Upload/Download

**Decision:** Did not implement file upload or download functionality.

**Rationale:**

- Phase 1.1 focuses on schema foundation
- Upload/download requires storage service integration
- Needs security considerations (validation, scanning, quotas)
- Requires endpoint implementation and UI

**Future Phase:** Phase 1.2 will implement upload/download.

---

### UI Components

**Decision:** Did not create any UI components.

**Rationale:**

- Schema-first approach ensures data model is solid
- UI can be built once data structure is validated
- Avoids rework if schema changes

**Future Phase:** Phase 1.3 or later will implement UI.

---

### Functional Permissions

**Decision:** Did not implement document-specific permission logic.

**Rationale:**

- Existing granular permission system can be extended
- Schema provides foundation for permission checks
- Permission logic requires business rules definition

**Future Phase:** Phase 1.2 will integrate with permission system.

---

### Versioning System

**Decision:** Did not implement complex document versioning.

**Rationale:**

- MVP approach prioritizes basic functionality
- Simple fields (`status = REPLACED`) sufficient for initial needs
- Complex versioning requires significant additional schema

**Future Consideration:**

- Could add `replacedById` field for simple version tracking
- Full versioning system in later phase if needed

---

### File Movement

**Decision:** Did not move existing files from `static/uploads`.

**Rationale:**

- Existing files in use by current system
- Movement requires coordination with active features
- Better to migrate incrementally

**Future Phase:** Migration will handle file movement as part of data transition.

---

## Testing

### Test Script

**Location:** `scripts/test-document-management-schema.ts`

**Coverage:**

1. Creates test user
2. Validates all enum values
3. Creates test document with all fields
4. Validates user relationship
5. Creates access log
   5.1. Validates DocumentAccessLog → Document relationship
   5.2. Validates DocumentAccessLog → User relationship
6. Tests soft delete with `deletedAt`
7. Tests search by `ownerType + ownerId`
8. Tests search by `category`
9. Tests search by `subType`
10. Validates document with access logs
11. Validates cleanup order (logs before documents due to FK constraints)
12. Confirms no physical file operations
13. Cleans up all test data

**Execution:**

```bash
npx tsx scripts/test-document-management-schema.ts
```

---

## Migration Details

### Initial Migration

**Migration Name:** `add_document_management_base`  
**Migration ID:** `20260627170853_add_document_management_base`

**SQL Operations:**

- Created 6 enums (DocumentOwnerType, DocumentCategory, DocumentSubType, DocumentStatus, DocumentVisibility, DocumentAccessAction)
- Created `documents` table with all fields and indexes
- Created `document_access_logs` table with all fields and indexes
- Added foreign key constraint from `documents.uploadedById` to `users.id`
- Added foreign key constraint from `document_access_logs.documentId` to `documents.id` (initially CASCADE)

**Validation:**

- SQL contains only document-related changes
- No modifications to existing tables
- No changes to existing models (StudentDocument, Payslip, ClassMaterial, Receipt)
- No changes to FileStorageService

---

### Corrective Migration

**Migration Name:** `fix_document_access_log_relations`  
**Migration ID:** `20260628142113_fix_document_access_log_relations`

**SQL Operations:**

- Dropped existing FK constraint `document_access_logs_documentId_fkey` (CASCADE)
- Added new FK constraint `document_access_logs_documentId_fkey` (RESTRICT)
- Added new FK constraint `document_access_logs_userId_fkey` (RESTRICT)

**Rationale:**

- Changed `DocumentAccessLog.documentId` from CASCADE to RESTRICT to preserve audit trail
- Added FK constraint for `DocumentAccessLog.userId` to ensure referential integrity
- Both constraints use RESTRICT to prevent accidental deletion of audit data
- Since the module uses soft delete, hard delete should be restricted

**Validation:**

- SQL contains only FK constraint changes for document_access_logs
- No modifications to existing tables
- No changes to document table structure
- No changes to existing models (StudentDocument, Payslip, ClassMaterial, Receipt)

---

### Second Corrective Migration

**Migration Name:** `make_document_access_log_user_required`  
**Migration ID:** `20260628144329_make_document_access_log_user_required`

**SQL Operations:**

- Changed `document_access_logs.userId` from nullable to NOT NULL

**Rationale:**

- All auditable actions must have an authenticated user
- Prevents anonymous access logs that weaken audit trail
- Ensures complete traceability for document operations
- System events, if needed in future, will be designed separately

**Validation:**

- SQL contains only ALTER TABLE for document_access_logs.userId
- No modifications to existing tables
- No changes to document table structure
- No changes to existing models (StudentDocument, Payslip, ClassMaterial, Receipt)

---

## Next Steps (Phase 1.2)

Phase 1.2 will focus on:

1. **Storage Service Integration**
   - Extend FileStorageService or create new DocumentStorageService
   - Implement file upload with validation
   - Implement secure file download
   - Add file scanning (virus/malware) if needed

2. **API Endpoints**
   - POST /api/documents/upload
   - GET /api/documents/:id/download
   - GET /api/documents/:id/metadata
   - PUT /api/documents/:id
   - DELETE /api/documents/:id (soft delete)
   - GET /api/documents (list/filter)

3. **Permission Integration**
   - Extend granular permission system with DOCUMENT entity
   - Implement permission checks for all operations
   - Add visibility-based access control

4. **Existing Document Migration**
   - Design migration strategy for StudentDocument
   - Design migration strategy for Payslip
   - Design migration strategy for ClassMaterial
   - Design migration strategy for Receipt
   - Implement incremental migration with rollback capability

5. **File Movement**
   - Plan migration from `static/uploads` to new storage
   - Implement batch migration process
   - Update existing references to use new document IDs

---

## Validation Results

All validations passed:

- `npx prisma format` ✓
- `npx prisma validate` ✓
- `npx prisma generate` ✓
- `npx prisma migrate status` ✓ (33 migrations, database up to date)
- `npm run check` ✓
- `npm run build` ✓
- Test script execution ✓

No use of:

- `db push`
- `migrate reset`
- `migrate resolve`
- `$queryRaw`
- `$executeRaw`
- `@ts-ignore`
- `@ts-expect-error`
- `any` types

---

## Summary

Phase 1.1 successfully established the foundational database schema for the Document Management module:

- **2 models created:** Document, DocumentAccessLog
- **6 enums created:** DocumentOwnerType, DocumentCategory, DocumentSubType, DocumentStatus, DocumentVisibility, DocumentAccessAction
- **3 migrations created and applied:**
  - `20260627170853_add_document_management_base` (initial schema)
  - `20260628142113_fix_document_access_log_relations` (corrective FK constraints)
  - `20260628144329_make_document_access_log_user_required` (userId required)
- **Test script created:** Comprehensive schema validation with relationship tests
- **Documentation created:** Complete design documentation

**Key design decisions:**

- Generic ownership via `ownerType + ownerId` for flexibility
- Soft delete pattern with `deletedAt` for audit trail preservation
- `ON DELETE RESTRICT` on all document-related FKs to prevent accidental data loss
- Full referential integrity for audit logs (DocumentAccessLog → User and Document)
- Required `userId` in DocumentAccessLog for complete audit traceability
- Explicit cleanup order (logs before documents) enforced by FK constraints
- No anonymous access logs - all actions must have authenticated user

The schema is production-ready and provides a solid foundation for Phase 1.2 implementation of upload/download, API endpoints, and existing document migration.
