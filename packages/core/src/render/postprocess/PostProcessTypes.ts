/**
 * PostProcessTypes.ts
 *
 * Type definitions for HoloScript post-processing system.
 * Supports WebGPU-based effects pipeline with HDR and LDR processing.
 *
 * @module render/postprocess
 */

/**
 * Supported post-process effect types
 */
export type PostProcessEffectType =
  | 'bloom'
  | 'tonemap'
  | 'dof'
  | 'motionBlur'
  | 'ssao'
  | 'fxaa'
  | 'sharpen'
  | 'vignette'
  | 'colorGrade'
  | 'filmGrain'
  | 'chromaticAberration'
  | 'fog'
  | 'custom';

/**
 * Tone mapping operators
 */
export type ToneMapOperator =
  | 'none'
  | 'reinhard'
  | 'reinhardLum'
  | 'aces'
  | 'acesApprox'
  | 'filmic'
  | 'uncharted2'
  | 'uchimura'
  | 'lottes'
  | 'khronos';

/**
 * Blend modes for effect compositing
 */
export type BlendMode =
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'softLight';

/**
 * Base effect parameters interface
 */
export interface IEffectParams {
  enabled: boolean;
  intensity: number;
  blendMode?: BlendMode;
}

/**
 * Bloom effect parameters
 */
export interface IBloomParams extends IEffectParams {
  threshold: number;
  softThreshold: number;
  radius: number;
  iterations: number;
  anamorphic: number;
  highQuality: boolean;
}

/**
 * Tone mapping parameters
 */
export interface IToneMapParams extends IEffectParams {
  operator: ToneMapOperator;
  exposure: number;
  gamma: number;
  whitePoint: number;
  contrast: number;
  saturation: number;
}

/**
 * Depth of Field parameters
 */
export interface IDepthOfFieldParams extends IEffectParams {
  focusDistance: number;
  focalLength: number;
  aperture: number;
  maxBlur: number;
  bokehShape: 'circle' | 'hexagon' | 'octagon';
  bokehQuality: 'low' | 'medium' | 'high';
  nearBlur: boolean;
}

/**
 * Motion blur parameters
 */
export interface IMotionBlurParams extends IEffectParams {
  samples: number;
  velocityScale: number;
  maxVelocity: number;
}

/**
 * SSAO parameters
 */
export interface ISSAOParams extends IEffectParams {
  radius: number;
  bias: number;
  samples: number;
  power: number;
  falloff: number;
}

/**
 * Anti-aliasing (FXAA) parameters
 */
export interface IFXAAParams extends IEffectParams {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  edgeThreshold: number;
  edgeThresholdMin: number;
}

/**
 * Sharpen parameters
 */
export interface ISharpenParams extends IEffectParams {
  amount: number;
  threshold: number;
}

/**
 * Vignette parameters
 */
export interface IVignetteParams extends IEffectParams {
  roundness: number;
  smoothness: number;
  color: [number, number, number];
}

/**
 * Color grading parameters
 */
export interface IColorGradeParams extends IEffectParams {
  shadows: [number, number, number];
  midtones: [number, number, number];
  highlights: [number, number, number];
  shadowsOffset: number;
  highlightsOffset: number;
  hueShift: number;
  temperature: number;
  tint: number;
  lutTexture?: string;
  lutIntensity: number;
}

/**
 * Film grain parameters
 */
export interface IFilmGrainParams extends IEffectParams {
  size: number;
  luminanceContribution: number;
  animated: boolean;
}

/**
 * Chromatic aberration parameters
 */
export interface IChromaticAberrationParams extends IEffectParams {
  redOffset: [number, number];
  greenOffset: [number, number];
  blueOffset: [number, number];
  radial: boolean;
}

/**
 * Fog parameters
 */
export interface IFogParams extends IEffectParams {
  color: [number, number, number];
  density: number;
  start: number;
  end: number;
  height: number;
  heightFalloff: number;
  mode: 'linear' | 'exponential' | 'exponentialSquared';
}

/**
 * Custom shader effect parameters
 */
export interface ICustomEffectParams extends IEffectParams {
  shader: string;
  uniforms: Record<string, number | number[] | boolean>;
}

/**
 * Union type of all effect parameters
 */
