import 'server-only';

import { randomBytes } from 'crypto';
import type { Client, Transaction } from '@libsql/client';
import type {
  CloudCollectionQuery,
  CloudDocumentReference,
  CloudDocumentData,
  CloudDocSnapshot,
  CloudFirestoreAdapter,
  CloudQuerySnapshot,
} from '../config/firebase-admin';
import { ensureTursoSchema, getTursoClient } from './turso';

type QueryFilter = { field: string; op: string; value: unknown };
type DbExecutor = Client | Transaction;

function collectionPath(name: string): string {
  const normalized = name.replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.split('/').length % 2 === 0) {
    throw new Error(`Invalid Firestore collection path: ${name}`);
  }
  return normalized;
}

function documentPath(collection: string, id: string): string {
  if (!id || id.includes('/')) {
    throw new Error('Firestore document IDs must be non-empty and cannot contain "/".');
  }
  return `${collection}/${id}`;
}

function getRefCollectionPath(ref: CloudDocumentReference): string {
  if (!ref.collectionPath) {
    throw new Error('Cannot use a document reference without a collection path in a batch.');
  }
  return collectionPath(ref.collectionPath);
}

function parsePayload(raw: unknown): CloudDocumentData {
  if (typeof raw !== 'string') {
    throw new Error('Turso returned a document with an invalid JSON payload.');
  }
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Stored Firestore document payload must be a JSON object.');
  }
  return parsed as CloudDocumentData;
}

async function loadDocument(
  executor: DbExecutor,
  path: string,
  id: string
): Promise<CloudDocumentData | undefined> {
  await ensureTursoSchema();
  const result = await executor.execute({
    sql: 'SELECT payload_json FROM firestore_documents WHERE document_path = ?',
    args: [path],
  });
  const row = result.rows[0];
  if (!row) return undefined;
  return { ...parsePayload(row.payload_json), id };
}

async function writeDocument(
  executor: DbExecutor,
  collection: string,
  id: string,
  data: object,
  merge: boolean
): Promise<void> {
  const path = documentPath(collection, id);
  const payload = merge
    ? { ...(await loadDocument(executor, path, id)), ...(data as CloudDocumentData), id }
    : { ...(data as CloudDocumentData), id };

  await executor.execute({
    sql: `INSERT INTO firestore_documents
      (document_path, collection_path, document_id, parent_path, payload_json, updated_at)
      VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(document_path) DO UPDATE SET
        collection_path = excluded.collection_path,
        document_id = excluded.document_id,
        parent_path = excluded.parent_path,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at`,
    args: [
      path,
      collection,
      id,
      collection.includes('/') ? collection.slice(0, collection.lastIndexOf('/')) : null,
      JSON.stringify(payload),
    ],
  });
}

async function removeDocument(
  executor: DbExecutor,
  collection: string,
  id: string
): Promise<void> {
  await ensureTursoSchema();
  await executor.execute({
    sql: 'DELETE FROM firestore_documents WHERE document_path = ?',
    args: [documentPath(collection, id)],
  });
}

export class TursoDocRef {
  readonly id: string;
  readonly path: string;
  readonly collectionName: string;

  constructor(collectionName: string, id?: string) {
    this.collectionName = collectionPath(collectionName);
    this.id = id || randomBytes(10).toString('hex');
    this.path = documentPath(this.collectionName, this.id);
  }

  async get(): Promise<CloudDocSnapshot> {
    const data = await loadDocument(getTursoClient(), this.path, this.id);
    return {
      id: this.id,
      exists: data !== undefined,
      data: () => (data ? { ...data } : undefined),
    };
  }

  async set(data: object, options?: { merge?: boolean }): Promise<void> {
    await ensureTursoSchema();
    await writeDocument(getTursoClient(), this.collectionName, this.id, data, !!options?.merge);
  }

  async update(data: object): Promise<void> {
    await this.set(data, { merge: true });
  }

  async delete(): Promise<void> {
    await removeDocument(getTursoClient(), this.collectionName, this.id);
  }
}

export class TursoCollectionQuery implements CloudCollectionQuery {
  private readonly collectionName: string;
  private readonly filters: QueryFilter[];
  private readonly orderField: string | null;
  private readonly orderDir: 'asc' | 'desc';
  private readonly maxLimit: number | null;

