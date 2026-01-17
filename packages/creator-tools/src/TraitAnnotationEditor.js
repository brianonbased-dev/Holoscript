/**
 * Phase 6: Visual Trait Annotation Editor
 *
 * Provides GUI-based editing for @material, @lighting, @rendering annotations
 * with live preview and code generation.
 */
/**
 * Visual editor for trait annotations
 * Provides GUI controls for all trait properties
 */
export class TraitAnnotationEditor {
    constructor(initialConfig, editorConfig = {}) {
        this.listeners = new Map();
        this.presets = new Map();
        this.history = [];
        this.historyIndex = -1;
        this.config = structuredClone(initialConfig);
        this.editorConfig = {
            theme: 'light',
            previewDevices: ['mobile', 'vr', 'desktop'],
            showMetrics: true,
            autoSave: true,
            saveInterval: 5000,
            ...editorConfig,
        };
        this.initializePresets();
        this.pushHistory();
    }
    /**
     * Generate HoloScript+ trait annotation code
     */
    generateCode() {
        const props = this.formatProperties(this.config.properties);
        return `@${this.config.type} { ${props} }`;
    }
    /**
     * Update a single property with live validation
     */
    updateProperty(propertyName, value, validate = true) {
        // Validate against constraints
        const prop = this.config.properties[propertyName];
        if (!prop) {
            return { success: false, error: `Property ${propertyName} not found` };
        }
        // Type coercion
        const coerced = this.coerceValue(value, prop.type);
        // Constraint validation
        if (validate) {
            const validation = this.validateProperty(propertyName, coerced, prop);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
        }
        // Update
        this.config.properties[propertyName].value = coerced;
        this.config.isDirty = true;
        // History
        this.pushHistory();
        // Notify
        this.emit('change', {
            property: propertyName,
            value: coerced,
            code: this.generateCode(),
        });
        return {
            success: true,
            preview: this.generateCode(),
        };
    }
    /**
     * Apply a preset (gold, steel, studio, etc)
     */
    applyPreset(presetName) {
        const preset = this.presets.get(presetName);
        if (!preset)
            return false;
        this.config = structuredClone(preset);
        this.config.presetName = presetName;
        this.pushHistory();
        this.emit('presetApplied', presetName);
        return true;
    }
    /**
     * Get available presets for current trait type
     */
    getAvailablePresets() {
        return Array.from(this.presets.keys()).filter((key) => {
            const preset = this.presets.get(key);
            return preset?.type === this.config.type;
        });
    }
    /**
     * Export current config as JSON
     */
    exportConfig() {
        return JSON.stringify({
            type: this.config.type,
            properties: Object.fromEntries(Object.entries(this.config.properties).map(([key, prop]) => [
                key,
                prop.value,
            ])),
            preset: this.config.presetName,
        }, null, 2);
    }
    /**
     * Import config from JSON
     */
    importConfig(json) {
        try {
            const imported = JSON.parse(json);
            if (!imported.type)
                return false;
            // Merge with existing properties
            for (const [key, value] of Object.entries(imported.properties)) {
                if (key in this.config.properties) {
                    this.config.properties[key].value = value;
                }
            }
            this.config.isDirty = true;
            this.pushHistory();
            this.emit('imported', imported);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Undo last change
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.config = structuredClone(this.history[this.historyIndex]);
            this.emit('undo');
            return true;
        }
        return false;
    }
    /**
     * Redo last undone change
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.config = structuredClone(this.history[this.historyIndex]);
            this.emit('redo');
            return true;
        }
        return false;
    }
    /**
     * Get property editor UI schema
     */
    getEditorSchema() {
        return this.config.properties;
    }
    /**
     * Reset to initial state
     */
    reset() {
        this.history = [this.history[0]];
        this.historyIndex = 0;
        this.config = structuredClone(this.history[0]);
        this.emit('reset');
    }
    /**
     * Subscribe to changes
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    /**
     * Private: Initialize presets
     */
    initializePresets() {
        // Material presets
        this.presets.set('gold', {
            type: 'material',
            properties: {
                type: { name: 'type', value: 'pbr', type: 'string', description: '', category: 'basic' },
                metallic: { name: 'metallic', value: 0.95, type: 'number', min: 0, max: 1, step: 0.01, description: '', category: 'pbr' },
                roughness: { name: 'roughness', value: 0.1, type: 'number', min: 0, max: 1, step: 0.01, description: '', category: 'pbr' },
                color: { name: 'color', value: { r: 1.0, g: 0.84, b: 0.0 }, type: 'color', description: '', category: 'appearance' },
            },
            presetName: 'gold',
            isDirty: false,
        });
        this.presets.set('steel', {
            type: 'material',
            properties: {
                type: { name: 'type', value: 'pbr', type: 'string', description: '', category: 'basic' },
                metallic: { name: 'metallic', value: 0.9, type: 'number', min: 0, max: 1, step: 0.01, description: '', category: 'pbr' },
                roughness: { name: 'roughness', value: 0.4, type: 'number', min: 0, max: 1, step: 0.01, description: '', category: 'pbr' },
                color: { name: 'color', value: { r: 0.8, g: 0.8, b: 0.8 }, type: 'color', description: '', category: 'appearance' },
            },
            presetName: 'steel',
            isDirty: false,
        });
        // Lighting presets
        this.presets.set('studio', {
            type: 'lighting',
            properties: {
                type: { name: 'type', value: 'directional', type: 'enum', options: ['directional', 'point', 'spot'], description: '', category: 'basic' },
                intensity: { name: 'intensity', value: 1.5, type: 'number', min: 0, max: 3, step: 0.1, description: '', category: 'intensity' },
                color: { name: 'color', value: { r: 1.0, g: 1.0, b: 1.0 }, type: 'color', description: '', category: 'appearance' },
                shadows: { name: 'shadows', value: true, type: 'boolean', description: '', category: 'shadows' },
            },
            presetName: 'studio',
            isDirty: false,
        });
        // Rendering presets
        this.presets.set('high-performance', {
            type: 'rendering',
            properties: {
                quality: { name: 'quality', value: 'high', type: 'enum', options: ['low', 'medium', 'high', 'ultra'], description: '', category: 'quality' },
                platform: { name: 'platform', value: 'desktop', type: 'enum', options: ['mobile', 'vr', 'desktop'], description: '', category: 'platform' },
                lod: { name: 'lod', value: true, type: 'boolean', description: '', category: 'optimization' },
                maxLights: { name: 'maxLights', value: 8, type: 'number', min: 1, max: 16, step: 1, description: '', category: 'performance' },
            },
            presetName: 'high-performance',
            isDirty: false,
        });
    }
    /**
     * Private: Format properties for code generation
     */
    formatProperties(props) {
        return Object.entries(props)
            .map(([key, prop]) => {
            const value = this.formatValue(prop.value, prop.type);
            return `${key}: ${value}`;
        })
            .join(', ');
    }
    /**
     * Private: Format value for code output
     */
    formatValue(value, type) {
        switch (type) {
            case 'string':
                return `"${value}"`;
            case 'color':
                const c = value;
                return `{ r: ${c.r}, g: ${c.g}, b: ${c.b} }`;
            case 'number':
                return String(value);
            case 'boolean':
                return String(value);
            default:
                return JSON.stringify(value);
        }
    }
    /**
     * Private: Coerce value to proper type
     */
    coerceValue(value, type) {
        switch (type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return Boolean(value);
            case 'string':
                return String(value);
            default:
                return value;
        }
    }
    /**
     * Private: Validate property
     */
    validateProperty(name, value, prop) {
        if (prop.type === 'number') {
            const num = value;
            if (prop.min !== undefined && num < prop.min) {
                return { valid: false, error: `${name} must be >= ${prop.min}` };
            }
            if (prop.max !== undefined && num > prop.max) {
                return { valid: false, error: `${name} must be <= ${prop.max}` };
            }
        }
        if (prop.type === 'enum' && prop.options) {
            if (!prop.options.includes(String(value))) {
                return { valid: false, error: `${name} must be one of ${prop.options.join(', ')}` };
            }
        }
        return { valid: true };
    }
    /**
     * Private: Push to history
     */
    pushHistory() {
        // Remove any redo history
        this.history = this.history.slice(0, this.historyIndex + 1);
        // Add new state
        this.history.push(structuredClone(this.config));
        this.historyIndex++;
        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    /**
     * Private: Emit event
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach((cb) => cb(data));
    }
}
/**
 * Create editor for material traits
 */
export function createMaterialEditor() {
    return new TraitAnnotationEditor({
        type: 'material',
        properties: {
            type: {
                name: 'type',
                value: 'pbr',
                type: 'enum',
                options: ['pbr', 'standard', 'unlit'],
                description: 'Material model type',
                category: 'basic',
            },
            metallic: {
                name: 'metallic',
                value: 0.5,
                type: 'number',
                min: 0,
                max: 1,
                step: 0.01,
                description: 'Metallic property (0-1)',
                category: 'pbr',
            },
            roughness: {
                name: 'roughness',
                value: 0.5,
                type: 'number',
                min: 0,
                max: 1,
                step: 0.01,
                description: 'Surface roughness (0-1)',
                category: 'pbr',
            },
            color: {
                name: 'color',
                value: { r: 1.0, g: 1.0, b: 1.0 },
                type: 'color',
                description: 'Base color',
                category: 'appearance',
            },
        },
        isDirty: false,
    });
}
/**
 * Create editor for lighting traits
 */
export function createLightingEditor() {
    return new TraitAnnotationEditor({
        type: 'lighting',
        properties: {
            type: {
                name: 'type',
                value: 'directional',
                type: 'enum',
                options: ['directional', 'point', 'spot'],
                description: 'Light source type',
                category: 'basic',
            },
            intensity: {
                name: 'intensity',
                value: 1.0,
                type: 'number',
                min: 0,
                max: 5,
                step: 0.1,
                description: 'Light brightness',
                category: 'intensity',
            },
            color: {
                name: 'color',
                value: { r: 1.0, g: 1.0, b: 1.0 },
                type: 'color',
                description: 'Light color',
                category: 'appearance',
            },
            shadows: {
                name: 'shadows',
                value: false,
                type: 'boolean',
                description: 'Enable shadow mapping',
                category: 'shadows',
            },
        },
        isDirty: false,
    });
}
/**
 * Create editor for rendering traits
 */
export function createRenderingEditor() {
    return new TraitAnnotationEditor({
        type: 'rendering',
        properties: {
            quality: {
                name: 'quality',
                value: 'medium',
                type: 'enum',
                options: ['low', 'medium', 'high', 'ultra'],
                description: 'Rendering quality preset',
                category: 'quality',
            },
            platform: {
                name: 'platform',
                value: 'desktop',
                type: 'enum',
                options: ['mobile', 'vr', 'desktop'],
                description: 'Target platform',
                category: 'platform',
            },
            lod: {
                name: 'lod',
                value: true,
                type: 'boolean',
                description: 'Enable level-of-detail',
                category: 'optimization',
            },
            maxLights: {
                name: 'maxLights',
                value: 4,
                type: 'number',
                min: 1,
                max: 16,
                step: 1,
                description: 'Maximum active lights',
                category: 'performance',
            },
        },
        isDirty: false,
    });
}
