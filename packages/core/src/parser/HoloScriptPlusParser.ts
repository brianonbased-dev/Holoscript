/**
 * HoloScript+ Parser
 *
 * Parses HoloScript+ source code into an AST with support for:
 * - Standard HoloScript syntax (backward compatible)
 * - @ directive parsing for VR traits, state, control flow
 * - Expression interpolation with ${...}
 * - TypeScript companion imports
 *
 * @version 1.0.0
 */

import type {
  ASTProgram,
  HSPlusNode,
  HSPlusDirective,
  HSPlusCompileResult,
  HSPlusParserOptions,
  VRTraitName,
} from '../types/AdvancedTypeSystem';

export type {
  ASTProgram,
  HSPlusNode,
  HSPlusDirective,
  HSPlusCompileResult,
  HSPlusParserOptions,
  VRTraitName,
};

// =============================================================================
// TOKEN TYPES
// =============================================================================

type TokenType =
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'NULL'
  | 'LBRACE'
  | 'RBRACE'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'LPAREN'
  | 'RPAREN'
  | 'COLON'
  | 'COMMA'
  | 'AT'
  | 'HASH'
  | 'DOT'
  | 'EQUALS'
  | 'ARROW'
  | 'PIPE'
  | 'EXPRESSION'
  | 'TEMPLATE_STRING'
  | 'COMMENT'
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'STATE_MACHINE'
  | 'INITIAL'
  | 'STATE'
  | 'ON_ENTRY'
  | 'ON_EXIT'
  | 'TRANSITION'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// =============================================================================
// SHARED CONSTANTS
// =============================================================================

import { VR_TRAITS, LIFECYCLE_HOOKS, STRUCTURAL_DIRECTIVES } from '../constants';
import { ChunkDetector, SourceChunk } from './ChunkDetector';
import { ParseCache, globalParseCache } from './ParseCache';
import {
  RichParseError,
  createRichError,
  createTraitError,
  findSimilarKeyword,
  type ErrorCode,
} from './RichErrors';

// =============================================================================
// LEXER
// =============================================================================

class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private indentStack: number[] = [0];
  private tokens: Token[] = [];
  private pendingDedents: number = 0;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      // Handle pending dedents
      while (this.pendingDedents > 0) {
        this.tokens.push(this.createToken('DEDENT', ''));
        this.pendingDedents--;
      }

      const char = this.source[this.pos];

      // Skip whitespace (but track indentation at line start)
      if (char === ' ' || char === '\t') {
        if (this.column === 1) {
          this.handleIndentation();
        } else {
          this.advance();
        }
        continue;
      }

      // Comments
      if (char === '/' && this.peek(1) === '/') {
        this.skipLineComment();
        continue;
      }

      // Newlines
      if (char === '\n') {
        this.tokens.push(this.createToken('NEWLINE', '\n'));
        this.advance();
        this.line++;
        this.column = 1;
        continue;
      }
      if (char === '\r') {
        this.advance();
        if (this.peek() === '\n') {
          this.advance();
        }
        this.tokens.push(this.createToken('NEWLINE', '\n'));
        this.line++;
        this.column = 1;
        continue;
      }

      // Symbols
      if (char === '{') {
        this.tokens.push(this.createToken('LBRACE', '{'));
        this.advance();
        continue;
      }
      if (char === '}') {
        this.tokens.push(this.createToken('RBRACE', '}'));
        this.advance();
        continue;
      }
      if (char === '[') {
        this.tokens.push(this.createToken('LBRACKET', '['));
        this.advance();
        continue;
      }
      if (char === ']') {
        this.tokens.push(this.createToken('RBRACKET', ']'));
        this.advance();
        continue;
      }
      if (char === '(') {
        this.tokens.push(this.createToken('LPAREN', '('));
        this.advance();
        continue;
      }
      if (char === ')') {
        this.tokens.push(this.createToken('RPAREN', ')'));
        this.advance();
        continue;
      }
      if (char === ':') {
        this.tokens.push(this.createToken('COLON', ':'));
        this.advance();
        continue;
      }
      if (char === ',') {
        this.tokens.push(this.createToken('COMMA', ','));
        this.advance();
        continue;
      }
      if (char === '@') {
        this.tokens.push(this.createToken('AT', '@'));
        this.advance();
        continue;
      }
      if (char === '#') {
        this.tokens.push(this.createToken('HASH', '#'));
        this.advance();
        continue;
      }
      if (char === '.') {
        if (this.peek(1) === '.' && this.peek(2) === '.') {
           const startCol = this.column;
           this.advance(); // .
           this.advance(); // .
           this.advance(); // .
           this.tokens.push(this.createToken('SPREAD', '...'));
           this.tokens[this.tokens.length - 1].column = startCol;
           continue; 
        }
        this.tokens.push(this.createToken('DOT', '.'));
        this.advance();
        continue;
      }
      if (char === '/' && this.peek(1) === '*') {
        this.skipBlockComment();
        continue;
      }
      if (char === '=') {
        if (this.peek(1) === '>') {
          const startCol = this.column;
          this.advance(); // =
          this.advance(); // >
          this.tokens.push(this.createToken('ARROW', '=>'));
          this.tokens[this.tokens.length - 1].column = startCol;
          continue;
        }
        this.tokens.push(this.createToken('EQUALS', '='));
        this.advance();
        continue;
      }
      if (char === '-') {
        if (this.peek(1) === '>') {
          const startCol = this.column;
          this.advance(); // -
          this.advance(); // >
          this.tokens.push(this.createToken('ARROW', '->'));
          this.tokens[this.tokens.length - 1].column = startCol;
          continue;
        }
      }
      if (char === '|') {
        this.tokens.push(this.createToken('PIPE', '|'));
        this.advance();
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        this.tokens.push(this.readString(char));
        continue;
      }

      // Numbers
      if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek(1)))) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // Question marks (??, ??=, ?)
      if (char === '?') {
        if (this.peek(1) === '?') {
          if (this.peek(2) === '=') {
             const startCol = this.column;
             this.advance(); // ?
             this.advance(); // ? 
             this.advance(); // =
             this.tokens.push(this.createToken('NULL_COALESCE_ASSIGN', '??='));
             this.tokens[this.tokens.length - 1].column = startCol;
             continue;
          }
          const startCol = this.column;
          this.advance(); // ?
          this.advance(); // ?
          this.tokens.push(this.createToken('NULL_COALESCE', '??'));
          this.tokens[this.tokens.length - 1].column = startCol;
          continue;
        }
        this.tokens.push(this.createToken('QUESTION', '?'));
        this.advance();
        continue;
      }

      // Identifiers and keywords
      if (this.isIdentifierStart(char)) {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      // Unknown character - skip
      this.advance();
    }

    // Handle remaining dedents
    while (this.indentStack.length > 1) {
      this.tokens.push(this.createToken('DEDENT', ''));
      this.indentStack.pop();
    }

    this.tokens.push(this.createToken('EOF', ''));
    return this.tokens;
  }

  private advance(): string {
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    return char;
  }

  private peek(offset: number = 0): string {
    const pos = this.pos + offset;
    return pos < this.source.length ? this.source[pos] : '';
  }

  private createToken(type: TokenType, value: string): Token {
    const token = {
      type,
      value,
      line: this.line,
      column: this.column - (value.length || 0),
    };
    // console.log(`[DEBUG_LEX] Token: ${type} "${value}" at ${token.line}:${token.column}`);
    return token;
  }

  private handleIndentation(): void {
    let indent = 0;
    while (this.peek() === ' ' || this.peek() === '\t') {
      indent += this.peek() === '\t' ? 4 : 1;
      this.advance();
    }

    if (this.peek() === '\n' || this.peek() === '\r') {
      return;
    }

    const currentIndent = this.indentStack[this.indentStack.length - 1];

    if (indent > currentIndent) {
      this.indentStack.push(indent);
      this.tokens.push(this.createToken('INDENT', ''));
    } else if (indent < currentIndent) {
      while (
        this.indentStack.length > 1 &&
        indent < this.indentStack[this.indentStack.length - 1]
      ) {
        this.indentStack.pop();
        this.pendingDedents++;
      }
    }
  }

  private skipLineComment(): void {
    while (this.peek() !== '\n' && this.pos < this.source.length) {
      this.advance();
    }
  }

  private skipBlockComment(): void {
    this.advance(); // /
    this.advance(); // *
    while (this.pos < this.source.length) {
      if (this.peek() === '*' && this.peek(1) === '/') {
        this.advance();
        this.advance();
        break;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      this.advance();
    }
  }

  private readString(quote: string): Token {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // Opening quote
    let value = '';

    while (this.peek() !== quote && this.pos < this.source.length) {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            value += escaped;
        }
      } else if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
        value += this.advance();
      } else {
        value += this.advance();
      }
    }

    this.advance(); // Closing quote
    const token = {
      type: 'STRING' as TokenType,
      value,
      line: startLine,
      column: startColumn,
    };
    return token;
  }

  private readNumber(): Token {
    const startColumn = this.column;
    let value = '';

    if (this.peek() === '-') {
      value += this.advance();
    }

    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      value += this.advance(); // .
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Scientific notation
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Unit suffix
    while (this.isAlpha(this.peek()) || this.peek() === '%') {
      value += this.advance();
    }

    const token = {
      type: 'NUMBER' as TokenType,
      value,
      line: this.line,
      column: startColumn,
    };
    return token;
  }

  private readExpression(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // $
    this.advance(); // {

    let value = '';
    let braceDepth = 1;

    while (braceDepth > 0 && this.pos < this.source.length) {
      if (this.peek() === '{') {
        braceDepth++;
      } else if (this.peek() === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          break;
        }
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      value += this.advance();
    }

    this.advance(); // Closing }

    return {
      type: 'EXPRESSION',
      value: value.trim(),
      line: startLine,
      column: startColumn,
    };
  }

  private readIdentifier(): Token {
    const startColumn = this.column;
    let value = '';

    while (this.isIdentifierPart(this.peek())) {
      value += this.advance();
    }

    if (value === 'true' || value === 'false') {
      return {
        type: 'BOOLEAN',
        value,
        line: this.line,
        column: startColumn,
      };
    }
    if (value === 'null' || value === 'none') {
      return {
        type: 'NULL',
        value,
        line: this.line,
        column: startColumn,
      };
    }

    const token = {
      type: 'IDENTIFIER' as TokenType,
      value,
      line: this.line,
      column: startColumn,
    };

    // Check for keywords
    switch (value) {
      case 'state_machine':
        token.type = 'STATE_MACHINE';
        break;
      case 'initial':
        token.type = 'INITIAL';
        break;
      case 'state':
        token.type = 'STATE';
        break;
      case 'on_entry':
        token.type = 'ON_ENTRY';
        break;
      case 'on_exit':
        token.type = 'ON_EXIT';
        break;
      case 'transition':
        token.type = 'TRANSITION';
        break;
    }

    return token;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isIdentifierStart(char: string): boolean {
    return this.isAlpha(char) || char === '_';
  }

  private isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char) || char === '-';
  }
}

