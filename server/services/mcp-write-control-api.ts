import { NextResponse, type NextRequest } from 'next/server';
import type { McpWriteControls, McpPolicy } from '@/mcp/policy';
import {
  getMcpWriteLimits,
} from '@/mcp/policy';
import type { McpWriteControlDashboardState } from '@/server/repositories/mcp-controls.repo';

type AdminGuard =
  | { authorized: true; session: { email: string }; email: string }
  | { authorized: false; response: NextResponse };

export interface McpWriteControlApiDependencies {
  requireAdminApi: () => Promise<AdminGuard>;
  verifyCsrfRequest: (request: NextRequest) => Promise<boolean>;
  getState: () => Promise<McpWriteControlDashboardState>;
  save: (controls: Partial<McpWriteControls>, actor: string) => Promise<unknown>;
  getPolicy: () => McpPolicy;
  env?: Readonly<Record<string, string | undefined>>;
}

function isControlPayload(value: unknown): value is McpWriteControls {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    keys.length > 0 &&
    keys.every((key) => key === 'editorial' || key === 'products') &&
    keys.every((key) => typeof record[key] === 'boolean')
  );
}

export function createMcpWriteControlApiHandlers(
  dependencies: McpWriteControlApiDependencies
) {
  return {
    async GET() {
      const guard = await dependencies.requireAdminApi();
      if (!guard.authorized) return guard.response;
      try {
        return NextResponse.json(
          { controls: await dependencies.getState() },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      } catch (error) {
        console.error(
          '[admin/mcp-controls] Failed to load MCP write controls.',
          error instanceof Error ? { name: error.name, message: error.message } : error
        );
        return NextResponse.json(
          { error: 'Unable to load MCP write controls.' },
          { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }
    },

    async PATCH(request: NextRequest) {
      const guard = await dependencies.requireAdminApi();
      if (!guard.authorized) return guard.response;

      if (!(await dependencies.verifyCsrfRequest(request))) {
        return NextResponse.json({ error: 'Invalid security token.' }, { status: 403 });
      }

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
      }
      if (!isControlPayload(payload)) {
        return NextResponse.json(
          { error: 'Only the product and editorial write toggles can be updated.' },
          { status: 400 }
        );
      }

      const allowed = getMcpWriteLimits(
        dependencies.getPolicy(),
        dependencies.env ?? process.env
      );
      if (payload.products && !allowed.products) {
        return NextResponse.json(
          {
            error:
              'Product writes are blocked by the MCP environment policy. Review the required write and production environment gates before enabling them.',
          },
          { status: 409 }
        );
      }
      if (payload.editorial && !allowed.editorial) {
        return NextResponse.json(
          {
            error:
              'Editorial writes are blocked by the MCP environment policy. Review the required write and production environment gates before enabling them.',
          },
          { status: 409 }
        );
      }

      try {
        await dependencies.save(payload, guard.session.email);
        return NextResponse.json(
          { controls: await dependencies.getState() },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      } catch (error) {
        console.error(
          '[admin/mcp-controls] Failed to save MCP write controls.',
          error instanceof Error ? { name: error.name, message: error.message } : error
        );
        return NextResponse.json(
          { error: 'Unable to save MCP write controls.' },
          { status: 503 }
        );
      }
    },
  };
}
