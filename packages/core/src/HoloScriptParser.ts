/**
 * HoloScript Parser
 *
 * Parses voice commands, gestures, and code into HoloScript AST.
 * Supports both 3D VR and 2D UI elements.
 */

import { logger } from './logger';
import { HoloScript2DParser } from './HoloScript2DParser';
import type {
  ASTNode,
  OrbNode,
  ParameterNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  GenericASTNode,
  SpatialPosition,
  VoiceCommand,
  GestureData,
  UI2DNode,
  HologramShape,
  ScaleNode,
  FocusNode,
  CompositionNode,
  EnvironmentNode,
  TemplateNode,
  GlobalHandlerNode,
  HoloScriptValue,
  ServerNode,
  DatabaseNode,
  FetchNode,
  ExecuteNode,
  DebugNode,
  VisualizeNode,
} from './types';

const HOLOSCRIPT_SECURITY_CONFIG = {
  maxCommandLength: 1000,
  maxTokens: 100,
  maxHologramsPerUser: 50,
  suspiciousKeywords: [
    'process', 'require', 'eval', 'import', 'constructor',
    'prototype', '__proto__', 'fs', 'child_process',
    'spawn', 'xmlhttprequest',
  ],
  allowedShapes: ['orb', 'cube', 'cylinder', 'pyramid', 'sphere', 'function', 'gate', 'stream', 'server', 'database', 'fetch'],
  allowedUIElements: [
    'canvas', 'button', 'textinput', 'panel', 'text', 'image',
    'list', 'modal', 'slider', 'toggle', 'dropdown',
    'flex-container', 'grid-container', 'scroll-view'
  ],
};

export class HoloScriptParser {
  private ast: ASTNode[] = [];
  private parser2D: HoloScript2DParser;

  constructor() {
    this.parser2D = new HoloScript2DParser();
  }

  /**
   * Parse voice command into AST nodes
   */
  parseVoiceCommand(command: VoiceCommand): ASTNode[] {
    if (command.command.length > HOLOSCRIPT_SECURITY_CONFIG.maxCommandLength) {
      logger.warn('Command too long', {
        length: command.command.length,
        limit: HOLOSCRIPT_SECURITY_CONFIG.maxCommandLength,
      });
      return [];
    }

    const rawTokens = this.tokenizeCommand(command.command.toLowerCase());
    const tokens = this.sanitizeTokens(rawTokens);

    if (tokens.length === 0) return [];

    if (tokens.length > HOLOSCRIPT_SECURITY_CONFIG.maxTokens) {
      logger.warn('Too many tokens in command', {
        tokenCount: tokens.length,
        limit: HOLOSCRIPT_SECURITY_CONFIG.maxTokens,
      });
      return [];
    }

    const commandType = tokens[0];

    // Check if this is a 2D UI command
    if ((commandType === 'create' || commandType === 'add') && tokens.length > 1) {
      const elementType = tokens[1];
      if (HOLOSCRIPT_SECURITY_CONFIG.allowedUIElements.includes(elementType)) {
        return this.parse2DUICommand(command.command);
      }
    }

    switch (commandType) {
      case 'create':
      case 'summon':
        return this.parseCreateCommand(tokens.slice(1), command.spatialContext);
      case 'connect':
        return this.parseConnectCommand(tokens.slice(1));
      case 'execute':
      case 'run':
        return this.parseExecuteCommand(tokens.slice(1));
      case 'debug':
        return this.parseDebugCommand(tokens.slice(1));
      case 'visualize':
        return this.parseVisualizeCommand(tokens.slice(1));
      case 'composition':
        return this.parseComposition(tokens.slice(1));
      case 'environment':
        return this.parseEnvironment(tokens.slice(1));
      case 'template':
        return this.parseTemplate(tokens.slice(1));
      case 'every':
      case 'on_user_gesture':
        return this.parseGlobalHandler(commandType, tokens.slice(1));
      case 'scale':
        return this.parseScale(tokens.slice(1));
      case 'focus':
        return this.parseFocus(tokens.slice(1));
      default:
        return this.parseGenericCommand(tokens);
    }
  }

