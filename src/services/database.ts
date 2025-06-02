// In-memory database implementation using Maps

/**
 * Interface defining the database operations that our application needs.
 * Any database implementation must implement this interface.
 */
export interface IDatabase {
  /**
   * Initialize the database connection and setup any required tables
   */
  initialize(): Promise<void>;

  /**
   * Execute a query that doesn't return data (INSERT, UPDATE, DELETE)
   */
  run(query: string, params?: any[]): Promise<void>;

  /**
   * Execute a query and return all rows
   */
  all<T = any>(query: string, params?: any[]): Promise<T[]>;

  /**
   * Execute a query and return the first row
   */
  get<T = any>(query: string, params?: any[]): Promise<T | undefined>;

  /**
   * Execute a query in a transaction
   */
  transaction<T>(callback: () => Promise<T>): Promise<T>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;

  /**
   * Check if a PR review is in progress
   */
  isReviewInProgress(prNumber: string): Promise<boolean>;

  /**
   * Start a new PR review
   */
  startPrReview(prNumber: string, totalFiles: number): Promise<void>;

  /**
   * Get the next file to review for a PR
   */
  getNextFile(
    prNumber: string
  ): Promise<{ filePath: string; diff: string; current: number; total: number } | null>;

  /**
   * Mark a file as reviewed
   */
  markFileAsReviewed(prNumber: string, filePath: string): Promise<void>;

  /**
   * Complete a PR review
   */
  completeReview(prNumber: string): Promise<void>;

  /**
   * Reset a PR review
   */
  resetReview(prNumber: string): Promise<void>;
}

/**
 * In-memory implementation of the IDatabase interface using Maps
 */
export class InMemoryDatabase implements IDatabase {
  private prStatus: Map<
    string,
    {
      status: 'in_progress' | 'completed';
      currentIndex: number;
      totalFiles: number;
      createdAt: Date;
      updatedAt: Date;
    }
  > = new Map();

  private prFiles: Map<
    string,
    {
      prNumber: string;
      filePath: string;
      diff: string;
      reviewed: boolean;
      createdAt: Date;
    }
  > = new Map();

  private reviewedFiles: Map<
    string,
    {
      prNumber: string;
      filePath: string;
      reviewedAt: Date;
    }
  > = new Map();

  private idCounter = 0;

  async initialize(): Promise<void> {
    // No initialization needed for in-memory database
    console.log('Using in-memory database');
  }

