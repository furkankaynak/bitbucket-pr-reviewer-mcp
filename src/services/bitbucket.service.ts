import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '../config/index.js';

export interface ChangedFile {
  path: string;
  type: 'MODIFY' | 'ADD' | 'DELETE' | 'RENAME';
}

export interface FileDiff {
  filePath: string;
  diff: string;
  current: number;
  total: number;
  customPrompt: string;
}

export class BitbucketService {
  private client: AxiosInstance;

  constructor() {
    // Create axios instance with base URL and auth
    this.client = axios.create({
      baseURL: `${config.BITBUCKET_BASE_URL}/rest/api/1.0`,
      headers: this.getAuthHeaders(),
    });
  }

  private getAuthHeaders(): Record<string, string> {
    if (config.BITBUCKET_AUTH_TOKEN) {
      return { 'Authorization': `Bearer ${config.BITBUCKET_AUTH_TOKEN}` };
    } else if (config.BITBUCKET_USERNAME && config.BITBUCKET_PASSWORD) {
      const credentials = Buffer.from(
        `${config.BITBUCKET_USERNAME}:${config.BITBUCKET_PASSWORD}`
      ).toString('base64');
      return { 'Authorization': `Basic ${credentials}` };
    }
    
    throw new Error('No authentication method provided. Set either BITBUCKET_AUTH_TOKEN or BITBUCKET_USERNAME and BITBUCKET_PASSWORD');
  }

  /**
   * Get list of changed files in a PR
   */
  public async getChangedFiles(prNumber: string): Promise<ChangedFile[]> {
    try {
      const response = await this.client.get<{ values: Array<{ path: { toString: () => string }; type?: string }> }>(
        `/projects/${config.BITBUCKET_PROJECT_KEY}/repos/${config.BITBUCKET_REPOSITORY_SLUG}/pull-requests/${prNumber}/changes`
      );
      
      if (!response.data || !Array.isArray(response.data.values)) {
        throw new Error('Invalid response from Bitbucket API');
      }

      // Map the response to our ChangedFile interface
      return response.data.values.map((file) => ({
        path: file.path?.toString() || '',
        type: (file.type as 'MODIFY' | 'ADD' | 'DELETE' | 'RENAME') || 'MODIFY',
      }));
    } catch (error) {
      console.error('Error fetching changed files:', error);
      throw new Error(`Failed to fetch changed files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the diff for a specific file in a PR
   */
  public async getFileDiff(prNumber: string, filePath: string): Promise<string> {
    try {
      const response = await this.client.get<string>(
        `/projects/${config.BITBUCKET_PROJECT_KEY}/repos/${config.BITBUCKET_REPOSITORY_SLUG}/pull-requests/${prNumber}/diff/${encodeURIComponent(filePath)}`,
        {
          headers: {
            'Accept': 'text/plain',
            ...this.getAuthHeaders(),
          },
          transformResponse: [(data) => data], // Get raw response
        } as AxiosRequestConfig
      );

      return response.data || '';
    } catch (error) {
      console.error(`Error fetching diff for ${filePath}:`, error);
      throw new Error(`Failed to fetch diff for ${filePath}`);
    }
  }

  /**
   * Filter out files based on exclude patterns from config
   */
  public filterExcludedFiles(files: ChangedFile[]): ChangedFile[] {
    if (!config.EXCLUDE_PATTERNS || config.EXCLUDE_PATTERNS.length === 0) {
      return files;
    }

    const excludePatterns = config.EXCLUDE_PATTERNS.map((pattern: string) => new RegExp(pattern));
    
    return files.filter((file: ChangedFile) => {
      return !excludePatterns.some((pattern: RegExp) => pattern.test(file.path));
    });
  }

  /**
   * Start a new PR review by fetching changed files and filtering them
   */
  public async startPrReview(prNumber: string): Promise<ChangedFile[]> {
    const changedFiles = await this.getChangedFiles(prNumber);
    return this.filterExcludedFiles(changedFiles);
  }

  /**
   * Get the next file diff for review
   */
  public async getNextFileDiff(
    prNumber: string,
    filePath: string,
    current: number,
    total: number
  ): Promise<FileDiff> {
    const diff = await this.getFileDiff(prNumber, filePath);
    
    return {
      filePath,
      diff,
      current,
      total,
      customPrompt: config.CUSTOM_PROMPT,
    };
  }

  /**
   * Submit a comment on a specific line of a file in a PR
   */
  public async submitComment(
    prNumber: string,
    filePath: string,
    line: number,
    content: string
  ): Promise<unknown> {
    try {
      const response = await this.client.post(
        `/projects/${config.BITBUCKET_PROJECT_KEY}/repos/${config.BITBUCKET_REPOSITORY_SLUG}/pull-requests/${prNumber}/comments`,
        {
          text: content,
          anchor: {
            path: filePath,
            line: line,
            lineType: 'CONTEXT',
            fileType: 'TO',
            diffType: 'EFFECTIVE',
          },
        }
      );

      return response.data || {};
    } catch (error) {
      console.error(`Error submitting comment for ${filePath} at line ${line}:`, error);
      throw new Error(`Failed to submit comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const bitbucketService = new BitbucketService();
