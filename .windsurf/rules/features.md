---
trigger: manual
---

# Bitbucket PR Reviewer MCP Server

## Overview

The Bitbucket PR Reviewer MCP Server is a powerful tool that brings AI-powered code reviews directly into your development workflow. By implementing the Model Context Protocol (MCP), it integrates seamlessly with AI coding assistants like VSCode Copilot, providing contextual code reviews as you work on pull requests in Bitbucket Server.

## Key Features

### 🔄 Seamless Integration

- **Native MCP Support**: Built from the ground up to work with MCP-compatible clients
- **Bitbucket Server Integration**: Direct connection to your Bitbucket repositories
- **IDE Integration**: Works with popular IDEs through MCP clients

### 🚀 Efficient Code Reviews

- **File-by-File Review**: Focus on one file at a time for thorough code review
- **Smart File Navigation**: Automatically navigate through changed files
- **Review State Management**: Never lose your place in large PRs

### ⚙️ Flexible Configuration

- **Custom Exclusions**: Define patterns to exclude files from review
- **Custom Prompts**: Tailor the AI's review focus with custom prompts
- **Multiple Authentication Methods**: Support for tokens and username/password

### 🛠 Developer Experience

- **Lightweight**: Runs as a standalone server with minimal dependencies
- **Self-Contained**: Embedded database requires no external services
- **Detailed Logging**: Comprehensive logs for debugging and monitoring

### 🛡️ Security & Reliability

- **Secure Authentication**: Encrypted credentials and secure token handling
- **Error Handling**: Graceful handling of network issues and API limits
- **State Persistence**: Review progress is maintained across restarts

## How It Works

1. **Start a Review**: Initiate a review by providing a PR number
2. **Receive Diffs**: Get file diffs one at a time through the MCP interface
3. **AI-Powered Feedback**: Use your preferred MCP client to get AI-assisted code reviews
4. **Navigate & Complete**: Move through files until the review is complete

## Use Cases

### For Individual Developers

- Get instant code feedback without leaving your IDE
- Maintain code quality with consistent AI-assisted reviews
- Learn best practices through contextual suggestions

### For Teams

- Standardize code reviews across the team
- Reduce review time with AI-first approach
- Maintain high code quality with automated checks

### For Open Source Projects

- Streamline the contribution process
- Ensure code consistency
- Reduce maintainer workload with automated first-pass reviews

## Getting Started

### Prerequisites

- Node.js 18+
- Access to a Bitbucket Server instance
- MCP-compatible client (e.g., VSCode with Copilot)

### Quick Start

1. Install the package:

   ```bash
   npm install -g bitbucket-pr-reviewer-mcp
   ```

2. Configure your Bitbucket credentials:

   ```bash
   export BITBUCKET_BASE_URL=https://your-bitbucket-server.com
   export BITBUCKET_AUTH_TOKEN=your-access-token
   export BITBUCKET_PROJECT_KEY=YOUR_PROJECT
   export BITBUCKET_REPOSITORY_SLUG=your-repo
   ```

3. Start the server:

   ```bash
   bitbucket-pr-reviewer-mcp
   ```

4. Connect with your MCP client and start reviewing PRs!

## Feature Comparison

| Feature                  | Bitbucket PR Reviewer MCP | Basic Code Review Tools |
| ------------------------ | ------------------------- | ----------------------- |
| MCP Protocol Support     | ✅ Yes                    | ❌ No                   |
| AI Integration           | ✅ Native                 | ❌ Limited/None         |
| IDE Integration          | ✅ Seamless               | ⚠️ Varies               |
| Review State Management  | ✅ Automatic              | ❌ Manual               |
| Custom Prompts           | ✅ Configurable           | ❌ Fixed                |
| Self-Hosted              | ✅ Yes                    | ⚠️ Depends              |
| No External Dependencies | ✅ Yes                    | ⚠️ Varies               |

## Roadmap

### Upcoming Features

- Support for Bitbucket Cloud
- Team collaboration features
- More granular review controls
- Integration with CI/CD pipelines

### Future Possibilities

- Support for other version control systems
- Advanced analytics and metrics
- Custom review templates
- Plugin system for extensibility

## Why Choose Bitbucket PR Reviewer MCP?

- **Developer-First**: Built by developers, for developers
- **Open Standards**: Based on the MCP protocol for maximum compatibility
- **Privacy-Focused**: Your code never leaves your infrastructure
- **Extensible**: Designed to grow with your needs

---

_Bitbucket PR Reviewer MCP Server - Making code reviews smarter, one PR at a time._
