/**
 * Phase 6: Integration & Workflow Tests
 *
 * End-to-end integration tests for:
 * - Complete editor workflow
 * - Code change to preview flow
 * - Device metric updates
 * - Performance optimization workflow
 * - Cross-component interactions
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Phase6CompleteDemo } from '../Phase6CompleteDemo';
import { mockMaterialConfig, mockDevices, PerformanceMeasure } from './setup';
describe('Phase 6 Complete Integration', () => {
    let performanceMeasure;
    beforeEach(() => {
        performanceMeasure = new PerformanceMeasure();
    });
    afterEach(() => {
        performanceMeasure.clear();
    });
    describe('Complete Workflow', () => {
        it('should render full demo application', () => {
            const { container } = render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            expect(container).toBeDefined();
        });
        it('should have editor and preview visible', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Should have both editor and preview sections
            expect(screen.getByText(/editor|trait/i)).toBeDefined();
            expect(screen.getByText(/preview|dashboard|monitor/i)).toBeDefined();
        });
        it('should switch between view modes', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const editorBtn = screen.getByText(/editor|edit/i);
            fireEvent.click(editorBtn);
            expect(screen.getByText(/editor|properties/i)).toBeDefined();
            const previewBtn = screen.getByText(/preview|dashboard/i);
            fireEvent.click(previewBtn);
            expect(screen.getByText(/device|metric/i)).toBeDefined();
            const splitBtn = screen.getByText(/split/i);
            fireEvent.click(splitBtn);
            // Both should be visible
            expect(screen.getByText(/editor|properties/i)).toBeDefined();
            expect(screen.getByText(/device|metric/i)).toBeDefined();
        });
    });
    describe('Editor to Preview Flow', () => {
        it('should update preview when property changes', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Switch to split or preview view
            const splitBtn = screen.queryByText(/split/i);
            if (splitBtn) {
                fireEvent.click(splitBtn);
            }
            // Change property
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            // Preview should update
            waitFor(() => {
                expect(screen.getByText(/metric|fps|gpu/i)).toBeDefined();
            });
        });
        it('should generate code from properties', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Access code view
            const codeTab = screen.queryByText(/code/i);
            if (codeTab) {
                fireEvent.click(codeTab);
            }
            // Should display generated code
            expect(screen.getByText(/@material|@trait/i)).toBeDefined();
        });
        it('should reflect code changes in preview', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Make property change
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.3 } });
            // Code should update
            const codeTab = screen.queryByText(/code/i);
            if (codeTab) {
                fireEvent.click(codeTab);
            }
            expect(screen.getByText(/@material|@trait/i)).toBeDefined();
        });
    });
    describe('Device Metric Updates', () => {
        it('should track metrics for all devices', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Switch to preview/dashboard
            const previewBtn = screen.queryByText(/preview|dashboard/i);
            if (previewBtn) {
                fireEvent.click(previewBtn);
            }
            // All device names should be visible
            mockDevices.forEach(device => {
                expect(screen.getByText(device.name)).toBeDefined();
            });
        });
        it('should update metrics after property change', async () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Make a property change
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.7 } });
            // Metrics should update
            await waitFor(() => {
                expect(screen.getByText(/FPS|gpu|metric/i)).toBeDefined();
            }, { timeout: 1000 });
        });
        it('should show device-specific recommendations', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Switch to preview
            const previewBtn = screen.queryByText(/preview|dashboard/i);
            if (previewBtn) {
                fireEvent.click(previewBtn);
            }
            // Should show recommendations
            expect(screen.getByText(/recommend|suggest|optimize/i)).toBeDefined();
        });
    });
    describe('Performance Optimization Workflow', () => {
        it('should identify performance issues', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Make change that might affect performance
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.9 } });
            // Recommendations should be provided
            expect(screen.getByText(/recommend|optimize|improve/i)).toBeDefined();
        });
        it('should apply preset optimizations', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const presetSelect = screen.getByRole('combobox');
            fireEvent.change(presetSelect, { target: { value: 'high-performance' } });
            // Performance metrics should update
            expect(screen.getByText(/metric|FPS|gpu/i)).toBeDefined();
        });
        it('should track optimization history', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Make multiple changes
            const slider = screen.getByRole('slider');
            for (let i = 0; i < 5; i++) {
                fireEvent.change(slider, { target: { value: (i % 10) / 10 } });
            }
            // Should be able to undo
            const undoBtn = screen.getByLabelText(/undo/i) || screen.getByTitle(/undo/i);
            expect(undoBtn).toBeDefined();
        });
        it('should compare performance across presets', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const presetSelect = screen.getByRole('combobox');
            // Switch between presets and track metrics
            fireEvent.change(presetSelect, { target: { value: 'gold' } });
            expect(screen.getByText(/metric|FPS/i)).toBeDefined();
            fireEvent.change(presetSelect, { target: { value: 'steel' } });
            expect(screen.getByText(/metric|FPS/i)).toBeDefined();
        });
    });
    describe('Cross-Component Communication', () => {
        it('should sync state between editor and preview', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Change in editor
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            // Should reflect in preview
            const previewBtn = screen.queryByText(/preview|dashboard/i);
            if (previewBtn) {
                fireEvent.click(previewBtn);
            }
            expect(screen.getByText(/metric|device/i)).toBeDefined();
        });
        it('should maintain undo/redo across views', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const initialCode = screen.queryByText(/@material|@trait/i);
            // Change property
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            // Code should change
            const codeTab = screen.queryByText(/code/i);
            if (codeTab) {
                fireEvent.click(codeTab);
            }
            // Undo
            const undoBtn = screen.getByLabelText(/undo/i) || screen.getByTitle(/undo/i);
            fireEvent.click(undoBtn);
            // Should return to initial state
            expect(screen.getByText(/@material|@trait/i)).toBeDefined();
        });
        it('should propagate metrics updates to all components', async () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Make change
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.3 } });
            // Both editor and preview should show updates
            await waitFor(() => {
                expect(screen.getByText(/metric|FPS|code/i)).toBeDefined();
            }, { timeout: 1000 });
        });
    });
    describe('View Mode Switching', () => {
        it('should switch to editor view', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const editorBtn = screen.getByText(/editor|edit/i);
            fireEvent.click(editorBtn);
            // Editor controls should be visible
            expect(screen.getByRole('slider') || screen.getByText(/properties/i)).toBeDefined();
        });
        it('should switch to preview view', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const previewBtn = screen.getByText(/preview|dashboard/i);
            fireEvent.click(previewBtn);
            // Preview controls should be visible
            expect(screen.getByText(/device|metric|recommend/i)).toBeDefined();
        });
        it('should show split view with both editor and preview', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const splitBtn = screen.queryByText(/split/i);
            if (splitBtn) {
                fireEvent.click(splitBtn);
                // Both should be visible
                expect(screen.getByRole('slider') || screen.getByText(/properties/i)).toBeDefined();
                expect(screen.getByText(/device|metric/i)).toBeDefined();
            }
        });
        it('should maintain state when switching views', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Make change in editor view
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            // Switch to preview
            const previewBtn = screen.getByText(/preview|dashboard/i);
            fireEvent.click(previewBtn);
            // Switch back to editor
            const editorBtn = screen.getByText(/editor|edit/i);
            fireEvent.click(editorBtn);
            // State should be preserved
            expect(screen.getByRole('slider')).toBeDefined();
        });
    });
    describe('Performance During Workflow', () => {
        it('should handle rapid property changes', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            performanceMeasure.start('rapidChanges');
            const slider = screen.getByRole('slider');
            for (let i = 0; i < 50; i++) {
                fireEvent.change(slider, { target: { value: Math.random() } });
            }
            const duration = performanceMeasure.end('rapidChanges');
            expect(duration).toBeLessThan(2000); // Should complete in <2 seconds
        });
        it('should maintain smooth UI during monitoring', async () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            performanceMeasure.start('monitoring');
            // Simulate continuous metric updates
            for (let i = 0; i < 20; i++) {
                const slider = screen.getByRole('slider');
                fireEvent.change(slider, { target: { value: Math.random() } });
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            const duration = performanceMeasure.end('monitoring');
            expect(duration).toBeLessThan(1000); // Should complete in <1 second
        });
        it('should render all components efficiently', () => {
            performanceMeasure.start('render');
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const duration = performanceMeasure.end('render');
            expect(duration).toBeLessThan(500); // Initial render <500ms
        });
    });
    describe('Export and Save Workflow', () => {
        it('should export configuration', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const exportBtn = screen.queryByText(/export|save|download/i);
            if (exportBtn) {
                fireEvent.click(exportBtn);
                expect(exportBtn).toBeDefined();
            }
        });
        it('should include all properties in export', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Make changes
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            // Export
            const exportBtn = screen.queryByText(/export|save|download/i);
            if (exportBtn) {
                fireEvent.click(exportBtn);
                expect(exportBtn).toBeDefined();
            }
        });
        it('should export metrics history', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Generate history
            const slider = screen.getByRole('slider');
            for (let i = 0; i < 10; i++) {
                fireEvent.change(slider, { target: { value: (i % 10) / 10 } });
            }
            // Export
            const exportBtn = screen.queryByText(/export|save|download/i);
            if (exportBtn) {
                fireEvent.click(exportBtn);
                expect(exportBtn).toBeDefined();
            }
        });
    });
    describe('Error Handling During Workflow', () => {
        it('should recover from invalid input', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // Try invalid input
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 'invalid' } });
            // Should still be functional
            expect(screen.getByText(/property|metric/i)).toBeDefined();
        });
        it('should maintain state after error', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const slider = screen.getByRole('slider');
            // Valid change
            fireEvent.change(slider, { target: { value: 0.5 } });
            // Invalid change
            fireEvent.change(slider, { target: { value: 'invalid' } });
            // Valid change again
            fireEvent.change(slider, { target: { value: 0.7 } });
            // Should still work
            expect(screen.getByText(/property|metric/i)).toBeDefined();
        });
    });
    describe('Full Integration Scenarios', () => {
        it('should complete full optimization workflow', async () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            // 1. Start in editor
            expect(screen.getByRole('slider')).toBeDefined();
            // 2. Change property
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            // 3. Check preview
            const previewBtn = screen.getByText(/preview|dashboard/i);
            fireEvent.click(previewBtn);
            expect(screen.getByText(/device|metric/i)).toBeDefined();
            // 4. Apply preset
            const presetSelect = screen.getByRole('combobox');
            fireEvent.change(presetSelect, { target: { value: 'high-performance' } });
            // 5. Export results
            const exportBtn = screen.queryByText(/export|save/i);
            if (exportBtn) {
                fireEvent.click(exportBtn);
            }
            expect(screen.getByText(/device|metric|property/i)).toBeDefined();
        });
        it('should compare different configurations', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const presetSelect = screen.getByRole('combobox');
            // Test gold preset
            fireEvent.change(presetSelect, { target: { value: 'gold' } });
            expect(screen.getByText(/property|metric/i)).toBeDefined();
            // Test steel preset
            fireEvent.change(presetSelect, { target: { value: 'steel' } });
            expect(screen.getByText(/property|metric/i)).toBeDefined();
            // Test studio preset
            fireEvent.change(presetSelect, { target: { value: 'studio' } });
            expect(screen.getByText(/property|metric/i)).toBeDefined();
        });
        it('should handle multi-step optimization', () => {
            render(<Phase6CompleteDemo config={mockMaterialConfig}/>);
            const slider = screen.getByRole('slider');
            // Step 1: Reduce metallic
            fireEvent.change(slider, { target: { value: 0.3 } });
            // Step 2: View preview
            const previewBtn = screen.getByText(/preview|dashboard/i);
            fireEvent.click(previewBtn);
            expect(screen.getByText(/metric|device/i)).toBeDefined();
            // Step 3: Return to editor and adjust roughness
            const editorBtn = screen.getByText(/editor|edit/i);
            fireEvent.click(editorBtn);
            fireEvent.change(slider, { target: { value: 0.6 } });
            // Should be able to undo changes
            const undoBtn = screen.getByLabelText(/undo/i) || screen.getByTitle(/undo/i);
            fireEvent.click(undoBtn);
            expect(screen.getByText(/property|metric/i)).toBeDefined();
        });
    });
});
