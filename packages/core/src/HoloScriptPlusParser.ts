/**
 * HoloScriptPlus Parser - Extended DSL with Trait Annotations
 * 
 * Extends HoloScript with support for:
 * - @material trait annotations for PBR materials
 * - @lighting trait annotations for dynamic lighting
 * - @rendering trait annotations for GPU optimization
 * 
 * Syntax:
 * orb#sphere {
 *   @material { type: pbr, metallic: 0.5, roughness: 0.4 }
 *   @lighting { preset: studio, shadows: true }
 *   @rendering { quality: high, lod: true }
 * }
 */

import { HoloScriptCodeParser } from './HoloScriptCodeParser';
import { HoloScriptTypeChecker } from './HoloScriptTypeChecker';
import type {
  ASTNode,
  OrbNode,
  GenericASTNode,
} from './types';

// ============================================================================
// Trait Annotation Types
// ============================================================================

export interface TraitAnnotation {
  type: 'material' | 'lighting' | 'rendering';
  config: Record<string, unknown>;
  line?: number;
  column?: number;
}

export interface MaterialTraitAnnotation extends TraitAnnotation {
  type: 'material';
  config: {
    type?: string;
    pbr?: {
      baseColor?: { r: number; g: number; b: number };
      metallic?: number;
      roughness?: number;
      ambientOcclusion?: number;
      emission?: { r: number; g: number; b: number };
      emissionStrength?: number;
    };
    textures?: Array<{ path: string; channel: string }>;
    compression?: 'none' | 'dxt' | 'astc' | 'basis';
    instancing?: boolean;
    streaming?: boolean;
  };
}

export interface LightingTraitAnnotation extends TraitAnnotation {
  type: 'lighting';
  config: {
    preset?: 'studio' | 'outdoor' | 'interior' | 'night' | 'sunset';
    lights?: Array<{
      type: 'directional' | 'point' | 'spot' | 'area' | 'ambient';
      position?: { x: number; y: number; z: number };
      direction?: { x: number; y: number; z: number };
      color?: { r: number; g: number; b: number };
      intensity?: number;
      range?: number;
      shadows?: boolean;
    }>;
    globalIllumination?: {
      skyColor?: { r: number; g: number; b: number };
      groundColor?: { r: number; g: number; b: number };
      probes?: number;
    };
    shadows?: boolean;
    ao?: boolean;
  };
}

export interface RenderingTraitAnnotation extends TraitAnnotation {
  type: 'rendering';
  config: {
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    platform?: 'mobile' | 'vr' | 'desktop';
    lod?: boolean;
    culling?: boolean;
    batching?: boolean;
    instancing?: boolean;
    maxTextureResolution?: number;
    compression?: 'none' | 'dxt' | 'astc' | 'basis';
    targetFPS?: number;
  };
}

export type AnyTraitAnnotation =
  | MaterialTraitAnnotation
  | LightingTraitAnnotation
  | RenderingTraitAnnotation;

// ============================================================================
// Enhanced OrbNode with Graphics Traits
// ============================================================================

export interface GraphicsConfiguration {
  material?: MaterialTraitAnnotation['config'];
  lighting?: LightingTraitAnnotation['config'];
  rendering?: RenderingTraitAnnotation['config'];
}

export interface EnhancedOrbNode extends OrbNode {
  graphics?: GraphicsConfiguration;
  traits?: AnyTraitAnnotation[];
}

// ============================================================================
// HoloScriptPlus Parser
// ============================================================================

export class HoloScriptPlusParser {
  private baseParser: HoloScriptCodeParser;
  private typeChecker: HoloScriptTypeChecker;

  constructor() {
    this.baseParser = new HoloScriptCodeParser();
    this.typeChecker = new HoloScriptTypeChecker();
  }

  /**
   * Parse HoloScript+ code with trait annotations
   */
  parse(code: string): ASTNode[] {
    // First, parse with base parser
    const baseResult = this.baseParser.parse(code);
    const ast = Array.isArray(baseResult) ? baseResult : [baseResult];

    // Then enhance with trait annotations
    return this.enhanceWithTraits(ast, code);
  }

  /**
   * Parse single HoloScript+ expression with traits
   */
  parseExpression(code: string): ASTNode {
    const base = this.baseParser.parseExpression(code);
    return this.enhanceOrbNodeWithTraits(base, code);
  }

  /**
   * Enhance AST nodes with trait annotations
   */
  private enhanceWithTraits(ast: ASTNode[], code: string): ASTNode[] {
    return ast.map((node) => {
      if (node.type === 'orb') {
        return this.enhanceOrbNodeWithTraits(node, code);
      }
      return node;
    });
  }

