import {
  randomBytes,
  randomUUID,
  scryptSync,
  createHash,
  createCipheriv,
  createDecipheriv,
} from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentReference,
  GeoPoint,
  Timestamp,
  getFirestore,
  type CollectionReference,
} from 'firebase-admin/firestore';
import { createClient, type Client, type Transaction } from '@libsql/client';

interface ExportedDocument {
  documentPath: string;
  collectionPath: string;
  documentId: string;
  parentPath: string | null;
  payload: Record<string, unknown>;
  sourceUpdateTime: string | null;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeFirestoreValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof GeoPoint) return { latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return value.path;
  if (Buffer.isBuffer(value)) {
    return { __aqurivoType: 'bytes', base64: value.toString('base64') };
  }
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(normalizeFirestoreValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeFirestoreValue(item)])
    );
  }
  return value;
}

function getFirestoreAdmin() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim().replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY locally.'
    );
  }

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  return { db: getFirestore(app), projectId };
}

async function collectCollection(
  collection: CollectionReference,
  output: ExportedDocument[]
): Promise<void> {
  const snapshot = await collection.get();
  for (const document of snapshot.docs) {
    const data = normalizeFirestoreValue(document.data()) as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(data, 'id')) {
      data.id = document.id;
    }

    const collectionPath = collection.path;
    const parentPath = collectionPath.includes('/')
      ? collectionPath.slice(0, collectionPath.lastIndexOf('/'))
      : null;
    output.push({
      documentPath: document.ref.path,
      collectionPath,
      documentId: document.id,
      parentPath,
      payload: data,
      sourceUpdateTime: document.updateTime?.toDate().toISOString() || null,
    });

    const subcollections = await document.ref.listCollections();
    for (const subcollection of subcollections) {
      await collectCollection(subcollection, output);
    }
  }
}

function createEncryptedBackup(
  projectId: string,
  documents: ExportedDocument[],
  manifestSha256: string
): string {
  const passphrase = process.env.FIRESTORE_BACKUP_ENCRYPTION_KEY?.trim();
  if (!passphrase || passphrase.length < 32) {
    throw new Error('FIRESTORE_BACKUP_ENCRYPTION_KEY must contain at least 32 characters.');
  }

  const directory =
    process.env.FIRESTORE_BACKUP_DIRECTORY?.trim() ||
    path.join(os.homedir(), '.aqurivo-migration-backups');
  mkdirSync(directory, { recursive: true, mode: 0o700 });

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(
    JSON.stringify({
      formatVersion: 1,
      sourceProjectId: projectId,
      createdAt: new Date().toISOString(),
      documentCount: documents.length,
      manifestSha256,
      documents,
    }),
    'utf8'
  );
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const backup = Buffer.from(
    JSON.stringify({
      format: 'AQURIVO_FIRESTORE_BACKUP_V1',
      kdf: 'scrypt',
      cipher: 'aes-256-gcm',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: encrypted.toString('base64'),
    }),
    'utf8'
  );
  const filePath = path.join(
    directory,
    `firestore-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}.enc`
  );
  writeFileSync(filePath, backup, { flag: 'wx', mode: 0o600 });
  return filePath;
}

