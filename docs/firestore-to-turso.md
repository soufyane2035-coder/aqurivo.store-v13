# Firestore to Turso migration

The migration is deliberately opt-in. `DATA_STORE` and `NEXT_PUBLIC_DATA_STORE`
remain `firestore` by default, so deploying these code changes does not change
the site's current database or Firebase Auth.

## Prepare local credentials

Use a newly rotated Turso token. A Turso token was pasted into a chat and must
be treated as exposed; revoke it and create a replacement before connecting.
Never put a token in source code, a command line, or a committed file.

Configure these values in an ignored local `.env.local` file:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN` (newly rotated)
- `FIRESTORE_BACKUP_ENCRYPTION_KEY` (random, at least 32 characters)

The encrypted backup is written outside the project by default to
`~/.aqurivo-migration-backups`. To select another protected local directory, set
`FIRESTORE_BACKUP_DIRECTORY`.

To decrypt a backup for recovery or inspection, set the same backup key and run
`npm run migrate:firestore -- --decrypt-backup <encrypted-file>`. The script
creates a new plaintext JSON file beside the encrypted backup (or at
`FIRESTORE_DECRYPTED_BACKUP_PATH`); protect and remove that plaintext file when
it is no longer needed.

## Export and preflight

Export Firestore and create the encrypted backup without connecting to Turso:

```powershell
npm run migrate:firestore -- --backup-only
```

After setting a new Turso token, run a preflight. This creates the schema if it
does not exist, checks for conflicting document paths, and does not import any
documents:

```powershell
npm run migrate:firestore
```

Review the backup path, document count, and SHA-256 manifest before importing.
The import refuses to overwrite any different document. It can be re-run after
partial completion; identical documents are skipped.

## Import and verify

Only after reviewing the preflight and backup, explicitly import:

```powershell
npm run migrate:firestore -- --apply
```

The script verifies document paths, parent paths, counts, and the manifest
checksum after import. It does not delete or modify Firestore data.

## Application switch

The server adapter supports Firestore and Turso through the existing repository
interface. It supports the current equality filters, ordering, limits, document
reads/writes/deletes, and batches. To test locally **after a successful import**
and separate approval, set both:

```dotenv
DATA_STORE=turso
NEXT_PUBLIC_DATA_STORE=turso
```

Keep both values at `firestore` until the Turso import has been reviewed and the
application has been tested. Do not change Vercel variables or deploy as part
of this migration without separate approval.

Firebase Authentication remains in use for email/password, Google sign-in,
session verification, and administrator authorization. Firebase Realtime
Database remains as the existing admin-document mirror. Firebase Analytics and
Cloudinary are not part of this database migration. No Firebase Storage reads
or writes were found in the application flow.
