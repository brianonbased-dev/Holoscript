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
import type { ASTNode, OrbNode } from './types';
import { MaterialTrait } from './traits/MaterialTrait';
import { LightingTrait, LIGHTING_PRESETS } from './traits/LightingTrait';
import { RenderingTrait } from './traits/RenderingTrait';
import { ShaderTrait, SHADER_PRESETS, type ShaderConfig } from './traits/ShaderTrait';

// ============================================================================
// Trait Annotation Types
// ============================================================================

export interface TraitAnnotation {
  type: 'material' | 'lighting' | 'rendering' | 'shader' | 'networked' | 'rpc' | 'joint' | 'ik';
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

export interface ShaderTraitAnnotation extends TraitAnnotation {
  type: 'shader';
  config: {
    /** Preset shader name (hologram, forceField, dissolve) */
    preset?: string;
    /** Inline vertex shader GLSL */
    vertex?: string;
    /** Inline fragment shader GLSL */
    fragment?: string;
    /** Shader language (default: glsl) */
    language?: 'glsl' | 'hlsl' | 'wgsl';
    /** Uniform definitions */
    uniforms?: Record<string, { type: string; value: unknown; min?: number; max?: number }>;
    /** Include shader chunks (noise, hologram, fresnel, pbr, uv) */
    includes?: string[];
    /** Blend mode */
    blendMode?: 'opaque' | 'blend' | 'additive' | 'multiply';
    /** Depth testing */
    depthTest?: boolean;
    /** Depth writing */
    depthWrite?: boolean;
    /** Face culling */
    cullFace?: 'none' | 'front' | 'back';
  };
}

export interface NetworkedTraitAnnotation extends TraitAnnotation {
  type: 'networked';
  config: {
    /** Sync mode */
    mode?: 'owner' | 'shared' | 'server';
    /** Properties to sync */
    syncProperties?: string[];
    /** Sync rate in Hz */
    syncRate?: number;
    /** Interpolation enabled */
    interpolation?: boolean;
    /** Network channel */
    channel?: string;
  };
}

export interface RPCTraitAnnotation extends TraitAnnotation {
  type: 'rpc';
  config: {
    /** RPC method name */
    method: string;
    /** Target (all, owner, server) */
    target?: 'all' | 'owner' | 'server';
    /** Reliable delivery */
    reliable?: boolean;
  };
}

export interface JointTraitAnnotation extends TraitAnnotation {
  type: 'joint';
  config: {
    /** Joint type */
    jointType: 'fixed' | 'hinge' | 'ball' | 'slider' | 'spring';
    /** Connected body ID */
    connectedBody?: string;
    /** Anchor point */
    anchor?: { x: number; y: number; z: number };
    /** Axis of rotation/movement */
    axis?: { x: number; y: number; z: number };
    /** Limits */
    limits?: { min: number; max: number };
    /** Spring settings */
    spring?: { stiffness: number; damping: number };
    /** Break force */
    breakForce?: number;
  };
}

export interface IKTraitAnnotation extends TraitAnnotation {
  type: 'ik';
  config: {
    /** IK chain name */
    chain: string;
    /** Target transform/object */
    target?: string;
    /** Pole target for elbow/knee direction */
    poleTarget?: string;
    /** Chain length (bones) */
    chainLength?: number;
    /** Iterations for solver */
    iterations?: number;
    /** Weight (0-1) */
    weight?: number;
  };
}

export type AnyTraitAnnotation =
  | MaterialTraitAnnotation
  | LightingTraitAnnotation
  | RenderingTraitAnnotation
  | ShaderTraitAnnotation
  | NetworkedTraitAnnotation
  | RPCTraitAnnotation
  | JointTraitAnnotation
  | IKTraitAnnotation;

// ============================================================================
// Enhanced OrbNode with Graphics Traits
// ============================================================================

export interface GraphicsConfiguration {
  material?: MaterialTraitAnnotation['config'];
  lighting?: LightingTraitAnnotation['config'];
  rendering?: RenderingTraitAnnotation['config'];
  shader?: ShaderTraitAnnotation['config'];
  networked?: NetworkedTraitAnnotation['config'];
  rpc?: RPCTraitAnnotation['config'];
  joint?: JointTraitAnnotation['config'];
  ik?: IKTraitAnnotation['config'];
}

export interface EnhancedOrbNode extends OrbNode {
  graphics?: GraphicsConfiguration;
  traits?: any;
  eventHandlers?: Map<string, string>;
  isCompanion?: boolean;
}

// ============================================================================
// HoloScriptPlus Parser
// ============================================================================

export class HoloScriptPlusParser {
  private baseParser: HoloScriptCodeParser;

  constructor() {
    this.baseParser = new HoloScriptCodeParser();
  }

