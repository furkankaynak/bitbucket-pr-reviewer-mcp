# Bitbucket PR Reviewer MCP Server

A Model Context Protocol (MCP) Server that provides automated Pull Request review functionality for Bitbucket repositories. This server integrates with Bitbucket's API to fetch PR details, file diffs, and manage the review process using the Model Context Protocol (MCP) over stdio transport.

## Features

- Fetches changed files from Bitbucket PRs
- Supports file filtering with exclude patterns
- Tracks review progress with SQLite database
- Implements MCP protocol for tool integration
- Supports both Personal Access Tokens and Username/Password authentication
- Runs as a standalone process with stdio communication

## Prerequisites

- Node.js 16.x or later
- npm 7.x or later
- Bitbucket account with appropriate repository access

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/bitbucket-pr-reviewer-mcp.git
   cd bitbucket-pr-reviewer-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file and update with your configuration:
   ```bash
   cp .env.example .env
   ```

## Configuration

Update the `.env` file with your Bitbucket credentials and repository details:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Bitbucket Configuration
BITBUCKET_BASE_URL=https://api.bitbucket.org/2.0
BITBUCKET_PROJECT_KEY=YOUR_PROJECT_KEY
BITBUCKET_REPOSITORY_SLUG=YOUR_REPO_SLUG

# Authentication (use either token or username/password)
BITBUCKET_AUTH_TOKEN=your_personal_access_token
# BITBUCKET_USERNAME=your_username
# BITBUCKET_PASSWORD=your_app_password

# Optional: Exclude files matching these patterns (comma-separated)
EXCLUDE_PATTERNS=*.md,*.json,*.lock,yarn.lock,package-lock.json

# Optional: Custom prompt for the AI reviewer
CUSTOM_PROMPT=Please review this code change for potential issues, bugs, and improvements.
```

## Development

To run the server in development mode with auto-reload:

```bash
npm run dev
```

## Building for Production

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Integration with MCP Clients

This MCP server communicates over stdio, making it compatible with any MCP client that supports the stdio transport protocol.

### Available Tools

The server provides the following MCP tools:

1. **start_pr_review**
   - Description: Start a new PR review
   - Parameters: `{ prNumber: string | number }`
   - Example:
     ```json
     {
       "method": "start_pr_review",
       "params": { "prNumber": 123 }
     }
     ```

2. **next_pr_review_item**
   - Description: Get the next item in the PR review
   - Parameters: `{ prNumber: string | number }`
   - Example:
     ```json
     {
       "method": "next_pr_review_item",
       "params": { "prNumber": 123 }
     }
     ```

3. **reset_pr_review**
   - Description: Reset the PR review state
   - Parameters: `{ prNumber: string | number }`
   - Example:
     ```json
     {
       "method": "reset_pr_review",
       "params": { "prNumber": 123 }
     }
     ```

## Running the Server

1. Build the project:
   ```bash
   npm run build
   ```

2. Run the server:
   ```bash
   node dist/index.js
   ```

The server will start and listen for MCP protocol messages on stdio. It's designed to be run as a child process by an MCP client.

## Development

To run the server in development mode with auto-reload:

```bash
npm run dev
```

This will start the server with `ts-node` and `ts-node-dev` for automatic reloading when files change.

## Debugging

To enable debug logging, set the `DEBUG` environment variable:

```bash
DEBUG=bitbucket-pr-reviewer:* npm start
```

## Integration with VSCode Copilot Agent

To use this MCP server with VSCode Copilot Agent, follow these steps:

1. Install the [Copilot Agent](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-agent) extension in VSCode if you haven't already.

2. Add the following configuration to your VSCode `settings.json` (File > Preferences > Settings, then click the "Open Settings (JSON)" icon in the top-right corner):

```json
{
  "copilot.agent.customMCP": {
    "bitbucket-pr-reviewer": {
      "name": "Bitbucket PR Reviewer",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "cwd": "${workspaceFolder}",
      "enabled": true
    }
  }
}
```

3. If your MCP server requires environment variables, you can add them using the `env` property:

```json
{
  "copilot.agent.customMCP": {
    "bitbucket-pr-reviewer": {
      "name": "Bitbucket PR Reviewer",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "cwd": "${workspaceFolder}",
      "env": {
        "BITBUCKET_AUTH_TOKEN": "your_token_here",
        "BITBUCKET_PROJECT_KEY": "YOUR_PROJECT_KEY",
        "BITBUCKET_REPOSITORY_SLUG": "YOUR_REPO_SLUG"
      },
      "enabled": true
    }
  }
}
```

4. Restart VSCode for the changes to take effect.

5. After restarting, you should see the Bitbucket PR Reviewer tools available in the Copilot Agent panel when you open a PR or use the command palette (Ctrl+Shift+P) and search for "Copilot Agent: Show MCP Tools".

## Configuration

The server can be configured using environment variables. Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
NODE_ENV=development

# Bitbucket Configuration
BITBUCKET_BASE_URL=https://api.bitbucket.org/2.0
BITBUCKET_PROJECT_KEY=YOUR_PROJECT_KEY
BITBUCKET_REPOSITORY_SLUG=YOUR_REPO_SLUG

# Authentication (use either token or username/password)
BITBUCKET_AUTH_TOKEN=your_personal_access_token
# BITBUCKET_USERNAME=your_username
# BITBUCKET_PASSWORD=your_app_password

# Optional: Exclude files matching these patterns (comma-separated)
EXCLUDE_PATTERNS=*.md,*.json,*.lock,yarn.lock,package-lock.json
```

## Project Structure

```
src/
├── config/           # Configuration and environment variables
├── services/         # Core services
│   ├── bitbucket.service.ts  # Bitbucket API client
│   ├── database.service.ts   # Database operations
│   └── mcp.service.ts        # MCP protocol implementation
├── server.ts         # Express server setup
└── index.ts          # Application entry point
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Node environment | development |
| BITBUCKET_BASE_URL | Bitbucket API base URL | https://api.bitbucket.org/2.0 |
| BITBUCKET_PROJECT_KEY | Bitbucket project key | - |
| BITBUCKET_REPOSITORY_SLUG | Repository slug | - |
| BITBUCKET_AUTH_TOKEN | Personal access token | - |
| BITBUCKET_USERNAME | Bitbucket username | - |
| BITBUCKET_PASSWORD | App password | - |
| EXCLUDE_PATTERNS | Comma-separated file patterns to exclude | - |
| CUSTOM_PROMPT | Custom prompt for AI reviewer | - |

## License

MIT


## License

ISC
