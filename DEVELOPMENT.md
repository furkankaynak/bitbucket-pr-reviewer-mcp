# Development Guide

This document provides detailed information for developers working on the Bitbucket PR Reviewer MCP Server, a Model Context Protocol (MCP) server that provides automated Pull Request review functionality for Bitbucket repositories.

## Project Overview

The Bitbucket PR Reviewer MCP Server is a TypeScript-based server that implements the Model Context Protocol (MCP) to provide AI-assisted code review capabilities. It integrates with Bitbucket's API to fetch PR details, track review progress, and provide contextual information to AI assistants like Claude through the MCP protocol.

### Key Features

- **MCP Protocol Implementation**: Implements the Model Context Protocol for tool integration
- **Bitbucket Integration**: Connects to Bitbucket's API to fetch PR details and file diffs
- **Review Management**: Tracks review progress with SQLite database
- **File Filtering**: Supports exclude patterns to filter out irrelevant files
- **Environment-based Configuration**: Flexible configuration through environment variables

### Architecture

The server follows a modular architecture with clear separation of concerns:

1. **MCP Server Layer**: Handles MCP protocol communication using `@modelcontextprotocol/sdk`
2. **Service Layer**: Contains business logic for PR review operations
3. **Data Access Layer**: Manages database operations and state persistence
4. **Configuration Layer**: Handles environment variables and application configuration

## Project Structure

```
.
├── src/                          # Source files
│   ├── config/                  # Application configuration
│   │   └── index.ts             # Configuration loader and validator
│   │
│   ├── services/               # Core business logic
│   │   ├── mcp.service.ts       # MCP service implementation
│   │   ├── bitbucket.service.ts # Bitbucket API client
│   │   └── database.service.ts  # Database operations
│   │
│   ├── server/                 # MCP server implementation
│   │   └── mcp.server.ts        # MCP server setup and tool definitions
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts
│   │
│   ├── index.ts               # Application entry point
│   └── utils/                  # Utility functions
│
├── test/                     # Test files
│   ├── integration/           # Integration tests
│   └── unit/                  # Unit tests
│
├── .env.example             # Example environment variables
├── .gitignore                # Git ignore rules
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

### Key Components

1. **MCP Server (`src/server/mcp.server.ts`)**

   - Implements the MCP protocol using `@modelcontextprotocol/sdk`
   - Defines available tools and their schemas using Zod
   - Handles tool execution and response formatting

2. **Services (`src/services/`)**

   - `mcp.service.ts`: Main service that orchestrates PR review flow
   - `bitbucket.service.ts`: Handles Bitbucket API interactions
   - `database.service.ts`: Manages SQLite database operations

3. **Configuration (`src/config/`)**

   - Loads and validates environment variables
   - Provides type-safe configuration access throughout the app

4. **Entry Point (`src/index.ts`)**
   - Initializes all services
   - Sets up MCP server with stdio transport
   - Handles graceful shutdown

## Data Flow

1. **Tool Invocation**:

   - MCP client (e.g., Claude) invokes a tool via stdio
   - MCP server validates and routes the request
   - Appropriate service method is called with parameters

2. **PR Review Flow**:

   - `start_pr_review`: Fetches PR details and initializes review state
   - `next_pr_review_item`: Gets the next file to review
   - `reset_pr_review`: Resets the review state

3. **Data Persistence**:
   - Review progress is tracked in SQLite
   - Each PR gets a record in `pr_status`
   - Files are tracked in `pr_files` with review status

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your Bitbucket credentials

## Running the Server

### Development Mode

```bash
npm run dev
```

This will start the server with auto-reload using `ts-node-dev`.

### Production Build

1. Build the project:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Testing

Run the test suite:

```bash
npm test
```

## MCP Tools Documentation

The server implements the following MCP tools for PR review:

### 1. `start_pr_review`

Starts a new PR review session.

**Parameters:**

- `prNumber` (string | number): The PR number to review

**Example Request:**

```json
{
  "method": "start_pr_review",
  "params": {
    "prNumber": 123
  }
}
```

**Response:**

- Initial PR information
- First file to review (if any)
- Total number of files in the PR

### 2. `next_pr_review_item`

Gets the next item to review in the current PR.

**Parameters:**

- `prNumber` (string | number): The PR number being reviewed

**Example Request:**

```json
{
  "method": "next_pr_review_item",
  "params": {
    "prNumber": 123
  }
}
```

**Response:**

- Next file to review with its content and diff
- Current review progress

### 3. `reset_pr_review`

Resets the review state for a PR.

**Parameters:**

- `prNumber` (string | number): The PR number to reset

**Example Request:**

```json
{
  "method": "reset_pr_review",
  "params": {
    "prNumber": 123
  }
}
```

**Response:**

- Confirmation of reset
- New review state

## Configuration Reference

### Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Bitbucket Configuration
BITBUCKET_BASE_URL=https://api.bitbucket.org/2.0
BITBUCKET_PROJECT_KEY=YOUR_PROJECT_KEY
BITBUCKET_REPOSITORY_SLUG=YOUR_REPO_SLUG

# Authentication (use either token or username/password)
BITBUCKET_AUTH_TOKEN=your_personal_access_token
# BITBUCKET_USERNAME=your_username
# BITBUCKET_PASSWORD=your_app_password

# File Filtering
EXCLUDE_PATTERNS=*.md,*.json,*.lock,yarn.lock,package-lock.json

# Database Configuration
DB_PATH=./pr_reviews.db

# Logging
LOG_LEVEL=info
DEBUG=bitbucket-pr-reviewer:*
```

