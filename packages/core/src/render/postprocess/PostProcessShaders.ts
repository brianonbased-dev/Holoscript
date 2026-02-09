/**
 * PostProcessShaders.ts
 *
 * WGSL shader code for all post-processing effects.
 * Includes fullscreen triangle vertex shader and per-effect fragment shaders.
 *
 * @module render/postprocess
 */

/**
 * Fullscreen triangle vertex shader
 * Generates fullscreen coverage with a single triangle
 */
export const FULLSCREEN_VERTEX_SHADER = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Generate fullscreen triangle
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );

  var uvs = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = uvs[vertexIndex];
  return output;
}
`;

/**
 * Common shader utilities
 */
export const SHADER_UTILS = /* wgsl */ `
// Luminance calculation (Rec. 709)
fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

// sRGB to linear conversion
fn srgbToLinear(color: vec3f) -> vec3f {
  return pow(color, vec3f(2.2));
}

// Linear to sRGB conversion
fn linearToSrgb(color: vec3f) -> vec3f {
  return pow(color, vec3f(1.0 / 2.2));
}

// Hash function for noise
fn hash(p: vec2f) -> f32 {
  let k = vec2f(0.3183099, 0.3678794);
  let x = p * k + k.yx;
  return fract(16.0 * k.x * fract(x.x * x.y * (x.x + x.y)));
}

// Simple 2D noise
fn noise2D(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}
`;

/**
 * Bloom effect shader
 */
export const BLOOM_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct BloomUniforms {
  intensity: f32,
  threshold: f32,
  softThreshold: f32,
  radius: f32,
  iterations: f32,
  anamorphic: f32,
  highQuality: f32,
  padding: f32,
  time: f32,
  deltaTime: f32,
  padding2: vec2f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: BloomUniforms;

// Threshold with soft knee
fn softThreshold(color: vec3f) -> vec3f {
  let brightness = max(max(color.r, color.g), color.b);
  var soft = brightness - uniforms.threshold + uniforms.softThreshold;
  soft = clamp(soft, 0.0, 2.0 * uniforms.softThreshold);
  soft = soft * soft / (4.0 * uniforms.softThreshold + 0.00001);
  var contribution = max(soft, brightness - uniforms.threshold);
  contribution /= max(brightness, 0.00001);
  return color * contribution;
}

// 9-tap gaussian blur
fn blur9(uv: vec2f, direction: vec2f) -> vec3f {
  let texSize = vec2f(textureDimensions(inputTexture));
  let offset = direction / texSize;

  var color = textureSample(inputTexture, texSampler, uv).rgb * 0.2270270270;
  color += textureSample(inputTexture, texSampler, uv + offset * 1.3846153846).rgb * 0.3162162162;
  color += textureSample(inputTexture, texSampler, uv - offset * 1.3846153846).rgb * 0.3162162162;
  color += textureSample(inputTexture, texSampler, uv + offset * 3.2307692308).rgb * 0.0702702703;
  color += textureSample(inputTexture, texSampler, uv - offset * 3.2307692308).rgb * 0.0702702703;

  return color;
}

@fragment
fn fs_bloom(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTexture, texSampler, input.uv).rgb;

  // Extract bright pixels with soft threshold
  var bloom = softThreshold(color);

  // Simple blur approximation (in production, use multi-pass)
  let texSize = vec2f(textureDimensions(inputTexture));
  let radius = uniforms.radius / texSize;

  var blurred = bloom;
  for (var i = 0u; i < 4u; i++) {
    let angle = f32(i) * 1.5707963268;
    let offset = vec2f(cos(angle), sin(angle)) * radius;
    blurred += textureSample(inputTexture, texSampler, input.uv + offset).rgb;
    blurred += textureSample(inputTexture, texSampler, input.uv - offset).rgb;
  }
  blurred /= 9.0;

  // Composite bloom
  let result = color + softThreshold(blurred) * uniforms.intensity;

  return vec4f(result, 1.0);
}
`;

/**
 * Tone mapping shader with multiple operators
 */
