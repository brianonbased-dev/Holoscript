#!/usr/bin/env node

/**
 * Post-build script for @holoscript/core
 * Generates type declaration files for downstream packages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Go up from scripts/ to core/, then to dist/
const distDir = path.join(__dirname, '..', 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Comprehensive type declaration - includes all major exports  
const mainDTS = `/**
 * @fileoverview Type definitions for HoloScript Core (v3.0)
 * @module @holoscript/core
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export interface ParseResult {
  ast: any;
  errors: any[];
  warnings: any[];
}

// ============================================================================
// PARSERS
// ============================================================================

export class HoloScriptPlusParser {
  parse(source: string): ParseResult;
  parseExpression(source: string): any;
  parseStatement(source: string): any;
}

export class HoloCompositionParser {
  parse(source: string): any;
}

export function parse(source: string, options?: any): ParseResult;
export function parseHolo(source: string, options?: any): any;
export function parseHoloStrict(source: string): any;
export function parseHoloScriptPlus(source: string, options?: any): ParseResult;

// ============================================================================
// COMPOSITION TYPES (from .holo files)
// ============================================================================

export interface HoloComposition extends ASTNode {
  type: 'Composition';
  name: string;
  environment?: any;
  state?: any;
  templates: any[];
  objects: any[];
  spatialGroups: any[];
  lights: any[];
  effects?: any;
  camera?: any;
  logic?: any;
  imports: any[];
  timelines: any[];
  audio: any[];
  zones: any[];
  ui?: any;
  transitions: any[];
  conditionals: any[];
  iterators: any[];
  [key: string]: any;
}

export interface HoloEnvironment extends ASTNode {
  type: 'Environment';
  properties: any[];
}

export interface HoloState extends ASTNode {
  type: 'State';
  properties: any[];
}

export interface HoloTemplate extends ASTNode {
  type: 'Template';
  name: string;
  properties: any[];
}

export interface HoloObjectDecl extends ASTNode {
  type: 'Object';
  name: string;
  traits: any[];
  properties: any[];
}

export interface HoloObjectTrait extends ASTNode {
  type: 'Trait';
  name: string;
  config?: any;
}

export interface HoloSpatialGroup extends ASTNode {
  type: 'SpatialGroup';
  name: string;
  objects: HoloObjectDecl[];
}

export interface HoloLight extends ASTNode {
  type: 'Light';
}

export interface HoloLogic extends ASTNode {
  type: 'Logic';
}

export interface HoloEventHandler extends ASTNode {
  event: string;
  [key: string]: any;
}

export interface HoloAction extends ASTNode {
  name: string;
  [key: string]: any;
}

export interface HoloParseResult {
  success: boolean;
  ast?: HoloComposition;
  errors: any[];
  warnings: any[];
}

// ============================================================================
// TRAIT VISUAL SYSTEM
// ============================================================================

export class TraitCompositor {
  compose(traits: any[], material: any): any;
  [key: string]: any;
}

export interface TraitVisualConfig {
  [key: string]: any;
}

export interface R3FMaterialProps {
  [key: string]: any;
}

export interface R3FNode {
  [key: string]: any;
}

export interface VisualLayer {
  [key: string]: any;
}

export const VISUAL_LAYER_PRIORITY: Record<string, number>;
export const MATERIAL_PRESETS: Record<string, any>;

// ============================================================================
// MATERIAL SYSTEM
// ============================================================================

export interface MaterialConfig {
  [key: string]: any;
}

export interface PBRMaterial {
  [key: string]: any;
}

export type MaterialType = string;
export type TextureChannel = string;

export interface TextureMap {
  [key: string]: any;
}

// ============================================================================
// COMPILERS & GENERATORS
// ============================================================================

export class HoloScriptCompiler {
  compile(ast: any, target: string): any;
}

export class R3FCompiler {
  compile(ast: any): any;
  [key: string]: any;
}

// ============================================================================
// RUNTIME & EXECUTION
// ============================================================================

export class HoloScriptRuntime {
  execute(ast: any, context?: any): Promise<any>;
}

export interface RuntimeOptions {
  [key: string]: any;
}

export interface Renderer {
  [key: string]: any;
}

export interface NodeInstance {
  [key: string]: any;
}

// ============================================================================
// TYPE CHECKING
// ============================================================================

export class HoloScriptTypeChecker {
  check(ast: any): any;
}

export interface ValidationError {
  message: string;
  loc?: any;
}

// ============================================================================
// ERROR HANDLING & DIAGNOSTICS
// ============================================================================

export interface RichParseError {
  message: string;
  loc?: any;
  code?: string;
  suggestion?: string;
  severity?: 'error' | 'warning';
}

export const HSPLUS_ERROR_CODES: Record<string, string>;

export function createRichError(message: string, code?: string): RichParseError;
export function createTraitError(traitName: string): RichParseError;
export function createKeywordError(keyword: string): RichParseError;
export function findSimilarTrait(partialName: string): string | null;
export function findSimilarKeyword(partialName: string): string | null;
export function getSourceContext(source: string, location: any): string;
export function formatRichError(error: RichParseError): string;
export function formatRichErrors(errors: RichParseError[]): string;
export function getErrorCodeDocumentation(code: string): string;

// ============================================================================
// DEBUGGER
// ============================================================================

export class HoloScriptDebugger {
  debug(ast: any): any;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  parse,
  parseHolo,
  parseHoloStrict,
  parseHoloScriptPlus,
  HoloScriptPlusParser,
  HoloCompositionParser,
  HoloScriptCompiler,
  HoloScriptRuntime,
  HoloScriptTypeChecker,
  HoloScriptDebugger,
  TraitCompositor,
  MATERIAL_PRESETS,
};
`;

const parserDTS = `export class HoloScriptPlusParser {
  parse(source: string): any;
}
export function parse(source: string): any;
`;

const runtimeDTS = `export class HoloScriptRuntime {
  execute(ast: any, context?: any): Promise<any>;
}
`;

const typeCheckerDTS = `export class HoloScriptTypeChecker {
  check(ast: any): any;
}
`;

const debuggerDTS = `export class HoloScriptDebugger {
  debug(ast: any): any;
}
`;

const wotDTS = `export interface WoT {}
`;

// Write type declaration files
const files = [
  { path: path.join(distDir, 'index.d.ts'), content: mainDTS },
  { path: path.join(distDir, 'parser.d.ts'), content: parserDTS },
  { path: path.join(distDir, 'runtime.d.ts'), content: runtimeDTS },
  { path: path.join(distDir, 'type-checker.d.ts'), content: typeCheckerDTS },
  { path: path.join(distDir, 'debugger.d.ts'), content: debuggerDTS },
];

for (const file of files) {
  try {
    fs.writeFileSync(file.path, file.content, 'utf8');
    console.log(`✓ Created ${path.basename(file.path)}`);
  } catch (err) {
    console.error(`✗ Failed to create ${path.basename(file.path)}:`, err.message);
  }
}

// Create wot directory if needed
const wotDir = path.join(distDir, 'wot');
if (!fs.existsSync(wotDir)) {
  fs.mkdirSync(wotDir, { recursive: true });
}

try {
  fs.writeFileSync(path.join(wotDir, 'index.d.ts'), wotDTS, 'utf8');
  console.log(`✓ Created wot/index.d.ts`);
} catch (err) {
  console.error(`✗ Failed to create wot/index.d.ts:`, err.message);
}

console.log('\n✓ Type declaration files generated successfully');
