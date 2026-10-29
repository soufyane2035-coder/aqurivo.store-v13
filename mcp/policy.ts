export type McpTarget = 'local' | 'production' | 'unconfigured';

export interface McpPolicy {
  target: McpTarget;
  databaseReady: boolean;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
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
  const canDelete = canWrite && env.AQURIVO_MCP_ALLOW_DELETES === 'true';

  return { target, databaseReady, canRead, canWrite, canDelete };
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
