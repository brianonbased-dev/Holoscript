/**
 * ParallelParser - Parallel file parsing using worker threads
 *
 * Features:
 * - Multi-threaded parsing with configurable pool size
 * - File dependency resolution
 * - Progress tracking and cancellation
 * - Graceful fallback to sequential parsing
 * - Memory-bounded operation
 *
 * @version 1.0.0
 */

import { cpus } from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { WorkerPool, createWorkerPool, WorkerPoolStats } from './WorkerPool';
import { HoloScriptPlusParser } from './HoloScriptPlusParser';
import type { HSPlusParserOptions, ASTProgram } from '../types/AdvancedTypeSystem';
import type { ParseTaskData, ParseTaskResult } from './ParseWorker';

export interface FileInput {
  /** File path (used for error reporting and dependency resolution) */
  path: string;
  /** Source code content */
  content: string;
}

export interface ParallelParseResult {
  /** Individual file results */
  results: Map<string, ParseTaskResult>;
  /** Total parse time in ms */
  totalTime: number;
  /** Number of successful parses */
  successCount: number;
  /** Number of failed parses */
  failCount: number;
  /** Whether all files parsed successfully */
  success: boolean;
  /** Merged symbol table */
  symbolTable: Map<string, SymbolInfo>;
  /** File dependency graph */
  dependencyGraph: Map<string, string[]>;
}

export interface SymbolInfo {
  name: string;
  type: 'orb' | 'template' | 'composition' | 'function' | 'variable' | 'export';
  sourceFile: string;
  line?: number;
  column?: number;
}

export interface ParallelParserOptions {
  /** Number of worker threads (defaults to CPU cores) */
  workerCount?: number;
  /** Parser options passed to workers */
  parserOptions?: HSPlusParserOptions;
  /** Maximum files to parse in parallel per batch */
  batchSize?: number;
  /** Enable progress events */
  enableProgress?: boolean;
  /** Fall back to sequential parsing if workers unavailable */
  fallbackToSequential?: boolean;
  /** Debug logging */
  debug?: boolean;
}

export interface ParseProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  percentage: number;
}

/**
 * ParallelParser coordinates multi-threaded file parsing
 */
export class ParallelParser extends EventEmitter {
  private workerPool: WorkerPool | null = null;
  private options: Required<ParallelParserOptions>;
  private workerPath: string;
  private isInitialized: boolean = false;
  private fallbackParser: HoloScriptPlusParser | null = null;

