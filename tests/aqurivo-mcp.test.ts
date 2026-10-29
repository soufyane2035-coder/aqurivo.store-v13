import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mkdtemp, rmdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { generateSlug } from '../lib/seoSlug';
import {
  createAuditEntry,
  createFileAuditStore,
  type AuditEntry,
  type AuditStore,
} from '../mcp/audit';
import { getMcpPolicy } from '../mcp/policy';
import {
  registerAqurivoTools,
  type McpDomainDependencies,
} from '../mcp/tools';

type Entity = Record<string, unknown>;

const enabledLocalPolicy = {
  target: 'local' as const,
  databaseReady: true,
  canRead: true,
  canWrite: true,
  canDelete: true,
};

function createFakeDependencies(): {
  dependencies: McpDomainDependencies;
  state: {
    products: Map<string, Entity>;
    categories: Map<string, Entity>;
    content: Map<string, Entity>;
    settings: Entity;
  };
} {
  const state: {
    products: Map<string, Entity>;
    categories: Map<string, Entity>;
    content: Map<string, Entity>;
    settings: Entity;
  } = {
    products: new Map<string, Entity>(),
    categories: new Map<string, Entity>([
      ['home', { id: 'home', slug: 'home', name: { en: 'Home', ar: 'المنزل' } }],
    ]),
    content: new Map<string, Entity>(),
    settings: {
      siteName: { en: 'AQURIVO', ar: 'AQURIVO' },
      topBarAnnouncement: { en: 'Independent', ar: 'مستقل' },
      topBarEnabled: false,
      contactEmail: 'contact@aqurivo.store',
      isDefault: false,
    },
  };

  const dependencies: McpDomainDependencies = {
    products: {
      async list() {
        return [...state.products.values()];
      },
      async get(id) {
        return state.products.get(id) ?? null;
      },
      async save(input, existingId) {
        const slug = generateSlug(String(input.slug), String(input.sourceId));
        const id = existingId || slug;
        const item = { ...input, slug, id };
        state.products.set(id, item);
        return item;
      },
      async delete(id) {
        state.products.delete(id);
      },
    },
    categories: {
      async list() {
        return [...state.categories.values()];
      },
      async save(input) {
        const id = String(input.slug);
        const item = { ...input, id };
        state.categories.set(id, item);
        return item;
      },
      async delete(id) {
        state.categories.delete(id);
      },
    },
    content: {
      async list() {
        return [...state.content.values()];
      },
      async get(id) {
        return state.content.get(id) ?? null;
      },
      async save(input, existingId) {
        const id = existingId || String(input.slug);
        const item = { ...input, id };
        state.content.set(id, item);
        return item;
      },
      async delete(id) {
        state.content.delete(id);
      },
    },
    sources: {
      async list() {
        return [{ id: 'amazon', slug: 'amazon', name: { en: 'Amazon', ar: 'أمازون' } }];
      },
    },
    settings: {
      async get() {
        return { ...state.settings };
      },
      async save(input) {
        state.settings = { ...input, updatedAt: '2026-10-29T00:00:00.000Z' };
        return { ...state.settings };
      },
    },
  };
  return { dependencies, state };
}

function createMemoryAuditStore(): AuditStore {
  const entries: AuditEntry[] = [];
  return {
    async append(entry) {
      entries.push(entry);
    },
    async find(operationId) {
      return [...entries]
        .reverse()
        .find((entry) => entry.operationId === operationId && entry.phase === 'completed') ?? null;
    },
    async recent(limit) {
      return entries.filter((entry) => entry.phase === 'completed').slice(-limit).reverse();
    },
  };
}

async function connectServer(
  dependencies: McpDomainDependencies,
  policy: () => typeof enabledLocalPolicy,
  audit: AuditStore = createMemoryAuditStore(),
  fetcher?: typeof fetch
) {
  const server = new McpServer({ name: 'aqurivo-mcp-test', version: '0.1.0' });
  registerAqurivoTools(server, dependencies, {
    policy,
    audit,
    auditBaseUrl: 'https://aqurivo.store',
    ...(fetcher ? { fetcher } : {}),
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'aqurivo-mcp-test-client', version: '0.1.0' });
  await client.connect(clientTransport);
  return { client, server };
}

function readToolText(response: unknown) {
  assert.ok(response && typeof response === 'object');
  const content = (response as { content?: unknown[] }).content;
  assert.ok(Array.isArray(content));
  const item = content.find(
    (content): content is { type: 'text'; text: string } =>
      Boolean(content) &&
      typeof content === 'object' &&
      (content as { type?: unknown }).type === 'text' &&
      typeof (content as { text?: unknown }).text === 'string'
  );
  const text = item?.text;
  assert.ok(text);
  return JSON.parse(text) as Entity;
}

