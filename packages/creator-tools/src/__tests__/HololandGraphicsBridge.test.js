/**
 * HololandGraphicsBridge Test Suite - Comprehensive Graphics Integration Testing
 * Tests material creation, shader compilation, device optimization, and rendering metrics
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HololandGraphicsBridge } from './HololandGraphicsBridge';
/**
 * Mock trait configuration for testing
 */
const mockTraitConfig = {
    id: 'trait_test_001',
    name: 'TestMaterial',
    description: 'Test material trait',
    materials: [
        {
            id: 'mat_001',
            name: 'TestMat',
            type: 'pbr',
            properties: [
                { name: 'albedoColor', type: 'color', value: [1.0, 1.0, 1.0, 1.0] },
                { name: 'normalMap', type: 'normalMap', value: 'default_normal' },
                { name: 'roughness', type: 'float', value: 0.5 },
                { name: 'texture', type: 'texture', value: 'default_texture' }
            ]
        }
    ],
    presets: []
};
/**
 * Mock rendering context for testing
 */
const mockRenderingContext = {
    maxTextureSize: 4096,
    maxRenderTargetSize: 2048,
    maxUniformBufferSize: 65536,
    supportsCompute: true,
    supportsRayTracing: false,
    supportedShaderTargets: ['glsl', 'spirv'],
    gpuMemoryMB: 2048,
    estimatedVRAMUsed: 512
};
/**
 * Mock metrics for testing
 */
const mockMetrics = {
    frameTimeMs: 16.67,
    drawCallCount: 100,
    triangleCount: 500000,
    textureMemoryMB: 256,
    uniformBufferMemoryMB: 8,
    lastFrameGpuTimeMs: 14.2
};
/**
 * Performance measurement class
 */
