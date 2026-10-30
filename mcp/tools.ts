import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { generateSlug } from '@/lib/seoSlug';
import {
  createAuditEntry,
  hashAuditSnapshot,
  type AuditAction,
  type AuditEntry,
  type AuditStore,
  type AuditedEntity,
} from './audit';
import {
  requireProductWriteAccess,
  requireReadAccess,
  requireWriteAccess,
  type McpPolicy,
} from './policy';

type Entity = Record<string, unknown>;

export interface McpDomainDependencies {
  products: {
    list(): Promise<Entity[]>;
    get(id: string): Promise<Entity | null>;
    save(input: Entity, existingId?: string): Promise<Entity>;
    delete(id: string): Promise<void>;
  };
  categories: {
    list(): Promise<Entity[]>;
    save(input: Entity): Promise<Entity>;
    delete(id: string): Promise<void>;
  };
  content: {
    list(): Promise<Entity[]>;
    get(id: string): Promise<Entity | null>;
    save(input: Entity, existingId?: string): Promise<Entity>;
    delete(id: string): Promise<void>;
  };
  sources: { list(): Promise<Entity[]> };
  settings: {
    get(): Promise<Entity>;
    save(input: Entity): Promise<Entity>;
  };
}

export interface McpToolOptions {
  policy: () => McpPolicy;
  audit: AuditStore;
  auditBaseUrl: string;
  fetcher?: typeof fetch;
}

const localizedText = z.object({
  en: z.string().max(5000),
  ar: z.string().max(5000),
});

const productTitle = z.object({
  en: z.string().min(1).max(180),
  ar: z.string().min(1).max(180),
});

const secureHttpsUrl = z.string().url().max(1024).refine(
  (value) => new URL(value).protocol === 'https:',
  'URL must use HTTPS.'
);

const productInput = z.object({
  slug: z.string().min(1).max(120),
  title: productTitle,
  shortSummary: z.object({ en: z.string().max(320), ar: z.string().max(320) }).optional(),
  whyWePickedIt: z.object({ en: z.string().max(1200), ar: z.string().max(1200) }).optional(),
  whatToConsider: z.object({ en: z.string().max(1200), ar: z.string().max(1200) }).optional(),
  description: z.object({ en: z.string().max(5000), ar: z.string().max(5000) }).optional(),
  priceAmount: z.number().positive().max(1_000_000),
  oldPrice: z.number().positive().max(1_000_000).nullable().optional(),
  discount: z.number().min(0).max(99).optional(),
  discountPercent: z.number().min(0).max(99).optional(),
  stars: z.number().min(1).max(5).optional(),
  soldCount: z.number().int().min(0).max(10_000_000).optional(),
  badge: z.enum(['توفير', 'اليوم الأخير']).nullable().optional(),
  priceCurrency: z.string().regex(/^[A-Za-z]{2,4}$/).optional(),
  priceNote: z.object({ en: z.string().max(200), ar: z.string().max(200) }).optional(),
  priceDisplayPolicy: z.enum(['show_with_timestamp', 'hide_price_check_store']).optional(),
  affiliateUrl: secureHttpsUrl,
  sourceId: z.string().min(1).max(128),
  categoryId: z.string().min(1).max(128),
  images: z
    .array(
      z.object({
        url: z.string().min(1).max(1500),
        publicId: z.string().max(180).optional(),
        alt: localizedText.optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
      })
    )
    .max(16)
    .optional(),
  videoUrl: secureHttpsUrl.optional(),
  videoUrls: z.array(secureHttpsUrl).max(12).optional(),
  videos: z
    .array(
    z.union([
      secureHttpsUrl,
      z.object({
        url: secureHttpsUrl,
        title: z.union([z.string().max(160), localizedText]).optional(),
        thumbnailUrl: secureHttpsUrl.optional(),
      }),
    ])
    )
    .max(12)
    .optional(),
  comparisonDna: z
    .object({
    bestFor: z.object({ en: z.string().max(180), ar: z.string().max(180) }).optional(),
    keySpecs: z.object({
      en: z.array(z.string().max(90)).max(5),
      ar: z.array(z.string().max(90)).max(5),
    }).optional(),
    performanceScore: z.number().min(50).max(99).optional(),
    valueScore: z.number().min(50).max(99).optional(),
    reliabilityScore: z.number().min(50).max(99).optional(),
    })
    .optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  status: z.enum(['published', 'draft', 'archived']).optional(),
  isFeatured: z.boolean().optional(),
}).strict();

