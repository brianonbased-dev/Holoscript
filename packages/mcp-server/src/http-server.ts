#!/usr/bin/env node
/**
 * HoloScript MCP Server - Streamable HTTP Transport
 *
 * Production HTTP transport for HoloScript language tooling.
 * Enables remote AI agents to parse, validate, and generate HoloScript code.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import http from 'http';
import { tools } from './tools';
import { handleTool } from './handlers';
import { PluginManager } from './PluginManager';

const PORT = parseInt(process.env.PORT || '3000', 10);
const MCP_API_KEY = process.env.MCP_API_KEY || '';
const SERVICE_NAME = 'holoscript-mcp';
const SERVICE_VERSION = '3.0.0';

// Store active transports by session ID
const transports = new Map<string, StreamableHTTPServerTransport>();

/**
 * Check authentication
 */
function checkAuth(req: http.IncomingMessage): boolean {
  if (!MCP_API_KEY) return true;
  const auth = req.headers['authorization'] || '';
  const key = req.headers['x-api-key'] || '';
  return auth === `Bearer ${MCP_API_KEY}` || key === MCP_API_KEY;
}

/**
 * Create MCP server instance
 */
function createMcpServer(): Server {
  const server = new Server(
    {
      name: SERVICE_NAME,
      version: SERVICE_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [...tools, ...PluginManager.getTools()],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      // Check plugins first (for proprietary tools like uaa2_)
      const pluginResult = await PluginManager.handleTool(name, args || {});
      if (pluginResult !== null) {
        return {
          content: [{ type: 'text', text: JSON.stringify(pluginResult, null, 2) }],
        };
      }

      const result = await handleTool(name, args || {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[MCP] Tool error: ${name}`, message);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * HTTP server
 */
const httpServer = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-key, Mcp-Session-Id'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url?.split('?')[0];

  // Health check (unauthenticated for Railway)
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        uptime: process.uptime(),
        sessions: transports.size,
        tools: tools.length + PluginManager.getTools().length,
      })
    );
    return;
  }

  // MCP Streamable HTTP endpoint
  if (url === '/mcp') {
    // Check authentication
    if (!checkAuth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized - API key required' }));
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // POST without session ID = new session initialization
    if (req.method === 'POST' && !sessionId && isInitializeRequest) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const server = createMcpServer();
      await server.connect(transport);

      const sid = transport.sessionId!;
      transports.set(sid, transport);

      // Cleanup on close
      transport.onclose = () => {
        transports.delete(sid);
        console.log(`[MCP] Session closed: ${sid}`);
      };

      console.log(`[MCP] New session: ${sid}`);
      await transport.handleRequest(req, res);
      return;
    }

    // Requests with session ID = existing session
    if (sessionId) {
      const transport = transports.get(sessionId);
      if (transport) {
        await transport.handleRequest(req, res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found', sessionId }));
      return;
    }

    // Invalid request
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Bad Request - Missing Mcp-Session-Id header or invalid initialization',
      })
    );
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ${SERVICE_NAME} v${SERVICE_VERSION}`);
  console.log(`   Transport: Streamable HTTP (MCP spec 2025-03-26)`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Auth: ${MCP_API_KEY ? 'API key required' : 'OPEN (dev mode)'}`);
  console.log(`   Tools: ${tools.length} core + ${PluginManager.getTools().length} plugins`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /health - Health check (public)`);
  console.log(`     POST /mcp    - MCP Streamable HTTP (authenticated)`);
  console.log(`     GET  /mcp    - MCP session messages (authenticated)`);
  console.log(`     DELETE /mcp  - Close session (authenticated)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