function decryptBackup(filePath: string): string {
  const passphrase = process.env.FIRESTORE_BACKUP_ENCRYPTION_KEY?.trim();
  if (!passphrase || passphrase.length < 32) {
    throw new Error('FIRESTORE_BACKUP_ENCRYPTION_KEY must contain at least 32 characters.');
  }

  const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as {
    format?: string;
    kdf?: string;
    cipher?: string;
    salt?: string;
    iv?: string;
    authTag?: string;
    ciphertext?: string;
  };
  if (
    envelope.format !== 'AQURIVO_FIRESTORE_BACKUP_V1' ||
    envelope.kdf !== 'scrypt' ||
    envelope.cipher !== 'aes-256-gcm' ||
    !envelope.salt ||
    !envelope.iv ||
    !envelope.authTag ||
    !envelope.ciphertext
  ) {
    throw new Error('Unsupported or invalid encrypted Firestore backup.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    scryptSync(passphrase, Buffer.from(envelope.salt, 'base64'), 32),
    Buffer.from(envelope.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]);
  const backup = JSON.parse(plaintext.toString('utf8')) as { formatVersion?: number };
  if (backup.formatVersion !== 1) {
    throw new Error('Decrypted backup has an unsupported format version.');
  }

  const outputPath =
    process.env.FIRESTORE_DECRYPTED_BACKUP_PATH?.trim() || `${filePath}.decrypted.json`;
  writeFileSync(outputPath, plaintext, { flag: 'wx', mode: 0o600 });
  return outputPath;
}

function hashManifest(documents: ExportedDocument[]): string {
  const serialized = documents
    .slice()
    .sort((a, b) => a.documentPath.localeCompare(b.documentPath))
    .map((document) =>
      canonicalJson({
        documentPath: document.documentPath,
        collectionPath: document.collectionPath,
        documentId: document.documentId,
        parentPath: document.parentPath,
        sourceUpdateTime: document.sourceUpdateTime,
        payload: document.payload,
      })
    )
    .join('\n');
  return createHash('sha256').update(serialized).digest('hex');
}

function getTursoClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error('Set TURSO_DATABASE_URL and a newly rotated TURSO_AUTH_TOKEN locally.');
  }
  return createClient({ url, authToken });
}

async function createSchema(client: Client): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  const { readFileSync } = await import('fs');
  const statements: string[] = [];
  let current = '';
  let inTrigger = false;
  for (const line of readFileSync(schemaPath, 'utf8').split(/\r?\n/)) {
    current += `${line}\n`;
    if (!inTrigger && /^\s*CREATE\s+TRIGGER\b/i.test(current.trimStart())) {
      inTrigger = true;
    }

    if (inTrigger) {
      if (/^\s*END;\s*$/i.test(line)) {
        statements.push(current.trim().replace(/;\s*$/, ''));
        current = '';
        inTrigger = false;
      }
      continue;
    }

    if (/;\s*$/.test(line)) {
      statements.push(current.trim().replace(/;\s*$/, ''));
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());

  for (const sql of statements) {
    if (sql && !sql.startsWith('PRAGMA')) {
      await client.execute(sql);
    }
  }
}

async function verifyNoConflicts(
  client: Client,
  documents: ExportedDocument[]
): Promise<number> {
  let existingCount = 0;
  for (const document of documents) {
    const result = await client.execute({
      sql: 'SELECT payload_json FROM firestore_documents WHERE document_path = ?',
      args: [document.documentPath],
    });
    const row = result.rows[0];
    if (!row) continue;
    existingCount += 1;
    if (
      canonicalJson(JSON.parse(String(row.payload_json))) !== canonicalJson(document.payload)
    ) {
      throw new Error(
        `Import stopped: Turso already contains a different document at ${document.documentPath}.`
      );
    }
  }
  return existingCount;
}

async function importDocuments(
  client: Client,
  documents: ExportedDocument[],
  projectId: string,
  manifestSha256: string
): Promise<number> {
  let importedCount = 0;
  const importId = randomUUID();
  const startedAt = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO migration_imports
      (import_id, source_project_id, started_at, document_count, manifest_sha256, status)
      VALUES (?, ?, ?, ?, ?, 'running')`,
    args: [importId, projectId, startedAt, documents.length, manifestSha256],
  });

  try {
    for (let offset = 0; offset < documents.length; offset += 50) {
      const transaction: Transaction = await client.transaction('write');
      try {
        for (const document of documents.slice(offset, offset + 50)) {
          const existing = await transaction.execute({
            sql: 'SELECT payload_json FROM firestore_documents WHERE document_path = ?',
            args: [document.documentPath],
          });
          if (existing.rows[0]) {
            if (
              canonicalJson(JSON.parse(String(existing.rows[0].payload_json))) !==
              canonicalJson(document.payload)
            ) {
              throw new Error(
                `Import stopped: conflicting document at ${document.documentPath}.`
              );
            }
            continue;
          }

          await transaction.execute({
            sql: `INSERT INTO firestore_documents
              (document_path, collection_path, document_id, parent_path, payload_json, source_update_time)
              VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              document.documentPath,
              document.collectionPath,
              document.documentId,
              document.parentPath,
              canonicalJson(document.payload),
              document.sourceUpdateTime,
            ],
          });
          importedCount += 1;
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    await client.execute({
      sql: `UPDATE migration_imports
        SET completed_at = ?, status = 'completed'
        WHERE import_id = ?`,
      args: [new Date().toISOString(), importId],
    });
    return importedCount;
  } catch (error) {
    await client.execute({
      sql: `UPDATE migration_imports
        SET completed_at = ?, status = 'failed'
        WHERE import_id = ?`,
      args: [new Date().toISOString(), importId],
    });
    throw error;
  }
}

