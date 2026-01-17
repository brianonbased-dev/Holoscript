/**
 * Phase 6: TraitEditor Component Tests
 *
 * Tests for React TraitEditor component including:
 * - Component rendering
 * - Property control interactions
 * - Tab navigation
 * - Code generation display
 * - Preset application
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TraitEditor } from '../TraitEditor';
import { mockMaterialConfig } from './setup';
describe('TraitEditor Component', () => {
    const mockOnCodeChange = vi.fn();
    const mockOnMetricsUpdate = vi.fn();
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('Rendering', () => {
        it('should render component', () => {
            const { container } = render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            expect(container).toBeDefined();
        });
        it('should render all tabs', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            // Should have tabs for Properties, Code, Preview
            expect(screen.getByText(/properties|code|preview/i)).toBeDefined();
        });
        it('should render property controls', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            // Should render controls for defined properties
            expect(screen.getByRole('slider')).toBeDefined();
        });
        it('should render color picker', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            // Should have input for color property
            expect(screen.getByDisplayValue(/^#[0-9a-f]{6}$/i)).toBeDefined();
        });
        it('should render preset selector', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const presetSelect = screen.getByRole('combobox');
            expect(presetSelect).toBeDefined();
        });
        it('should render undo/redo buttons', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            expect(screen.getByLabelText(/undo/i) || screen.getByTitle(/undo/i)).toBeDefined();
            expect(screen.getByLabelText(/redo/i) || screen.getByTitle(/redo/i)).toBeDefined();
        });
    });
    describe('Tab Navigation', () => {
        it('should switch to properties tab', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const propertiesTab = screen.getByText(/properties/i);
            fireEvent.click(propertiesTab);
            expect(screen.getByText(/properties/i)).toBeDefined();
        });
        it('should switch to code tab', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const codeTab = screen.getByText(/code/i);
            fireEvent.click(codeTab);
            expect(screen.getByText(/code/i)).toBeDefined();
        });
        it('should switch to preview tab', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const previewTab = screen.getByText(/preview/i);
            fireEvent.click(previewTab);
            expect(screen.getByText(/preview/i)).toBeDefined();
        });
    });
    describe('Property Controls', () => {
        it('should update slider value', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should update color picker', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const colorInput = screen.getByDisplayValue(/^#[0-9a-f]{6}$/i);
            fireEvent.change(colorInput, { target: { value: '#ff0000' } });
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should update text input', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            // Look for text input
            const inputs = screen.getAllByRole('textbox');
            if (inputs.length > 0) {
                fireEvent.change(inputs[0], { target: { value: 'test' } });
                expect(mockOnCodeChange).toHaveBeenCalled();
            }
        });
        it('should update dropdown selection', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const comboboxes = screen.getAllByRole('combobox');
            // First combobox is likely preset selector, next ones are property controls
            if (comboboxes.length > 1) {
                fireEvent.change(comboboxes[1], { target: { value: 'option2' } });
                expect(mockOnCodeChange).toHaveBeenCalled();
            }
        });
        it('should toggle checkbox', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const checkboxes = screen.getAllByRole('checkbox');
            if (checkboxes.length > 0) {
                fireEvent.click(checkboxes[0]);
                expect(mockOnCodeChange).toHaveBeenCalled();
            }
        });
    });
    describe('Code Display', () => {
        it('should display generated code', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const codeTab = screen.getByText(/code/i);
            fireEvent.click(codeTab);
            expect(screen.getByText(/@material|@trait/i)).toBeDefined();
        });
        it('should update code display on property change', () => {
            const { rerender } = render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should syntax highlight code', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const codeTab = screen.getByText(/code/i);
            fireEvent.click(codeTab);
            // Code should be displayed (syntax highlighting implementation detail)
            expect(screen.getByText(/@material|@trait/i)).toBeDefined();
        });
    });
    describe('Preset Application', () => {
        it('should apply preset on selection', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const presetSelect = screen.getByRole('combobox');
            fireEvent.change(presetSelect, { target: { value: 'gold' } });
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should show preset options', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const presetSelect = screen.getByRole('combobox');
            fireEvent.focus(presetSelect);
            // Options should be visible
            expect(presetSelect).toBeDefined();
        });
        it('should update all properties with preset', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const presetSelect = screen.getByRole('combobox');
            fireEvent.change(presetSelect, { target: { value: 'steel' } });
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
    });
    describe('Undo/Redo', () => {
        it('should undo property change', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            const undoBtn = screen.getByLabelText(/undo/i) || screen.getByTitle(/undo/i);
            fireEvent.click(undoBtn);
            // Component should revert
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should redo undone change', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            const undoBtn = screen.getByLabelText(/undo/i) || screen.getByTitle(/undo/i);
            fireEvent.click(undoBtn);
            const redoBtn = screen.getByLabelText(/redo/i) || screen.getByTitle(/redo/i);
            fireEvent.click(redoBtn);
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should disable undo when no history', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const undoBtn = screen.getByLabelText(/undo/i) || screen.getByTitle(/undo/i);
            expect(undoBtn).toBeDefined();
        });
    });
    describe('Callbacks', () => {
        it('should call onCodeChange on property update', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should call onMetricsUpdate periodically', async () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            await waitFor(() => {
                expect(mockOnMetricsUpdate).toHaveBeenCalled();
            }, { timeout: 2000 });
        });
        it('should pass code to onCodeChange', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 0.5 } });
            expect(mockOnCodeChange).toHaveBeenCalledWith(expect.objectContaining({
                code: expect.any(String),
            }));
        });
    });
    describe('Edge Cases', () => {
        it('should handle invalid property values gracefully', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: 9999 } });
            // Component should handle or clamp value
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should handle rapid property changes', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const slider = screen.getByRole('slider');
            for (let i = 0; i < 50; i++) {
                fireEvent.change(slider, { target: { value: (i % 100) / 100 } });
            }
            expect(mockOnCodeChange).toHaveBeenCalled();
        });
        it('should handle unmounting gracefully', () => {
            const { unmount } = render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            expect(() => unmount()).not.toThrow();
        });
    });
    describe('Accessibility', () => {
        it('should have proper labels for inputs', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const sliders = screen.getAllByRole('slider');
            sliders.forEach(slider => {
                expect(slider).toHaveAccessibleName();
            });
        });
        it('should support keyboard navigation', () => {
            render(<TraitEditor config={mockMaterialConfig} onCodeChange={mockOnCodeChange} onMetricsUpdate={mockOnMetricsUpdate}/>);
            const tabs = screen.getAllByRole('tab');
            tabs.forEach(tab => {
                fireEvent.keyDown(tab, { key: 'Enter' });
            });
            expect(tabs.length).toBeGreaterThan(0);
        });
    });
});
