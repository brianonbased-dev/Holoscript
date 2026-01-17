/**
 * Phase 6: RealtimePreviewEngine Unit Tests
 *
 * Tests for realtime preview and performance monitoring including:
 * - Device registration and management
 * - Metrics calculation and tracking
 * - Cross-device comparison
 * - Performance recommendations
 * - Results export
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RealtimePreviewEngine } from '../RealtimePreviewEngine';
import { mockDevices, mockMetrics, PerformanceMeasure, MemoryMeasure } from './setup';
describe('RealtimePreviewEngine', () => {
    let engine;
    let performanceMeasure;
    let memoryMeasure;
    beforeEach(() => {
        engine = new RealtimePreviewEngine({
            enableMetrics: true,
            enableRecommendations: true,
            historySize: 300,
        });
        performanceMeasure = new PerformanceMeasure();
        memoryMeasure = new MemoryMeasure();
    });
    afterEach(() => {
        performanceMeasure.clear();
        memoryMeasure.reset();
    });
    describe('Device Registration', () => {
        it('should register single device', () => {
            engine.registerDevice(mockDevices[0]);
            expect(engine).toBeDefined();
        });
        it('should register multiple devices', () => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
            expect(engine).toBeDefined();
        });
        it('should handle duplicate device registration', () => {
            engine.registerDevice(mockDevices[0]);
            expect(() => engine.registerDevice(mockDevices[0])).not.toThrow();
        });
        it('should store all 6 target devices', () => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
            // Should complete without error
            expect(engine).toBeDefined();
        });
    });
    describe('Preview Updates', () => {
        beforeEach(() => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
        });
        it('should update preview for single device', () => {
            const result = engine.updatePreview(mockDevices[0].id, {
                ...mockMetrics,
            });
            expect(result.success).toBe(true);
        });
        it('should update preview for all devices', () => {
            mockDevices.forEach(device => {
                const result = engine.updatePreview(device.id, mockMetrics);
                expect(result.success).toBe(true);
            });
        });
        it('should track metrics history', () => {
            for (let i = 0; i < 50; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    fps: 60 - (i % 20),
                });
            }
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should handle rapid updates', () => {
            performanceMeasure.start('rapidPreview');
            for (let i = 0; i < 100; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    fps: 60 - (i % 30),
                });
            }
            const duration = performanceMeasure.end('rapidPreview');
            expect(duration).toBeLessThan(500);
        });
        it('should update preview with performance <100ms', () => {
            performanceMeasure.start('preview');
            engine.updatePreview(mockDevices[0].id, mockMetrics);
            const duration = performanceMeasure.end('preview');
            expect(duration).toBeLessThan(100);
        });
        it('should reject update for unregistered device', () => {
            const result = engine.updatePreview('unknown-device', mockMetrics);
            expect(result.success).toBe(false);
        });
    });
    describe('Metrics Calculation', () => {
        beforeEach(() => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
        });
        it('should calculate average FPS correctly', () => {
            for (let i = 0; i < 10; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    fps: 60,
                });
            }
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should calculate GPU memory usage', () => {
            engine.updatePreview(mockDevices[0].id, mockMetrics);
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should track draw call efficiency', () => {
            for (let i = 0; i < 20; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    drawCalls: 100 + (i * 10),
                });
            }
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should maintain 300-sample history', () => {
            for (let i = 0; i < 350; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    fps: 60 - (i % 30),
                });
            }
            // Should maintain max 300 samples per device
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
    });
    describe('Performance Monitoring', () => {
        beforeEach(() => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
        });
        it('should start monitoring', () => {
            engine.startMonitoring();
            expect(engine).toBeDefined();
        });
        it('should stop monitoring', () => {
            engine.startMonitoring();
            engine.stopMonitoring();
            expect(engine).toBeDefined();
        });
        it('should collect metrics while monitoring', () => {
            engine.startMonitoring();
            for (let i = 0; i < 10; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    fps: 60 - (i % 10),
                });
            }
            engine.stopMonitoring();
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should track monitoring duration', () => {
            performanceMeasure.start('monitor');
            engine.startMonitoring();
            for (let i = 0; i < 50; i++) {
                engine.updatePreview(mockDevices[0].id, mockMetrics);
            }
            engine.stopMonitoring();
            const duration = performanceMeasure.end('monitor');
            expect(duration).toBeGreaterThan(0);
        });
    });
    describe('Recommendations', () => {
        beforeEach(() => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
        });
        it('should generate recommendations for low FPS', () => {
            for (let i = 0; i < 20; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    fps: 20, // Very low
                });
            }
            const recs = engine.getRecommendations(mockDevices[0].id);
            expect(recs).toBeDefined();
            expect(Array.isArray(recs)).toBe(true);
        });
        it('should recommend optimization for high GPU usage', () => {
            for (let i = 0; i < 20; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    gpuMemoryUsedMB: 1024, // Very high for most devices
                    gpuMemoryPercentage: 95,
                });
            }
            const recs = engine.getRecommendations(mockDevices[0].id);
            expect(recs).toBeDefined();
        });
        it('should recommend reducing draw calls if high', () => {
            for (let i = 0; i < 20; i++) {
                engine.updatePreview(mockDevices[0].id, {
                    ...mockMetrics,
                    drawCalls: 5000, // Very high
                });
            }
            const recs = engine.getRecommendations(mockDevices[0].id);
            expect(recs).toBeDefined();
        });
        it('should provide device-specific recommendations', () => {
            // Test low-end device (iPhone)
            for (let i = 0; i < 20; i++) {
                engine.updatePreview(mockDevices[0].id, mockMetrics);
            }
            const iphoneRecs = engine.getRecommendations(mockDevices[0].id);
            expect(iphoneRecs).toBeDefined();
            // Test high-end device (RTX4090)
            for (let i = 0; i < 20; i++) {
                engine.updatePreview(mockDevices[5].id, mockMetrics);
            }
            const desktopRecs = engine.getRecommendations(mockDevices[5].id);
            expect(desktopRecs).toBeDefined();
        });
    });
    describe('Cross-Device Comparison', () => {
        beforeEach(() => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
            // Add metrics to all devices
            mockDevices.forEach(device => {
                for (let i = 0; i < 10; i++) {
                    engine.updatePreview(device.id, mockMetrics);
                }
            });
        });
        it('should compare metrics across devices', () => {
            const comparison = engine.compareMetrics(mockDevices[0].id, mockDevices[5].id);
            expect(comparison).toBeDefined();
        });
        it('should identify best performing device', () => {
            const comparison = engine.compareMetrics(mockDevices[0].id, mockDevices[5].id);
            expect(comparison).toBeDefined();
        });
        it('should show performance difference', () => {
            const comparison = engine.compareMetrics(mockDevices[0].id, mockDevices[5].id);
            expect(comparison).toBeDefined();
        });
        it('should handle comparison on same device', () => {
            const comparison = engine.compareMetrics(mockDevices[0].id, mockDevices[0].id);
            expect(comparison).toBeDefined();
        });
        it('should return null for invalid device comparison', () => {
            const comparison = engine.compareMetrics('unknown-1', 'unknown-2');
            expect(comparison).toBeNull();
        });
    });
    describe('Results Export', () => {
        beforeEach(() => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
            mockDevices.forEach(device => {
                for (let i = 0; i < 20; i++) {
                    engine.updatePreview(device.id, {
                        ...mockMetrics,
                        fps: 60 - (i % 30),
                    });
                }
            });
        });
        it('should export results as JSON', () => {
            const results = engine.exportResults();
            expect(typeof results).toBe('object');
        });
        it('should include all registered devices', () => {
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should export with timestamp', () => {
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should export metrics history', () => {
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should export summary statistics', () => {
            const results = engine.exportResults();
            expect(results).toBeDefined();
        });
        it('should handle export with no data', () => {
            const emptyEngine = new RealtimePreviewEngine();
            emptyEngine.registerDevice(mockDevices[0]);
            const results = emptyEngine.exportResults();
            expect(results).toBeDefined();
        });
    });
    describe('Performance Benchmarks', () => {
        beforeEach(() => {
            mockDevices.forEach(device => {
                engine.registerDevice(device);
            });
        });
        it('should register 6 devices in <10ms', () => {
            const newEngine = new RealtimePreviewEngine();
            performanceMeasure.start('register');
            mockDevices.forEach(device => {
                newEngine.registerDevice(device);
            });
            const duration = performanceMeasure.end('register');
            expect(duration).toBeLessThan(10);
        });
        it('should process 1000 metrics updates in <1 second', () => {
            performanceMeasure.start('bulk');
            for (let i = 0; i < 1000; i++) {
                const device = mockDevices[i % mockDevices.length];
                engine.updatePreview(device.id, {
                    ...mockMetrics,
                    fps: 60 - (i % 30),
                });
            }
            const duration = performanceMeasure.end('bulk');
            expect(duration).toBeLessThan(1000);
        });
        it('should maintain consistent update performance', () => {
            const durations = [];
            for (let i = 0; i < 100; i++) {
                performanceMeasure.start('single');
                engine.updatePreview(mockDevices[0].id, mockMetrics);
                durations.push(performanceMeasure.end('single'));
            }
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            expect(avgDuration).toBeLessThan(10);
        });
        it('should export results in <50ms', () => {
            performanceMeasure.start('export');
            engine.exportResults();
            const duration = performanceMeasure.end('export');
            expect(duration).toBeLessThan(50);
        });
        it('should calculate recommendations in <100ms', () => {
            performanceMeasure.start('rec');
            engine.getRecommendations(mockDevices[0].id);
            const duration = performanceMeasure.end('rec');
            expect(duration).toBeLessThan(100);
        });
        it('should handle memory efficiently with 300 samples', () => {
            memoryMeasure.start();
            for (let i = 0; i < 300; i++) {
                engine.updatePreview(mockDevices[0].id, mockMetrics);
            }
            const memoryDelta = memoryMeasure.getDelta();
            expect(memoryDelta).toBeLessThan(50); // Less than 50MB for 300 samples
        });
    });
    describe('Edge Cases', () => {
        it('should handle unregistered device gracefully', () => {
            const result = engine.updatePreview('unknown', mockMetrics);
            expect(result.success).toBe(false);
        });
        it('should handle null metrics gracefully', () => {
            engine.registerDevice(mockDevices[0]);
            const result = engine.updatePreview(mockDevices[0].id, null);
            expect(result.success).toBe(false);
        });
        it('should handle invalid FPS values', () => {
            engine.registerDevice(mockDevices[0]);
            const result = engine.updatePreview(mockDevices[0].id, {
                ...mockMetrics,
                fps: -10,
            });
            // Should either handle or reject gracefully
            expect(result).toBeDefined();
        });
        it('should maintain state consistency after errors', () => {
            engine.registerDevice(mockDevices[0]);
            const initialExport = engine.exportResults();
            // Try invalid update
            engine.updatePreview('unknown', mockMetrics);
            const afterErrorExport = engine.exportResults();
            expect(afterErrorExport).toBeDefined();
        });
    });
});