export type EffectParams =
  | IBloomParams
  | IToneMapParams
  | IDepthOfFieldParams
  | IMotionBlurParams
  | ISSAOParams
  | IFXAAParams
  | ISharpenParams
  | IVignetteParams
  | IColorGradeParams
  | IFilmGrainParams
  | IChromaticAberrationParams
  | IFogParams
  | ICustomEffectParams;

/**
 * Effect configuration for pipeline
 */
export interface IEffectConfig {
  type: PostProcessEffectType;
  name?: string;
  params: EffectParams;
  order?: number;
}

/**
 * Render target configuration
 */
export interface IRenderTargetConfig {
  width: number;
  height: number;
  format: GPUTextureFormat;
  mipLevelCount?: number;
  sampleCount?: number;
  label?: string;
}

/**
 * Post-process pipeline configuration
 */
export interface IPostProcessPipelineConfig {
  hdrEnabled: boolean;
  hdrFormat: GPUTextureFormat;
  ldrFormat: GPUTextureFormat;
  msaaSamples: 1 | 4;
  effects: IEffectConfig[];
  autoResize: boolean;
}

/**
 * Runtime render target
 */
export interface IRenderTarget {
  id: string;
  texture: GPUTexture;
  view: GPUTextureView;
  config: IRenderTargetConfig;
}

/**
 * Effect shader bindings
 */
export interface IEffectBindings {
  inputTexture: GPUTextureView;
  depthTexture?: GPUTextureView;
  velocityTexture?: GPUTextureView;
  noiseTexture?: GPUTextureView;
  lutTexture?: GPUTextureView;
  sampler: GPUSampler;
  uniformBuffer: GPUBuffer;
}

/**
 * Frame data passed to effects
 */
export interface IFrameData {
  time: number;
  deltaTime: number;
  frameCount: number;
  resolution: [number, number];
  nearPlane: number;
  farPlane: number;
  cameraPosition?: [number, number, number];
  viewMatrix?: Float32Array;
  projectionMatrix?: Float32Array;
  prevViewMatrix?: Float32Array;
  jitter?: [number, number];
}

/**
 * Effect render context
 */
export interface IEffectRenderContext {
  device: GPUDevice;
  commandEncoder: GPUCommandEncoder;
  frameData: IFrameData;
  input: IRenderTarget;
  output: IRenderTarget;
  depth?: IRenderTarget;
  velocity?: IRenderTarget;
}

/**
 * Default parameter values for each effect type
 */
export const DEFAULT_PARAMS: Record<PostProcessEffectType, EffectParams> = {
  bloom: {
    enabled: true,
    intensity: 1.0,
    threshold: 1.0,
    softThreshold: 0.5,
    radius: 4,
    iterations: 5,
    anamorphic: 0,
    highQuality: false,
    blendMode: 'add',
  } as IBloomParams,

  tonemap: {
    enabled: true,
    intensity: 1.0,
    operator: 'aces',
    exposure: 1.0,
    gamma: 2.2,
    whitePoint: 1.0,
    contrast: 1.0,
    saturation: 1.0,
  } as IToneMapParams,

  dof: {
    enabled: false,
    intensity: 1.0,
    focusDistance: 10,
    focalLength: 50,
    aperture: 2.8,
    maxBlur: 1,
    bokehShape: 'circle',
    bokehQuality: 'medium',
    nearBlur: true,
  } as IDepthOfFieldParams,

  motionBlur: {
    enabled: false,
    intensity: 1.0,
    samples: 8,
    velocityScale: 1.0,
    maxVelocity: 64,
  } as IMotionBlurParams,

  ssao: {
    enabled: false,
    intensity: 1.0,
    radius: 0.5,
    bias: 0.025,
    samples: 16,
    power: 2.0,
    falloff: 1.0,
  } as ISSAOParams,

  fxaa: {
    enabled: true,
    intensity: 1.0,
    quality: 'high',
    edgeThreshold: 0.166,
    edgeThresholdMin: 0.0833,
  } as IFXAAParams,

  sharpen: {
    enabled: false,
    intensity: 0.5,
    amount: 0.3,
    threshold: 0.1,
  } as ISharpenParams,

  vignette: {
    enabled: false,
    intensity: 0.5,
    roundness: 1.0,
    smoothness: 0.5,
    color: [0, 0, 0],
  } as IVignetteParams,

  colorGrade: {
    enabled: false,
    intensity: 1.0,
    shadows: [0, 0, 0],
    midtones: [0, 0, 0],
    highlights: [0, 0, 0],
    shadowsOffset: 0,
    highlightsOffset: 0,
    hueShift: 0,
    temperature: 0,
    tint: 0,
    lutIntensity: 1.0,
  } as IColorGradeParams,

  filmGrain: {
    enabled: false,
    intensity: 0.1,
    size: 1.6,
    luminanceContribution: 0.8,
    animated: true,
  } as IFilmGrainParams,

  chromaticAberration: {
    enabled: false,
    intensity: 0.5,
    redOffset: [0.01, 0],
    greenOffset: [0, 0],
    blueOffset: [-0.01, 0],
    radial: true,
  } as IChromaticAberrationParams,

  fog: {
    enabled: false,
    intensity: 1.0,
    color: [0.7, 0.8, 0.9],
    density: 0.02,
    start: 10,
    end: 100,
    height: 0,
    heightFalloff: 1.0,
    mode: 'exponential',
  } as IFogParams,

  custom: {
    enabled: true,
    intensity: 1.0,
    shader: '',
    uniforms: {},
  } as ICustomEffectParams,
};

