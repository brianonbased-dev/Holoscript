/**
 * HoloScript Code Parser
 *
 * Parses HoloScript code strings into AST nodes that can be executed
 * by the HoloScriptRuntime.
 *
 * Syntax Reference:
 * - orb <name> { properties }
 * - function <name>(<params>): <return> { body }
 * - connect <from> to <to> [as <type>]
 * - gate <name> { condition, true_path, false_path }
 * - stream <name> from <source> { transformations }
 */

import { logger } from './logger';
import type {
  ASTNode,
  OrbNode,
  MethodNode,
  ParameterNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  SpatialPosition,
  HologramProperties,
  ForLoopNode,
  WhileLoopNode,
  ForEachLoopNode,
  ImportNode,
  ExportNode,
  VariableDeclarationNode,
  ScaleNode,
  FocusNode,
  EnvironmentNode,
  TemplateNode,
  HoloScriptValue,
} from './types';

// Security configuration
const CODE_SECURITY_CONFIG = {
  maxCodeLength: 50000,
  maxBlocks: 100,
  maxNestingDepth: 10,
  suspiciousKeywords: [
    'process', 'require', 'eval', 'import', 'constructor',
    'prototype', '__proto__', 'fs', 'child_process', 'exec', 'spawn',
  ],
};

export interface ParseResult {
  success: boolean;
  ast: ASTNode[];
  errors: ParseError[];
  warnings: string[];
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

interface Token {
  type: 'keyword' | 'identifier' | 'number' | 'string' | 'operator' | 'punctuation' | 'newline';
  value: string;
  line: number;
  column: number;
}

export class HoloScriptCodeParser {
  private errors: ParseError[] = [];
  private warnings: string[] = [];
  private tokens: Token[] = [];
  private position: number = 0;
  private keywordSet: Set<string>;

  constructor() {
    // Pre-compute keyword set for O(1) lookup instead of O(n) array search
    this.keywordSet = new Set([
      'orb', 'function', 'connect', 'to', 'as', 'gate', 'stream', 'from', 'through', 'return',
      'if', 'else', 'nexus', 'building', 'pillar', 'foundation',
      'for', 'while', 'forEach', 'in', 'of', 'break', 'continue',
      'import', 'export', 'module', 'use',
      'type', 'interface', 'extends', 'implements',
      'async', 'await', 'spawn', 'parallel',
      'class', 'new', 'this', 'super', 'static', 'private', 'public',
      'try', 'catch', 'finally', 'throw',
      'const', 'let', 'var',
      'animate', 'modify', 'pulse', 'move', 'show', 'hide',
      'scale', 'focus', 'environment', 'composition', 'template'
    ]);
  }

  /**
   * Parse HoloScript code string into AST
   */
  parse(code: string): ParseResult {
    this.errors = [];
    this.warnings = [];
    this.tokens = [];
    this.position = 0;

    // Security: Check code length
    if (code.length > CODE_SECURITY_CONFIG.maxCodeLength) {
      return {
        success: false,
        ast: [],
        errors: [{ line: 0, column: 0, message: `Code exceeds max length (${CODE_SECURITY_CONFIG.maxCodeLength})` }],
        warnings: [],
      };
    }

    // Security: Check for suspicious keywords
    for (const keyword of CODE_SECURITY_CONFIG.suspiciousKeywords) {
      if (code.toLowerCase().includes(keyword)) {
        logger.warn('Suspicious keyword detected', { keyword });
        return {
          success: false,
          ast: [],
          errors: [{ line: 0, column: 0, message: `Suspicious keyword detected: ${keyword}` }],
          warnings: [],
        };
      }
    }

    try {
      // Tokenize
      this.tokens = this.tokenize(code);

      // Parse tokens into AST
      const ast = this.parseProgram();

      return {
        success: this.errors.length === 0,
        ast,
        errors: this.errors,
        warnings: this.warnings,
      };
    } catch (error) {
      return {
        success: false,
        ast: [],
        errors: [{ line: 0, column: 0, message: String(error) }],
        warnings: this.warnings,
      };
    }
  }

