import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { config } from '../config/index.js';
import path from 'path';

export class DatabaseService {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;
  private readonly dbPath: string;

  constructor() {
    // Store database in the project root in development, in-memory for tests
    this.dbPath = process.env.NODE_ENV === 'test' 
      ? ':memory:' 
      : path.join(process.cwd(), 'bitbucket-pr-reviewer.db');
  }

  /**
   * Check if the database is initialized
   */
  public isInitialized(): boolean {
    return this.db !== null;
  }

  public async initialize(): Promise<void> {
    if (this.db) return;
    
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    await this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Enable foreign keys
    await this.db.exec('PRAGMA foreign_keys = ON');

    // Create tables if they don't exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS pr_status (
        pr_number TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
        current_index INTEGER NOT NULL DEFAULT 0,
        total_files INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pr_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pr_number TEXT NOT NULL,
        file_path TEXT NOT NULL,
        reviewed BOOLEAN DEFAULT FALSE,
        review_order INTEGER NOT NULL,
        FOREIGN KEY (pr_number) REFERENCES pr_status(pr_number) ON DELETE CASCADE,
        UNIQUE(pr_number, file_path)
      );
    `);
  }

  // PR Status Methods
  public async startPrReview(prNumber: string, files: Array<{ path: string }>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('BEGIN TRANSACTION');
    
    try {
      // Insert or update PR status
      await this.db.run(
        `INSERT INTO pr_status (pr_number, status, current_index, total_files, updated_at)
         VALUES (?, 'in_progress', 0, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(pr_number) DO UPDATE SET
           status = 'in_progress',
           current_index = 0,
           total_files = excluded.total_files,
           updated_at = CURRENT_TIMESTAMP`,
        [prNumber, files.length]
      );

      // Delete existing files for this PR
      await this.db.run('DELETE FROM pr_files WHERE pr_number = ?', [prNumber]);

      // Insert new files
      const stmt = await this.db.prepare(
        'INSERT INTO pr_files (pr_number, file_path, reviewed, review_order) VALUES (?, ?, 0, ?)'
      );
      
      for (let i = 0; i < files.length; i++) {
        await stmt.run(prNumber, files[i].path, i);
      }
      
      await stmt.finalize();
      await this.db.run('COMMIT');
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  public async getNextFile(prNumber: string): Promise<{ filePath: string; current: number; total: number } | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    interface NextFileResult {
      file_path: string;
      current_index: number;
      total_files: number;
    }
    
    const result = await this.db.get<NextFileResult>(
      `SELECT f.file_path, s.current_index, s.total_files
       FROM pr_status s
       LEFT JOIN pr_files f ON s.pr_number = f.pr_number AND f.review_order = s.current_index
       WHERE s.pr_number = ? AND s.status = 'in_progress' AND (f.reviewed = 0 OR f.reviewed IS NULL)`,
      [prNumber]
    );

    if (!result || !result?.file_path) {
      return null;
    }

    return {
      filePath: result.file_path,
      current: result.current_index + 1,
      total: result.total_files,
    };
  }

  public async markFileAsReviewed(prNumber: string, filePath: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Use a transaction to ensure data consistency
    await this.db.run('BEGIN TRANSACTION');
    try {
      // Mark the file as reviewed
      await this.db.run(
        `UPDATE pr_files SET reviewed = TRUE 
         WHERE pr_number = ? AND file_path = ?`,
        [prNumber, filePath]
      );
      
      // Increment the current index
      await this.db.run(
        `UPDATE pr_status 
         SET current_index = current_index + 1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE pr_number = ?`,
        [prNumber]
      );
      
      await this.db.run('COMMIT');
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  public async completeReview(prNumber: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run(
      `UPDATE pr_status 
       SET status = 'completed', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE pr_number = ?`,
      [prNumber]
    );
  }

  public async resetReview(prNumber: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run('BEGIN TRANSACTION');
    try {
      // Delete all files for this PR
      await this.db.run(
        'DELETE FROM pr_files WHERE pr_number = ?',
        [prNumber]
      );
      
      // Delete the PR status
      await this.db.run(
        'DELETE FROM pr_status WHERE pr_number = ?',
        [prNumber]
      );
      
      await this.db.run('COMMIT');
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  public async isReviewInProgress(prNumber: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    interface CountResult {
      count: number;
    }
    
    const result = await this.db.get<CountResult>(
      `SELECT COUNT(*) as count 
       FROM pr_status 
       WHERE pr_number = ? AND status = 'in_progress'`,
      [prNumber]
    );
    
    return result?.count ? result.count > 0 : false;
  }

  // Close the database connection
  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

// Export a singleton instance
export const databaseService = new DatabaseService();

// Close the database connection when the process exits
process.on('exit', () => {
  databaseService.close();
});
