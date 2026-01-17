/**
 * @holoscript/core
 *
 * HoloScript+ - VR language with declarative syntax, state management, and VR interactions.
 * Enhanced version of HoloScript with:
 * - VR interaction traits (@grabbable, @throwable, @hoverable, etc.)
 * - Reactive state management (@state { ... })
 * - Control flow (@for, @if directives)
 * - TypeScript companion imports
 * - Expression interpolation ${...}
 *
 * Fully backward compatible with original HoloScript syntax.
 *
 * @example
 * ```typescript
 * import { HoloScriptPlusParser, HoloScriptPlusRuntime } from '@holoscript/core';
 *
 * const parser = new HoloScriptPlusParser();
 * const result = parser.parse(`
 *   orb#myOrb {
 *     position: [0, 0, 0]
 *     @grabbable(snap_to_hand: true)
 *     @throwable(bounce: true)
 *   }
 * `);
 *
 * const runtime = new HoloScriptPlusRuntime(result.ast);
 * await runtime.mount(document.body);
 * ```
 *
 * @packageDocumentation
 */
// Import for use in utility functions
import { HoloScriptParser } from './HoloScriptParser';
import { HoloScriptRuntime } from './HoloScriptRuntime';
// Parser
export { HoloScriptParser } from './HoloScriptParser';
export { HoloScript2DParser } from './HoloScript2DParser';
export { HoloScriptCodeParser } from './HoloScriptCodeParser';
// HoloScript+ Parser (NEW)
export { HoloScriptPlusParser, createParser, parse as parseHoloScriptPlus } from './parser/HoloScriptPlusParser';
// HoloScript+ Enhanced Parser with Trait Annotations (NEW - Phase 3)
export { HoloScriptPlusParser as HoloScriptTraitAnnotationParser, } from './HoloScriptPlusParser';
// Runtime
export { HoloScriptRuntime } from './HoloScriptRuntime';
// HoloScript+ Runtime (NEW)
export { HoloScriptPlusRuntimeImpl } from './runtime/HoloScriptPlusRuntime';
// HoloScript+ State Management (NEW)
export { ReactiveState, createState, reactive, effect, computed, bind } from './state/ReactiveState';
// HoloScript+ VR Traits (NEW)
export { VRTraitRegistry } from './traits/VRTraitSystem';
// HoloScript+ Voice Input Trait (NEW - Phase 1)
export { VoiceInputTrait, createVoiceInputTrait, } from './traits/VoiceInputTrait';
// HoloScript+ AI Driver NPC Trait (NEW - Phase 1)
export { AIDriverTrait, createAIDriverTrait, BehaviorTreeRunner, GOAPPlanner, } from './traits/AIDriverTrait';
// HoloScript+ Material Trait (NEW - Phase 2: Graphics)
export { MaterialTrait, createMaterialTrait, MATERIAL_PRESETS, } from './traits/MaterialTrait';
// HoloScript+ Lighting Trait (NEW - Phase 2: Graphics)
export { LightingTrait, createLightingTrait, LIGHTING_PRESETS, } from './traits/LightingTrait';
// HoloScript+ Rendering Trait (NEW - Phase 2: Graphics)
export { RenderingTrait, createRenderingTrait, } from './traits/RenderingTrait';
// Performance Telemetry (NEW - Phase 1)
export { PerformanceTelemetry, getPerformanceTelemetry, } from './runtime/PerformanceTelemetry';
// Hololand Graphics Pipeline Service (NEW - Phase 4)
export { HololandGraphicsPipelineService, } from './services/HololandGraphicsPipelineService';
// Platform Performance Optimizer (NEW - Phase 5)
export { PlatformPerformanceOptimizer, } from './services/PlatformPerformanceOptimizer';
// Type Checker
export { HoloScriptTypeChecker, createTypeChecker, } from './HoloScriptTypeChecker';
// Debugger
export { HoloScriptDebugger, createDebugger, } from './HoloScriptDebugger';
// Logger
export { logger, setHoloScriptLogger, enableConsoleLogging, resetLogger, NoOpLogger, ConsoleLogger, } from './logger';
// Version
export const HOLOSCRIPT_VERSION = '1.0.0-alpha.1';
// Supported Platforms
export const HOLOSCRIPT_SUPPORTED_PLATFORMS = [
    'WebXR',
    'Oculus Quest',
    'HTC Vive',
    'Valve Index',
    'Apple Vision Pro',
    'Windows Mixed Reality',
];
// Voice Commands Reference
export const HOLOSCRIPT_VOICE_COMMANDS = [
    // 3D VR Commands
    'create orb [name]',
    'summon function [name]',
    'connect [from] to [to]',
    'execute [function]',
    'debug program',
    'visualize [data]',
    'gate [condition]',
    'stream [source] through [transformations]',
    // 2D UI Commands
    'create button [name]',
    'add textinput [name]',
    'create panel [name]',
    'add slider [name]',
];
// Gesture Reference
export const HOLOSCRIPT_GESTURES = [
    'pinch - create object',
    'swipe - connect objects',
    'rotate - modify properties',
    'grab - select object',
    'spread - expand view',
    'fist - execute action',
];
// Demo Scripts
export const HOLOSCRIPT_DEMO_SCRIPTS = {
    helloWorld: `orb greeting {
  message: "Hello, HoloScript World!"
  color: "#00ffff"
  glow: true
}

function displayGreeting() {
  show greeting
}`,
    aiAgent: `orb agentCore {
  personality: "helpful"
  capabilities: ["conversation", "problem_solving", "learning"]
  energy: 100
}

function processQuery(query: string): string {
  analyze query
  generate response
  return response
}`,
    neuralNetwork: `orb inputLayer { neurons: 784 }
orb hiddenLayer { neurons: 128 }
orb outputLayer { neurons: 10 }

connect inputLayer to hiddenLayer as "weights"
connect hiddenLayer to outputLayer as "weights"

function trainNetwork(data: array): object {
  forward_pass data
  calculate_loss
  backward_pass
  update_weights
  return metrics
}`,
    loginForm: `button loginBtn {
  text: "Login"
  x: 100
  y: 150
  width: 200
  height: 40
  onClick: handleLogin
}

textinput usernameInput {
  placeholder: "Username"
  x: 100
  y: 50
  width: 200
  height: 36
}

textinput passwordInput {
  placeholder: "Password"
  x: 100
  y: 100
  width: 200
  height: 36
}`,
    dashboard: `panel sidebar {
  x: 0
  y: 0
  width: 200
  height: 600
  backgroundColor: "#2c3e50"
}

text title {
  content: "Dashboard"
  x: 220
  y: 20
  fontSize: 24
  color: "#34495e"
}

button refreshBtn {
  text: "Refresh Data"
  x: 220
  y: 60
  onClick: refreshData
}`,
};
// Utility Functions
/**
 * Create a pre-configured HoloScript environment
 */
export function createHoloScriptEnvironment() {
    return {
        parser: new HoloScriptParser(),
        runtime: new HoloScriptRuntime(),
        version: HOLOSCRIPT_VERSION,
    };
}
/**
 * Check if the current environment supports VR/XR
 */
export function isHoloScriptSupported() {
    if (typeof globalThis === 'undefined')
        return false;
    const win = globalThis;
    if (!win.window)
        return false;
    return !!(win.window.navigator?.xr ||
        win.window.navigator?.getVRDisplays ||
        win.window.webkitGetUserMedia);
}
