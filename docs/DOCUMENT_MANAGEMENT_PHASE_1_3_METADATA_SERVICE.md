# Document Management - Phase 1.3: Metadata Service

## Overview

Phase 1.3 implements the server-side metadata service that connects the private storage (from Phase 1.2) with the database models `Document` and `DocumentAccessLog` (from Phase 1.1). This service provides the core business logic for document lifecycle management, including creation, querying, access logging, soft delete, and restoration.

## Scope

This phase implements:

- **Document Management Service** (`document-management.service.ts`)
  - `createDocument()` - Creates documents with file storage and audit logging
  - `getDocumentById()` - Retrieves a single document by ID
  - `listDocuments()` - Lists documents with optional filters
  - `logDocumentAccess()` - Logs document access actions
  - `softDeleteDocument()` - Soft deletes documents
  - `restoreDocument()` - Restores soft-deleted documents
  - `getDocumentWithAccessLogs()` - Retrieves document with access logs
  - `cleanupDocumentForTest()` - Cleanup method for tests only

- **Test Script** (`test-document-management-service.ts`)
  - Tests for all service methods
  - Validation of storage integration
  - Validation of database relationships
  - Validation of audit logging
  - Validation of soft delete/restore behavior

- **Documentation** (this file)

## Not Implemented

This phase does NOT implement:

- API endpoints
- SvelteKit actions
- UI components
- HTTP download flows
- Permission checks
- Schema changes
- Migrations
- File migration from `static/uploads`
- Modifications to existing document models (`StudentDocument`, `Payslip`, `ClassMaterial`, `Receipt`)
- Cloud storage
- OCR
- Complex versioning
- Batch operations
- Cron jobs
- Preview generation

## Service Architecture

### DocumentManagementService

The service is implemented as a singleton class that provides:

1. **Transaction-safe document creation** with compensating rollback for physical files
2. **Audit logging** for all document operations
3. **Soft delete** with preservation of physical files and access logs
4. **Flexible querying** with multiple filter options
5. **Test cleanup** for safe test data removal

### Integration Points

#### Storage Integration

The service integrates with `DocumentStorageService` from Phase 1.2:

- Uses `validateDocumentFile()` for file validation
- Uses `generateStorageKey()` for secure key generation
- Uses `saveDocumentFile()` for physical file storage
- Uses `calculateSha256()` for hash calculation
- Uses `deleteDocumentFileForCleanup()` for rollback/cleanup

#### Database Integration

The service integrates with Prisma models from Phase 1.1:

- Creates `Document` records with all metadata
- Creates `DocumentAccessLog` records for audit trail
- Manages `Document.uploadedBy` relation
- Manages `DocumentAccessLog.user` relation
- Uses transactions for atomic operations

## Service Methods

### createDocument(params)

Creates a new document with file storage and audit logging.

**Parameters:**
```typescript
interface CreateDocumentParams {
  file: File;
  ownerType: DocumentOwnerType;
  ownerId: string;
  category: DocumentCategory;
  subType: DocumentSubType;
  visibility: DocumentVisibility;
  uploadedById: string;
  metadata?: Record<string, unknown>;
}
```

**Flow:**
1. Validate file using `document-file-validation`
2. Generate secure storage key using `DocumentStorageService`
3. Save file to `storage/private/documents`
4. Calculate SHA-256 hash
5. Create `Document` record in transaction
6. Create `DocumentAccessLog` with `UPLOAD` action in transaction
7. If transaction fails, delete physical file (compensating rollback)
8. Return created document

**Rollback Behavior:**
If the database transaction fails after the physical file is saved, the service automatically deletes the physical file to prevent orphaned files.

**Returns:** `Document` object with all metadata

### getDocumentById(id)

Retrieves a document by ID with uploader information.

**Parameters:**
- `id`: Document ID

**Returns:** `Document | null` with `uploadedBy` relation included

### listDocuments(params)

Lists documents with optional filters.

**Parameters:**
```typescript
interface ListDocumentsParams {
  ownerType?: DocumentOwnerType;
  ownerId?: string;
  category?: DocumentCategory;
  subType?: DocumentSubType;
  status?: DocumentStatus;
  visibility?: DocumentVisibility;
  uploadedById?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}
```

