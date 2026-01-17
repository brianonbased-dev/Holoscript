/**
 * Phase 6: TraitAnnotationEditor Unit Tests
 *
 * Tests for backend trait editor functionality including:
 * - Property validation and updates
 * - Code generation
 * - Preset management
 * - Undo/Redo functionality
 * - Import/Export operations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TraitAnnotationEditor } from '../TraitAnnotationEditor';
import { mockMaterialConfig, PerformanceMeasure } from './setup';
describe('TraitAnnotationEditor', () => {
    let editor;
    let performanceMeasure;
    beforeEach(() => {
        editor = new TraitAnnotationEditor(mockMaterialConfig, {
            theme: 'light',
            showMetrics: true,
            autoSave: false,
        });
        performanceMeasure = new PerformanceMeasure();
    });
    afterEach(() => {
        performanceMeasure.clear();
    });
    describe('Initialization', () => {
        it('should initialize with config', () => {
            expect(editor).toBeDefined();
        });
        it('should set default theme', () => {
            const editorWithDefaults = new TraitAnnotationEditor(mockMaterialConfig);
            expect(editorWithDefaults).toBeDefined();
        });
        it('should initialize presets', () => {
            // Presets should be available after init
            expect(() => editor.applyPreset('gold')).not.toThrow();
        });
    });
    describe('Code Generation', () => {
        it('should generate valid HoloScript+ code', () => {
            const code = editor.generateCode();
            expect(code).toContain('@material');
            expect(code).toContain('metallic:');
            expect(code).toContain('roughness:');
        });
        it('should generate code with correct syntax', () => {
            const code = editor.generateCode();
            // Should start with @type and have braces
            expect(code).toMatch(/^@\w+\s*{.*}$/);
        });
        it('should update code when property changes', () => {
            const initialCode = editor.generateCode();
            editor.updateProperty('metallic', 0.5);
            const updatedCode = editor.generateCode();
            // Code should change when property changes
            expect(updatedCode).not.toEqual(initialCode);
        });
        it('should generate code with performance <50ms', () => {
            performanceMeasure.start('codeGen');
            for (let i = 0; i < 100; i++) {
                editor.generateCode();
            }
            const totalTime = performanceMeasure.end('codeGen');
            const avgTime = totalTime / 100;
            expect(avgTime).toBeLessThan(50);
        });
    });
    describe('Property Updates', () => {
        it('should update numeric property', () => {
            const result = editor.updateProperty('metallic', 0.5);
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });
        it('should update color property', () => {
            const result = editor.updateProperty('baseColor', '#ff0000');
            expect(result.success).toBe(true);
        });
        it('should update enum property', () => {
            const result = editor.updateProperty('type', 'standard');
            expect(result.success).toBe(true);
        });
        it('should update boolean property', () => {
            const result = editor.updateProperty('useNormalMap', false);
            expect(result.success).toBe(true);
        });
        it('should reject invalid property name', () => {
            const result = editor.updateProperty('invalidProperty', 'value');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
        it('should reject value out of range', () => {
            const result = editor.updateProperty('metallic', 1.5); // Max is 1
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
        it('should validate type constraints', () => {
            const result = editor.updateProperty('metallic', 'not a number');
            expect(result.success).toBe(false);
        });
        it('should handle rapid property updates', () => {
            performanceMeasure.start('rapidUpdates');
            for (let i = 0; i < 100; i++) {
                editor.updateProperty('metallic', (i % 100) / 100);
            }
            const duration = performanceMeasure.end('rapidUpdates');
            expect(duration).toBeLessThan(500); // 100 updates in <500ms
        });
    });
    describe('Presets', () => {
        it('should apply gold preset', () => {
            editor.applyPreset('gold');
            const code = editor.generateCode();
            expect(code).toContain('@material');
        });
        it('should apply steel preset', () => {
            editor.applyPreset('steel');
            const code = editor.generateCode();
            expect(code).toContain('@material');
        });
        it('should apply studio preset', () => {
            editor.applyPreset('studio');
            const code = editor.generateCode();
            expect(code).toContain('@material');
        });
        it('should apply high-performance preset', () => {
            editor.applyPreset('high-performance');
            const code = editor.generateCode();
            expect(code).toContain('@material');
        });
        it('should change code when preset applied', () => {
            const initialCode = editor.generateCode();
            editor.applyPreset('gold');
            const presetCode = editor.generateCode();
            expect(presetCode).not.toEqual(initialCode);
        });
        it('should handle invalid preset gracefully', () => {
            expect(() => editor.applyPreset('invalid')).toThrow();
        });
    });
    describe('Undo/Redo', () => {
        it('should undo property change', () => {
            const initialCode = editor.generateCode();
            editor.updateProperty('metallic', 0.5);
            editor.undo();
            const undoneCode = editor.generateCode();
            expect(undoneCode).toEqual(initialCode);
        });
        it('should redo undone change', () => {
            const initialCode = editor.generateCode();
            editor.updateProperty('metallic', 0.5);
            const changedCode = editor.generateCode();
            editor.undo();
            editor.redo();
            const redoneCode = editor.generateCode();
            expect(redoneCode).toEqual(changedCode);
        });
        it('should maintain history limit', () => {
            // Make more than 50 changes
            for (let i = 0; i < 60; i++) {
                editor.updateProperty('metallic', (i % 100) / 100);
            }
            // Should be able to undo multiple times but not infinitely
            for (let i = 0; i < 60; i++) {
                editor.undo();
            }
            // After all undos, should reach the beginning
            expect(() => editor.undo()).not.toThrow();
        });
        it('should clear redo on new change after undo', () => {
            editor.updateProperty('metallic', 0.5);
            const state1 = editor.generateCode();
            editor.updateProperty('roughness', 0.8);
            const state2 = editor.generateCode();
            editor.undo(); // Back to state1
            editor.updateProperty('baseColor', '#ff0000');
            const state3 = editor.generateCode();
            editor.redo(); // Should not exist, redo history cleared
            const finalState = editor.generateCode();
            expect(finalState).toEqual(state3);
        });
    });
    describe('Event System', () => {
        it('should emit change event on property update', () => {
            const listener = vi.fn();
            editor.on('change', listener);
            editor.updateProperty('metallic', 0.5);
            expect(listener).toHaveBeenCalled();
        });
        it('should emit event with updated config', () => {
            const listener = vi.fn();
            editor.on('change', listener);
            editor.updateProperty('metallic', 0.5);
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                type: 'material',
            }));
        });
        it('should allow multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            editor.on('change', listener1);
            editor.on('change', listener2);
            editor.updateProperty('metallic', 0.5);
            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });
        it('should remove listener with off()', () => {
            const listener = vi.fn();
            editor.on('change', listener);
            editor.off('change', listener);
            editor.updateProperty('metallic', 0.5);
            expect(listener).not.toHaveBeenCalled();
        });
    });
    describe('Import/Export', () => {
        it('should export config as JSON string', () => {
            const exported = editor.exportConfig();
            expect(typeof exported).toBe('string');
            const parsed = JSON.parse(exported);
            expect(parsed.type).toEqual('material');
        });
        it('should import config from JSON string', () => {
            editor.updateProperty('metallic', 0.5);
            const exported = editor.exportConfig();
            const newEditor = new TraitAnnotationEditor(mockMaterialConfig);
            newEditor.importConfig(exported);
            const importedCode = newEditor.generateCode();
            const originalCode = editor.generateCode();
            expect(importedCode).toEqual(originalCode);
        });
        it('should preserve all properties on export/import', () => {
            editor.updateProperty('metallic', 0.3);
            editor.updateProperty('roughness', 0.7);
            editor.updateProperty('baseColor', '#ff0000');
            const exported = editor.exportConfig();
            const newEditor = new TraitAnnotationEditor(mockMaterialConfig);
            newEditor.importConfig(exported);
            expect(newEditor.generateCode()).toEqual(editor.generateCode());
        });
        it('should handle invalid import gracefully', () => {
            expect(() => editor.importConfig('invalid json')).toThrow();
        });
    });
    describe('Performance', () => {
        it('should handle 1000 property updates in <1 second', () => {
            performanceMeasure.start('largeUpdate');
            for (let i = 0; i < 1000; i++) {
                editor.updateProperty('metallic', Math.random());
            }
            const duration = performanceMeasure.end('largeUpdate');
            expect(duration).toBeLessThan(1000);
        });
        it('should generate code consistently fast', () => {
            const durations = [];
            for (let i = 0; i < 100; i++) {
                performanceMeasure.start('gen');
                editor.generateCode();
                durations.push(performanceMeasure.end('gen'));
            }
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            const maxDuration = Math.max(...durations);
            expect(avgDuration).toBeLessThan(5); // Average <5ms
            expect(maxDuration).toBeLessThan(20); // Max <20ms
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty config gracefully', () => {
            const minimalConfig = {
                type: 'material',
                properties: {},
                isDirty: false,
            };
            const minimalEditor = new TraitAnnotationEditor(minimalConfig);
            expect(minimalEditor.generateCode()).toContain('@material');
        });
        it('should handle special characters in property values', () => {
            const result = editor.updateProperty('baseColor', '#ffffff');
            expect(result.success).toBe(true);
        });
        it('should maintain state consistency after errors', () => {
            const initialCode = editor.generateCode();
            // Try invalid update
            editor.updateProperty('invalidProp', 'value');
            // Should still be able to generate valid code
            const finalCode = editor.generateCode();
            expect(finalCode).toEqual(initialCode);
        });
    });
});