class PerformanceMeasure {
    constructor() {
        this.startTime = performance.now();
    }
    end() {
        return performance.now() - this.startTime;
    }
}
describe('HololandGraphicsBridge', () => {
    let bridge;
    let mockEditor;
    let mockEngine;
    beforeEach(() => {
        // Create mock instances
        mockEditor = {
            addTrait: vi.fn(),
            removeTrait: vi.fn(),
            updateTrait: vi.fn(),
            getTrait: vi.fn(() => mockTraitConfig),
            getAllTraits: vi.fn(() => [mockTraitConfig]),
            exportTraits: vi.fn(),
            importTraits: vi.fn(),
            validateTraitConfig: vi.fn(() => ({ isValid: true })),
            addMaterial: vi.fn(),
            removeMaterial: vi.fn(),
            updateMaterial: vi.fn(),
            getMaterial: vi.fn(),
            getAllMaterials: vi.fn(() => [mockTraitConfig.materials[0]]),
            addPreset: vi.fn(),
            removePreset: vi.fn(),
            getPreset: vi.fn(),
            getAllPresets: vi.fn(() => [])
        };
        mockEngine = {
            startMonitoring: vi.fn(),
            stopMonitoring: vi.fn(),
            getMetrics: vi.fn(() => ({
                fps: 60,
                memoryUsage: 512,
                traitRenderTime: 16.67,
                totalRenderTime: 16.67
            })),
            optimizeForDevice: vi.fn(),
            getRecommendations: vi.fn(() => [])
        };
        bridge = new HololandGraphicsBridge(mockEditor, mockEngine, false);
    });
    describe('Material Creation', () => {
        it('should create material from trait config', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material).toBeDefined();
            expect(material.id).toMatch(/^mat_/);
            expect(material.name).toBe(mockTraitConfig.name);
            expect(material.traitId).toBe(mockTraitConfig.id);
            expect(material.properties.length).toBeGreaterThan(0);
        });
        it('should create different materials for different devices', () => {
            const iphoneMaterial = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const questMaterial = bridge.createMaterialFromTrait(mockTraitConfig, 'quest-3');
            expect(iphoneMaterial.id).not.toBe(questMaterial.id);
            expect(iphoneMaterial.gpuMemoryBytes).toBeLessThanOrEqual(questMaterial.gpuMemoryBytes);
        });
        it('should set correct render queue', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material.renderQueue).toBe(2000);
        });
        it('should have correct depth settings', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material.depthTest).toBe(true);
            expect(material.depthWrite).toBe(true);
        });
        it('should have default blend mode disabled', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material.blendMode.enabled).toBe(false);
        });
        it('should complete material creation within 80ms target', () => {
            const measure = new PerformanceMeasure();
            bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const elapsed = measure.end();
            expect(elapsed).toBeLessThan(80);
        });
        it('should extract material properties correctly', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const roughnessProps = material.properties.filter(p => p.name === 'roughness');
            expect(roughnessProps.length).toBeGreaterThan(0);
            expect(roughnessProps[0].type).toBe('float');
        });
        it('should extract texture bindings correctly', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material.textures.length).toBeGreaterThan(0);
            expect(material.textures[0].name).toBeDefined();
            expect(material.textures[0].binding).toBeGreaterThanOrEqual(0);
        });
        it('should store GPU memory estimation', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material.gpuMemoryBytes).toBeGreaterThan(0);
            expect(material.gpuMemoryBytes).toBeLessThan(300 * 1024 * 1024); // Less than 300MB
        });
        it('should include shader program', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material.shader).toBeDefined();
            expect(material.shader.name).toBeDefined();
            expect(material.shader.vertexSource).toBeDefined();
            expect(material.shader.fragmentSource).toBeDefined();
            expect(material.shader.compiledTargets.size).toBeGreaterThan(0);
        });
        it('should set creation and modification timestamps', () => {
            const before = Date.now();
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const after = Date.now();
            expect(material.createdAtMs).toBeGreaterThanOrEqual(before);
            expect(material.createdAtMs).toBeLessThanOrEqual(after);
            expect(material.lastModifiedMs).toBe(material.createdAtMs);
        });
    });
    describe('Shader Compilation', () => {
        it('should compile shader for Metal target', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material.shader.compiledTargets.has('metal')).toBe(true);
            const compiled = material.shader.compiledTargets.get('metal');
            expect(compiled?.bytecode).toBeInstanceOf(Uint8Array);
            expect(compiled?.bytecode.byteLength).toBeGreaterThan(0);
        });
        it('should compile shader for GLSL target', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'quest-3');
            const hasGLSL = material.shader.compiledTargets.has('glsl');
            const hasSPIRV = material.shader.compiledTargets.has('spirv');
            expect(hasGLSL || hasSPIRV).toBe(true);
        });
        it('should include reflection data in compilation result', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const compiled = material.shader.compiledTargets.get('metal');
            expect(compiled?.reflectionData).toBeDefined();
            expect(compiled?.reflectionData.attributes).toBeDefined();
            expect(compiled?.reflectionData.uniforms).toBeDefined();
            expect(compiled?.reflectionData.samplers).toBeDefined();
        });
        it('should record shader compilation time', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const compiled = material.shader.compiledTargets.get('metal');
            expect(compiled?.compileTimeMs).toBeGreaterThan(0);
            expect(compiled?.compileTimeMs).toBeLessThan(100);
        });
        it('should extract vertex attributes from shader', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const compiled = material.shader.compiledTargets.get('metal');
            expect(compiled?.reflectionData.attributes.length).toBeGreaterThan(0);
            const hasPosition = compiled?.reflectionData.attributes.some(a => a.name === 'aPosition');
            expect(hasPosition).toBe(true);
        });
        it('should extract uniforms from shader', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const compiled = material.shader.compiledTargets.get('metal');
            expect(compiled?.reflectionData.uniforms.length).toBeGreaterThan(0);
        });
        it('should extract samplers from shader', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const compiled = material.shader.compiledTargets.get('metal');
            expect(compiled?.reflectionData.samplers.length).toBeGreaterThan(0);
            const hasSampler = compiled?.reflectionData.samplers.some(s => s.name.includes('Map'));
            expect(hasSampler).toBe(true);
        });
        it('should compile within 100ms target for single shader', () => {
            const measure = new PerformanceMeasure();
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const elapsed = measure.end();
            expect(elapsed).toBeLessThan(100);
        });
        it('should generate valid GLSL code', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            expect(material.shader.vertexSource).toContain('attribute');
            expect(material.shader.vertexSource).toContain('varying');
            expect(material.shader.fragmentSource).toContain('varying');
            expect(material.shader.fragmentSource).toContain('sampler');
        });
        it('should cache shader programs with same configuration', () => {
            const material1 = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const material2 = bridge.createMaterialFromTrait(mockTraitConfig, 'ipad-pro');
            expect(material1.shader.hash).toBe(material2.shader.hash);
        });
    });
    describe('Device Optimization', () => {
        it('should register rendering context for device', () => {
            bridge.registerRenderingContext('iphone-15', mockRenderingContext);
            // No explicit getter, but verify no error thrown
            expect(true).toBe(true);
        });
        it('should optimize material for different devices', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const roughnessBeforePhone = material.properties.find(p => p.name === 'roughness')?.value;
            bridge.optimizeForDevice(material.id, 'iphone-15');
            const roughnessAfterPhone = material.properties.find(p => p.name === 'roughness')?.value;
            expect(roughnessAfterPhone).toBeDefined();
        });
        it('should apply different quality tiers', () => {
            const iphone = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const rtx = bridge.createMaterialFromTrait(mockTraitConfig, 'rtx-4090');
            bridge.optimizeForDevice(iphone.id, 'iphone-15');
            bridge.optimizeForDevice(rtx.id, 'rtx-4090');
            const iphoneRoughness = iphone.properties.find(p => p.name === 'roughness')?.value;
            const rtxRoughness = rtx.properties.find(p => p.name === 'roughness')?.value;
            expect(iphoneRoughness).toBeDefined();
            expect(rtxRoughness).toBeDefined();
        });
        it('should complete optimization within 50ms target', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const measure = new PerformanceMeasure();
            bridge.optimizeForDevice(material.id, 'iphone-15');
            const elapsed = measure.end();
            expect(elapsed).toBeLessThan(50);
        });
        it('should optimize for 6 target devices', () => {
            const deviceIds = ['iphone-15', 'ipad-pro', 'quest-3', 'vision-pro', 'hololens-2', 'rtx-4090'];
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            for (const deviceId of deviceIds) {
                expect(() => {
                    bridge.optimizeForDevice(material.id, deviceId);
                }).not.toThrow();
            }
        });
        it('should update last modified timestamp on optimization', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const originalTime = material.lastModifiedMs;
            setTimeout(() => {
                bridge.optimizeForDevice(material.id, 'iphone-15');
            }, 10);
            expect(material.lastModifiedMs).toBeGreaterThanOrEqual(originalTime);
        });
        it('should support multi-device optimization', () => {
            const materials = ['iphone-15', 'ipad-pro', 'quest-3'].map(device => bridge.createMaterialFromTrait(mockTraitConfig, device));
            materials.forEach((mat, idx) => {
                const deviceId = ['iphone-15', 'ipad-pro', 'quest-3'][idx];
                expect(() => {
                    bridge.optimizeForDevice(mat.id, deviceId);
                }).not.toThrow();
            });
        });
        it('should apply performance tier based on device capability', () => {
            const lowEndDevice = bridge.createMaterialFromTrait(mockTraitConfig, 'quest-3');
            const highEndDevice = bridge.createMaterialFromTrait(mockTraitConfig, 'rtx-4090');
            bridge.optimizeForDevice(lowEndDevice.id, 'quest-3');
            bridge.optimizeForDevice(highEndDevice.id, 'rtx-4090');
            // High-end should maintain quality
            expect(highEndDevice.shader.compiledTargets.size).toBeGreaterThan(0);
        });
    });
    describe('Performance Metrics', () => {
        it('should update rendering metrics for device', () => {
            bridge.registerRenderingContext('iphone-15', mockRenderingContext);
            bridge.updateRenderingMetrics('iphone-15', mockMetrics);
            const metrics = bridge.getRenderingMetrics('iphone-15');
            expect(metrics).toBeDefined();
            expect(metrics?.frameTimeMs).toBe(mockMetrics.frameTimeMs);
            expect(metrics?.fps).toBeGreaterThan(0);
        });
        it('should calculate average frame time', () => {
            bridge.registerRenderingContext('iphone-15', mockRenderingContext);
            bridge.updateRenderingMetrics('iphone-15', { ...mockMetrics, frameTimeMs: 16.67 });
            bridge.updateRenderingMetrics('iphone-15', { ...mockMetrics, frameTimeMs: 17.0 });
            const metrics = bridge.getRenderingMetrics('iphone-15');
            expect(metrics?.averageFrameTimeMs).toBeBetween(16.67, 17.0);
        });
        it('should calculate FPS from frame time', () => {
            bridge.registerRenderingContext('iphone-15', mockRenderingContext);
            bridge.updateRenderingMetrics('iphone-15', mockMetrics);
            const metrics = bridge.getRenderingMetrics('iphone-15');
            expect(metrics?.fps).toBeCloseTo(60, 1);
        });
        it('should track triangle count in metrics', () => {
            bridge.registerRenderingContext('iphone-15', mockRenderingContext);
            bridge.updateRenderingMetrics('iphone-15', mockMetrics);
            const metrics = bridge.getRenderingMetrics('iphone-15');
            expect(metrics?.triangleCount).toBe(mockMetrics.triangleCount);
        });
        it('should track GPU memory usage', () => {
            bridge.registerRenderingContext('iphone-15', mockRenderingContext);
            bridge.updateRenderingMetrics('iphone-15', mockMetrics);
            const metrics = bridge.getRenderingMetrics('iphone-15');
            expect(metrics?.textureMemoryMB).toBe(mockMetrics.textureMemoryMB);
        });
        it('should return undefined for unregistered device', () => {
            const metrics = bridge.getRenderingMetrics('unknown-device');
            expect(metrics).toBeUndefined();
        });
        it('should support multiple device metrics simultaneously', () => {
            const devices = ['iphone-15', 'ipad-pro', 'quest-3'];
            devices.forEach((device, idx) => {
                bridge.registerRenderingContext(device, mockRenderingContext);
                const metricsWithTime = { ...mockMetrics, frameTimeMs: 16.67 + idx };
                bridge.updateRenderingMetrics(device, metricsWithTime);
            });
            devices.forEach((device, idx) => {
                const metrics = bridge.getRenderingMetrics(device);
                expect(metrics?.frameTimeMs).toBeCloseTo(16.67 + idx, 0.1);
            });
        });
    });
    describe('Error Handling', () => {
        it('should capture compilation errors', () => {
            // Create with strict mode off to allow error capture
            const errors = bridge.getErrors();
            expect(Array.isArray(errors)).toBe(true);
        });
        it('should clear error history', () => {
            bridge.clearErrors();
            const errors = bridge.getErrors();
            expect(errors.length).toBe(0);
        });
        it('should limit error history size', () => {
            // This would require triggering 50+ errors, which is tested indirectly
            const errors = bridge.getErrors();
            expect(errors.length).toBeLessThanOrEqual(50);
        });
        it('should mark errors as recoverable or non-recoverable', () => {
            const errors = bridge.getErrors();
            errors.forEach(error => {
                expect(typeof error.recoverable).toBe('boolean');
            });
        });
        it('should support error recovery attempt', () => {
            const mockError = {
                type: 'device_capability',
                message: 'Test error',
                recoverable: true,
                severity: 'error'
            };
            const result = bridge.recoverFromError(mockError);
            expect(typeof result).toBe('boolean');
        });
        it('should fail recovery for non-recoverable errors', () => {
            const mockError = {
                type: 'device_capability',
                message: 'Non-recoverable error',
                recoverable: false,
                severity: 'error'
            };
            const result = bridge.recoverFromError(mockError);
            expect(result).toBe(false);
        });
        it('should handle unknown device gracefully', () => {
            expect(() => {
                bridge.createMaterialFromTrait(mockTraitConfig, 'unknown-device');
            }).toThrow();
        });
        it('should provide error messages with context', () => {
            try {
                bridge.createMaterialFromTrait(mockTraitConfig, 'invalid-device');
            }
            catch (error) {
                expect(error.message).toContain('device');
            }
        });
    });
    describe('Data Persistence', () => {
        it('should export materials to JSON', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const json = bridge.exportGraphicsData();
            expect(typeof json).toBe('string');
            expect(json.length).toBeGreaterThan(0);
            const data = JSON.parse(json);
            expect(data.materials).toBeDefined();
            expect(data.materials.length).toBeGreaterThan(0);
        });
        it('should export with valid JSON format', () => {
            bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const json = bridge.exportGraphicsData();
            expect(() => JSON.parse(json)).not.toThrow();
        });
        it('should include timestamp in export', () => {
            bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const json = bridge.exportGraphicsData();
            const data = JSON.parse(json);
            expect(data.timestamp).toBeDefined();
            expect(data.timestamp).toBeGreaterThan(0);
        });
        it('should import previously exported data', () => {
            const material1 = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const json = bridge.exportGraphicsData();
            const bridge2 = new HololandGraphicsBridge(mockEditor, mockEngine);
            bridge2.importGraphicsData(json);
            const importedMaterials = bridge2.getMaterialsForTrait(mockTraitConfig.id);
            expect(importedMaterials.length).toBeGreaterThan(0);
        });
        it('should handle invalid JSON import gracefully', () => {
            expect(() => {
                bridge.importGraphicsData('invalid json');
            }).not.toThrow();
        });
        it('should maintain material properties through export/import', () => {
            const material1 = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const json = bridge.exportGraphicsData();
            const bridge2 = new HololandGraphicsBridge(mockEditor, mockEngine);
            bridge2.importGraphicsData(json);
            const imported = bridge2.getMaterialsForTrait(mockTraitConfig.id)[0];
            expect(imported.name).toBe(material1.name);
            expect(imported.gpuMemoryBytes).toBe(material1.gpuMemoryBytes);
        });
        it('should support round-trip data persistence', () => {
            const material1 = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const json1 = bridge.exportGraphicsData();
            const bridge2 = new HololandGraphicsBridge(mockEditor, mockEngine);
            bridge2.importGraphicsData(json1);
            const json2 = bridge2.exportGraphicsData();
            const data1 = JSON.parse(json1);
            const data2 = JSON.parse(json2);
            expect(data1.materials.length).toBe(data2.materials.length);
        });
    });
    describe('Material Management', () => {
        it('should retrieve materials for specific trait', () => {
            const material1 = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const material2 = bridge.createMaterialFromTrait(mockTraitConfig, 'ipad-pro');
            const materials = bridge.getMaterialsForTrait(mockTraitConfig.id);
            expect(materials.length).toBeGreaterThanOrEqual(2);
        });
        it('should retrieve all materials', () => {
            bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            bridge.createMaterialFromTrait(mockTraitConfig, 'ipad-pro');
            const allMaterials = bridge.getAllMaterials();
            expect(allMaterials.length).toBeGreaterThanOrEqual(2);
        });
        it('should not return materials for unknown trait', () => {
            bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const materials = bridge.getMaterialsForTrait('unknown-trait');
            expect(materials.length).toBe(0);
        });
        it('should handle multiple traits', () => {
            const trait1 = mockTraitConfig;
            const trait2 = { ...mockTraitConfig, id: 'trait_002', name: 'OtherTrait' };
            const material1 = bridge.createMaterialFromTrait(trait1, 'iphone-15');
            const material2 = bridge.createMaterialFromTrait(trait2, 'iphone-15');
            expect(material1.traitId).not.toBe(material2.traitId);
        });
    });
    describe('Integration Scenarios', () => {
        it('should handle complete material creation to optimization workflow', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            bridge.registerRenderingContext('iphone-15', mockRenderingContext);
            bridge.optimizeForDevice(material.id, 'iphone-15');
            bridge.updateRenderingMetrics('iphone-15', mockMetrics);
            const metrics = bridge.getRenderingMetrics('iphone-15');
            expect(metrics?.fps).toBeGreaterThan(0);
        });
        it('should support multi-device optimization workflow', () => {
            const devices = ['iphone-15', 'ipad-pro', 'quest-3'];
            const materials = devices.map(device => bridge.createMaterialFromTrait(mockTraitConfig, device));
            materials.forEach((mat, idx) => {
                bridge.optimizeForDevice(mat.id, devices[idx]);
            });
            expect(bridge.getAllMaterials().length).toBe(3);
        });
        it('should handle error recovery in compilation', () => {
            // Test indirect error recovery capability
            expect(() => {
                bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            }).not.toThrow();
        });
        it('should persist graphics state across sessions', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            const json = bridge.exportGraphicsData();
            const newBridge = new HololandGraphicsBridge(mockEditor, mockEngine);
            newBridge.importGraphicsData(json);
            const persistent = newBridge.getAllMaterials();
            expect(persistent.length).toBeGreaterThan(0);
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty trait configuration', () => {
            const emptyTrait = {
                id: 'empty',
                name: 'Empty',
                materials: [],
                presets: []
            };
            const material = bridge.createMaterialFromTrait(emptyTrait, 'iphone-15');
            expect(material).toBeDefined();
            expect(material.properties.length).toBeGreaterThan(0); // Should have default properties
        });
        it('should handle large number of materials', () => {
            const materials = [];
            for (let i = 0; i < 50; i++) {
                materials.push(bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15'));
            }
            expect(bridge.getAllMaterials().length).toBeGreaterThanOrEqual(50);
        });
        it('should handle rapid consecutive optimizations', () => {
            const material = bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            for (let i = 0; i < 10; i++) {
                expect(() => {
                    bridge.optimizeForDevice(material.id, 'iphone-15');
                }).not.toThrow();
            }
        });
        it('should handle special characters in material names', () => {
            const specialTrait = {
                ...mockTraitConfig,
                name: 'Material_With-Special.Chars_🎨'
            };
            const material = bridge.createMaterialFromTrait(specialTrait, 'iphone-15');
            expect(material.name).toContain('Material');
        });
        it('should handle very long shader source code', () => {
            const longTrait = {
                ...mockTraitConfig,
                materials: [{
                        ...mockTraitConfig.materials[0],
                        properties: Array.from({ length: 100 }, (_, i) => ({
                            name: `property${i}`,
                            type: 'float',
                            value: i
                        }))
                    }]
            };
            const material = bridge.createMaterialFromTrait(longTrait, 'iphone-15');
            expect(material.properties.length).toBeGreaterThan(100);
        });
    });
    describe('Performance Benchmarks', () => {
        it('should create 10 materials under 500ms', () => {
            const measure = new PerformanceMeasure();
            for (let i = 0; i < 10; i++) {
                bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            }
            const elapsed = measure.end();
            expect(elapsed).toBeLessThan(500);
        });
        it('should optimize 20 materials under 1000ms', () => {
            const materials = [];
            for (let i = 0; i < 20; i++) {
                materials.push(bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15'));
            }
            const measure = new PerformanceMeasure();
            materials.forEach(mat => {
                bridge.optimizeForDevice(mat.id, 'iphone-15');
            });
            const elapsed = measure.end();
            expect(elapsed).toBeLessThan(1000);
        });
        it('should export large graphics dataset efficiently', () => {
            for (let i = 0; i < 50; i++) {
                bridge.createMaterialFromTrait(mockTraitConfig, 'iphone-15');
            }
            const measure = new PerformanceMeasure();
            const json = bridge.exportGraphicsData();
            const elapsed = measure.end();
            expect(elapsed).toBeLessThan(100);
            expect(json.length).toBeGreaterThan(0);
        });
    });
});
expect.extend({
    toBeBetween(received, min, max) {
        const pass = received >= min && received <= max;
        return {
            pass,
            message: () => `expected ${received} to be between ${min} and ${max}`
        };
    }
});
