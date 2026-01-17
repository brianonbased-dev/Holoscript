/**
 * HoloScript Parser
 *
 * Parses voice commands, gestures, and code into HoloScript AST.
 * Supports both 3D VR and 2D UI elements.
 */
import { logger } from './logger';
import { HoloScript2DParser } from './HoloScript2DParser';
const HOLOSCRIPT_SECURITY_CONFIG = {
    maxCommandLength: 1000,
    maxTokens: 100,
    maxHologramsPerUser: 50,
    suspiciousKeywords: [
        'process', 'require', 'eval', 'import', 'constructor',
        'prototype', '__proto__', 'fs', 'child_process', 'exec',
        'spawn', 'fetch', 'xmlhttprequest',
    ],
    allowedShapes: ['orb', 'cube', 'cylinder', 'pyramid', 'sphere', 'function', 'gate', 'stream'],
    allowedUIElements: [
        'canvas', 'button', 'textinput', 'panel', 'text', 'image',
        'list', 'modal', 'slider', 'toggle', 'dropdown',
        'flex-container', 'grid-container', 'scroll-view'
    ],
};
export class HoloScriptParser {
    constructor() {
        this.ast = [];
        this.parser2D = new HoloScript2DParser();
    }
    /**
     * Parse voice command into AST nodes
     */
    parseVoiceCommand(command) {
        if (command.command.length > HOLOSCRIPT_SECURITY_CONFIG.maxCommandLength) {
            logger.warn('Command too long', {
                length: command.command.length,
                limit: HOLOSCRIPT_SECURITY_CONFIG.maxCommandLength,
            });
            return [];
        }
        const rawTokens = this.tokenizeCommand(command.command.toLowerCase());
        const tokens = this.sanitizeTokens(rawTokens);
        if (tokens.length === 0)
            return [];
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
            default:
                return this.parseGenericCommand(tokens);
        }
    }
    parse2DUICommand(command) {
        const ui2DNode = this.parser2D.parse2DVoiceCommand(command);
        if (!ui2DNode)
            return [];
        const astNode = {
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
    parseGesture(gesture) {
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
    parseCreateCommand(tokens, position) {
        if (tokens.length < 2)
            return [];
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
            default:
                return [this.createGenericNode(shape, name, position)];
        }
    }
    parseConnectCommand(tokens) {
        if (tokens.length < 3)
            return [];
        const from = tokens[0];
        const to = tokens[2];
        const dataType = tokens.length > 3 ? tokens[3] : 'any';
        return [{
                type: 'connection',
                from,
                to,
                dataType,
                bidirectional: tokens.includes('bidirectional') || tokens.includes('both'),
            }];
    }
    createOrbNode(name, position) {
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
            properties: {},
            methods: [],
        };
    }
    createFunctionNode(name, params, position) {
        const parameters = [];
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
    createGateNode(_name, params, position) {
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
    createStreamNode(name, params, position) {
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
    createGenericNode(shape, name, position) {
        return {
            type: shape,
            name,
            position: position || { x: 0, y: 0, z: 0 },
            hologram: {
                shape: shape,
                color: '#ffffff',
                size: 1,
                glow: false,
                interactive: true,
            },
        };
    }
    parsePinchGesture(gesture) {
        return [{
                type: 'create',
                position: gesture.position,
                hologram: { shape: 'orb', color: '#ff0000', size: 0.5, glow: true, interactive: true },
            }];
    }
    parseSwipeGesture(gesture) {
        if (!gesture.direction)
            return [];
        return [{
                type: 'connect',
                position: gesture.position,
                hologram: { shape: 'cylinder', color: '#00ff00', size: gesture.magnitude, glow: true, interactive: false },
            }];
    }
    parseRotateGesture(gesture) {
        return [{
                type: 'modify',
                position: gesture.position,
                hologram: { shape: 'sphere', color: '#ffff00', size: 0.8, glow: true, interactive: true },
            }];
    }
    parseGrabGesture(gesture) {
        return [{
                type: 'select',
                position: gesture.position,
                hologram: { shape: 'cube', color: '#ff00ff', size: 0.3, glow: true, interactive: true },
            }];
    }
    tokenizeCommand(command) {
        return command
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 0);
    }
    sanitizeTokens(tokens) {
        return tokens.filter(token => {
            const isSuspicious = HOLOSCRIPT_SECURITY_CONFIG.suspiciousKeywords.some(keyword => token.includes(keyword));
            if (isSuspicious) {
                logger.warn('Suspicious token blocked', { token });
                return false;
            }
            return true;
        });
    }
    parseExecuteCommand(tokens) {
        return [{
                type: 'execute',
                target: tokens[0] || 'unknown',
                hologram: { shape: 'sphere', color: '#ff4500', size: 1.2, glow: true, interactive: false },
            }];
    }
    parseDebugCommand(tokens) {
        return [{
                type: 'debug',
                target: tokens[0] || 'program',
                hologram: { shape: 'pyramid', color: '#ff1493', size: 0.8, glow: true, interactive: true },
            }];
    }
    parseVisualizeCommand(tokens) {
        return [{
                type: 'visualize',
                target: tokens[0] || 'data',
                hologram: { shape: 'cylinder', color: '#32cd32', size: 1.5, glow: true, interactive: true },
            }];
    }
    parseGenericCommand(tokens) {
        return [{
                type: 'generic',
                command: tokens.join(' '),
                hologram: { shape: 'orb', color: '#808080', size: 0.5, glow: false, interactive: true },
            }];
    }
    getAST() {
        return [...this.ast];
    }
    addNode(node) {
        this.ast.push(node);
    }
    clear() {
        this.ast = [];
    }
    findNode(name) {
        return this.ast.find(node => 'name' in node && node.name === name) || null;
    }
    getNodesAtPosition(position, radius = 1) {
        return this.ast.filter(node => {
            if (!node.position)
                return false;
            const distance = Math.sqrt(Math.pow(node.position.x - position.x, 2) +
                Math.pow(node.position.y - position.y, 2) +
                Math.pow(node.position.z - position.z, 2));
            return distance <= radius;
        });
    }
    parse2DCode(code) {
        return this.parser2D.parse2DElement(code);
    }
    get2DParser() {
        return this.parser2D;
    }
}
