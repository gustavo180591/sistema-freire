# Security Incident Report - 2025-06-05

## Incident Summary

**Date:** June 5, 2026  
**Severity:** High  
**Type:** Sensitive Data Exposure in Git History  
**Status:** Resolved

## Description

Database backup files containing sensitive personal information were accidentally committed to the Git repository in commit `21cd0ad`. The backups were located in `prisma/backup/` and contained:

- Email addresses (5 real emails)
- Password hashes (bcrypt)
- DNI numbers (Argentine national ID)
- Phone numbers
- Full names
- User IDs

## Exposed Data

### Emails
- gustavo.faccendini@gmail.com
- alumno@gmail.com
- docente@gmail.com
- secretariacapiovi@gmail.com
- secretaria@gmail.com

### Sensitive Identifiers
- DNI: 33222111
- Phone: 1234123456, 4321433221

### Password Hashes
Multiple bcrypt password hashes were exposed in the backup files.

## Root Cause

The `prisma/backup/` directory was not included in `.gitignore`, allowing database backup scripts to commit sensitive data during the academic year history feature implementation.

## Resolution Actions

### 1. Git History Cleanup
- Used `git-filter-repo` to completely remove `prisma/backup/` from Git history
- Cleaned Git reflog and garbage collected old objects
- Verified removal with:
  - `git log --all -- prisma/backup/` (no results)
  - `git grep "33222111" $(git rev-list --all)` (no results)
  - `git grep "1234123456" $(git rev-list --all)` (no results)

### 2. Prevention Measures
- Added `prisma/backup/` to `.gitignore`
- Confirmed `.env` was never committed (only `.env.example` exists)
- Local backup files remain on disk but are now excluded from version control

## Required Security Actions

### 1. Password Reset (CRITICAL)
**All affected users must reset their passwords immediately.**

Although bcrypt hashes are computationally expensive to crack, the exposure of password hashes in a public repository is a security breach. The following users require password resets:

- gustavo.faccendini@gmail.com
- alumno@gmail.com
- docente@gmail.com
- secretariacapiovi@gmail.com
- secretaria@gmail.com

**Action:** Execute password reset for all 5 users in the database using a secure method.

### 2. Replace Test Data with Fictionical Data
**All personal data used for testing must be replaced with fictional data.**

Current test data contains real emails and phone numbers. Replace with:

**Emails (fictionical):**
- admin.test@example.com
- alumno.test@example.com
- docente.test@example.com
- secretaria.test@example.com

**Phone numbers (fictionical):**
- Use patterns like: 555-0100, 555-0101, etc.
- Or use local test numbers: 11-1234-5678, 11-1234-5679

**DNI (fictionical):**
- Use test patterns: 11.111.111, 22.222.222, etc.
- Avoid using real DNI numbers

**Action:** Update seed files and test data with fictional information.

### 3. Repository Synchronization
**All collaborators must reclone the repository.**

Since the Git history was rewritten using `git-filter-repo`, the remote repository will require a force push. Any existing clones will be out of sync.

**Action for collaborators:**
```bash
# Backup any local changes
git stash

# Delete the old clone
rm -rf sistema-freire

# Clone the clean repository
git clone https://github.com/gustavo180591/sistema-freire.git
```

## Verification

### Git History Verification
- ✅ `prisma/backup/` removed from all commits
- ✅ DNI "33222111" not found in any commit
- ✅ Phone "1234123456" not found in any commit
- ✅ Backup files removed from Git tracking
- ✅ `.gitignore` updated to block `prisma/backup/`

### Environment Security
- ✅ `.env` file never committed
- ✅ Only `.env.example` exists in repository
- ✅ Database credentials remain secure

## Lessons Learned

1. **Always add backup directories to `.gitignore` before creating backups**
2. **Review `.gitignore` before committing database-related features**
3. **Use fictional test data instead of real personal information**
4. **Audit Git history for sensitive data before pushing to remote**

## Timeline

- **2026-06-05 02:08:** Commit `21cd0ad` with sensitive backups pushed to remote
- **2026-06-05 20:30:** Incident identified during security review
- **2026-06-05 20:44:** Git history cleaned with `git-filter-repo`
- **2026-06-05 20:45:** Verification completed - no sensitive data in history
- **2026-06-05 20:46:** Documentation created

## Next Steps

1. Force push clean history to remote repository
2. Notify all collaborators to reclone
3. Reset passwords for all affected users
4. Replace test data with fictional information
5. Update seed files with fictional data
6. Consider implementing pre-commit hooks to prevent future sensitive data commits

## Contact

For questions about this incident, contact the system administrator.