async function verifyImportedDocuments(
  client: Client,
  documents: ExportedDocument[]
): Promise<void> {
  const actual: ExportedDocument[] = [];
  for (const document of documents) {
    const result = await client.execute({
      sql: `SELECT collection_path, document_id, parent_path, payload_json, source_update_time
        FROM firestore_documents WHERE document_path = ?`,
      args: [document.documentPath],
    });
    const row = result.rows[0];
    if (!row) throw new Error(`Post-import verification failed: ${document.documentPath} is missing.`);
    actual.push({
      documentPath: document.documentPath,
      collectionPath: String(row.collection_path),
      documentId: String(row.document_id),
      parentPath: row.parent_path ? String(row.parent_path) : null,
      payload: JSON.parse(String(row.payload_json)) as Record<string, unknown>,
      sourceUpdateTime: row.source_update_time ? String(row.source_update_time) : null,
    });
  }

  if (
    actual.length !== documents.length ||
    hashManifest(actual) !== hashManifest(documents)
  ) {
    throw new Error('Post-import verification failed: document count or manifest checksum differs.');
  }
}

async function main(): Promise<void> {
  const decryptIndex = process.argv.indexOf('--decrypt-backup');
  if (decryptIndex >= 0) {
    const backupPath = process.argv[decryptIndex + 1];
    if (!backupPath || backupPath.startsWith('--')) {
      throw new Error('Usage: npm run migrate:firestore -- --decrypt-backup <encrypted-file>');
    }
    console.log(`Decrypted backup written to: ${decryptBackup(backupPath)}`);
    return;
  }

  const backupOnly = process.argv.includes('--backup-only');
  const apply = process.argv.includes('--apply');
  const { db, projectId } = getFirestoreAdmin();
  const documents: ExportedDocument[] = [];
  const rootCollections = await db.listCollections();
  for (const collection of rootCollections) {
    await collectCollection(collection, documents);
  }

  documents.sort((a, b) => a.documentPath.localeCompare(b.documentPath));
  const manifestSha256 = hashManifest(documents);
  const backupPath = createEncryptedBackup(projectId, documents, manifestSha256);
  console.log(`Encrypted backup created: ${backupPath}`);
  console.log(`Firestore documents exported: ${documents.length}`);
  console.log(`Source manifest SHA-256: ${manifestSha256}`);

  if (backupOnly) return;

  const client = getTursoClient();
  await createSchema(client);
  const existingCount = await verifyNoConflicts(client, documents);
  const plannedCount = documents.length - existingCount;
  console.log(`Turso preflight: ${existingCount} identical documents; ${plannedCount} new documents.`);

  if (!apply) {
    console.log('Dry run only. Re-run with --apply after reviewing this backup and manifest.');
    return;
  }

  const importedCount = await importDocuments(client, documents, projectId, manifestSha256);
  await verifyImportedDocuments(client, documents);
  console.log(`Imported ${importedCount} documents; verified all ${documents.length} documents.`);
  console.log('Firebase data was not modified or deleted.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure';
  console.error(`Firestore-to-Turso migration failed: ${message}`);
  process.exitCode = 1;
});
