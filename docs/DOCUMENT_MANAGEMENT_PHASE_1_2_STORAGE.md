# Document Management - Phase 1.2: Storage Service and File Validation

## Overview

Phase 1.2 implements the server-side storage service and file validation layer for the Document Management module. This phase focuses on secure file storage, validation, and integrity verification without implementing API endpoints, UI, or complete upload/download flows.

## Scope

### Implemented

- Document file validation service
- Document storage service
- Private storage directory structure
- MIME type validation
- Extension validation
- File size validation
- Filename sanitization
- Path traversal prevention
- SHA-256 hash calculation
- Secure storage key generation
- File read/write operations
- Comprehensive test suite
- Complete documentation

### Not Implemented (Deferred to Future Phases)

- API endpoints
- SvelteKit actions
- UI components
- Controlled download
- Real permission checks
- Complete document creation from forms
- Migration of existing files
- Movement from `static/uploads`
- Schema changes
- New migrations
- Cloud storage
- Preview generation
- OCR processing
- Versioning system

## Storage Structure

### Private Storage Directory

**Base Path:** `storage/private/documents/`

**Directory Structure:**

```
storage/private/documents/
└── {ownerType}/
    └── {ownerId}/
        └── {category}/
            └── {year}/
                └── {month}/
                    └── {uuid}.{ext}
```

**Example:**

```
storage/private/documents/USER/user-123/ACADEMIC/2026/06/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

### Storage Key Format

**Relative Path:** `{ownerType}/{ownerId}/{category}/{year}/{month}/{uuid}.{ext}`

**Example Storage Key:** `USER/user-123/ACADEMIC/2026/06/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf`

**Rationale:**

- Hierarchical structure for efficient organization
- Time-based partitioning (year/month) for easier maintenance
- UUID-based filenames prevent collisions
- Relative paths allow flexible storage location changes
- No absolute paths exposed in API

## File Validation

### Allowed MIME Types

| MIME Type                                                                 | Extensions      | Description    |
| ------------------------------------------------------------------------- | --------------- | -------------- |
| `application/pdf`                                                         | `.pdf`          | PDF documents  |
| `image/jpeg`                                                              | `.jpg`, `.jpeg` | JPEG images    |
| `image/png`                                                               | `.png`          | PNG images     |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx`         | Word documents |

### File Size Limit

**Maximum Size:** 10 MB (10,485,760 bytes)

**Rationale:**

- Prevents denial of service through large uploads
- Reasonable limit for document types
- Can be adjusted per category in future phases

### Validation Rules

1. **MIME Type Validation**
   - Only allowed MIME types accepted
   - MIME type checked against whitelist
   - Rejects executables, scripts, HTML, SVG, archives

2. **Extension Validation**
   - Extension must match MIME type
   - Case-insensitive comparison
   - Prevents extension spoofing

3. **File Size Validation**
   - Enforces 10 MB maximum
   - Checked before storage
   - Prevents storage exhaustion

