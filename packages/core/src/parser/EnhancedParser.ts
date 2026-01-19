/**
 * @holoscript/core Enhanced Parser
 *
 * Improved error recovery, line/column tracking, better diagnostics
 */

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface ParsedToken {
  type: string;
  value: string;
  location: SourceLocation;
}

export interface ParseError {
  message: string;
  location: SourceLocation;
  token: ParsedToken | undefined;
  suggestion?: string;
  context?: string;
}

/**
 * Enhanced parser with better error handling
 */
export class EnhancedHoloScriptParser {
  private tokens: ParsedToken[];
  private position: number = 0;
  private line: number = 1;
  private column: number = 0;
  private lineOffsets: number[] = [0];
  private errors: ParseError[] = [];

  constructor(sourceCode: string) {
    this.tokens = this.tokenizeWithLocation(sourceCode);
  }

  /**
   * Tokenize with line/column tracking
   */
  private tokenizeWithLocation(source: string): ParsedToken[] {
    const tokens: ParsedToken[] = [];

    let line = 1;
    let column = 0;

    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\n') {
        line++;
        column = 0;
        this.lineOffsets.push(i + 1);
      } else {
        column++;
      }

      // Simple tokenization (enhanced version would be more comprehensive)
      if (/\s/.test(source[i])) continue;

      // Capture token with location
      const token = {
        type: this.getTokenType(source[i]),
        value: source[i],
        location: { line, column, offset: i },
      };

      tokens.push(token);
    }

    return tokens;
  }

  private getTokenType(char: string): string {
    const typeMap: Record<string, string> = {
      '{': 'lbrace',
      '}': 'rbrace',
      '[': 'lbracket',
      ']': 'rbracket',
      '(': 'lparen',
      ')': 'rparen',
      '@': 'at',
      '#': 'hash',
      ':': 'colon',
      ',': 'comma',
      '=': 'equals',
      '.': 'dot',
    };
    return typeMap[char] || 'identifier';
  }

  /**
   * Better error with suggestions
   */
  error(message: string, suggestion?: string): ParseError {
    const token = this.currentToken();
    const location = token?.location || { line: this.line, column: this.column, offset: this.position };

    const error: ParseError = {
      message,
      location,
      token,
      suggestion: suggestion || this.suggestFix(message),
      context: this.getErrorContext(location),
    };

    this.errors.push(error);
    return error;
  }

  /**
   * Suggest fixes based on error pattern
   */
  private suggestFix(error: string): string {
    if (error.includes('Expected }')) {
      return 'Check that all braces are balanced. Missing closing brace?';
    }
    if (error.includes('Expected identifier')) {
      return 'Expected a name or identifier here (e.g., myOrb, myVariable)';
    }
    if (error.includes('Unexpected token')) {
      const token = this.currentToken();
      return `Remove or fix the '${token?.value}' token on this line`;
    }
    if (error.includes('Expected @')) {
      return 'Traits must start with @ symbol (e.g., @grabbable, @voice_input)';
    }
    return 'Check syntax in this area';
  }

  /**
   * Get error context from source
   */
  private getErrorContext(location: SourceLocation): string {
    const startLine = Math.max(0, location.line - 2);
    const endLine = location.line + 1;
    const lineNum = location.line;

    let context = '';
    for (let i = startLine; i < endLine; i++) {
      const prefix = i === lineNum ? '→' : ' ';
      context += `${prefix} ${i + 1} | <source line>\n`;
    }

    // Add pointer
    context += `  | ${' '.repeat(location.column - 1)}^`;

    return context;
  }

  /**
   * Error recovery: skip to next statement
   */

  /**
   * Get all collected errors
   */
  getErrors(): ParseError[] {
    return this.errors;
  }

  /**
   * Check if any errors occurred
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  // Utility methods
  currentToken(): ParsedToken | undefined {
    return this.tokens[this.position];
  }




}

/**
 * Format parser error for display
 */
export function formatParseError(error: ParseError): string {
  const { message, location, suggestion, context } = error;

  return `
❌ Parse Error: ${message}
   at line ${location.line}, column ${location.column}

${context}

💡 Suggestion: ${suggestion || 'Check the syntax'}
  `.trim();
}

/**
 * Format all errors
 */
export function formatParseErrors(errors: ParseError[]): string {
  if (errors.length === 0) return '';

  let output = `\n❌ Found ${errors.length} parse error${errors.length !== 1 ? 's' : ''}:\n\n`;

  for (let i = 0; i < errors.length; i++) {
    output += `[${i + 1}/${errors.length}] ${formatParseError(errors[i])}\n\n`;
  }

  return output;
}