test('MCP tool discovery, product read/write verification and snapshot rollback work over in-memory transport', async () => {
  const { dependencies, state } = createFakeDependencies();
  const audit = createMemoryAuditStore();
  const { client, server } = await connectServer(
    dependencies,
    () => enabledLocalPolicy,
    audit
  );

  try {
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);
    assert.ok(names.includes('aqurivo_save_product'));
    assert.ok(names.includes('aqurivo_restore_change'));
    assert.ok(names.includes('aqurivo_audit_site'));

    const created = await client.callTool({
      name: 'aqurivo_save_product',
      arguments: {
        product: {
          slug: 'test-mcp-product',
          title: { en: 'Test product', ar: 'منتج تجريبي' },
          priceAmount: 25,
          affiliateUrl: 'https://shop.example/item',
          sourceId: 'amazon',
          categoryId: 'home',
          status: 'draft',
        },
        confirm: true,
      },
    });
    const createdData = readToolText(created);
    assert.equal(createdData.verified, true);
    const operationId = String(createdData.operationId);
    assert.equal(state.products.get('test-mcp-product-amazon')?.slug, 'test-mcp-product-amazon');

    const auditRead = await client.callTool({
      name: 'aqurivo_read_audit',
      arguments: { includeSnapshots: true },
    });
    const auditData = readToolText(auditRead);
    assert.equal((auditData.entries as AuditEntry[])[0].phase, 'completed');
    assert.equal((auditData.entries as AuditEntry[])[0].after?.slug, 'test-mcp-product-amazon');

    const restored = await client.callTool({
      name: 'aqurivo_restore_change',
      arguments: { operationId, confirm: true },
    });
    assert.equal(readToolText(restored).verified, true);
    assert.equal(state.products.has('test-mcp-product-amazon'), false);
  } finally {
    await client.close();
    await server.close();
  }
});

