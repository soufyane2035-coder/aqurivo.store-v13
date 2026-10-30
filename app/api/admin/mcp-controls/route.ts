import { requireAdminApi, verifyCsrfRequest } from '@/server/middleware/security';
import {
  getMcpWriteControlDashboardState,
  saveMcpWriteControls,
} from '@/server/repositories/mcp-controls.repo';
import { createMcpWriteControlApiHandlers } from '@/server/services/mcp-write-control-api';
import { getMcpPolicy } from '@/mcp/policy';

export const dynamic = 'force-dynamic';

const handlers = createMcpWriteControlApiHandlers({
  requireAdminApi,
  verifyCsrfRequest,
  getState: getMcpWriteControlDashboardState,
  save: saveMcpWriteControls,
  getPolicy: getMcpPolicy,
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