export const TONEMAP_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct ToneMapUniforms {
  operator: f32,
  exposure: f32,
  gamma: f32,
  whitePoint: f32,
  contrast: f32,
  saturation: f32,
  intensity: f32,
  padding: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ToneMapUniforms;

// Reinhard tone mapping
fn tonemapReinhard(x: vec3f) -> vec3f {
  return x / (x + vec3f(1.0));
}

// Reinhard with luminance-based mapping
fn tonemapReinhardLum(x: vec3f) -> vec3f {
  let l = luminance(x);
  let nl = l / (l + 1.0);
  return x * (nl / l);
}

// ACES filmic tone mapping
fn tonemapACES(x: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + vec3f(b))) / (x * (c * x + vec3f(d)) + vec3f(e)), vec3f(0.0), vec3f(1.0));
}

// ACES approximation (cheaper)
fn tonemapACESApprox(x: vec3f) -> vec3f {
  let v = x * 0.6;
  let a = v * (v * 2.51 + 0.03);
  let b = v * (v * 2.43 + 0.59) + 0.14;
  return clamp(a / b, vec3f(0.0), vec3f(1.0));
}

// Uncharted 2 filmic
fn uncharted2Partial(x: vec3f) -> vec3f {
  let A = 0.15;
  let B = 0.50;
  let C = 0.10;
  let D = 0.20;
  let E = 0.02;
  let F = 0.30;
  return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}

fn tonemapUncharted2(x: vec3f) -> vec3f {
  let white = 11.2;
  let curr = uncharted2Partial(x * 2.0);
  let whiteScale = vec3f(1.0) / uncharted2Partial(vec3f(white));
  return curr * whiteScale;
}

