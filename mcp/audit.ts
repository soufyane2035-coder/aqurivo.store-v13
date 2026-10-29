import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const MAX_AUDIT_LOG_BYTES = 50 * 1024 * 1024;
const MAX_AUDIT_ENTRY_BYTES = 2 * 1024 * 1024;

export type AuditedEntity = 'product' | 'category' | 'content' | 'settings';
export type AuditAction = 'create' | 'update' | 'delete' | 'restore';
export type AuditPhase = 'prepared' | 'completed' | 'failed';

export interface AuditEntry {
  operationId: string;
  occurredAt: string;
  entity: AuditedEntity;
  entityId: string;
  action: AuditAction;
  phase: AuditPhase;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  beforeSha256: string | null;
  afterSha256: string | null;
  error?: string;
}

export interface AuditStore {
  append(entry: AuditEntry): Promise<void>;
  find(operationId: string): Promise<AuditEntry | null>;
  recent(limit: number): Promise<AuditEntry[]>;
}

export function hashAuditSnapshot(value: Record<string, unknown> | null): string | null {
  if (!value) return null;
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function createAuditEntry(
  entity: AuditedEntity,
  entityId: string,
  action: AuditAction,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  phase: AuditPhase,
  operationId: string = randomUUID(),
  error?: string
): AuditEntry {
  return {
    operationId,
    occurredAt: new Date().toISOString(),
    entity,
    entityId,
    action,
    phase,
    before,
    after,
    beforeSha256: hashAuditSnapshot(before),
    afterSha256: hashAuditSnapshot(after),
    ...(error ? { error } : {}),
  };
}

export function createFileAuditStore(filePath: string): AuditStore {
  const resolvedPath = resolve(filePath);

  async function readContents(): Promise<string | null> {
    let fileStats;
    try {
      fileStats = await stat(resolvedPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
    if (fileStats.size > MAX_AUDIT_LOG_BYTES) {
      throw new Error('The AQURIVO MCP audit log exceeds its 50 MB safety limit.');
    }
    return readFile(resolvedPath, 'utf8');
  }

  return {
    async append(entry) {
      await mkdir(dirname(resolvedPath), { recursive: true, mode: 0o700 });
      const line = `${JSON.stringify(entry)}\n`;
      if (Buffer.byteLength(line, 'utf8') > MAX_AUDIT_ENTRY_BYTES) {
        throw new Error('The audit snapshot exceeds the 2 MB per-entry safety limit.');
      }
      const current = await readContents();
      const currentSize = Buffer.byteLength(current || '', 'utf8');
      if (currentSize + Buffer.byteLength(line, 'utf8') > MAX_AUDIT_LOG_BYTES) {
        throw new Error('The AQURIVO MCP audit log is full; archive it before making more changes.');
      }
      await appendFile(resolvedPath, line, {
        encoding: 'utf8',
        mode: 0o600,
      });
    },
    async find(operationId) {
      const contents = await readContents();
      if (contents === null) return null;

      const lines = contents.split(/\r?\n/);
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index];
        if (!line) continue;
        let entry: AuditEntry;
        try {
          entry = JSON.parse(line) as AuditEntry;
        } catch {
          throw new Error(`The AQURIVO MCP audit log contains invalid JSON on line ${index + 1}.`);
        }
        if (entry.operationId === operationId && entry.phase === 'completed') return entry;
      }
      return null;
    },
    async recent(limit) {
      const contents = await readContents();
      if (contents === null) return [];

      const entries: AuditEntry[] = [];
      const seenOperations = new Set<string>();
      const lines = contents.split(/\r?\n/);
      for (let index = lines.length - 1; index >= 0 && entries.length < limit; index -= 1) {
        const line = lines[index];
        if (!line) continue;
        let entry: AuditEntry;
        try {
          entry = JSON.parse(line) as AuditEntry;
        } catch {
          throw new Error(`The AQURIVO MCP audit log contains invalid JSON on line ${index + 1}.`);
        }
        if (seenOperations.has(entry.operationId)) continue;
        seenOperations.add(entry.operationId);
        entries.push(entry);
      }
      return entries;
    },
  };
}
