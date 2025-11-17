import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import {
  CallToolResultSchema,
  CompatibilityCallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger.js';
import { settings } from './config.js';
import { getLocation } from './locationService.js';

const mcpClient: Record<string, Client | null> = {};
let initPromise: Promise<Client> | null = null;

const mcpUrl = `${settings.GETGATHER_URL}/mcp-books/`;
Logger.info('mcpUrl', { mcpUrl });
async function initializeMcpClient(
  sessionId: string,
  ipAddress: string
): Promise<Client> {
  if (mcpClient[sessionId]) return mcpClient[sessionId];
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const client = new Client(
      { name: 'page-turner-server', version: '1.0.0' },
      { capabilities: {} }
    );

    const location = await getLocation(ipAddress);

    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${settings.GETGATHER_APP_KEY}_${sessionId}`,
          'x-getgather-custom-app': 'page-turner',
          'x-location': location ? JSON.stringify(location) : '',
          'x-incognito': '1',
        },
      },
    });

    await client.connect(transport);
    mcpClient[sessionId] = client;
    return client;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

function getMcpClient(sessionId: string): Client {
  if (!mcpClient[sessionId]) {
    Logger.warn(
      'MCP client not initialized. Call initializeMcpClient() first.',
      {
        sessionId,
        error: new Error(
          'MCP client not initialized. Call initializeMcpClient() first.'
        ),
      }
    );
    throw new Error(
      'MCP client not initialized. Call initializeMcpClient() first.'
    );
  }
  return mcpClient[sessionId];
}

async function resetAndReinitializeMcpClient(
  sessionId: string,
  ipAddress: string
): Promise<Client> {
  try {
    if (mcpClient[sessionId]) {
      await mcpClient[sessionId].close().catch(() => {});
    }
  } finally {
    mcpClient[sessionId] = null;
  }
  return initializeMcpClient(sessionId, ipAddress);
}

export async function callToolWithReconnect(
  params: {
    name: string;
    arguments?: Record<string, unknown>;
    sessionId: string;
    ipAddress: string;
  },
  resultSchema?:
    | typeof CallToolResultSchema
    | typeof CompatibilityCallToolResultSchema,
  options?: RequestOptions
) {
  Logger.info('Calling tool:', {
    name: params.name,
    sessionId: params.sessionId,
  });
  try {
    const client = getMcpClient(params.sessionId);
    return await client.callTool(params, resultSchema, options);
  } catch (err) {
    Logger.warn('callTool failed, attempting MCP client reconnect...', {
      name: params.name,
      sessionId: params.sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    await resetAndReinitializeMcpClient(params.sessionId, params.ipAddress);
    const client = getMcpClient(params.sessionId);
    return await client.callTool(params, resultSchema, options);
  }
}
