/**
 * .holo Composition Parser
 *
 * Parses .holo files into a HoloComposition AST.
 * This parser handles the declarative, scene-centric syntax.
 *
 * @version 1.0.0
 */

import type {
  HoloComposition,
  HoloEnvironment,
  HoloEnvironmentProperty,
  HoloParticleSystem,
  HoloState,
  HoloStateProperty,
  HoloTemplate,
  HoloObjectDecl,
  HoloObjectProperty,
  HoloObjectTrait,
  HoloSpatialGroup,
  HoloGroupProperty,
  HoloLogic,
  HoloEventHandler,
  HoloAction,
  HoloParameter,
  HoloStatement,
  HoloExpression,
  HoloImport,
  HoloImportSpecifier,
  HoloParseResult,
  HoloParseError,
  HoloParseWarning,
  HoloParserOptions,
  HoloValue,
  HoloBindValue,
  HoloLight,
  HoloLightProperty,
  HoloEffects,
  HoloEffect,
  HoloCamera,
  HoloCameraProperty,
  HoloTimeline,
  HoloTimelineEntry,
  HoloTimelineAction,
  HoloAudio,
  HoloAudioProperty,
  HoloZone,
  HoloZoneProperty,
  HoloUI,
  HoloUIElement,
  HoloUIProperty,
  HoloTransition,
  HoloTransitionProperty,
  HoloConditionalBlock,
  HoloForEachBlock,
  SourceLocation,
} from './HoloCompositionTypes';

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
  | 'DOT'
  | 'EQUALS'
  | 'PLUS_EQUALS'
  | 'MINUS_EQUALS'
  | 'STAR_EQUALS'
  | 'SLASH_EQUALS'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'LESS'
  | 'GREATER'
  | 'LESS_EQUALS'
  | 'GREATER_EQUALS'
  | 'EQUALS_EQUALS'
  | 'BANG_EQUALS'
  | 'BANG'
  | 'AND'
  | 'OR'
  | 'ARROW'
  | 'AT'
  | 'HASH'
  | 'NEWLINE'
  | 'EOF'
  // Keywords
  | 'COMPOSITION'
  | 'ENVIRONMENT'
  | 'STATE'
  | 'TEMPLATE'
  | 'OBJECT'
  | 'SPATIAL_GROUP'
  | 'LOGIC'
  | 'ACTION'
  | 'ASYNC'
  | 'AWAIT'
  | 'IF'
  | 'ELSE'
  | 'FOR'
  | 'IN'
  | 'RETURN'
  | 'EMIT'
  | 'ANIMATE'
  | 'USING'
  | 'IMPORT'
  | 'FROM'
  | 'PARTICLE_SYSTEM'
  | 'LIGHT'
  | 'EFFECTS'
  | 'CAMERA'
  | 'BIND'
  | 'TIMELINE'
  | 'AUDIO'
  | 'ZONE'
  | 'UI'
  | 'TRANSITION'
  | 'ELEMENT'
  | 'SPATIAL_AGENT'
  | 'SPATIAL_CONTAINER'
  | 'UI_PANEL'
  | 'UI_TEXT'
  | 'UI_CHART'
  | 'UI_GAUGE'
  | 'UI_VALUE'
  | 'UI_STATUS_INDICATOR'
  | 'TOOL_SLOT'
  | 'BEHAVIOR';

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// =============================================================================
// KEYWORDS
// =============================================================================

const KEYWORDS: Record<string, TokenType> = {
  composition: 'COMPOSITION',
  environment: 'ENVIRONMENT',
  state: 'STATE',
  template: 'TEMPLATE',
  object: 'OBJECT',
  spatial_group: 'SPATIAL_GROUP',
  logic: 'LOGIC',
  action: 'ACTION',
  async: 'ASYNC',
  await: 'AWAIT',
  if: 'IF',
  else: 'ELSE',
  for: 'FOR',
  in: 'IN',
  return: 'RETURN',
  emit: 'EMIT',
  animate: 'ANIMATE',
  using: 'USING',
  import: 'IMPORT',
  from: 'FROM',
  particle_system: 'PARTICLE_SYSTEM',
  light: 'LIGHT',
  effects: 'EFFECTS',
  camera: 'CAMERA',
  bind: 'BIND',
  timeline: 'TIMELINE',
  audio: 'AUDIO',
  zone: 'ZONE',
  ui: 'UI',
  transition: 'TRANSITION',
  element: 'ELEMENT',
  spatial_agent: 'SPATIAL_AGENT',
  spatial_container: 'SPATIAL_CONTAINER',
  ui_panel: 'UI_PANEL',
  ui_text: 'UI_TEXT',
  ui_chart: 'UI_CHART',
  ui_gauge: 'UI_GAUGE',
  ui_value: 'UI_VALUE',
  ui_status_indicator: 'UI_STATUS_INDICATOR',
  tool_slot: 'TOOL_SLOT',
  behavior: 'BEHAVIOR',
  true: 'BOOLEAN',
  false: 'BOOLEAN',
  null: 'NULL',
};

// =============================================================================
// LEXER
// =============================================================================

class HoloLexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      const char = this.current();

      // Skip whitespace (except newlines)
      if (char === ' ' || char === '\t') {
        this.advance();
        continue;
      }

      // Comments
      if (char === '/' && this.peek(1) === '/') {
        this.skipLineComment();
        continue;
      }
      if (char === '/' && this.peek(1) === '*') {
        this.skipBlockComment();
        continue;
      }

      // Newlines
      if (char === '\n') {
        this.addToken('NEWLINE', '\n');
        this.advance();
        this.line++;
        this.column = 1;
        continue;
      }
      if (char === '\r') {
        this.advance();
        if (this.current() === '\n') {
          this.advance();
        }
        this.addToken('NEWLINE', '\n');
        this.line++;
        this.column = 1;
        continue;
      }

      // Symbols
      if (this.trySymbol()) continue;

      // Strings
      if (char === '"' || char === "'") {
        this.readString(char);
        continue;
      }

      // Numbers
      if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek(1)))) {
        this.readNumber();
        continue;
      }

      // Identifiers and keywords
      if (this.isIdentifierStart(char)) {
        this.readIdentifier();
        continue;
      }

      // Unknown character - skip
      this.advance();
    }

    this.addToken('EOF', '');
    return this.tokens;
  }

  private trySymbol(): boolean {
    const char = this.current();
    const next = this.peek(1);

    // Two-character operators
    if (char === '=' && next === '=') {
      this.addToken('EQUALS_EQUALS', '==');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '!' && next === '=') {
      this.addToken('BANG_EQUALS', '!=');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '<' && next === '=') {
      this.addToken('LESS_EQUALS', '<=');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '>' && next === '=') {
      this.addToken('GREATER_EQUALS', '>=');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '+' && next === '=') {
      this.addToken('PLUS_EQUALS', '+=');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '-' && next === '=') {
      this.addToken('MINUS_EQUALS', '-=');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '*' && next === '=') {
      this.addToken('STAR_EQUALS', '*=');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '/' && next === '=') {
      this.addToken('SLASH_EQUALS', '/=');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '=' && next === '>') {
      this.addToken('ARROW', '=>');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '&' && next === '&') {
      this.addToken('AND', '&&');
      this.advance();
      this.advance();
      return true;
    }
    if (char === '|' && next === '|') {
      this.addToken('OR', '||');
      this.advance();
      this.advance();
      return true;
    }

    // Single-character operators
    const singleChar: Record<string, TokenType> = {
      '{': 'LBRACE',
      '}': 'RBRACE',
      '[': 'LBRACKET',
      ']': 'RBRACKET',
      '(': 'LPAREN',
      ')': 'RPAREN',
      ':': 'COLON',
      ',': 'COMMA',
      '.': 'DOT',
      '=': 'EQUALS',
      '+': 'PLUS',
      '-': 'MINUS',
      '*': 'STAR',
      '/': 'SLASH',
      '<': 'LESS',
      '>': 'GREATER',
      '!': 'BANG',
      '@': 'AT',
      '#': 'HASH',
    };

    if (singleChar[char]) {
      this.addToken(singleChar[char], char);
      this.advance();
      return true;
    }

    return false;
  }

  private current(): string {
    return this.pos < this.source.length ? this.source[this.pos] : '';
  }

  private peek(offset: number): string {
    const pos = this.pos + offset;
    return pos < this.source.length ? this.source[pos] : '';
  }

  private advance(): string {
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    return char;
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    });
  }

  private skipLineComment(): void {
    while (this.current() !== '\n' && this.pos < this.source.length) {
      this.advance();
    }
  }

  private skipBlockComment(): void {
    this.advance(); // /
    this.advance(); // *
    while (this.pos < this.source.length) {
      if (this.current() === '*' && this.peek(1) === '/') {
        this.advance();
        this.advance();
        return;
      }
      if (this.current() === '\n') {
        this.line++;
        this.column = 0;
      }
      this.advance();
    }
  }

  private readString(quote: string): void {
    const startLine = this.line;
    const startCol = this.column;
    this.advance(); // opening quote
    let value = '';
    while (this.current() !== quote && this.pos < this.source.length) {
      if (this.current() === '\\') {
        this.advance();
        const escaped = this.current();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += escaped;
        }
        this.advance();
      } else {
        value += this.advance();
      }
    }
    this.advance(); // closing quote
    this.tokens.push({
      type: 'STRING',
      value,
      line: startLine,
      column: startCol,
    });
  }

  private readNumber(): void {
    const startCol = this.column;
    let value = '';
    if (this.current() === '-') {
      value += this.advance();
    }
    while (this.isDigit(this.current())) {
      value += this.advance();
    }
    if (this.current() === '.' && this.isDigit(this.peek(1))) {
      value += this.advance(); // .
      while (this.isDigit(this.current())) {
        value += this.advance();
      }
    }
    this.tokens.push({
      type: 'NUMBER',
      value,
      line: this.line,
      column: startCol,
    });
  }

  private readIdentifier(): void {
    const startCol = this.column;
    let value = '';
    while (this.isIdentifierPart(this.current())) {
      value += this.advance();
    }
    const type = KEYWORDS[value.toLowerCase()] || 'IDENTIFIER';
    this.tokens.push({
      type,
      value: type === 'BOOLEAN' ? value.toLowerCase() : value,
      line: this.line,
      column: startCol,
    });
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isIdentifierStart(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_'
    );
  }

  private isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char);
  }
}

// =============================================================================
// PARSER
// =============================================================================