  /**
   * Enhance OrbNode with trait annotations
   */
  private enhanceOrbNodeWithTraits(node: ASTNode, code: string): EnhancedOrbNode {
    const orbNode = node as OrbNode;
    const enhanced: EnhancedOrbNode = {
      ...orbNode,
      traits: [],
      graphics: {},
    };

    // Find trait annotations in the code near this node
    const traits = this.extractTraitAnnotations(code, node.line);

    enhanced.traits = traits;

    // Build graphics configuration from traits
    if (traits.length > 0) {
      enhanced.graphics = this.buildGraphicsConfig(traits);
    }

    return enhanced;
  }

  /**
   * Extract trait annotations from code
   */
  extractTraitAnnotations(code: string, orbLine?: number): AnyTraitAnnotation[] {
    const traits: AnyTraitAnnotation[] = [];
    const traitRegex = /@(material|lighting|rendering)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;

    let match;
    while ((match = traitRegex.exec(code)) !== null) {
      const type = match[1] as 'material' | 'lighting' | 'rendering';
      const configStr = match[2];

      try {
        const config = this.parseObjectLiteral(configStr);

        switch (type) {
          case 'material':
            traits.push({
              type: 'material',
              config: config as MaterialTraitAnnotation['config'],
            });
            break;

          case 'lighting':
            traits.push({
              type: 'lighting',
              config: config as LightingTraitAnnotation['config'],
            });
            break;

          case 'rendering':
            traits.push({
              type: 'rendering',
              config: config as RenderingTraitAnnotation['config'],
            });
            break;
        }
      } catch (e) {
        console.warn(`Failed to parse ${type} trait annotation:`, e);
      }
    }

    return traits;
  }

