# AQURIVO MCP

AQURIVO MCP is a local Model Context Protocol server for GitHub Copilot in VS
Code. It exposes a deliberately small, typed set of operations over the
project's existing repositories. It does not expose SQL, a shell, arbitrary
filesystem access, or a generic database query tool.

## What the repository actually supports

- Products and categories are stored through the existing Firestore-compatible
  repositories, backed by Firebase or the configured Turso adapter.
- Articles and buying guides share the `articles` collection and `Article`
  model. There is no separate buying-guide collection.
- Public site settings are stored in the `settings/public` document.
- Static pages and the eleven interactive tools are implemented in source
  files; they are not CMS records. Copilot develops those through its normal
  workspace editing, build, and test capabilities.
- Product image URLs can be managed as part of a product. Image upload still
  uses the existing signed Cloudinary admin flow; MCP does not accept uploads
  or arbitrary image-fetch URLs.

Administrative writes call the same repository functions used by the existing
admin API, including their input validation and cache invalidation. Successful
writes are read back before the tool reports verification.

## Tools

| Tool | Purpose |
| --- | --- |
| `aqurivo_status` | Show database target readiness and effective read/write/delete scopes. |
| `aqurivo_list_products` | Search products by title/slug and status. |
| `aqurivo_list_sources` | Read partner stores for product entry. |
| `aqurivo_save_product` | Create or update a validated product; checks category and source references. |
| `aqurivo_delete_product` | Delete one product after explicit safeguards. |
| `aqurivo_list_categories` | Read categories. |
| `aqurivo_save_category` | Create or update a category. |
| `aqurivo_delete_category` | Delete an unused category; refuses categories referenced by products. |
| `aqurivo_list_editorial_content` | Read articles and buying guides. |
| `aqurivo_save_editorial_content` | Create, update, draft, or publish bilingual editorial content with SEO fields. |
| `aqurivo_delete_editorial_content` | Delete one article or guide after explicit safeguards. |
| `aqurivo_get_site_settings` | Read the public settings document without hiding database errors. |
| `aqurivo_update_site_settings` | Update the public settings supported by the current admin form. |
| `aqurivo_audit_site` | Check `robots.txt`, sitemap, homepage, and a bounded sitemap sample for HTTP/SEO issues. |
| `aqurivo_read_audit` | Read recent MCP change records and, when requested, their before/after snapshots. |
| `aqurivo_restore_change` | Restore a recorded snapshot only if the current record still matches the audited version. Reversing a create is a deletion and uses the deletion gate. |

The site checker accepts only `aqurivo.store` (including its subdomains) or a
loopback HTTP URL. It does not follow redirects or crawl off-origin sitemap
entries. It checks status codes, title, description, and canonical presence; it
is a bounded diagnostic, not a full Lighthouse or browser-rendering audit.

## Run and connect

Requirements: Node.js 20+ (tested with Node 24), npm dependencies installed,
and VS Code with GitHub Copilot Agent MCP support.
The server uses the official `@modelcontextprotocol/sdk` TypeScript package
(1.32.2, the latest published version checked for this setup) with Zod input
schemas.

1. Install the project dependencies with `npm install`.
2. The workspace MCP configuration is [.vscode/mcp.json](../.vscode/mcp.json).
   Reload VS Code or run **MCP: List Servers**, then start `aqurivo`.
3. Configure the workspace MCP target to match the intended database. The
   current workspace configuration targets the app's hosted Turso database
   loaded from `.env.local`; its environment gates permit product and editorial
   writes. The admin dashboard can independently narrow or enable each write
   scope within those environment limits. Keep credentials
   out of `.vscode/mcp.json`. For local development, set the target to `local`,
   use `DATA_STORE=turso`, `NEXT_PUBLIC_DATA_STORE=turso`, a file-backed
   `TURSO_DATABASE_URL`, and a placeholder `TURSO_AUTH_TOKEN`. The ignored
   `.aqurivo-mcp/` directory can hold that database; create it with
   `New-Item -ItemType Directory -Force .aqurivo-mcp`. Never point local mode at
   hosted credentials. Every write still requires `confirm: true`.
4. To launch the same stdio server manually, run `npm run mcp`. Its JSON-RPC
   protocol uses stdout; diagnostics are not printed to stdout.
5. To test the project, run `npm test`. The MCP tests use an in-memory
   transport and a temporary local Turso/SQLite file; the stdio test forces
   local database settings and does not connect to Firebase or hosted Turso.

`AQURIVO_MCP_AUDIT_BASE_URL` optionally selects the site checked by the audit
tool. `AQURIVO_MCP_AUDIT_PATH` optionally selects the JSONL audit log. By
default the log is `~/.aqurivo-mcp/audit.jsonl`, outside the repository. It
contains public entity before/after snapshots for recovery; protect this file
as project data. `.aqurivo-mcp/` is ignored for local database files. Entries
are limited to 2 MB and the log to 50 MB; when full, MCP refuses new mutations
until the owner archives the log.

