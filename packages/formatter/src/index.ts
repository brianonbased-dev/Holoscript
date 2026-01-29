/**
 * HoloScript Formatter
 *
 * Code formatting tool for HoloScript (.holo) and HoloScript+ (.hsplus) files.
 * Enforces consistent code style and formatting across the codebase.
 *
 * @package @hololand/holoscript-formatter
 * @version 2.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

export type BraceStyle = 'same-line' | 'next-line' | 'stroustrup';
export type TrailingComma = 'none' | 'all' | 'multi-line';

export interface Range {
  startLine: number; // 0-based
  endLine: number;   // 0-based, inclusive
}

export interface FormatterConfig {
  // Indentation
  indentSize: number;
  useTabs: boolean;

  // Line length
  maxLineLength: number;

  // Braces
  braceStyle: BraceStyle;

  // Arrays/Objects
  trailingComma: TrailingComma;
  bracketSpacing: boolean;

  // Semicolons (HSPlus)
  semicolons: boolean;

  // Quotes
  singleQuote: boolean;

  // Imports
  sortImports: boolean;

  // Blank lines
  maxBlankLines: number;
  blankLineBeforeComposition: boolean;
}

export interface FormatResult {
  formatted: string;
  changed: boolean;
  errors: FormatError[];
}

export interface FormatError {
  message: string;
  line: number;
  column: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_CONFIG: FormatterConfig = {
  indentSize: 2,
  useTabs: false,
  maxLineLength: 100,
  braceStyle: 'same-line',
  trailingComma: 'multi-line',
  bracketSpacing: true,
  semicolons: false,
  singleQuote: false,
  sortImports: true,
  maxBlankLines: 1,
  blankLineBeforeComposition: true,
};

// =============================================================================
// FORMATTER CLASS
// =============================================================================

export class HoloScriptFormatter {
  private config: FormatterConfig;

  constructor(config: Partial<FormatterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Format HoloScript or HoloScript+ code
   */
  format(source: string, fileType: 'holo' | 'hsplus' = 'holo'): FormatResult {
    const errors: FormatError[] = [];
    let formatted = source;

    try {
      // Step 1: Normalize line endings
      formatted = this.normalizeLineEndings(formatted);

      // Step 2: Normalize indentation
      formatted = this.normalizeIndentation(formatted);

      // Step 3: Handle blank lines
      formatted = this.normalizeBlankLines(formatted);

      // Step 4: Format braces
      formatted = this.formatBraces(formatted);

      // Step 5: Handle trailing commas
      formatted = this.handleTrailingCommas(formatted);

      // Step 6: Sort imports (if enabled)
      if (this.config.sortImports) {
        formatted = this.sortImports(formatted);
      }

      // Step 7: Normalize whitespace
      formatted = this.normalizeWhitespace(formatted);

      // Step 8: Ensure final newline
      formatted = this.ensureFinalNewline(formatted);
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown formatting error',
        line: 0,
        column: 0,
      });
    }

    return {
      formatted,
      changed: formatted !== source,
      errors,
    };
  }

  /**
   * Format a specific range of lines
   */
  formatRange(source: string, range: Range, fileType: 'holo' | 'hsplus' = 'holo'): FormatResult {
    // 1. Format entire source to calculate correct context
    const fullResult = this.format(source, fileType);
    
    // 2. Extract the lines for the range
    const sourceLines = source.split('\n');
    const formattedLines = fullResult.formatted.split('\n');
    
    // Ensure range is valid
    const start = Math.max(0, range.startLine);
    const end = Math.min(formattedLines.length - 1, range.endLine);
    
    if (start > end) {
       return { formatted: '', changed: false, errors: [] };
    }

    // 3. Construct result substring
    // We strictly return the formatted content for the range lines
    const resultLines = formattedLines.slice(start, end + 1);
    const resultString = resultLines.join('\n');
    
    const originalSlice = sourceLines.slice(start, end + 1).join('\n');

    return {
      formatted: resultString,
      changed: resultString !== originalSlice,
      errors: fullResult.errors
    };
  }

  /**
   * Check if code is properly formatted
   */
  check(source: string, fileType: 'holo' | 'hsplus' = 'holo'): boolean {
    const result = this.format(source, fileType);
    return !result.changed;
  }

  // ==========================================================================
  // PRIVATE FORMATTING METHODS
  // ==========================================================================

  private normalizeLineEndings(source: string): string {
    return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  private normalizeIndentation(source: string): string {
    const indent = this.config.useTabs ? '\t' : ' '.repeat(this.config.indentSize);
    const lines = source.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      // Count leading whitespace
      const leadingMatch = line.match(/^(\s*)/);
      if (!leadingMatch) {
        result.push(line);
        continue;
      }

      const leading = leadingMatch[1];
      const content = line.slice(leading.length);

      // Calculate indentation level
      let level = 0;
      for (const char of leading) {
        if (char === '\t') {
          level += this.config.indentSize;
        } else if (char === ' ') {
          level += 1;
        }
      }

      // Normalize to configured indent style
      const normalizedLevel = Math.floor(level / this.config.indentSize);
      const newIndent = indent.repeat(normalizedLevel);

      result.push(newIndent + content);
    }

    return result.join('\n');
  }

  private normalizeBlankLines(source: string): string {
    const max = this.config.maxBlankLines;
    const regex = new RegExp(`\\n{${max + 2},}`, 'g');
    return source.replace(regex, '\n'.repeat(max + 1));
  }

  private formatBraces(source: string): string {
    // Simple brace formatting based on style
    if (this.config.braceStyle === 'same-line') {
      // Ensure opening braces are on same line
      return source.replace(/\n\s*\{/g, ' {');
    } else if (this.config.braceStyle === 'next-line') {
      // Put opening braces on next line
      return source.replace(/\s*\{$/gm, '\n{');
    }
    return source;
  }

  private handleTrailingCommas(source: string): string {
    if (this.config.trailingComma === 'none') {
      // Remove trailing commas
      return source.replace(/,(\s*[\]}])/g, '$1');
    } else if (this.config.trailingComma === 'all') {
      // Add trailing commas (simplified - only for obvious cases)
      return source.replace(/([^\s,])(\s*\n\s*[\]}])/g, '$1,$2');
    }
    // multi-line: keep as-is
    return source;
  }

  private sortImports(source: string): string {
    const lines = source.split('\n');
    const importLines: string[] = [];
    const otherLines: string[] = [];
    let inImportSection = true;

    for (const line of lines) {
      const isImport = line.trim().startsWith('import ') || line.trim().startsWith('@import');
      const isEmpty = line.trim() === '';

      if (inImportSection && (isImport || (isEmpty && importLines.length > 0))) {
        if (isImport) {
          importLines.push(line);
        } else if (isEmpty && otherLines.length === 0) {
          // Keep empty line in import section
          importLines.push(line);
        }
      } else {
        inImportSection = false;
        otherLines.push(line);
      }
    }

    // Sort imports alphabetically
    const sortedImports = importLines
      .filter((l) => l.trim() !== '')
      .sort((a, b) => a.localeCompare(b));

    if (sortedImports.length === 0) {
      return source;
    }

    return [...sortedImports, '', ...otherLines].join('\n');
  }

  private normalizeWhitespace(source: string): string {
    // Remove trailing whitespace from lines
    return source
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
  }

  private ensureFinalNewline(source: string): string {
    if (!source.endsWith('\n')) {
      return source + '\n';
    }
    return source;
  }

  // ==========================================================================
  // CONFIG MANAGEMENT
  // ==========================================================================

  getConfig(): FormatterConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<FormatterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Format HoloScript code with default config
 */
export function format(source: string, fileType: 'holo' | 'hsplus' = 'holo'): FormatResult {
  const formatter = new HoloScriptFormatter();
  return formatter.format(source, fileType);
}

/**
 * Check if HoloScript code is properly formatted
 */
export function check(source: string, fileType: 'holo' | 'hsplus' = 'holo'): boolean {
  const formatter = new HoloScriptFormatter();
  return formatter.check(source, fileType);
}

/**
 * Create a formatter with custom config
 */
export function createFormatter(config: Partial<FormatterConfig> = {}): HoloScriptFormatter {
  return new HoloScriptFormatter(config);
}

// Config Loader integration
import { ConfigLoader } from './ConfigLoader';

/**
 * Load formatter configuration for a specific file
 */
export function loadConfig(filePath: string): FormatterConfig {
  const loader = new ConfigLoader();
  return loader.loadConfig(filePath);
}

// Default export
export default HoloScriptFormatter;
