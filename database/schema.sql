PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS firestore_documents (
  document_path TEXT PRIMARY KEY,
  collection_path TEXT NOT NULL,
  document_id TEXT NOT NULL,
  parent_path TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  source_update_time TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (collection_path, document_id)
);

CREATE INDEX IF NOT EXISTS firestore_documents_collection_idx
  ON firestore_documents(collection_path);

CREATE INDEX IF NOT EXISTS firestore_documents_parent_idx
  ON firestore_documents(parent_path);

CREATE INDEX IF NOT EXISTS firestore_documents_status_idx
  ON firestore_documents(collection_path, json_extract(payload_json, '$.status'), document_id);

CREATE INDEX IF NOT EXISTS firestore_documents_slug_idx
  ON firestore_documents(collection_path, json_extract(payload_json, '$.slug'), document_id);

CREATE INDEX IF NOT EXISTS firestore_documents_approved_idx
  ON firestore_documents(collection_path, json_extract(payload_json, '$.approved'), document_id);

CREATE INDEX IF NOT EXISTS firestore_documents_is_active_idx
  ON firestore_documents(collection_path, json_extract(payload_json, '$.isActive'), document_id);

CREATE INDEX IF NOT EXISTS firestore_documents_product_slug_idx
  ON firestore_documents(collection_path, json_extract(payload_json, '$.productSlug'), document_id);

CREATE INDEX IF NOT EXISTS firestore_documents_created_at_idx
  ON firestore_documents(
    collection_path,
    COALESCE(CAST(json_extract(payload_json, '$.createdAt') AS TEXT), ''),
    document_id
  );

CREATE INDEX IF NOT EXISTS firestore_documents_last_login_at_idx
  ON firestore_documents(
    collection_path,
    COALESCE(CAST(json_extract(payload_json, '$.lastLoginAt') AS TEXT), ''),
    document_id
  );

CREATE TABLE IF NOT EXISTS migration_imports (
  import_id TEXT PRIMARY KEY,
  source_project_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  document_count INTEGER NOT NULL DEFAULT 0,
  manifest_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed'))
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
INSERT OR IGNORE INTO schema_migrations(version) VALUES (2);

CREATE TABLE IF NOT EXISTS request_rate_limits (
  bucket_hash TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count >= 0),
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS request_rate_limits_expiry_idx
  ON request_rate_limits(expires_at);

CREATE TRIGGER IF NOT EXISTS request_rate_limits_cleanup_insert
AFTER INSERT ON request_rate_limits
BEGIN
  DELETE FROM request_rate_limits
  WHERE expires_at <= CAST(strftime('%s', 'now') AS INTEGER) * 1000;
END;

CREATE TRIGGER IF NOT EXISTS request_rate_limits_cleanup_update
AFTER UPDATE ON request_rate_limits
BEGIN
  DELETE FROM request_rate_limits
  WHERE expires_at <= CAST(strftime('%s', 'now') AS INTEGER) * 1000;
END;
