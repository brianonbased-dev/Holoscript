/**
 * @holoscript/core Enhanced Parser
 *
 * Improved error recovery, line/column tracking, better diagnostics
 */
/**
 * Enhanced parser with better error handling
 */
export class EnhancedHoloScriptParser {
    constructor(sourceCode) {
        this.position = 0;
        this.line = 1;
        this.column = 0;
        this.lineOffsets = [0];
        this.errors = [];
        this.tokens = this.tokenizeWithLocation(sourceCode);
    }
    /**
     * Tokenize with line/column tracking
     */
    tokenizeWithLocation(source) {
        const tokens = [];
        let pos = 0;
        let line = 1;
        let column = 0;
        for (let i = 0; i < source.length; i++) {
            if (source[i] === '\n') {
                line++;
                column = 0;
                this.lineOffsets.push(i + 1);
            }
            else {
                column++;
            }
            // Simple tokenization (enhanced version would be more comprehensive)
            if (/\s/.test(source[i]))
                continue;
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
    getTokenType(char) {
        const typeMap = {
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
    error(message, suggestion) {
        const token = this.currentToken();
        const location = token?.location || { line: this.line, column: this.column, offset: this.position };
        const error = {
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
    suggestFix(error) {
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
    getErrorContext(location) {
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
    synchronize() {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous()?.type === 'newline')
                return;
            const current = this.currentToken();
            if (current?.type === 'identifier' ||
                current?.type === 'at' ||
                current?.type === 'rbrace') {
                return;
            }
            this.advance();
        }
    }
    /**
     * Get all collected errors
     */
    getErrors() {
        return this.errors;
    }
    /**
     * Check if any errors occurred
     */
    hasErrors() {
        return this.errors.length > 0;
    }
    // Utility methods
    currentToken() {
        return this.tokens[this.position];
    }
    previous() {
        return this.tokens[this.position - 1];
    }
    advance() {
        if (!this.isAtEnd())
            this.position++;
        return this.previous();
    }
    isAtEnd() {
        return this.position >= this.tokens.length;
    }
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    check(type) {
        if (this.isAtEnd())
            return false;
        return this.currentToken()?.type === type;
    }
    expect(type, message) {
        if (this.check(type))
            return this.advance();
        return this.error(message);
    }
}
/**
 * Format parser error for display
 */
export function formatParseError(error) {
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
export function formatParseErrors(errors) {
    if (errors.length === 0)
        return '';
    let output = `\n❌ Found ${errors.length} parse error${errors.length !== 1 ? 's' : ''}:\n\n`;
    for (let i = 0; i < errors.length; i++) {
        output += `[${i + 1}/${errors.length}] ${formatParseError(errors[i])}\n\n`;
    }
    return output;
}