### Configuration Loading

1. Environment variables are loaded using `dotenv`
2. Configuration is validated using Zod schemas
3. Default values are provided where applicable
4. Configuration is frozen to prevent runtime modifications

## Database Schema

The SQLite database is used to track PR review progress and file status. The schema is automatically created on first run.

### Tables

#### `pr_status`

Tracks the overall status of each PR being reviewed.

```sql
CREATE TABLE pr_status (
  pr_number TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
  current_index INTEGER NOT NULL DEFAULT 0,
  total_files INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `pr_files`

Tracks individual files within each PR and their review status.

```sql
CREATE TABLE pr_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_number TEXT NOT NULL,
  file_path TEXT NOT NULL,
  reviewed BOOLEAN DEFAULT FALSE,
  review_order INTEGER NOT NULL,
  FOREIGN KEY (pr_number) REFERENCES pr_status(pr_number) ON DELETE CASCADE,
  UNIQUE(pr_number, file_path)
);
```

### Indexes

The following indexes are created for better query performance:

```sql
CREATE INDEX idx_pr_files_pr_number ON pr_files(pr_number);
CREATE INDEX idx_pr_files_reviewed ON pr_files(reviewed);
```

## Error Handling

The server implements comprehensive error handling:

1. **Input Validation**:

   - All tool parameters are validated using Zod schemas
   - Invalid parameters result in descriptive error messages

2. **Bitbucket API Errors**:

   - API rate limits are respected with automatic retries
   - Authentication errors are caught and reported clearly
   - Network timeouts are handled gracefully

3. **Database Errors**:

   - Connection errors are handled with automatic reconnection
   - Data integrity is maintained through transactions
   - Concurrent access is handled with appropriate locking

4. **MCP Protocol Errors**:
   - Invalid tool invocations return proper error responses
   - Tool timeouts are handled gracefully
   - Error responses follow MCP protocol specifications

## Development Workflow

### Prerequisites

- Node.js 18+
- npm 9+
- SQLite3

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/bitbucket-pr-reviewer-mcp.git
   cd bitbucket-pr-reviewer-mcp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Development Commands

- `npm run dev`: Start development server with hot-reload
- `npm run build`: Build the TypeScript project
- `npm start`: Start production server
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

### Testing

1. **Unit Tests**

   ```bash
   npm run test:unit
   ```

2. **Integration Tests**

   ```bash
   npm run test:integration
   ```

3. **Test Coverage**
   ```bash
   npm run test:coverage
   ```

### Debugging

1. **Debug Logging**

   ```bash
   DEBUG=bitbucket-pr-reviewer:* npm start
   ```

2. **VS Code Debugging**
   - Use the built-in debugger with the provided launch configuration
   - Set breakpoints in your code and press F5 to start debugging

## Contributing

1. Create a new branch for your feature or bugfix
2. Write tests for your changes
3. Ensure all tests pass
4. Submit a pull request with a clear description of changes

## License

MIT
