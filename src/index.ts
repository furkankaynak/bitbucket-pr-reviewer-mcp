#!/usr/bin/env node

import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPService } from './services/mcp.service.js';
import { BitbucketPRReviewerServer } from './server/mcp.server.js';
import databaseService from './services/database.js';

async function main() {
  try {
    console.log('Starting Bitbucket PR Reviewer MCP Server...');

    // Initialize database first
    try {
      console.log('Initializing database...');
      await databaseService.initialize();
      console.log('Database initialized successfully');
    } catch (dbError) {
      console.error('Failed to initialize database:', dbError);
      process.exit(1);
    }

    // Initialize services
    const mcpService = new MCPService({
      name: 'bitbucket-pr-reviewer',
      version: '1.0.0',
      description: 'MCP Server for Bitbucket PR Reviewer',
    });

    // Initialize MCP server
    console.log('Initializing MCP server...');
    const mcpServer = new BitbucketPRReviewerServer(mcpService);

    // Set up stdio transport and connect the server to it
    try {
      console.log('Setting up transport...');
      const transport = new StdioServerTransport();
      await mcpServer.connect(transport);
      console.log('Transport connected successfully');
    } catch (transportError) {
      console.error('Failed to set up transport:', transportError);
      process.exit(1);
    }

    console.log('Bitbucket PR Reviewer MCP Server is running on stdio');

    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    console.error('Fatal error in main():', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
