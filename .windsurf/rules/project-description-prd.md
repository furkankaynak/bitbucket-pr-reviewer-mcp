---
trigger: manual
---

# MCP Server for Bitbucket PR Review — Requirements Document

---

## 1. Overview

The MCP Server is designed to facilitate automated Pull Request (PR) reviews by interacting with Bitbucket Server APIs. It will serve PR diffs file-by-file upon request from an MCP Client (e.g., VSCode Copilot Agent), managing state and context internally using an embedded database.

---

## 2. Configuration

```json
{
  "bitbucket": {
    "baseUrl": "https://bitbucket.company.com",
    "projectKey": "MYPROJ",
    "repositorySlug": "my-repo",
    "auth": {
      "token": "your-personal-access-token",
      "username": "your-username",
      "password": "your-password"
    },
    "excludePatterns": [
      "\\.md$",
      "^docs/"
    ],
    "customPrompt": "Please review the following diff for technical quality and best practices."
  }
}
````

* Either `token` or `username` + `password` must be provided.
* `excludePatterns` is an array of regex strings; matching file paths will be excluded from review.
* `customPrompt` is a string appended to the system prompt for PR review, customizable by the client.

---

## 3. Bitbucket API Usage and Data Flow

### API Endpoints

* **List Changed Files in PR**
  `GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/changes`

* **Get File Diff**
  `GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff/{path}`

### Workflow

1. Extract PR number from client prompt (e.g., `pr review for #12345` → `12345`).
2. Check embedded DB for existing file list for PR.
3. If not present, call *List Changed Files* API to get all changed files.
4. Filter files using `excludePatterns` from config.
5. Store filtered list in embedded DB along with current index (initially 0).
6. On each client request for PR review:

   * Retrieve the next file path from DB based on current index.
   * Call *Get File Diff* API for the specific file.
   * Return the diff to the client appended with `customPrompt`.
   * Update index in DB.
7. When all files are reviewed, return a "PR review completed" message.

---

## 4. Embedded Database Schema (SQLite or Equivalent)

| Table Name  | Columns                   | Description                          |
| ----------- | ------------------------- | ------------------------------------ |
| `pr_files`  | `pr_number` (string)      | Pull Request number                  |
|             | `file_path` (string)      | Changed file path                    |
| `pr_status` | `pr_number` (string)      | Pull Request number                  |
|             | `current_index` (integer) | Tracks the current file index for PR |

---

## 5. Authentication

* Support Personal Access Tokens or Username/Password Basic Auth.
* Credentials loaded from config and used in API HTTP headers.
* Secure storage and access recommended.

---

## 6. Client Interaction

* MCP Client sends prompt with PR number.
* MCP Server responds with file diffs sequentially.
* Support for client-defined exclude patterns and custom prompt via config.
* State persistence across sessions.

---

## 7. Error Handling

* Handle Bitbucket API errors (rate limiting, authentication failures).
* Graceful fallback and meaningful error messages to clients.
* Logging for audit and debugging.

---

## 8. Security Considerations

* Securely store and handle authentication tokens.
* Limit access scope of tokens to read-only repository data.
* Validate all incoming requests.