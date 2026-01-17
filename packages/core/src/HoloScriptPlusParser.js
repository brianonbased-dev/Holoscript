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
// ============================================================================
// HoloScriptPlus Parser
// ============================================================================
export class HoloScriptPlusParser {
    constructor() {
        this.baseParser = new HoloScriptCodeParser();
    }
    /**
     * Parse HoloScript+ code with trait annotations
     */
    parse(code) {
        // First, parse with base parser
        const baseResult = this.baseParser.parse(code);
        const ast = (Array.isArray(baseResult) ? baseResult : [baseResult]);
        // Then enhance with trait annotations
        return this.enhanceWithTraits(ast, code);
    }
    /**
     * Enhance AST nodes with trait annotations
     */
    enhanceWithTraits(ast, code) {
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
    enhanceOrbNodeWithTraits(node, code) {
        const orbNode = node;
        const enhanced = {
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
    extractTraitAnnotations(code, _orbLine) {
        const traits = [];
        const traitRegex = /@(material|lighting|rendering)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
        let match;
        while ((match = traitRegex.exec(code)) !== null) {
            const type = match[1];
            const configStr = match[2];
            try {
                const config = this.parseObjectLiteral(configStr);
                switch (type) {
                    case 'material':
                        traits.push({
                            type: 'material',
                            config: config,
                        });
                        break;
                    case 'lighting':
                        traits.push({
                            type: 'lighting',
                            config: config,
                        });
                        break;
                    case 'rendering':
                        traits.push({
                            type: 'rendering',
                            config: config,
                        });
                        break;
                }
            }
            catch (e) {
                console.warn(`Failed to parse ${type} trait annotation:`, e);
            }
        }
        return traits;
    }
    /**
     * Parse object literal from string
     * Supports nested objects and arrays
     */
    parseObjectLiteral(str) {
        const config = {};
        // Split by comma, but respect nested braces and brackets
        let depth = 0;
        let current = '';
        let pairs = [];
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '{' || char === '[') {
                depth++;
            }
            else if (char === '}' || char === ']') {
                depth--;
            }
            else if (char === ',' && depth === 0) {
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
            if (colonIndex === -1)
                continue;
            const key = pair.substring(0, colonIndex).trim();
            const value = pair.substring(colonIndex + 1).trim();
            config[key] = this.parseValue(value);
        }
        return config;
    }
    /**
     * Parse individual values
     */
    parseValue(str) {
        str = str.trim();
        // Boolean
        if (str === 'true')
            return true;
        if (str === 'false')
            return false;
        // Number
        if (/^-?\d+(\.\d+)?$/.test(str))
            return parseFloat(str);
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
    buildGraphicsConfig(traits) {
        const config = {};
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
            }
        }
        return config;
    }
    /**
     * Validate trait annotation configuration
     */
    validateTraitAnnotation(trait) {
        const errors = [];
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
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate material trait configuration
     */
    validateMaterialTrait(trait) {
        const errors = [];
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
    validateLightingTrait(trait) {
        const errors = [];
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
    validateRenderingTrait(trait) {
        const errors = [];
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
    createGraphicsTraits(config) {
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
    createMaterialTrait(config) {
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
            config.textures.forEach((tex) => {
                material.addTexture(tex);
            });
        }
        return material;
    }
    /**
     * Create LightingTrait from config
     */
    createLightingTrait(config) {
        const { LightingTrait, LIGHTING_PRESETS } = require('./traits/LightingTrait');
        let lighting;
        if (config.preset) {
            const preset = LIGHTING_PRESETS[config.preset];
            lighting = new LightingTrait(preset);
        }
        else {
            lighting = new LightingTrait();
        }
        if (config.globalIllumination) {
            lighting.setGlobalIllumination(config.globalIllumination);
        }
        if (config.lights) {
            config.lights.forEach((light) => {
                lighting.addLight(light);
            });
        }
        return lighting;
    }
    /**
     * Create RenderingTrait from config
     */
    createRenderingTrait(config) {
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