const categoryInput = z.object({
  slug: z.string().min(1).max(120),
  name: z.object({ en: z.string().min(1).max(80), ar: z.string().min(1).max(80) }),
  icon: z.string().max(30).optional(),
  order: z.number().finite().optional(),
  isActive: z.boolean().optional(),
}).strict();

const contentInput = z.object({
  slug: z.string().min(1).max(120),
  title: z.object({ en: z.string().min(1).max(180), ar: z.string().min(1).max(180) }),
  excerpt: z.object({ en: z.string().max(400), ar: z.string().max(400) }).optional(),
  contentHtml: z.object({ en: z.string().max(50000), ar: z.string().max(50000) }),
  coverImage: z.string().max(500).optional(),
  topPickProductId: z.string().max(128).optional(),
  authorName: z.string().max(128).optional(),
  categoryId: z.string().max(128).optional(),
  relatedProductIds: z.array(z.string().max(128)).max(12).optional(),
  readingTimeMinutes: z.number().int().min(1).max(60).optional(),
  status: z.enum(['published', 'draft']).optional(),
  seoTitle: z.object({ en: z.string().max(180), ar: z.string().max(180) }).optional(),
  seoDescription: z.object({ en: z.string().max(320), ar: z.string().max(320) }).optional(),
  seoKeywords: z.array(z.string().max(80)).max(20).optional(),
  editorVerdict: z.object({ en: z.string().max(1200), ar: z.string().max(1200) }).optional(),
  faqItems: z
    .array(
      z.object({
        question: z.object({ en: z.string().max(300), ar: z.string().max(300) }),
        answer: z.object({ en: z.string().max(1200), ar: z.string().max(1200) }),
      })
    )
    .max(10)
    .optional(),
}).strict();

const settingsInput = z.object({
  siteName: z.object({ en: z.string().min(2).max(80), ar: z.string().min(2).max(80) }),
  topBarAnnouncement: z.object({
    en: z.string().min(2).max(240),
    ar: z.string().min(2).max(240),
  }),
  topBarEnabled: z.boolean(),
  contactEmail: z.string().max(160),
  contactPhoneDisplay: z.string().max(40),
  contactPhoneE164: z.string().max(30),
  whatsappUrl: z.string().max(200),
}).strict();

function result(value: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected AQURIVO MCP operation failure.';
}

function asEntity(value: unknown): Entity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The saved record has an invalid shape.');
  }
  return value as Entity;
}

async function auditedMutation(
  audit: AuditStore,
  entity: AuditedEntity,
  action: AuditAction,
  id: string,
  before: Entity | null,
  mutate: () => Promise<Entity | null>
): Promise<{ operationId: string; entity: Entity | null }> {
  const prepared = createAuditEntry(entity, id, action, before, null, 'prepared');
  await audit.append(prepared);

  let saved: Entity | null;
  try {
    saved = await mutate();
  } catch (error) {
    try {
      await audit.append(
        createAuditEntry(entity, id, action, before, null, 'failed', prepared.operationId, errorMessage(error))
      );
    } catch (auditError) {
      throw new Error(
        `The ${entity} change failed and its failure could not be recorded: ${errorMessage(error)}; audit: ${errorMessage(auditError)}`
      );
    }
    throw error;
  }

  try {
    await audit.append(
      createAuditEntry(entity, id, action, before, saved, 'completed', prepared.operationId)
    );
  } catch (error) {
    throw new Error(
      `The ${entity} change completed, but its audit record could not be written (operation ${prepared.operationId}): ${errorMessage(error)}`
    );
  }
  return { operationId: prepared.operationId, entity: saved };
}

