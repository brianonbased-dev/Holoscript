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
      // Step 0: Identify Raw Blocks (for .hsplus)
      const rawRanges = fileType === 'hsplus' ? this.identifyRawBlocks(formatted) : [];

      // Step 1: Normalize line endings
      formatted = this.normalizeLineEndings(formatted);

      // Step 2: Normalize indentation
      formatted = this.normalizeIndentation(formatted, rawRanges);

      // Step 3: Handle blank lines (Blank lines are generally safe to normalize everywhere)
      formatted = this.normalizeBlankLines(formatted);

      // Step 4: Format braces (SKIP in raw blocks)
      formatted = this.formatBraces(formatted, rawRanges);

      // Step 5: Handle trailing commas (SKIP in raw blocks)
      formatted = this.handleTrailingCommas(formatted, rawRanges);

      // Step 6: Sort imports (if enabled)
      if (this.config.sortImports) {
        formatted = this.sortImports(formatted);
      }

      // Step 7: Normalize whitespace (SKIP inside raw blocks if needed, but usually trailing is fine)
      formatted = this.normalizeWhitespace(formatted, rawRanges);

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

  /**
   * Identify ranges of "Raw Blocks" (e.g. inside logic { ... })
   */
  private identifyRawBlocks(source: string): Range[] {
    const ranges: Range[] = [];
    const lines = source.split('\n');
    
    // Look for lines that start a raw block: nodeType [name] {
    // and find the matching closing brace.
    const rawBlockStarters = [
      'logic', 'module', 'script', 'struct', 'enum',
      'class', 'interface', 'spatial_group', 'scene', 'group'
    ];

    let braceCount = 0;
    let inRawBlock = false;
    let startLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!inRawBlock) {
        const isStarter = rawBlockStarters.some(s => line.startsWith(s)) && line.includes('{');
        if (isStarter) {
          inRawBlock = true;
          startLine = i;
          braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          if (braceCount === 0) {
            // Block closed on same line, but we still count it as a range if it had content?
            // Actually, if it's single line, we don't need special range handling for sub-lines.
            inRawBlock = false;
          }
        }
      } else {
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        if (braceCount <= 0) {
          ranges.push({ startLine: startLine + 1, endLine: i - 1 });
          inRawBlock = false;
        }
      }
    }

    return ranges;
  }

  // ==========================================================================
  // PRIVATE FORMATTING METHODS
  // ==========================================================================

  private normalizeLineEndings(source: string): string {
    return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  private normalizeIndentation(source: string, rawRanges: Range[] = []): string {
    const indent = this.config.useTabs ? '\t' : ' '.repeat(this.config.indentSize);
    const lines = source.split('\n');
    const result: string[] = [];
    let blockDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isInRaw = rawRanges.some(r => i >= r.startLine && i <= r.endLine);

      if (isInRaw) {
        result.push(line);
        continue;
      }

      const content = line.trim();
      
      // Skip empty lines
      if (content === '') {
        result.push('');
        continue;
      }

      // Count closing braces at the start of trimmed content to dedent before this line
      let closingAtStart = 0;
      for (const char of content) {
        if (char === '}') closingAtStart++;
        else break; // Stop at first non-}
      }
      
      // Dedent before this line if it starts with closing braces
      blockDepth = Math.max(0, blockDepth - closingAtStart);

      // Apply indentation
      const newIndent = indent.repeat(blockDepth);
      result.push(newIndent + content);

      // Count all opening and closing braces to update depth for next line
      const openingCount = (content.match(/\{/g) || []).length;
      const closingCount = (content.match(/}/g) || []).length;
      blockDepth = Math.max(0, blockDepth + openingCount - closingCount);
    }

    return result.join('\n');
  }

  private normalizeBlankLines(source: string): string {
    const max = this.config.maxBlankLines;
    const regex = new RegExp(`\\n{${max + 2},}`, 'g');
    return source.replace(regex, '\n'.repeat(max + 1));
  }

  private formatBraces(source: string, rawRanges: Range[] = []): string {
    // Simple brace formatting based on style
    if (rawRanges.length > 0) {
      // If we have raw ranges, we must be careful. 
      // For now, if there are any raw ranges, we skip global regex replace 
      // and do it more surgical or skip entirely.
      // HSPlus files with heavy TS should probably maintain their brace style.
      return source;
    }
    
    if (this.config.braceStyle === 'same-line') {
      return source.replace(/\n\s*\{/g, ' {');
    } else if (this.config.braceStyle === 'next-line') {
      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // If line ends with { and has other content
        if (line.trim().length > 1 && line.trim().endsWith('{')) {
          const match = line.match(/^(\s*)(.*)\s*\{$/);
          if (match) {
            const indent = match[1];
            const content = match[2].trimEnd();
            lines[i] = `${indent}${content}\n${indent}{`;
          }
        }
      }
      return lines.join('\n');
    }
    return source;
  }

  private handleTrailingCommas(source: string, rawRanges: Range[] = []): string {
    if (rawRanges.length > 0) return source; // Skip in hybrid files
    
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
    let foundImports = false;
    let importSectionEnded = false;
    let hasBlankLineAfterImports = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isImport = line.trim().startsWith('import ') || line.trim().startsWith('@import');
      const isEmpty = line.trim() === '';

      if (isImport) {
        foundImports = true;
        importLines.push(line);
      } else if (foundImports && isEmpty && !importSectionEnded) {
        // Blank line immediately after imports - mark it
        hasBlankLineAfterImports = true;
        importSectionEnded = true;
        // Don't add to either list - we'll add it back if needed
      } else if (!foundImports && isEmpty) {
        // Skip blank lines before imports
        continue;
      } else {
        // Any other content line
        otherLines.push(line);
        if (foundImports && !importSectionEnded) {
          importSectionEnded = true;
        }
      }
    }

    // If no imports found, return as-is
    if (importLines.length === 0) {
      return source;
    }

    // Sort imports alphabetically
    const sortedImports = importLines.sort((a, b) => a.localeCompare(b));
    
    // Reconstruct: imports, optional blank line, then other content
    const result = [...sortedImports];
    if (hasBlankLineAfterImports) {
      result.push('');
    }
    result.push(...otherLines);
    
    return result.join('\n');
  }

  private normalizeWhitespace(source: string, rawRanges: Range[] = []): string {
    // Remove trailing whitespace from lines
    return source
      .split('\n')
      .map((line, i) => {
        const isInRaw = rawRanges.some(r => i >= r.startLine && i <= r.endLine);
        return isInRaw ? line : line.trimEnd();
      })
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
 * Format a specific range of HoloScript code
 */
export function formatRange(source: string, range: Range, fileType: 'holo' | 'hsplus' = 'holo'): FormatResult {
  const formatter = new HoloScriptFormatter();
  return formatter.formatRange(source, range, fileType);
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