**Default Behavior:**
- Excludes deleted documents unless `includeDeleted: true`
- Orders by `createdAt` descending
- Includes `uploadedBy` relation

**Returns:** Array of `Document` objects

### logDocumentAccess(params)

Logs a document access action.

**Parameters:**
```typescript
interface LogDocumentAccessParams {
  documentId: string;
  userId: string;
  action: DocumentAccessAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
```

**Supported Actions:**
- `UPLOAD` - Document upload
- `VIEW` - Document view
- `DOWNLOAD` - Document download
- `UPDATE` - Document update
- `DELETE` - Document soft delete
- `RESTORE` - Document restoration

**Returns:** `DocumentAccessLog` object

### softDeleteDocument(id, userId)

Soft deletes a document without removing the physical file.

**Parameters:**
- `id`: Document ID
- `userId`: User performing the deletion

**Behavior:**
- Sets `status = DELETED`
- Sets `deletedAt = now()`
- Creates `DocumentAccessLog` with `DELETE` action
- Does NOT delete physical file
- Does NOT delete access logs

**Returns:** Updated `Document` object

### restoreDocument(id, userId)

Restores a soft-deleted document.

**Parameters:**
- `id`: Document ID
- `userId`: User performing the restoration

**Behavior:**
- Sets `status = ACTIVE`
- Sets `deletedAt = null`
- Creates `DocumentAccessLog` with `RESTORE` action

**Returns:** Updated `Document` object

### getDocumentWithAccessLogs(id)

Retrieves a document with all its access logs.

**Parameters:**
- `id`: Document ID

**Returns:** `{ document: Document; accessLogs: DocumentAccessLog[] } | null`

### cleanupDocumentForTest(documentId)

Deletes document record and physical file (for tests only).

**Parameters:**
- `documentId`: Document ID

**Behavior:**
- Deletes all `DocumentAccessLog` records
- Deletes `Document` record
- Deletes physical file from storage
- Handles errors gracefully

**Warning:** This method should only be used for test cleanup, not functional user flows.

## Transaction and File Management

### Compensating Transaction Pattern

Since physical files cannot be part of a database transaction, the service uses a compensating transaction pattern:

1. **Save file first** - Physical file is saved to storage
2. **Attempt DB transaction** - Create Document and AccessLog records
3. **Rollback on failure** - If DB transaction fails, delete the physical file
4. **Re-throw error** - Propagate the original error to caller

This ensures no orphaned files are left in storage if the database operation fails.

### Error Handling

The service handles errors at multiple levels:

- **File validation errors** - Thrown before any file I/O
- **Storage errors** - Thrown during file save
- **Database errors** - Trigger compensating rollback
- **Cleanup errors** - Logged but do not prevent rollback

## Audit Logging

### DocumentAccessLog Records

Every auditable action creates a `DocumentAccessLog` record with:

- `documentId` - Reference to the document
- `userId` - User performing the action (required)
- `action` - Type of action performed
- `ipAddress` - Optional IP address
- `userAgent` - Optional user agent string
- `metadata` - Optional JSON metadata
- `createdAt` - Timestamp

### Automatic Logging

The following actions are automatically logged:

- `UPLOAD` - Logged by `createDocument()`
- `DELETE` - Logged by `softDeleteDocument()`
- `RESTORE` - Logged by `restoreDocument()`

### Manual Logging

The following actions require explicit calls to `logDocumentAccess()`:

- `VIEW` - When a document is viewed
- `DOWNLOAD` - When a document is downloaded
- `UPDATE` - When document metadata is updated

## Security Considerations

### Path Security

- Storage keys are validated by `DocumentStorageService`
- `ownerId` is validated to prevent path traversal
- Physical paths are never exposed in service responses
- Only `storageKey` is stored in the database

### Data Security

- Files are stored in `storage/private/documents` (gitignored)
- No raw SQL queries used
- All database operations use Prisma Client
- Metadata is stored as JSON in the database

### Access Control