  private parse2DUICommand(command: string): ASTNode[] {
    const ui2DNode = this.parser2D.parse2DVoiceCommand(command);
    if (!ui2DNode) return [];

    const astNode: GenericASTNode = {
      type: '2d-ui',
      uiElementType: ui2DNode.elementType,
      name: ui2DNode.name,
      properties: ui2DNode.properties,
      events: ui2DNode.events,
      children: ui2DNode.children,
    };

    return [astNode];
  }

  /**
   * Parse gesture input
   */
  parseGesture(gesture: GestureData): ASTNode[] {
    switch (gesture.type) {
      case 'pinch':
        return this.parsePinchGesture(gesture);
      case 'swipe':
        return this.parseSwipeGesture(gesture);
      case 'rotate':
        return this.parseRotateGesture(gesture);
      case 'grab':
        return this.parseGrabGesture(gesture);
      default:
        return [];
    }
  }

  private parseCreateCommand(tokens: string[], position?: SpatialPosition): ASTNode[] {
    if (tokens.length < 2) return [];

    const shape = tokens[0];
    const name = tokens[1];

    switch (shape) {
      case 'orb':
      case 'sphere':
        return [this.createOrbNode(name, position)];
      case 'function':
        return [this.createFunctionNode(name, tokens.slice(2), position)];
      case 'gate':
        return [this.createGateNode(name, tokens.slice(2), position)];
      case 'stream':
        return [this.createStreamNode(name, tokens.slice(2), position)];
      case 'server':
        return [this.createServerNode(tokens.slice(1), position)];
      case 'database':
        return [this.createDatabaseNode(tokens.slice(1), position)];
      case 'fetch':
        return [this.createFetchNode(tokens.slice(1), position)];
      default:
        return [this.createGenericNode(shape, name, position)];
    }
  }

  private parseConnectCommand(tokens: string[]): ASTNode[] {
    if (tokens.length < 3) return [];

    const from = tokens[0];
    const to = tokens[2];
    const dataType = tokens.length > 3 ? tokens[3] : 'any';

    return [{
      type: 'connection',
      from,
      to,
      dataType,
      bidirectional: tokens.includes('bidirectional') || tokens.includes('both'),
    } as ConnectionNode];
  }