const allowedAuditHost = (url: URL): boolean => {
  const host = url.hostname.toLowerCase();
  const loopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  return (
    (url.protocol === 'https:' && (host === 'aqurivo.store' || host.endsWith('.aqurivo.store'))) ||
    (url.protocol === 'http:' && loopback)
  );
};

async function readLimitedBody(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (length < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = maxBytes - length;
    const chunk = value.subarray(0, remaining);
    chunks.push(chunk);
    length += chunk.byteLength;
    if (chunk.byteLength < value.byteLength) {
      await reader.cancel();
      break;
    }
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function auditSite(
  baseUrl: string,
  pageLimit: number,
  fetcher: typeof fetch
): Promise<Entity> {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new Error('Configure AQURIVO_MCP_AUDIT_BASE_URL with a valid AQURIVO URL.');
  }
  if (!allowedAuditHost(base) || base.username || base.password) {
    throw new Error('Site checks are restricted to aqurivo.store or localhost; arbitrary URLs are not accepted.');
  }
  base.pathname = base.pathname.replace(/\/+$/, '') || '/';
  base.search = '';
  base.hash = '';

  const issues: Entity[] = [];
  const checkedPages: Entity[] = [];
  const request = async (target: URL): Promise<Response> => {
    if (target.origin !== base.origin) {
      throw new Error('The sitemap contains an off-origin URL; external hosts are not crawled.');
    }
    return fetcher(target, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'AQURIVO-MCP-Site-Audit/1.0' },
    });
  };

  const sitemapUrl = new URL('/sitemap.xml', base);
  const sitemapResponse = await request(sitemapUrl);
  if (!sitemapResponse.ok) {
    issues.push({ url: sitemapUrl.href, issue: `Sitemap returned HTTP ${sitemapResponse.status}` });
  }
  const sitemapXml = await readLimitedBody(sitemapResponse, 1_000_000);
  const parsedSitemapUrls = [...sitemapXml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)]
    .map((match) => match[1].replace(/&amp;/g, '&').trim())
    .filter(Boolean)
    .map((value) => new URL(value, base));
  const offOriginCount = parsedSitemapUrls.filter((url) => url.origin !== base.origin).length;
  const sitemapPages = parsedSitemapUrls
    .filter((url) => url.origin === base.origin)
    .slice(0, pageLimit);
  if (offOriginCount > 0) {
    issues.push({
      issue: 'Off-origin sitemap URLs were skipped and not crawled.',
      count: offOriginCount,
    });
  }
  if (sitemapResponse.ok && sitemapPages.length === 0 && offOriginCount === 0) {
    issues.push({ url: sitemapUrl.href, issue: 'The sitemap contains no same-origin page URLs.' });
  }

  const targets = [
    new URL('/', base),
    new URL('/robots.txt', base),
    ...sitemapPages,
  ].filter((url, index, list) => list.findIndex((other) => other.href === url.href) === index);

  for (let index = 0; index < targets.length; index += 4) {
    const batch = targets.slice(index, index + 4);
    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          const response = await request(url);
          const isHtml = response.headers.get('content-type')?.includes('text/html') ?? false;
          const html = isHtml ? await readLimitedBody(response, 1_000_000) : '';
          const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
          const description =
            html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] ||
            html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1] ||
            '';
          const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || '';
          return { url: url.href, status: response.status, title, description, canonical };
        } catch (error) {
          return { url: url.href, error: errorMessage(error), title: '', description: '', canonical: '' };
        }
      })
    );
    for (const page of results) {
      checkedPages.push(page);
      if ('error' in page || (page.status ?? 0) >= 300) {
        issues.push({ url: page.url, issue: 'Page request failed, redirected, or returned an error status', status: page.status, error: page.error });
      } else if (page.url !== new URL('/robots.txt', base).href) {
        if (!page.title) issues.push({ url: page.url, issue: 'Missing HTML title' });
        if (!page.description) issues.push({ url: page.url, issue: 'Missing meta description' });
        if (!page.canonical) issues.push({ url: page.url, issue: 'Missing canonical link' });
      }
    }
  }

  return {
    baseUrl: base.origin,
    sitemapStatus: sitemapResponse.status,
    sitemapPageCount: sitemapPages.length,
    offOriginSitemapUrlCount: offOriginCount,
    checkedCount: checkedPages.length,
    issues,
    pages: checkedPages,
  };
}

