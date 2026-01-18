/**
 * @holoscript/core Material Trait
 *
 * Enables advanced material and shader properties for photorealistic rendering
 * Supports PBR (Physically Based Rendering) workflows
 */

export type MaterialType = 'pbr' | 'standard' | 'unlit' | 'transparent' | 'custom';
export type TextureChannel = 'baseColor' | 'normalMap' | 'roughnessMap' | 'metallicMap' | 'ambientOcclusionMap' | 'emissionMap' | 'heightMap';

/**
 * Texture map configuration
 */
export interface TextureMap {
  /** Texture path or URL */
  path: string;
  
  /** Channel this texture maps to */
  channel: TextureChannel;
  
  /** UV scale (tiling) */
  scale?: { x: number; y: number };
  
  /** UV offset */
  offset?: { x: number; y: number };
  
  /** Texture filtering: linear, nearest, anisotropic */
  filter?: 'linear' | 'nearest' | 'anisotropic';
  
  /** Anisotropic level (1-16) */
  anisotropy?: number;
}

/**
 * PBR Material properties
 */
export interface PBRMaterial {
  /** Base color in linear space [0-1] */
  baseColor: { r: number; g: number; b: number; a?: number };
  
  /** Metallic value 0-1 */
  metallic: number;
  
  /** Roughness value 0-1 */
  roughness: number;
  
  /** Ambient occlusion 0-1 */
  ambientOcclusion?: number;
  
  /** Emission color and intensity */
  emission?: {
    color: { r: number; g: number; b: number };
    intensity: number;
  };
  
  /** Normal map strength */
  normalStrength?: number;
  
  /** Parallax/height map strength */
  parallaxHeight?: number;
  
  /** Index of refraction for transmission */
  ior?: number;
  
  /** Transmission amount for transparent materials */
  transmission?: number;
}

/**
 * Material configuration
 */
export interface MaterialConfig {
  /** Material type */
  type: MaterialType;
  
  /** Material name for reuse */
  name?: string;
  
  /** PBR properties (for PBR materials) */
  pbr?: PBRMaterial;
  
  /** Texture maps */
  textures?: TextureMap[];
  
  /** Double-sided rendering */
  doubleSided?: boolean;
  
  /** Blend mode for transparency */
  blendMode?: 'opaque' | 'blend' | 'additive' | 'multiply';
  
  /** Custom shader code/reference */
  customShader?: {
    vertex?: string;
    fragment?: string;
    shaderLanguage?: 'glsl' | 'hlsl' | 'shadergraph';
  };
  
  /** GPU memory optimization hints */
  optimization?: {
    /** Stream textures if needed */
    streamTextures?: boolean;
    
    /** Compress textures */
    compression?: 'none' | 'dxt' | 'astc' | 'basis';
    
    /** Instance this material */
    instanced?: boolean;
    
    /** LOD bias for texture streaming */
    lodBias?: number;
  };
}

/**
 * MaterialTrait - Enables photorealistic material rendering
 */
export class MaterialTrait {
  private material: MaterialConfig;
  private textureCache: Map<string, any> = new Map();

  constructor(config: MaterialConfig) {
    this.material = {
      ...{ type: 'pbr' as const },
      ...config,
    };
  }

  /**
   * Get material properties
   */
  public getMaterial(): MaterialConfig {
    return { ...this.material };
  }

  /**
   * Update material property
   */
  public setProperty<K extends keyof MaterialConfig>(key: K, value: MaterialConfig[K]): void {
    this.material[key] = value;
  }

  /**
   * Get PBR properties
   */
  public getPBRProperties(): PBRMaterial | undefined {
    return this.material.pbr;
  }

  /**
   * Update PBR material
   */
  public updatePBR(pbr: Partial<PBRMaterial>): void {
    if (!this.material.pbr) {
      this.material.pbr = {
        baseColor: { r: 1, g: 1, b: 1 },
        metallic: 0,
        roughness: 0.5,
      };
    }
    this.material.pbr = { ...this.material.pbr, ...pbr };
  }

  /**
   * Add texture map
   */
  public addTexture(texture: TextureMap): void {
    if (!this.material.textures) {
      this.material.textures = [];
    }
    this.material.textures.push(texture);
  }

  /**
   * Get all textures
   */
  public getTextures(): TextureMap[] {
    return [...(this.material.textures || [])];
  }

  /**
   * Clear texture cache (for memory optimization)
   */
  public clearTextureCache(): void {
    this.textureCache.clear();
  }

  /**
   * Get shader code if custom
   */
  public getCustomShader() {
    return this.material.customShader;
  }

  /**
   * Set custom shader
   */
  public setCustomShader(shader: MaterialConfig['customShader']): void {
    this.material.customShader = shader;
  }

  /**
   * Get optimization hints
   */
  public getOptimization(): MaterialConfig['optimization'] {
    return this.material.optimization;
  }

  /**
   * Enable/disable texture streaming
   */
  public setTextureStreaming(enabled: boolean): void {
    if (!this.material.optimization) {
      this.material.optimization = {};
    }
    this.material.optimization.streamTextures = enabled;
  }

  /**
   * Set texture compression
   */
  public setCompression(compression: 'none' | 'dxt' | 'astc' | 'basis'): void {
    if (!this.material.optimization) {
      this.material.optimization = {};
    }
    this.material.optimization.compression = compression;
  }

  /**
   * Enable material instancing for performance
   */
  public setInstanced(instanced: boolean): void {
    if (!this.material.optimization) {
      this.material.optimization = {};
    }
    this.material.optimization.instanced = instanced;
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    this.textureCache.clear();
  }
}

/**
 * HoloScript+ @material trait factory
 */
export function createMaterialTrait(config: MaterialConfig): MaterialTrait {
  return new MaterialTrait(config);
}

/**
 * Preset materials for common use cases
 */
export const MATERIAL_PRESETS = {
  /** Shiny metal */
  chrome: (): MaterialConfig => ({
    type: 'pbr',
    pbr: {
      baseColor: { r: 0.77, g: 0.77, b: 0.77 },
      metallic: 1.0,
      roughness: 0.1,
    },
  }),

  /** Rough plastic */
  plastic: (): MaterialConfig => ({
    type: 'pbr',
    pbr: {
      baseColor: { r: 1, g: 1, b: 1 },
      metallic: 0,
      roughness: 0.8,
    },
  }),

  /** Wood texture */
  wood: (): MaterialConfig => ({
    type: 'pbr',
    pbr: {
      baseColor: { r: 0.6, g: 0.4, b: 0.2 },
      metallic: 0,
      roughness: 0.4,
    },
  }),

  /** Glass */
  glass: (): MaterialConfig => ({
    type: 'transparent',
    blendMode: 'blend',
    pbr: {
      baseColor: { r: 1, g: 1, b: 1, a: 0.3 },
      metallic: 0,
      roughness: 0.0,
      ior: 1.5,
      transmission: 0.9,
    },
  }),

  /** Emissive (glowing) */
  emissive: (): MaterialConfig => ({
    type: 'pbr',
    pbr: {
      baseColor: { r: 0, g: 1, b: 0 },
      metallic: 0,
      roughness: 1.0,
      emission: {
        color: { r: 0, g: 1, b: 0 },
        intensity: 2.0,
      },
    },
  }),

  /** Skin material */
  skin: (): MaterialConfig => ({
    type: 'pbr',
    pbr: {
      baseColor: { r: 1, g: 0.8, b: 0.7 },
      metallic: 0,
      roughness: 0.5,
      ambientOcclusion: 0.8,
    },
  }),
};