## Access controls and production safety

The server uses local `stdio`; it opens no HTTP listener. Its repository
allowlist is the authorization boundary: only the named product, category,
article, settings, and site-check functions are exposed.
The host operating-system account is the caller boundary for this local
single-user process; the MCP server is not a multi-user authentication
service. Do not run it in a shared account/workspace or expose its stdio
credentials to another process.

- Database access is disabled until `AQURIVO_MCP_TARGET` is explicitly set.
- Local mode rejects non-file database URLs. The workspace config selects the
  intended target explicitly.
- Each write tool requires `confirm: true` and
  `AQURIVO_MCP_ENABLE_WRITES=true`.
- Production reads additionally require
  `AQURIVO_MCP_ALLOW_PRODUCTION_READS=true`.
- General production writes additionally require
  `AQURIVO_MCP_ALLOW_PRODUCTION_WRITES=true`. Product saves and editorial
  saves can instead be enabled separately with
  `AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES=true` and
  `AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES=true`, respectively. These
  scoped gates do not enable category, settings, restore, or delete writes.
- Editorial write access applies to creating, updating, drafting, and
  publishing articles and buying guides. They share the `articles` collection;
  deletion and audit restoration remain disabled unless their separate gates
  are enabled.
- Deletions require all applicable write gates plus
  `AQURIVO_MCP_ALLOW_DELETES=true` and `confirm: true` on that call.
- The log records prepared, completed, and failed mutation phases. A prepared
  record without a completion can indicate that the process stopped mid-write;
  inspect the database before retrying.
- Production also requires changing the target in `.vscode/mcp.json` to
  `production`. Do not do that or set production flags without the owner's
  explicit approval. MCP never deploys to Vercel or pushes to GitHub.
- Settings, products, categories, and editorial writes are logged with
  operation IDs and before/after snapshots. `aqurivo_restore_change` refuses
  to overwrite a record that changed after its logged operation.

The app's admin APIs still require their existing authenticated admin session
and CSRF checks. This MCP process is separate: it runs only as a local VS Code
child process and uses the configured server-side database credentials. Do not
expose it as a remote service or share those credentials.

## Dashboard write controls

The authenticated admin dashboard has a **MCP Permissions** section at
`/admin/mcp`. Its two independent switches control product writes and buying
guide/editorial writes only. The settings are stored in the private
`admin_secrets/mcp_write_controls` document, not in the publicly readable site
settings document. Dashboard reads and updates use the existing admin-session
authorization; updates additionally require CSRF verification. Each change
saves the actor email and update time.

The local VS Code stdio MCP process reads this private document from the same
configured database for each tool call; changes take effect without restarting
VS Code. If no admin control document exists, MCP retains its existing
environment-derived write scopes for compatibility. If the control document
cannot be read or is malformed, MCP fails closed for tool calls until it can
read valid settings. Each scope remains on its environment-derived default
until that specific scope is explicitly set, so changing one toggle does not
silently change the other. The web app and local stdio process can have separate
environment variables; if the web app has no MCP target configured, the page
shows the saved preference and the MCP process remains authoritative for its
effective scopes. A dashboard switch cannot override
`AQURIVO_MCP_ENABLE_WRITES` or the respective production upper-bound flag
(`AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES` or
`AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES`); the dashboard rejects an
attempt to enable a scope blocked by those gates. These controls do not govern
deletions, categories, site settings, restore operations, or process start/stop.
Deletion remains outside this dashboard and requires its separate explicit
environment gate.

## Extending the server

Add a narrowly scoped typed tool in `mcp/tools.ts`, add its repository adapter
in `mcp/server.ts`, and add tests using fake dependencies. Prefer existing
repositories and validators; do not add arbitrary SQL or generic filesystem
or process-execution tools. For new source-code features, use normal Copilot
workspace operations and the relevant project test/build commands.

## Implemented and not yet verified

Implemented: the stdio server, official TypeScript SDK registration, VS Code
configuration, scoped admin read/write tools, double-gated deletion,
same-origin site checks, read-after-write verification, audit snapshots, and
snapshot restoration.

The automated integration tests verify tool discovery, a real stdio session,
local product/category writes and read-back against a temporary local SQLite
database, and safe fake-repository rollback/site-audit behavior. They do
**not** prove connection to the user's configured Firebase/Turso instance,
live site health, uploaded image handling, admin UI rendering after a change,
production operations, or Vercel deployment. Those require separate setup or
owner approval and have not been run by this implementation.