export function registerAqurivoTools(
  server: McpServer,
  dependencies: McpDomainDependencies,
  options: McpToolOptions
): void {
  const { policy, audit, auditBaseUrl, fetcher = fetch } = options;

  server.registerTool('aqurivo_status', { description: 'Show configured AQURIVO MCP database target and effective access scopes.' }, async () =>
    result(policy())
  );

  server.registerTool(
    'aqurivo_list_products',
    {
      description: 'Search the AQURIVO product catalog by title or slug and filter by publication status.',
      inputSchema: {
        query: z.string().max(120).optional(),
        status: z.enum(['published', 'draft', 'archived', 'all']).default('all'),
        limit: z.number().int().min(1).max(50).default(20),
      },
    },
    async ({ query, status, limit }) => {
      try {
        requireReadAccess(policy());
        const normalized = query?.toLocaleLowerCase().trim() || '';
        const items = (await dependencies.products.list()).filter((item) => {
          const matchesStatus = status === 'all' || item.status === status;
          const searchable = `${item.slug ?? ''} ${JSON.stringify(item.title ?? '')}`.toLocaleLowerCase();
          return matchesStatus && (!normalized || searchable.includes(normalized));
        });
        return result({ total: items.length, products: items.slice(0, limit) });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_list_sources',
    { description: 'List partner stores configured in AQURIVO, used by product records.' },
    async () => {
      try {
        requireReadAccess(policy());
        return result({ sources: await dependencies.sources.list() });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_save_product',
    {
      description: 'Create or update an AQURIVO product using the existing product validator and repository. Reads the saved product back before reporting success.',
      inputSchema: {
        product: productInput,
        existingId: z.string().min(1).max(128).optional(),
        confirm: z.boolean().describe('Must be true to authorize this database change.'),
      },
    },
    async ({ product, existingId, confirm }) => {
      try {
        requireProductWriteAccess(policy(), confirm);
        const categories = await dependencies.categories.list();
        if (!categories.some((category) => category.id === product.categoryId || category.slug === product.categoryId)) {
          throw new Error('The category does not exist. Create it with aqurivo_save_category first.');
        }
        const sources = await dependencies.sources.list();
        if (!sources.some((source) => source.id === product.sourceId || source.slug === product.sourceId)) {
          throw new Error('The partner source does not exist. Check aqurivo_list_sources.');
        }

        const id = existingId || generateSlug(product.slug, product.sourceId);
        const before = await dependencies.products.get(id);
        if (before && !existingId) {
          throw new Error('A product with this slug already exists. Supply its existingId to update it.');
        }
        if (existingId && !before) throw new Error('The product to update was not found.');

        const operation = await auditedMutation(
          audit,
          'product',
          before ? 'update' : 'create',
          id,
          before,
          async () => {
            const saved = await dependencies.products.save(product, existingId);
            const verified = await dependencies.products.get(String(saved.id));
            if (!verified || verified.slug !== saved.slug) {
              throw new Error('The product write returned, but read-after-write verification failed.');
            }
            return verified;
          }
        );
        return result({ ...operation, verified: true });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_delete_product',
    {
      description: 'Permanently delete one product. Requires writes, destructive actions and a per-call confirmation to be explicitly enabled.',
      inputSchema: {
        productId: z.string().min(1).max(128),
        confirm: z.boolean().describe('Must be true after reviewing the exact product ID.'),
      },
    },
    async ({ productId, confirm }) => {
      try {
        requireWriteAccess(policy(), confirm, true);
        const before = await dependencies.products.get(productId);
        if (!before) throw new Error('The product was not found; nothing was deleted.');
        const operation = await auditedMutation(audit, 'product', 'delete', productId, before, async () => {
          await dependencies.products.delete(productId);
          if (await dependencies.products.get(productId)) {
            throw new Error('The product still exists after deletion.');
          }
          return null;
        });
        return result({ ...operation, verified: true });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_list_categories',
    { description: 'List active and inactive AQURIVO product categories.' },
    async () => {
      try {
        requireReadAccess(policy());
        return result({ categories: await dependencies.categories.list() });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_save_category',
    {
      description: 'Create or update an AQURIVO category using the existing category repository.',
      inputSchema: {
        category: categoryInput,
        confirm: z.boolean().describe('Must be true to authorize this database change.'),
      },
    },
    async ({ category, confirm }) => {
      try {
        requireWriteAccess(policy(), confirm);
        const before = (await dependencies.categories.list()).find((item) => item.id === category.slug) ?? null;
        const operation = await auditedMutation(
          audit,
          'category',
          before ? 'update' : 'create',
          category.slug,
          before,
          async () => {
            const saved = await dependencies.categories.save(category);
            const verified = (await dependencies.categories.list()).find((item) => item.id === saved.id);
            if (!verified || verified.slug !== saved.slug) {
              throw new Error('The category write returned, but read-after-write verification failed.');
            }
            return verified;
          }
        );
        return result({ ...operation, verified: true });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_delete_category',
    {
      description: 'Permanently delete an unused AQURIVO category. Categories referenced by products cannot be deleted.',
      inputSchema: {
        categoryId: z.string().min(1).max(128),
        confirm: z.boolean().describe('Must be true after reviewing the exact category ID.'),
      },
    },
    async ({ categoryId, confirm }) => {
      try {
        requireWriteAccess(policy(), confirm, true);
        const categories = await dependencies.categories.list();
        const before = categories.find((item) => item.id === categoryId || item.slug === categoryId);
        if (!before) throw new Error('The category was not found; nothing was deleted.');
        const products = await dependencies.products.list();
        if (products.some((product) => product.categoryId === categoryId || product.categorySlug === before.slug)) {
          throw new Error('This category is still referenced by products. Deactivate it instead of deleting it.');
        }
        const operation = await auditedMutation(audit, 'category', 'delete', String(before.id), before, async () => {
          await dependencies.categories.delete(String(before.id));
          if ((await dependencies.categories.list()).some((item) => item.id === before.id)) {
            throw new Error('The category still exists after deletion.');
          }
          return null;
        });
        return result({ ...operation, verified: true });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_list_editorial_content',
    {
      description: 'List AQURIVO articles and buying guides. The project stores both in the same articles collection.',
      inputSchema: {
        query: z.string().max(120).optional(),
        status: z.enum(['published', 'draft', 'all']).default('all'),
        limit: z.number().int().min(1).max(50).default(20),
      },
    },
    async ({ query, status, limit }) => {
      try {
        requireReadAccess(policy());
        const normalized = query?.toLocaleLowerCase().trim() || '';
        const items = (await dependencies.content.list()).filter((item) => {
          const matchesStatus = status === 'all' || item.status === status;
          const searchable = `${item.slug ?? ''} ${JSON.stringify(item.title ?? '')}`.toLocaleLowerCase();
          return matchesStatus && (!normalized || searchable.includes(normalized));
        });
        return result({ total: items.length, content: items.slice(0, limit) });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_get_site_settings',
    { description: 'Read the public AQURIVO site settings supported by the existing admin settings form.' },
    async () => {
      try {
        requireReadAccess(policy());
        return result({ settings: await dependencies.settings.get() });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_update_site_settings',
    {
      description: 'Update the public AQURIVO site name, announcement bar and contact details using the existing settings validator.',
      inputSchema: {
        settings: settingsInput,
        confirm: z.boolean().describe('Must be true to authorize this database change.'),
      },
    },
    async ({ settings, confirm }) => {
      try {
        requireWriteAccess(policy(), confirm);
        const before = await dependencies.settings.get();
        const operation = await auditedMutation(
          audit,
          'settings',
          'update',
          'public',
          before,
          async () => {
            const updated = await dependencies.settings.save(settings);
            const verified = await dependencies.settings.get();
            if (
              localizedValue(verified, 'siteName', 'en') !== localizedValue(updated, 'siteName', 'en') ||
              localizedValue(verified, 'topBarAnnouncement', 'en') !==
                localizedValue(updated, 'topBarAnnouncement', 'en')
            ) {
              throw new Error('The settings write returned, but read-after-write verification failed.');
            }
            return verified;
          }
        );
        return result({ ...operation, verified: true });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_save_editorial_content',
    {
      description: 'Create, edit, or publish an AQURIVO article/buying guide. Supports bilingual HTML, SEO fields, related products and status.',
      inputSchema: {
        content: contentInput,
        existingId: z.string().min(1).max(128).optional(),
        confirm: z.boolean().describe('Must be true to authorize this database change.'),
      },
    },
    async ({ content, existingId, confirm }) => {
      try {
        requireWriteAccess(policy(), confirm);
        const id = existingId || content.slug;
        const before = await dependencies.content.get(id);
        if (before && !existingId) {
          throw new Error('Editorial content with this slug already exists. Supply its existingId to update it.');
        }
        if (existingId && !before) throw new Error('The editorial content to update was not found.');
        const operation = await auditedMutation(
          audit,
          'content',
          before ? 'update' : 'create',
          id,
          before,
          async () => {
            const saved = await dependencies.content.save(content, existingId);
            const verified = await dependencies.content.get(String(saved.id));
            if (!verified || verified.slug !== saved.slug) {
              throw new Error('The content write returned, but read-after-write verification failed.');
            }
            return verified;
          }
        );
        return result({ ...operation, verified: true });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_delete_editorial_content',
    {
      description: 'Permanently delete one AQURIVO article or buying guide. Requires all deletion safeguards.',
      inputSchema: {
        contentId: z.string().min(1).max(128),
        confirm: z.boolean().describe('Must be true after reviewing the exact content ID.'),
      },
    },
    async ({ contentId, confirm }) => {
      try {
        requireWriteAccess(policy(), confirm, true);
        const before = await dependencies.content.get(contentId);
        if (!before) throw new Error('Editorial content was not found; nothing was deleted.');
        const operation = await auditedMutation(audit, 'content', 'delete', contentId, before, async () => {
          await dependencies.content.delete(contentId);
          if (await dependencies.content.get(contentId)) {
            throw new Error('The content still exists after deletion.');
          }
          return null;
        });
        return result({ ...operation, verified: true });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_audit_site',
    {
      description: 'Check the AQURIVO sitemap, robots.txt, homepage and a bounded sample of same-origin sitemap pages for HTTP failures and missing title, description or canonical tags. Never crawls arbitrary hosts.',
      inputSchema: { pageLimit: z.number().int().min(1).max(30).default(10) },
    },
    async ({ pageLimit }) => {
      try {
        return result(await auditSite(auditBaseUrl, pageLimit, fetcher));
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_read_audit',
    {
      description: 'Read the latest successful AQURIVO MCP change records. Snapshots can be included for manual recovery.',
      inputSchema: {
        limit: z.number().int().min(1).max(20).default(10),
        includeSnapshots: z.boolean().default(false),
      },
    },
    async ({ limit, includeSnapshots }) => {
      try {
        const entries = await audit.recent(limit);
        return result({
          entries: entries.map((entry: AuditEntry) => {
            if (includeSnapshots) return entry;
            const { before: _before, after: _after, ...metadata } = entry;
            return metadata;
          }),
        });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );

  server.registerTool(
    'aqurivo_restore_change',
    {
      description: 'Restore the before-snapshot of a successful AQURIVO MCP change if the current record still matches its recorded after-snapshot. Reversing a create deletes it and requires deletion safeguards.',
      inputSchema: {
        operationId: z.string().uuid(),
        confirm: z.boolean().describe('Must be true after reviewing the audit entry and its snapshots.'),
      },
    },
    async ({ operationId, confirm }) => {
      try {
        const entry = await audit.find(operationId);
        if (!entry) throw new Error('No completed audit record exists for that operation ID.');
        const isCreateRollback = entry.before === null;
        requireWriteAccess(policy(), confirm, isCreateRollback);

        const current = await readEntity(dependencies, entry.entity, entry.entityId);
        if (hashAuditSnapshot(current) !== entry.afterSha256) {
          throw new Error('The record changed after the audited operation. Refusing to overwrite newer data.');
        }

        let restored: Entity | null = null;
        const operation = await auditedMutation(
          audit,
          entry.entity,
          'restore',
          entry.entityId,
          current,
          async () => {
            if (entry.before === null) {
              if (entry.entity === 'category') {
                const products = await dependencies.products.list();
                if (
                  products.some(
                    (product) =>
                      product.categoryId === entry.entityId ||
                      product.categorySlug === current?.slug
                  )
                ) {
                  throw new Error('A product now references this category. The create cannot be rolled back safely.');
                }
              }
              await deleteEntity(dependencies, entry.entity, entry.entityId);
              if (await readEntity(dependencies, entry.entity, entry.entityId)) {
                throw new Error('The record still exists after rollback deletion.');
              }
              return null;
            }

            restored = await saveEntity(dependencies, entry.entity, entry.before, entry.entityId);
            const verified = await readEntity(dependencies, entry.entity, entry.entityId);
            if (!verified || !matchesRestoredEntity(entry.entity, verified, entry.before)) {
              throw new Error('The restore was submitted, but read-after-write verification failed.');
            }
            return verified;
          }
        );
        return result({ ...operation, verified: true, restoredFromOperationId: operationId });
      } catch (error) {
        return result({ error: errorMessage(error) }, true);
      }
    }
  );
}

async function readEntity(
  dependencies: McpDomainDependencies,
  entity: AuditedEntity,
  id: string
): Promise<Entity | null> {
  if (entity === 'product') return dependencies.products.get(id);
  if (entity === 'content') return dependencies.content.get(id);
  if (entity === 'settings') return dependencies.settings.get();
  return (await dependencies.categories.list()).find((item) => item.id === id) ?? null;
}

async function saveEntity(
  dependencies: McpDomainDependencies,
  entity: AuditedEntity,
  snapshot: Entity,
  id: string
): Promise<Entity> {
  if (entity === 'product') return dependencies.products.save(snapshot, id);
  if (entity === 'content') return dependencies.content.save(snapshot, id);
  if (entity === 'settings') return dependencies.settings.save(snapshot);
  return dependencies.categories.save(snapshot);
}

async function deleteEntity(
  dependencies: McpDomainDependencies,
  entity: AuditedEntity,
  id: string
): Promise<void> {
  if (entity === 'product') return dependencies.products.delete(id);
  if (entity === 'content') return dependencies.content.delete(id);
  if (entity === 'category') return dependencies.categories.delete(id);
  throw new Error('Public site settings cannot be deleted.');
}

function matchesRestoredEntity(entity: AuditedEntity, current: Entity, before: Entity): boolean {
  if (entity === 'settings') {
    return localizedValue(current, 'siteName', 'en') === localizedValue(before, 'siteName', 'en') &&
      localizedValue(current, 'siteName', 'ar') === localizedValue(before, 'siteName', 'ar') &&
      localizedValue(current, 'topBarAnnouncement', 'en') ===
        localizedValue(before, 'topBarAnnouncement', 'en') &&
      localizedValue(current, 'topBarAnnouncement', 'ar') ===
        localizedValue(before, 'topBarAnnouncement', 'ar');
  }
  return current.id === before.id && current.slug === before.slug;
}

function localizedValue(record: Entity, field: string, locale: 'en' | 'ar'): unknown {
  const value = record[field];
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)[locale]
    : undefined;
}
