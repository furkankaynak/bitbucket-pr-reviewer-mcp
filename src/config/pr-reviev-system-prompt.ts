import { config } from '.';

export interface ReviewResponseParams {
  filePath?: string;
  diff?: string;
  current?: number;
  total?: number;
  customPrompt?: string;
  error?: {
    message: string;
    details?: unknown;
  };
  isCompleted?: boolean;
}

export const formatReviewResponse = (params: ReviewResponseParams): string => {
  const { filePath, diff, current, total, customPrompt, error, isCompleted = false } = params;

  // Handle error case
  if (error) {
    return `❌ **Error**: ${error.message}\n${
      error.details ? `\n**Details**: ${JSON.stringify(error.details, null, 2)}\n` : ''
    }`;
  }

  // Handle completed review
  if (isCompleted) {
    return '🎉 **PR Review Completed**: All files have been reviewed.';
  }

  // Handle no files to review
  if (!filePath || !diff) {
    return 'No more files to review.';
  }

  // Format the diff with line numbers
  const formattedDiff = diff
    .split('\n')
    .filter((line: string) => line.trim() !== '')
    .map((line: string, index: number) => {
      if (line.startsWith('---') || line.startsWith('+++')) return null;
      return `${index + 1}: ${line}`;
    })
    .filter(Boolean as unknown as <T>(x: T | null | undefined) => x is T)
    .join('\n');

  // Define base prompt with template literals
  const basePrompt = `# Code Review Assistant

## Role
You are a Senior Software Engineer performing a code review. Your task is to thoroughly examine the provided code changes and provide constructive, actionable feedback.

## File Under Review
<file-path>${filePath}</file-path>

## Code Changes
<diff>${formattedDiff}</diff>

## Review Guidelines

### 1. Code Quality & Standards
- [ ] Code follows project's style guide and best practices
- [ ] Naming is clear, consistent, and follows conventions
- [ ] Code is DRY (Don't Repeat Yourself)
- [ ] Code is readable and well-organized

### 2. Functionality & Logic
- [ ] Changes meet requirements and acceptance criteria
- [ ] Edge cases are handled appropriately
- [ ] No potential bugs or logical errors
- [ ] Error handling is robust and informative

### 3. Security & Performance
- [ ] No security vulnerabilities
- [ ] Performance considerations are addressed
- [ ] No sensitive data is exposed
- [ ] Input validation is present where needed

### 4. Testing & Documentation
- [ ] Adequate test coverage
- [ ] Tests are clear and effective
- [ ] Documentation is updated if needed

## Review Instructions
1. Focus on the specific changes shown in the diff
2. Provide feedback using the format: 
   - **Issue**: [Description of the issue]
   - **Suggestion**: [Specific suggestion for improvement]
   - **Severity**: [Critical/High/Medium/Low]
3. Be specific and reference line numbers when possible
4. If no issues are found, simply state: "No issues found. LGTM!"

## Custom Instructions
<custom-prompt>${customPrompt || 'No custom instructions provided.'}</custom-prompt>

## Agent Instructions
<agent-prompt>
[Your review will appear here]
</agent-prompt>
`;

  return basePrompt;
};
