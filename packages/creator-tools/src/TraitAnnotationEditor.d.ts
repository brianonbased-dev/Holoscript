/**
 * Phase 6: Visual Trait Annotation Editor
 *
 * Provides GUI-based editing for @material, @lighting, @rendering annotations
 * with live preview and code generation.
 */
export interface EditableTraitConfig {
    type: 'material' | 'lighting' | 'rendering';
    properties: Record<string, TraitProperty>;
    presetName?: string;
    isDirty: boolean;
}
export interface TraitProperty {
    name: string;
    value: unknown;
    type: 'string' | 'number' | 'boolean' | 'color' | 'enum' | 'object';
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    description: string;
    category: string;
}
export interface TraitEditorConfig {
    theme?: 'light' | 'dark';
    previewDevices?: ('mobile' | 'vr' | 'desktop')[];
    showMetrics?: boolean;
    autoSave?: boolean;
    saveInterval?: number;
}
/**
 * Visual editor for trait annotations
 * Provides GUI controls for all trait properties
 */
export declare class TraitAnnotationEditor {
    private config;
    private editorConfig;
    private listeners;
    private presets;
    private history;
    private historyIndex;
    constructor(initialConfig: EditableTraitConfig, editorConfig?: TraitEditorConfig);
    /**
     * Generate HoloScript+ trait annotation code
     */
    generateCode(): string;
    /**
     * Update a single property with live validation
     */
    updateProperty(propertyName: string, value: unknown, validate?: boolean): {
        success: boolean;
        error?: string;
        preview?: string;
    };
    /**
     * Apply a preset (gold, steel, studio, etc)
     */
    applyPreset(presetName: string): boolean;
    /**
     * Get available presets for current trait type
     */
    getAvailablePresets(): string[];
    /**
     * Export current config as JSON
     */
    exportConfig(): string;
    /**
     * Import config from JSON
     */
    importConfig(json: string): boolean;
    /**
     * Undo last change
     */
    undo(): boolean;
    /**
     * Redo last undone change
     */
    redo(): boolean;
    /**
     * Get property editor UI schema
     */
    getEditorSchema(): Record<string, TraitProperty>;
    /**
     * Reset to initial state
     */
    reset(): void;
    /**
     * Subscribe to changes
     */
    on(event: string, callback: Function): void;
    /**
     * Private: Initialize presets
     */
    private initializePresets;
    /**
     * Private: Format properties for code generation
     */
    private formatProperties;
    /**
     * Private: Format value for code output
     */
    private formatValue;
    /**
     * Private: Coerce value to proper type
     */
    private coerceValue;
    /**
     * Private: Validate property
     */
    private validateProperty;
    /**
     * Private: Push to history
     */
    private pushHistory;
    /**
     * Private: Emit event
     */
    private emit;
}
/**
 * Create editor for material traits
 */
export declare function createMaterialEditor(): TraitAnnotationEditor;
/**
 * Create editor for lighting traits
 */
export declare function createLightingEditor(): TraitAnnotationEditor;
/**
 * Create editor for rendering traits
 */
export declare function createRenderingEditor(): TraitAnnotationEditor;
