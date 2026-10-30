export type McpTarget = 'local' | 'production' | 'unconfigured';

export interface McpPolicy {
  target: McpTarget;
  databaseReady: boolean;
  canRead: boolean;
  canWrite: boolean;
  canWriteProducts: boolean;
  canWriteEditorial: boolean;
  canDelete: boolean;
}

export interface McpWriteControls {
  products: boolean;
  editorial: boolean;
}

export interface McpWriteLimits {
  products: boolean;
  editorial: boolean;
}

function isLocalDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'file:' && !url.host && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function isHostedTursoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'libsql:' || url.protocol === 'https:') && Boolean(url.host);
  } catch {
    return false;
  }
}

export function getMcpPolicy(
  env: Readonly<Record<string, string | undefined>> = process.env
): McpPolicy {
  const configuredTarget = env.AQURIVO_MCP_TARGET;
  const target: McpTarget =
    configuredTarget === 'local' || configuredTarget === 'production'
      ? configuredTarget
      : 'unconfigured';

  const databaseUrl = env.TURSO_DATABASE_URL?.trim() || '';
  const dataStore = env.DATA_STORE || 'firestore';
  const clientDataStore = env.NEXT_PUBLIC_DATA_STORE || 'firestore';
  const databaseReady =
    target === 'local'
      ? dataStore === 'turso' &&
        clientDataStore === 'turso' &&
        isLocalDatabaseUrl(databaseUrl) &&
        Boolean(env.TURSO_AUTH_TOKEN?.trim())
      : target === 'production'
        ? dataStore === clientDataStore &&
          (dataStore === 'turso'
            ? Boolean(isHostedTursoUrl(databaseUrl) && env.TURSO_AUTH_TOKEN?.trim())
            : dataStore === 'firestore' &&
              Boolean(
                env.FIREBASE_ADMIN_PROJECT_ID?.trim() &&
                  env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() &&
                  env.FIREBASE_ADMIN_PRIVATE_KEY?.trim()
              ))
        : false;

  const canRead =
    databaseReady &&
    (target === 'local' || env.AQURIVO_MCP_ALLOW_PRODUCTION_READS === 'true');
  const canWrite =
    canRead &&
    env.AQURIVO_MCP_ENABLE_WRITES === 'true' &&
    (target === 'local' || env.AQURIVO_MCP_ALLOW_PRODUCTION_WRITES === 'true');
  const canWriteProducts =
    canWrite ||
    (canRead &&
      env.AQURIVO_MCP_ENABLE_WRITES === 'true' &&
      target === 'production' &&
      env.AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES === 'true');
  const canWriteEditorial =
    canWrite ||
    (canRead &&
      env.AQURIVO_MCP_ENABLE_WRITES === 'true' &&
      target === 'production' &&
      env.AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES === 'true');
  const canDelete = canWrite && env.AQURIVO_MCP_ALLOW_DELETES === 'true';

  return {
    target,
    databaseReady,
    canRead,
    canWrite,
    canWriteProducts,
    canWriteEditorial,
    canDelete,
  };
}

/**
 * Applies the persisted admin controls without allowing them to exceed the
 * environment's write gates. With no saved controls, retain the legacy
 * environment-derived scopes for existing installations.
 */
export function applyMcpWriteControls(
  policy: McpPolicy,
  controls: Partial<McpWriteControls> | null,
  env: Readonly<Record<string, string | undefined>> = process.env
): McpPolicy {
  if (!controls) return policy;

  const writesEnabled =
    policy.canRead && env.AQURIVO_MCP_ENABLE_WRITES === 'true';
  const productionProductGate =
    policy.target !== 'production' ||
    env.AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES === 'true';
  const productionEditorialGate =
    policy.target !== 'production' ||
    env.AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES === 'true';

  return {
    ...policy,
    canWriteProducts:
      controls.products === undefined
        ? policy.canWriteProducts
        : writesEnabled && productionProductGate && controls.products,
    canWriteEditorial:
      controls.editorial === undefined
        ? policy.canWriteEditorial
        : writesEnabled && productionEditorialGate && controls.editorial,
  };
}

export function getMcpWriteLimits(
  policy: McpPolicy,
  env: Readonly<Record<string, string | undefined>> = process.env
): McpWriteLimits {
  // The dashboard may run in a different process than the local stdio server,
  // so absent environment values cannot always describe the MCP host's final
  // gates. An explicit false is still a hard upper bound for dashboard grants.
  // In that case it can store the requested scopes; MCP still enforces the
  // actual process environment on every tool call.
  if (policy.target === 'unconfigured') {
    const masterEnabled = env.AQURIVO_MCP_ENABLE_WRITES !== 'false';
    return {
      products:
        masterEnabled &&
        env.AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES !== 'false',
      editorial:
        masterEnabled &&
        env.AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES !== 'false',
    };
  }

  const enabled = policy.canRead && env.AQURIVO_MCP_ENABLE_WRITES === 'true';
  return {
    products:
      enabled &&
      (policy.target !== 'production' ||
        env.AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES === 'true'),
    editorial:
      enabled &&
      (policy.target !== 'production' ||
        env.AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES === 'true'),
  };
}

export function requireReadAccess(policy: McpPolicy): void {
  if (!policy.canRead) {
    throw new Error(
      policy.target === 'unconfigured'
        ? 'Set AQURIVO_MCP_TARGET to "local" or "production" after configuring the intended database.'
        : policy.target === 'local' && !policy.databaseReady
          ? 'Local MCP access requires DATA_STORE and NEXT_PUBLIC_DATA_STORE to be "turso" and TURSO_DATABASE_URL to use the file: scheme. Cloud databases are never treated as local.'
          : policy.target === 'production' && !policy.canRead
            ? 'Production reads are disabled. Set AQURIVO_MCP_ALLOW_PRODUCTION_READS=true only after explicitly approving production access.'
            : 'The configured database is not ready for this MCP target.'
    );
  }
}

export function requireWriteAccess(
  policy: McpPolicy,
  confirmed: boolean,
  destructive = false
): void {
  requireReadAccess(policy);
  if (!confirmed) {
    throw new Error('No change was made. Set confirm=true only after reviewing the requested change.');
  }
  if (!policy.canWrite) {
    throw new Error(
      'Writes are disabled. Set AQURIVO_MCP_ENABLE_WRITES=true; production also requires AQURIVO_MCP_ALLOW_PRODUCTION_WRITES=true.'
    );
  }
  if (destructive && !policy.canDelete) {
    throw new Error(
      'Deletion is disabled. Set AQURIVO_MCP_ALLOW_DELETES=true and confirm the exact item before deleting.'
    );
  }
}

export function requireProductWriteAccess(
  policy: McpPolicy,
  confirmed: boolean
): void {
  requireReadAccess(policy);
  if (!confirmed) {
    throw new Error('No change was made. Set confirm=true only after reviewing the requested change.');
  }
  if (!policy.canWriteProducts) {
    throw new Error(
      'Product writes are disabled. Set AQURIVO_MCP_ENABLE_WRITES=true; production also requires AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES=true.'
    );
  }
}

export function requireEditorialWriteAccess(
  policy: McpPolicy,
  confirmed: boolean
): void {
  requireReadAccess(policy);
  if (!confirmed) {
    throw new Error('No change was made. Set confirm=true only after reviewing the requested change.');
  }
  if (!policy.canWriteEditorial) {
    throw new Error(
      'Editorial writes are disabled. Set AQURIVO_MCP_ENABLE_WRITES=true; production also requires AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES=true.'
    );
  }
}