  constructor(
    name: string,
    filters: QueryFilter[] = [],
    orderField: string | null = null,
    orderDir: 'asc' | 'desc' = 'asc',
    maxLimit: number | null = null
  ) {
    this.collectionName = collectionPath(name);
    this.filters = filters;
    this.orderField = orderField;
    this.orderDir = orderDir;
    this.maxLimit = maxLimit;
  }

  doc(id?: string): TursoDocRef {
    return new TursoDocRef(this.collectionName, id);
  }

  async add(data: object): Promise<TursoDocRef> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }

  where(field: string, op: string, value: unknown): TursoCollectionQuery {
    if (op !== '==') {
      throw new Error(`Turso adapter does not support the Firestore operator "${op}".`);
    }
    return new TursoCollectionQuery(
      this.collectionName,
      [...this.filters, { field, op, value }],
      this.orderField,
      this.orderDir,
      this.maxLimit
    );
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): TursoCollectionQuery {
    return new TursoCollectionQuery(
      this.collectionName,
      this.filters,
      field,
      dir,
      this.maxLimit
    );
  }

  limit(count: number): TursoCollectionQuery {
    return new TursoCollectionQuery(
      this.collectionName,
      this.filters,
      this.orderField,
      this.orderDir,
      count
    );
  }

  async get(): Promise<CloudQuerySnapshot> {
    await ensureTursoSchema();
    const clauses = ['collection_path = ?'];
    const args: Array<string | number | null> = [this.collectionName];
    for (const filter of this.filters) {
      const jsonPath = `$."${filter.field.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      if (filter.value === null) {
        clauses.push(`json_type(payload_json, ?) = 'null'`);
        args.push(jsonPath);
        continue;
      }
      clauses.push('json_extract(payload_json, ?) = ?');
      args.push(jsonPath);
      args.push(
        filter.value === true
          ? 1
          : filter.value === false
            ? 0
            : typeof filter.value === 'string' || typeof filter.value === 'number'
              ? filter.value
              : JSON.stringify(filter.value)
      );
    }
    const orderSql = this.orderField
      ? `COALESCE(CAST(json_extract(payload_json, ?) AS TEXT), '') ${this.orderDir.toUpperCase()}, document_id`
      : 'document_id';
    if (this.orderField) {
      const jsonPath = `$."${this.orderField.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      args.push(jsonPath);
    }
    const limitCount =
      this.maxLimit !== null && this.maxLimit > 0 ? this.maxLimit : null;
    const limitSql = limitCount === null ? '' : ' LIMIT ?';
    if (limitCount !== null) args.push(limitCount);
    const result = await getTursoClient().execute({
      sql: `SELECT document_id, payload_json
        FROM firestore_documents
        WHERE ${clauses.join(' AND ')}
        ORDER BY ${orderSql}${limitSql}`,
      args,
    });

    const docs = result.rows.map((row) => {
      const id = String(row.document_id);
      const data = { ...parsePayload(row.payload_json), id };
      return {
        id,
        exists: true,
        data: () => ({ ...data }),
      };
    });

    return { empty: docs.length === 0, docs };
  }
}

export const tursoFirestoreAdapter: CloudFirestoreAdapter = {
  collection(name) {
    return new TursoCollectionQuery(name);
  },
  batch() {
    const operations: Array<(executor: DbExecutor) => Promise<void>> = [];
    return {
      set(ref: CloudDocumentReference, data: object, options?: { merge?: boolean }) {
        const id = ref.id;
        operations.push((executor) =>
          writeDocument(executor, getRefCollectionPath(ref), id, data, !!options?.merge)
        );
      },
      update(ref: CloudDocumentReference, data: object) {
        operations.push((executor) =>
          writeDocument(executor, getRefCollectionPath(ref), ref.id, data, true)
        );
      },
      delete(ref: CloudDocumentReference) {
        operations.push((executor) =>
          removeDocument(executor, getRefCollectionPath(ref), ref.id)
        );
      },
      async commit() {
        await ensureTursoSchema();
        const transaction: Transaction = await getTursoClient().transaction('write');
        try {
          for (const operation of operations) {
            await operation(transaction);
          }
          await transaction.commit();
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      },
    };
  },
};
