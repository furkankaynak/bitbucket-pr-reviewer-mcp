# Testing Guide

This document outlines the testing strategy and instructions for the Bitbucket PR Reviewer MCP Server.

## Test Structure

Tests are organized in the `test/` directory with the following structure:

```
test/
├── integration/    # Integration tests
├── unit/           # Unit tests
└── fixtures/       # Test fixtures and mocks
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```bash
npm run test:integration
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Writing Tests

### Unit Tests

Unit tests should be placed in the `test/unit` directory and follow the naming pattern `*.test.ts`.

Example unit test:

```typescript
describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeAll(async () => {
    dbService = new DatabaseService();
    await dbService.initialize();
  });

  afterAll(async () => {
    await dbService.close();
  });

  it('should start a PR review', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Integration tests should be placed in the `test/integration` directory and follow the naming pattern `*.test.ts`.

Example integration test:

```typescript
describe('MCP API', () => {
  let server: Server;

  beforeAll(async () => {
    // Start the server
    const app = await createApp();
    server = app.listen(0); // Random port
  });

  afterAll(() => {
    server.close();
  });

  it('should respond to health check', async () => {
    const response = await request(server).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
```

## Test Database

Integration tests use a separate in-memory SQLite database. The test database is automatically created and destroyed for each test run.

## Test Coverage

To generate a coverage report:

```bash
npm run test:coverage
```

This will generate a coverage report in the `coverage/` directory.

## Mocking

Use Jest's mocking capabilities to mock external dependencies:

```typescript
// Mock the Bitbucket service
jest.mock('../../src/services/bitbucket.service');
import { bitbucketService } from '../../src/services/bitbucket.service';

describe('MCPService', () => {
  it('should handle Bitbucket API errors', async () => {
    (bitbucketService.getChangedFiles as jest.Mock).mockRejectedValue(new Error('API Error'));
    // Test error handling
  });
});
```

## Continuous Integration

Tests are automatically run on pull requests and merges to the main branch using GitHub Actions. The CI pipeline includes:

- Linting
- Type checking
- Unit tests
- Integration tests
- Coverage reporting

## Debugging Tests

To debug tests, use the following command:

```bash
node --inspect-brk -r ts-node/register node_modules/.bin/jest --runInBand
```

Then open Chrome and navigate to `chrome://inspect` to attach the debugger.
