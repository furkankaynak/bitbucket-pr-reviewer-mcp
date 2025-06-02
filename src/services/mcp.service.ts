import { z } from 'zod';
import databaseService from './database.js';
import { bitbucketService } from './bitbucket.service.js';
// Config is imported for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { config as _config } from '../config/index.js';

export interface MCPServerOptions {
  name: string;
  version: string;
  description: string;
}

export interface MCPRequest {
  method: string;
  params?: {
    prNumber?: string;
    [key: string]: unknown;
  };
}

export interface MCPResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface FileDiff {
  filePath: string;
  diff: string;
  current: number;
  total: number;
  customPrompt?: string;
}

export class MCPService {
  private readonly options: MCPServerOptions;

  constructor(options: MCPServerOptions) {
    this.options = options;
  }

  /**
   * Handle incoming MCP requests
   */
  public async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      // Validate request
      const schema = z.object({
        method: z.enum(['get_pr_review', 'reset_review']),
        params: z.object({
          prNumber: z.union([z.string(), z.number()]),
          action: z.enum(['start', 'next']).optional(),
        }),
      });

      const validated = schema.safeParse(request);
      if (!validated.success) {
        return this.createErrorResponse(
          'INVALID_REQUEST',
          'Invalid request format',
          validated.error
        );
      }

      const { method, params } = validated.data;
      const prNumber = params?.prNumber?.toString() || '';
      const action = params?.action as 'start' | 'next' | undefined;

      // Route the request to the appropriate handler
      switch (method) {
        case 'get_pr_review':
          if (action === 'start') {
            return await this.startPrReview(prNumber);
          } else {
            return await this.getNextFileDiff(prNumber);
          }
        case 'reset_review':
          return await this.resetReview(prNumber);
        default:
          return this.createErrorResponse('METHOD_NOT_FOUND', `Method '${method}' not found`);
      }
    } catch (error) {
      console.error('Error handling MCP request:', error);
      return this.createErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'An unknown error occurred',
        error
      );
    }
  }

  /**
   * Start a new PR review
   */
  private async startPrReview(prNumber: string): Promise<MCPResponse<FileDiff>> {
    try {
      // Check if review is already in progress
      const isInProgress = await databaseService.isReviewInProgress(prNumber);
      if (isInProgress) {
        return this.createErrorResponse<FileDiff>(
          'REVIEW_IN_PROGRESS',
          'A review is already in progress for this PR'
        );
      }

      // Get changed files from Bitbucket
      const changedFiles = await bitbucketService.getChangedFiles(prNumber);

      // Filter out excluded files
      const filesToReview = bitbucketService.filterExcludedFiles(changedFiles);

      if (filesToReview.length === 0) {
        return this.createErrorResponse<FileDiff>(
          'NO_FILES_TO_REVIEW',
          'No files to review after applying exclude patterns'
        );
      }

      // Start the review - pass the total number of files to review
      await databaseService.startPrReview(prNumber, filesToReview.length);

      // Get the first file diff
      return await this.getNextFileDiff(prNumber);
    } catch (error) {
      console.error('Error starting PR review:', error);
      return this.createErrorResponse<FileDiff>(
        'BITBUCKET_ERROR',
        'Failed to start PR review',
        error
      );
    }
  }

  /**
   * Get the next file diff for review
   */
  private async getNextFileDiff(prNumber: string): Promise<MCPResponse<FileDiff>> {
    try {
      // Get the next file to review
      const nextFile = await databaseService.getNextFile(prNumber);

      if (!nextFile) {
        // No more files to review, mark as complete
        await databaseService.completeReview(prNumber);
        return this.createSuccessResponse<FileDiff>({
          filePath: '',
          diff: '',
          current: 0,
          total: 0,
          customPrompt: 'PR review completed!',
        });
      }

      // Get the file diff from Bitbucket
      const fileDiff = await bitbucketService.getNextFileDiff(
        prNumber,
        nextFile.filePath,
        nextFile.current,
        nextFile.total
      );

      // Mark the file as reviewed
      await databaseService.markFileAsReviewed(prNumber, nextFile.filePath);

      return this.createSuccessResponse<FileDiff>(fileDiff);
    } catch (error) {
      console.error('Error getting next file diff:', error);
      return this.createErrorResponse<FileDiff>(
        'BITBUCKET_ERROR',
        'Failed to get file diff',
        error
      );
    }
  }

  /**
   * Reset a PR review
   */
  private async resetReview(prNumber: string): Promise<MCPResponse<{ success: boolean }>> {
    try {
      await databaseService.resetReview(prNumber);
      return this.createSuccessResponse<{ success: boolean }>({ success: true });
    } catch (error) {
      console.error('Error resetting PR review:', error);
      return this.createErrorResponse<{ success: boolean }>(
        'DATABASE_ERROR',
        'Failed to reset PR review',
        error
      );
    }
  }

  /**
   * Validate the MCP request
   */
  private validateRequest(request: unknown): asserts request is MCPRequest {
    const schema = z.object({
      method: z.enum(['get_pr_review', 'reset_review']),
      params: z.object({
        prNumber: z.union([z.string(), z.number()]).transform(String),
        action: z.enum(['start', 'next']).optional(),
      }),
    });

    const result = schema.safeParse(request);
    if (!result.success) {
      throw new Error(`Invalid request: ${result.error.message}`);
    }
  }

  /**
   * Create a success response
   */
  private createSuccessResponse<T = unknown>(data: T): MCPResponse<T> {
    return {
      success: true,
      data,
    };
  }

  /**
   * Create an error response
   */
  private createErrorResponse<T = unknown>(
    code: string,
    message: string,
    details?: unknown
  ): MCPResponse<T> {
    return {
      success: false,
      data: undefined as unknown as T,
      error: {
        code,
        message,
        details: details instanceof Error ? details.message : details,
      },
    };
  }
}