export class HoloCompositionParser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private errors: HoloParseError[] = [];
  private warnings: HoloParseWarning[] = [];
  private options: HoloParserOptions;

  constructor(options: HoloParserOptions = {}) {
    this.options = {
      locations: true,
      tolerant: true,
      strict: false,
      ...options,
    };
  }

  parse(source: string): HoloParseResult {
    this.errors = [];
    this.warnings = [];
    this.pos = 0;

    try {
      const lexer = new HoloLexer(source);
      this.tokens = lexer.tokenize();
      this.skipNewlines();

      const ast = this.parseComposition();

      return {
        success: this.errors.length === 0,
        ast,
        errors: this.errors,
        warnings: this.warnings,
      };
    } catch (error) {
      this.errors.push({
        message: error instanceof Error ? error.message : String(error),
        loc: this.currentLocation(),
      });
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings,
      };
    }
  }

  // ===========================================================================
  // COMPOSITION
  // ===========================================================================

  private parseComposition(): HoloComposition {
    this.expect('COMPOSITION');
    const name = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const composition: HoloComposition = {
      type: 'Composition',
      name,
      templates: [],
      objects: [],
      spatialGroups: [],
      lights: [],
      imports: [],
      timelines: [],
      audio: [],
      zones: [],
      transitions: [],
      conditionals: [],
      iterators: [],
    };

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('IMPORT')) {
        composition.imports.push(this.parseImport());
      } else if (this.check('ENVIRONMENT')) {
        composition.environment = this.parseEnvironment();
      } else if (this.check('STATE')) {
        composition.state = this.parseState();
      } else if (this.check('TEMPLATE')) {
        composition.templates.push(this.parseTemplate());
      } else if (this.check('OBJECT')) {
        composition.objects.push(this.parseObject());
      } else if (this.check('SPATIAL_GROUP')) {
        composition.spatialGroups.push(this.parseSpatialGroup());
      } else if (this.check('LIGHT')) {
        composition.lights.push(this.parseLight());
      } else if (this.check('EFFECTS')) {
        composition.effects = this.parseEffects();
      } else if (this.check('CAMERA')) {
        composition.camera = this.parseCamera();
      } else if (this.check('LOGIC')) {
        composition.logic = this.parseLogic();
      } else if (this.check('TIMELINE')) {
        composition.timelines.push(this.parseTimeline());
      } else if (this.check('AUDIO')) {
        composition.audio.push(this.parseAudio());
      } else if (this.check('ZONE')) {
        composition.zones.push(this.parseZone());
      } else if (this.check('UI')) {
        composition.ui = this.parseUI();
      } else if (this.check('TRANSITION')) {
        composition.transitions.push(this.parseTransition());
      } else if (this.check('IF')) {
        composition.conditionals.push(this.parseConditionalBlock());
      } else if (this.check('FOR')) {
        composition.iterators.push(this.parseForEachBlock());
      } else if (this.check('SPATIAL_AGENT')) {
        composition.objects.push(this.parseSpatialObject('spatial_agent'));
      } else if (this.check('SPATIAL_CONTAINER')) {
        composition.spatialGroups.push(this.parseSpatialGroup());
      } else if (this.current().type.startsWith('UI_')) {
        composition.objects.push(this.parseSpatialObject(this.current().value.toLowerCase()));
      } else {
        this.error(`Unexpected token: ${this.current().type}`);
        this.advance();
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return composition;
  }

  // ===========================================================================
  // IMPORT
  // ===========================================================================

  private parseImport(): HoloImport {
    this.expect('IMPORT');
    this.expect('LBRACE');
    this.skipNewlines();

    const specifiers: HoloImportSpecifier[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      const imported = this.expectIdentifier();
      let local: string | undefined;
      if (this.match('IDENTIFIER') && this.previous().value === 'as') {
        local = this.expectIdentifier();
      }
      specifiers.push({ type: 'ImportSpecifier', imported, local });
      if (!this.match('COMMA')) break;
      this.skipNewlines();
    }
    this.skipNewlines();
    this.expect('RBRACE');
    this.expect('FROM');
    const source = this.expectString();

    return { type: 'Import', specifiers, source };
  }

  // ===========================================================================
  // ENVIRONMENT
  // ===========================================================================

  private parseEnvironment(): HoloEnvironment {
    this.expect('ENVIRONMENT');
    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloEnvironmentProperty[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('PARTICLE_SYSTEM')) {
        const ps = this.parseParticleSystem();
        properties.push({
          type: 'EnvironmentProperty',
          key: ps.name,
          value: ps as any,
        });
      } else {
        const key = this.expectIdentifier();
        this.expect('COLON');
        const value = this.parseValue();
        properties.push({ type: 'EnvironmentProperty', key, value });
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Environment', properties };
  }

  private parseParticleSystem(): HoloParticleSystem {
    this.expect('PARTICLE_SYSTEM');
    const name = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const properties: Record<string, HoloValue> = {};
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const key = this.expectIdentifier();
      this.expect('COLON');
      properties[key] = this.parseValue();
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'ParticleSystem', name, properties };
  }

  // ===========================================================================
  // LIGHT (first-class block)
  // ===========================================================================

  private parseLight(): HoloLight {
    this.expect('LIGHT');
    const name = this.expectString();

    // Determine light type — either from explicit type property or the name
    let lightType: HoloLight['lightType'] = 'directional';
    const lightTypeNames: Record<string, HoloLight['lightType']> = {
      directional: 'directional', point: 'point', spot: 'spot',
      hemisphere: 'hemisphere', ambient: 'ambient', area: 'area',
    };

    // Check for inline type: light "sun" directional { ... }
    if (this.check('IDENTIFIER')) {
      const typeName = this.current().value.toLowerCase();
      if (lightTypeNames[typeName]) {
        lightType = lightTypeNames[typeName]!;
        this.advance();
      }
    }

    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloLightProperty[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const key = this.expectIdentifier();
      this.expect('COLON');
      const value = this.parseValue();

      // Override light type if declared as property
      if (key === 'type' && typeof value === 'string' && lightTypeNames[value]) {
        lightType = lightTypeNames[value]!;
      } else {
        properties.push({ type: 'LightProperty', key, value });
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Light', name, lightType, properties };
  }

  // ===========================================================================
  // EFFECTS (post-processing block)
  // ===========================================================================

  private parseEffects(): HoloEffects {
    this.expect('EFFECTS');
    this.expect('LBRACE');
    this.skipNewlines();

    const effects: HoloEffect[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const effectType = this.expectIdentifier();
      this.expect('LBRACE');
      this.skipNewlines();

      const properties: Record<string, HoloValue> = {};
      while (!this.check('RBRACE') && !this.isAtEnd()) {
        this.skipNewlines();
        if (this.check('RBRACE')) break;
        const key = this.expectIdentifier();
        this.expect('COLON');
        properties[key] = this.parseValue();
        this.skipNewlines();
      }
      this.expect('RBRACE');

      effects.push({ type: 'Effect', effectType, properties });
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Effects', effects };
  }

  // ===========================================================================
  // CAMERA
  // ===========================================================================

  private parseCamera(): HoloCamera {
    this.expect('CAMERA');

    let cameraType: HoloCamera['cameraType'] = 'perspective';
    const cameraTypes: Record<string, HoloCamera['cameraType']> = {
      perspective: 'perspective', orthographic: 'orthographic', cinematic: 'cinematic',
    };

    // Inline type: camera perspective { ... }
    if (this.check('IDENTIFIER')) {
      const typeName = this.current().value.toLowerCase();
      if (cameraTypes[typeName]) {
        cameraType = cameraTypes[typeName]!;
        this.advance();
      }
    }

    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloCameraProperty[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const key = this.expectIdentifier();
      this.expect('COLON');
      const value = this.parseValue();

      if (key === 'type' && typeof value === 'string' && cameraTypes[value]) {
        cameraType = cameraTypes[value]!;
      } else {
        properties.push({ type: 'CameraProperty', key, value });
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Camera', cameraType, properties };
  }

  // ===========================================================================
  // TIMELINE
  // ===========================================================================

  private parseTimeline(): HoloTimeline {
    this.expect('TIMELINE');
    const name = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const entries: HoloTimelineEntry[] = [];
    let autoplay: boolean | undefined;
    let loop: boolean | undefined;

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      // Check for timeline properties (autoplay, loop) vs entries (number: ...)
      if (this.check('IDENTIFIER') && (this.current().value === 'autoplay' || this.current().value === 'loop')) {
        const key = this.advance().value;
        this.expect('COLON');
        const val = this.parseValue();
        if (key === 'autoplay') autoplay = val as boolean;
        if (key === 'loop') loop = val as boolean;
      } else if (this.check('NUMBER')) {
        const time = parseFloat(this.advance().value);
        this.expect('COLON');

        // Parse action: animate "target" { ... }, emit "event", or call method(...)
        const action = this.parseTimelineAction();
        entries.push({ type: 'TimelineEntry', time, action });
      } else {
        this.error(`Unexpected token in timeline: ${this.current().type}`);
        this.advance();
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Timeline', name, autoplay, loop, entries };
  }

  private parseTimelineAction(): HoloTimelineAction {
    if (this.check('ANIMATE')) {
      this.advance();
      const target = this.expectString();
      this.expect('LBRACE');
      this.skipNewlines();
      const properties: Record<string, HoloValue> = {};
      while (!this.check('RBRACE') && !this.isAtEnd()) {
        this.skipNewlines();
        if (this.check('RBRACE')) break;
        const key = this.expectIdentifier();
        this.expect('COLON');
        properties[key] = this.parseValue();
        this.skipNewlines();
      }
      this.expect('RBRACE');
      return { kind: 'animate', target, properties };
    }

    if (this.check('EMIT')) {
      this.advance();
      const event = this.expectString();
      let data: HoloValue | undefined;
      if (this.check('LBRACE') || this.check('STRING') || this.check('NUMBER')) {
        data = this.parseValue();
      }
      return { kind: 'emit', event, data };
    }

    // Default: treat as a method call — identifier(args)
    const method = this.expectIdentifier();
    let args: HoloValue[] | undefined;
    if (this.check('LPAREN')) {
      this.advance();
      args = [];
      while (!this.check('RPAREN') && !this.isAtEnd()) {
        this.skipNewlines();
        args.push(this.parseValue());
        if (!this.match('COMMA')) break;
        this.skipNewlines();
      }
      this.expect('RPAREN');
    }
    return { kind: 'call', method, args };
  }

  // ===========================================================================
  // AUDIO
  // ===========================================================================

  private parseAudio(): HoloAudio {
    this.expect('AUDIO');
    const name = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloAudioProperty[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const key = this.expectIdentifier();
      this.expect('COLON');
      const value = this.parseValue();
      properties.push({ type: 'AudioProperty', key, value });
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Audio', name, properties };
  }

  // ===========================================================================
  // ZONE (trigger/interaction volume)
  // ===========================================================================

  private parseZone(): HoloZone {
    this.expect('ZONE');
    const name = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloZoneProperty[] = [];
    const handlers: HoloEventHandler[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      // Check for event handlers (on_enter, on_exit, on_stay)
      if (this.check('IDENTIFIER') && this.current().value.startsWith('on_')) {
        const event = this.advance().value;
        let parameters: HoloParameter[] = [];
        if (this.check('LPAREN')) {
          parameters = this.parseParameterList();
        }
        this.expect('LBRACE');
        this.skipNewlines();
        const body = this.parseStatementBlock();
        this.expect('RBRACE');
        handlers.push({ type: 'EventHandler', event, parameters, body } as HoloEventHandler);
      } else {
        const key = this.expectIdentifier();
        this.expect('COLON');
        const value = this.parseValue();
        properties.push({ type: 'ZoneProperty', key, value });
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Zone', name, properties, handlers };
  }

  // ===========================================================================
  // UI (HUD overlay)
  // ===========================================================================

  private parseUI(): HoloUI {
    this.expect('UI');
    this.expect('LBRACE');
    this.skipNewlines();

    const elements: HoloUIElement[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('ELEMENT')) {
        elements.push(this.parseUIElement());
      } else {
        this.error(`Expected 'element' in ui block, got ${this.current().type}`);
        this.advance();
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'UI', elements };
  }

  private parseUIElement(): HoloUIElement {
    this.expect('ELEMENT');
    const name = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloUIProperty[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const key = this.expectIdentifier();
      this.expect('COLON');
      const value = this.parseValue();
      properties.push({ type: 'UIProperty', key, value });
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'UIElement', name, properties };
  }

  // ===========================================================================
  // TRANSITION
  // ===========================================================================

  private parseTransition(): HoloTransition {
    this.expect('TRANSITION');
    const name = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloTransitionProperty[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const key = this.expectIdentifier();
      this.expect('COLON');
      const value = this.parseValue();
      properties.push({ type: 'TransitionProperty', key, value });
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Transition', name, properties };
  }

  // ===========================================================================
  // CONDITIONAL BLOCK (scene-level if/else)
  // ===========================================================================

  private parseConditionalBlock(): HoloConditionalBlock {
    this.expect('IF');

    // Parse condition as an expression, then convert to string
    const condExpr = this.parseExpression();
    const condition = this.expressionToString(condExpr);

    this.expect('LBRACE');
    this.skipNewlines();

    const objects: HoloObjectDecl[] = [];
    const spatialGroups: HoloSpatialGroup[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('OBJECT')) {
        objects.push(this.parseObject());
      } else if (this.check('SPATIAL_GROUP')) {
        spatialGroups.push(this.parseSpatialGroup());
      } else {
        this.error(`Expected object or spatial_group in conditional block, got ${this.current().type}`);
        this.advance();
      }
      this.skipNewlines();
    }
    this.expect('RBRACE');

    let elseObjects: HoloObjectDecl[] | undefined;
    let elseSpatialGroups: HoloSpatialGroup[] | undefined;

    this.skipNewlines();
    if (this.match('ELSE')) {
      this.expect('LBRACE');
      this.skipNewlines();
      elseObjects = [];
      elseSpatialGroups = [];

      while (!this.check('RBRACE') && !this.isAtEnd()) {
        this.skipNewlines();
        if (this.check('RBRACE')) break;

        if (this.check('OBJECT')) {
          elseObjects.push(this.parseObject());
        } else if (this.check('SPATIAL_GROUP')) {
          elseSpatialGroups.push(this.parseSpatialGroup());
        } else {
          this.error(`Expected object or spatial_group in else block, got ${this.current().type}`);
          this.advance();
        }
        this.skipNewlines();
      }
      this.expect('RBRACE');
    }

    return {
      type: 'ConditionalBlock',
      condition,
      objects,
      spatialGroups: spatialGroups.length > 0 ? spatialGroups : undefined,
      elseObjects,
      elseSpatialGroups: elseSpatialGroups && elseSpatialGroups.length > 0 ? elseSpatialGroups : undefined,
    };
  }

  // ===========================================================================
  // FOR-EACH BLOCK (scene-level iteration)
  // ===========================================================================

  private parseForEachBlock(): HoloForEachBlock {
    this.expect('FOR');
    const variable = this.expectIdentifier();
    this.expect('IN');

    // Parse iterable as expression, convert to string
    const iterExpr = this.parseExpression();
    const iterable = this.expressionToString(iterExpr);

    this.expect('LBRACE');
    this.skipNewlines();

    const objects: HoloObjectDecl[] = [];
    const spatialGroups: HoloSpatialGroup[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('OBJECT')) {
        objects.push(this.parseObject());
      } else if (this.check('SPATIAL_GROUP')) {
        spatialGroups.push(this.parseSpatialGroup());
      } else {
        this.error(`Expected object or spatial_group in for-each block, got ${this.current().type}`);
        this.advance();
      }
      this.skipNewlines();
    }
    this.expect('RBRACE');

    return {
      type: 'ForEachBlock',
      variable,
      iterable,
      objects,
      spatialGroups: spatialGroups.length > 0 ? spatialGroups : undefined,
    };
  }

  // ===========================================================================
  // STATE
  // ===========================================================================

  private parseState(): HoloState {
    this.expect('STATE');
    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloStateProperty[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const key = this.expectIdentifier();
      this.expect('COLON');
      const value = this.parseValue();
      properties.push({ type: 'StateProperty', key, value });
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'State', properties };
  }

  // ===========================================================================
  // TEMPLATE
  // ===========================================================================

  private parseTemplate(): HoloTemplate {
    this.expect('TEMPLATE');
    const name = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const template: HoloTemplate = {
      type: 'Template',
      name,
      properties: [],
      actions: [],
      traits: [],
    };

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('STATE')) {
        template.state = this.parseState();
      } else if (this.check('ACTION') || this.check('ASYNC')) {
        template.actions.push(this.parseAction());
      } else if (this.check('AT' as any)) {
        // @trait support in templates
        this.advance(); // consume @
        const traitName = this.expectIdentifier();
        let config: Record<string, HoloValue> = {};
        if (this.check('LPAREN')) {
          config = this.parseTraitConfig();
        }
        template.traits.push({ type: 'ObjectTrait', name: traitName, config } as HoloObjectTrait);
      } else {
        const key = this.expectIdentifier();
        this.expect('COLON');
        const value = this.parseValue();
        template.properties.push({ type: 'TemplateProperty', key, value });
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return template;
  }

  // ===========================================================================
  // OBJECT
  // ===========================================================================

  private parseObject(typeOverride?: string): HoloObjectDecl {
    if (!typeOverride) {
      this.expect('OBJECT');
    } else {
      this.advance(); // consume the type keyword (spatial_agent, etc.)
    }
    let name = '';
    if (typeOverride === 'behavior' && this.check('LBRACE')) {
      name = 'behavior'; // anonymous block name
    } else {
      name = this.expectString();
    }
    let template: string | undefined;

    if (this.check('USING')) {
      this.advance();
      template = this.expectString();
    }

    this.expect('LBRACE');
    this.skipNewlines();

    const properties: HoloObjectProperty[] = [];
    const children: HoloObjectDecl[] = [];
    const traits: HoloObjectTrait[] = []; // Collect traits here
    let state: HoloState | undefined;

    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('OBJECT') || this.check('SPATIAL_AGENT') || this.check('TOOL_SLOT') || this.check('BEHAVIOR') || this.current().type.startsWith('UI_')) {
        const nestedType = this.check('OBJECT') ? undefined : this.current().value.toLowerCase();
        children.push(this.parseObject(nestedType));
      } else if (this.check('AT' as any)) {
        this.advance(); // consume @
        const name = this.expectIdentifier();
        let config: Record<string, HoloValue> = {};
        if (this.check('LPAREN')) {
          config = this.parseTraitConfig();
        }
        traits.push({ type: 'ObjectTrait', name, config } as any);
      } else if (this.check('STATE')) {
        // Handle state block in object
        state = this.parseState();
      } else if (this.check('IDENTIFIER')) {
        const key = this.expectIdentifier();
        if (this.check('COLON')) {
          this.advance();
          if (this.check('LBRACE')) {
            // Check if it's a statement block or object value
            // For now, if it starts with 'on_', treat as statement block
            if (key.startsWith('on_')) {
              this.advance();
              const body = this.parseStatementBlock();
              this.expect('RBRACE');
              properties.push({ type: 'ObjectProperty', key, value: body as any });
            } else {
              properties.push({ type: 'ObjectProperty', key, value: this.parseValue() });
            }
          } else {
            properties.push({ type: 'ObjectProperty', key, value: this.parseValue() });
          }
        } else if (this.check('LPAREN')) {
          // Event handler style: on_event(params) { ... }
          const parameters = this.parseParameterList();
          this.expect('LBRACE');
          const body = this.parseStatementBlock();
          this.expect('RBRACE');
          properties.push({ type: 'ObjectProperty', key, value: { type: 'EventHandler', parameters, body } as any });
        } else {
          // Bare identifier (like a trait without @)
          properties.push({ type: 'ObjectProperty', key, value: true });
        }
      } else {
        // Skip unknown tokens to prevent infinite loop
        this.error(`Unexpected token in object: ${this.current().type}`);
        this.advance();
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    const obj: HoloObjectDecl = {
      type: 'Object',
      name,
      template,
      properties,
      state,
      traits, // Added traits property
      children: children.length > 0 ? children : undefined,
    };

    if (typeOverride) {
      obj.properties.unshift({ type: 'ObjectProperty', key: 'type', value: typeOverride });
    }

    return obj;
  }

  private parseSpatialObject(type: string): HoloObjectDecl {
    return this.parseObject(type);
  }

  // ===========================================================================
  // SPATIAL GROUP
  // ===========================================================================

  private parseSpatialGroup(): HoloSpatialGroup {
    this.expect('SPATIAL_GROUP');
    const name = this.expectString();

    const properties: HoloGroupProperty[] = [];

    // Optional "at [x, y, z]" shorthand for position
    if (this.check('IDENTIFIER') && this.current().value === 'at') {
      this.advance(); // consume 'at'
      const position = this.parseValue();
      properties.push({ type: 'GroupProperty', key: 'position', value: position });
    }

    this.expect('LBRACE');
    this.skipNewlines();

    const objects: HoloObjectDecl[] = [];
    const groups: HoloSpatialGroup[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('OBJECT')) {
        objects.push(this.parseObject());
      } else if (this.check('SPATIAL_GROUP')) {
        groups.push(this.parseSpatialGroup());
      } else {
        const key = this.expectIdentifier();
        this.expect('COLON');
        const value = this.parseValue();
        properties.push({ type: 'GroupProperty', key, value });
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return {
      type: 'SpatialGroup',
      name,
      properties,
      objects,
      groups: groups.length > 0 ? groups : undefined,
    };
  }

  // ===========================================================================
  // LOGIC
  // ===========================================================================

  private parseLogic(): HoloLogic {
    this.expect('LOGIC');
    this.expect('LBRACE');
    this.skipNewlines();

    const handlers: HoloEventHandler[] = [];
    const actions: HoloAction[] = [];

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      if (this.check('ACTION') || this.check('ASYNC')) {
        actions.push(this.parseAction());
      } else if (this.check('IDENTIFIER')) {
        const name = this.advance().value;
        if (this.check('LPAREN')) {
          // Normal event handler: on_player_touch(orb) { ... }
          const parameters = this.parseParameterList();
          this.expect('LBRACE');
          const body = this.parseStatementBlock();
          this.expect('RBRACE');
          handlers.push({ type: 'EventHandler', event: name, parameters, body } as any);
        } else if (this.check('LBRACE')) {
          // No-parens style: on_enter { ... }
          this.advance(); // consume {
          const body = this.parseStatementBlock();
          this.expect('RBRACE');
          handlers.push({ type: 'EventHandler', event: name, parameters: [], body } as any);
        } else {
          this.error(`Unexpected token in logic: ${name}. Next token: ${this.current().type}`);
        }
      } else {
        this.error(`Unexpected token in logic block: ${this.current().type}`);
        this.advance();
      }
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'Logic', handlers, actions };
  }

  private parseAction(): HoloAction {
    const isAsync = this.match('ASYNC');
    this.expect('ACTION');
    const name = this.expectIdentifier();
    const parameters = this.parseParameterList();
    this.expect('LBRACE');
    this.skipNewlines();

    const body = this.parseStatementBlock();

    this.expect('RBRACE');
    return { type: 'Action', name, parameters, body, async: isAsync };
  }

  private parseParameterList(): HoloParameter[] {
    if (!this.check('LPAREN')) return [];
    this.expect('LPAREN');
    this.skipNewlines();

    const params: HoloParameter[] = [];
    while (!this.check('RPAREN') && !this.isAtEnd()) {
      const name = this.expectIdentifier();
      let paramType: string | undefined;
      if (this.match('COLON')) {
        paramType = this.expectIdentifier();
      }
      params.push({ type: 'Parameter', name, paramType });
      if (!this.match('COMMA')) break;
      this.skipNewlines();
    }

    this.expect('RPAREN');
    return params;
  }

  // ===========================================================================
  // STATEMENTS
  // ===========================================================================

  private parseStatementBlock(): HoloStatement[] {
    const statements: HoloStatement[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
      this.skipNewlines();
    }
    return statements;
  }

  private parseStatement(): HoloStatement | null {
    if (this.check('IF')) return this.parseIfStatement();
    if (this.check('FOR')) return this.parseForStatement();
    if (this.check('AWAIT')) return this.parseAwaitStatement();
    if (this.check('RETURN')) return this.parseReturnStatement();
    if (this.check('EMIT')) return this.parseEmitStatement();
    if (this.check('ANIMATE')) return this.parseAnimateStatement();

    // Assignment or expression
    return this.parseAssignmentOrExpression();
  }

  private parseIfStatement(): HoloStatement {
    this.expect('IF');
    const condition = this.parseExpression();
    this.expect('LBRACE');
    this.skipNewlines();
    const consequent = this.parseStatementBlock();
    this.expect('RBRACE');

    let alternate: HoloStatement[] | undefined;
    this.skipNewlines();
    if (this.match('ELSE')) {
      this.expect('LBRACE');
      this.skipNewlines();
      alternate = this.parseStatementBlock();
      this.expect('RBRACE');
    }

    return { type: 'IfStatement', condition, consequent, alternate };
  }

  private parseForStatement(): HoloStatement {
    this.expect('FOR');
    const variable = this.expectIdentifier();
    this.expect('IN');
    const iterable = this.parseExpression();
    this.expect('LBRACE');
    this.skipNewlines();
    const body = this.parseStatementBlock();
    this.expect('RBRACE');

    return { type: 'ForStatement', variable, iterable, body };
  }

  private parseAwaitStatement(): HoloStatement {
    this.expect('AWAIT');
    const expression = this.parseExpression();
    return { type: 'AwaitStatement', expression };
  }

  private parseReturnStatement(): HoloStatement {
    this.expect('RETURN');
    let value: HoloExpression | undefined;
    if (!this.check('NEWLINE') && !this.check('RBRACE')) {
      value = this.parseExpression();
    }
    return { type: 'ReturnStatement', value };
  }

  private parseEmitStatement(): HoloStatement {
    this.expect('EMIT');
    const event = this.expectString();
    let data: HoloExpression | undefined;
    if (this.check('LBRACE') || this.check('IDENTIFIER')) {
      data = this.parseExpression();
    }
    return { type: 'EmitStatement', event, data };
  }

  private parseAnimateStatement(): HoloStatement {
    this.expect('ANIMATE');
    const target = this.expectString();
    this.expect('LBRACE');
    this.skipNewlines();

    const properties: Record<string, HoloValue> = {};
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('RBRACE')) break;

      const key = this.expectIdentifier();
      this.expect('COLON');
      properties[key] = this.parseValue();
      this.skipNewlines();
    }

    this.expect('RBRACE');
    return { type: 'AnimateStatement', target, properties };
  }

  private parseAssignmentOrExpression(): HoloStatement | null {
    const expr = this.parseExpression();

    // Check for assignment operators
    if (this.check('EQUALS') || this.check('PLUS_EQUALS') ||
        this.check('MINUS_EQUALS') || this.check('STAR_EQUALS') ||
        this.check('SLASH_EQUALS')) {
      const op = this.advance().value as '=' | '+=' | '-=' | '*=' | '/=';
      const value = this.parseExpression();
      const target = this.expressionToString(expr);
      return { type: 'Assignment', target, operator: op, value };
    }

    return { type: 'ExpressionStatement', expression: expr };
  }

  private expressionToString(expr: HoloExpression): string {
    if (expr.type === 'Identifier') return expr.name;
    if (expr.type === 'MemberExpression') {
      return `${this.expressionToString(expr.object)}.${expr.property}`;
    }
    return '';
  }

  // ===========================================================================
  // EXPRESSIONS
  // ===========================================================================

  private parseExpression(): HoloExpression {
    return this.parseOr();
  }

  private parseOr(): HoloExpression {
    let left = this.parseAnd();
    while (this.match('OR')) {
      const right = this.parseAnd();
      left = { type: 'BinaryExpression', operator: '||', left, right };
    }
    return left;
  }

  private parseAnd(): HoloExpression {
    let left = this.parseEquality();
    while (this.match('AND')) {
      const right = this.parseEquality();
      left = { type: 'BinaryExpression', operator: '&&', left, right };
    }
    return left;
  }

  private parseEquality(): HoloExpression {
    let left = this.parseComparison();
    while (this.check('EQUALS_EQUALS') || this.check('BANG_EQUALS')) {
      const op = this.advance().value;
      const right = this.parseComparison();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  private parseComparison(): HoloExpression {
    let left = this.parseAdditive();
    while (this.check('LESS') || this.check('GREATER') ||
           this.check('LESS_EQUALS') || this.check('GREATER_EQUALS')) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  private parseAdditive(): HoloExpression {
    let left = this.parseMultiplicative();
    while (this.check('PLUS') || this.check('MINUS')) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): HoloExpression {
    let left = this.parseUnary();
    while (this.check('STAR') || this.check('SLASH')) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }
    return left;
  }

  private parseUnary(): HoloExpression {
    if (this.check('BANG') || this.check('MINUS')) {
      const op = this.advance().value as '!' | '-';
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator: op, argument };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): HoloExpression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('DOT')) {
        const property = this.expectIdentifier();
        expr = { type: 'MemberExpression', object: expr, property, computed: false };
      } else if (this.match('LBRACKET')) {
        const index = this.parseExpression();
        this.expect('RBRACKET');
        const property = this.expressionToString(index);
        expr = { type: 'MemberExpression', object: expr, property, computed: true };
      } else if (this.match('LPAREN')) {
        const args = this.parseArgumentList();
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseArgumentList(): HoloExpression[] {
    this.skipNewlines();
    const args: HoloExpression[] = [];
    if (this.check('RPAREN')) {
      this.expect('RPAREN');
      return args;
    }

    args.push(this.parseExpression());
    while (this.match('COMMA')) {
      this.skipNewlines();
      args.push(this.parseExpression());
    }
    this.skipNewlines();
    this.expect('RPAREN');
    return args;
  }

  private parsePrimary(): HoloExpression {
    if (this.match('NUMBER')) {
      return { type: 'Literal', value: parseFloat(this.previous().value) };
    }
    if (this.match('STRING')) {
      return { type: 'Literal', value: this.previous().value };
    }
    if (this.match('BOOLEAN')) {
      return { type: 'Literal', value: this.previous().value === 'true' };
    }
    if (this.match('NULL')) {
      return { type: 'Literal', value: null };
    }
    // Allow keywords to be used as identifiers in expressions
    // (e.g., state.visitors, object.position)
    if (this.match('IDENTIFIER') || this.isKeywordAsIdentifier()) {
      const name = this.previous().value;
      return { type: 'Identifier', name };
    }
    if (this.match('LBRACKET')) {
      return this.parseArrayExpression();
    }
    if (this.match('LBRACE')) {
      return this.parseObjectExpression();
    }
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return expr;
    }

    this.error(`Unexpected token: ${this.current().type}`);
    this.advance();
    return { type: 'Literal', value: null };
  }

  /**
   * Check if current token is a keyword that can be used as identifier in expressions.
   * Keywords like 'state', 'object', 'template' can appear as identifiers in contexts
   * like 'state.visitors' or 'object.position'.
   */
  private isKeywordAsIdentifier(): boolean {
    const keywordsAsIdentifiers: TokenType[] = [
      'STATE', 'OBJECT', 'TEMPLATE', 'ENVIRONMENT', 'LOGIC',
      'ACTION', 'EMIT', 'ANIMATE', 'RETURN',
      'LIGHT', 'EFFECTS', 'CAMERA', 'BIND',
      'TIMELINE', 'AUDIO', 'ZONE', 'UI', 'TRANSITION', 'ELEMENT',
    ];
    if (keywordsAsIdentifiers.includes(this.current().type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private parseArrayExpression(): HoloExpression {
    this.skipNewlines();
    const elements: HoloExpression[] = [];
    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      this.skipNewlines();
      elements.push(this.parseExpression());
      this.skipNewlines();
      if (!this.match('COMMA')) break;
      this.skipNewlines();
    }
    this.skipNewlines();
    this.expect('RBRACKET');
    return { type: 'ArrayExpression', elements };
  }

  private parseObjectExpression(): HoloExpression {
    this.skipNewlines();
    const properties: { key: string; value: HoloExpression }[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      const key = this.expectIdentifier();
      this.expect('COLON');
      const value = this.parseExpression();
      properties.push({ key, value });
      this.skipNewlines();
      if (!this.match('COMMA')) break;
      this.skipNewlines();
    }
    this.skipNewlines();
    this.expect('RBRACE');
    return { type: 'ObjectExpression', properties };
  }

  // ===========================================================================
  // VALUES
  // ===========================================================================

  private parseValue(): HoloValue {
    // Handle negative numbers
    if (this.match('MINUS')) {
      if (this.match('NUMBER')) {
        return -parseFloat(this.previous().value);
      }
      this.error('Expected number after minus sign');
      return 0;
    }
    if (this.match('NUMBER')) {
      return parseFloat(this.previous().value);
    }
    if (this.match('STRING')) {
      return this.previous().value;
    }
    if (this.match('BOOLEAN')) {
      return this.previous().value === 'true';
    }
    if (this.match('NULL')) {
      return null;
    }
    // bind() reactive expression: bind(state.score) or bind(state.score, "formatPercent")
    if (this.check('BIND')) {
      return this.parseBindValue();
    }
    if (this.match('IDENTIFIER')) {
      return this.previous().value;
    }
    if (this.match('LBRACKET')) {
      return this.parseArrayValue();
    }
    if (this.match('LBRACE')) {
      return this.parseObjectValue();
    }

    this.error(`Expected value, got ${this.current().type}`);
    this.advance(); // CRITICAL: Advance to prevent infinite loop
    return null;
  }

  private parseBindValue(): HoloBindValue {
    this.expect('BIND');
    this.expect('LPAREN');

    // Parse the source path: e.g., state.score or state.health
    let source = '';
    if (this.check('IDENTIFIER') || this.check('STATE')) {
      source = this.advance().value;
      while (this.match('DOT')) {
        source += '.' + this.expectIdentifier();
      }
    } else {
      source = this.expectString();
    }

    // Optional transform function name
    let transform: string | undefined;
    if (this.match('COMMA')) {
      this.skipNewlines();
      transform = this.expectString();
    }

    this.expect('RPAREN');
    return { __bind: true, source, transform };
  }

  private parseArrayValue(): HoloValue[] {
    this.skipNewlines();
    const elements: HoloValue[] = [];
    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      this.skipNewlines();
      elements.push(this.parseValue());
      this.skipNewlines();
      if (!this.match('COMMA')) break;
      this.skipNewlines();
    }
    this.skipNewlines();
    this.expect('RBRACKET');
    return elements;
  }

  private parseObjectValue(): Record<string, HoloValue> {
    this.skipNewlines();
    const obj: Record<string, HoloValue> = {};
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      this.skipNewlines();
      const key = this.expectIdentifier();
      this.expect('COLON');
      obj[key] = this.parseValue();
      this.skipNewlines();
      if (!this.match('COMMA')) break;
      this.skipNewlines();
    }
    this.skipNewlines();
    this.expect('RBRACE');
    return obj;
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '', line: 0, column: 0 };
  }

  private previous(): Token {
    return this.tokens[this.pos - 1] || this.current();
  }

  private isAtEnd(): boolean {
    return this.current().type === 'EOF';
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private expect(type: TokenType): Token {
    if (this.check(type)) {
      return this.advance();
    }
    this.error(`Expected ${type}, got ${this.current().type}`);
    // Advance anyway to prevent infinite loops in the parser
    return this.advance(); 
  }

  private expectString(): string {
    if (this.check('STRING')) {
      return this.advance().value;
    }
    this.error(`Expected string, got ${this.current().type}`);
    return '';
  }

  private expectIdentifier(): string {
    if (this.check('IDENTIFIER')) {
      return this.advance().value;
    }
    this.error(`Expected identifier, got ${this.current().type}`);
    return '';
  }

  private skipNewlines(): void {
    while (this.match('NEWLINE')) {
      // Skip all newlines
    }
  }

  private currentLocation(): SourceLocation {
    const token = this.current();
    return { line: token.line, column: token.column };
  }

  private error(message: string): void {
    this.errors.push({
      message,
      loc: this.currentLocation(),
    });
    if (!this.options.tolerant) {
      throw new Error(`Parse error at line ${this.currentLocation().line}: ${message}`);
    }
  }

  private parseTraitConfig(): Record<string, HoloValue> {
    this.expect('LPAREN');
    const config: Record<string, HoloValue> = {};
    
    while (!this.check('RPAREN') && !this.check('EOF')) {
      this.skipNewlines();
      if (this.check('RPAREN')) break;
      
      const key = this.expectIdentifier();
      this.expect('COLON');
      config[key] = this.parseValue();
      
      if (this.check('COMMA')) {
        this.advance();
      }
      this.skipNewlines();
    }
    
    this.expect('RPAREN');
    return config;
  }
}

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Parse a .holo file into an AST
 */
export function parseHolo(source: string, options?: HoloParserOptions): HoloParseResult {
  const parser = new HoloCompositionParser(options);
  return parser.parse(source);
}

/**
 * Quick parse - throws on error
 */
export function parseHoloStrict(source: string): HoloComposition {
  const result = parseHolo(source, { tolerant: false });
  if (!result.success || !result.ast) {
    throw new Error(`Failed to parse: ${result.errors[0]?.message}`);
  }
  return result.ast;
}