/**
 * Get default parameters for effect type
 */
export function getDefaultParams<T extends EffectParams>(
  type: PostProcessEffectType,
): T {
  return { ...DEFAULT_PARAMS[type] } as T;
}

/**
 * Merge effect parameters with defaults
 */
export function mergeParams<T extends EffectParams>(
  type: PostProcessEffectType,
  partial: Partial<T>,
): T {
  return { ...DEFAULT_PARAMS[type], ...partial } as T;
}

/**
 * Validate effect parameters
 */
export function validateParams(
  type: PostProcessEffectType,
  params: EffectParams,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Null/undefined check
  if (params == null) {
    return { valid: false, errors: ['params is null or undefined'] };
  }

  // Common validation
  if (typeof params.enabled !== 'boolean') {
    errors.push('enabled must be boolean');
  }
  if (typeof params.intensity !== 'number' || params.intensity < 0) {
    errors.push('intensity must be non-negative number');
  }

  // Type-specific validation
  switch (type) {
    case 'bloom': {
      const p = params as IBloomParams;
      if (p.threshold < 0) errors.push('bloom.threshold must be >= 0');
      if (p.iterations < 1 || p.iterations > 16) {
        errors.push('bloom.iterations must be 1-16');
      }
      break;
    }
    case 'tonemap': {
      const p = params as IToneMapParams;
      if (p.exposure <= 0) errors.push('tonemap.exposure must be > 0');
      if (p.gamma <= 0) errors.push('tonemap.gamma must be > 0');
      break;
    }
    case 'dof': {
      const p = params as IDepthOfFieldParams;
      if (p.focusDistance <= 0) errors.push('dof.focusDistance must be > 0');
      if (p.aperture <= 0) errors.push('dof.aperture must be > 0');
      break;
    }
    case 'ssao': {
      const p = params as ISSAOParams;
      if (p.samples < 4 || p.samples > 64) {
        errors.push('ssao.samples must be 4-64');
      }
      if (p.radius <= 0) errors.push('ssao.radius must be > 0');
      break;
    }
    // Add more type-specific validation as needed
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Size in bytes for uniform buffers
 */
export const UNIFORM_SIZES: Record<PostProcessEffectType, number> = {
  bloom: 48,     // intensity, threshold, softThreshold, radius, iterations, anamorphic
  tonemap: 32,   // operator, exposure, gamma, whitePoint, contrast, saturation
  dof: 48,       // focusDistance, focalLength, aperture, maxBlur, near/far
  motionBlur: 16, // samples, velocityScale, maxVelocity
  ssao: 32,      // radius, bias, samples, power, falloff
  fxaa: 16,      // quality, edgeThreshold, edgeThresholdMin
  sharpen: 16,   // amount, threshold
  vignette: 32,  // intensity, roundness, smoothness, color
  colorGrade: 96, // shadows, midtones, highlights, offsets, hue, temp, tint
  filmGrain: 16, // size, luminance, time
  chromaticAberration: 32, // offsets, radial
  fog: 48,       // color, density, start, end, height, falloff
  custom: 256,   // generic uniform buffer for custom effects
};