- This phase does NOT implement permission checks
- Permission checks will be added in Phase 1.4 (endpoints)
- The service assumes the caller has validated permissions

## Test Coverage

The test script (`test-document-management-service.ts`) covers:

1. **User creation** - Creates a test user
2. **Document creation** - Creates a document with file
3. **Physical file verification** - Confirms file exists in storage
4. **Document record verification** - Confirms DB record exists
5. **UPLOAD log verification** - Confirms log was created
6. **Relation verification** - Confirms `Document.uploadedBy` relation
7. **Relation verification** - Confirms `DocumentAccessLog.userId` relation
8. **List by owner** - Filters by `ownerType + ownerId`
9. **List by category** - Filters by `category`
10. **List by subType** - Filters by `subType`
11. **VIEW logging** - Registers VIEW action
12. **DOWNLOAD logging** - Registers DOWNLOAD action
13. **Soft delete** - Performs soft delete
14. **File preservation** - Confirms file not deleted on soft delete
15. **Log preservation** - Confirms access logs preserved
16. **Restore** - Restores soft-deleted document
17. **Document with logs** - Retrieves document with access logs
18. **Cleanup** - Removes all test data and physical files

The test also runs the storage service test to ensure compatibility.

## Database Relationships

### Document to User

```typescript
uploadedBy: User @relation("DocumentUploader", fields: [uploadedById], references: [id], onDelete: Restrict)
```

- A document has one uploader
- Cannot delete user if they have uploaded documents (Restrict)
- Relation is included in `getDocumentById()` and `listDocuments()`

### DocumentAccessLog to Document

```typescript
document: Document @relation(fields: [documentId], references: [id], onDelete: Restrict)
```

- An access log belongs to one document
- Cannot delete document if it has access logs (Restrict)
- Logs are preserved on soft delete

### DocumentAccessLog to User

```typescript
user: User @relation("DocumentAccessLogUser", fields: [userId], references: [id], onDelete: Restrict)
```

- An access log belongs to one user
- Cannot delete user if they have access logs (Restrict)
- `userId` is required (not nullable)

## Next Steps (Phase 1.4)

Phase 1.4 will implement:

- API endpoints for document upload
- API endpoints for document download
- API endpoints for document listing
- API endpoints for document metadata
- Permission checks before operations
- HTTP response streaming for downloads
- Integration with existing authentication
- Error handling for API layer

## Design Decisions

### Why Compensating Transaction Pattern?

Physical files cannot be part of a database transaction. The compensating pattern ensures:

- No orphaned files if DB fails
- Atomic behavior from caller's perspective
- Clean rollback on errors

### Why Soft Delete?

Soft delete preserves:

- Audit trail (access logs)
- Physical file (can be restored)
- Historical data (analytics)
- Compliance requirements

### Why Required userId in AccessLog?

Required `userId` ensures:

- Every action is attributable
- Audit trail is complete
- Compliance with security requirements
- No anonymous actions

### Why Separate Storage Service?

Separation of concerns:

- Storage service handles file I/O
- Metadata service handles business logic
- Easier to test each component
- Can replace storage implementation later

## Validation Results

### Prisma Validation
- `npx prisma format` ✓
- `npx prisma validate` ✓
- `npx prisma generate` ✓
- `npx prisma migrate status` ✓ (33 migrations, up to date)

### Build Validation
- `npm run check` ✓ (0 errors, 104 warnings)
- `npm run build` ✓

### Test Validation
- `npx tsx scripts/test-document-management-storage.ts` ✓ (18 tests)
- `npx tsx scripts/test-document-management-service.ts` ✓ (17 tests)

### Code Quality Validation
- No `$queryRaw` or `$executeRaw` used ✓
- No `@ts-ignore` or `@ts-expect-error` used ✓
- No `any` or `as any` used ✓

## Summary

Phase 1.3 successfully implements the metadata service that connects private storage with database models. The service provides:

- Transaction-safe document creation with file rollback
- Comprehensive audit logging
- Soft delete with file preservation
- Flexible querying with multiple filters
- Full test coverage

The service is ready for integration with API endpoints in Phase 1.4.
