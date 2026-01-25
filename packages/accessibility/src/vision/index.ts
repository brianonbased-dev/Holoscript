/**
 * @holoscript/accessibility - Vision Accommodations Module
 *
 * Provides vision accessibility features:
 * - Colorblind simulation modes
 * - Contrast adjustment
 * - Color remapping
 * - High visibility modes
 * - Shader-based color filters
 */

import { VisionMode, VisionConfig } from '../types';

/**
 * Color in RGB format (0-255)
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Color transformation matrix (3x3)
 */
export type ColorMatrix = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

/**
 * Colorblind simulation matrices
 * Based on research by Machado et al. (2009)
 */
export const COLORBLIND_MATRICES: Record<VisionMode, ColorMatrix> = {
  [VisionMode.Normal]: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  [VisionMode.Deuteranopia]: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  [VisionMode.Protanopia]: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  [VisionMode.Tritanopia]: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
  [VisionMode.Achromatopsia]: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
  [VisionMode.HighContrast]: [
    [1.5, -0.25, -0.25],
    [-0.25, 1.5, -0.25],
    [-0.25, -0.25, 1.5],
  ],
  // These modes don't affect color, use identity matrix
  [VisionMode.ReducedMotion]: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  [VisionMode.LargeText]: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
};

/**
 * Daltonization matrices (correction, not simulation)
 */
export const DALTONIZATION_MATRICES: Partial<Record<VisionMode, ColorMatrix>> = {
  [VisionMode.Deuteranopia]: [
    [1, 0.7, 0],
    [0, 1, 0],
    [0, 0.7, 1],
  ],
  [VisionMode.Protanopia]: [
    [1, 0, 0.7],
    [0, 1, 0.7],
    [0, 0, 1],
  ],
  [VisionMode.Tritanopia]: [
    [1, 0.7, 0],
    [0.7, 1, 0],
    [0, 0, 1],
  ],
};

/**
 * Vision accommodations controller
 */
export class VisionController {
  private config: VisionConfig;
  private cssFilterElement: HTMLStyleElement | null = null;

  constructor(config?: Partial<VisionConfig>) {
    this.config = {
      mode: config?.mode ?? VisionMode.Normal,
      contrast: config?.contrast ?? 1.0,
      brightness: config?.brightness ?? 1.0,
      saturation: config?.saturation ?? 1.0,
      fontSize: config?.fontSize ?? 1.0,
      highVisibilityPointer: config?.highVisibilityPointer ?? false,
      reduceMotion: config?.reduceMotion ?? false,
      reduceTransparency: config?.reduceTransparency ?? false,
    };
  }

  /**
   * Apply color transformation to a single color
   */
  public transformColor(color: Color): Color {
    const matrix = COLORBLIND_MATRICES[this.config.mode];

    let r = color.r / 255;
    let g = color.g / 255;
    let b = color.b / 255;

    // Apply colorblind matrix
    const newR = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
    const newG = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
    const newB = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;

    // Apply contrast
    const c = this.config.contrast;
    r = (newR - 0.5) * c + 0.5;
    g = (newG - 0.5) * c + 0.5;
    b = (newB - 0.5) * c + 0.5;

    // Apply brightness
    r *= this.config.brightness;
    g *= this.config.brightness;
    b *= this.config.brightness;

    // Apply saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + this.config.saturation * (r - gray);
    g = gray + this.config.saturation * (g - gray);
    b = gray + this.config.saturation * (b - gray);

    // Clamp
    return {
      r: Math.round(Math.max(0, Math.min(255, r * 255))),
      g: Math.round(Math.max(0, Math.min(255, g * 255))),
      b: Math.round(Math.max(0, Math.min(255, b * 255))),
      a: color.a,
    };
  }

  /**
   * Apply daltonization (correction) to a color
   */
  public daltonize(color: Color): Color {
    const matrix = DALTONIZATION_MATRICES[this.config.mode];
    if (!matrix || this.config.mode === VisionMode.Normal) {
      return color;
    }

    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const newR = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
    const newG = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
    const newB = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;

    return {
      r: Math.round(Math.max(0, Math.min(255, newR * 255))),
      g: Math.round(Math.max(0, Math.min(255, newG * 255))),
      b: Math.round(Math.max(0, Math.min(255, newB * 255))),
      a: color.a,
    };
  }

  /**
   * Get CSS filter string for current mode
   */
  public getCSSFilter(): string {
    const filters: string[] = [];

    // Contrast
    if (this.config.contrast !== 1.0) {
      filters.push(`contrast(${this.config.contrast})`);
    }

    // Brightness
    if (this.config.brightness !== 1.0) {
      filters.push(`brightness(${this.config.brightness})`);
    }

    // Saturation
    if (this.config.saturation !== 1.0) {
      filters.push(`saturate(${this.config.saturation})`);
    }

    // Grayscale for achromatopsia
    if (this.config.mode === VisionMode.Achromatopsia) {
      filters.push('grayscale(1)');
    }

    return filters.join(' ') || 'none';
  }