// Lottes (AMD)
fn tonemapLottes(x: vec3f) -> vec3f {
  let a = vec3f(1.6);
  let d = vec3f(0.977);
  let hdrMax = vec3f(8.0);
  let midIn = vec3f(0.18);
  let midOut = vec3f(0.267);

  let b = (-pow(midIn, a) + pow(hdrMax, a) * midOut) / ((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);
  let c = (pow(hdrMax, a * d) * pow(midIn, a) - pow(hdrMax, a) * pow(midIn, a * d) * midOut) /
          ((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);

  return pow(x, a) / (pow(x, a * d) * b + c);
}

// Uchimura (GT)
fn tonemapUchimura(x: vec3f) -> vec3f {
  let P = 1.0;  // max brightness
  let a = 1.0;  // contrast
  let m = 0.22; // linear section start
  let l = 0.4;  // linear section length
  let c = 1.33; // black tightness
  let b = 0.0;  // black lightness

  let l0 = ((P - m) * l) / a;
  let S0 = m + l0;
  let S1 = m + a * l0;
  let C2 = (a * P) / (P - S1);
  let CP = -C2 / P;

  var result: vec3f;
  for (var i = 0u; i < 3u; i++) {
    let v = x[i];
    var w: f32;
    if (v < m) {
      w = v;
    } else if (v < S0) {
      w = m + a * (v - m);
    } else {
      w = P - (P - S1) * exp(CP * (v - S0));
    }
    result[i] = w;
  }
  return result;
}

// Khronos PBR neutral
fn tonemapKhronosPBR(color: vec3f) -> vec3f {
  let startCompression = 0.8 - 0.04;
  let desaturation = 0.15;

  var x = min(color, vec3f(1.0));
  let peak = max(max(color.r, color.g), color.b);

  if (peak < startCompression) {
    return x;
  }

  let d = 1.0 - startCompression;
  let newPeak = 1.0 - d * d / (peak + d - startCompression);
  x *= newPeak / peak;

  let g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(x, vec3f(newPeak), g);
}

@fragment
fn fs_tonemap(input: VertexOutput) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, input.uv).rgb;

  // Apply exposure
  color *= uniforms.exposure;

  // Apply contrast (around mid-gray)
  let midGray = 0.18;
  color = midGray * pow(color / midGray, vec3f(uniforms.contrast));

  // Apply saturation
  let lum = luminance(color);
  color = mix(vec3f(lum), color, uniforms.saturation);

  // Apply tone mapping
  let op = u32(uniforms.operator);
  var mapped: vec3f;
  switch (op) {
    case 0u: { mapped = clamp(color, vec3f(0.0), vec3f(1.0)); } // None
    case 1u: { mapped = tonemapReinhard(color); }
    case 2u: { mapped = tonemapReinhardLum(color); }
    case 3u: { mapped = tonemapACES(color); }
    case 4u: { mapped = tonemapACESApprox(color); }
    case 5u: { mapped = tonemapACES(color); } // Filmic = ACES
    case 6u: { mapped = tonemapUncharted2(color); }
    case 7u: { mapped = tonemapUchimura(color); }
    case 8u: { mapped = tonemapLottes(color); }
    case 9u: { mapped = tonemapKhronosPBR(color); }
    default: { mapped = tonemapACES(color); }
  }

  // Apply gamma correction
  let result = pow(mapped, vec3f(1.0 / uniforms.gamma));

  return vec4f(result, 1.0);
}
`;

/**
 * FXAA anti-aliasing shader
 */
export const FXAA_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct FXAAUniforms {
  quality: f32,
  edgeThreshold: f32,
  edgeThresholdMin: f32,
  intensity: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: FXAAUniforms;

@fragment
fn fs_fxaa(input: VertexOutput) -> @location(0) vec4f {
  let texSize = vec2f(textureDimensions(inputTexture));
  let invSize = 1.0 / texSize;

  // Sample center and neighbors
  let center = textureSample(inputTexture, texSampler, input.uv);
  let lumC = luminance(center.rgb);

  let lumN = luminance(textureSample(inputTexture, texSampler, input.uv + vec2f(0.0, -1.0) * invSize).rgb);
  let lumS = luminance(textureSample(inputTexture, texSampler, input.uv + vec2f(0.0, 1.0) * invSize).rgb);
  let lumE = luminance(textureSample(inputTexture, texSampler, input.uv + vec2f(1.0, 0.0) * invSize).rgb);
  let lumW = luminance(textureSample(inputTexture, texSampler, input.uv + vec2f(-1.0, 0.0) * invSize).rgb);

  let lumMin = min(lumC, min(min(lumN, lumS), min(lumE, lumW)));
  let lumMax = max(lumC, max(max(lumN, lumS), max(lumE, lumW)));
  let lumRange = lumMax - lumMin;

  // Skip if edge contrast is too low
  if (lumRange < max(uniforms.edgeThresholdMin, lumMax * uniforms.edgeThreshold)) {
    return center;
  }

  // Compute edge direction
  let lumNW = luminance(textureSample(inputTexture, texSampler, input.uv + vec2f(-1.0, -1.0) * invSize).rgb);
  let lumNE = luminance(textureSample(inputTexture, texSampler, input.uv + vec2f(1.0, -1.0) * invSize).rgb);
  let lumSW = luminance(textureSample(inputTexture, texSampler, input.uv + vec2f(-1.0, 1.0) * invSize).rgb);
  let lumSE = luminance(textureSample(inputTexture, texSampler, input.uv + vec2f(1.0, 1.0) * invSize).rgb);

  let edgeH = abs((lumNW + lumNE) - 2.0 * lumN) +
              abs((lumW + lumE) - 2.0 * lumC) * 2.0 +
              abs((lumSW + lumSE) - 2.0 * lumS);

  let edgeV = abs((lumNW + lumSW) - 2.0 * lumW) +
              abs((lumN + lumS) - 2.0 * lumC) * 2.0 +
              abs((lumNE + lumSE) - 2.0 * lumE);

  let isHorizontal = edgeH >= edgeV;

  // Blend direction
  let stepLength = select(invSize.x, invSize.y, isHorizontal);
  var lum1: f32;
  var lum2: f32;

  if (isHorizontal) {
    lum1 = lumN;
    lum2 = lumS;
  } else {
    lum1 = lumW;
    lum2 = lumE;
  }

  let gradient1 = abs(lum1 - lumC);
  let gradient2 = abs(lum2 - lumC);

  let is1Steeper = gradient1 >= gradient2;
  let gradientScaled = 0.25 * max(gradient1, gradient2);
  let lumLocalAvg = 0.5 * (select(lum2, lum1, is1Steeper) + lumC);

  // Subpixel anti-aliasing
  let subpixC = (2.0 * (lumN + lumS + lumE + lumW) + lumNW + lumNE + lumSW + lumSE) / 12.0;
  let subpixFactor = clamp(abs(subpixC - lumC) / lumRange, 0.0, 1.0);
  let subpix = (-(subpixFactor * subpixFactor) + 1.0) * subpixFactor;

  // Apply blend
  var finalUV = input.uv;
  let blendFactor = max(subpix, 0.5);

  if (isHorizontal) {
    finalUV.y += select(stepLength, -stepLength, is1Steeper) * blendFactor;
  } else {
    finalUV.x += select(stepLength, -stepLength, is1Steeper) * blendFactor;
  }

  let result = textureSample(inputTexture, texSampler, finalUV);
  return mix(center, result, uniforms.intensity);
}
`;

