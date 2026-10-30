import assert from 'node:assert/strict';
import { NextRequest, NextResponse } from 'next/server';
import { test } from 'node:test';
import type { McpWriteControlDashboardState } from '../server/repositories/mcp-controls.repo';
import { createMcpWriteControlApiHandlers } from '../server/services/mcp-write-control-api';
import type { McpPolicy, McpWriteControls } from '../mcp/policy';

const policy: McpPolicy = {
  target: 'production',
  databaseReady: true,
  canRead: true,
  canWrite: false,
  canWriteProducts: false,
  canWriteEditorial: true,
  canDelete: false,
};

function createRequest(payload: unknown): NextRequest {
  return new NextRequest('https://aqurivo.store/api/admin/mcp-controls', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function createHandlers(
  options: {
    authorized?: boolean;
    csrfValid?: boolean;
    getStateFails?: boolean;
    env?: Record<string, string>;
  } = {}
) {
  let saved: Partial<McpWriteControls> | null = null;
  let savedActor = '';
  let saveCalls = 0;
  const state = (): McpWriteControlDashboardState => ({
    products: saved?.products ?? false,
    editorial: saved?.editorial ?? false,
    explicit: {
      products: saved?.products !== undefined,
      editorial: saved?.editorial !== undefined,
    },
    configured: saved !== null,
    effective: {
      products: saved?.products ?? false,
      editorial: saved?.editorial ?? false,
    },
    allowed: { products: false, editorial: true },
    target: 'production',
    updatedAt: saved ? '2026-10-30T12:00:00.000Z' : null,
    updatedBy: saved ? savedActor : null,
  });
  const handlers = createMcpWriteControlApiHandlers({
    async requireAdminApi() {
      return options.authorized === false
        ? {
            authorized: false as const,
            response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
          }
        : {
            authorized: true as const,
            email: 'admin@example.test',
            session: { email: 'admin@example.test' },
          };
    },
    async verifyCsrfRequest() {
      return options.csrfValid !== false;
    },
    async getState() {
      if (options.getStateFails) throw new Error('Database adapter unavailable.');
      return state();
    },
    async save(controls, actor) {
      saveCalls += 1;
      saved = { ...saved, ...controls };
      savedActor = actor;
    },
    getPolicy: () => policy,
    env: options.env ?? {
      AQURIVO_MCP_ENABLE_WRITES: 'true',
      AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES: 'false',
      AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES: 'true',
    },
  });
  return {
    handlers,
    getSaveCalls: () => saveCalls,
    getSaved: () => saved,
    getSavedActor: () => savedActor,
  };
}

test('MCP controls API requires admin authorization before checking CSRF or saving', async () => {
  const fixture = createHandlers({ authorized: false });
  const response = await fixture.handlers.PATCH(
    createRequest({ products: false, editorial: true })
  );
  assert.equal(response.status, 404);
  assert.equal(fixture.getSaveCalls(), 0);
});

test('MCP controls API rejects invalid CSRF requests without persisting changes', async () => {
  const fixture = createHandlers({ csrfValid: false });
  const response = await fixture.handlers.PATCH(
    createRequest({ products: false, editorial: true })
  );
  assert.equal(response.status, 403);
  assert.equal(fixture.getSaveCalls(), 0);
});

test('MCP controls API logs load failures without exposing internal database errors', async () => {
  const fixture = createHandlers({ getStateFails: true });
  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    const response = await fixture.handlers.GET();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: 'Unable to load MCP write controls.',
    });
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  assert.deepEqual(logged[0], [
    '[admin/mcp-controls] Failed to load MCP write controls.',
    { name: 'Error', message: 'Database adapter unavailable.' },
  ]);
});

test('MCP controls API enforces independent environment caps and records the admin actor', async () => {
  const fixture = createHandlers();
  const blocked = await fixture.handlers.PATCH(
    createRequest({ products: true })
  );
  assert.equal(blocked.status, 409);
  assert.equal(fixture.getSaveCalls(), 0);

  const editorialOnly = await fixture.handlers.PATCH(
    createRequest({ editorial: true })
  );
  assert.equal(editorialOnly.status, 200);
  assert.deepEqual(fixture.getSaved(), { editorial: true });
  assert.equal(fixture.getSavedActor(), 'admin@example.test');
  const payload = (await editorialOnly.json()) as {
    controls: McpWriteControlDashboardState;
  };
  assert.equal(payload.controls.updatedBy, 'admin@example.test');

  const unexpectedScope = await fixture.handlers.PATCH(
    createRequest({ products: false, editorial: false, delete: true })
  );
  assert.equal(unexpectedScope.status, 400);
  assert.equal(fixture.getSaveCalls(), 1);
});

test('MCP control API does not allow enabling writes when the master environment gate is off', async () => {
  const fixture = createHandlers({
    env: {
      AQURIVO_MCP_ENABLE_WRITES: 'false',
      AQURIVO_MCP_ALLOW_PRODUCTION_PRODUCT_WRITES: 'true',
      AQURIVO_MCP_ALLOW_PRODUCTION_EDITORIAL_WRITES: 'true',
    },
  });
  const response = await fixture.handlers.PATCH(
    createRequest({ editorial: true })
  );
  assert.equal(response.status, 409);
  assert.equal(fixture.getSaveCalls(), 0);
});