  /**
   * Parse object literal from string
   * Supports nested objects and arrays
   */
  parseObjectLiteral(str: string): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // Split by comma, but respect nested braces and brackets
    let depth = 0;
    let current = '';
    let pairs: string[] = [];

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
      } else if (char === ',' && depth === 0) {
        pairs.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      pairs.push(current.trim());
    }

    // Parse each key:value pair
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) continue;

      const key = pair.substring(0, colonIndex).trim();
      const value = pair.substring(colonIndex + 1).trim();

      config[key] = this.parseValue(value);
    }

    return config;
  }

  /**
   * Parse individual values
   */
  parseValue(str: string): unknown {
    str = str.trim();

    // Boolean
    if (str === 'true') return true;
    if (str === 'false') return false;

    // Number
    if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);

    // String
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1);
    }

    // Color object: { r: 0.8, g: 0.2, b: 0.2 }
    if (str.startsWith('{') && str.endsWith('}')) {
      return this.parseObjectLiteral(str.slice(1, -1));
    }

    // Array: [1, 2, 3]
    if (str.startsWith('[') && str.endsWith(']')) {
      const items = str.slice(1, -1).split(',');
      return items.map((item) => this.parseValue(item));
    }

    return str;
  }

  /**
   * Build GraphicsConfiguration from trait annotations
   */
  buildGraphicsConfig(traits: AnyTraitAnnotation[]): GraphicsConfiguration {
    const config: GraphicsConfiguration = {};

    for (const trait of traits) {
      switch (trait.type) {
        case 'material':
          config.material = (trait as MaterialTraitAnnotation).config;
          break;

        case 'lighting':
          config.lighting = (trait as LightingTraitAnnotation).config;
          break;

        case 'rendering':
          config.rendering = (trait as RenderingTraitAnnotation).config;
          break;
      }
    }

    return config;
  }

  /**
   * Validate trait annotation configuration
   */
  validateTraitAnnotation(trait: AnyTraitAnnotation): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (trait.type) {
      case 'material':
        errors.push(...this.validateMaterialTrait(trait as MaterialTraitAnnotation));
        break;

      case 'lighting':
        errors.push(...this.validateLightingTrait(trait as LightingTraitAnnotation));
        break;

      case 'rendering':
        errors.push(...this.validateRenderingTrait(trait as RenderingTraitAnnotation));
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate material trait configuration
   */
  private validateMaterialTrait(trait: MaterialTraitAnnotation): string[] {
    const errors: string[] = [];
    const { config } = trait;

    if (config.pbr) {
      if (config.pbr.metallic !== undefined && (config.pbr.metallic < 0 || config.pbr.metallic > 1)) {
        errors.push('material.pbr.metallic must be between 0 and 1');
      }

      if (config.pbr.roughness !== undefined && (config.pbr.roughness < 0 || config.pbr.roughness > 1)) {
        errors.push('material.pbr.roughness must be between 0 and 1');
      }
    }

    if (config.compression && !['none', 'dxt', 'astc', 'basis'].includes(config.compression)) {
      errors.push(`material.compression must be one of: none, dxt, astc, basis`);
    }

    return errors;
  }

  /**
   * Validate lighting trait configuration
   */
  private validateLightingTrait(trait: LightingTraitAnnotation): string[] {
    const errors: string[] = [];
    const { config } = trait;

    if (config.preset && !['studio', 'outdoor', 'interior', 'night', 'sunset'].includes(config.preset)) {
      errors.push('lighting.preset must be one of: studio, outdoor, interior, night, sunset');
    }

    if (config.lights) {
      config.lights.forEach((light, index) => {
        if (!['directional', 'point', 'spot', 'area', 'ambient'].includes(light.type)) {
          errors.push(`lighting.lights[${index}].type must be a valid light type`);
        }

        if (light.intensity !== undefined && light.intensity < 0) {
          errors.push(`lighting.lights[${index}].intensity must be >= 0`);
        }
      });
    }

    return errors;
  }

  /**
   * Validate rendering trait configuration
   */
  private validateRenderingTrait(trait: RenderingTraitAnnotation): string[] {
    const errors: string[] = [];
    const { config } = trait;

    if (config.quality && !['low', 'medium', 'high', 'ultra'].includes(config.quality)) {
      errors.push('rendering.quality must be one of: low, medium, high, ultra');
    }

    if (config.platform && !['mobile', 'vr', 'desktop'].includes(config.platform)) {
      errors.push('rendering.platform must be one of: mobile, vr, desktop');
    }

    if (config.compression && !['none', 'dxt', 'astc', 'basis'].includes(config.compression)) {
      errors.push('rendering.compression must be one of: none, dxt, astc, basis');
    }

    if (config.maxTextureResolution && config.maxTextureResolution < 128) {
      errors.push('rendering.maxTextureResolution must be >= 128');
    }

    if (config.targetFPS && (config.targetFPS < 24 || config.targetFPS > 240)) {
      errors.push('rendering.targetFPS must be between 24 and 240');
    }

    return errors;
  }

  /**
   * Get trait annotations as graphics traits
   */
  createGraphicsTraits(config: GraphicsConfiguration): any {
    // This will be called by the runtime to create actual trait instances
    return {
      material: config.material ? this.createMaterialTrait(config.material) : null,
      lighting: config.lighting ? this.createLightingTrait(config.lighting) : null,
      rendering: config.rendering ? this.createRenderingTrait(config.rendering) : null,
    };
  }

  /**
   * Create MaterialTrait from config
   */
  private createMaterialTrait(config: any): any {
    // Lazy import to avoid circular dependencies
    const { MaterialTrait } = require('./traits/MaterialTrait');

    const material = new MaterialTrait({
      type: config.type || 'pbr',
      pbr: config.pbr,
    });

    if (config.compression) {
      material.setCompression(config.compression);
    }

    if (config.instancing) {
      material.setInstanced(true);
    }

    if (config.streaming) {
      material.setTextureStreaming(true);
    }

    if (config.textures) {
      config.textures.forEach((tex: any) => {
        material.addTexture(tex);
      });
    }

    return material;
  }

  /**
   * Create LightingTrait from config
   */
  private createLightingTrait(config: any): any {
    const { LightingTrait, LIGHTING_PRESETS } = require('./traits/LightingTrait');

    let lighting: any;

    if (config.preset) {
      const preset = LIGHTING_PRESETS[config.preset];
      lighting = new LightingTrait(preset);
    } else {
      lighting = new LightingTrait();
    }

    if (config.globalIllumination) {
      lighting.setGlobalIllumination(config.globalIllumination);
    }

    if (config.lights) {
      config.lights.forEach((light: any) => {
        lighting.addLight(light);
      });
    }

    return lighting;
  }

  /**
   * Create RenderingTrait from config
   */
  private createRenderingTrait(config: any): any {
    const { RenderingTrait } = require('./traits/RenderingTrait');

    const rendering = new RenderingTrait();

    if (config.quality) {
      rendering.applyQualityPreset(config.quality);
    }

    if (config.platform) {
      switch (config.platform) {
        case 'mobile':
          rendering.optimizeForMobile();
          break;
        case 'vr':
          rendering.optimizeForVRAR(config.targetFPS || 90);
          break;
        case 'desktop':
          rendering.optimizeForDesktop();
          break;
      }
    }

    if (config.lod !== false) {
      rendering.setupLODLevels('automatic');
    }

    if (config.culling !== false) {
      rendering.setFrustumCulling(true);
    }

    if (config.compression) {
      rendering.setTextureCompression(config.compression);
    }

    if (config.maxTextureResolution) {
      rendering.setMaxTextureResolution(config.maxTextureResolution);
    }

    return rendering;
  }
}

export default HoloScriptPlusParser;