  /**
   * Parse HoloScript+ code with trait annotations
   */
  parse(code: string): ASTNode[] {
    // First, parse with base parser
    const baseResult = this.baseParser.parse(code);
    const ast = baseResult.ast;

    // Then enhance with trait annotations
    return this.enhanceWithTraits(ast, code);
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
  extractTraitAnnotations(code: string, _orbLine?: number): AnyTraitAnnotation[] {
    const traits: AnyTraitAnnotation[] = [];

    // Extended regex to match all trait types including inline shader code
    const traitRegex =
      /@(material|lighting|rendering|shader|networked|rpc|joint|ik)\s*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g;

    let match;
    while ((match = traitRegex.exec(code)) !== null) {
      const type = match[1] as AnyTraitAnnotation['type'];
      const configStr = match[2];

      try {
        const config = this.parseTraitConfig(configStr, type);

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

          case 'shader':
            traits.push({
              type: 'shader',
              config: config as ShaderTraitAnnotation['config'],
            });
            break;

          case 'networked':
            traits.push({
              type: 'networked',
              config: config as NetworkedTraitAnnotation['config'],
            });
            break;

          case 'rpc':
            traits.push({
              type: 'rpc',
              config: config as RPCTraitAnnotation['config'],
            });
            break;

          case 'joint':
            traits.push({
              type: 'joint',
              config: config as JointTraitAnnotation['config'],
            });
            break;

          case 'ik':
            traits.push({
              type: 'ik',
              config: config as IKTraitAnnotation['config'],
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
   * Parse trait configuration with support for inline code (backticks)
   */
  parseTraitConfig(str: string, traitType: string): Record<string, unknown> {
    // For shader traits, handle backtick strings for inline GLSL
    if (traitType === 'shader') {
      return this.parseShaderConfig(str);
    }
    return this.parseObjectLiteral(str);
  }

  /**
   * Parse shader configuration with inline GLSL support
   */
  parseShaderConfig(str: string): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // First, extract backtick strings and replace with placeholders
    const backtickStrings: string[] = [];
    const processedStr = str.replace(/`([^`]*)`/g, (_, content) => {
      backtickStrings.push(content);
      return `__BACKTICK_${backtickStrings.length - 1}__`;
    });

    // Parse the config
    const parsed = this.parseObjectLiteral(processedStr);

    // Restore backtick strings
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.startsWith('__BACKTICK_')) {
        const index = parseInt(value.replace('__BACKTICK_', '').replace('__', ''));
        config[key] = backtickStrings[index];
      } else {
        config[key] = value;
      }
    }

    return config;
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
    const pairs: string[] = [];

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
          config.material = trait.config;
          break;

        case 'lighting':
          config.lighting = trait.config;
          break;

        case 'rendering':
          config.rendering = trait.config;
          break;

        case 'shader':
          config.shader = trait.config;
          break;

        case 'networked':
          config.networked = trait.config;
          break;

        case 'rpc':
          config.rpc = trait.config;
          break;

        case 'joint':
          config.joint = trait.config;
          break;

        case 'ik':
          config.ik = trait.config;
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
        errors.push(...this.validateMaterialTrait(trait));
        break;

      case 'lighting':
        errors.push(...this.validateLightingTrait(trait));
        break;

      case 'rendering':
        errors.push(...this.validateRenderingTrait(trait));
        break;

      case 'shader':
        errors.push(...this.validateShaderTrait(trait));
        break;

      case 'networked':
        errors.push(...this.validateNetworkedTrait(trait));
        break;

      case 'joint':
        errors.push(...this.validateJointTrait(trait));
        break;

      case 'ik':
        errors.push(...this.validateIKTrait(trait));
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
      if (
        config.pbr.metallic !== undefined &&
        (config.pbr.metallic < 0 || config.pbr.metallic > 1)
      ) {
        errors.push('material.pbr.metallic must be between 0 and 1');
      }

      if (
        config.pbr.roughness !== undefined &&
        (config.pbr.roughness < 0 || config.pbr.roughness > 1)
      ) {
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

    if (
      config.preset &&
      !['studio', 'outdoor', 'interior', 'night', 'sunset'].includes(config.preset)
    ) {
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
  createGraphicsTraits(config: GraphicsConfiguration): {
    material: MaterialTrait | null;
    lighting: LightingTrait | null;
    rendering: RenderingTrait | null;
    shader: ShaderTrait | null;
  } {
    // This will be called by the runtime to create actual trait instances
    return {
      material: config.material ? this.createMaterialTrait(config.material) : null,
      lighting: config.lighting ? this.createLightingTrait(config.lighting) : null,
      rendering: config.rendering ? this.createRenderingTrait(config.rendering) : null,
      shader: config.shader ? this.createShaderTrait(config.shader) : null,
    };
  }

  /**
   * Create MaterialTrait from config
   */
  private createMaterialTrait(config: any): MaterialTrait {
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
  private createLightingTrait(config: any): LightingTrait {
    let lighting: any;

    if (config.preset) {
      const presetFactory = LIGHTING_PRESETS[config.preset as keyof typeof LIGHTING_PRESETS];
      const presetConfig = presetFactory ? presetFactory() : undefined;
      lighting = new LightingTrait(presetConfig);
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
  private createRenderingTrait(config: any): RenderingTrait {
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

  /**
   * Create ShaderTrait from config
   */
  private createShaderTrait(config: ShaderTraitAnnotation['config']): ShaderTrait {
    // Check for preset
    if (config.preset && SHADER_PRESETS[config.preset as keyof typeof SHADER_PRESETS]) {
      const preset = SHADER_PRESETS[config.preset as keyof typeof SHADER_PRESETS];
      return new ShaderTrait(preset as unknown as ShaderConfig);
    }

    // Create custom shader
    const shaderConfig: ShaderConfig = {
      source: {
        language: (config.language as 'glsl' | 'hlsl' | 'wgsl') || 'glsl',
        vertex: config.vertex,
        fragment: config.fragment,
      },
      uniforms: config.uniforms as any,
      includes: config.includes?.map((path) => ({ path })),
      blendMode: config.blendMode,
      depthTest: config.depthTest,
      depthWrite: config.depthWrite,
      cullFace: config.cullFace,
    };

    return new ShaderTrait(shaderConfig);
  }

  /**
   * Validate shader trait configuration
   */
  private validateShaderTrait(trait: ShaderTraitAnnotation): string[] {
    const errors: string[] = [];
    const { config } = trait;

    // Must have either preset or custom shader code
    if (!config.preset && !config.vertex && !config.fragment) {
      errors.push('shader must have either preset or vertex/fragment code');
    }

    // Validate preset name if provided
    if (config.preset && !SHADER_PRESETS[config.preset as keyof typeof SHADER_PRESETS]) {
      errors.push(
        `shader.preset "${config.preset}" is not a valid preset. Available: hologram, forceField, dissolve`
      );
    }

    // Validate language
    if (config.language && !['glsl', 'hlsl', 'wgsl'].includes(config.language)) {
      errors.push('shader.language must be one of: glsl, hlsl, wgsl');
    }

    // Validate blend mode
    if (
      config.blendMode &&
      !['opaque', 'blend', 'additive', 'multiply'].includes(config.blendMode)
    ) {
      errors.push('shader.blendMode must be one of: opaque, blend, additive, multiply');
    }

    // Validate cull face
    if (config.cullFace && !['none', 'front', 'back'].includes(config.cullFace)) {
      errors.push('shader.cullFace must be one of: none, front, back');
    }

    return errors;
  }

  /**
   * Validate networked trait configuration
   */
  private validateNetworkedTrait(trait: NetworkedTraitAnnotation): string[] {
    const errors: string[] = [];
    const { config } = trait;

    if (config.mode && !['owner', 'shared', 'server'].includes(config.mode)) {
      errors.push('networked.mode must be one of: owner, shared, server');
    }

    if (config.syncRate !== undefined && (config.syncRate < 1 || config.syncRate > 60)) {
      errors.push('networked.syncRate must be between 1 and 60 Hz');
    }

    return errors;
  }

  /**
   * Validate joint trait configuration
   */
  private validateJointTrait(trait: JointTraitAnnotation): string[] {
    const errors: string[] = [];
    const { config } = trait;

    if (!config.jointType) {
      errors.push('joint.jointType is required');
    } else if (!['fixed', 'hinge', 'ball', 'slider', 'spring'].includes(config.jointType)) {
      errors.push('joint.jointType must be one of: fixed, hinge, ball, slider, spring');
    }

    if (config.breakForce !== undefined && config.breakForce < 0) {
      errors.push('joint.breakForce must be >= 0');
    }

    return errors;
  }

  /**
   * Validate IK trait configuration
   */
  private validateIKTrait(trait: IKTraitAnnotation): string[] {
    const errors: string[] = [];
    const { config } = trait;

    if (!config.chain) {
      errors.push('ik.chain is required');
    }

    if (config.chainLength !== undefined && config.chainLength < 1) {
      errors.push('ik.chainLength must be >= 1');
    }

    if (config.iterations !== undefined && config.iterations < 1) {
      errors.push('ik.iterations must be >= 1');
    }

    if (config.weight !== undefined && (config.weight < 0 || config.weight > 1)) {
      errors.push('ik.weight must be between 0 and 1');
    }

    return errors;
  }
}

export default HoloScriptPlusParser;
