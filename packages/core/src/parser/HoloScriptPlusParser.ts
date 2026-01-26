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

import { VR_TRAITS, LIFECYCLE_HOOKS } from '../constants';

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

      // Expression interpolation ${...}
      if (char === '$' && this.peek(1) === '{') {
        this.tokens.push(this.readExpression());
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
  private errors: Array<{ message: string; line: number; column: number }> = [];
  private warnings: Array<{ message: string; line: number; column: number }> = [];
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
      success: true,
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

  private parseDocument(): HSPlusNode {
    this.skipNewlines();

    const topLevelNodes: HSPlusNode[] = [];
    const globalDirectives: HSPlusDirective[] = [];

    while (!this.check('EOF')) {
      const currentDirectives: HSPlusDirective[] = [];
      
      // 1. Collect directives
      while (this.check('AT')) {
        const directive = this.parseDirective();
        if (directive) {
          currentDirectives.push(directive);
        }
        this.skipNewlines();
      }

      // 2. Parse node if present
      if (this.check('IDENTIFIER')) {
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
            this.synchronize();
          }
        } else if (!this.check('EOF')) {
          // No directives, no node, but not EOF
          this.error(`Unexpected token ${this.current().type} at top level`);
          this.synchronize();
        }
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

    const type = this.expect('IDENTIFIER', 'Expected element type').value;

    let id: string | undefined;
    if (this.check('HASH')) {
      this.advance();
      id = this.expect('IDENTIFIER', 'Expected ID after #').value;
    }

    const properties: Record<string, unknown> = {};
    const directives: HSPlusDirective[] = [];
    const traits = new Map<VRTraitName, unknown>();
    
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

    const children: HSPlusNode[] = [];
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
        } else if (this.check('IDENTIFIER')) {
          const saved = this.pos;
          const name = this.advance().value;

          if (this.check('COLON') || this.check('EQUALS')) {
            this.advance();
            properties[name] = this.parseValue();
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
            this.error(`Unexpected token ${this.current().type} "${this.current().value}" in node body`);
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

    if ((VR_TRAITS as readonly string[]).includes(name)) {
      if (!this.options.enableVRTraits) {
        this.warn(`VR trait @${name} is disabled`);
        return null;
      }
      const config = this.parseTraitConfig();
      return { type: 'trait' as const, name: name as VRTraitName, config } as any;
    }

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

    if (name === 'state') {
      this.hasState = true;
      const body = this.parseStateBlock();
      return { type: 'state' as const, body } as any;
    }

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

    if (name === 'import') {
      if (!this.options.enableTypeScriptImports) {
        this.warn('@import is disabled');
        return null;
      }
      const path = this.expect('STRING', 'Expected import path').value;
      let alias = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'import';
      if (this.check('IDENTIFIER') && this.current().value === 'as') {
        this.advance();
        alias = this.expect('IDENTIFIER', 'Expected alias').value;
      }
      this.imports.push({ path, alias });
      return { type: 'import' as const, path, alias } as any;
    }

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

    if (this.options.strict) {
      this.error(`Unknown directive @${name}`);
    } else {
      this.warn(`Unknown directive @${name}`);
    }
    
    // Parse config if present to avoid syntax errors
    let config = {};
    if (this.check('LPAREN')) {
      config = this.parseTraitConfig();
    }
    
    // Return as a generic trait so it appears in AST
    return { type: 'trait' as const, name: name as any, config } as any;
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
          state[key] = null;
        }
        this.skipNewlines();
      }

      this.expect('RBRACE', 'Expected }');
    }

    return state;
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
            if (directive.type === 'for' || directive.type === 'while' || directive.type === 'if' || directive.type === 'forEach') {
               // Structural directives can stand alone in a block
               // We wrap them in a fragment to satisfy the HSPlusNode requirements if needed,
               // but the parser should ideally handle them as first-class citizens.
               // For compatibility with return type HSPlusNode[], we wrap.
               nodes.push({
                 type: 'fragment' as any,
                 directives: [directive],
                 children: [],
                 traits: new Map(),
                 properties: {}
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
                 properties: {}
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
        } else {
          code += token.value;
          if (token.type === 'NEWLINE') {
            code += '\n';
          } else {
            code += ' ';
          }
        }
      }
    }
    return code.trim();
  }

  private parseInlineExpression(): string {
    let expr = '';

    while (
      !this.check('NEWLINE') &&
      !this.check('LBRACE') &&
      !this.check('EOF')
    ) {
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

  private expect(type: TokenType, message: string): Token {
    if (!this.check(type)) {
      this.error(`${message}. Got ${this.current().type} "${this.current().value}"`);
      
      // If it's a major structure failure, synchronize
      if (type === 'RBRACE' || type === 'LBRACE' || type === 'IDENTIFIER') {
        this.synchronize();
      }
      
      return this.current();
    }
    return this.advance();
  }

  private skipNewlines(): void {
    while (this.check('NEWLINE') || this.check('INDENT') || this.check('DEDENT')) {
      this.advance();
    }
  }

  private error(message: string): void {
    const token = this.current();
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
    });
  }

  private warn(message: string): void {
    const token = this.current();
    this.warnings.push({
      message,
      line: token.line,
      column: token.column,
    });
  }

  /**
   * Synchronize parser state after an error
   * Skips tokens until a potential recovery point (newline followed by keyword/directive)
   */
  private synchronize(): void {
    this.advance();

    while (!this.check('EOF')) {
      if (this.check('IDENTIFIER') || this.check('AT')) {
        return;
      }

      if (this.check('RBRACE')) {
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