  /**
   * Get Three.js shader uniform for color transformation
   */
  public getShaderUniforms(): Record<string, { value: number[] | number }> {
    const matrix = COLORBLIND_MATRICES[this.config.mode];

    return {
      colorMatrix: {
        value: [
          matrix[0][0],
          matrix[0][1],
          matrix[0][2],
          matrix[1][0],
          matrix[1][1],
          matrix[1][2],
          matrix[2][0],
          matrix[2][1],
          matrix[2][2],
        ],
      },
      contrast: { value: this.config.contrast },
      brightness: { value: this.config.brightness },
      saturation: { value: this.config.saturation },
    };
  }

  /**
   * Get GLSL fragment shader code for color transformation
   */
  public getFragmentShaderCode(): string {
    return `
      uniform mat3 colorMatrix;
      uniform float contrast;
      uniform float brightness;
      uniform float saturation;

      vec3 applyVisionFilter(vec3 color) {
        // Apply colorblind transformation
        vec3 transformed = colorMatrix * color;
        
        // Apply contrast
        transformed = (transformed - 0.5) * contrast + 0.5;
        
        // Apply brightness
        transformed *= brightness;
        
        // Apply saturation
        float gray = dot(transformed, vec3(0.299, 0.587, 0.114));
        transformed = mix(vec3(gray), transformed, saturation);
        
        return clamp(transformed, 0.0, 1.0);
      }
    `;
  }

  /**
   * Apply CSS filter to document body
   */
  public applyCSSFilter(): void {
    if (!this.cssFilterElement) {
      this.cssFilterElement = document.createElement('style');
      document.head.appendChild(this.cssFilterElement);
    }

    const filter = this.getCSSFilter();
    const reduceMotion = this.config.reduceMotion ? '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }' : '';
    const reduceTransparency = this.config.reduceTransparency ? '* { opacity: 1 !important; backdrop-filter: none !important; }' : '';

    this.cssFilterElement.textContent = `
      html {
        filter: ${filter};
      }
      ${reduceMotion}
      ${reduceTransparency}
    `;
  }

  /**
   * Remove CSS filter from document
   */
  public removeCSSFilter(): void {
    if (this.cssFilterElement) {
      this.cssFilterElement.remove();
      this.cssFilterElement = null;
    }
  }

  /**
   * Get accessible color palette
   * Returns colors that are distinguishable in current vision mode
   */
  public getAccessiblePalette(): Color[] {
    // Default accessible palette (designed for colorblind visibility)
    const basePalette: Color[] = [
      { r: 0, g: 114, b: 178 }, // Blue
      { r: 230, g: 159, b: 0 }, // Orange
      { r: 0, g: 158, b: 115 }, // Green
      { r: 204, g: 121, b: 167 }, // Pink
      { r: 213, g: 94, b: 0 }, // Vermillion
      { r: 86, g: 180, b: 233 }, // Sky Blue
      { r: 240, g: 228, b: 66 }, // Yellow
    ];

    // Apply daltonization if needed
    if (this.config.mode !== VisionMode.Normal) {
      return basePalette.map((c) => this.daltonize(c));
    }

    return basePalette;
  }

  /**
   * Check if two colors are distinguishable in current mode
   */
  public areColorsDistinguishable(color1: Color, color2: Color): boolean {
    const t1 = this.transformColor(color1);
    const t2 = this.transformColor(color2);

    // Calculate color distance (simple Euclidean)
    const dr = t1.r - t2.r;
    const dg = t1.g - t2.g;
    const db = t1.b - t2.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    // Threshold for distinguishability (based on WCAG guidelines)
    return distance > 50;
  }

  /**
   * Suggest an alternative color if not distinguishable from background
   */
  public suggestAlternativeColor(color: Color, backgroundColor: Color): Color | null {
    if (this.areColorsDistinguishable(color, backgroundColor)) {
      return null; // Current color is fine
    }

    // Try palette colors
    const palette = this.getAccessiblePalette();
    for (const candidate of palette) {
      if (this.areColorsDistinguishable(candidate, backgroundColor)) {
        return candidate;
      }
    }

    // Fallback: invert brightness
    const brightness = (color.r + color.g + color.b) / 3;
    if (brightness > 127) {
      return { r: 0, g: 0, b: 0 };
    } else {
      return { r: 255, g: 255, b: 255 };
    }
  }

  /**
   * Update configuration
   */
  public setConfig(config: Partial<VisionConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.cssFilterElement) {
      this.applyCSSFilter();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): VisionConfig {
    return { ...this.config };
  }

  /**
   * Check if reduce motion is preferred
   */
  public shouldReduceMotion(): boolean {
    return this.config.reduceMotion || 
      (typeof window !== 'undefined' && 
       window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * Get font size multiplier
   */
  public getFontSizeMultiplier(): number {
    return this.config.fontSize;
  }

  /**
   * Check if high visibility pointer is enabled
   */
  public isHighVisibilityPointerEnabled(): boolean {
    return this.config.highVisibilityPointer;
  }
}

/**
 * Factory function
 */
export function createVisionController(config?: Partial<VisionConfig>): VisionController {
  return new VisionController(config);
}

// Re-export types
export type { VisionMode, VisionConfig };
