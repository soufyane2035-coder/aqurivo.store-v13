import 'server-only';

import { createClient, type Client } from '@libsql/client';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS firestore_documents (
    document_path TEXT PRIMARY KEY,
    collection_path TEXT NOT NULL,
    document_id TEXT NOT NULL,
    parent_path TEXT,
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    source_update_time TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (collection_path, document_id)
  )`,
  `CREATE INDEX IF NOT EXISTS firestore_documents_collection_idx
    ON firestore_documents(collection_path)`,
  `CREATE INDEX IF NOT EXISTS firestore_documents_parent_idx
    ON firestore_documents(parent_path)`,
  `CREATE TABLE IF NOT EXISTS migration_imports (
    import_id TEXT PRIMARY KEY,
    source_project_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    document_count INTEGER NOT NULL DEFAULT 0,
    manifest_sha256 TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed'))
  )`,
];

let client: Client | undefined;
let schemaReady: Promise<void> | undefined;

export function getTursoClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error(
      'Turso is selected but TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are not configured.'
    );
  }

  client = createClient({ url, authToken });
  return client;
}

export async function ensureTursoSchema(): Promise<void> {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const db = getTursoClient();
    for (const sql of schemaStatements) {
      await db.execute(sql);
    }
    await db.execute('INSERT OR IGNORE INTO schema_migrations(version) VALUES (1)');
  })();

  try {
    await schemaReady;
  } catch (error) {
    schemaReady = undefined;
    throw error;
  }
}
