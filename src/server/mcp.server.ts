import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from '../config/index.js';
import { formatReviewResponse } from '../config/pr-reviev-system-prompt.js';
import { MCPService, type MCPResponse } from '../services/mcp.service.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';

// Define the handler parameter type
interface HandlerParams {
  prNumber: string | number;
}

export class BitbucketPRReviewerServer {
  private server: McpServer;
  private transport: Transport | null = null;

  constructor(private mcpService: MCPService) {
    // Initialize MCP server
    this.server = new McpServer({
      name: 'bitbucket-pr-reviewer',
      version: '1.0.0',
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
    });

    this.setupErrorHandling();
    this.setupTools();
  }
  private isShuttingDown = false;

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      if (!this.isShuttingDown) {
        this.shutdown(1);
      }
    });

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
    });

    // Graceful shutdown
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.on(signal, () => {
        console.log(`Received ${signal}, shutting down...`);
        this.shutdown(0);
      });
    });
  }

  private setupTools(): void {
    // Format PR review response based on the result
    const formatMCPResponse = (result: any) => {
      if (!result.success) {
        return formatReviewResponse({
          error: {
            message: result.error?.message || 'Unknown error',
            details: result.error?.details,
          },
        });
      }

      // If review is completed
      if (result.data?.customPrompt === 'PR review completed!') {
        return formatReviewResponse({ isCompleted: true });
      }

      // If it's a file diff response
      const { filePath, diff, current, total, customPrompt } = result.data;

      if (!filePath || !diff) {
        return formatReviewResponse({});
      }

      return formatReviewResponse({
        filePath,
        diff,
        current,
        total,
        customPrompt,
      });
    };

    // Define the start review tool
    this.server.tool(
      'start_pr_review',
      {
        prNumber: z.union([z.string(), z.number()]),
      },
      async ({ prNumber }, extra) => {
        const result = await this.mcpService.handleRequest({
          method: 'get_pr_review',
          params: {
            prNumber: String(prNumber),
            action: 'start',
          },
        });
        return { content: [{ type: 'text', text: formatMCPResponse(result) }] };
      }
    );

    // Define the next review item tool
    this.server.tool(
      'next_pr_review_item',
      {
        prNumber: z.union([z.string(), z.number()]),
      },
      async ({ prNumber }, extra) => {
        const result = await this.mcpService.handleRequest({
          method: 'get_pr_review',
          params: {
            prNumber: String(prNumber),
            action: 'next',
          },
        });
        return { content: [{ type: 'text', text: formatMCPResponse(result) }] };
      }
    );

    // Define the reset review tool
    this.server.tool(
      'reset_pr_review',
      {
        prNumber: z.union([z.string(), z.number()]),
      },
      async ({ prNumber }, extra) => {
        const result = await this.mcpService.handleRequest({
          method: 'reset_review',
          params: { prNumber: String(prNumber) },
        });
        return { content: [{ type: 'text', text: formatMCPResponse(result) }] };
      }
    );
  }

  public async connect(transport: Transport): Promise<void> {
    this.transport = transport;
    await this.server.connect(transport);
    console.log('MCP Server connected to transport');
  }

  public async stop(): Promise<void> {
    try {
      // Cleanup any resources if needed
      console.log('Stopping MCP server...');
      await this.close();
    } catch (error) {
      console.error('Error stopping MCP server:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.transport) {
      await this.server.close();
      this.transport = null;
    }
  }

  public async shutdown(exitCode = 0): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    try {
      console.log('Shutting down MCP server...');
      await this.stop();
      console.log('MCP server stopped');
      process.exit(exitCode);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

export default BitbucketPRReviewerServer;