  async run(query: string, params: any[] = []): Promise<void> {
    // Parse and handle SQL-like commands
    if (query.startsWith('INSERT INTO pr_status')) {
      const [prNumber, status, totalFiles] = params;
      this.prStatus.set(prNumber, {
        status: status === 'in_progress' ? 'in_progress' : 'completed',
        currentIndex: 0,
        totalFiles: parseInt(totalFiles, 10),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (query.startsWith('UPDATE pr_status')) {
      const [status, currentIndex, totalFiles, prNumber] = params;
      const existing = this.prStatus.get(prNumber);
      if (existing) {
        this.prStatus.set(prNumber, {
          ...existing,
          status: status === 'in_progress' ? 'in_progress' : 'completed',
          currentIndex: parseInt(currentIndex, 10) || existing.currentIndex,
          totalFiles: parseInt(totalFiles, 10) || existing.totalFiles,
          updatedAt: new Date(),
        });
      }
    } else if (query.startsWith('INSERT INTO pr_files')) {
      const [prNumber, filePath, diff, reviewed] = params;
      const id = (++this.idCounter).toString();
      this.prFiles.set(id, {
        prNumber,
        filePath,
        diff,
        reviewed: !!reviewed,
        createdAt: new Date(),
      });
    } else if (query.startsWith('UPDATE pr_files SET reviewed = 1')) {
      const [prNumber, filePath] = params;
      for (const [id, file] of this.prFiles.entries()) {
        if (file.prNumber === prNumber && file.filePath === filePath) {
          this.prFiles.set(id, { ...file, reviewed: true });
          this.reviewedFiles.set(`${prNumber}-${filePath}`, {
            prNumber,
            filePath,
            reviewedAt: new Date(),
          });
          break;
        }
      }
    } else if (query.startsWith('UPDATE pr_files SET reviewed = 0')) {
      const [prNumber] = params;
      for (const [id, file] of this.prFiles.entries()) {
        if (file.prNumber === prNumber) {
          this.prFiles.set(id, { ...file, reviewed: false });
        }
      }
    } else if (query.startsWith('DELETE FROM reviewed_files')) {
      const [prNumber] = params;
      for (const [key, file] of this.reviewedFiles.entries()) {
        if (file.prNumber === prNumber) {
          this.reviewedFiles.delete(key);
        }
      }
    }
  }

  async all<T = any>(query: string, params: any[] = []): Promise<T[]> {
    if (query.startsWith('SELECT * FROM pr_files')) {
      const prNumber = params[0];
      return Array.from(this.prFiles.values())
        .filter((file) => file.prNumber === prNumber && !file.reviewed)
        .map((file) => ({
          ...file,
          id: Array.from(this.prFiles.entries()).find(([_, f]) => f === file)?.[0] || '0',
        })) as unknown as T[];
    } else if (query.startsWith('SELECT * FROM reviewed_files')) {
      const prNumber = params[0];
      return Array.from(this.reviewedFiles.values()).filter(
        (file) => file.prNumber === prNumber
      ) as unknown as T[];
    }
    return [];
  }

  async get<T = any>(query: string, params: any[] = []): Promise<T | undefined> {
    if (query.startsWith('SELECT status FROM pr_status')) {
      const [prNumber] = params;
      const status = this.prStatus.get(prNumber);
      return status ? ({ status: status.status } as unknown as T) : undefined;
    } else if (query.startsWith('SELECT current_index, total_files FROM pr_status')) {
      const [prNumber] = params;
      const status = this.prStatus.get(prNumber);
      return status
        ? ({
            current_index: status.currentIndex,
            total_files: status.totalFiles,
          } as unknown as T)
        : undefined;
    } else if (query.startsWith('SELECT * FROM pr_files')) {
      const [prNumber] = params;
      const file = Array.from(this.prFiles.values()).find(
        (f) => f.prNumber === prNumber && !f.reviewed
      );
      return file
        ? ({
            ...file,
            id: Array.from(this.prFiles.entries()).find(([_, f]) => f === file)?.[0] || '0',
          } as unknown as T)
        : undefined;
    }
    return undefined;
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    // In-memory implementation doesn't need transactions, but we'll run the callback
    return callback();
  }

  async close(): Promise<void> {
    // No cleanup needed for in-memory database
    this.prStatus.clear();
    this.prFiles.clear();
    this.reviewedFiles.clear();
  }

  async isReviewInProgress(prNumber: string): Promise<boolean> {
    const status = this.prStatus.get(prNumber);
    return status?.status === 'in_progress';
  }

  async startPrReview(prNumber: string, totalFiles: number): Promise<void> {
    this.prStatus.set(prNumber, {
      status: 'in_progress',
      currentIndex: 0,
      totalFiles,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async getNextFile(
    prNumber: string
  ): Promise<{ filePath: string; diff: string; current: number; total: number } | null> {
    const status = this.prStatus.get(prNumber);
    if (!status) {
      return null;
    }

    const file = Array.from(this.prFiles.values()).find(
      (f) => f.prNumber === prNumber && !f.reviewed
    );

    if (!file) {
      return null;
    }

    return {
      filePath: file.filePath,
      diff: file.diff,
      current: status.currentIndex + 1,
      total: status.totalFiles,
    };
  }

  async markFileAsReviewed(prNumber: string, filePath: string): Promise<void> {
    const status = this.prStatus.get(prNumber);
    if (!status) {
      throw new Error(`No review in progress for PR ${prNumber}`);
    }

    // Mark the file as reviewed
    for (const [id, file] of this.prFiles.entries()) {
      if (file.prNumber === prNumber && file.filePath === filePath) {
        this.prFiles.set(id, { ...file, reviewed: true });
        this.reviewedFiles.set(`${prNumber}-${filePath}`, {
          prNumber,
          filePath,
          reviewedAt: new Date(),
        });
        break;
      }
    }

    // Update the current index
    this.prStatus.set(prNumber, {
      ...status,
      currentIndex: status.currentIndex + 1,
      updatedAt: new Date(),
    });
  }

  async completeReview(prNumber: string): Promise<void> {
    const status = this.prStatus.get(prNumber);
    if (status) {
      this.prStatus.set(prNumber, {
        ...status,
        status: 'completed',
        updatedAt: new Date(),
      });
    }
  }

  async resetReview(prNumber: string): Promise<void> {
    const status = this.prStatus.get(prNumber);
    if (status) {
      // Reset the PR status
      this.prStatus.set(prNumber, {
        ...status,
        status: 'in_progress',
        currentIndex: 0,
        updatedAt: new Date(),
      });

      // Mark all files as not reviewed
      for (const [id, file] of this.prFiles.entries()) {
        if (file.prNumber === prNumber) {
          this.prFiles.set(id, { ...file, reviewed: false });
        }
      }

      // Clear reviewed files history
      for (const [key, file] of this.reviewedFiles.entries()) {
        if (file.prNumber === prNumber) {
          this.reviewedFiles.delete(key);
        }
      }
    }
  }
}

/**
 * Factory function to create a database instance based on configuration
 */
export function createDatabase(config: {
  type: 'sqlite' | 'duckdb' | 'memory';
  path?: string;
}): IDatabase {
  switch (config.type) {
    case 'memory':
      console.log('Using in-memory database');
      return new InMemoryDatabase();
    case 'sqlite':
      console.warn('SQLite is deprecated, using in-memory database instead');
      return new InMemoryDatabase();
    case 'duckdb':
      console.warn('DuckDB is not supported, using in-memory database instead');
      return new InMemoryDatabase();
    default:
      console.warn(`Unsupported database type: ${(config as any).type}, using in-memory database`);
      return new InMemoryDatabase();
  }
}

// Default export for backward compatibility
const defaultDatabase = createDatabase({ type: 'memory' });
export default defaultDatabase;