test('the configured MCP server reads and writes a temporary local Turso database over real stdio', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aqurivo-mcp-stdio-'));
  const databasePath = join(directory, 'aqurivo.db');
  const auditPath = join(directory, 'audit.jsonl');
  const env = {
    ...getDefaultEnvironment(),
    AQURIVO_MCP_TARGET: 'local',
    AQURIVO_MCP_ENABLE_WRITES: 'true',
    AQURIVO_MCP_ALLOW_DELETES: 'true',
    AQURIVO_MCP_AUDIT_PATH: auditPath,
    DATA_STORE: 'turso',
    NEXT_PUBLIC_DATA_STORE: 'turso',
    TURSO_DATABASE_URL: pathToFileURL(databasePath).href,
    TURSO_AUTH_TOKEN: 'local-test-only',
  };
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--conditions=react-server', '--import', 'tsx', 'mcp/server.ts'],
    cwd: process.cwd(),
    env,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'aqurivo-stdio-smoke-test', version: '0.1.0' });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'aqurivo_list_products'));
    const status = await client.callTool({ name: 'aqurivo_status', arguments: {} });
    const statusData = readToolText(status);
    assert.equal(statusData.target, 'local');
    assert.equal(statusData.canWrite, true);

    const category = await client.callTool({
      name: 'aqurivo_save_category',
      arguments: {
        category: {
          slug: 'mcp-local-test',
          name: { en: 'MCP local test', ar: 'اختبار محلي' },
        },
        confirm: true,
      },
    });
    assert.equal(readToolText(category).verified, true);

    const product = await client.callTool({
      name: 'aqurivo_save_product',
      arguments: {
        product: {
          slug: 'mcp-local-test-product',
          title: { en: 'MCP local test product', ar: 'منتج اختبار محلي' },
          priceAmount: 19.99,
          affiliateUrl: 'https://shop.example/test',
          sourceId: 'amazon',
          categoryId: 'mcp-local-test',
          status: 'draft',
        },
        confirm: true,
      },
    });
    assert.equal(readToolText(product).verified, true);

    const products = await client.callTool({
      name: 'aqurivo_list_products',
      arguments: { query: 'mcp-local-test-product' },
    });
    assert.equal(
      (readToolText(products).products as Entity[])[0].slug,
      'mcp-local-test-product-amazon'
    );

    const categoryDelete = await client.callTool({
      name: 'aqurivo_delete_category',
      arguments: { categoryId: 'mcp-local-test', confirm: true },
    });
    assert.equal(categoryDelete.isError, true);

    const guide = await client.callTool({
      name: 'aqurivo_save_editorial_content',
      arguments: {
        content: {
          slug: 'mcp-local-buying-guide',
          title: { en: 'Local test guide', ar: 'دليل اختبار محلي' },
          contentHtml: { en: '<p>Local guide</p>', ar: '<p>دليل محلي</p>' },
          categoryId: 'mcp-local-test',
          status: 'draft',
        },
        confirm: true,
      },
    });
    assert.equal(readToolText(guide).verified, true);

    const settings = await client.callTool({
      name: 'aqurivo_update_site_settings',
      arguments: {
        settings: {
          siteName: { en: 'AQURIVO', ar: 'AQURIVO' },
          topBarAnnouncement: { en: 'Local database test', ar: 'اختبار قاعدة محلية' },
          topBarEnabled: true,
          contactEmail: 'contact@aqurivo.store',
          contactPhoneDisplay: '',
          contactPhoneE164: '',
          whatsappUrl: '',
        },
        confirm: true,
      },
    });
    assert.equal(readToolText(settings).verified, true);

    const rolledBack = await client.callTool({
      name: 'aqurivo_restore_change',
      arguments: {
        operationId: String(readToolText(product).operationId),
        confirm: true,
      },
    });
    assert.equal(readToolText(rolledBack).verified, true);
    const productsAfterRollback = await client.callTool({
      name: 'aqurivo_list_products',
      arguments: { query: 'mcp-local-test-product' },
    });
    assert.equal((readToolText(productsAfterRollback).products as Entity[]).length, 0);
  } finally {
    await client.close();
    await transport.close();
    for (const file of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`, auditPath]) {
      try {
        await unlink(file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    await rmdir(directory);
  }
});

test('write calls are rejected when the effective policy is read-only', async () => {
  const { dependencies, state } = createFakeDependencies();
  const readOnlyPolicy = () => ({ ...enabledLocalPolicy, canWrite: false, canDelete: false });
  const { client, server } = await connectServer(dependencies, readOnlyPolicy);

  try {
    const response = await client.callTool({
      name: 'aqurivo_save_category',
      arguments: {
        category: {
          slug: 'new-category',
          name: { en: 'New category', ar: 'تصنيف جديد' },
        },
        confirm: true,
      },
    });
    assert.equal(response.isError, true);
    assert.equal(state.categories.has('new-category'), false);
  } finally {
    await client.close();
    await server.close();
  }
});

test('category, buying-guide and site-settings changes are verified and audited', async () => {
  const { dependencies, state } = createFakeDependencies();
  const { client, server } = await connectServer(dependencies, () => enabledLocalPolicy);

  try {
    const category = await client.callTool({
      name: 'aqurivo_save_category',
      arguments: {
        category: {
          slug: 'office',
          name: { en: 'Office', ar: 'المكتب' },
          isActive: true,
        },
        confirm: true,
      },
    });
    assert.equal(readToolText(category).verified, true);
    assert.equal(state.categories.has('office'), true);

    const guide = await client.callTool({
      name: 'aqurivo_save_editorial_content',
      arguments: {
        content: {
          slug: 'mcp-buying-guide',
          title: { en: 'Buying guide', ar: 'دليل شراء' },
          contentHtml: { en: '<p>Guide content</p>', ar: '<p>محتوى الدليل</p>' },
          categoryId: 'home',
          status: 'draft',
        },
        confirm: true,
      },
    });
    assert.equal(readToolText(guide).verified, true);
    assert.equal(state.content.get('mcp-buying-guide')?.status, 'draft');

    const settings = await client.callTool({
      name: 'aqurivo_update_site_settings',
      arguments: {
        settings: {
          siteName: { en: 'AQURIVO', ar: 'AQURIVO' },
          topBarAnnouncement: { en: 'Updated locally', ar: 'تحديث محلي' },
          topBarEnabled: true,
          contactEmail: 'contact@aqurivo.store',
          contactPhoneDisplay: '',
          contactPhoneE164: '',
          whatsappUrl: '',
        },
        confirm: true,
      },
    });
    assert.equal(readToolText(settings).verified, true);
    assert.equal(
      (state.settings.topBarAnnouncement as { en: string }).en,
      'Updated locally'
    );

    const deleted = await client.callTool({
      name: 'aqurivo_delete_category',
      arguments: { categoryId: 'office', confirm: true },
    });
    assert.equal(readToolText(deleted).verified, true);
    assert.equal(state.categories.has('office'), false);
  } finally {
    await client.close();
    await server.close();
  }
});

test('file audit store persists operation phases and returns only completed snapshots for restore', async () => {
  const filePath = join(tmpdir(), `aqurivo-mcp-audit-${Date.now()}-${process.pid}.jsonl`);
  const audit = createFileAuditStore(filePath);
  const prepared = createAuditEntry('product', 'test-id', 'create', null, null, 'prepared');
  const completed = createAuditEntry(
    'product',
    'test-id',
    'create',
    null,
    { id: 'test-id', slug: 'test-product' },
    'completed',
    prepared.operationId
  );
  try {
    await audit.append(prepared);
    await audit.append(completed);
    assert.equal((await audit.find(prepared.operationId))?.after?.slug, 'test-product');
    assert.equal((await audit.recent(5))[0]?.phase, 'completed');
  } finally {
    await unlink(filePath);
  }
});

test('local policy rejects hosted database URLs and production requires explicit read/write gates', () => {
  const local = getMcpPolicy({
    AQURIVO_MCP_TARGET: 'local',
    DATA_STORE: 'turso',
    NEXT_PUBLIC_DATA_STORE: 'turso',
    TURSO_DATABASE_URL: 'libsql://production.example',
    TURSO_AUTH_TOKEN: 'not-used-by-this-policy-test',
    AQURIVO_MCP_ENABLE_WRITES: 'true',
  });
  assert.equal(local.databaseReady, false);
  assert.equal(local.canRead, false);
  assert.equal(local.canWrite, false);

  const localFile = getMcpPolicy({
    AQURIVO_MCP_TARGET: 'local',
    DATA_STORE: 'turso',
    NEXT_PUBLIC_DATA_STORE: 'turso',
    TURSO_DATABASE_URL: 'file:///C:/tmp/aqurivo-mcp-test.db',
    TURSO_AUTH_TOKEN: 'local-only',
    AQURIVO_MCP_ENABLE_WRITES: 'true',
  });
  assert.equal(localFile.canWrite, true);

  const remoteFileHost = getMcpPolicy({
    AQURIVO_MCP_TARGET: 'local',
    DATA_STORE: 'turso',
    NEXT_PUBLIC_DATA_STORE: 'turso',
    TURSO_DATABASE_URL: 'file://remote-host/share/aqurivo.db',
    TURSO_AUTH_TOKEN: 'local-only',
    AQURIVO_MCP_ENABLE_WRITES: 'true',
  });
  assert.equal(remoteFileHost.databaseReady, false);

  const production = getMcpPolicy({
    AQURIVO_MCP_TARGET: 'production',
    DATA_STORE: 'turso',
    NEXT_PUBLIC_DATA_STORE: 'turso',
    TURSO_DATABASE_URL: 'libsql://production.example',
    TURSO_AUTH_TOKEN: 'not-used-by-this-policy-test',
    AQURIVO_MCP_ALLOW_PRODUCTION_READS: 'true',
    AQURIVO_MCP_ENABLE_WRITES: 'true',
  });
  assert.equal(production.canRead, true);
  assert.equal(production.canWrite, false);
});

test('site audit samples only same-origin sitemap pages and reports missing SEO metadata', async () => {
  const { dependencies } = createFakeDependencies();
  const requestedHosts: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    requestedHosts.push(url.host);
    if (url.pathname === '/sitemap.xml') {
      return new Response(
        '<urlset><url><loc>https://aqurivo.store/products/item</loc></url><url><loc>https://other.example/</loc></url></urlset>',
        { status: 200, headers: { 'content-type': 'application/xml' } }
      );
    }
    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *', { status: 200, headers: { 'content-type': 'text/plain' } });
    }
    if (url.pathname === '/') {
      return new Response(
        '<title>AQURIVO</title><meta name="description" content="Description"><link rel="canonical" href="https://aqurivo.store/">',
        { status: 200, headers: { 'content-type': 'text/html' } }
      );
    }
    return new Response('<title>Product</title>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  };
  const { client, server } = await connectServer(
    dependencies,
    () => enabledLocalPolicy,
    createMemoryAuditStore(),
    fetcher
  );

  try {
    const response = await client.callTool({
      name: 'aqurivo_audit_site',
      arguments: { pageLimit: 5 },
    });
    const report = readToolText(response);
    assert.ok((report.issues as Entity[]).some((issue) => issue.issue === 'Missing meta description'));
    assert.equal(report.offOriginSitemapUrlCount, 1);
    assert.ok(requestedHosts.every((host) => host === 'aqurivo.store'));
  } finally {
    await client.close();
    await server.close();
  }
});
