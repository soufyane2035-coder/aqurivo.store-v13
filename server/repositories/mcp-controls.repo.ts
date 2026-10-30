import 'server-only';
import { getAdminDb, getAdminDocumentFresh } from '@/server/config/firebase-admin';
import {
  applyMcpWriteControls,
  getMcpPolicy,
  getMcpWriteLimits,
  type McpWriteControls,
} from '@/mcp/policy';

const COLLECTION = 'admin_secrets';
const DOCUMENT_ID = 'mcp_write_controls';

export interface PersistedMcpWriteControls extends Partial<McpWriteControls> {
  updatedAt: string;
  updatedBy: string;
}

export interface McpWriteControlDashboardState extends McpWriteControls {
  explicit: McpWriteControls;
  configured: boolean;
  effective: McpWriteControls | null;
  allowed: McpWriteControls;
  target: ReturnType<typeof getMcpPolicy>['target'];
  updatedAt: string | null;
  updatedBy: string | null;
}

function isWriteControls(
  value: unknown
): value is Record<string, unknown> & Partial<McpWriteControls> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).filter(
    (key) => key === 'products' || key === 'editorial'
  );
  return (
    keys.length > 0 &&
    Object.keys(record).every((key) =>
      ['products', 'editorial', 'updatedAt', 'updatedBy', 'id'].includes(key)
    ) &&
    keys.every((key) => typeof record[key] === 'boolean') &&
    (record.id === undefined || record.id === DOCUMENT_ID) &&
    (record.updatedAt === undefined || typeof record.updatedAt === 'string') &&
    (record.updatedBy === undefined || typeof record.updatedBy === 'string')
  );
}

export async function getMcpWriteControls(): Promise<(Partial<McpWriteControls> & {
  updatedAt: string;
  updatedBy: string;
}) | null> {
  const snapshot = await getAdminDocumentFresh(COLLECTION, DOCUMENT_ID);
  if (!snapshot.exists) return null;

  const data = snapshot.data();
  if (!isWriteControls(data)) {
    throw new Error('Stored MCP write controls are invalid; update them in the admin dashboard.');
  }
  return {
    ...(typeof data.products === 'boolean' ? { products: data.products } : {}),
    ...(typeof data.editorial === 'boolean' ? { editorial: data.editorial } : {}),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
  };
}

export async function saveMcpWriteControls(
  controls: Partial<McpWriteControls>,
  actor: string
): Promise<PersistedMcpWriteControls> {
  const current = await getMcpWriteControls();
  const productValue = controls.products ?? current?.products;
  const editorialValue = controls.editorial ?? current?.editorial;
  const saved: PersistedMcpWriteControls = {
    ...(productValue !== undefined ? { products: productValue } : {}),
    ...(editorialValue !== undefined ? { editorial: editorialValue } : {}),
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };
  await getAdminDb()
    .collection(COLLECTION)
    .doc(DOCUMENT_ID)
    .set(
      { ...controls, updatedAt: saved.updatedAt, updatedBy: actor },
      { merge: true }
    );
  return saved;
}

export async function getMcpWriteControlDashboardState(): Promise<McpWriteControlDashboardState> {
  const policy = getMcpPolicy();
  const saved = await getMcpWriteControls();
  const configured = saved !== null;
  const controls = {
    products: saved?.products ?? policy.canWriteProducts,
    editorial: saved?.editorial ?? policy.canWriteEditorial,
  };
  const explicit = {
    products: saved?.products !== undefined,
    editorial: saved?.editorial !== undefined,
  };
  const effective =
    policy.target === 'unconfigured'
      ? null
      : saved
        ? applyMcpWriteControls(policy, controls)
        : policy;
  return {
    ...controls,
    explicit,
    configured,
    effective: effective
      ? {
          products: effective.canWriteProducts,
          editorial: effective.canWriteEditorial,
        }
      : null,
    allowed: getMcpWriteLimits(policy),
    target: policy.target,
    updatedAt: saved?.updatedAt || null,
    updatedBy: saved?.updatedBy || null,
  };
}
