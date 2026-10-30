import { loadEnvConfig } from '@next/env';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createFileAuditStore } from './audit';
import { applyMcpWriteControls, getMcpPolicy } from './policy';
import { registerAqurivoTools } from './tools';

loadEnvConfig(process.cwd());

async function startServer(): Promise<void> {
  const [
    articlesRepo,
    categoriesRepo,
    productsRepo,
    sourcesRepo,
    settingsRepo,
    mcpControlsRepo,
    firebaseAdmin,
  ] = await Promise.all([
    import('@/server/repositories/articles.repo'),
    import('@/server/repositories/categories.repo'),
    import('@/server/repositories/products.repo'),
    import('@/server/repositories/sources.repo'),
    import('@/server/repositories/settings.repo'),
    import('@/server/repositories/mcp-controls.repo'),
    import('@/server/config/firebase-admin'),
  ]);
  const server = new McpServer({ name: 'aqurivo-mcp', version: '0.1.0' });
  const auditPath =
    process.env.AQURIVO_MCP_AUDIT_PATH ||
    join(homedir(), '.aqurivo-mcp', 'audit.jsonl');
  const auditBaseUrl =
    process.env.AQURIVO_MCP_AUDIT_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://aqurivo.store';

  function toEntity(value: object): Record<string, unknown> {
    return { ...value };
  }

  async function listDocuments(collectionName: string): Promise<Array<Record<string, unknown>>> {
    const snapshot = await firebaseAdmin.getAdminDb().collection(collectionName).get();
    return snapshot.docs.map((document) => {
      const data = document.data();
      if (!data) throw new Error(`Document ${document.id} in ${collectionName} has no data.`);
      return toEntity({ ...data, id: document.id });
    });
  }

  async function getDocument(
    collectionName: string,
    id: string
  ): Promise<Record<string, unknown> | null> {
    const document = await firebaseAdmin.getAdminDb().collection(collectionName).doc(id).get();
    if (!document.exists) return null;
    const data = document.data();
    if (!data) throw new Error(`Document ${id} in ${collectionName} has no data.`);
    return toEntity({ ...data, id: document.id });
  }

  registerAqurivoTools(
    server,
    {
      products: {
        list: () => listDocuments('products'),
        get: (id) => getDocument('products', id),
        async save(input, existingId) {
          return toEntity(await productsRepo.createOrUpdateProductAdmin(input, existingId));
        },
        delete: productsRepo.deleteProductAdmin,
      },
      categories: {
        list: () => listDocuments('categories'),
        async save(input) {
          return toEntity(await categoriesRepo.upsertCategoryAdmin(input));
        },
        delete: categoriesRepo.deleteCategoryAdmin,
      },
      content: {
        list: () => listDocuments('articles'),
        get: (id) => getDocument('articles', id),
        async save(input, existingId) {
          return toEntity(await articlesRepo.upsertArticleAdmin(input, existingId));
        },
        delete: articlesRepo.deleteArticleAdmin,
      },
      sources: {
        async list() {
          return (await sourcesRepo.listAllSourcesAdmin()).map(toEntity);
        },
      },
      settings: {
        async get() {
          const doc = await firebaseAdmin.getAdminDb().collection('settings').doc('public').get();
          if (!doc.exists) {
            return toEntity({ ...settingsRepo.DEFAULT_SITE_SETTINGS, isDefault: true });
          }
          return toEntity({ ...(doc.data() as Record<string, unknown>), isDefault: false });
        },
        async save(input) {
          return toEntity(await settingsRepo.updateSiteSettingsAdmin(input));
        },
      },
    },
    {
      async policy() {
        const basePolicy = getMcpPolicy();
        if (!basePolicy.databaseReady || !basePolicy.canRead) return basePolicy;
        try {
          const controls = await mcpControlsRepo.getMcpWriteControls();
          return applyMcpWriteControls(basePolicy, controls);
        } catch {
          throw new Error(
            'Unable to load persisted MCP write controls. Product and editorial tools are unavailable until the control settings can be read.'
          );
        }
      },
      audit: createFileAuditStore(auditPath),
      auditBaseUrl,
    }
  );

  await server.connect(new StdioServerTransport());
}

void startServer().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'AQURIVO MCP failed to start.');
  process.exitCode = 1;
});