  /**
   * Tokenize code into tokens
   */
  private tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let line = 1;
    let column = 1;
    let i = 0;

    while (i < code.length) {
      const char = code[i];

      // Skip whitespace (except newlines)
      if (char === ' ' || char === '\t' || char === '\r') {
        i++;
        column++;
        continue;
      }

      // Newline
      if (char === '\n') {
        tokens.push({ type: 'newline', value: '\n', line, column });
        line++;
        column = 1;
        i++;
        continue;
      }

      // Comments (skip)
      if (char === '/' && code[i + 1] === '/') {
        while (i < code.length && code[i] !== '\n') {
          i++;
        }
        continue;
      }

      // String
      if (char === '"' || char === "'") {
        const quote = char;
        let str = '';
        const startCol = column;
        i++;
        column++;

        while (i < code.length && code[i] !== quote) {
          if (code[i] === '\\' && i + 1 < code.length) {
            str += code[i + 1];
            i += 2;
            column += 2;
          } else {
            str += code[i];
            i++;
            column++;
          }
        }

        i++; // Skip closing quote
        column++;

        tokens.push({ type: 'string', value: str, line, column: startCol });
        continue;
      }

      // Number
      if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(code[i + 1]))) {
        let num = '';
        const startCol = column;

        while (i < code.length && /[0-9.\-]/.test(code[i])) {
          num += code[i];
          i++;
          column++;
        }

        tokens.push({ type: 'number', value: num, line, column: startCol });
        continue;
      }

      // Identifier or keyword
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        const startCol = column;