  private createOrbNode(name: string, position?: SpatialPosition): OrbNode {
    return {
      type: 'orb',
      name,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'orb',
        color: '#00ffff',
        size: 1,
        glow: true,
        interactive: true,
      },
      properties: {} as Record<string, HoloScriptValue>,
      methods: [],
    };
  }

  private createFunctionNode(name: string, params: string[], position?: SpatialPosition): GenericASTNode {
    const parameters: ParameterNode[] = [];

    let inParams = false;
    for (const param of params) {
      if (param === 'with' || param === 'parameters') {
        inParams = true;
        continue;
      }
      if (inParams && param !== 'do' && param !== 'execute') {
        parameters.push({
          type: 'parameter',
          name: param,
          dataType: 'any',
        });
      }
    }

    return {
      type: 'function',
      name,
      parameters,
      body: [],
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'cube',
        color: '#ff6b35',
        size: 1.5,
        glow: true,
        interactive: true,
      },
    };
  }

  private createGateNode(_name: string, params: string[], position?: SpatialPosition): GateNode {
    const condition = params.join(' ').replace('condition', '').trim();

    return {
      type: 'gate',
      condition,
      truePath: [],
      falsePath: [],
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'pyramid',
        color: '#4ecdc4',
        size: 1,
        glow: true,
        interactive: true,
      },
    };
  }

  private createStreamNode(name: string, params: string[], position?: SpatialPosition): StreamNode {
    return {
      type: 'stream',
      name,
      source: params[0] || 'unknown',
      transformations: [],
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'cylinder',
        color: '#45b7d1',
        size: 2,
        glow: true,
        interactive: true,
      },
    };
  }

  private createGenericNode(shape: string, name: string, position?: SpatialPosition): GenericASTNode {
    return {
      type: shape,
      name,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: shape as HologramShape,
        color: '#ffffff',
        size: 1,
        glow: false,
        interactive: true,
      },
    };
  }

  private createServerNode(params: string[], position?: SpatialPosition): ServerNode {
    // Example: create server port 3000 routes /api,/health
    const portIndex = params.indexOf('port');
    const port = portIndex !== -1 ? parseInt(params[portIndex + 1]) : 3000;
    const routesIndex = params.indexOf('routes');
    const routes = routesIndex !== -1 ? params[routesIndex + 1].split(',') : [];

    return {
      type: 'server',
      port,
      routes,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'cube',
        color: '#000000', // Black box
        size: 2,
        glow: true,
        interactive: false,
      },
    };
  }

  private createDatabaseNode(params: string[], position?: SpatialPosition): DatabaseNode {
    // Example: create database query "SELECT * FROM users"
    const queryIndex = params.indexOf('query');
    const query = queryIndex !== -1 ? params.slice(queryIndex + 1).join(' ') : '';

    return {
      type: 'database',
      query,
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'cylinder',
        color: '#ffd700', // Gold
        size: 1.5,
        glow: true,
        interactive: true,
      },
    };
  }

  private createFetchNode(params: string[], position?: SpatialPosition): FetchNode {
    // Example: create fetch url google.com
    const urlIndex = params.indexOf('url');
    const url = urlIndex !== -1 ? params[urlIndex + 1] : '';

    return {
      type: 'fetch',
      url,
      method: 'GET',
      position: position || { x: 0, y: 0, z: 0 },
      hologram: {
        shape: 'orb',
        color: '#00ff00', // Green
        size: 0.8,
        glow: true,
        interactive: true,
      },
    };
  }

  private parsePinchGesture(gesture: GestureData): ASTNode[] {
    return [{
      type: 'create',
      position: gesture.position,
      hologram: { shape: 'orb', color: '#ff0000', size: 0.5, glow: true, interactive: true },
    }];
  }

  private parseSwipeGesture(gesture: GestureData): ASTNode[] {
    if (!gesture.direction) return [];
    return [{
      type: 'connect',
      position: gesture.position,
      hologram: { shape: 'cylinder', color: '#00ff00', size: gesture.magnitude, glow: true, interactive: false },
    }];
  }

  private parseRotateGesture(gesture: GestureData): ASTNode[] {
    return [{
      type: 'modify',
      position: gesture.position,
      hologram: { shape: 'sphere', color: '#ffff00', size: 0.8, glow: true, interactive: true },
    }];
  }

  private parseGrabGesture(gesture: GestureData): ASTNode[] {
    return [{
      type: 'select',
      position: gesture.position,
      hologram: { shape: 'cube', color: '#ff00ff', size: 0.3, glow: true, interactive: true },
    }];
  }

  private tokenizeCommand(command: string): string[] {
    return command
      .toLowerCase()
      // Allow alphanumeric, underscores, and common URL/path/SQL chars
      .replace(/[^\w\s.,:/=?&"'*()\[\]@%-]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private sanitizeTokens(tokens: string[]): string[] {
    return tokens.filter(token => {
      const isSuspicious = HOLOSCRIPT_SECURITY_CONFIG.suspiciousKeywords.some(
        keyword => token.includes(keyword)
      );
      if (isSuspicious) {
        logger.warn('Suspicious token blocked', { token });
        return false;
      }
      return true;
    });
  }

  private parseExecuteCommand(tokens: string[]): ExecuteNode[] {
    return [{
      type: 'execute',
      target: tokens[0] || 'unknown',
      hologram: { shape: 'sphere', color: '#ff4500', size: 1.2, glow: true, interactive: false },
    }];
  }

  private parseDebugCommand(tokens: string[]): DebugNode[] {
    return [{
      type: 'debug',
      target: tokens[0] || 'program',
      hologram: { shape: 'pyramid', color: '#ff1493', size: 0.8, glow: true, interactive: true },
    }];
  }

  private parseVisualizeCommand(tokens: string[]): VisualizeNode[] {
    return [{
      type: 'visualize',
      target: tokens[0] || 'data',
      hologram: { shape: 'cylinder', color: '#32cd32', size: 1.5, glow: true, interactive: true },
    }];
  }

  private parseGenericCommand(tokens: string[]): GenericASTNode[] {
    return [{
      type: 'generic',
      command: tokens.join(' '),
      hologram: { shape: 'orb', color: '#808080', size: 0.5, glow: false, interactive: true },
    }];
  }

  private parseComposition(tokens: string[]): CompositionNode[] {
    const name = tokens[0] || 'unnamed_composition';
    return [{
      type: 'composition',
      name,
      children: [],
      position: { x: 0, y: 0, z: 0 }
    }];
  }

  private parseEnvironment(tokens: string[]): EnvironmentNode[] {
    const settings: Record<string, HoloScriptValue> = {};
    if (tokens.includes('fog')) settings.fog = true;
    if (tokens.includes('audio')) settings.audio = tokens[tokens.indexOf('audio') + 1];
    if (tokens.includes('theme')) settings.theme = tokens[tokens.indexOf('theme') + 1];

    return [{
      type: 'environment',
      settings
    }];
  }

  private parseTemplate(tokens: string[]): TemplateNode[] {
    const name = tokens[0] || 'template';
    const parameters = tokens.slice(1).filter(t => t !== 'with' && t !== 'params');

    return [{
      type: 'template',
      name,
      parameters,
      body: []
    }];
  }

  private parseGlobalHandler(type: string, tokens: string[]): GlobalHandlerNode[] {
    return [{
      type: 'global_handler',
      handlerType: type === 'every' ? 'every' : 'on_gesture',
      config: { value: tokens[0] },
      action: tokens.slice(1).join(' ')
    }];
  }

  private parseScale(tokens: string[]): ScaleNode[] {
    const magnitude = tokens[0] || 'standard';
    const multipliers: Record<string, number> = {
      'galactic': 1000000,
      'macro': 1000,
      'standard': 1,
      'micro': 0.001,
      'atomic': 0.000001
    };

    return [{
      type: 'scale',
      magnitude,
      multiplier: multipliers[magnitude] || 1,
      body: []
    }];
  }

  private parseFocus(tokens: string[]): FocusNode[] {
    return [{
      type: 'focus',
      target: tokens[0] || 'origin',
      body: []
    }];
  }

  getAST(): ASTNode[] {
    return [...this.ast];
  }

  addNode(node: ASTNode): void {
    this.ast.push(node);
  }

  clear(): void {
    this.ast = [];
  }

  findNode(name: string): ASTNode | null {
    return this.ast.find(node => 'name' in node && (node as { name?: string }).name === name) || null;
  }

  getNodesAtPosition(position: SpatialPosition, radius: number = 1): ASTNode[] {
    return this.ast.filter(node => {
      if (!node.position) return false;
      const distance = Math.sqrt(
        Math.pow(node.position.x - position.x, 2) +
        Math.pow(node.position.y - position.y, 2) +
        Math.pow(node.position.z - position.z, 2)
      );
      return distance <= radius;
    });
  }

  parse2DCode(code: string): UI2DNode | null {
    return this.parser2D.parse2DElement(code);
  }

  get2DParser(): HoloScript2DParser {
    return this.parser2D;
  }
}
