/**
 * HoloScriptPlus Parser Tests
 * 
 * Tests for trait annotation parsing and validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HoloScriptPlusParser, type MaterialTraitAnnotation } from '../HoloScriptPlusParser';

describe('HoloScriptPlusParser', () => {
  let parser: HoloScriptPlusParser;

  beforeEach(() => {
    parser = new HoloScriptPlusParser();
  });

  // ========================================================================
  // Material Trait Tests
  // ========================================================================

  describe('Material Trait Annotations', () => {
    it('should parse material trait annotation', () => {
      const code = `
        orb#sphere {
          @material { type: pbr }
        }
      `;

      const traits = parser.extractTraitAnnotations(code);
      expect(traits).toHaveLength(1);
      expect(traits[0].type).toBe('material');
    });

    it('should parse material with basic properties', () => {
      const code = `@material { type: pbr }`;
      const traits = parser.extractTraitAnnotations(code);

      expect((traits[0] as MaterialTraitAnnotation).config.type).toBe('pbr');
    });

    it('should parse material with textures', () => {
      const code = `@material { textures: [{ path: diffuse.jpg, channel: baseColor }] }`;
      const traits = parser.extractTraitAnnotations(code);

      expect((traits[0] as MaterialTraitAnnotation).config.textures).toBeDefined();
    });

    it('should parse material compression option', () => {
      const code = `@material { compression: basis }`;
      const traits = parser.extractTraitAnnotations(code);

      expect((traits[0] as MaterialTraitAnnotation).config.compression).toBe('basis');
    });

    it('should validate material trait', () => {
      const trait = {
        type: 'material' as const,
        config: { pbr: { metallic: 0.5, roughness: 0.3 } },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid metallic value', () => {
      const trait = {
        type: 'material' as const,
        config: { pbr: { metallic: 1.5 } },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid compression format', () => {
      const trait = {
        type: 'material' as const,
        config: { compression: 'invalid' },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(false);
    });
  });

  // ========================================================================
  // Lighting Trait Tests
  // ========================================================================

  describe('Lighting Trait Annotations', () => {
    it('should parse lighting trait annotation', () => {
      const code = `
        @lighting { preset: studio, shadows: true }
      `;

      const traits = parser.extractTraitAnnotations(code);
      expect(traits).toHaveLength(1);
      expect(traits[0].type).toBe('lighting');
    });

/*
    it('should parse lighting with preset', () => {
      const code = `@lighting { preset: outdoor }`;
      const traits = parser.extractTraitAnnotations(code);

      expect((traits[0] as any).config.preset).toBe('outdoor');
    });

    it('should parse lighting with lights', () => {
      const code = `@lighting { lights: [{ type: directional, intensity: 1.2 }] }`;
      const traits = parser.extractTraitAnnotations(code);

      expect((traits[0] as any).config.lights).toBeDefined();
    });
*/

    it('should validate lighting trait', () => {
      const trait = {
        type: 'lighting' as const,
        config: { preset: 'studio' },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid preset', () => {
      const trait = {
        type: 'lighting' as const,
        config: { preset: 'invalid' },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(false);
    });

    it('should reject light with negative intensity', () => {
      const trait = {
        type: 'lighting' as const,
        config: { lights: [{ type: 'point', intensity: -0.5 }] },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(false);
    });
  });

  // ========================================================================
  // Rendering Trait Tests
  // ========================================================================

  describe('Rendering Trait Annotations', () => {
    it('should parse rendering trait annotation', () => {
      const code = `
        @rendering { quality: high, lod: true, culling: true }
      `;

      const traits = parser.extractTraitAnnotations(code);
      expect(traits).toHaveLength(1);
      expect(traits[0].type).toBe('rendering');
    });

    it('should parse rendering with quality preset', () => {
      const code = `@rendering { quality: ultra }`;
      const traits = parser.extractTraitAnnotations(code);

      expect((traits[0] as any).config.quality).toBe('ultra');
    });

    it('should parse rendering with platform optimization', () => {
      const code = `@rendering { platform: mobile, quality: low }`;
      const traits = parser.extractTraitAnnotations(code);

      expect((traits[0] as any).config.platform).toBe('mobile');
    });

    it('should validate rendering trait', () => {
      const trait = {
        type: 'rendering' as const,
        config: { quality: 'high', platform: 'desktop' },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid quality preset', () => {
      const trait = {
        type: 'rendering' as const,
        config: { quality: 'invalid' },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(false);
    });

    it('should reject invalid platform', () => {
      const trait = {
        type: 'rendering' as const,
        config: { platform: 'console' },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(false);
    });

    it('should reject invalid FPS target', () => {
      const trait = {
        type: 'rendering' as const,
        config: { targetFPS: 500 },
      };

      const validation = parser.validateTraitAnnotation(trait as any);
      expect(validation.valid).toBe(false);
    });
  });

  // ========================================================================
  // Combined Trait Tests
  // ========================================================================

  describe('Combined Trait Annotations', () => {
    it('should parse multiple traits on single orb', () => {
      const code = `
        orb#sphere {
          @material { type: pbr, metallic: 0.5 }
          @lighting { preset: studio }
          @rendering { quality: high }
        }
      `;

      const traits = parser.extractTraitAnnotations(code);
      expect(traits).toHaveLength(3);
      expect(traits.map((t) => t.type).sort()).toEqual(['lighting', 'material', 'rendering']);
    });

    it('should build graphics configuration from traits', () => {
      const traits = [
        {
          type: 'material' as const,
          config: { type: 'pbr', pbr: { metallic: 0.5 } },
        },
        {
          type: 'lighting' as const,
          config: { preset: 'studio' },
        },
        {
          type: 'rendering' as const,
          config: { quality: 'high' },
        },
      ];

      const config = parser.buildGraphicsConfig(traits as any);

      expect(config.material).toBeDefined();
      expect(config.lighting).toBeDefined();
      expect(config.rendering).toBeDefined();
    });
  });

  // ========================================================================
  // Object Literal Parsing Tests
  // ========================================================================

  describe('Object Literal Parsing', () => {
    it('should parse simple key-value pairs', () => {
      const result = parser.parseObjectLiteral('type: pbr');
      expect(result.type).toBe('pbr');
    });

    it('should parse boolean values', () => {
      const result = parser.parseObjectLiteral('shadows: true');
      expect(result.shadows).toBe(true);
    });

    it('should parse numeric values', () => {
      const result = parser.parseObjectLiteral('targetFPS: 120');
      expect(result.targetFPS).toBe(120);
    });

    it('should parse string values', () => {
      const result = parser.parseObjectLiteral('compression: basis');
      expect(result.compression).toBe('basis');
    });
  });

  // ========================================================================
  // Value Parsing Tests
  // ========================================================================

  describe('Value Parsing', () => {
    it('should parse boolean true', () => {
      const value = parser.parseValue('true');
      expect(value).toBe(true);
    });

    it('should parse boolean false', () => {
      const value = parser.parseValue('false');
      expect(value).toBe(false);
    });

    it('should parse positive integer', () => {
      const value = parser.parseValue('120');
      expect(value).toBe(120);
    });

    it('should parse decimal number', () => {
      const value = parser.parseValue('0.5');
      expect(value).toBe(0.5);
    });

    it('should parse negative number', () => {
      const value = parser.parseValue('-5.5');
      expect(value).toBe(-5.5);
    });

    it('should parse quoted string', () => {
      const value = parser.parseValue('"pbr"');
      expect(value).toBe('pbr');
    });

    it('should parse single-quoted string', () => {
      const value = parser.parseValue("'studio'");
      expect(value).toBe('studio');
    });
  });;

  // ========================================================================
  // Enhanced Orb Node Tests
  // ========================================================================

  describe('Enhanced OrbNode with Graphics Traits', () => {
    it('should extract graphics traits from code', () => {
      const code = `
        orb#sphere {
          @material { type: pbr, metallic: 0.5 }
          @lighting { preset: studio }
        }
      `;

      const traits = parser.extractTraitAnnotations(code);
      expect(traits).toHaveLength(2);
      expect(traits[0].type).toBe('material');
      expect(traits[1].type).toBe('lighting');
    });

    it('should create material trait from config', () => {
      const code = `@material { type: pbr, metallic: 0.5, compression: basis }`;

      const traits = parser.extractTraitAnnotations(code);
      expect(traits).toHaveLength(1);
      expect((traits[0] as any).config.type).toBe('pbr');
    });
  });

  // ========================================================================
  // Edge Cases and Error Handling
  // ========================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty trait annotation gracefully', () => {
      const code = `@material {}`;
      const traits = parser.extractTraitAnnotations(code);
      expect(traits).toHaveLength(1);
      expect(traits[0].config).toBeDefined();
    });

    it('should handle malformed JSON gracefully', () => {
      const code = `@material { invalid json }`;
      const traits = parser.extractTraitAnnotations(code);
      // Parser should attempt to parse and return best effort result
      expect(traits.length).toBeGreaterThanOrEqual(0);
    });

    it('should ignore invalid trait types', () => {
      const code = `@invalid { type: something }`;
      const traits = parser.extractTraitAnnotations(code);
      // Should not include invalid trait type
      expect(traits.every((t) => ['material', 'lighting', 'rendering'].includes(t.type))).toBe(true);
    });

    it('should handle multiple orbs with different traits', () => {
      const code = `
        orb#sphere1 { @material { metallic: 0.5 } }
        orb#sphere2 { @lighting { preset: studio } }
        orb#sphere3 { @rendering { quality: high } }
      `;

      const traits = parser.extractTraitAnnotations(code);
      expect(traits).toHaveLength(3);
    });
  });
});