        while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
          ident += code[i];
          i++;
          column++;
        }

        const isKeyword = this.keywordSet.has(ident.toLowerCase());
        tokens.push({
          type: isKeyword ? 'keyword' : 'identifier',
          value: ident,
          line,
          column: startCol,
        });
        continue;
      }

      // Multi-character operators (must check before single-char)
      const multiCharOps = ['===', '!==', '==', '!=', '>=', '<=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '=>', '->'];
      let foundMultiOp = false;
      for (const op of multiCharOps) {
        if (code.substring(i, i + op.length) === op) {
          tokens.push({ type: 'operator', value: op, line, column });
          i += op.length;
          column += op.length;
          foundMultiOp = true;
          break;
        }
      }
      if (foundMultiOp) continue;

      // Operators and punctuation
      const punctuation = ['{', '}', '(', ')', '[', ']', ':', ',', '.', ';', '=', '<', '>', '+', '-', '*', '/', '%', '!', '&', '|', '?'];
      if (punctuation.includes(char)) {
        tokens.push({ type: 'punctuation', value: char, line, column });
        i++;
        column++;
        continue;
      }

      // Unknown character - skip
      i++;
      column++;
    }

    return tokens;
  }

  /**
   * Parse program (list of declarations)
   */
  private parseProgram(): ASTNode[] {
    const nodes: ASTNode[] = [];
    let blockCount = 0;

    while (this.position < this.tokens.length) {
      // Skip newlines
      while (this.currentToken()?.type === 'newline') {
        this.advance();
      }

      if (this.position >= this.tokens.length) break;

      // Security: limit blocks
      blockCount++;
      if (blockCount > CODE_SECURITY_CONFIG.maxBlocks) {
        this.errors.push({ line: 0, column: 0, message: 'Too many blocks in program' });
        break;
      }

      const node = this.parseDeclaration();
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Parse a single declaration
   */
  private parseDeclaration(): ASTNode | null {
    const token = this.currentToken();
    if (!token) return null;

    if (token.type === 'keyword') {
      switch (token.value.toLowerCase()) {
        case 'orb':
          return this.parseOrb();
        case 'function':
          return this.parseFunction();
        case 'connect':
          return this.parseConnection();
        case 'gate':
        case 'if':
          return this.parseGate();
        case 'stream':
          return this.parseStream();
        case 'nexus':
          return this.parseNexus();
        case 'building':
        case 'class':
          return this.parseBuilding();
        // Phase 2: Loop constructs
        case 'for':
          return this.parseForLoop();
        case 'while':
          return this.parseWhileLoop();
        case 'foreach':
          return this.parseForEachLoop();
        // Phase 2: Module system
        case 'import':
          return this.parseImport();
        case 'export':
          return this.parseExport();
        // Phase 2: Variable declarations
        // UI Extensions
        case 'ui2d':
        case 'card':
        case 'metric':
        case 'button':
        case 'row':
        case 'col':
        case 'text':
           return this.parseUIElement();
        case 'const':
        case 'let':
        case 'var':
          return this.parseVariableDeclaration();
        // DSL-first commands (Phase 54)
        case 'animate':
          return this.parseAnimate();
        case 'modify':
          return this.parseModify();
        case 'scale':
          return this.parseScale();
        case 'focus':
          return this.parseFocus();
        case 'environment':
          return this.parseEnvironment();
        case 'composition':
          return this.parseComposition();
        case 'template':
          return this.parseTemplate();
        default:
          this.advance();
          return null;
      }
    }

    // Skip unrecognized tokens
    this.advance();
    return null;
  }

  /**
   * Parse for loop: for (init; condition; update) { body }
   */
  private parseForLoop(): ForLoopNode | null {
    this.expect('keyword', 'for');

    if (!this.check('punctuation', '(')) {
      this.errors.push({ line: 0, column: 0, message: 'Expected ( after for' });
      return null;
    }
    this.advance();

    // Parse init, condition, update (simplified - collect as strings)
    let init = '', condition = '', update = '';
    let depth = 0;

    // Parse init (until first ;)
    while (this.position < this.tokens.length) {
      const t = this.currentToken();
      if (!t) break;
      if (t.value === ';' && depth === 0) { this.advance(); break; }
      if (t.value === '(') depth++;
      if (t.value === ')') depth--;
      init += t.value + ' ';
      this.advance();
    }

    // Parse condition (until second ;)
    depth = 0;
    while (this.position < this.tokens.length) {
      const t = this.currentToken();
      if (!t) break;
      if (t.value === ';' && depth === 0) { this.advance(); break; }
      if (t.value === '(') depth++;
      if (t.value === ')') depth--;
      condition += t.value + ' ';
      this.advance();
    }

    // Parse update (until ))
    depth = 0;
    while (this.position < this.tokens.length) {
      const t = this.currentToken();
      if (!t) break;
      if (t.value === ')' && depth === 0) { this.advance(); break; }
      if (t.value === '(') depth++;
      if (t.value === ')') depth--;
      update += t.value + ' ';
      this.advance();
    }

    // Parse body
    const body: ASTNode[] = [];
    if (this.check('punctuation', '{')) {
      this.advance();
      let braceDepth = 1;
      while (braceDepth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) braceDepth++;
        if (this.check('punctuation', '}')) braceDepth--;
        this.advance();
      }
    }

    return {
      type: 'for-loop',
      init: init.trim(),
      condition: condition.trim(),
      update: update.trim(),
      body,
      position: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Parse while loop: while (condition) { body }
   */
  private parseWhileLoop(): WhileLoopNode | null {
    this.expect('keyword', 'while');

    let condition = '';
    if (this.check('punctuation', '(')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        const t = this.currentToken();
        if (!t) break;
        if (t.value === '(') depth++;
        if (t.value === ')') { depth--; if (depth === 0) { this.advance(); break; } }
        condition += t.value + ' ';
        this.advance();
      }
    }

    // Parse body
    if (this.check('punctuation', '{')) {
      this.advance();
      let braceDepth = 1;
      while (braceDepth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) braceDepth++;
        if (this.check('punctuation', '}')) braceDepth--;
        this.advance();
      }
    }

    return {
      type: 'while-loop',
      condition: condition.trim(),
      body: [],
      position: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Parse forEach loop: forEach item in collection { body }
   */
  private parseForEachLoop(): ForEachLoopNode | null {
    this.expect('keyword', 'forEach');

    const variable = this.expectIdentifier();
    this.expect('keyword', 'in');
    const collection = this.expectIdentifier();

    // Parse body
    if (this.check('punctuation', '{')) {
      this.advance();
      let braceDepth = 1;
      while (braceDepth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) braceDepth++;
        if (this.check('punctuation', '}')) braceDepth--;
        this.advance();
      }
    }

    return {
      type: 'foreach-loop',
      variable: variable || 'item',
      collection: collection || 'items',
      body: [],
      position: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Parse import: import { x, y } from "module"
   */
  private parseImport(): ImportNode | null {
    this.expect('keyword', 'import');

    const imports: string[] = [];
    let modulePath = '';
    let defaultImport: string | undefined;

    // Check for default import or named imports
    if (this.check('punctuation', '{')) {
      this.advance();
      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        const name = this.expectIdentifier();
        if (name) imports.push(name);
        if (this.check('punctuation', ',')) this.advance();
      }
      this.expect('punctuation', '}');
    } else {
      // Default import
      defaultImport = this.expectIdentifier() || undefined;
    }

    // from "module"
    if (this.check('keyword', 'from')) {
      this.advance();
      const pathToken = this.currentToken();
      if (pathToken?.type === 'string') {
        modulePath = pathToken.value;
        this.advance();
      }
    }

    return {
      type: 'import',
      imports,
      defaultImport,
      modulePath,
      position: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Parse export: export { x, y } or export function/orb
   */
  private parseExport(): ExportNode | null {
    this.expect('keyword', 'export');

    // Check if exporting a declaration
    const next = this.currentToken();
    if (next?.type === 'keyword') {
      const declaration = this.parseDeclaration();
      return {
        type: 'export',
        declaration: declaration || undefined,
        position: { x: 0, y: 0, z: 0 },
      };
    }

    // Named exports
    const exports: string[] = [];
    if (this.check('punctuation', '{')) {
      this.advance();
      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        const name = this.expectIdentifier();
        if (name) exports.push(name);
        if (this.check('punctuation', ',')) this.advance();
      }
      this.expect('punctuation', '}');
    }

    return {
      type: 'export',
      exports,
      position: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Parse variable declaration: const/let/var name = value
   */
  private parseVariableDeclaration(): VariableDeclarationNode | null {
    const kindToken = this.currentToken()?.value.toLowerCase();
    const kind: 'const' | 'let' | 'var' = kindToken === 'let' ? 'let' : kindToken === 'var' ? 'var' : 'const';
    this.advance();

    const name = this.expectIdentifier();
    if (!name) return null;

    let dataType: string | undefined;
    if (this.check('punctuation', ':')) {
      this.advance();
      dataType = this.expectIdentifier() || undefined;
    }

    let value: HoloScriptValue;
    if (this.check('punctuation', '=')) {
      this.advance();
      const valueToken = this.currentToken();
      if (valueToken?.type === 'string') {
        value = valueToken.value;
        this.advance();
      } else if (valueToken?.type === 'number') {
        value = parseFloat(valueToken.value);
        this.advance();
      } else if (valueToken?.type === 'identifier') {
        if (valueToken.value === 'true') value = true;
        else if (valueToken.value === 'false') value = false;
        else value = valueToken.value;
        this.advance();
      } else if (this.check('punctuation', '[')) {
        value = this.parseArray() as HoloScriptValue;
      } else if (this.check('punctuation', '{')) {
        value = this.parseObject() as HoloScriptValue;
      }
    }

    return {
      type: 'variable-declaration',
      kind,
      name,
      dataType,
      value,
      position: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Parse orb declaration
   */
  private parseOrb(): OrbNode | null {
    this.expect('keyword', 'orb');
    const name = this.expectIdentifier();
    if (!name) return null;

    const properties: Record<string, unknown> = {};
    let position: SpatialPosition | undefined;
    let hologram: HologramProperties | undefined;

    if (this.check('punctuation', '{')) {
      this.advance(); // {

      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        this.skipNewlines();
        if (this.check('punctuation', '}')) break;

        const prop = this.parseProperty();
        if (prop) {
          // Handle special properties
          if (prop.key === 'position' || prop.key === 'at') {
            position = this.parsePosition(prop.value);
          } else if (prop.key === 'color' || prop.key === 'glow' || prop.key === 'size') {
            hologram = hologram || { shape: 'orb', color: '#00ffff', size: 0.5, glow: true, interactive: true };
            if (prop.key === 'color') hologram.color = String(prop.value);
            if (prop.key === 'glow') hologram.glow = Boolean(prop.value);
            if (prop.key === 'size') hologram.size = Number(prop.value);
          } else {
            properties[prop.key] = prop.value;
          }
        }

        this.skipNewlines();
      }

      this.expect('punctuation', '}');
    }

    return {
      type: 'orb',
      name,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: hologram || { shape: 'orb', color: '#00ffff', size: 0.5, glow: true, interactive: true },
      properties,
      methods: [],
    };
  }

  /**
   * Parse function declaration
   */
  private parseFunction(): MethodNode | null {
    this.expect('keyword', 'function');
    const name = this.expectIdentifier();
    if (!name) return null;

    const parameters: ParameterNode[] = [];
    let returnType: string | undefined;

    // Parse parameters
    if (this.check('punctuation', '(')) {
      this.advance(); // (

      while (!this.check('punctuation', ')') && this.position < this.tokens.length) {
        const paramName = this.expectIdentifier();
        if (!paramName) break;

        let paramType = 'any';
        if (this.check('punctuation', ':')) {
          this.advance(); // :
          paramType = this.expectIdentifier() || 'any';
        }

        parameters.push({
          type: 'parameter',
          name: paramName,
          dataType: paramType,
        });

        if (this.check('punctuation', ',')) {
          this.advance();
        }
      }

      this.expect('punctuation', ')');
    }

    // Parse return type
    if (this.check('punctuation', ':')) {
      this.advance();
      returnType = this.expectIdentifier() || undefined;
    }

    // Parse body
    const body: ASTNode[] = [];
    if (this.check('punctuation', '{')) {
      this.advance(); // {
      // Skip body parsing for now - just find closing brace
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'method',
      name,
      parameters,
      body,
      returnType,
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'cube', color: '#ff6b35', size: 1.5, glow: true, interactive: true },
    };
  }

  /**
   * Parse connection
   */
  private parseConnection(): ConnectionNode | null {
    this.expect('keyword', 'connect');
    const from = this.expectIdentifier();
    if (!from) return null;

    this.expect('keyword', 'to');
    const to = this.expectIdentifier();
    if (!to) return null;

    let dataType = 'any';
    if (this.check('keyword', 'as')) {
      this.advance();
      const typeStr = this.currentToken();
      if (typeStr?.type === 'string' || typeStr?.type === 'identifier') {
        dataType = typeStr.value;
        this.advance();
      }
    }

    return {
      type: 'connection',
      from,
      to,
      dataType,
      bidirectional: false,
    };
  }

  /**
   * Parse scale block: scale <magnitude> { body }
   */
  private parseScale(): ScaleNode | null {
    this.expect('keyword', 'scale');
    const magnitude = (this.expectIdentifier() || 'standard') as ScaleNode['magnitude'];
    
    const multipliers: Record<string, number> = {
      'galactic': 1000000,
      'macro': 1000,
      'standard': 1,
      'micro': 0.001,
      'atomic': 0.000001
    };

    const body: ASTNode[] = [];
    if (this.check('punctuation', '{')) {
      this.advance();
      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        this.skipNewlines();
        const node = this.parseDeclaration();
        if (node) body.push(node);
        this.skipNewlines();
      }
      this.expect('punctuation', '}');
    }

    return {
      type: 'scale',
      magnitude,
      multiplier: multipliers[magnitude] || 1,
      body, 
      position: { x: 0, y: 0, z: 0 }
    };
  }

  /**
   * Parse focus block: focus <target> { body }
   */
  private parseFocus(): FocusNode | null {
    this.expect('keyword', 'focus');
    const target = this.expectIdentifier() || 'origin';
    
    const body: ASTNode[] = [];
    if (this.check('punctuation', '{')) {
      this.advance();
      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        this.skipNewlines();
        const node = this.parseDeclaration();
        if (node) body.push(node);
        this.skipNewlines();
      }
      this.expect('punctuation', '}');
    }

    return {
      type: 'focus',
      target,
      body,
      position: { x: 0, y: 0, z: 0 }
    };
  }

  /**
   * Parse environment declaration
   */
  private parseEnvironment(): EnvironmentNode | null {
    this.expect('keyword', 'environment');
    const settings: Record<string, unknown> = {};
    
    // Parse settings until newline or }
    while (this.position < this.tokens.length && 
           this.currentToken()?.type !== 'newline' && 
           !this.check('punctuation', '}')) {
      const key = this.expectIdentifier();
      if (!key) break;
      settings[key] = this.parseLiteral();
    }

    return {
      type: 'environment',
      settings
    };
  }

  /**
   * Parse composition block
   */
  private parseComposition(): CompositionNode | null {
    this.expect('keyword', 'composition');
    const name = this.expectIdentifier() || 'unnamed';
    
    const children: ASTNode[] = [];
    if (this.check('punctuation', '{')) {
      this.advance();
      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        this.skipNewlines();
        const node = this.parseDeclaration();
        if (node) children.push(node);
        this.skipNewlines();
      }
      this.expect('punctuation', '}');
    }

    return {
      type: 'composition',
      name,
      children
    };
  }

  /**
   * Parse template declaration
   */
  private parseTemplate(): TemplateNode | null {
    this.expect('keyword', 'template');
    const name = this.expectIdentifier() || 'template';
    
    const params: string[] = [];
    if (this.check('punctuation', '(')) {
      this.advance();
      while (!this.check('punctuation', ')') && this.position < this.tokens.length) {
        const p = this.expectIdentifier();
        if (p) params.push(p);
        if (this.check('punctuation', ',')) this.advance();
      }
      this.expect('punctuation', ')');
    }

    const body: ASTNode[] = [];
    if (this.check('punctuation', '{')) {
      this.advance();
      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        this.skipNewlines();
        const node = this.parseDeclaration();
        if (node) body.push(node);
        this.skipNewlines();
      }
      this.expect('punctuation', '}');
    }

    return {
      type: 'template',
      name,
      parameters: params,
      body
    };
  }

  /**
   * Parse gate (conditional)
   */
  private parseGate(): GateNode | null {
    this.expect('keyword', 'gate');
    this.expectIdentifier(); // Gate name (consumed but not currently stored)

    let condition = '';
    if (this.check('punctuation', '(')) {
      this.advance();
      // Parse condition expression
      while (!this.check('punctuation', ')') && this.position < this.tokens.length) {
        const token = this.currentToken();
        if (token) condition += token.value + ' ';
        this.advance();
      }
      this.expect('punctuation', ')');
    }

    // Parse body if present
    if (this.check('punctuation', '{')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'gate',
      condition: condition.trim(),
      truePath: [],
      falsePath: [],
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'pyramid', color: '#4ecdc4', size: 1, glow: true, interactive: true },
    };
  }

  /**
   * Parse stream
   */
  private parseStream(): StreamNode | null {
    this.expect('keyword', 'stream');
    const name = this.expectIdentifier();
    if (!name) return null;

    let source = 'unknown';
    if (this.check('keyword', 'from')) {
      this.advance();
      source = this.expectIdentifier() || 'unknown';
    }

    // Parse body if present
    if (this.check('punctuation', '{')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'stream',
      name,
      source,
      transformations: [],
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'cylinder', color: '#45b7d1', size: 2, glow: true, interactive: true },
    };
  }

  /**
   * Parse nexus (multi-agent hub)
   */
  private parseNexus(): ASTNode | null {
    this.expect('keyword', 'nexus');
    const name = this.expectIdentifier();
    if (!name) return null;

    if (this.check('punctuation', '{')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'nexus',
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'sphere', color: '#9b59b6', size: 3, glow: true, interactive: true },
    };
  }

  /**
   * Parse building (class-like)
   */
  private parseBuilding(): ASTNode | null {
    this.expect('keyword', 'building');
    const name = this.expectIdentifier();
    if (!name) return null;

    if (this.check('punctuation', '{')) {
      this.advance();
      let depth = 1;
      while (depth > 0 && this.position < this.tokens.length) {
        if (this.check('punctuation', '{')) depth++;
        if (this.check('punctuation', '}')) depth--;
        this.advance();
      }
    }

    return {
      type: 'building',
      position: { x: 0, y: 0, z: 0 },
      hologram: { shape: 'cube', color: '#e74c3c', size: 4, glow: true, interactive: true },
    };
  }

  /**
   * Parse a literal value (string, number, boolean, array, or object)
   */
  private parseLiteral(): unknown {
    const token = this.currentToken();
    if (!token) return null;

    if (token.type === 'string') {
      this.advance();
      return token.value;
    }

    if (token.type === 'number') {
      this.advance();
      return parseFloat(token.value);
    }

    if (token.type === 'identifier') {
      const val = token.value.toLowerCase();
      this.advance();
      if (val === 'true') return true;
      if (val === 'false') return false;
      if (val === 'null') return null;
      return token.value;
    }

    if (this.check('punctuation', '[')) {
      return this.parseArray();
    }

    if (this.check('punctuation', '{')) {
      return this.parseObject();
    }

    this.advance();
    return token.value;
  }

  /**
   * Parse a property (key: value)
   */
  private parseProperty(): { key: string; value: unknown } | null {
    const key = this.expectIdentifier();
    if (!key) return null;

    if (!this.check('punctuation', ':')) {
      return { key, value: true }; // Flag-style property
    }

    this.advance(); // :

    const value = this.parseLiteral();

    return { key, value };
  }

  /**
   * Parse array [...]
   */
  private parseArray(): unknown[] {
    const arr: unknown[] = [];
    this.expect('punctuation', '[');

    while (!this.check('punctuation', ']') && this.position < this.tokens.length) {
      const token = this.currentToken();
      if (token?.type === 'string' || token?.type === 'number' || token?.type === 'identifier') {
        if (token.type === 'number') {
          arr.push(parseFloat(token.value));
        } else {
          arr.push(token.value);
        }
        this.advance();
      }

      if (this.check('punctuation', ',')) {
        this.advance();
      }
    }

    this.expect('punctuation', ']');
    return arr;
  }

  /**
   * Parse object {...}
   */
  private parseObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    this.expect('punctuation', '{');

    while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
      this.skipNewlines();
      if (this.check('punctuation', '}')) break;

      const prop = this.parseProperty();
      if (prop) {
        obj[prop.key] = prop.value;
      }

      this.skipNewlines();
      if (this.check('punctuation', ',')) {
        this.advance();
      }
    }

    this.expect('punctuation', '}');
    return obj;
  }

  /**
   * Parse position from value
   */
  private parsePosition(value: unknown): SpatialPosition {
    if (Array.isArray(value)) {
      return {
        x: Number(value[0]) || 0,
        y: Number(value[1]) || 0,
        z: Number(value[2]) || 0,
      };
    }
    if (typeof value === 'object' && value !== null) {
      const v = value as Record<string, unknown>;
      return {
        x: Number(v.x) || 0,
        y: Number(v.y) || 0,
        z: Number(v.z) || 0,
      };
    }
    return { x: 0, y: 0, z: 0 };
  }

  // Helper methods

  private currentToken(): Token | undefined {
    return this.tokens[this.position];
  }

  private advance(): Token | undefined {
    return this.tokens[this.position++];
  }

  private check(type: string, value?: string): boolean {
    const token = this.currentToken();
    if (!token) return false;
    if (token.type !== type) return false;
    if (value !== undefined && token.value.toLowerCase() !== value.toLowerCase()) return false;
    return true;
  }

  private expect(type: string, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    const token = this.currentToken();
    this.errors.push({
      line: token?.line || 0,
      column: token?.column || 0,
      message: `Expected ${type}${value ? ` '${value}'` : ''}, got ${token?.type || 'EOF'} '${token?.value || ''}'`,
    });
    return false;
  }

  private expectIdentifier(): string | null {
    const token = this.currentToken();
    if (token?.type === 'identifier' || token?.type === 'keyword') {
      this.advance();
      return token.value;
    }
    this.errors.push({
      line: token?.line || 0,
      column: token?.column || 0,
      message: `Expected identifier, got ${token?.type || 'EOF'}`,
    });
    return null;
  }

  /**
   * Parse animate command: animate target property: "..." from: 0 to: 1 duration: 1000
   */
  private parseAnimate(): ASTNode | null {
    this.expect('keyword', 'animate');
    const target = this.expectIdentifier();
    if (!target) return null;

    const properties: Record<string, unknown> = {};

    // Parse inline properties
    while (this.position < this.tokens.length) {
      this.skipNewlines();
      const t = this.currentToken();
      if (!t || t.type === 'newline' || (t.type === 'keyword' && this.keywordSet.has(t.value.toLowerCase()))) break;

      const prop = this.parseProperty();
      if (prop) {
        properties[prop.key] = prop.value;
      } else {
        break;
      }
    }

    return {
      type: 'expression-statement',
      expression: `animate("${target}", ${JSON.stringify(properties)})`,
      position: { x: 0, y: 0, z: 0 },
    } as ASTNode;
  }

  /**
   * Parse modify command: modify target { prop: value }
   */
  private parseModify(): ASTNode | null {
    this.expect('keyword', 'modify');
    const target = this.expectIdentifier();
    if (!target) return null;

    const properties: Record<string, unknown> = {};

    if (this.check('punctuation', '{')) {
      this.advance();
      while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
        this.skipNewlines();
        if (this.check('punctuation', '}')) break;

        const prop = this.parseProperty();
        if (prop) {
          properties[prop.key] = prop.value;
        }
        this.skipNewlines();
      }
      this.expect('punctuation', '}');
    }

    return {
      type: 'expression-statement',
      expression: `modify("${target}", ${JSON.stringify(properties)})`,
      position: { x: 0, y: 0, z: 0 },
    } as ASTNode;
  }

  /**
   * Parse UI Element: ui2d dashboard#id { ... }
   */
  private parseUIElement(): ASTNode | null {
      const typeToken = this.currentToken();
      if (!typeToken) return null;
      
      const elementType = typeToken.value;
      this.advance();
      
      let elementId = `${elementType}_${Date.now()}`;
      
      // Check for ID syntax
      if (this.currentToken()?.type === 'punctuation' && this.currentToken()?.value === '#') {
         this.advance(); 
         const idToken = this.currentToken();
         if (idToken) {
             elementId = idToken.value;
             this.advance();
         }
      } else if (this.currentToken()?.type === 'identifier' && this.currentToken()?.value.startsWith('#')) {
          elementId = this.currentToken()?.value.slice(1) || elementId;
          this.advance();
      }
      
      const properties: Record<string, unknown> = {};
      
      if (this.check('punctuation', '{')) {
          this.advance();
          while (!this.check('punctuation', '}') && this.position < this.tokens.length) {
              this.skipNewlines();
              if (this.check('punctuation', '}')) break;
              
              const prop = this.parseProperty();
              if (prop) {
                  properties[prop.key] = prop.value;
              }
              this.skipNewlines();
          }
          this.expect('punctuation', '}');
      }
      
      return {
          type: 'ui2d', 
          name: elementType,
          properties: { id: elementId, ...properties },
          position: { x: 0, y: 0, z: 0 }
      } as ASTNode;
  }

  private skipNewlines(): void {
    while (this.currentToken()?.type === 'newline') {
      this.advance();
    }
  }
}