  constructor(options: ParallelParserOptions = {}) {
    super();

    this.options = {
      workerCount: options.workerCount ?? cpus().length,
      parserOptions: options.parserOptions ?? {},
      batchSize: options.batchSize ?? 50,
      enableProgress: options.enableProgress ?? true,
      fallbackToSequential: options.fallbackToSequential ?? true,
      debug: options.debug ?? false,
    };

    // Worker script path - adjust based on build output
    this.workerPath = path.join(__dirname, 'ParseWorker.js');
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      this.workerPool = createWorkerPool(this.workerPath, {
        poolSize: this.options.workerCount,
        debug: this.options.debug,
      });

      await this.workerPool.initialize();
      this.isInitialized = true;
      this.log(`Initialized with ${this.options.workerCount} workers`);
      return true;
    } catch (error: any) {
      this.log(`Failed to initialize workers: ${error.message}`);

      if (this.options.fallbackToSequential) {
        this.log('Falling back to sequential parsing');
        this.fallbackParser = new HoloScriptPlusParser(this.options.parserOptions);
        return true;
      }

      throw error;
    }
  }

  /**
   * Parse multiple files in parallel
   */
  async parseFiles(files: FileInput[]): Promise<ParallelParseResult> {
    const startTime = Date.now();

    // Ensure initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Sort files by size (largest first for better load balancing)
    const sortedFiles = [...files].sort((a, b) =>
      b.content.length - a.content.length
    );

    // Use fallback if no worker pool
    if (!this.workerPool && this.fallbackParser) {
      return this.parseSequential(sortedFiles, startTime);
    }

    // Parse in parallel batches
    const results = new Map<string, ParseTaskResult>();
    const symbolTable = new Map<string, SymbolInfo>();
    const dependencyGraph = new Map<string, string[]>();

    let successCount = 0;
    let failCount = 0;

    // Process in batches
    for (let i = 0; i < sortedFiles.length; i += this.options.batchSize) {
      const batch = sortedFiles.slice(i, i + this.options.batchSize);
      const batchResults = await this.parseBatch(batch);

      for (const result of batchResults) {
        results.set(result.filePath, result);

        if (result.success) {
          successCount++;

          // Build symbol table
          for (const exportName of result.exports) {
            symbolTable.set(exportName, {
              name: exportName,
              type: 'export',
              sourceFile: result.filePath,
            });
          }

          // Build dependency graph
          const dependencies = result.imports.map(imp => imp.path);
          dependencyGraph.set(result.filePath, dependencies);
        } else {
          failCount++;
        }

        // Emit progress
        if (this.options.enableProgress) {
          this.emitProgress({
            total: sortedFiles.length,
            completed: successCount + failCount,
            failed: failCount,
            currentFile: result.filePath,
            percentage: ((successCount + failCount) / sortedFiles.length) * 100,
          });
        }
      }
    }

    // Resolve cross-file references
    this.resolveReferences(results, symbolTable);

    return {
      results,
      totalTime: Date.now() - startTime,
      successCount,
      failCount,
      success: failCount === 0,
      symbolTable,
      dependencyGraph,
    };
  }

  /**
   * Parse a single file (uses worker if available)
   */
  async parseFile(file: FileInput): Promise<ParseTaskResult> {
    const results = await this.parseFiles([file]);
    return results.results.get(file.path)!;
  }

  /**
   * Get worker pool statistics
   */
  getStats(): WorkerPoolStats | null {
    return this.workerPool?.getStats() ?? null;
  }

  /**
   * Shutdown the parser and worker pool
   */
  async shutdown(): Promise<void> {
    if (this.workerPool) {
      await this.workerPool.shutdown();
      this.workerPool = null;
    }
    this.isInitialized = false;
    this.log('Parser shutdown complete');
  }

  /**
   * Parse a batch of files in parallel
   */
  private async parseBatch(files: FileInput[]): Promise<ParseTaskResult[]> {
    if (!this.workerPool) {
      throw new Error('Worker pool not initialized');
    }

    const tasks: ParseTaskData[] = files.map((file, index) => ({
      fileId: `file_${index}_${Date.now()}`,
      filePath: file.path,
      source: file.content,
      options: this.options.parserOptions,
    }));

    try {
      const results = await this.workerPool.executeAll<ParseTaskData, ParseTaskResult>(
        'parse',
        tasks
      );
      return results;
    } catch (error: any) {
      this.log(`Batch parse error: ${error.message}`);

      // Return error results for all files in batch
      return tasks.map(task => ({
        fileId: task.fileId,
        filePath: task.filePath,
        ast: null,
        success: false,
        errors: [{
          message: error.message,
          line: 0,
          column: 0,
          code: 'WORKER_ERROR',
        }],
        warnings: [],
        exports: [],
        imports: [],
        parseTime: 0,
      }));
    }
  }

  /**
   * Sequential fallback parsing
   */
  private parseSequential(
    files: FileInput[],
    startTime: number
  ): ParallelParseResult {
    const results = new Map<string, ParseTaskResult>();
    const symbolTable = new Map<string, SymbolInfo>();
    const dependencyGraph = new Map<string, string[]>();

    let successCount = 0;
    let failCount = 0;

    const parser = this.fallbackParser!;

    for (const file of files) {
      const fileStartTime = Date.now();

      try {
        const parseResult = parser.parse(file.content);

        const result: ParseTaskResult = {
          fileId: `file_${Date.now()}`,
          filePath: file.path,
          ast: parseResult.ast,
          success: parseResult.success,
          errors: parseResult.errors || [],
          warnings: parseResult.warnings || [],
          exports: this.extractExports(parseResult.ast),
          imports: this.extractImports(parseResult.ast),
          parseTime: Date.now() - fileStartTime,
        };

        results.set(file.path, result);

        if (result.success) {
          successCount++;

          for (const exportName of result.exports) {
            symbolTable.set(exportName, {
              name: exportName,
              type: 'export',
              sourceFile: file.path,
            });
          }

          const dependencies = result.imports.map(imp => imp.path);
          dependencyGraph.set(file.path, dependencies);
        } else {
          failCount++;
        }

        if (this.options.enableProgress) {
          this.emitProgress({
            total: files.length,
            completed: successCount + failCount,
            failed: failCount,
            currentFile: file.path,
            percentage: ((successCount + failCount) / files.length) * 100,
          });
        }
      } catch (error: any) {
        failCount++;
        results.set(file.path, {
          fileId: `file_${Date.now()}`,
          filePath: file.path,
          ast: null,
          success: false,
          errors: [{
            message: error.message,
            line: 0,
            column: 0,
            code: 'PARSE_CRASH',
          }],
          warnings: [],
          exports: [],
          imports: [],
          parseTime: Date.now() - fileStartTime,
        });
      }
    }

    return {
      results,
      totalTime: Date.now() - startTime,
      successCount,
      failCount,
      success: failCount === 0,
      symbolTable,
      dependencyGraph,
    };
  }

  /**
   * Resolve cross-file symbol references
   */
  private resolveReferences(
    results: Map<string, ParseTaskResult>,
    symbolTable: Map<string, SymbolInfo>
  ): void {
    for (const [filePath, result] of results) {
      if (!result.success || !result.ast) continue;

      // Check that imported symbols exist
      for (const importInfo of result.imports) {
        for (const symbol of importInfo.symbols) {
          if (!symbolTable.has(symbol)) {
            result.warnings.push({
              message: `Unresolved import: '${symbol}' from '${importInfo.path}'`,
              line: 0,
              column: 0,
              code: 'UNRESOLVED_IMPORT',
            } as any);
          }
        }
      }
    }
  }

  /**
   * Extract exports from AST
   */
  private extractExports(ast: any): string[] {
    const exports: string[] = [];

    if (!ast) return exports;

    const root = ast.root || ast;
    const children = root.body || root.children || [];

    for (const node of children) {
      if (node.type === 'export') {
        if (node.exports) exports.push(...node.exports);
        if (node.declaration?.name) exports.push(node.declaration.name);
      }
      if (node.name && ['orb', 'template', 'composition'].includes(node.type)) {
        exports.push(node.name);
      }
    }

    return exports;
  }

  /**
   * Extract imports from AST
   */
  private extractImports(ast: any): Array<{ path: string; symbols: string[] }> {
    const imports: Array<{ path: string; symbols: string[] }> = [];

    if (!ast) return imports;

    const root = ast.root || ast;
    const children = root.body || root.children || [];

    for (const node of children) {
      if (node.type === 'import') {
        const importInfo = {
          path: node.modulePath || node.from,
          symbols: [] as string[],
        };
        if (node.imports) importInfo.symbols.push(...node.imports);
        if (node.defaultImport) importInfo.symbols.push(node.defaultImport);
        imports.push(importInfo);
      }
    }

    return imports;
  }

  /**
   * Emit progress event
   */
  private emitProgress(progress: ParseProgress): void {
    this.emit('progress', progress);
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[ParallelParser] ${message}`);
    }
  }
}

/**
 * Create a parallel parser with default options
 */
export function createParallelParser(
  options?: ParallelParserOptions
): ParallelParser {
  return new ParallelParser(options);
}

/**
 * Convenience function to parse files in parallel
 */
export async function parseFilesParallel(
  files: FileInput[],
  options?: ParallelParserOptions
): Promise<ParallelParseResult> {
  const parser = createParallelParser(options);

  try {
    await parser.initialize();
    return await parser.parseFiles(files);
  } finally {
    await parser.shutdown();
  }
}