4. **Filename Sanitization**
   - Removes path separators (`/`, `\`)
   - Prevents path traversal (`..`)
   - Removes Windows invalid characters
   - Removes control characters
   - Ensures safe filename

5. **Path Traversal Prevention**
   - Validates storage keys
   - Rejects absolute paths
   - Rejects relative paths with `..`
   - Ensures resolved path stays within storage directory
   - Uses safe character pattern validation

## Storage Service

### DocumentStorageService Class

**Location:** `src/lib/server/document-management/document-storage.service.ts`

**Methods:**

#### `generateStorageKey(params)`

Generates a secure storage key for a document.

**Parameters:**

- `ownerType`: DocumentOwnerType
- `ownerId`: string
- `category`: DocumentCategory
- `extension`: string

**Returns:** Storage key string

**Validation:**

- Validates generated storage key for path traversal
- Ensures safe character pattern

#### `calculateSha256(file)`

Calculates SHA-256 hash of file content.

**Parameters:**

- `file`: File object

**Returns:** Hexadecimal hash string

**Purpose:**

- File integrity verification
- Future deduplication capability
- Security verification

#### `saveDocumentFile(params)`

Saves a document file to storage.

**Parameters:**

- `file`: File object
- `storageKey`: Storage key string

**Validation:**

- Validates storage key
- Validates file (MIME, extension, size)
- Creates directories if needed
- Prevents overwriting existing files

**Error Handling:**

- Throws if file already exists
- Throws if validation fails
- Throws if path traversal detected

#### `getFilePath(storageKey)`

Gets the absolute file path for a storage key.

**Parameters:**

- `storageKey`: Storage key string

**Returns:** Absolute file path

**Security:**

- Validates storage key
- Resolves absolute path
- Ensures path stays within storage directory
- Prevents path traversal

#### `documentFileExists(storageKey)`

Checks if a document file exists.

**Parameters:**

- `storageKey`: Storage key string

**Returns:** Boolean

#### `readDocumentFile(storageKey)`

Reads a document file from storage.

**Parameters:**

- `storageKey`: Storage key string

**Returns:** Buffer with file content

#### `deleteDocumentFileForCleanup(storageKey)`

Deletes a document file (for cleanup only).

**Parameters:**

- `storageKey`: Storage key string

**Purpose:**

- Test cleanup utility
- Not for functional user flows
- Explicit naming to prevent misuse

## Security Measures

### 1. Private Storage

**Location:** `storage/private/documents/`

**Rationale:**

- Files not accessible via web server
- Requires server-side access
- Prevents unauthorized direct access
- Enables controlled download via API

### 2. Path Traversal Prevention

**Implementation:**

- Storage key validation
- Absolute path rejection
- Relative path with `..` rejection
- Safe character pattern enforcement
- Resolved path boundary checking

**Example:**

```typescript
// Rejected
'../../../etc/passwd';
'/absolute/path';
'..\\windows\\system32';

// Accepted
'USER/user-123/ACADEMIC/2026/06/uuid.pdf';
```

### 3. Filename Sanitization

**Removed Characters:**

- Path separators: `/`, `\`
- Path traversal: `..`
- Windows invalid: `<`, `>`, `:`, `"`, `|`, `?`, `*`
- Control characters: `\x00-\x1f`, `\x80-\x9f`

**Replaced With:** `_`

### 4. MIME Type Validation

**Whitelist Approach:**

- Only explicitly allowed types
- Rejects all others by default
- Prevents executable uploads
- Prevents script uploads

### 5. Extension Validation

**Cross-Validation:**

- Extension must match MIME type
- Case-insensitive comparison
- Prevents extension spoofing

### 6. File Size Limits

**Protection:**

- Enforced before storage
- Prevents DoS via large files
- Prevents storage exhaustion

### 7. Hash Calculation

**SHA-256:**

- Cryptographically secure
- Used for integrity verification
- Enables future deduplication
- Security verification

## File Validation Module

**Location:** `src/lib/server/document-management/document-file-validation.ts`

### Exports

#### Constants

- `ALLOWED_MIME_TYPES`: Object mapping MIME types to allowed extensions
- `MAX_FILE_SIZE`: Maximum file size in bytes (10 MB)

#### Classes

- `DocumentValidationError`: Custom error class with error codes

#### Functions

- `validateDocumentFile(file)`: Main validation function
- `isAllowedMimeType(mimeType)`: Check if MIME type is allowed
- `isAllowedExtension(mimeType, extension)`: Check if extension is allowed for MIME type
- `extractExtension(filename)`: Extract file extension from filename
- `sanitizeFilename(filename)`: Sanitize filename for safe storage
- `validateStorageKey(storageKey)`: Validate storage key for path traversal

### Error Codes

- `INVALID_MIME_TYPE`: MIME type not in whitelist
- `INVALID_EXTENSION`: Extension not allowed for MIME type
- `FILE_TOO_LARGE`: File exceeds maximum size
- `INVALID_FILENAME`: Filename contains unsafe characters or path traversal

## Test Suite

**Location:** `scripts/test-document-management-storage.ts`

### Test Coverage

1. **Valid PDF file validation**
   - MIME type check
   - Extension check
   - Size check

2. **Valid PNG file validation**
   - MIME type check
   - Extension check
   - Size check

3. **Disallowed MIME type rejection**
   - Executable files rejected
   - Scripts rejected

4. **Disallowed extension rejection**
   - HTML files rejected
   - SVG files rejected

5. **Max size rejection**
   - Files > 10 MB rejected
   - Error message includes size

6. **Filename sanitization**
   - Path separators removed
   - Traversal sequences removed
   - Invalid characters removed

7. **Path traversal prevention**
   - `..` sequences rejected
   - Absolute paths rejected
   - Malicious paths rejected

8. **Storage key generation**
   - Correct format generated
   - UUID included
   - Date-based partitioning

9. **Writing to private storage**
   - File saved to correct location
   - Directory structure created
   - Not written to `static/uploads`

10. **Static uploads confirmation**
    - Files not written to public directory
    - Private storage used exclusively

11. **SHA-256 calculation**
    - Hash calculated correctly
    - Consistent for same content

12. **File reading/verification**
    - File can be read back
    - Content preserved
    - Size matches

13. **File existence check**
    - Existence verified
    - Non-existent files return false

14. **Cleanup**
    - Test files deleted
    - Test directories cleaned
    - No temporary files left

### Test Files

The test suite creates minimal valid files for testing:

- Minimal PDF file (valid PDF structure)
- Minimal PNG file (valid PNG header)
- Invalid files for rejection testing

## .gitignore Configuration

**Added Rules:**

```
storage/
storage/private/
storage/private/documents/
```

**Rationale:**

- Prevents committing uploaded files
- Prevents committing test files
- Keeps repository size manageable
- Protects sensitive document data

## Integration Notes

### Current Phase (1.2)

- Storage service ready for use
- Validation layer complete
- Test suite validates all functionality
- No database changes required
- No API endpoints yet

### Next Phase (1.3)

Phase 1.3 will implement:

- API endpoints for upload
- API endpoints for download
- Integration with storage service
- Permission checks
- Document creation in database
- Access logging

## Design Decisions

### 1. Private Storage vs Public Storage

**Decision:** Use private storage directory.

**Rationale:**

- Prevents unauthorized direct access
- Enables controlled download via API
- Allows permission enforcement
- Better security model
- Consistent with enterprise practices

### 2. Hierarchical Storage Structure

**Decision:** Use `{ownerType}/{ownerId}/{category}/{year}/{month}/` structure.

**Rationale:**

- Logical organization
- Efficient queries by owner
- Time-based partitioning for maintenance
- Scalable to large document counts
- Easy backup/restore by time periods

### 3. UUID Filenames

**Decision:** Use UUID for actual filenames.

**Rationale:**

- Prevents collisions
- No need for conflict resolution
- Secure (unpredictable)
- Allows original name preservation in metadata

### 4. MIME Type Whitelist

**Decision:** Explicit whitelist instead of blacklist.

**Rationale:**

- More secure by default
- Easier to audit
- Prevents unknown dangerous types
- Clear documentation of allowed types

### 5. 10 MB Size Limit

**Decision:** 10 MB maximum for MVP.

**Rationale:**

- Reasonable for document types
- Prevents abuse
- Can be adjusted per category later
- Sufficient for most use cases

### 6. SHA-256 Hash

**Decision:** Calculate SHA-256 for all files.

**Rationale:**

- Cryptographically secure
- Industry standard
- Enables integrity verification
- Supports future deduplication
- Security verification

### 7. No Overwrite Protection

**Decision:** Prevent overwriting existing files.

**Rationale:**

- Prevents accidental data loss
- Forces explicit handling of duplicates
- Better audit trail
- Consistent with document versioning plans

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

## Summary

Phase 1.2 successfully implemented the storage service and file validation layer for the Document Management module:

- **2 modules created:** document-file-validation, document-storage-service
- **Private storage structure:** `storage/private/documents/`
- **4 MIME types allowed:** PDF, JPEG, PNG, DOCX
- **10 MB size limit:** Enforced for all uploads
- **Comprehensive validation:** MIME, extension, size, filename, path traversal
- **SHA-256 hashing:** For integrity verification
- **Secure storage keys:** Hierarchical, UUID-based, time-partitioned
- **Test suite:** 14 tests covering all functionality
- **Documentation:** Complete design documentation

**Key security features:**

- Private storage (not web-accessible)
- Path traversal prevention
- Filename sanitization
- MIME type whitelist
- Extension validation
- Size limits
- Hash verification
- No overwrite protection

The storage service is production-ready and provides a solid foundation for Phase 1.3 implementation of API endpoints, permission integration, and complete upload/download flows.