/**
 * Vignette shader
 */
export const VIGNETTE_SHADER = /* wgsl */ `
struct VignetteUniforms {
  intensity: f32,
  roundness: f32,
  smoothness: f32,
  padding: f32,
  color: vec4f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: VignetteUniforms;

@fragment
fn fs_vignette(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTexture, texSampler, input.uv);

  let uv = input.uv * 2.0 - 1.0;
  let aspect = 1.0; // Could be passed via uniforms

  var coords = uv;
  coords.x *= aspect;

  // Compute vignette
  let dist = length(coords) * uniforms.roundness;
  let vignette = 1.0 - smoothstep(1.0 - uniforms.smoothness, 1.0, dist);

  // Blend with vignette color
  let vignetteColor = mix(uniforms.color.rgb, color.rgb, vignette);
  let result = mix(color.rgb, vignetteColor, uniforms.intensity);

  return vec4f(result, color.a);
}
`;

/**
 * Film grain shader
 */
export const FILM_GRAIN_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct FilmGrainUniforms {
  intensity: f32,
  size: f32,
  luminanceContribution: f32,
  time: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: FilmGrainUniforms;

@fragment
fn fs_filmgrain(input: VertexOutput) -> @location(0) vec4f {
  let color = textureSample(inputTexture, texSampler, input.uv);

  let texSize = vec2f(textureDimensions(inputTexture));
  let noiseUV = input.uv * texSize / uniforms.size;

  // Generate animated noise
  let grain = noise2D(noiseUV + vec2f(uniforms.time * 123.456, uniforms.time * 789.012)) * 2.0 - 1.0;

  // Scale grain by luminance
  let lum = luminance(color.rgb);
  let grainAmount = uniforms.intensity * mix(1.0, 1.0 - lum, uniforms.luminanceContribution);

  let result = color.rgb + vec3f(grain * grainAmount);

  return vec4f(result, color.a);
}
`;

/**
 * Sharpen shader
 */
export const SHARPEN_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct SharpenUniforms {
  intensity: f32,
  amount: f32,
  threshold: f32,
  padding: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: SharpenUniforms;

@fragment
fn fs_sharpen(input: VertexOutput) -> @location(0) vec4f {
  let texSize = vec2f(textureDimensions(inputTexture));
  let texel = 1.0 / texSize;

  // Sample 3x3 neighborhood
  let center = textureSample(inputTexture, texSampler, input.uv).rgb;
  let n = textureSample(inputTexture, texSampler, input.uv + vec2f(0.0, -texel.y)).rgb;
  let s = textureSample(inputTexture, texSampler, input.uv + vec2f(0.0, texel.y)).rgb;
  let e = textureSample(inputTexture, texSampler, input.uv + vec2f(texel.x, 0.0)).rgb;
  let w = textureSample(inputTexture, texSampler, input.uv + vec2f(-texel.x, 0.0)).rgb;

  // Compute unsharp mask
  let blur = (n + s + e + w) * 0.25;
  let diff = center - blur;

  // Apply threshold
  let sharpened = select(
    center,
    center + diff * uniforms.amount,
    length(diff) > uniforms.threshold
  );

  let result = mix(center, sharpened, uniforms.intensity);

  return vec4f(result, 1.0);
}
`;

/**
 * Chromatic aberration shader
 */
export const CHROMATIC_ABERRATION_SHADER = /* wgsl */ `
struct ChromaticUniforms {
  intensity: f32,
  radial: f32,
  padding: vec2f,
  redOffset: vec2f,
  greenOffset: vec2f,
  blueOffset: vec2f,
  padding2: vec2f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ChromaticUniforms;

@fragment
fn fs_chromatic(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;

  var rOffset = uniforms.redOffset * uniforms.intensity;
  var gOffset = uniforms.greenOffset * uniforms.intensity;
  var bOffset = uniforms.blueOffset * uniforms.intensity;

  // Apply radial distortion if enabled
  if (uniforms.radial > 0.5) {
    let center = vec2f(0.5);
    let dir = uv - center;
    let dist = length(dir);
    let radialFactor = dist * dist;

    rOffset *= radialFactor;
    gOffset *= radialFactor;
    bOffset *= radialFactor;
  }

  let r = textureSample(inputTexture, texSampler, uv + rOffset).r;
  let g = textureSample(inputTexture, texSampler, uv + gOffset).g;
  let b = textureSample(inputTexture, texSampler, uv + bOffset).b;

  return vec4f(r, g, b, 1.0);
}
`;

/**
 * Depth of Field shader (placeholder - full implementation requires multiple passes)
 */
export const DOF_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct DOFUniforms {
  focusDistance: f32,
  focalLength: f32,
  aperture: f32,
  maxBlur: f32,
  nearPlane: f32,
  farPlane: f32,
  padding: vec2f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: DOFUniforms;

// Note: Full DOF requires depth texture binding

@fragment
fn fs_dof(input: VertexOutput) -> @location(0) vec4f {
  // Placeholder - returns unmodified color
  // Full implementation needs depth texture and multi-pass blur
  return textureSample(inputTexture, texSampler, input.uv);
}
`;

/**
 * SSAO shader (placeholder)
 */
export const SSAO_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct SSAOUniforms {
  radius: f32,
  bias: f32,
  samples: f32,
  power: f32,
  falloff: f32,
  padding: vec3f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: SSAOUniforms;

@fragment
fn fs_ssao(input: VertexOutput) -> @location(0) vec4f {
  // Placeholder - needs depth and normal textures
  return textureSample(inputTexture, texSampler, input.uv);
}
`;

/**
 * Fog shader (placeholder)
 */
export const FOG_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct FogUniforms {
  color: vec3f,
  density: f32,
  start: f32,
  end: f32,
  height: f32,
  heightFalloff: f32,
  mode: f32,
  padding: vec3f,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: FogUniforms;

@fragment
fn fs_fog(input: VertexOutput) -> @location(0) vec4f {
  // Placeholder - needs depth texture
  return textureSample(inputTexture, texSampler, input.uv);
}
`;

/**
 * Motion blur shader (placeholder)
 */
export const MOTION_BLUR_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct MotionBlurUniforms {
  samples: f32,
  velocityScale: f32,
  maxVelocity: f32,
  intensity: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: MotionBlurUniforms;

@fragment
fn fs_motionblur(input: VertexOutput) -> @location(0) vec4f {
  // Placeholder - needs velocity texture
  return textureSample(inputTexture, texSampler, input.uv);
}
`;

/**
 * Color grading shader
 */
export const COLOR_GRADE_SHADER = /* wgsl */ `
${SHADER_UTILS}

struct ColorGradeUniforms {
  shadows: vec3f,
  shadowsOffset: f32,
  midtones: vec3f,
  highlightsOffset: f32,
  highlights: vec3f,
  hueShift: f32,
  temperature: f32,
  tint: f32,
  intensity: f32,
  lutIntensity: f32,
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: ColorGradeUniforms;

// RGB to HSL conversion
fn rgbToHsl(c: vec3f) -> vec3f {
  let cMax = max(max(c.r, c.g), c.b);
  let cMin = min(min(c.r, c.g), c.b);
  let delta = cMax - cMin;

  var h = 0.0;
  var s = 0.0;
  let l = (cMax + cMin) / 2.0;

  if (delta > 0.0) {
    s = select(delta / (2.0 - cMax - cMin), delta / (cMax + cMin), l < 0.5);

    if (cMax == c.r) {
      h = (c.g - c.b) / delta + select(0.0, 6.0, c.g < c.b);
    } else if (cMax == c.g) {
      h = (c.b - c.r) / delta + 2.0;
    } else {
      h = (c.r - c.g) / delta + 4.0;
    }
    h /= 6.0;
  }

  return vec3f(h, s, l);
}

fn hue2rgb(p: f32, q: f32, t: f32) -> f32 {
  var tt = t;
  if (tt < 0.0) { tt += 1.0; }
  if (tt > 1.0) { tt -= 1.0; }
  if (tt < 1.0/6.0) { return p + (q - p) * 6.0 * tt; }
  if (tt < 1.0/2.0) { return q; }
  if (tt < 2.0/3.0) { return p + (q - p) * (2.0/3.0 - tt) * 6.0; }
  return p;
}

fn hslToRgb(hsl: vec3f) -> vec3f {
  if (hsl.y == 0.0) {
    return vec3f(hsl.z);
  }

  let q = select(hsl.z + hsl.y - hsl.z * hsl.y, hsl.z * (1.0 + hsl.y), hsl.z < 0.5);
  let p = 2.0 * hsl.z - q;

  return vec3f(
    hue2rgb(p, q, hsl.x + 1.0/3.0),
    hue2rgb(p, q, hsl.x),
    hue2rgb(p, q, hsl.x - 1.0/3.0)
  );
}

// Temperature/tint adjustment
fn adjustTemperature(color: vec3f, temp: f32, tint: f32) -> vec3f {
  var result = color;
  // Warm (positive) = more red, less blue
  result.r += temp * 0.1;
  result.b -= temp * 0.1;
  // Tint: positive = more green
  result.g += tint * 0.1;
  return clamp(result, vec3f(0.0), vec3f(1.0));
}

@fragment
fn fs_colorgrade(input: VertexOutput) -> @location(0) vec4f {
  var color = textureSample(inputTexture, texSampler, input.uv).rgb;

  let lum = luminance(color);

  // Shadows/Midtones/Highlights
  let shadowWeight = 1.0 - smoothstep(0.0, 0.33, lum);
  let highlightWeight = smoothstep(0.66, 1.0, lum);
  let midtoneWeight = 1.0 - shadowWeight - highlightWeight;

  color += uniforms.shadows * shadowWeight;
  color += uniforms.midtones * midtoneWeight;
  color += uniforms.highlights * highlightWeight;

  // Hue shift
  if (abs(uniforms.hueShift) > 0.001) {
    var hsl = rgbToHsl(color);
    hsl.x = fract(hsl.x + uniforms.hueShift);
    color = hslToRgb(hsl);
  }

  // Temperature and tint
  color = adjustTemperature(color, uniforms.temperature, uniforms.tint);

  return vec4f(color, 1.0);
}
`;

/**
 * Blit/copy shader for simple texture copies
 */
export const BLIT_SHADER = /* wgsl */ `
@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;

@fragment
fn fs_blit(input: VertexOutput) -> @location(0) vec4f {
  return textureSample(inputTexture, texSampler, input.uv);
}
`;

/**
 * Build a complete effect shader by combining vertex shader,
 * utilities, and the effect's fragment shader.
 */
export function buildEffectShader(fragmentShader: string): string {
  return `${FULLSCREEN_VERTEX_SHADER}\n${SHADER_UTILS}\n${fragmentShader}`;
}