// =============================================================================
// PARSER
// =============================================================================

export class HoloScriptPlusParser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private options: HSPlusParserOptions;
  private source: string = '';
  private errors: RichParseError[] = [];
  private warnings: RichParseError[] = [];
  private imports: Array<{ path: string; alias: string }> = [];
  private hasState: boolean = false;
  private hasVRTraits: boolean = false;
  private hasControlFlow: boolean = false;
  private compiledExpressions: Map<string, string> = new Map();

  constructor(options: HSPlusParserOptions = {}) {
    this.options = {
      enableVRTraits: true,
      enableTypeScriptImports: true,
      strict: false,
      ...options,
    };
  }

  parse(source: string): HSPlusCompileResult {
    // Reset state
    this.source = source;
    this.errors = [];
    this.warnings = [];
    this.imports = [];
    this.hasState = false;
    this.hasVRTraits = false;
    this.hasControlFlow = false;
    this.compiledExpressions = new Map();
    this.pos = 0;

    // Tokenize
    const lexer = new Lexer(source);
    this.tokens = lexer.tokenize();

    // Parse root node
    const root = this.parseDocument();

    // Build AST
    return this.buildResult(root);
  }

  /**
   * Performs an incremental parse using cached nodes for unchanged chunks
   */
  parseIncremental(source: string, cache: ParseCache = globalParseCache): HSPlusCompileResult {
    const startTime = Date.now();
    this.source = source;
    this.errors = [];
    this.warnings = [];
    this.imports = [];
    this.hasState = false;
    this.hasVRTraits = false;
    this.hasControlFlow = false;
    this.compiledExpressions = new Map();

    // 1. Detect chunks
    const chunks = ChunkDetector.detect(source);
    const topLevelNodes: HSPlusNode[] = [];
    const globalDirectives: HSPlusDirective[] = [];

    for (const chunk of chunks) {
      const hash = ParseCache.hash(chunk.content);
      const cachedNode = cache.get(chunk.id, hash);

      if (cachedNode) {
        // Reuse cached node
        topLevelNodes.push(cachedNode);
        // Directives are already attached to the node
      } else {
        // Must re-parse this chunk
        const chunkResult = this.parse(chunk.content);
        if (chunkResult.ast.root) {
          const node = chunkResult.ast.root;
          // Sync line numbers for the chunk node (naive)
          this.offsetNodeLoc(node, chunk.startLine - 1);
          
          topLevelNodes.push(node);
          cache.set(chunk.id, hash, node);
          
          // Merge metadata
          this.hasState = this.hasState || chunkResult.features.state;
          this.hasVRTraits = this.hasVRTraits || chunkResult.features.vrTraits;
          this.hasControlFlow = this.hasControlFlow || chunkResult.features.loops || chunkResult.features.conditionals;
          this.imports.push(...chunkResult.ast.imports);
        }
        this.errors.push(...chunkResult.errors);
        this.warnings.push(...chunkResult.warnings);
      }
    }

    // 2. Build result from top-level nodes
    const root: HSPlusNode = {
      type: 'fragment' as any,
      id: 'root',
      properties: {},
      directives: globalDirectives,
      children: topLevelNodes,
      traits: new Map(),
      loc: {
        start: { line: 1, column: 1 },
        end: { line: chunks.length > 0 ? chunks[chunks.length - 1].endLine : 1, column: 1 },
      },
      body: topLevelNodes,
    } as any;

    const result = this.buildResult(root);
    // console.log(`[DEBUG_PERF] Incremental parse took ${Date.now() - startTime}ms`);
    return result;
  }

  private buildResult(root: HSPlusNode): HSPlusCompileResult {
    const ast: ASTProgram = {
      type: 'Program',
      id: 'root',
      properties: root.properties || {},
      directives: root.directives || [],
      children: root.children || [],
      traits: root.traits || new Map(),
      loc: root.loc,
      body: root.children || [],
      version: '1.0',
      root,
      imports: this.imports,
      hasState: this.hasState,
      hasVRTraits: this.hasVRTraits,
      hasControlFlow: this.hasControlFlow,
    };

    return {
      success: this.errors.length === 0,
      ast,
      compiledExpressions: this.compiledExpressions,
      requiredCompanions: this.imports.map((i) => i.path),
      features: {
        state: this.hasState,
        vrTraits: this.hasVRTraits,
        loops: this.hasControlFlow,
        conditionals: this.hasControlFlow,
        lifecycleHooks: root.directives.some((d: any) => d.type === 'lifecycle'),
      },
      warnings: this.warnings,
      errors: this.errors,
    };
  }

  private offsetNodeLoc(node: HSPlusNode, lineOffset: number) {
    if (node.loc) {
      if (node.loc.start) node.loc.start.line += lineOffset;
      if (node.loc.end) node.loc.end.line += lineOffset;
    }
    if (node.children) {
      node.children.forEach(child => this.offsetNodeLoc(child, lineOffset));
    }
    if (node.body && Array.isArray(node.body)) {
      node.body.forEach(child => this.offsetNodeLoc(child, lineOffset));
    }
  }

  private parseDocument(): HSPlusNode {
    this.skipNewlines();

    const topLevelNodes: HSPlusNode[] = [];
    const globalDirectives: HSPlusDirective[] = [];

    while (!this.check('EOF')) {
      const currentDirectives: HSPlusDirective[] = [];

      // 1. Collect directives
      try {
        while (this.check('AT')) {
          const directive = this.parseDirective();
          if (directive) {
            currentDirectives.push(directive);
          }
          this.skipNewlines();
        }

        // 2. Parse node if present
        const isNodeStart = this.check('IDENTIFIER') || 
                            this.check('STATE_MACHINE') || 
                            this.check('STATE') || 
                            this.check('TRANSITION') || 
                            this.check('INITIAL');
        
        if (isNodeStart) {
          const node = this.parseNode();
          // Attach preceding directives to this node
          node.directives = [...currentDirectives, ...(node.directives || [])] as any;
          topLevelNodes.push(node);
        } else {
          // If directives with no node, handle as global or fragment
          if (currentDirectives.length > 0) {
            if (this.check('EOF')) {
              globalDirectives.push(...currentDirectives);
            } else {
              // Unexpected token after directives, report and sync
              this.error(`Expected node after directives, got ${this.current().type}`);
              globalDirectives.push(...currentDirectives);
              // Not strictly needing full sync here as we handle it, but good practice if error throws
            }
          } else if (!this.check('EOF')) {
            // No directives, no node, but not EOF
            this.error(`Unexpected token ${this.current().type} "${this.current().value}" at top level`);
            // error() pushes to array, but does NOT throw by default yet.
            // We need to throw to trigger recovery.
            throw new Error('ParseError'); 
          }
        }
      } catch (e: any) {
        if (e.message !== 'ParseError' && e.message !== 'Unexpected token') {
            console.error(e); // Log unexpected runtime errors
        }
        this.synchronize();
      }
      this.skipNewlines();
    }

    // If we have multiple nodes or global directives, return a fragment
    if (topLevelNodes.length === 1 && globalDirectives.length === 0) {
      return topLevelNodes[0];
    }

    return {
      type: 'fragment' as any,
      id: 'root',
      properties: {},
      directives: globalDirectives,
      children: topLevelNodes,
      traits: new Map(),
      loc: {
        start: { line: 1, column: 1 },
        end: { line: this.current().line, column: this.current().column },
      },
      body: topLevelNodes,
    } as unknown as HSPlusNode;
  }

  private parseNode(): HSPlusNode {
    const startToken = this.current();

    const typeToken = this.match(['IDENTIFIER', 'STATE_MACHINE', 'STATE', 'TRANSITION', 'INITIAL', 'ON_ENTRY', 'ON_EXIT']) || this.expect('IDENTIFIER', 'Expected element type');
    const type = typeToken.value;

    // =========================================================================
    // Special handling for logic blocks
    // =========================================================================
    if (type === 'logic') {
      const logicBody = this.parseLogicBlock();
      return {
        type: 'logic' as any,
        properties: {},
        directives: [],
        children: [],
        traits: new Map(),
        body: logicBody,
        loc: {
          start: { line: startToken.line, column: startToken.column },
          end: { line: this.current().line, column: this.current().column },
        },
      } as any;
    }

    // =========================================================================
    // Special handling for template definitions
    // =========================================================================
    if (type === 'template') {
      const templateName = this.expect('STRING', 'Expected template name').value;
      const templateBody = this.parseBlockContent();
      return {
        type: 'template' as any,
        name: templateName,
        body: templateBody,
        loc: {
          start: { line: startToken.line, column: startToken.column },
          end: { line: this.current().line, column: this.current().column },
        },
      } as any;
    }

    // =========================================================================
    // Special handling for state machine definitions (Phase 13)
    // =========================================================================
    if (startToken.type === 'STATE_MACHINE' || type === 'state_machine') {
      return this.parseStateMachine();
    }

    // =========================================================================
    // Special handling for environment blocks
    // =========================================================================
    if (type === 'environment') {
      const envBody = this.parseEnvironmentBlock();
      return {
        type: 'environment' as any,
        properties: envBody.properties,
        directives: envBody.directives,
        children: [],
        traits: new Map(),
        loc: {
          start: { line: startToken.line, column: startToken.column },
          end: { line: this.current().line, column: this.current().column },
        },
      } as any;
    }

    // =========================================================================
    // Standard node parsing
    // =========================================================================
    let id: string | undefined;
    let templateRef: string | undefined;

    // Parse #id
    if (this.check('HASH')) {
      this.advance();
      id = this.expect('IDENTIFIER', 'Expected ID after #').value;
    }

    // Parse "name" (quoted name for node)
    if (this.check('STRING')) {
      id = this.advance().value;
    }

    // Parse unquoted identifier as name/id
    if (this.check('IDENTIFIER') && this.current().value !== 'using') {
      id = this.advance().value;
    }

    // Parse `using "TemplateName"`
    if (this.check('IDENTIFIER') && this.current().value === 'using') {
      this.advance();
      templateRef = this.expect('STRING', 'Expected template name after using').value;
    }

    const properties: Record<string, unknown> = {};
    const children: HSPlusNode[] = [];
    const directives: HSPlusDirective[] = [];
    const traits = new Map<VRTraitName, unknown>();

    // Store template reference
    if (templateRef) {
      properties.__templateRef = templateRef;
    }

    while (!this.check('LBRACE') && !this.check('EOF')) {
      if (this.check('NEWLINE')) {
        this.skipNewlines();
        // If we hit a brace after newlines, it's the start of the block
        if (this.check('LBRACE')) break;
        // If we hit an identifier, it might be the next node
        // BUT wait, traits can be on newlines!
        // So we only continue if the next token is AT
        if (!this.check('AT')) break;
      }

      if (this.check('AT')) {
        const directive = this.parseDirective();
        if (directive) {
          if (directive.type === 'trait') {
            traits.set(directive.name as VRTraitName, (directive as any).config);
            this.hasVRTraits = true;
            directives.push(directive);
          } else {
            directives.push(directive);
          }
        }
      } else if (this.check('SPREAD')) {
        const startToken = this.advance(); // ...
        const target = this.expect('IDENTIFIER', 'Expected template or object name after ...').value;
        children.push({
          type: 'spread',
          target,
          loc: {
             start: { line: startToken.line, column: startToken.column },
             end: { line: this.current().line, column: this.current().column }
          }
        } as any);
      } else if (this.check('IDENTIFIER')) {
        const key = this.advance().value;
        if (this.check('COLON') || this.check('EQUALS')) {
          this.advance();
          properties[key] = this.parseValue();
        } else {
          properties[key] = true;
        }
      } else {
        break;
      }
    }

    if (this.check('LBRACE')) {
      this.advance();
      this.skipNewlines();

      while (!this.check('RBRACE') && !this.check('EOF')) {
        this.skipNewlines();
        if (this.check('RBRACE') || this.check('EOF')) break;

        if (this.check('AT')) {
          const directive = this.parseDirective();
          if (directive) {
            if (directive.type === 'trait') {
              traits.set(directive.name as VRTraitName, (directive as any).config);
              this.hasVRTraits = true;
              directives.push(directive);
            } else {
            directives.push(directive);
          }
        }
      } else if (this.check('SPREAD')) {
          const startToken = this.advance(); // ...
          const target = this.expect('IDENTIFIER', 'Expected template or object name after ...').value;
          children.push({
            type: 'spread',
            target,
            loc: {
               start: { line: startToken.line, column: startToken.column },
               end: { line: this.current().line, column: this.current().column }
            }
          } as any);
      } else if (this.check('IDENTIFIER')) {
          const saved = this.pos;
          const name = this.advance().value;

          // Check if this is a special keyword that represents a child node type
          const childNodeKeywords = [
            'logic',
            'template',
            'environment',
            'state',
            'object',
            'composition',
            'spatial_group',
            'scene',
            'group',
          ];

          if (this.check('COLON') || this.check('EQUALS')) {
            this.advance();
            properties[name] = this.parseValue();
          } else if (childNodeKeywords.includes(name) && this.check('LBRACE')) {
            // This is a child node (like logic { ... } or template "Name" { ... })
            this.pos = saved;
            children.push(this.parseNode());
          } else if (childNodeKeywords.includes(name) && this.check('STRING')) {
            // This is a named child node (like template "Name" { ... } or object "Name" { ... })
            this.pos = saved;
            children.push(this.parseNode());
          } else if (this.isLikelyValue(this.current())) {
            // Error: Missing colon but looks like a property
            this.error(`Expected ':' or '=' after property name '${name}'`);
            properties[name] = this.parseValue();
          } else {
            // Likely a child node
            this.pos = saved;
            children.push(this.parseNode());
          }
        } else {
          // Unexpected token - report error and potentially synchronize
          if (!this.check('RBRACE') && !this.check('EOF') && !this.check('NEWLINE')) {
            this.error(
              `Unexpected token ${this.current().type} "${this.current().value}" in node body`
            );
            this.synchronize();
          } else {
            this.advance();
          }
        }
        this.skipNewlines();
      }

      this.expect('RBRACE', 'Expected }');
    }

    return {
      type: type as any,
      name: id, // Mapping id to name for runtime compatibility
      id,
      properties,
      directives,
      children,
      traits,
      loc: {
        start: { line: startToken.line, column: startToken.column },
        end: { line: this.current().line, column: this.current().column },
      },
    } as any;
  }

  private parseDirective(): HSPlusDirective | null {
    this.expect('AT', 'Expected @');
    const nameToken = this.expect('IDENTIFIER', 'Expected directive name');
    const name = nameToken.value;

    // =========================================================================
    // VR Traits (with optional config)
    // =========================================================================
    if ((VR_TRAITS as readonly string[]).includes(name)) {
      if (!this.options.enableVRTraits) {
        this.warn(`VR trait @${name} is disabled`);
        return null;
      }
      const config = this.check('LPAREN') ? this.parseTraitConfig() : {};
      return { type: 'trait' as const, name: name as VRTraitName, config } as any;
    }

    // =========================================================================
    // Lifecycle Hooks
    // =========================================================================
    if ((LIFECYCLE_HOOKS as readonly string[]).includes(name)) {
      const params: string[] = [];
      if (this.check('LPAREN')) {
        this.advance();
        while (!this.check('RPAREN') && !this.check('EOF')) {
          params.push(this.expect('IDENTIFIER', 'Expected parameter name').value);
          if (this.check('COMMA')) this.advance();
        }
        this.expect('RPAREN', 'Expected )');
      }

      let body = '';
      if (this.check('ARROW')) {
        this.advance();
        body = this.parseInlineExpression();
      } else if (this.check('LBRACE')) {
        body = this.parseCodeBlock();
      }

      return {
        type: 'lifecycle' as const,
        hook: name,
        params,
        body,
      } as any;
    }

    // =========================================================================
    // State Block
    // =========================================================================
    if (name === 'state') {
      this.hasState = true;
      const body = this.parseStateBlock();
      return { type: 'state' as const, body } as any;
    }

    // =========================================================================
    // Control Flow
    // =========================================================================
    if (name === 'for') {
      this.hasControlFlow = true;
      const variable = this.expect('IDENTIFIER', 'Expected variable name').value;
      this.expect('IDENTIFIER', 'Expected "in"');
      const iterable = this.parseInlineExpression();
      const body = this.parseControlFlowBody();
      return { type: 'for' as const, variable, iterable, body } as any;
    }

    if (name === 'forEach') {
      this.hasControlFlow = true;
      const variable = this.expect('IDENTIFIER', 'Expected variable name').value;
      this.expect('IDENTIFIER', 'Expected "in"');
      const collection = this.parseInlineExpression();
      const body = this.parseControlFlowBody();
      return { type: 'forEach' as const, variable, collection, body } as any;
    }

    if (name === 'while') {
      this.hasControlFlow = true;
      const condition = this.parseInlineExpression();
      const body = this.parseControlFlowBody();
      return { type: 'while' as const, condition, body } as any;
    }

    if (name === 'if') {
      this.hasControlFlow = true;
      const condition = this.parseInlineExpression();
      const body = this.parseControlFlowBody();
      let elseBody: HSPlusNode[] | undefined;

      this.skipNewlines();
      if (this.check('AT')) {
        const saved = this.pos;
        this.advance();
        if (this.check('IDENTIFIER') && this.current().value === 'else') {
          this.advance();
          elseBody = this.parseControlFlowBody();
        } else {
          this.pos = saved;
        }
      }

      return { type: 'if' as const, condition, body, else: elseBody } as any;
    }

    // =========================================================================
    // Import
    // =========================================================================
    if (name === 'import') {
      if (!this.options.enableTypeScriptImports) {
        this.warn('@import is disabled');
        return null;
      }
      const path = this.expect('STRING', 'Expected import path').value;
      let alias =
        path
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '') || 'import';
      if (this.check('IDENTIFIER') && this.current().value === 'as') {
        this.advance();
        alias = this.expect('IDENTIFIER', 'Expected alias').value;
      }
      this.imports.push({ path, alias });
      return { type: 'import' as const, path, alias } as any;
    }

    // =========================================================================
    // Asset Manifest & References
    // =========================================================================
    if (name === 'manifest') {
      const manifestName = this.check('LPAREN')
        ? this.parseParenString()
        : this.expect('STRING', 'Expected manifest name').value;
      const config = this.parseBlockContent();
      return { type: 'manifest' as const, name: manifestName, ...config } as any;
    }

    if (name === 'asset') {
      const assetId = this.check('LPAREN')
        ? this.parseParenString()
        : this.expect('STRING', 'Expected asset ID').value;
      return { type: 'asset' as const, id: assetId } as any;
    }

    // =========================================================================
    // Semantic Annotations
    // =========================================================================
    if (name === 'semantic') {
      const semanticName = this.check('LPAREN')
        ? this.parseParenString()
        : this.expect('STRING', 'Expected semantic name').value;
      const config = this.parseBlockContent();
      return { type: 'semantic' as const, name: semanticName, ...config } as any;
    }

    if (name === 'annotate') {
      const annotateName = this.check('LPAREN')
        ? this.parseParenString()
        : this.expect('STRING', 'Expected annotation type').value;
      let config = {};
      if (this.check('COMMA')) {
        this.advance();
        config = this.parseValue() as Record<string, unknown>;
        // Close the paren if we're mid-expression
        if (this.check('RPAREN')) this.advance();
      } else if (this.check('RPAREN')) {
        this.advance();
      }
      return { type: 'annotate' as const, annotationType: annotateName, config } as any;
    }

    if (name === 'semantic_ref') {
      const refName = this.check('LPAREN')
        ? this.parseParenString()
        : this.expect('STRING', 'Expected semantic reference').value;
      return { type: 'semantic_ref' as const, ref: refName } as any;
    }

    if (name === 'bindings') {
      const bindings = this.parseBindingsBlock();
      return { type: 'bindings' as const, bindings } as any;
    }

    // =========================================================================
    // World Definition
    // =========================================================================
    if (name === 'world_metadata') {
      const config = this.parseBlockContent();
      return { type: 'world_metadata' as const, ...config } as any;
    }

    if (name === 'world_config') {
      const config = this.parseBlockContent();
      return { type: 'world_config' as const, ...config } as any;
    }

    if (name === 'zones') {
      const zones = this.parseNamedBlockList('zone');
      return { type: 'zones' as const, zones } as any;
    }

    if (name === 'spawn_points') {
      const spawns = this.parseNamedBlockList('spawn');
      return { type: 'spawn_points' as const, spawns } as any;
    }

    // =========================================================================
    // Environment Lighting
    // =========================================================================
    if (name === 'skybox') {
      const config = this.parseBlockContent();
      return { type: 'skybox' as const, ...config } as any;
    }

    if (name === 'ambient_light') {
      const config = this.parseBlockContent();
      return { type: 'ambient_light' as const, ...config } as any;
    }

    if (name === 'directional_light') {
      let lightName = 'default';
      if (this.check('LPAREN')) {
        lightName = this.parseParenString();
      }
      const config = this.parseBlockContent();
      return { type: 'directional_light' as const, name: lightName, ...config } as any;
    }

    if (name === 'fog') {
      const config = this.parseBlockContent();
      return { type: 'fog' as const, ...config } as any;
    }

    // =========================================================================
    // Custom Metadata Blocks
    // =========================================================================
    if (name === 'artwork_metadata') {
      const config = this.parseBlockContent();
      return { type: 'artwork_metadata' as const, ...config } as any;
    }

    if (name === 'npc_behavior') {
      const config = this.parseBlockContent();
      return { type: 'npc_behavior' as const, ...config } as any;
    }

    if (name === 'interactive') {
      const config = this.parseBlockContent();
      return { type: 'interactive' as const, ...config } as any;
    }

    if (name === 'lod') {
      const config = this.parseBlockContent();
      return { type: 'lod' as const, ...config } as any;
    }

    // =========================================================================
    // External API & AI
    // =========================================================================
    if (name === 'external_api') {
      const config: Record<string, any> = this.parseTraitConfig();
      const url = config.url || '';
      const method = config.method || 'GET';
      const interval = config.interval || '0s';

      let body: HSPlusNode[] = [];
      if (this.check('LBRACE')) {
        body = this.parseControlFlowBody();
      }

      return { type: 'external_api' as const, url, method, interval, body } as any;
    }

    if (name === 'generate') {
      const config: Record<string, any> = this.parseTraitConfig();
      const prompt = config.prompt || '';
      const context = config.context || '';
      const target = config.target || 'children';

      return { type: 'generate' as const, prompt, context, target } as any;
    }

    // =========================================================================
    // NPC & Dialog
    // =========================================================================
    if (name === 'npc') {
      const npcName = this.expect('STRING', 'Expected NPC name').value;
      const props = this.parsePropsBlock();
      return { type: 'npc' as const, name: npcName, props } as any;
    }

    if (name === 'dialog') {
      const dialogName = this.expect('STRING', 'Expected dialog name').value;
      const { props, options } = this.parseDialogBlock();
      return { type: 'dialog' as const, name: dialogName, props, options } as any;
    }

    // =========================================================================
    // Hololand Runtime Events (on @hololand.xxx)
    // =========================================================================
    if (name === 'hololand') {
      if (this.check('DOT')) {
        this.advance();
        const eventName = this.expect('IDENTIFIER', 'Expected event name').value;
        const params: string[] = [];
        if (this.check('LPAREN')) {
          this.advance();
          while (!this.check('RPAREN') && !this.check('EOF')) {
            params.push(this.expect('IDENTIFIER', 'Expected parameter').value);
            if (this.check('COMMA')) this.advance();
          }
          this.expect('RPAREN', 'Expected )');
        }
        return { type: 'hololand_event' as const, event: eventName, params } as any;
      }
    }

    // =========================================================================
    // Fallback: Unknown directive - treat as generic trait with config
    // =========================================================================
    // Check if it might be a structural directive we haven't explicitly handled
    if ((STRUCTURAL_DIRECTIVES as readonly string[]).includes(name)) {
      const config = this.check('LBRACE') ? this.parseBlockContent() : this.parseTraitConfig();
      return { type: name as any, ...config } as any;
    }

    // Unknown directive - emit warning and parse as generic trait
    if (this.options.strict) {
      this.traitError(name);
    } else {
      this.warn(`Unknown directive @${name}`);
    }

    // Parse config if present to avoid syntax errors
    let config = {};
    if (this.check('LPAREN')) {
      config = this.parseTraitConfig();
    } else if (this.check('LBRACE')) {
      config = this.parseBlockContent();
    }

    // Return as a generic trait so it appears in AST
    return { type: 'trait' as const, name: name as any, config } as any;
  }

  /**
   * Parse a string inside parentheses: ("name")
   */
  private parseParenString(): string {
    this.expect('LPAREN', 'Expected (');
    const value = this.expect('STRING', 'Expected string').value;
    this.expect('RPAREN', 'Expected )');
    return value;
  }

  /**
   * Parse block content: { key: value, ... }
   */
  private parseBlockContent(): Record<string, unknown> {
    const content: Record<string, unknown> = {};

    if (!this.check('LBRACE')) {
      return content;
    }

    this.advance(); // {
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE') || this.check('EOF')) break;

      if (this.check('IDENTIFIER')) {
        const key = this.advance().value;
        if (this.check('COLON') || this.check('EQUALS')) {
          this.advance();
          content[key] = this.parseValue();
        } else {
          content[key] = true;
        }
      } else if (this.check('AT')) {
        // Nested directive
        const directive = this.parseDirective();
        if (directive) {
          const dirKey = (directive as any).name || directive.type;
          content[`@${dirKey}`] = directive;
        }
      } else {
        this.advance(); // Skip unexpected token
      }

      if (this.check('COMMA')) this.advance();
      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected }');
    return content;
  }

  /**
   * Parse bindings block: { bind(expr) -> target, ... }
   */
  private parseBindingsBlock(): Array<{ source: string; target: string }> {
    const bindings: Array<{ source: string; target: string }> = [];

    if (!this.check('LBRACE')) {
      return bindings;
    }

    this.advance(); // {
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE') || this.check('EOF')) break;

      // Expect: bind(expr) -> target
      if (this.check('IDENTIFIER') && this.current().value === 'bind') {
        this.advance(); // bind
        if (this.check('LPAREN')) {
          this.advance(); // (
          let source = '';
          let parenDepth = 1;
          while (parenDepth > 0 && !this.check('EOF')) {
            if (this.check('LPAREN')) parenDepth++;
            if (this.check('RPAREN')) {
              parenDepth--;
              if (parenDepth === 0) break;
            }
            source += this.advance().value + ' ';
          }
          this.expect('RPAREN', 'Expected )');
          source = source.trim();

          // Expect -> or =>
          if (this.check('ARROW')) {
            this.advance();
          }

          // Parse target
          let target = '';
          while (!this.check('NEWLINE') && !this.check('RBRACE') && !this.check('EOF')) {
            target += this.advance().value;
          }
          target = target.trim();

          bindings.push({ source, target });
        }
      } else {
        // Skip line comments or other content
        while (!this.check('NEWLINE') && !this.check('RBRACE') && !this.check('EOF')) {
          this.advance();
        }
      }

      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected }');
    return bindings;
  }

  /**
   * Parse named block list: zone "name" { ... } or spawn "name" { ... }
   */
  private parseNamedBlockList(
    blockType: string
  ): Array<{ name: string; config: Record<string, unknown> }> {
    const blocks: Array<{ name: string; config: Record<string, unknown> }> = [];

    if (!this.check('LBRACE')) {
      return blocks;
    }

    this.advance(); // {
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE') || this.check('EOF')) break;

      // Expect: zone "name" { ... } or spawn "name" { ... }
      if (this.check('IDENTIFIER') && this.current().value === blockType) {
        this.advance(); // zone/spawn
        const blockName = this.expect('STRING', `Expected ${blockType} name`).value;
        const config = this.parseBlockContent();
        blocks.push({ name: blockName, config });
      } else {
        // Skip unexpected content
        this.advance();
      }

      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected }');
    return blocks;
  }

  /**
   * Parse logic block: logic { function..., on_tick..., on_scene_load... }
   */
  private parseLogicBlock(): {
    functions: Array<{ name: string; params: string[]; body: string }>;
    eventHandlers: Array<{ event: string; params: string[]; body: string }>;
    tickHandlers: Array<{ interval: number; body: string }>;
  } {
    const result = {
      functions: [] as Array<{ name: string; params: string[]; body: string }>,
      eventHandlers: [] as Array<{ event: string; params: string[]; body: string }>,
      tickHandlers: [] as Array<{ interval: number; body: string }>,
    };

    if (!this.check('LBRACE')) {
      return result;
    }

    this.advance(); // {
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE') || this.check('EOF')) break;

      if (this.check('IDENTIFIER')) {
        const keyword = this.current().value;

        // Parse function definition
        if (keyword === 'function') {
          this.advance(); // function
          const funcName = this.expect('IDENTIFIER', 'Expected function name').value;
          const params: string[] = [];

          if (this.check('LPAREN')) {
            this.advance();
            while (!this.check('RPAREN') && !this.check('EOF')) {
              params.push(this.expect('IDENTIFIER', 'Expected parameter').value);
              if (this.check('COMMA')) this.advance();
            }
            this.expect('RPAREN', 'Expected )');
          }

          const body = this.parseCodeBlock();
          result.functions.push({ name: funcName, params, body });
        }
        // Parse on_tick handler
        else if (keyword === 'on_tick') {
          this.advance(); // on_tick
          let interval = 1.0;

          if (this.check('LPAREN')) {
            this.advance();
            const intervalToken = this.expect('NUMBER', 'Expected interval');
            interval = parseFloat(intervalToken.value);
            this.expect('RPAREN', 'Expected )');
          }

          const body = this.parseCodeBlock();
          result.tickHandlers.push({ interval, body });
        }
        // Parse on_scene_load handler
        else if (keyword === 'on_scene_load') {
          this.advance(); // on_scene_load
          const body = this.parseCodeBlock();
          result.eventHandlers.push({ event: 'scene_load', params: [], body });
        }
        // Parse on <event> handler
        else if (keyword === 'on') {
          this.advance(); // on
          let eventName = '';

          // Handle @hololand.event_name(params) or just event_name
          if (this.check('AT')) {
            this.advance(); // @
            eventName = this.expect('IDENTIFIER', 'Expected event namespace').value;
            if (this.check('DOT')) {
              this.advance();
              eventName += '.' + this.expect('IDENTIFIER', 'Expected event name').value;
            }
          } else {
            eventName = this.expect('IDENTIFIER', 'Expected event name').value;
          }

          const params: string[] = [];
          if (this.check('LPAREN')) {
            this.advance();
            while (!this.check('RPAREN') && !this.check('EOF')) {
              params.push(this.expect('IDENTIFIER', 'Expected parameter').value);
              if (this.check('COMMA')) this.advance();
            }
            this.expect('RPAREN', 'Expected )');
          }

          const body = this.parseCodeBlock();
          result.eventHandlers.push({ event: eventName, params, body });
        }
        // Skip other identifiers (might be comments or unknown constructs)
        else {
          // Try to skip until next meaningful construct
          while (!this.check('RBRACE') && !this.check('EOF') && !this.check('NEWLINE')) {
            this.advance();
          }
        }
      } else {
        // Skip non-identifier tokens
        this.advance();
      }

      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected }');
    return result;
  }

  /**
   * Parse environment block with lighting directives
   */
  private parseEnvironmentBlock(): {
    properties: Record<string, unknown>;
    directives: HSPlusDirective[];
  } {
    const properties: Record<string, unknown> = {};
    const directives: HSPlusDirective[] = [];

    if (!this.check('LBRACE')) {
      return { properties, directives };
    }

    this.advance(); // {
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE') || this.check('EOF')) break;

      if (this.check('AT')) {
        // Environment directive like @skybox, @ambient_light, etc.
        const directive = this.parseDirective();
        if (directive) {
          directives.push(directive);
        }
      } else if (this.check('IDENTIFIER')) {
        // Simple property like skybox: "value"
        const key = this.advance().value;
        if (this.check('COLON') || this.check('EQUALS')) {
          this.advance();
          properties[key] = this.parseValue();
        } else {
          properties[key] = true;
        }
      } else {
        this.advance();
      }

      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected }');
    return { properties, directives };
  }

  private parsePropsBlock(): Record<string, unknown> {
    this.skipNewlines();
    const props: Record<string, unknown> = {};
    if (this.check('LBRACE')) {
      this.advance();
      this.skipNewlines();
      while (!this.check('RBRACE') && !this.check('EOF')) {
        const key = this.expect('IDENTIFIER', 'Expected property name').value;
        if (this.check('COLON') || this.check('EQUALS')) {
          this.advance();
          props[key] = this.parseValue();
        } else {
          props[key] = true;
        }
        this.skipNewlines();
      }
      this.expect('RBRACE', 'Expected }');
    }
    return props;
  }

  private parseDialogBlock(): { props: Record<string, any>; options: any[] } {
    this.skipNewlines();
    const props: Record<string, any> = {};
    const options: any[] = [];

    if (this.check('LBRACE')) {
      this.advance();
      this.skipNewlines();

      while (!this.check('RBRACE') && !this.check('EOF')) {
        if (this.check('IDENTIFIER') && this.current().value === 'option') {
          this.advance(); // consume 'option'
          const text = this.expect('STRING', 'Expected option text').value;
          this.expect('ARROW', 'Expected ->');
          let target: any;
          if (this.check('AT')) {
            // @close or @trigger
            const d = this.parseDirective();
            target = { type: 'directive', value: d };
          } else {
            target = this.expect('STRING', 'Expected target ID').value;
          }
          options.push({ text, target });
        } else {
          // Normal property
          const key = this.expect('IDENTIFIER', 'Expected property name').value;
          if (this.check('COLON') || this.check('EQUALS')) {
            this.advance();
            props[key] = this.parseValue();
          } else {
            props[key] = true;
          }
        }
        this.skipNewlines();
      }
      this.expect('RBRACE', 'Expected }');
    }
    return { props, options };
  }

  private parseTraitConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    if (this.check('LPAREN')) {
      this.advance();
      this.skipNewlines();

      while (!this.check('RPAREN') && !this.check('EOF')) {
        this.skipNewlines();
        if (this.check('RPAREN') || this.check('EOF')) break;
        if (!this.check('IDENTIFIER')) {
          this.advance();
          continue;
        }

        const key = this.expect('IDENTIFIER', 'Expected property name').value;
        if (this.check('COLON') || this.check('EQUALS')) {
          this.advance();
          config[key] = this.parseValue();
        } else {
          config[key] = true;
        }
        if (this.check('COMMA')) this.advance();
        this.skipNewlines();
      }
      this.expect('RPAREN', 'Expected )');
    }

    return config;
  }

  private parseStateBlock(): Record<string, any> {
    const state: Record<string, any> = {};

    if (this.check('LBRACE')) {
      this.advance();
      this.skipNewlines();

      while (!this.check('RBRACE') && !this.check('EOF')) {
        const key = this.expect('IDENTIFIER', 'Expected state variable name').value;
        if (this.check('COLON') || this.check('EQUALS')) {
          this.advance();
          state[key] = this.parseValue();
        } else {
          state[key] = true;
        }
        this.skipNewlines();
      }
      this.expect('RBRACE', 'Expected }');
    }
    return state;
  }

  /**
   * Parse spatial state machine (Phase 13)
   */
  private parseStateMachine(): HSPlusNode {
    const startToken = this.current();
    if (startToken.type === 'STATE_MACHINE') {
      this.advance(); // state_machine
    }
    
    const name = this.expect('IDENTIFIER', 'Expected state machine name').value;
    const states: any[] = [];
    const transitions: any[] = [];
    let initialState = '';

    this.expect('LBRACE', 'Expected { after state machine name');
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE') || this.check('EOF')) break;

      const current = this.current();
      if (current.type === 'INITIAL' || current.value === 'initial') {
        this.advance();
        this.expect('COLON', 'Expected : after initial');
        initialState = this.expect('STRING', 'Expected initial state name').value;
      } else if (current.type === 'STATE' || current.value === 'state') {
        states.push(this.parseStateNode());
      } else if (current.type === 'TRANSITION' || current.value === 'transitions') {
        transitions.push(...this.parseTransitionsBlock());
      } else {
        // Skip unknown
        this.advance();
      }
      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected } at end of state machine');

    return {
      type: 'state-machine' as any,
      name,
      initialState,
      states,
      transitions,
      loc: {
        start: { line: startToken.line, column: startToken.column },
        end: { line: this.current().line, column: this.current().column },
      },
    } as any;
  }

  private parseStateNode(): any {
    this.advance(); // state
    const name = this.expect('IDENTIFIER', 'Expected state name').value;
    let onEntry: string | undefined;
    let onExit: string | undefined;

    this.expect('LBRACE', 'Expected { after state name');
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE') || this.check('EOF')) break;

      const current = this.current();
      if (current.type === 'ON_ENTRY' || current.value === 'on_entry') {
        this.advance();
        onEntry = this.parseCodeBlock();
      } else if (current.type === 'ON_EXIT' || current.value === 'on_exit') {
        this.advance();
        onExit = this.parseCodeBlock();
      } else {
        this.advance();
      }
      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected }');
    return { name, onEntry, onExit };
  }

  private parseTransitionsBlock(): any[] {
    const transitions: any[] = [];
    this.advance(); // transitions
    this.expect('LBRACE', 'Expected {');
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE') || this.check('EOF')) break;

      // from_state -> to_state: event
      const from = this.expect('IDENTIFIER', 'Expected source state').value;
      this.expect('ARROW', 'Expected ->');
      const to = this.expect('IDENTIFIER', 'Expected target state').value;
      this.expect('COLON', 'Expected :');
      const event = this.expect('IDENTIFIER', 'Expected event name').value;

      transitions.push({ from, to, event });
      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected }');
    return transitions;
  }

  private parseControlFlowBody(): HSPlusNode[] {
    const nodes: HSPlusNode[] = [];

    if (this.check('LBRACE')) {
      this.advance();
      this.skipNewlines();

      while (!this.check('RBRACE') && !this.check('EOF')) {
        this.skipNewlines();
        if (this.check('RBRACE') || this.check('EOF')) break;

        if (this.check('AT')) {
          const directive = this.parseDirective();
          if (directive) {
            // Check if it's a structural directive (flow control) or an attached directive
            if (
              directive.type === 'for' ||
              directive.type === 'while' ||
              directive.type === 'if' ||
              directive.type === 'forEach'
            ) {
              // Structural directives can stand alone in a block
              // We wrap them in a fragment to satisfy the HSPlusNode requirements if needed,
              // but the parser should ideally handle them as first-class citizens.
              // For compatibility with return type HSPlusNode[], we wrap.
              nodes.push({
                type: 'fragment' as any,
                directives: [directive],
                children: [],
                traits: new Map(),
                properties: {},
              } as any);
            } else if (directive.type === 'trait') {
              // A lone trait in a block - attach to next node if possible,
              // or handle as standalone. For now, we skip or wrap.
              this.warn(`Standalone trait @${directive.name} in block`);
            } else {
              // Other directives (npc, dialog, external_api)
              nodes.push({
                type: 'fragment' as any,
                directives: [directive],
                children: [],
                traits: new Map(),
                properties: {},
              } as any);
            }
          }
        } else if (this.check('IDENTIFIER')) {
          nodes.push(this.parseNode());
        } else {
          // Skip unexpected tokens to prevent infinite loops
          this.advance();
        }
        this.skipNewlines();
      }

      this.expect('RBRACE', 'Expected }');
    }

    return nodes;
  }

  private parseCodeBlock(): string {
    let code = '';
    let braceDepth = 0;

    if (this.check('LBRACE')) {
      this.advance();
      braceDepth = 1;
      
      try {
        while (braceDepth > 0 && !this.check('EOF')) {
          const token = this.advance();
          if (token.type === 'LBRACE') {
            braceDepth++;
            code += '{';
          } else if (token.type === 'RBRACE') {
            braceDepth--;
            if (braceDepth > 0) {
              code += '}';
            }
          } else if (token.type === 'STRING') {
            code += `"${token.value}"`;
            code += ' ';
          } else {
            code += token.value;
            if (token.type === 'NEWLINE') {
              code += '\n';
            } else {
              code += ' ';
            }
          }
        }
      } catch (e: any) {
        if (e.message !== 'ParseError') console.error(e);
        this.synchronize();
      }
    }
    return code.trim();
  }

  private parseInlineExpression(): string {
    let expr = '';

    while (!this.check('NEWLINE') && !this.check('LBRACE') && !this.check('EOF')) {
      const token = this.advance();
      expr += token.value + ' ';
    }

    return expr.trim();
  }

  private parseValue(): unknown {
    const token = this.current();

    if (token.type === 'STRING') {
      this.advance();
      return token.value;
    }

    if (token.type === 'NUMBER') {
      this.advance();
      const match = token.value.match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(.*)?$/i);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2];
        if (unit) {
          return `${num}${unit}`;
        }
        return num;
      }
      return parseFloat(token.value);
    }

    if (token.type === 'BOOLEAN') {
      this.advance();
      return token.value === 'true';
    }

    if (token.type === 'NULL') {
      this.advance();
      return null;
    }

    if (token.type === 'EXPRESSION') {
      this.advance();
      const exprId = `expr_${this.compiledExpressions.size}`;
      this.compiledExpressions.set(exprId, token.value);
      return { __expr: exprId, __raw: token.value };
    }

    if (token.type === 'LBRACKET') {
      return this.parseArray();
    }

    if (token.type === 'LBRACE') {
      return this.parseObject();
    }

    if (token.type === 'IDENTIFIER') {
      this.advance();
      return { __ref: token.value };
    }

    // CRITICAL: Advance to prevent infinite loop
    this.advance();
    return null;
  }

  private parseArray(): unknown[] {
    const arr: unknown[] = [];
    this.expect('LBRACKET', 'Expected [');
    this.skipNewlines();

    while (!this.check('RBRACKET') && !this.check('EOF')) {
      const beforePos = this.pos;
      this.skipNewlines();

      // Prevent infinite loop - if we can't parse anything, skip the token
      if (this.check('RBRACKET') || this.check('EOF')) break;

      const value = this.parseValue();
      if (value !== null) {
        arr.push(value);
      } else if (this.pos === beforePos) {
        // No progress made, skip this token to prevent infinite loop
        this.advance();
      }

      if (this.check('COMMA')) this.advance();
      this.skipNewlines();
    }

    this.expect('RBRACKET', 'Expected ]');
    return arr;
  }

  private parseObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    this.expect('LBRACE', 'Expected {');
    this.skipNewlines();

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();

      // Prevent infinite loop - exit if we hit unexpected token
      if (this.check('RBRACE') || this.check('EOF')) break;
      if (!this.check('IDENTIFIER')) {
        // Skip unexpected token
        this.advance();
        continue;
      }

      const key = this.expect('IDENTIFIER', 'Expected property name').value;
      if (this.check('COLON') || this.check('EQUALS')) {
        this.advance();
        obj[key] = this.parseValue();
      } else {
        obj[key] = true;
      }
      if (this.check('COMMA')) this.advance();
      this.skipNewlines();
    }

    this.expect('RBRACE', 'Expected }');
    return obj;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '', line: 0, column: 0 };
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private advance(): Token {
    const token = this.current();
    if (this.pos < this.tokens.length) {
      this.pos++;
    }
    return token;
  }

  private match(types: TokenType[]): Token | null {
    for (const type of types) {
      if (this.check(type)) {
        return this.advance();
      }
    }
    return null;
  }

  private expect(type: TokenType, message: string): Token {
    if (!this.check(type)) {
      const current = this.current();
      const fullMessage = `${message}. Got ${current.type} "${current.value}"`;

      // Try to provide a suggestion if the token looks like a typo
      if (current.type === 'IDENTIFIER' && type === 'IDENTIFIER') {
        const similar = findSimilarKeyword(current.value);
        if (similar) {
          this.errorWithSuggestion(fullMessage, `Did you mean '${similar}'?`, 'HSP002');
        } else {
          this.error(fullMessage, 'HSP002');
        }
      } else {
        this.error(fullMessage, 'HSP001');
      }

      // If it's a major structure failure, synchronize
      if (type === 'RBRACE' || type === 'LBRACE' || type === 'IDENTIFIER') {
        this.synchronize();
      }

      return current;
    }
    return this.advance();
  }

  private skipNewlines(): void {
    while (this.check('NEWLINE') || this.check('INDENT') || this.check('DEDENT')) {
      this.advance();
    }
  }

  private error(message: string, code: ErrorCode = 'HSP001'): void {
    const token = this.current();
    const line = token.line;
    const column = token.column;

    // Try to find a suggestion for common mistakes
    let suggestion: string | undefined;
    if (token.type === 'IDENTIFIER') {
      const similar = findSimilarKeyword(token.value);
      if (similar) {
        suggestion = `Did you mean '${similar}'?`;
      }
    }

    this.errors.push(
      createRichError(code, message, line, column, {
        source: this.source,
        suggestion,
        severity: 'error',
      })
    );
  }

  private errorWithSuggestion(
    message: string,
    suggestion: string,
    code: ErrorCode = 'HSP001'
  ): void {
    const token = this.current();
    this.errors.push(
      createRichError(code, message, token.line, token.column, {
        source: this.source,
        suggestion,
        severity: 'error',
      })
    );
  }

  private traitError(traitName: string): void {
    const token = this.current();
    this.errors.push(createTraitError(traitName, token.line, token.column, this.source));
  }

  private warn(message: string, code: ErrorCode = 'HSP001'): void {
    const token = this.current();
    this.warnings.push(
      createRichError(code, message, token.line, token.column, {
        source: this.source,
        severity: 'warning',
      })
    );
  }

  /**
   * Synchronize parser state after an error
   * Skips tokens until a potential recovery point (newline followed by keyword/directive)
   */
  private synchronize(): void {
    this.advance();

    while (!this.check('EOF')) {
      if (this.check('RBRACE')) {
        return;
      }
      
      // Stop at major keywords that indicate start of a new definition
      if (
        this.check('IDENTIFIER') && 
        ['orb', 'template', 'logic', 'object', 'composition', 'scene', 'group'].includes(this.current().value)
      ) {
        return;
      }

      // Stop at explicit checks if we supported semicolons, but we rely on blocks mostly.
      // We can also stop at AT directives as they often preceded definitions
      if (this.check('AT')) {
        return;
      }

      this.advance();
    }
  }

  /**
   * Helper to check if a token is likely the start of a value
   */
  private isLikelyValue(token: Token): boolean {
    return (
      token.type === 'STRING' ||
      token.type === 'NUMBER' ||
      token.type === 'LBRACKET' ||
      token.type === 'LBRACE' ||
      token.type === 'BOOLEAN' ||
      token.type === 'NULL' ||
      token.type === 'TEMPLATE_STRING'
    );
  }
}

export function createParser(options?: HSPlusParserOptions): HoloScriptPlusParser {
  return new HoloScriptPlusParser(options);
}

export function parse(source: string, options?: HSPlusParserOptions): HSPlusCompileResult {
  const parser = createParser(options);
  return parser.parse(source);
}
